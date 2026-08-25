/**
 * 系统与应用权限管理器 - 微信小程序端专有实现 (WeChat Mini Program)
 * 纯净托管微信小程序环境下的蓝牙、位置 scope 授权检测、申请与设置页引导。
 */

import { translate } from "@/locale/i18n";

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
   */
  async diagnosePermissions(): Promise<{
    btHardware: boolean;
    gpsHardware: boolean;
    btPermission: boolean;
    locPermission: boolean;
  }> {
    return new Promise((resolve) => {
      const state = {
        btHardware: false,
        gpsHardware: false,
        btPermission: false,
        locPermission: false,
      };

      try {
        const systemInfo = uni.getSystemInfoSync() as any;

        // 1. 系统蓝牙硬件开关
        state.btHardware = systemInfo.bluetoothEnabled !== false;

        // 2. 手机系统定位开关 (微信小程序安卓端扫描蓝牙需系统 GPS 开启)
        state.gpsHardware = systemInfo.locationEnabled !== false;

        // 3. 微信小程序环境下的权限状态检测核查
        uni.getSetting({
          success: (res) => {
            const auth = (res.authSetting || {}) as Record<string, any>;
            // 小程序蓝牙状态 = 微信有系统级蓝牙授权 && 小程序自身已授权蓝牙 scope
            const wechatBtOk = systemInfo.bluetoothAuthorized !== false;
            state.btPermission = wechatBtOk && auth["scope.bluetooth"] === true;

            // 小程序位置状态 = 微信有系统级定位授权 && 小程序自身已授权位置 scope
            const wechatLocOk = systemInfo.locationAuthorized !== false;
            state.locPermission = wechatLocOk && auth["scope.userLocation"] === true;
            resolve(state);
          },
          fail: () => {
            state.btPermission = false;
            state.locPermission = false;
            resolve(state);
          },
        });
      } catch (err) {
        console.error("[BLE 权限诊断 MP] diagnosePermissions 异常:", err);
        resolve(state);
      }
    });
  },

  /**
   * 引导用户修复或授予特定权限
   */
  async requestSettingOrResolve(type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission"): Promise<boolean> {
    try {
      const systemInfo = uni.getSystemInfoSync() as any;

      return new Promise((resolve) => {
        // 1. 系统蓝牙硬件开关
        if (type === "btHardware") {
          uni.showModal({
            title: translate("bms.common.bluetoothTitle"),
            content: translate("bms.ble.env.bluetoothDisabled"),
            confirmText: translate("bms.common.confirm"),
            showCancel: false,
            success: () => resolve(false),
            fail: () => resolve(false),
          });
          return;
        }

        // 2. 系统定位硬件开关
        if (type === "gpsHardware") {
          uni.showModal({
            title: translate("bms.common.gpsTitle"),
            content: translate("bms.ble.env.locationDisabled"),
            confirmText: translate("bms.common.confirm"),
            showCancel: false,
            success: () => resolve(false),
            fail: () => resolve(false),
          });
          return;
        }

        // 3. 应用级蓝牙授权
        if (type === "btPermission") {
          if (systemInfo.bluetoothAuthorized === false) {
            uni.showModal({
              title: translate("bms.common.authPrompt"),
              content: translate("bms.ble.env.wechatBluetoothNotAuthorized"),
              showCancel: false,
            });
            return resolve(false);
          }

          uni.showModal({
            title: translate("bms.common.authPrompt"),
            content: translate("bms.ble.env.wechatBluetoothRefused"),
            confirmText: translate("bms.common.goSettings"),
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.openSetting({
                  success: (res) => {
                    const auth = (res.authSetting || {}) as Record<string, any>;
                    resolve(!!auth["scope.bluetooth"]);
                  },
                  fail: () => resolve(false),
                });
              } else {
                resolve(false);
              }
            },
            fail: () => resolve(false),
          });
          return;
        }

        // 4. 应用级定位授权
        if (type === "locPermission") {
          if (systemInfo.locationAuthorized === false) {
            uni.showModal({
              title: translate("bms.common.authPrompt"),
              content: translate("bms.ble.env.locationNotAuthorized"),
              showCancel: false,
            });
            return resolve(false);
          }

          uni.showModal({
            title: translate("bms.common.authPrompt"),
            content: translate("bms.ble.env.wechatLocationRefused"),
            confirmText: translate("bms.common.goSettings"),
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.openSetting({
                  success: (res) => {
                    const auth = (res.authSetting || {}) as Record<string, any>;
                    resolve(!!auth["scope.userLocation"]);
                  },
                  fail: () => resolve(false),
                });
              } else {
                resolve(false);
              }
            },
            fail: () => resolve(false),
          });
          return;
        }

        resolve(false);
      });
    } catch (err) {
      console.error("[BLE 权限修复 MP] requestSettingOrResolve 异常:", err);
      return Promise.resolve(false);
    }
  },

  /**
   * 诊断并检测微信小程序环境下的蓝牙和位置相关权限状态
   */
  async checkBleEnvironment(initBluetoothCallback: () => Promise<any>): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const systemInfo = uni.getSystemInfoSync() as any;

      // 1. 系统蓝牙硬件开关
      if (systemInfo.bluetoothEnabled === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled"));
      }

      // 2. 微信小程序必须开启手机"系统定位(GPS)"服务
      if (systemInfo.locationEnabled === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.GPS_DISABLED, "bms.ble.env.locationDisabled"));
      }

      // 3. 微信客户端自身在手机系统里的位置授权检测
      if (systemInfo.locationAuthorized === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.LOCATION_NOT_AUTHORIZED, "bms.ble.env.locationNotAuthorized"));
      }

      // 4. 小程序自身获取并引导申请微信蓝牙及位置的小程序授权
      try {
        const authorized = await this.checkWechatSetting();
        if (!authorized) return resolve(false);
      } catch (e) {
        return reject(e);
      }

      // 5. 动态验证蓝牙适配器
      initBluetoothCallback()
        .then(() => {
          resolve(true);
        })
        .catch((err: any) => {
          if (err.message && err.message.includes(translate("bms.ble.env.bluetoothDisabled"))) {
            reject(createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled"));
          } else {
            reject(err);
          }
        });
    });
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
