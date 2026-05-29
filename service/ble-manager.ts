/**
 * 核心蓝牙服务通信管理器 (BLE Manager Service)
 * 集中维护并管理手机低功耗蓝牙 (BLE) 底层的扫描、连接、特征值监听与数据写入生命周期。
 * 职责分工：仅负责蓝牙协议数据交互，系统及应用权限判断已完全剥离至 service/permission.ts 中。
 */

import { APP_CONFIG } from "@/config";
import { hexStringToUint8Array } from "@/utils/bms-helper";
import { translate } from "@/locale/i18n";

export const bleManager = {
  /**
   * 初始化手机蓝牙适配器模块
   */
  initBluetooth(): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // 在 H5 平台下进行防护拦截，防止直接抛出 TypeError 异常导致页面挂起
      if (typeof uni.openBluetoothAdapter !== "function") {
        return reject(new Error("H5 平台不支持低功耗蓝牙 (BLE) 物理模块，请在真机小程序或 App 容器中测试。"));
      }

      uni.openBluetoothAdapter({
        success: (res) => resolve(res),
        fail: (err: any) => {
          console.error("[BLE 错误] 手机蓝牙未开启或未授权适配器:", err);
          // 拦截错误码 10001（系统蓝牙关闭）或包含特定关键字的系统报错，标准化转换为友好中文字符串抛出
          const isPowerOff =
            err.errCode === 10001 ||
            (err.errMsg && (err.errMsg.indexOf("not available") !== -1 || err.errMsg.indexOf("power off") !== -1));
          if (isPowerOff) {
            reject(new Error(translate("bms.ble.env.bluetoothDisabled")));
          } else {
            reject(new Error(err.errMsg || String(err)));
          }
        },
      });
    });
  },

  /**
   * 开启蓝牙设备扫描搜索服务
   * @param onDeviceFound 监听到新外设上报时的实时回调函数
   */
  startScan(onDeviceFound: (device: UniApp.BluetoothDeviceInfo) => void): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // H5 平台防护拦截
      if (typeof uni.startBluetoothDevicesDiscovery !== "function") {
        return reject(new Error("H5 平台不支持启动蓝牙设备扫描发现，请在真机环境中测试。"));
      }

      // 开启监听新外设发现的 API
      uni.onBluetoothDeviceFound((res) => {
        res.devices.forEach((device) => {
          if (device.name || device.localName) {
            onDeviceFound(device);
          }
        });
      });

      // 启动蓝牙搜索
      uni.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 停止扫描蓝牙设备（连接蓝牙前必须主动停止，以防占用带宽或导致连接失败）
   */
  stopScan(): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // H5 平台防护拦截，优雅放行，避免阻断后面的物理连接逻辑
      if (typeof uni.stopBluetoothDevicesDiscovery !== "function") {
        return resolve({ errMsg: "stopBluetoothDevicesDiscovery:ok" });
      }

      uni.stopBluetoothDevicesDiscovery({
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 建立低功耗蓝牙物理连接
   * @param deviceId 蓝牙设备的 MAC 地址或 UUID
   */
  connect(deviceId: string): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // H5 平台防护拦截
      if (typeof uni.createBLEConnection !== "function") {
        return reject(new Error("H5 平台不支持建立低功耗蓝牙物理连接，请在真机环境中测试。"));
      }

      uni.createBLEConnection({
        deviceId,
        timeout: 10000, // 10秒连接超时判定
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 断开与蓝牙外设的连接，注销连接生命周期
   * @param deviceId 目标断开连接的设备 ID
   */
  disconnect(deviceId: string): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // H5 平台防护拦截
      if (typeof uni.closeBLEConnection !== "function") {
        return resolve({ errMsg: "closeBLEConnection:ok" });
      }

      uni.closeBLEConnection({
        deviceId,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 开启对指定特征值（Notification / Indication）的通知监听
   * 用于实时接收 BMS 电池外设发送的二进制数据帧
   */
  subscribeNotify(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
  ): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // H5 平台防护拦截
      if (typeof uni.notifyBLECharacteristicValueChange !== "function") {
        return reject(new Error("H5 平台不支持订阅蓝牙特征值变化通知。"));
      }

      // 开启通知监听开关
      uni.notifyBLECharacteristicValueChange({
        state: true,
        deviceId,
        serviceId,
        characteristicId,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 监听全局低功耗蓝牙设备连接状态改变事件
   * @param callback 状态变化的回调函数
   */
  onConnectionChange(callback: (res: UniApp.OnBLEConnectionStateChangeListenerResult) => void): void {
    if (typeof uni.onBLEConnectionStateChange === "function") {
      uni.onBLEConnectionStateChange(callback);
    }
  },

  /**
   * 监听全局低功耗蓝牙特征值数据变化上报事件
   * @param callback 特征值数据变化的回调函数
   */
  onCharacteristicValueChange(callback: (res: UniApp.OnBLECharacteristicValueChangeSuccess) => void): void {
    if (typeof uni.onBLECharacteristicValueChange === "function") {
      uni.onBLECharacteristicValueChange(callback);
    }
  },

  /**
   * 发现已连接蓝牙设备的所有主服务 (兼容 iOS 的必备流程)
   * @param deviceId 蓝牙设备 ID
   */
  discoverServices(deviceId: string): Promise<UniApp.GetBLEDeviceServicesSuccess> {
    return new Promise((resolve, reject) => {
      if (typeof uni.getBLEDeviceServices !== "function") {
        return reject(new Error("H5 平台不支持发现蓝牙设备服务。"));
      }

      uni.getBLEDeviceServices({
        deviceId,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 发现蓝牙设备指定服务下的所有特征值 (兼容 iOS 的必备流程)
   * @param deviceId 蓝牙设备 ID
   * @param serviceId 蓝牙主服务 UUID
   */
  discoverCharacteristics(deviceId: string, serviceId: string): Promise<UniApp.GetBLEDeviceCharacteristicsSuccess> {
    return new Promise((resolve, reject) => {
      if (typeof uni.getBLEDeviceCharacteristics !== "function") {
        return reject(new Error("H5 平台不支持发现蓝牙设备特征值。"));
      }

      uni.getBLEDeviceCharacteristics({
        deviceId,
        serviceId,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 向 BMS 蓝牙设备写入指令字节数据（支持底层自动分包以避让 MTU 字节限制）
   * @param deviceId 蓝牙设备 ID
   * @param commandHex 十六进制指令字符串，如 "A55A010100"
   */
  /**
   * 向 BMS 蓝牙设备写入指令字节数据（支持底层自动分包以避让 MTU 字节限制）
   * @param deviceId 蓝牙设备 ID
   * @param commandHex 十六进制指令字符串，如 "A55A010100"
   * @param serviceId 目标蓝牙服务 UUID
   * @param characteristicId 目标写入特征值 UUID
   */
  writeCommand(deviceId: string, commandHex: string, serviceId: string, characteristicId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // H5 平台防护拦截
      if (typeof uni.writeBLECharacteristicValue !== "function") {
        return reject(new Error("H5 平台不支持下发蓝牙特征值指令。"));
      }

      try {
        const rawBytes = hexStringToUint8Array(commandHex);
        const buffer = rawBytes.buffer;
        const mtu = 20; // 多数低功耗蓝牙单次最大传输载荷默认限制为 20 字节

        // 对大包数据执行切片分包下发
        for (let i = 0; i < buffer.byteLength; i += mtu) {
          const chunk = buffer.slice(i, i + mtu);

          await new Promise<void>((resolveChunk, rejectChunk) => {
            uni.writeBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId,
              value: chunk as any, // 强制断言为 any 绕过官方 types 中关于 value 被错标为 any[] 的校验 Bug
              success: () => resolveChunk(),
              fail: (err) => rejectChunk(err),
            });
          });

          // 每次分包发送之间给与 50 毫秒的小延时，以防包拥塞导致底层丢包
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
        }
        resolve();
      } catch (err) {
        console.error("[BLE 写入错误] 下发数据指令发送失败:", err);
        reject(err);
      }
    });
  },
};
