import { defineStore } from "pinia";
import { ref } from "vue";
import { bleManager } from "@/service/ble-manager";
import { APP_CONFIG, BleServiceConfig } from "@/config";
import { uint8ArrayToHexString } from "@/utils/bms-helper";
import { useAppStore } from "@/stores/app";
import { BmsProtocolParser, BmsExtendedData } from "@/types/protocol";
import { resolveProtocol, getRegisteredUuids } from "@/service/protocol/protocol-registry";

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

  // 全局响应式状态：当前已连接设备的系统 ID（Android 下即 MAC，iOS 下为 UUID）
  const connectedDeviceId = ref("");

  // 全局响应式状态：从广播包解析得到的真实物理 MAC 地址
  const connectedDeviceMac = ref("");

  // 全局响应式状态：当前已连接设备的蓝牙广播名称
  const connectedDeviceName = ref("");

  // 当前匹配成功并处于活跃状态的蓝牙服务特征值配置对象
  const activeServiceConfig = ref<BleServiceConfig>(APP_CONFIG.BLE_SERVICES.PROTOCOL_A_SERVICE);

  /**
   * 当前激活装载的协议策略解析器实例
   * 由 connectDevice 在完成服务发现后，通过 protocol-registry 动态注入
   * 值为 null 时表示当前连接的设备协议未知，系统将跳过数据解析
   */
  const activeProtocolParser = ref<BmsProtocolParser | null>(null);

  // 扩展的高阶电池遥测属性（各协议通过 BmsExtendedData 的可选字段上报各自特有数据）
  const extendedProtocolData = ref<BmsExtendedData>({});

  // BMS 电池核心电量及物理遥测响应式状态（初始化为示例模拟值，防止首屏空状态黑屏）
  const batteryPercent = ref(85);
  const totalVoltage = ref(53.28);
  const realtimeCurrent = ref(12.5);
  const isCharging = ref(true);
  const isDischarging = ref(false);
  const temperature = ref(28);

  // 轮询下发查询指令的定时器句柄（非响应式，内部管理）
  let queryInterval: ReturnType<typeof setInterval> | null = null;

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

  /**
   * 处理并解析低功耗蓝牙接收到的特征值原始数据帧
   * 委托给当前激活的协议策略解析器，Store 层不包含任何协议相关逻辑
   * @param value 原始二进制 ArrayBuffer 数据
   */
  const handleReceivedData = (value: ArrayBuffer) => {
    const bytes = new Uint8Array(value);
    console.log(`[BLE Store] 接收到蓝牙原始帧 (HEX):`, uint8ArrayToHexString(bytes));

    if (!activeProtocolParser.value) {
      console.warn("[BLE Store] 收到特征值数据帧，但协议解析器尚未装载（当前设备协议未知），跳过解析");
      return;
    }

    // 完全委托给当前激活的协议策略解析器进行解析，Store 层零参与
    const update = activeProtocolParser.value.parseReceivedData(bytes);
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

    let queryStep = 0;
    queryInterval = setInterval(async () => {
      // 若蓝牙连接已断开或协议解析器被清空，终止定时器
      if (!isBleConnected.value || !connectedDeviceId.value || !activeProtocolParser.value) {
        stopQueryTimer();
        return;
      }

      try {
        const serviceId = activeServiceConfig.value.serviceId;
        const writeCharId = activeServiceConfig.value.writeCharacteristicId;

        // 向协议策略器索取本次需下发的轮询指令（协议无关的通用调用）
        const cmds = activeProtocolParser.value.getPollCommands(queryStep);
        for (const cmd of cmds) {
          if (cmd) {
            await bleManager.writeCommand(deviceId, cmd, serviceId, writeCharId);
            // 多包顺序下发时的物理延时，防止 BLE 控制器缓冲区堵塞
            if (cmds.length > 1) {
              await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.BLE_SCAN.CHUNK_DELAY_MS));
            }
          }
        }
        queryStep++;
      } catch (err) {
        console.error("[BLE Store] 轮询查询指令下发失败:", err);
      }
    }, 2000);
  };

  /** 停止蓝牙数据查询定时器并释放引用 */
  const stopQueryTimer = () => {
    if (queryInterval !== null) {
      clearInterval(queryInterval);
      queryInterval = null;
    }
  };

  /** 重置并清空当前蓝牙连接及所有解析数据状态，用于断连或连接失败后的状态还原 */
  const clearBleState = () => {
    stopQueryTimer();
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
    activeServiceConfig.value = APP_CONFIG.BLE_SERVICES.PROTOCOL_A_SERVICE;
    // 销毁协议策略器实例，释放内存
    activeProtocolParser.value = null;
    extendedProtocolData.value = {};
  };

  /**
   * 统一的 BMS 物理开关控制总线（充电 MOS / 放电 MOS / 加热 / 清除 / 休眠 / 启动）
   * 控制指令的具体字节由当前协议策略器组装，Store 层完全透传
   * @param type  控制类型
   * @param open  开启（true）或关闭（false）
   */
  const sendControlCommand = async (
    type: "charge" | "discharge" | "heat" | "clear" | "sleep" | "start",
    open: boolean,
  ) => {
    if (!isBleConnected.value || !connectedDeviceId.value || !activeProtocolParser.value) {
      throw new Error("蓝牙设备未连接或协议解析器未就绪");
    }

    const serviceId = activeServiceConfig.value.serviceId;
    const writeCharId = activeServiceConfig.value.writeCharacteristicId;

    // 向协议策略器请求控制帧的十六进制字节字符串
    const cmdHex = activeProtocolParser.value.getControlCommand(type, open);
    if (!cmdHex) {
      console.warn(`[BLE Store] 协议 "${activeProtocolParser.value.protocolName}" 不支持控制类型: ${type}`);
      return;
    }

    console.log(`[BLE Store] 下发控制指令: type=${type}, open=${open}, HEX=${cmdHex}`);
    await bleManager.writeCommand(connectedDeviceId.value, cmdHex, serviceId, writeCharId);
  };

  /**
   * 异步连接蓝牙设备，执行完整的连接时序：
   *   停止扫描 → 建立物理连接 → 服务发现 → 协议路由匹配 → MTU 协商 → 订阅 Notify → 启动轮询
   * @param deviceId   蓝牙外设的系统 ID
   * @param name       蓝牙外设广播名称
   * @param macAddress 真实物理 MAC 地址（从广播包解析，iOS/鸿蒙下与 deviceId 不同）
   */
  const connectDevice = async (deviceId: string, name: string, macAddress?: string) => {
    try {
      // 1. 连接前必须停止扫描，释放蓝牙天线，防止 Android 抛出 10003 错误
      await bleManager.stopScan();

      // 2. 发起建立物理连接
      await bleManager.connect(deviceId);

      // 3. 更新基础连接状态
      isBleConnected.value = true;
      connectedDeviceId.value = deviceId;
      connectedDeviceMac.value = macAddress || deviceId;
      connectedDeviceName.value = name || "Unknown Device";

      // 4. 服务发现（iOS / 鸿蒙必须显式调用，否则后续操作抛 10004）
      console.log(`[BLE Store] 执行服务发现... deviceId=${deviceId}`);
      const servicesRes = await bleManager.discoverServices(deviceId);
      const discoveredServiceUuids = (servicesRes.services || []).map((s: { uuid: string }) => s.uuid);

      // 5. 遍历已发现的服务 UUID，与 config/index.ts 中所有配置项做大小写不敏感匹配
      let matchedConfig = APP_CONFIG.BLE_SERVICES.PROTOCOL_A_SERVICE;
      const serviceConfigs = Object.values(APP_CONFIG.BLE_SERVICES);
      for (const config of serviceConfigs) {
        const found = discoveredServiceUuids.some(
          (uuid: string) => uuid.toUpperCase() === config.serviceId.toUpperCase(),
        );
        if (found) {
          matchedConfig = config;
          console.log(`[BLE Store] 匹配到蓝牙服务 UUID: ${config.serviceId}`);
          break;
        }
      }
      activeServiceConfig.value = matchedConfig;

      // 6. 通过协议注册表动态解析并实例化对应的协议策略解析器（零 if-else）
      const parser = resolveProtocol(matchedConfig.serviceId);
      if (parser) {
        activeProtocolParser.value = parser;
        console.log(`[BLE Store] 成功装载协议解析器: ${parser.protocolName} (type=${parser.protocolType})`);
      } else {
        activeProtocolParser.value = null;
        const registered = getRegisteredUuids().join(", ");
        console.warn(
          `[BLE Store] 协议注册表中未找到匹配项，UUID=${matchedConfig.serviceId}。` +
            `已注册的 UUID：[${registered}]。请在 protocol-registry.ts 中注册此协议。`,
        );
      }

      // 7. 特征值发现（iOS / 鸿蒙防 10004 的关键步骤）
      const serviceId = activeServiceConfig.value.serviceId;
      console.log(`[BLE Store] 执行特征值发现... serviceId=${serviceId}`);
      await bleManager.discoverCharacteristics(deviceId, serviceId);

      // 8. 动态 MTU 协商（非 iOS 平台主动协商，推荐值 247）
      //    iOS 系统会在物理连接时由底层自动完成 MTU 协商，无需手动调用
      const appStore = useAppStore();
      const os = (appStore.deviceInfo.osName || "").toLowerCase();

      if (os !== "ios" && typeof uni.setBLEMTU === "function") {
        try {
          console.log("[BLE Store] 非 iOS 平台，发起 MTU 协商 (目标: 247 字节)...");
          await bleManager.setMTU(deviceId, 247);
        } catch (mtuErr) {
          console.warn("[BLE Store] MTU 协商失败，将沿用默认 20 字节限额:", mtuErr);
        }
      } else {
        console.log(`[BLE Store] 当前平台: ${os || "iOS"}，跳过手动 MTU 协商`);
      }

      // 9. 订阅 Notify 特征值，使能 BMS 主动上报数据通道
      const notifyCharId = activeServiceConfig.value.notifyCharacteristicId;
      console.log(`[BLE Store] 订阅 Notify 特征值... notifyCharId=${notifyCharId}`);
      await bleManager.subscribeNotify(deviceId, serviceId, notifyCharId);

      // 10. 启动后台心跳轮询定时器
      startQueryTimer(deviceId);

      return { success: true };
    } catch (err) {
      console.error("[BLE Store] 蓝牙连接或订阅失败:", err);
      // 确保失败时状态被完全清空，防止残留状态污染下一次连接
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
    try {
      await bleManager.disconnect(connectedDeviceId.value);
    } catch (err) {
      console.error("[BLE Store] 断开蓝牙连接异常:", err);
    } finally {
      clearBleState();
    }
  };

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
  };
});
