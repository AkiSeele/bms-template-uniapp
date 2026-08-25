/**
 * 系统与应用权限管理器 - App 端专有实现 (Android & iOS)
 * 依赖 HTML5+ 原生桥接能力，处理原生底层硬件开关、动态权限直申与系统设置跳转。
 */

import { APP_CONFIG } from "@/config";
import { translate } from "@/locale/i18n";
import { isAppAndroid, isAppIOS } from "@uni-helper/uni-env";

// 声明 html5+ 原生桥接命名空间变量，防止 TS 编译器因缺少 plus 类型定义而报错
declare const plus: any;

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
  console.log(`[BLE 权限 App] 抛出环境错误: code=${code}, key=${translateKey}, message=${errMsg}`);
  const err = new Error(errMsg);
  err.name = code;
  return err;
}

export const permissionManager = {
  /**
   * 诊断并获取当前系统的所有硬件服务开关和应用级权限状态，返回结构化状态数据
   */
  async diagnosePermissions(): Promise<{
    btHardware: boolean;
    gpsHardware: boolean;
    btPermission: boolean;
    locPermission: boolean;
  }> {
    return new Promise(async (resolve) => {
      const state = {
        btHardware: false,
        gpsHardware: false,
        btPermission: false,
        locPermission: false,
      };

      try {
        const systemInfo = uni.getSystemInfoSync();

        // 1. 系统蓝牙硬件开关
        let btEnabled = systemInfo.bluetoothEnabled !== false;

        if (isAppAndroid) {
          try {
            const BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter");
            const adapter = BluetoothAdapter.getDefaultAdapter();
            btEnabled = adapter ? adapter.isEnabled() : false;
          } catch (e) {
            console.error("[BLE 权限诊断 App] Android 获取蓝牙物理开关异常:", e);
            btEnabled = systemInfo.bluetoothEnabled !== false;
          }
        } else {
          // iOS App
          try {
            await new Promise<void>((r) => {
              uni.getBluetoothAdapterState({
                success: (adapter) => {
                  btEnabled = !!adapter.available;
                  r();
                },
                fail: async (err: any) => {
                  const code = err.errCode || err.code;
                  if (code === 10001) {
                    btEnabled = false;
                    r();
                  } else if (code === 10000) {
                    try {
                      uni.openBluetoothAdapter({
                        success: () => {
                          btEnabled = true;
                          uni.closeBluetoothAdapter();
                          r();
                        },
                        fail: (openErr: any) => {
                          const openCode = openErr.errCode || openErr.code;
                          btEnabled = openCode === 10001 ? false : systemInfo.bluetoothEnabled !== false;
                          r();
                        },
                      });
                    } catch (e) {
                      btEnabled = systemInfo.bluetoothEnabled !== false;
                      r();
                    }
                  } else {
                    btEnabled = systemInfo.bluetoothEnabled !== false;
                    r();
                  }
                },
              });
            });
          } catch (e) {
            btEnabled = systemInfo.bluetoothEnabled !== false;
          }
        }

        state.btHardware = btEnabled;

        // 2. 系统定位硬件开关 (GPS)
        if (isAppIOS) {
          // iOS 系统的蓝牙扫描不需要系统 GPS 定位服务开启
          state.gpsHardware = true;
        } else if (isAppAndroid) {
          state.gpsHardware = this.checkAndroidGps();
        } else {
          state.gpsHardware = systemInfo.locationEnabled !== false;
        }

        // 3. 原生应用级权限检测
        if (isAppAndroid) {
          try {
            const context = plus.android.runtimeMainActivity();
            const Build = plus.android.importClass("android.os.Build");
            const sdkVersion = Build.VERSION.SDK_INT;

            // Android 12+ (sdkVersion >= 31) 附近设备权限
            if (sdkVersion >= 31) {
              const hasBtScan = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN) === 0;
              const hasBtConnect = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT) === 0;
              state.btPermission = hasBtScan && hasBtConnect;
            } else {
              state.btPermission = true;
            }

            // Android 应用级定位权限
            state.locPermission = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
          } catch (e) {
            console.error("[BLE 权限诊断 App] Android 原生权限诊断异常:", e);
          }
          resolve(state);
        } else if (isAppIOS) {
          try {
            state.locPermission = true;
            if (typeof uni.getAppAuthorizeSetting === "function") {
              const authSetting = uni.getAppAuthorizeSetting();
              state.btPermission = authSetting.bluetoothAuthorized === "authorized";
            } else {
              state.btPermission = true;
            }
          } catch (e) {
            console.error("[BLE 权限诊断 App] iOS 原生权限诊断异常:", e);
          }
          resolve(state);
        } else {
          state.btPermission = true;
          state.locPermission = true;
          resolve(state);
        }
      } catch (err) {
        console.error("[BLE 权限诊断 App] diagnosePermissions 异常:", err);
        resolve(state);
      }
    });
  },

  /**
   * 引导用户修复或授予特定权限
   */
  async requestSettingOrResolve(type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission"): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        // 1. 系统蓝牙硬件开关
        if (type === "btHardware") {
          uni.showModal({
            title: translate("bms.common.bluetoothTitle"),
            content: translate("bms.ble.env.bluetoothDisabled"),
            confirmText: translate("bms.common.goOpen"),
            cancelText: translate("bms.common.cancel"),
            success: (modalRes) => {
              if (modalRes.confirm && isAppAndroid) {
                this.openBluetoothSettings();
                return resolve(true);
              }
              resolve(false);
            },
            fail: () => resolve(false),
          });
          return;
        }

        // 2. 系统定位硬件开关
        if (type === "gpsHardware") {
          uni.showModal({
            title: translate("bms.common.gpsTitle"),
            content: translate("bms.ble.env.locationDisabled"),
            confirmText: translate("bms.common.goOpen"),
            cancelText: translate("bms.common.cancel"),
            success: (modalRes) => {
              if (modalRes.confirm && isAppAndroid) {
                this.openGpsSettings();
                return resolve(true);
              }
              resolve(false);
            },
            fail: () => resolve(false),
          });
          return;
        }

        // 3. 应用级蓝牙授权
        if (type === "btPermission") {
          if (isAppAndroid) {
            const permissions = [
              APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN,
              APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT,
            ];
            plus.android.requestPermissions(permissions, (res: any) => {
              const isAllGranted = permissions.every((p) => (res.granted || []).includes(p));
              if (isAllGranted) {
                resolve(true);
              } else {
                uni.showModal({
                  title: translate("bms.common.permissionDeniedTitle"),
                  content: translate("bms.ble.env.androidPermissionDenied"),
                  confirmText: translate("bms.common.goSettings"),
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      this.openAppSettings();
                    }
                    resolve(false);
                  },
                });
              }
            });
            return;
          } else if (isAppIOS) {
            this.openAppSettings();
            return resolve(false);
          }
          return resolve(false);
        }

        // 4. 应用级定位授权
        if (type === "locPermission") {
          if (isAppAndroid) {
            const permissions = [APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION];
            plus.android.requestPermissions(permissions, (res: any) => {
              const isAllGranted = permissions.every((p) => (res.granted || []).includes(p));
              if (isAllGranted) {
                resolve(true);
              } else {
                uni.showModal({
                  title: translate("bms.common.permissionDeniedTitle"),
                  content: translate("bms.ble.env.androidPermissionDenied"),
                  confirmText: translate("bms.common.goSettings"),
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      this.openAppSettings();
                    }
                    resolve(false);
                  },
                });
              }
            });
            return;
          } else if (isAppIOS) {
            this.openAppSettings();
            return resolve(false);
          }
          return resolve(false);
        }

        resolve(false);
      });
    } catch (err) {
      console.error("[BLE 权限修复 App] requestSettingOrResolve 异常:", err);
      return Promise.resolve(false);
    }
  },

  /**
   * 诊断并检测当前运行环境下的蓝牙和位置相关权限状态
   * @param initBluetoothCallback 用于进行动态蓝牙适配器初始化的回调函数
   */
  async checkBleEnvironment(initBluetoothCallback: () => Promise<any>): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const systemInfo = uni.getSystemInfoSync();

      // 1. 静态环境诊断：检测手机系统的蓝牙硬件开关
      if (systemInfo.bluetoothEnabled === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled"));
      }

      // 2. Android 动态权限与 GPS 校验
      if (isAppAndroid) {
        try {
          const hasPermission = await this.requestAndroidPermissions(systemInfo);
          if (!hasPermission) {
            return reject(
              createBleEnvError(BLE_ENV_ERROR.ANDROID_PERMISSION_DENIED, "bms.ble.env.androidPermissionDenied"),
            );
          }
        } catch (e) {
          return reject(e);
        }

        try {
          const gpsEnabled = this.checkAndroidGps();
          if (!gpsEnabled) {
            return reject(createBleEnvError(BLE_ENV_ERROR.GPS_DISABLED, "bms.ble.env.androidGpsDisabled"));
          }
        } catch (e) {
          return reject(e);
        }
      }

      // 3. 动态验证补充诊断：尝试调用底层蓝牙适配器
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
   * Android App：根据当前设备的 Android 系统版本动态申请蓝牙扫描运行时权限
   */
  requestAndroidPermissions(systemInfo: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const permissions: string[] = [];

      try {
        const context = plus.android.runtimeMainActivity();
        const Build = plus.android.importClass("android.os.Build");
        const sdkVersion = Build.VERSION.SDK_INT;

        if (sdkVersion >= 31) {
          const btScanGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN) === 0;
          const btConnectGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT) === 0;

          if (!btScanGranted) {
            permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
          }
          if (!btConnectGranted) {
            permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);
          }
        }

        const locGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
        if (!locGranted) {
          permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
        }
      } catch (e) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      }

      if (permissions.length === 0) {
        console.log("[BLE 权限 App] 附近设备及定位权限已被预先授权通过，快速放行蓝牙流程");
        return resolve(true);
      }

      console.log("[BLE 权限 App] 混合核验 - 开始请求 Android 必要权限:", permissions);

      plus.android.requestPermissions(
        permissions,
        (resultObj: any) => {
          const granted: string[] = resultObj.granted || [];
          const isAllGranted = permissions.every((p) => granted.includes(p));

          if (isAllGranted) {
            console.log("[BLE 权限 App] 核心权限全部授权通过，放行蓝牙流程");
            resolve(true);
          } else {
            const deniedFriendlyNames: string[] = [];
            const allDenied = permissions.filter((p) => !granted.includes(p));

            if (allDenied.some((p) => p.includes("BLUETOOTH"))) {
              deniedFriendlyNames.push(translate("bms.common.nearbyDevicesPermission"));
            }
            if (allDenied.some((p) => p.includes("LOCATION"))) {
              deniedFriendlyNames.push(translate("bms.common.locationPermission"));
            }

            const missingStr = deniedFriendlyNames.join("、");
            const errMsg =
              translate("bms.ble.env.permissionDeniedPrefix") +
              missingStr +
              translate("bms.ble.env.permissionDeniedSuffix");

            console.error(`[BLE 权限 App] 用户拒绝了权限请求，构建动态错误: ${errMsg}`);
            const err = new Error(errMsg);
            err.name = BLE_ENV_ERROR.ANDROID_PERMISSION_DENIED;
            reject(err);
          }
        },
        (error: any) => {
          console.error("[BLE 权限 App] requestPermissions 异常:", error);
          reject(error);
        },
      );
    });
  },

  /**
   * Android App：检测手机系统定位 (GPS) 开关是否开启
   */
  checkAndroidGps(): boolean {
    try {
      const context: any = plus.android.runtimeMainActivity();
      const Build: any = plus.android.importClass("android.os.Build");
      const sdkVersion: number = Build.VERSION.SDK_INT;
      const LocationManager: any = plus.android.importClass("android.location.LocationManager");
      const locationManager: any = context.getSystemService(context.LOCATION_SERVICE);

      if (sdkVersion >= 28) {
        return locationManager.isLocationEnabled();
      } else {
        const Settings: any = plus.android.importClass("android.provider.Settings");
        const locationMode: number = Settings.Secure.getInt(
          context.getContentResolver(),
          Settings.Secure.LOCATION_MODE,
          Settings.Secure.LOCATION_MODE_OFF,
        );
        return locationMode !== Settings.Secure.LOCATION_MODE_OFF;
      }
    } catch (e) {
      console.error("[BLE 权限 App] Android 原生 LocationManager 校验异常:", e);
      return true;
    }
  },

  /**
   * App 启动时进行一次静默的系统应用级权限检测与预申请
   */
  requestAppPermissionsOnLaunch(): void {
    if (!isAppAndroid) {
      return;
    }

    const permissions: string[] = [];
    permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
    permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);

    try {
      const context = plus.android.runtimeMainActivity();
      const locGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
      if (!locGranted) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      }
    } catch (e) {
      permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    console.log("[BLE 启动权限 App] 启动混合直申 - 开始向系统请求权限:", permissions);

    plus.android.requestPermissions(
      permissions,
      (resultObj: any) => {
        console.log("[BLE 启动权限 App] 预授权结果 - 已授权:", resultObj.granted);
      },
      (error: any) => {
        console.error("[BLE 启动权限 App] 预授权申请失败:", error);
      },
    );
  },

  /**
   * 打开应用设置页（Android 应用详情页 / iOS App 设置页）
   */
  openAppSettings(): void {
    try {
      if (isAppAndroid) {
        const main = plus.android.runtimeMainActivity();
        const Intent = plus.android.importClass("android.content.Intent");
        const Settings = plus.android.importClass("android.provider.Settings");
        const Uri = plus.android.importClass("android.net.Uri");
        const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        const uri = Uri.fromParts("package", main.getPackageName(), null);
        intent.setData(uri);
        main.startActivity(intent);
      } else if (isAppIOS) {
        const UIApplication = plus.ios.importClass("UIApplication");
        const NSURL = plus.ios.importClass("NSURL");
        const sharedApplication = UIApplication.sharedApplication();
        const settingsURL = NSURL.URLWithString("app-settings:");
        if (sharedApplication.canOpenURL(settingsURL)) {
          sharedApplication.openURL(settingsURL);
        }
      }
    } catch (err) {
      console.error("[BLE 权限 App] 打开应用设置页失败:", err);
    }
  },

  /**
   * 打开系统蓝牙设置页或原生提示弹窗
   */
  openBluetoothSettings(): void {
    try {
      if (isAppAndroid) {
        const BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter");
        const bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (bluetoothAdapter && !bluetoothAdapter.isEnabled()) {
          const Intent = plus.android.importClass("android.content.Intent");
          const intent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
          const mainActivity = plus.android.runtimeMainActivity();
          mainActivity.startActivity(intent);
          return;
        }
        const Intent = plus.android.importClass("android.content.Intent");
        const Settings = plus.android.importClass("android.provider.Settings");
        const intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        const mainActivity = plus.android.runtimeMainActivity();
        mainActivity.startActivity(intent);
      }
    } catch (err) {
      console.error("[BLE 权限 App] 打开蓝牙设置失败:", err);
    }
  },

  /**
   * 打开系统定位 (GPS) 设置页
   */
  openGpsSettings(): void {
    try {
      if (isAppAndroid) {
        const Intent = plus.android.importClass("android.content.Intent");
        const Settings = plus.android.importClass("android.provider.Settings");
        const intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        const mainActivity = plus.android.runtimeMainActivity();
        mainActivity.startActivity(intent);
      }
    } catch (err) {
      console.error("[BLE 权限 App] 打开 GPS 设置失败:", err);
    }
  },
};
