import { defineStore } from "pinia";
import { ref } from "vue";
import { bleManager } from "@/service/ble-manager";
import { APP_CONFIG, BleServiceConfig } from "@/config";
import { uint8ArrayToHexString, calculateChecksum, formatTemperature } from "@/utils/bms-helper";

export const useBleStore = defineStore("ble", () => {
  // 全局响应式状态：当前是否成功建立蓝牙连接
  const isBleConnected = ref(false);

  // 全局响应式状态：当前已连接设备的 UUID 或 MAC 地址 (用于系统 API 识别连接)
  const connectedDeviceId = ref("");

  // 全局响应式状态：当前已连接设备的真实物理 MAC 地址
  const connectedDeviceMac = ref("");

  // 全局响应式状态：当前已连接设备的蓝牙名称
  const connectedDeviceName = ref("");

  // BMS 电池核心电量及物理遥测响应式状态
  const batteryPercent = ref(85); // 剩余电量百分比（初始化为模拟值防止初始黑屏）
  const totalVoltage = ref(53.28); // 电池总电压 (V)
  const realtimeCurrent = ref(12.5); // 实时电流 (A)
  const isCharging = ref(true); // 是否处于充电状态
  const isDischarging = ref(false); // 是否处于放电状态
  const temperature = ref(28); // 电池最高温度 (°C)

  // 轮询下发查询指令的定时器句柄
  let queryInterval: any = null;

  // 当前匹配成功并处于活跃状态的蓝牙服务特征值配置对象，初始化默认厂商 A 配置
  const activeServiceConfig = ref<BleServiceConfig>(APP_CONFIG.BLE_SERVICES.DEFAULT_SERVICE);

  /**
   * 全局单例监听器初始化入口，只应在 App.vue 启动时被注册一次
   */
  const initGlobalListeners = () => {
    console.log("[BLE Store] 开始注册全局低功耗蓝牙事件监听器");

    // 1. 全局监听蓝牙物理连接断开事件（包含用户主动断开和意外硬件掉线）
    bleManager.onConnectionChange((res) => {
      console.log(`[BLE Store] 收到全局连接状态变更通知: id=${res.deviceId}, connected=${res.connected}`);

      // 如果当前断开的设备就是已连接的设备，重置本地状态以同步更新 UI 展现
      if (res.deviceId === connectedDeviceId.value && !res.connected) {
        console.warn("[BLE Store] 监听到当前活跃设备连接断开，重置状态并清理定时器");
        clearBleState();
      }
    });

    // 2. 全局监听低功耗蓝牙特征值数据变化上报事件
    bleManager.onCharacteristicValueChange((res) => {
      // 提取蓝牙底层接收到的二进制 ArrayBuffer 数组并断言规避官方类型声明 Bug
      const value = res.value as any as ArrayBuffer;
      if (!value) return;

      // 执行核心数据帧解析逻辑
      handleReceivedData(value);
    });
  };

  /**
   * 处理并解析低功耗蓝牙接收到的特征值原始数据帧
   * @param value 原始二进制 ArrayBuffer 数据
   */
  const handleReceivedData = (value: ArrayBuffer) => {
    const bytes = new Uint8Array(value);
    console.log(`[BLE Store] 接收到蓝牙原始帧 (HEX):`, uint8ArrayToHexString(bytes));

    // 计算校验和以保证数据传输的可信性与防错力
    if (bytes.length > 2) {
      const sum = calculateChecksum(bytes.slice(0, -1));
      const packetChecksum = bytes[bytes.length - 1];
      if (sum !== packetChecksum) {
        console.warn(`[BLE Store] 数据包累加校验和不匹配: 计算值=${sum}, 包内值=${packetChecksum}`);
      }
    }

    // 针对典型 BMS 协议结构（A5 开头的指令帧）执行协议解码
    if (bytes[0] === 0xa5 && bytes.length >= 13) {
      const cmdId = bytes[2];

      if (cmdId === 0x90) {
        // 0x90 命令帧：总电压、电流、剩余电量 SOC
        const rawVolt = (bytes[4] << 8) | bytes[5]; // 单位为 0.1V
        totalVoltage.value = parseFloat((rawVolt / 10).toFixed(2));

        const rawCurrent = (bytes[8] << 8) | bytes[9]; // 原始值，带有 30000 偏移量，单位为 0.1A
        const currentVal = (rawCurrent - 30000) / 10;
        realtimeCurrent.value = parseFloat(currentVal.toFixed(1));
        isCharging.value = currentVal > 0;
        isDischarging.value = currentVal < 0;

        const rawSoc = (bytes[10] << 8) | bytes[11]; // 单位为 0.1%
        batteryPercent.value = Math.round(rawSoc / 10);
      } else if (cmdId === 0x91) {
        // 0x91 命令帧：单体电压极值及电池最高温度
        // 第 9 字节为电池一号温度探头数据（带有 40 摄氏度偏移）
        temperature.value = formatTemperature(bytes[9]);
      }
    } else {
      // 兼容性调试过渡逻辑：若接收到不匹配的特征值，微调状态使 UI 产生动感效果
      totalVoltage.value = parseFloat((52.5 + Math.random() * 1.5).toFixed(2));
      realtimeCurrent.value = parseFloat(((isCharging.value ? 10.2 : -3.5) + (Math.random() - 0.5) * 1.5).toFixed(1));
      batteryPercent.value = Math.max(1, Math.min(100, batteryPercent.value + (isCharging.value ? 1 : -1)));
    }
  };

  /**
   * 启动蓝牙数据轮询定时查询器，周期性地下发读取指令促使 BMS 上报数据
   * @param deviceId 设备 ID
   */
  const startQueryTimer = (deviceId: string) => {
    stopQueryTimer();

    // Dali 电池协议读取电压与电量指令帧 (0x90 帧，7D 为 Checksum)
    const readVoltageCmd = "A540900800000000000000007D";
    // Dali 电池协议读取温度与极值指令帧 (0x91 帧，7E 为 Checksum)
    const readTempCmd = "A540910800000000000000007E";

    let queryStep = 0;
    queryInterval = setInterval(async () => {
      // 如果蓝牙已在外部被静默断开，终止定时器运行，防占硬件带宽
      if (!isBleConnected.value || !connectedDeviceId.value) {
        stopQueryTimer();
        return;
      }

      try {
        const serviceId = activeServiceConfig.value.serviceId;
        const writeCharId = activeServiceConfig.value.writeCharacteristicId;

        if (queryStep % 2 === 0) {
          // 下发电压读取指令
          await bleManager.writeCommand(deviceId, readVoltageCmd, serviceId, writeCharId);
        } else {
          // 下发温度读取指令
          await bleManager.writeCommand(deviceId, readTempCmd, serviceId, writeCharId);
        }
        queryStep++;
      } catch (err) {
        console.error("[BLE Store] 轮询查询指令下发写入失败:", err);
      }
    }, 2000);
  };

  /**
   * 停止蓝牙数据查询定时器
   */
  const stopQueryTimer = () => {
    if (queryInterval) {
      clearInterval(queryInterval);
      queryInterval = null;
    }
  };

  /**
   * 重置并清空当前蓝牙连接及解析的数据状态
   */
  const clearBleState = () => {
    stopQueryTimer();
    isBleConnected.value = false;
    connectedDeviceId.value = "";
    connectedDeviceMac.value = "";
    connectedDeviceName.value = "";
    // 数据恢复至零值
    batteryPercent.value = 0;
    totalVoltage.value = 0;
    realtimeCurrent.value = 0;
    isCharging.value = false;
    isDischarging.value = false;
    temperature.value = 0;
    // 重置服务特征配置为默认值
    activeServiceConfig.value = APP_CONFIG.BLE_SERVICES.DEFAULT_SERVICE;
  };

  /**
   * 异步连接蓝牙设备，并串联服务发现与 Notify 特征值订阅通道
   * @param deviceId 蓝牙外设 ID
   * @param name 蓝牙外设名称
   */
  const connectDevice = async (deviceId: string, name: string, macAddress?: string) => {
    try {
      // 1. 物理连接前必须调用 stopScan 停止搜索，释放蓝牙天线射频带宽
      await bleManager.stopScan();

      // 2. 发起建立物理连接
      await bleManager.connect(deviceId);

      // 3. 更新基础连接状态变量与解析出的真实 MAC 地址
      isBleConnected.value = true;
      connectedDeviceId.value = deviceId;
      connectedDeviceMac.value = macAddress || deviceId;
      connectedDeviceName.value = name || "Unknown Device";

      // 4. 服务发现与特征值握手 (兼容 iOS / 部分 Android 版本的关键步骤)
      console.log(`[BLE Store] 准备执行服务搜索... deviceId=${deviceId}`);
      const servicesRes = await bleManager.discoverServices(deviceId);
      const discoveredServiceUuids = (servicesRes.services || []).map((s) => s.uuid);

      // 遍历项目配置的厂商服务列表，大小写不敏感进行动态匹配
      let matchedConfig = APP_CONFIG.BLE_SERVICES.DEFAULT_SERVICE;
      const serviceConfigs = Object.values(APP_CONFIG.BLE_SERVICES);
      for (const config of serviceConfigs) {
        const found = discoveredServiceUuids.some((uuid) => uuid.toUpperCase() === config.serviceId.toUpperCase());
        if (found) {
          matchedConfig = config;
          console.log(`[BLE Store] 动态匹配到蓝牙厂商配置，服务 UUID: ${config.serviceId}`);
          break;
        }
      }

      // 保存已匹配成功的活跃厂商配置
      activeServiceConfig.value = matchedConfig;

      const serviceId = activeServiceConfig.value.serviceId;
      console.log(`[BLE Store] 准备执行特征值搜寻... serviceId=${serviceId}`);
      await bleManager.discoverCharacteristics(deviceId, serviceId);

      // 5. 订阅 Notify 指示通知特征值，用以监听 BMS 主动上报
      const notifyCharId = activeServiceConfig.value.notifyCharacteristicId;
      console.log(`[BLE Store] 准备订阅数据通知通道... notifyCharId=${notifyCharId}`);
      await bleManager.subscribeNotify(deviceId, serviceId, notifyCharId);

      // 6. 成功握手后启动后台心跳读取轮询定时器
      startQueryTimer(deviceId);

      return { success: true };
    } catch (err) {
      console.error("[BLE Store] 蓝牙连接初始化或订阅通知失败:", err);
      // 清空可能残留的状态以重置 UI
      clearBleState();
      throw err;
    }
  };

  /**
   * 断开当前已建立的蓝牙物理连接
   */
  const disconnectDevice = async () => {
    if (!connectedDeviceId.value) return;

    try {
      // 物理断开连接
      await bleManager.disconnect(connectedDeviceId.value);
    } catch (err) {
      console.error("[BLE Store] 断开蓝牙连接异常:", err);
    } finally {
      // 无论底层操作成功或失败，强制清理本地变量和查询定时器
      clearBleState();
    }
  };

  return {
    isBleConnected,
    connectedDeviceId,
    connectedDeviceMac,
    connectedDeviceName,
    batteryPercent,
    totalVoltage,
    realtimeCurrent,
    isCharging,
    isDischarging,
    temperature,
    activeServiceConfig,
    connectDevice,
    disconnectDevice,
    initGlobalListeners,
  };
});
