/**
 * 系统与应用权限管理器 - 微信小程序端专有实现 (WeChat Mini Program)
 * 纯净托管微信小程序环境下的蓝牙、位置 scope 授权检测、申请与设置页引导。
 */

import { translate } from "@/locale/i18n";
import type { PermissionDiagnosticState } from "./index";

/**
 * 蓝牙环境诊断错误码枚举常量
 */
export const BLE_ENV_ERROR = {
  /** 手机蓝牙开关未开启 */
  BLUETOOTH_DISABLED: "BLUETOOTH_DISABLED",
  /** 手机系统定位(GPS)服务未开启 */
  GPS_DISABLED: "GPS_DISABLED",
  /** 微信小程序蓝牙权限被拒绝 */
  WECHAT_BT_REFUSED: "WECHAT_BT_REFUSED",
  /** 微信小程序位置权限被拒绝 */
  WECHAT_LOC_REFUSED: "WECHAT_LOC_REFUSED",
  /** Android 附近设备/位置权限被用户拒绝 */
  ANDROID_PERMISSION_DENIED: "ANDROID_PERMISSION_DENIED",
  /** 微信小程序系统定位未授权 */
  LOCATION_NOT_AUTHORIZED: "LOCATION_NOT_AUTHORIZED",
} as const;

/**
 * 创建携带唯一错误码的环境错误对象
 * @param code BLE_ENV_ERROR 中定义的错误码字符串
 * @param translateKey i18n 翻译键名
 */
function createBleEnvError(code: string, translateKey: string): Error {
  const errMsg = translate(translateKey);
  console.log(`[BLE 权限 MP] 抛出环境错误: code=${code}, key=${translateKey}, message=${errMsg}`);
  const err = new Error(errMsg);
  err.name = code;
  return err;
}

export const permissionManager = {
  /**
   * 诊断并获取微信小程序环境下的硬件开关与小程序 scope 授权状态
   * 统一作为全站权限检测与扫描环境的单一真理源 (Single Source of Truth)
   */
  async diagnosePermissions(): Promise<PermissionDiagnosticState> {
    return new Promise((resolve) => {
      const state = {
        btHardware: false,
        gpsHardware: false,
        btPermission: false,
        locPermission: false,
      };

      try {
        const systemInfo = uni.getSystemInfoSync() as any;
        const isAndroid = (systemInfo.platform || "").toLowerCase() === "android";

        // 1. 系统蓝牙硬件开关
        state.btHardware = systemInfo.bluetoothEnabled !== false;

        // 2. 手机系统定位开关 (微信小程序安卓端扫描蓝牙需系统 GPS 开启；iOS 环境默认视为就绪)
        state.gpsHardware = isAndroid ? systemInfo.locationEnabled !== false : true;

        // 3. 微信小程序环境下的权限状态检测核查
        uni.getSetting({
          success: (res) => {
            const auth = (res.authSetting || {}) as Record<string, any>;
            // 小程序蓝牙状态 = 微信有系统级蓝牙授权 && 小程序自身已授权蓝牙 scope
            const wechatBtOk = systemInfo.bluetoothAuthorized !== false;
            state.btPermission = wechatBtOk && auth["scope.bluetooth"] === true;

            // 小程序位置状态 = 微信有系统级定位授权 && 小程序自身已授权位置 scope
            if (isAndroid) {
              const wechatLocOk = systemInfo.locationAuthorized !== false;
              state.locPermission = wechatLocOk && auth["scope.userLocation"] === true;
            } else {
              state.locPermission = true;
            }

            // 统一计算当前平台是否全部就绪以及首个阻断项类型（单一真理源）
            let isReady = false;
            let firstBlockingType: "btHardware" | "gpsHardware" | "btPermission" | "locPermission" | null = null;

            if (isAndroid) {
              isReady = state.btHardware && state.gpsHardware && state.btPermission && state.locPermission;
              if (!state.btHardware) {
                firstBlockingType = "btHardware";
              } else if (!state.gpsHardware) {
                firstBlockingType = "gpsHardware";
              } else if (!state.btPermission) {
                firstBlockingType = "btPermission";
              } else if (!state.locPermission) {
                firstBlockingType = "locPermission";
              }
            } else {
              // iOS 或其他端无需位置约束
              isReady = state.btHardware && state.btPermission;
              if (!state.btHardware) {
                firstBlockingType = "btHardware";
              } else if (!state.btPermission) {
                firstBlockingType = "btPermission";
              }
            }

            const finalState: PermissionDiagnosticState = {
              ...state,
              isReady,
              firstBlockingType,
            };
            resolve(finalState);
          },
          fail: () => {
            state.btPermission = false;
            state.locPermission = !isAndroid;
            resolve({
              ...state,
              isReady: false,
              firstBlockingType: "btPermission",
            });
          },
        });
      } catch (err) {
        console.error("[BLE 权限诊断 MP] diagnosePermissions 异常:", err);
        resolve({
          ...state,
          isReady: false,
          firstBlockingType: "btHardware",
        });
      }
    });
  },

  /**
   * 引导用户修复或授予特定权限（底层直接触发小程序设置页跳转或提示，不含任何视图弹窗）
   */
  async requestSettingOrResolve(type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission"): Promise<boolean> {
    try {
      if (type === "btHardware") {
        this.openBluetoothSettings();
        return false;
      }

      if (type === "gpsHardware") {
        this.openGpsSettings();
        return false;
      }

      if (type === "btPermission" || type === "locPermission") {
        return new Promise((resolve) => {
          uni.openSetting({
            success: (res) => {
              const auth = (res.authSetting || {}) as Record<string, any>;
              if (type === "btPermission") {
                resolve(!!auth["scope.bluetooth"]);
              } else {
                resolve(!!auth["scope.userLocation"]);
              }
            },
            fail: () => resolve(false),
          });
        });
      }

      return false;
    } catch (err) {
      console.error("[BLE 权限修复 MP] requestSettingOrResolve 异常:", err);
      return false;
    }
  },

  /**
   * 诊断并检测微信小程序环境下的蓝牙和位置相关权限状态
   * 完全委托单一真理源 diagnosePermissions 执行检测，消除两套逻辑不一致的隐患
   * @param initBluetoothCallback 用于进行动态蓝牙适配器初始化的回调函数
   */
  async checkBleEnvironment(initBluetoothCallback: () => Promise<any>): Promise<boolean> {
    const systemInfo = uni.getSystemInfoSync() as any;

    // 1. 若首次启动尚未授权，尝试动态申请微信小程序对蓝牙及位置的 scope 授权
    try {
      await this.checkWechatSetting();
    } catch (e) {
      console.warn("[BLE 权限 MP] checkWechatSetting 申请或校验过程异常:", e);
    }

    // 2. 统一调取全站唯一的系统硬件与权限诊断结果
    const diagState = await this.diagnosePermissions();

    if (!diagState.isReady) {
      if (diagState.firstBlockingType === "btHardware") {
        throw createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled");
      }
      if (diagState.firstBlockingType === "gpsHardware") {
        throw createBleEnvError(BLE_ENV_ERROR.GPS_DISABLED, "bms.ble.env.locationDisabled");
      }
      if (diagState.firstBlockingType === "btPermission") {
        if (systemInfo.bluetoothAuthorized === false) {
          throw createBleEnvError(BLE_ENV_ERROR.WECHAT_BT_REFUSED, "bms.ble.env.wechatBluetoothNotAuthorized");
        }
        throw createBleEnvError(BLE_ENV_ERROR.WECHAT_BT_REFUSED, "bms.ble.env.wechatBluetoothRefused");
      }
      if (diagState.firstBlockingType === "locPermission") {
        if (systemInfo.locationAuthorized === false) {
          throw createBleEnvError(BLE_ENV_ERROR.LOCATION_NOT_AUTHORIZED, "bms.ble.env.locationNotAuthorized");
        }
        throw createBleEnvError(BLE_ENV_ERROR.WECHAT_LOC_REFUSED, "bms.ble.env.wechatLocationRefused");
      }
    }

    // 3. 动态验证补充诊断：尝试调用底层蓝牙适配器初始化
    try {
      await initBluetoothCallback();
      return true;
    } catch (err: any) {
      if (err.message && err.message.includes(translate("bms.ble.env.bluetoothDisabled"))) {
        throw createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled");
      }
      throw err;
    }
  },

  /**
   * 检查并动态申请微信小程序对蓝牙及位置的服务授权
   */
  checkWechatSetting(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      uni.getSetting({
        success: (res) => {
          const auth = (res.authSetting || {}) as Record<string, any>;

          if (auth["scope.bluetooth"] === false) {
            return reject(createBleEnvError(BLE_ENV_ERROR.WECHAT_BT_REFUSED, "bms.ble.env.wechatBluetoothRefused"));
          }

          if (auth["scope.userLocation"] === false) {
            return reject(createBleEnvError(BLE_ENV_ERROR.WECHAT_LOC_REFUSED, "bms.ble.env.wechatLocationRefused"));
          }

          if (auth["scope.bluetooth"] === undefined || auth["scope.userLocation"] === undefined) {
            const authorizePromises: Promise<boolean>[] = [];

            if (auth["scope.bluetooth"] === undefined) {
              authorizePromises.push(
                new Promise((r) => {
                  uni.authorize({
                    scope: "scope.bluetooth",
                    success: () => r(true),
                    fail: () => r(false),
                  });
                }),
              );
            }
            if (auth["scope.userLocation"] === undefined) {
              authorizePromises.push(
                new Promise((r) => {
                  uni.authorize({
                    scope: "scope.userLocation",
                    success: () => r(true),
                    fail: () => r(false),
                  });
                }),
              );
            }

            Promise.all(authorizePromises).then((results) => {
              resolve(results.every((val) => val === true));
            });
            return;
          }

          resolve(true);
        },
        fail: () => resolve(false),
      });
    });
  },

  /**
   * 小程序启动静默方法（空操作）
   */
  requestAppPermissionsOnLaunch(): void {
    // 微信小程序在实际使用时按需申请，启动时不抢占
  },

  /**
   * 打开小程序权限设置页
   */
  openAppSettings(): void {
    uni.openSetting();
  },

  /**
   * 提示用户开启系统蓝牙
   */
  openBluetoothSettings(): void {
    uni.showToast({
      title: translate("bms.ble.env.bluetoothDisabled"),
      icon: "none",
    });
  },

  /**
   * 提示用户开启系统定位
   */
  openGpsSettings(): void {
    uni.showToast({
      title: translate("bms.ble.env.locationDisabled"),
      icon: "none",
    });
  },
};
