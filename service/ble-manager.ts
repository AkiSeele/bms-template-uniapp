/**
 * 核心蓝牙服务通信管理器 (BLE Manager Service)
 * 集中维护并管理手机低功耗蓝牙 (BLE) 底层的扫描、连接、特征值监听与数据写入生命周期。
 * 职责分工：仅负责蓝牙协议数据交互，系统及应用权限判断已完全剥离至 service/permission.ts 中。
 */

import { APP_CONFIG } from "@/config";
import { hexStringToUint8Array } from "@/utils/bms-helper";
import { translate } from "@/locale/i18n";
import { useLogStore } from "@/stores/log-store";

// 全局低功耗蓝牙当前协商成功的最大单包数据发送载荷限额（初始化时读取配置的默认 MTU 缓存，协商成功后自动拓宽，iOS 自动，Android 手动）
let currentMtu = APP_CONFIG.BLE_SCAN.DEFAULT_MTU;

// 缓存回调函数的引用以防止内存泄漏
let activeDeviceFoundCallback: ((res: any) => void) | null = null;

export const bleManager = {
  /**
   * 初始化手机蓝牙适配器模块
   */
  initBluetooth(): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // 在 H5 平台下进行防护拦截，防止直接抛出 TypeError 异常导致页面挂起
      if (typeof uni.openBluetoothAdapter !== "function") {
        return reject(
          new Error(
            "H5 platform does not support BLE module, please test in WeChat mini program or App containers on real devices.",
          ),
        );
      }

      uni.openBluetoothAdapter({
        success: (res) => {
          try {
            useLogStore().addConnectionLog("uni.openBluetoothAdapter", undefined, res, "success");
          } catch (e) {}
          resolve(res);
        },
        fail: (err: any) => {
          console.error("[BLE 错误] 手机蓝牙未开启或未授权适配器:", err);
          // 拦截错误码 10001（系统蓝牙关闭）或包含特定关键字 of 系统报错，标准化转换为友好中文字符串抛出
          const isPowerOff =
            err.errCode === 10001 ||
            (err.errMsg && (err.errMsg.indexOf("not available") !== -1 || err.errMsg.indexOf("power off") !== -1));
          try {
            useLogStore().addConnectionLog("uni.openBluetoothAdapter", undefined, err, "fail");
          } catch (e) {}
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
      if (typeof uni.startBluetoothDevicesDiscovery !== "function") {
        return reject(
          new Error(
            "H5 platform does not support starting Bluetooth device discovery, please test in a real device environment.",
          ),
        );
      }

      // 先注销旧的设备发现监听回调以防止内存泄漏
      if (typeof uni.offBluetoothDeviceFound === "function") {
        try {
          if (activeDeviceFoundCallback) {
            uni.offBluetoothDeviceFound(activeDeviceFoundCallback);
          } else {
            uni.offBluetoothDeviceFound();
          }
        } catch (e) {
          console.error("注销旧的发现设备监听异常:", e);
        }
        activeDeviceFoundCallback = null;
      }

      // 保存本次的回调引用
      activeDeviceFoundCallback = (res: any) => {
        res.devices.forEach((device: UniApp.BluetoothDeviceInfo) => {
          if (device.name || device.localName) {
            onDeviceFound(device);
          }
        });
      };

      // 注册回调监听
      uni.onBluetoothDeviceFound(activeDeviceFoundCallback);

      // 启动蓝牙搜索
      console.warn("[BLE Manager] 启动低功耗蓝牙适配器设备发现扫描 (startBluetoothDevicesDiscovery)...");
      
      const scanParams: UniApp.StartBluetoothDevicesDiscoveryOptions = {
        allowDuplicatesKey: true,
      };

      // 动态注入过滤主服务 UUID 列表，避开微信小程序传入空数组 [] 导致扫描列表全空的问题
      const filterServices = APP_CONFIG.BLE_SCAN.SCAN_SERVICES;
      if (filterServices && filterServices.length > 0) {
        scanParams.services = filterServices;
        console.log("[BLE Manager] 开启蓝牙扫描过滤，目标服务 UUID:", filterServices);
      }

      uni.startBluetoothDevicesDiscovery({
        ...scanParams,
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },

  /**
   * 停止扫描蓝牙设备
   */
  stopScan(): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      if (typeof uni.stopBluetoothDevicesDiscovery !== "function") {
        return resolve({ errMsg: "stopBluetoothDevicesDiscovery:ok" });
      }

      console.warn("[BLE Manager] 停止低功耗蓝牙设备扫描 (stopBluetoothDevicesDiscovery)...");

      // 注销回调以防止内存泄漏
      if (typeof uni.offBluetoothDeviceFound === "function") {
        try {
          if (activeDeviceFoundCallback) {
            console.log("[BLE Manager] 检测到活跃的设备发现回调引用，正在注销以防内存泄漏");
            uni.offBluetoothDeviceFound(activeDeviceFoundCallback);
          } else {
            console.log("[BLE Manager] 未检测到活跃的回调引用，清除所有监听器");
            uni.offBluetoothDeviceFound();
          }
        } catch (e) {
          console.error("停止扫描时注销发现设备监听异常:", e);
        }
        activeDeviceFoundCallback = null;
      }

      uni.stopBluetoothDevicesDiscovery({
        success: (res) => {
          resolve(res);
        },
        fail: (err) => {
          console.error("[BLE Manager] 调用停止手机蓝牙硬件扫描接口失败:", err);
          reject(err);
        },
      });
    });
  },

  /**
   * 建立低功耗蓝牙物理连接
   * @param deviceId 蓝牙设备的 MAC 地址或 UUID
   */
  connect(deviceId: string): Promise<UniApp.GeneralCallbackResult> {
    const timeout = APP_CONFIG.BLE_SCAN.CONNECT_TIMEOUT_MS;
    const limit = APP_CONFIG.BLE_SCAN.RECONNECT_LIMIT;

    const attemptConnect = (remainingRetries: number): Promise<UniApp.GeneralCallbackResult> => {
      return new Promise((resolve, reject) => {
        // H5 platform protection
        if (typeof uni.createBLEConnection !== "function") {
          return reject(
            new Error(
              "H5 platform does not support creating BLE connection, please test in a real device environment.",
            ),
          );
        }

        console.log(`[蓝牙连接] 尝试连接设备: ${deviceId}, 超时配置: ${timeout}ms, 剩余重试次数: ${remainingRetries}`);
        uni.createBLEConnection({
          deviceId,
          timeout,
          success: (res) => {
            console.log(`[蓝牙连接] 成功建立蓝牙物理连接!`);
            resolve(res);
          },
          fail: (err) => {
            console.warn(`[蓝牙连接] 蓝牙连接失败:`, err);
            if (remainingRetries > 0) {
              console.warn(`[蓝牙连接] 还有重试机会，正在进行连接重试...`);
              setTimeout(() => {
                attemptConnect(remainingRetries - 1)
                  .then(resolve)
                  .catch(reject);
              }, APP_CONFIG.BLE_SCAN.RECONNECT_DELAY_MS);
            } else {
              reject(err);
            }
          },
        });
      });
    };

    return attemptConnect(limit);
  },

  /**
   * 断开与蓝牙外设的连接，注销连接生命周期
   * @param deviceId 目标断开连接的设备 ID
   */
  disconnect(deviceId: string): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // 每次断开连接时，强制重置本地的 MTU 协商状态缓存，退回全局配置中默认的包大小限额
      currentMtu = APP_CONFIG.BLE_SCAN.DEFAULT_MTU;

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
   * 用于实时接收 BMS 电池外设发送 of 二进制数据帧
   */
  subscribeNotify(
    deviceId: string,
    serviceId: string,
    characteristicId: string,
  ): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve, reject) => {
      // H5 平台防护拦截
      if (typeof uni.notifyBLECharacteristicValueChange !== "function") {
        return reject(
          new Error("H5 platform does not support subscribing to characteristic value change notifications."),
        );
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
        return reject(new Error("H5 platform does not support discovering BLE services."));
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
        return reject(new Error("H5 platform does not support discovering BLE characteristics."));
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
   * 协商并设定低功耗蓝牙的 MTU 传输单元大小 (仅在 Android 平台及微信小程序等非 iOS 平台生效)
   * @param deviceId 蓝牙设备 ID
   * @param mtu 期望协商的 MTU 字节数 (推荐 247)
   */
  setMTU(deviceId: string, mtu: number): Promise<UniApp.GeneralCallbackResult> {
    return new Promise((resolve) => {
      // #ifdef APP-PLUS || MP-WEIXIN
      // iOS 不支持在应用层主动设置 MTU，由系统自动协商；Android 与微信小程序必须手动发起
      if (typeof uni.setBLEMTU === "function") {
        uni.setBLEMTU({
          deviceId,
          mtu,
          success: (res) => {
            // 严格遵循 uni-app 规范：success 回调参数为 UniApp.GeneralCallbackResult（不包含 mtu 字段）
            // 当 MTU 协商请求成功时，将当前最大物理载荷更新为所请求的 mtu 大小（扣除 3 字节开销，且不小于全局配置默认值）
            currentMtu = Math.max(APP_CONFIG.BLE_SCAN.DEFAULT_MTU, mtu - 3);
            console.log(`[BLE Manager] MTU 协商成功，设定实际发送载荷: ${currentMtu} 字节`);
            resolve(res);
          },
          fail: (err) => {
            console.warn(`[BLE Manager] MTU 协商失败，沿用全局配置默认限额 ${APP_CONFIG.BLE_SCAN.DEFAULT_MTU} 字节:`, err);
            currentMtu = APP_CONFIG.BLE_SCAN.DEFAULT_MTU;
            resolve({ errMsg: `setBLEMTU:fail, fallback to ${APP_CONFIG.BLE_SCAN.DEFAULT_MTU}` });
          },
        });
        return;
      }
      // #endif
      resolve({ errMsg: "setBLEMTU:not supported on this platform" });
    });
  },

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
        return reject(new Error("H5 platform does not support writing characteristic value command."));
      }

      try {
        const rawBytes = hexStringToUint8Array(commandHex);
        const buffer = rawBytes.buffer;
        // 动态使用已协商成功或默认的物理载荷限额（默认为 20 字节，协商成功后自动拓宽）
        const mtu = currentMtu;

        console.log(`[BLE 发送] 下发物理指令 (HEX): ${commandHex}, 分包载荷 MTU: ${mtu} 字节`);

        // 记录指令发送日志
        try {
          useLogStore().addCommandLog("TX", commandHex);
        } catch (e) {}

        // 对大包数据执行动态切片分包下发
        for (let i = 0; i < buffer.byteLength; i += mtu) {
          const chunk = buffer.slice(i, i + mtu);
          const chunkHex = Array.from(new Uint8Array(chunk))
            .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
            .join("");

          if (buffer.byteLength > mtu) {
            console.log(
              `  └─ [分包发送] 偏移: ${i}/${buffer.byteLength}, 长度: ${chunk.byteLength}, 字节: ${chunkHex}`,
            );
          }

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

          // 每次分包发送之间给与小延时，以防包拥塞导致底层丢包
          await new Promise((resolveDelay) => setTimeout(resolveDelay, APP_CONFIG.BLE_SCAN.CHUNK_DELAY_MS));
        }
        resolve();
      } catch (err) {
        console.error("[BLE 写入错误] 下发数据指令发送失败:", err);
        reject(err);
      }
    });
  },
};
