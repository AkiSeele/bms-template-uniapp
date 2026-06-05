import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { bleManager } from "@/service/ble-manager";
import { APP_CONFIG, BleServiceConfig } from "@/config";
import { uint8ArrayToHexString } from "@/utils/bms-helper";
import { useAppStore } from "@/stores/app";
import { BmsProtocolParser, BmsExtendedData } from "@/types/protocol";
import { resolveProtocol, getRegisteredUuids } from "@/service/protocol/protocol-registry";
import { useLogStore } from "@/stores/log-store";
import { translate } from "@/locale/i18n";

/**
 * BLE 蓝牙遥测数据全局 Pinia Store
 *
 * 职责：
 *   1. 维护蓝牙连接状态（isBleConnected、connectedDeviceId 等）
 *   2. 持有当前激活的协议策略解析器实例（activeProtocolParser）
 *   3. 存储解析后的 BMS 核心遥测数据（电压、电流、SOC、温度等）
 *   4. 提供连接、断连、发送控制指令等 Action
 *
 * 多协议路由说明：
 *   - 协议注册与匹配完全委托给 service/protocol/protocol-registry.ts
 *   - Store 层不包含任何协议 if-else 判断，满足开闭原则
 *   - 新增协议时，只需在 protocol-registry.ts 中注册，无需修改本文件
 */
export const useBleStore = defineStore("ble", () => {
  // 全局响应式状态：当前是否成功建立蓝牙连接
  const isBleConnected = ref(false);

  // 全局连接过程的 UI 响应式状态管理（实现连接中 loading 与连接失败弹出层的全局高阶集成）
  const isConnecting = ref(false);
  const connectingDeviceName = ref("");
  const connectionError = ref("");
  const isConnectionErrorVisible = ref(false);

  // 全局自动连接搜索过程的 UI 响应式状态管理
  const isAutoConnecting = ref(false);
  const isAutoConnectingCancelable = ref(false);
  const cancelAutoConnectCallback = ref<(() => Promise<void> | void) | null>(null);

  // 全局响应式状态：当前已连接设备的系统 ID（Android 下即 MAC，iOS 下为 UUID）
  const connectedDeviceId = ref("");

  // 全局响应式状态：从广播包解析得到的真实物理 MAC 地址
  const connectedDeviceMac = ref("");

  // 全局响应式状态：当前已连接设备的蓝牙广播名称
  const connectedDeviceName = ref("");

  // 当前匹配成功并处于活跃状态的蓝牙服务特征值配置对象
  const activeServiceConfig = ref<BleServiceConfig>(APP_CONFIG.BLE_SERVICES.default[0]);

  /**
   * 当前激活装载的协议策略解析器实例
   * 由连接设备在完成服务发现后，通过协议注册表动态注入
   * 值为 null 时表示当前连接的设备协议未知，系统将跳过数据解析
   */
  const activeProtocolParser = ref<BmsProtocolParser | null>(null);

  // 扩展的高阶电池遥测属性（各协议通过增量更新包上报各自特有数据）
  const extendedProtocolData = ref<BmsExtendedData>({});

  // 电池核心电量及物理遥测响应式状态（初始化为模拟值，防止首屏空状态黑屏）
  const batteryPercent = ref(85);
  const totalVoltage = ref(53.28);
  const realtimeCurrent = ref(12.5);
  const isCharging = ref(true);
  const isDischarging = ref(false);
  const temperature = ref(28);

  // 轮询下发查询指令的定时器句柄（非响应式，内部管理）
  let queryInterval: ReturnType<typeof setInterval> | null = null;

  // 指令队列任务类型声明
  interface BleCommandTask {
    /** 物理发送的十六进制指令字串 */
    commandHex: string;
    /** 对应的指令命令字标识 */
    commandId: number;
    /** 任务类型：轮询或手动控制 */
    type: "poll" | "control";
    /** 响应超时限制时间（毫秒） */
    timeout: number;
    /** 最大重试发送次数 */
    maxRetries: number;
    /** 当前已进行的重试发送次数 */
    retryCount: number;
    /** 成功回调触发器 */
    resolve: (value: any) => void;
    /** 失败或超时回调触发器 */
    reject: (reason: any) => void;
  }

  // 全局指令调度队列与状态管理
  const commandQueue = ref<BleCommandTask[]>([]);
  const currentExecutingTask = ref<BleCommandTask | null>(null);
  let taskTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let nextTaskDeferTimer: ReturnType<typeof setTimeout> | null = null;

  /** 是否正处于固件升级锁定中 */
  const isOtaUpdating = ref(false);

  // 是否有活跃页面需要轮询遥测数据
  const isPollingActive = ref(false);

  // 设置页面活跃状态以启动或停止轮询
  const setPollingActive = (active: boolean) => {
    isPollingActive.value = active;
    if (active) {
      if (isBleConnected.value && connectedDeviceId.value) {
        startQueryTimer(connectedDeviceId.value);
      }
    } else {
      stopQueryTimer();
    }
  };

  /**
   * 从十六进制指令字串中提取命令字标示符
   * 格式约定：去除空格后，第二字节（即第三及第四字符）为命令字
   * @param hex 十六进制指令字串
   */
  const getCommandIdFromHex = (hex: string): number => {
    const cleanHex = hex.replace(/\s+/g, "");
    if (cleanHex.length >= 4) {
      return parseInt(cleanHex.substring(2, 4), 16);
    }
    return 0;
  };

  /**
   * 将待发送指令推入调度队列中排队执行
   * @param commandHex 十六进制指令字节字串
   * @param type 任务类型，支持遥测轮询和手动控制
   * @param timeout 响应超时限制时间（毫秒）
   * @param maxRetries 最大重试发送次数
   */
  const pushCommand = (
    commandHex: string,
    type: "poll" | "control",
    timeout = APP_CONFIG.BLE_SCAN.POLL_TIMEOUT_MS,
    maxRetries = 0,
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      // 检查是否正处于固件升级锁定中，如果是，则拒绝普通指令入队
      if (isOtaUpdating.value) {
        return reject(new Error("Firmware update in progress, queue locked"));
      }

      // 检查蓝牙连接是否已断开，若未连接则直接拒绝
      if (!isBleConnected.value || !connectedDeviceId.value) {
        return reject(new Error("Bluetooth device not connected"));
      }

      const commandId = getCommandIdFromHex(commandHex);
      const task: BleCommandTask = {
        commandHex: commandHex.replace(/\s+/g, ""),
        commandId,
        type,
        timeout,
        maxRetries,
        retryCount: 0,
        resolve,
        reject,
      };

      if (type === "control") {
        // 控制指令享有绝对的高优先级，执行插队
        // 1. 清空队列中所有尚未执行的普通轮询遥测任务，为控制通道腾出带宽
        commandQueue.value = commandQueue.value.filter((t) => t.type !== "poll");
        // 2. 将控制指令直接插入队列最前端，以便优先执行
        commandQueue.value.unshift(task);
      } else {
        // 遥测轮询指令防堆积处理：若队列中已有相同命令字的任务，或者已有控制任务，则直接略过
        const hasDuplicate = commandQueue.value.some((t) => t.commandId === commandId && t.type === "poll");
        const hasControl =
          commandQueue.value.some((t) => t.type === "control") ||
          (currentExecutingTask.value && currentExecutingTask.value.type === "control");

        if (hasDuplicate || hasControl) {
          return resolve(null);
        }
        commandQueue.value.push(task);
      }

      // 触发队列调度器开始工作
      processNextTask();
    });
  };

  /**
   * 驱动调度器执行队列中的下一个待执行任务
   */
  const processNextTask = async () => {
    // 若当前蓝牙已断开，直接清空队列释放所有阻塞的 Promise
    if (!isBleConnected.value) {
      clearQueue();
      return;
    }

    // 若当前有任务正在等待设备响应，则挂起，等待其响应或超时后再继续
    if (currentExecutingTask.value !== null) {
      return;
    }

    // 若正处于上一条指令完成后的发送间隔冷却期中，则暂缓执行，由延迟定时器触发
    if (nextTaskDeferTimer !== null) {
      return;
    }

    // 队列已空，执行完毕
    if (commandQueue.value.length === 0) {
      return;
    }

    // 取出队列头部的首个任务执行
    const task = commandQueue.value.shift()!;
    currentExecutingTask.value = task;

    executeTask(task);
  };

  /**
   * 调度并驱动下一指令的执行（支持队列指令发送间隔延时）
   */
  const dispatchNextTask = () => {
    currentExecutingTask.value = null;
    if (APP_CONFIG.BLE_SCAN.QUEUE_SEND_INTERVAL_MS > 0) {
      if (nextTaskDeferTimer) {
        clearTimeout(nextTaskDeferTimer);
      }
      nextTaskDeferTimer = setTimeout(() => {
        nextTaskDeferTimer = null;
        processNextTask();
      }, APP_CONFIG.BLE_SCAN.QUEUE_SEND_INTERVAL_MS);
    } else {
      processNextTask();
    }
  };

  /**
   * 物理下发任务指令并启动超时定时器
   * @param task 待下发的任务节点
   */
  const executeTask = async (task: BleCommandTask) => {
    try {
      const serviceId = activeServiceConfig.value.serviceId;
      const writeCharId = activeServiceConfig.value.writeCharacteristicId;
      const deviceId = connectedDeviceId.value;

      // 调用底层服务向特征值写入指令数据
      await bleManager.writeCommand(deviceId, task.commandHex, serviceId, writeCharId);

      // 启动响应接收倒计时超时器
      taskTimeoutTimer = setTimeout(() => {
        handleTaskTimeout();
      }, task.timeout);
    } catch (err) {
      console.error("[指令队列] 物理发送指令异常失败:", err);
      handleTaskFailure(err);
    }
  };

  /**
   * 处理当前任务的响应超时事件
   */
  const handleTaskTimeout = () => {
    if (!currentExecutingTask.value) return;
    const task = currentExecutingTask.value;

    if (task.retryCount < task.maxRetries) {
      // 仍在重试次数限额内，递增重试计数并重新执行发送
      task.retryCount++;
      console.warn(
        `[指令队列] 任务等待响应超时，发起第 ${task.retryCount}/${task.maxRetries} 次重试发送: CMD=0x${task.commandId.toString(16).toUpperCase()}`,
      );
      if (taskTimeoutTimer) {
        clearTimeout(taskTimeoutTimer);
        taskTimeoutTimer = null;
      }
      executeTask(task);
    } else {
      // 超时重试次数用尽，宣告失败
      console.error(`[指令队列] 任务等待响应彻底超时，宣告失败: CMD=0x${task.commandId.toString(16).toUpperCase()}`);
      if (taskTimeoutTimer) {
        clearTimeout(taskTimeoutTimer);
        taskTimeoutTimer = null;
      }

      if (task.type === "control") {
        // 控制指令超时必须向 UI 反馈异常
        task.reject(new Error("Timeout waiting for response"));
      } else {
        // 轮询指令超时，静默放行，以防阻断后续轮询
        task.resolve(null);
      }

      dispatchNextTask();
    }
  };

  /**
   * 处理当前任务执行期间的写入失败等严重异常
   * @param err 异常错误信息
   */
  const handleTaskFailure = (err: any) => {
    if (taskTimeoutTimer) {
      clearTimeout(taskTimeoutTimer);
      taskTimeoutTimer = null;
    }
    const task = currentExecutingTask.value;
    if (task) {
      if (task.type === "control") {
        task.reject(err);
      } else {
        task.resolve(null);
      }
    }
    dispatchNextTask();
  };

  /**
   * 强行清空并释放整个指令调度队列与定时器状态
   */
  const clearQueue = () => {
    if (taskTimeoutTimer) {
      clearTimeout(taskTimeoutTimer);
      taskTimeoutTimer = null;
    }
    if (nextTaskDeferTimer) {
      clearTimeout(nextTaskDeferTimer);
      nextTaskDeferTimer = null;
    }
    if (currentExecutingTask.value) {
      currentExecutingTask.value.reject(new Error("Connection lost"));
      currentExecutingTask.value = null;
    }
    commandQueue.value.forEach((task) => {
      task.reject(new Error("Connection lost"));
    });
    commandQueue.value = [];
  };

  /**
   * 全局单例监听器初始化入口，只应在 App.vue 的 onLaunch 中被调用一次
   * 注册两个全局蓝牙事件回调：连接状态变更 + 特征值数据上报
   */
  const initGlobalListeners = () => {
    console.log("[BLE Store] 开始注册全局低功耗蓝牙事件监听器");

    // 监听蓝牙物理连接断开事件（包含用户主动断开和意外硬件掉线）
    bleManager.onConnectionChange((res) => {
      console.log(`[BLE Store] 收到全局连接状态变更通知: id=${res.deviceId}, connected=${res.connected}`);
      if (res.deviceId === connectedDeviceId.value && !res.connected) {
        console.warn("[BLE Store] 监听到当前活跃设备连接断开，重置状态并清理定时器");
        clearBleState();
      }
    });

    // 监听低功耗蓝牙特征值数据变化上报事件
    bleManager.onCharacteristicValueChange((res) => {
      // 使用类型断言绕过 uni-app 官方类型声明 Bug（value 被错标为 any[]，实际是 ArrayBuffer）
      const value = res.value as any as ArrayBuffer;
      if (!value) return;
      handleReceivedData(value);
    });
  };

  // 蓝牙物理数据接收拼接缓冲区，用于粘包/分包自适应重组
  let receiveBuffer = new Uint8Array(0);

  /**
   * 处理并解析低功耗蓝牙接收到的特征值原始数据帧
   * 委托给当前激活的协议策略解析器，Store 层不包含任何协议相关逻辑
   * @param value 原始二进制 ArrayBuffer 数据
   */
  const handleReceivedData = (value: ArrayBuffer) => {
    const newBytes = new Uint8Array(value);
    // 1. 若协议解析器尚未装载（当前设备协议未知），不进行拼接，直接清空缓冲区以防内存泄露
    if (!activeProtocolParser.value) {
      receiveBuffer = new Uint8Array(0);
      return;
    }

    // 2. 将新接收到的数据分段追加到拼接缓冲区中
    const temp = new Uint8Array(receiveBuffer.length + newBytes.length);
    temp.set(receiveBuffer);
    temp.set(newBytes, receiveBuffer.length);
    receiveBuffer = temp;

    // 3. 读取当前协议的规格常量配置
    const header = activeProtocolParser.value.spec.frameHeader[0]; // 例如协议 A 帧头 0xAA

    // 4. 循环裁剪拼接，只要缓冲区有足够的一整帧，就持续切出并处理
    while (receiveBuffer.length > 0) {
      // 搜索帧头在缓冲区中的位置
      const headerIdx = receiveBuffer.indexOf(header);

      if (headerIdx === -1) {
        // 未检测到帧头，说明当前缓冲区积累的数据均为无效碎片，直接清空并终止
        receiveBuffer = new Uint8Array(0);
        break;
      }

      // 丢弃帧头位置之前的所有垃圾无用字节
      if (headerIdx > 0) {
        receiveBuffer = receiveBuffer.slice(headerIdx);
      }

      // 此时 receiveBuffer[0] 必然是帧头。但我们至少需要 3 字节，才能确定协议 A 的数据包长度（帧头 + 命令 + 长度字）
      if (receiveBuffer.length < 3) {
        break;
      }

      // 协议 A 的第三字节（bytes[2]）为数据段长度 LEN
      const dataLen = receiveBuffer[2];
      // 协议 A 完整物理响应帧总长度 = 帧头(1) + 命令字(1) + 长度字(1) + 数据段(dataLen) + 校验码(2) = dataLen + 5 字节
      const totalFrameLen = dataLen + 5;

      // 若当前缓冲区已蓄积的字节不足一整包长度，保留当前内容，挂起并等待后续分包到达
      if (receiveBuffer.length < totalFrameLen) {
        break;
      }

      // 已经收集到完整的一整包数据！切出这一包完整帧
      const fullFrame = receiveBuffer.slice(0, totalFrameLen);

      // 缓冲区剔除已处理的帧，保留后面的剩余字节（可能含有下一包的起段）
      receiveBuffer = receiveBuffer.slice(totalFrameLen);

      // 解析并分发处理此完整帧
      processFullFrame(fullFrame);
    }
  };

  /**
   * 增量更新已拼接完成的完整物理数据帧到响应式展示状态
   * @param bytes 拼接好的完整字节数组
   */
  const processFullFrame = (bytes: Uint8Array) => {
    const hex = uint8ArrayToHexString(bytes);
    console.warn(`[BLE Store] (HEX):`, hex);

    // 记录接收完整响应指令 (RX) 日志，方便时序对账
    try {
      useLogStore().addCommandLog("RX", hex);
    } catch (e) {}

    if (!activeProtocolParser.value) return;

    // 完全委托给当前激活的协议策略解析器进行解析，Store 层零参与
    const update = activeProtocolParser.value.parseReceivedData(bytes);
    const cmdId = bytes[1]; // 命令字节

    // 检查是否能匹配到当前正在执行的任务响应
    const currentTask = currentExecutingTask.value;
    if (currentTask && currentTask.commandId === cmdId) {
      // 匹配成功，清除超时定时器
      if (taskTimeoutTimer) {
        clearTimeout(taskTimeoutTimer);
        taskTimeoutTimer = null;
      }

      if (currentTask.type === "control") {
        // 控制指令响应处理
        if (update && update.controlResponse && !update.controlResponse.success) {
          // 设备明确返回了执行失败标志
          currentTask.reject(new Error("Control command executed failed by device"));
        } else {
          // 成功接收到该命令字响应帧，视为控制成功
          currentTask.resolve(true);
        }
      } else {
        // 轮询指令响应处理
        currentTask.resolve(update);
      }

      // 驱动下一指令执行（支持延迟间隔）
      dispatchNextTask();
    }

    // 无论是否匹配到等待的任务（兼容异步主动推送和乱序容错），只要解析成功了，就同步更新界面响应式状态
    if (update) {
      // 按增量更新包中包含的字段选择性更新响应式状态
      if (update.totalVoltage !== undefined) totalVoltage.value = update.totalVoltage;
      if (update.realtimeCurrent !== undefined) realtimeCurrent.value = update.realtimeCurrent;
      if (update.batteryPercent !== undefined) batteryPercent.value = update.batteryPercent;
      if (update.isCharging !== undefined) isCharging.value = update.isCharging;
      if (update.isDischarging !== undefined) isDischarging.value = update.isDischarging;
      if (update.temperature !== undefined) temperature.value = update.temperature;

      // 深度浅合并扩展属性，保留其他字段（每帧只更新当次帧包含的扩展字段）
      if (update.extendedData) {
        extendedProtocolData.value = {
          ...extendedProtocolData.value,
          ...update.extendedData,
        };
      }
    }
  };

  /**
   * 启动蓝牙数据轮询定时查询器，周期性下发读取指令促使 BMS 主动上报数据
   * @param deviceId 已连接设备的系统 ID
   */
  const startQueryTimer = (deviceId: string) => {
    stopQueryTimer();

    // 若当前无活跃页面需要轮询，则直接返回
    if (!isPollingActive.value) {
      return;
    }

    console.log(`[蓝牙轮询] 启动查询定时器，设备标识: ${deviceId}`);

    let queryStep = 0;

    // 执行单次轮询指令下发任务生成
    const executeQueryStep = async () => {
      // 若当前正处于固件升级中，则直接挂起不生成轮询任务
      if (isOtaUpdating.value) {
        return;
      }

      // 若蓝牙连接已断开，协议解析器被清空，或者设备 ID 丢失，终止定时器
      if (!isBleConnected.value || !connectedDeviceId.value || !activeProtocolParser.value) {
        stopQueryTimer();
        return;
      }

      // 如果当前队列里有控制任务，或者当前正在执行控制任务，则本周期挂起轮询，防止指令交错冲突
      const hasControlTask =
        commandQueue.value.some((t) => t.type === "control") ||
        (currentExecutingTask.value && currentExecutingTask.value.type === "control");
      if (hasControlTask) {
        return;
      }

      // 为了防止蓝牙慢速响应引起队列中轮询指令堆积，若队列中仍有残留轮询任务，本次也跳过生成
      const hasPollTask = commandQueue.value.some((t) => t.type === "poll");
      if (hasPollTask) {
        return;
      }

      try {
        // 一次性把这一轮的全部轮询指令都拿出来推入队列，保证首页各项数据均得到刷新
        // 动态读取当前协议策略所声明的循环步数周期长度
        const cycleLength = activeProtocolParser.value.pollingCycleLength || 1;
        const cmdSet = new Set<string>();
        for (let offset = 0; offset < cycleLength; offset++) {
          const cmds = activeProtocolParser.value.getPollCommands(queryStep + offset);
          for (const cmd of cmds) {
            if (cmd) {
              cmdSet.add(cmd);
            }
          }
        }

        // 依次将各指令任务推入队列进行排队执行
        for (const cmd of cmdSet) {
          // 轮询超时限制设为配置时间，重试 0 次，失败/超时后静默抛弃执行下一条
          pushCommand(cmd, "poll", APP_CONFIG.BLE_SCAN.POLL_TIMEOUT_MS, 0).catch((err) => {
            console.warn("[指令队列] 轮询任务执行异常:", err);
          });
        }

        // 轮转步数增加对应的周期长度
        queryStep += cycleLength;
      } catch (err) {
        console.error("[BLE Store] 轮询查询任务生成入队失败:", err);
      }
    };

    // 立即同步下发一次，消除首屏等待延迟
    executeQueryStep();

    // 开启心跳轮询定时器
    queryInterval = setInterval(executeQueryStep, APP_CONFIG.BLE_SCAN.POLL_INTERVAL_MS);
  };

  /** 停止蓝牙数据查询定时器并释放引用 */
  const stopQueryTimer = () => {
    if (queryInterval !== null) {
      console.log("[蓝牙轮询] 停止查询定时器");
      clearInterval(queryInterval);
      queryInterval = null;
    }
  };

  /** 重置并清空当前蓝牙连接及所有解析数据状态，用于断连或连接失败后的状态还原 */
  const clearBleState = () => {
    stopQueryTimer();
    clearQueue();
    isBleConnected.value = false;
    connectedDeviceId.value = "";
    connectedDeviceMac.value = "";
    connectedDeviceName.value = "";
    batteryPercent.value = 0;
    totalVoltage.value = 0;
    realtimeCurrent.value = 0;
    isCharging.value = false;
    isDischarging.value = false;
    temperature.value = 0;
    // 重置为第一个可用的服务配置（连接新设备时将被重新匹配覆盖）
    activeServiceConfig.value = APP_CONFIG.BLE_SERVICES.default[0];
    // 销毁协议策略器实例，释放内存
    activeProtocolParser.value = null;
    extendedProtocolData.value = {};
    receiveBuffer = new Uint8Array(0);
  };

  /**
   * 统一的 BMS 物理开关控制总线（充电开关 / 放电开关 / 低温加热 / 清除 / 休眠 / 启动）
   * 控制指令的具体字节由当前协议策略器组装，Store 层完全透传，并等待设备响应
   * @param type  控制类型
   * @param open  开启（true）或关闭（false）
   * @returns 返回一个 Promise，成功收到响应 resolve(true)，超时或设备返回失败则 reject
   */
  const sendControlCommand = async (
    type: "charge" | "discharge" | "heat" | "clear" | "sleep" | "start",
    open: boolean,
  ): Promise<boolean> => {
    if (!isBleConnected.value || !connectedDeviceId.value || !activeProtocolParser.value) {
      throw new Error("Bluetooth device not connected or protocol parser not ready");
    }

    // 向协议策略器请求控制帧的十六进制字节字符串
    const cmdHex = activeProtocolParser.value.getControlCommand(type, open);
    if (!cmdHex) {
      console.warn(`[BLE Store] 协议 "${activeProtocolParser.value.protocolName}" 不支持控制类型: ${type}`);
      return false;
    }

    console.log(`[BLE Store] 开始向调度队列推入控制指令: type=${type}, open=${open}, HEX=${cmdHex}`);

    // 控制任务设定超时与重试次数
    return pushCommand(
      cmdHex,
      "control",
      APP_CONFIG.BLE_SCAN.CONTROL_TIMEOUT_MS,
      APP_CONFIG.BLE_SCAN.CONTROL_RETRY_LIMIT,
    );
  };

  /**
   * 异步连接蓝牙设备，执行完整的连接时序：
   *   停止扫描 → 建立物理连接 → 服务发现 → 协议路由匹配 → MTU 协商 → 订阅 Notify → 启动轮询
   * @param deviceId   蓝牙外设的系统 ID
   * @param name       蓝牙外设广播名称
   * @param macAddress 真实物理 MAC 地址（从广播包解析，iOS/鸿蒙下与 deviceId 不同）
   */
  const connectDevice = async (deviceId: string, name: string, macAddress?: string) => {
    // 1. 如果目标设备与当前已建立连接的设备完全一致，且状态为已连接，直接放行成功，并标记 alreadyConnected 为 true
    if (isBleConnected.value && connectedDeviceId.value === deviceId) {
      console.log(`[BLE 连接] 目标设备与当前已连接设备完全一致，直接放行 ✓`);
      return { success: true, alreadyConnected: true };
    }

    // 2. 如果当前已经连接了另一个不同的设备，必须先主动释放其 GATT 资源，以支持多设备间的热切换
    if (isBleConnected.value || connectedDeviceId.value) {
      console.log(`[BLE 连接] 检测到处于连接状态的不同设备: ${connectedDeviceId.value}，正在自动断开...`);
      try {
        await disconnectDevice();
        console.log(`[BLE 连接] 老设备已断开释放 ✓`);
        // 给与系统蓝牙栈配置的等待时间完成物理通道拆除与系统清理，防止新老连接重叠冲突
        console.log(`[BLE 连接] 正在等待物理通道彻底拆除 (${APP_CONFIG.BLE_SCAN.DISCONNECT_DELAY_MS}ms)...`);
        await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.BLE_SCAN.DISCONNECT_DELAY_MS));
      } catch (disErr) {
        console.warn(`[BLE 连接] 自动断开老设备失败（可忽略并强行建立新连接）:`, disErr);
      }
    }

    isConnecting.value = true;
    connectingDeviceName.value = name || "BMS Device";
    connectionError.value = "";
    isConnectionErrorVisible.value = false;

    const logStore = useLogStore();
    logStore.addConnectionLog("uni.createBLEConnection:start", { deviceId, name, macAddress });

    try {
      console.log(`[BLE 连接] 开始连接目标设备: name=${name}, id=${deviceId}, mac=${macAddress || "未知"}`);

      // 步骤 1：连接前必须停止扫描，释放蓝牙天线，防止 Android 抛出 10003 错误
      try {
        await bleManager.stopScan();
        logStore.addConnectionLog("uni.stopBluetoothDevicesDiscovery", undefined, "success", "success");
      } catch (scanErr: any) {
        console.warn(`[BLE 连接] 停止扫描失败（可忽略）:`, scanErr);
        logStore.addConnectionLog(
          "uni.stopBluetoothDevicesDiscovery",
          undefined,
          scanErr?.errMsg || String(scanErr),
          "fail",
        );
      }

      // 给与系统蓝牙栈配置的等待时间释放硬件天线资源，防止高频密集操作引起系统层的操纵超时错误
      await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.BLE_SCAN.POST_STOP_SCAN_DELAY_MS));

      // 步骤 2：发起建立物理连接
      try {
        await bleManager.connect(deviceId);
        logStore.addConnectionLog("uni.createBLEConnection", { deviceId }, "success", "success");
        console.log(`[BLE 连接] 物理连接建立成功 ✓`);
      } catch (connectErr: any) {
        const errMsg = (connectErr.errMsg || String(connectErr)).toLowerCase();
        if (errMsg.includes("already connect")) {
          logStore.addConnectionLog("uni.createBLEConnection", { deviceId }, "already connected", "success");
          console.warn(`[BLE 连接] 设备已处于连接状态，跳过并保持连接 ✓`);
        } else {
          logStore.addConnectionLog("uni.createBLEConnection", { deviceId }, connectErr, "fail");
          throw new Error(
            `${translate("bms.ble.steps.physicalConnect")}: ${connectErr.message || connectErr.errMsg || String(connectErr)}`
          );
        }
      }

      // 步骤 3：更新基础连接状态
      isBleConnected.value = true;
      connectedDeviceId.value = deviceId;
      connectedDeviceMac.value = macAddress || deviceId;
      connectedDeviceName.value = name || "Unknown Device";

      // 步骤 4：服务发现（iOS / 鸿蒙必须显式调用，否则后续操作抛 10004）
      try {
        const servicesRes = await bleManager.discoverServices(deviceId);
        const discoveredServiceUuids = (servicesRes.services || []).map((s: { uuid: string }) => s.uuid);
        logStore.addConnectionLog(
          "uni.getBLEDeviceServices",
          { deviceId },
          { count: discoveredServiceUuids.length, uuids: discoveredServiceUuids },
          "success",
        );

        // 步骤 5：遍历已发现的服务 UUID，与 config/index.ts 中所有配置项做大小写不敏感匹配
        const allConfigs = Object.values(APP_CONFIG.BLE_SERVICES).flat();
        let matchedConfig = allConfigs[0] || APP_CONFIG.BLE_SERVICES.default[0];
        for (const config of allConfigs) {
          const found = discoveredServiceUuids.find(
            (uuid: string) => uuid.toUpperCase() === config.serviceId.toUpperCase(),
          );
          if (found) {
            matchedConfig = {
              ...config,
              serviceId: found,
            };
            break;
          }
        }
        activeServiceConfig.value = matchedConfig;
        logStore.addConnectionLog("matchProtocol", { matchedServiceId: matchedConfig.serviceId }, "success", "success");
      } catch (serviceErr: any) {
        logStore.addConnectionLog("uni.getBLEDeviceServices", { deviceId }, serviceErr, "fail");
        throw new Error(
          `${translate("bms.ble.steps.discoverService")}: ${serviceErr.message || serviceErr.errMsg || String(serviceErr)}`
        );
      }

      // 步骤 6：通过协议注册表动态解析并实例化对应的协议策略解析器（零 if-else）
      const parser = resolveProtocol(activeServiceConfig.value.serviceId);
      if (parser) {
        activeProtocolParser.value = parser;
        logStore.addConnectionLog(
          "resolveProtocolParser",
          { serviceId: activeServiceConfig.value.serviceId },
          { protocolName: parser.protocolName, protocolType: parser.protocolType },
          "success",
        );
        console.log(`[BLE 连接] 协议解析器已绑定: ${parser.protocolName} (type=${parser.protocolType}) ✓`);
      } else {
        activeProtocolParser.value = null;
        const registered = getRegisteredUuids().join(", ");
        logStore.addConnectionLog(
          "resolveProtocolParser",
          { serviceId: activeServiceConfig.value.serviceId },
          `Not registered. Available: ${registered}`,
          "fail",
        );
        console.warn(
          `[BLE 连接] 协议注册表中未找到匹配项，UUID=${activeServiceConfig.value.serviceId}`,
        );
        throw new Error(translate("bms.ble.steps.protocolMismatch"));
      }

      // 步骤 7：特征值发现（iOS / 鸿蒙防 10004 的关键步骤）
      const serviceId = activeServiceConfig.value.serviceId;
      try {
        const charRes = await bleManager.discoverCharacteristics(deviceId, serviceId);
        const discoveredCharUuids = (charRes.characteristics || []).map((c: { uuid: string }) => c.uuid);
        logStore.addConnectionLog(
          "uni.getBLEDeviceCharacteristics",
          { deviceId, serviceId },
          { count: discoveredCharUuids.length, uuids: discoveredCharUuids },
          "success",
        );

        // 将特征值 UUID 也自动对齐为 system 物理发现的原始 UUID 大小写，彻底消除 Android/iOS 特征值大小写不匹配导致的 10008 异常
        const realWriteChar = discoveredCharUuids.find(
          (uuid: string) => uuid.toUpperCase() === activeServiceConfig.value.writeCharacteristicId.toUpperCase(),
        );
        const realNotifyChar = discoveredCharUuids.find(
          (uuid: string) => uuid.toUpperCase() === activeServiceConfig.value.notifyCharacteristicId.toUpperCase(),
        );
        if (realWriteChar) {
          activeServiceConfig.value.writeCharacteristicId = realWriteChar;
        }
        if (realNotifyChar) {
          activeServiceConfig.value.notifyCharacteristicId = realNotifyChar;
        }
      } catch (charErr: any) {
        logStore.addConnectionLog("uni.getBLEDeviceCharacteristics", { deviceId, serviceId }, charErr, "fail");
        throw new Error(
          `${translate("bms.ble.steps.discoverCharacteristic")}: ${charErr.message || charErr.errMsg || String(charErr)}`
        );
      }

      // 步骤 8：动态 MTU 协商（非 iOS 平台主动协商，目标值取自配置）
      //    iOS 系统会在物理连接时由底层自动完成 MTU 协商，无需手动调用
      const appStore = useAppStore();
      const os = (appStore.deviceInfo.osName || "").toLowerCase();

      if (os !== "ios" && typeof uni.setBLEMTU === "function") {
        try {
          const targetMtu = APP_CONFIG.BLE_SCAN.TARGET_MTU;
          const mtuRes = await bleManager.setMTU(deviceId, targetMtu);
          logStore.addConnectionLog("uni.setBLEMTU", { deviceId, mtu: targetMtu }, mtuRes, "success");
        } catch (mtuErr: any) {
          logStore.addConnectionLog("uni.setBLEMTU", { deviceId, mtu: APP_CONFIG.BLE_SCAN.TARGET_MTU }, mtuErr, "fail");
          console.warn(
            `[BLE 连接] MTU 协商失败，将沿用默认 ${APP_CONFIG.BLE_SCAN.DEFAULT_MTU} 字节限额:`,
            mtuErr,
          );
        }
      } else {
        logStore.addConnectionLog("uni.setBLEMTU", { deviceId }, `skipped: platform=${os}`, "success");
      }

      // 步骤 9：订阅通知特征值，使能电池数据通道
      // 注意：安卓底层在发现特征值后需要短暂等待缓存就绪，否则立即调用订阅会触发异常
      const notifyCharId = activeServiceConfig.value.notifyCharacteristicId;
      await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.BLE_SCAN.PRE_SUBSCRIBE_DELAY_MS));
      try {
        const notifyRes = await bleManager.subscribeNotify(deviceId, serviceId, notifyCharId);
        logStore.addConnectionLog(
          "uni.notifyBLECharacteristicValueChange",
          { deviceId, serviceId, notifyCharId },
          notifyRes,
          "success",
        );
        console.log("[BLE 连接] Notify 数据通道订阅就绪 ✓");
      } catch (notifyErr: any) {
        logStore.addConnectionLog(
          "uni.notifyBLECharacteristicValueChange",
          { deviceId, serviceId, notifyCharId },
          notifyErr,
          "fail",
        );
        throw new Error(
          `${translate("bms.ble.steps.subscribeNotify")}: ${notifyErr.message || notifyErr.errMsg || String(notifyErr)}`
        );
      }

      // 订阅成功后，强制等待链路稳定再下发心跳指令，防 10007 冲突
      await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.BLE_SCAN.POST_SUBSCRIBE_DELAY_MS));

      // 仅在有活跃页面需要轮询时才启动后台查询定时器
      if (isPollingActive.value) {
        startQueryTimer(deviceId);
      }
      console.log(`[BLE 连接] ━━━━━━ 设备连接并就绪 ━━━━━━`);
      logStore.addConnectionLog("uni.createBLEConnection:success", { deviceId }, "success", "success");

      // 持久化记录上次连接的物理地址与设备名称
      uni.setStorageSync("last_connected_mac", macAddress || deviceId);
      uni.setStorageSync("last_connected_name", name || "Unknown Device");

      isConnecting.value = false;
      return { success: true };
    } catch (err: any) {
      isConnecting.value = false;
      console.error("[BLE 连接] ✖ 连接时序中断，抛出异常:", err);
      // 记录全局连接错误并激活全局弹出层
      connectionError.value = err.message || err.errMsg || String(err);
      isConnectionErrorVisible.value = true;
      // 主动断开物理 GATT 连接，防止手机蓝牙侧遗留半连接状态，导致下次连接失败
      const failedDeviceId = connectedDeviceId.value || deviceId;
      if (failedDeviceId) {
        try {
          console.log(`[BLE 连接] 正在断开物理连接，释放 GATT 资源: deviceId=${failedDeviceId}`);
          await bleManager.disconnect(failedDeviceId);
          console.log(`[BLE 连接] 物理连接已断开 ✓`);
        } catch (disconnectErr) {
          console.warn(`[BLE 连接] 断开物理连接时异常（可忽略）:`, disconnectErr);
        }
      }
      // 重置 Store 所有状态，防止残留状态污染下一次连接
      clearBleState();
      throw err;
    }
  };

  /**
   * 断开当前已建立的蓝牙物理连接
   * 无论底层操作成功或失败，均强制清理本地状态
   */
  const disconnectDevice = async () => {
    if (!connectedDeviceId.value) return;
    const deviceId = connectedDeviceId.value;
    try {
      useLogStore().addConnectionLog("uni.closeBLEConnection:start", { deviceId });
      const res = await bleManager.disconnect(deviceId);
      useLogStore().addConnectionLog("uni.closeBLEConnection:success", { deviceId }, res, "success");
    } catch (err: any) {
      console.error("[BLE Store] 断开蓝牙连接异常:", err);
      useLogStore().addConnectionLog("uni.closeBLEConnection:fail", { deviceId }, err, "fail");
    } finally {
      clearBleState();
    }
  };

  /**
   * 被 UI 触发的主动取消自动连接的函数
   */
  const triggerCancelAutoConnect = async () => {
    if (cancelAutoConnectCallback.value) {
      try {
        await cancelAutoConnectCallback.value();
      } catch (err) {
        console.error("[BLE Store] 执行自动连接取消回调异常:", err);
      }
      cancelAutoConnectCallback.value = null;
    }
    isAutoConnecting.value = false;
    isAutoConnectingCancelable.value = false;
  };

  // 监听固件升级状态，一旦开启，立即清空普通指令队列并停止遥测轮询
  watch(isOtaUpdating, (newVal) => {
    if (newVal) {
      console.log("[BLE Store] 固件升级启动，正在锁定通道并清空队列...");
      stopQueryTimer();
      clearQueue();
    }
  });

  return {
    isBleConnected,
    connectedDeviceId,
    connectedDeviceMac,
    connectedDeviceName,
    activeServiceConfig,
    activeProtocolParser,
    extendedProtocolData,
    batteryPercent,
    totalVoltage,
    realtimeCurrent,
    isCharging,
    isDischarging,
    temperature,
    connectDevice,
    disconnectDevice,
    initGlobalListeners,
    sendControlCommand,
    isConnecting,
    connectingDeviceName,
    connectionError,
    isConnectionErrorVisible,
    isAutoConnecting,
    isAutoConnectingCancelable,
    cancelAutoConnectCallback,
    triggerCancelAutoConnect,
    isOtaUpdating,
    startQueryTimer,
    stopQueryTimer,
    isPollingActive,
    setPollingActive,
  };
});
