/**
 * 系统与应用权限管理器 - App 端专有实现 (Android & iOS)
 * 依赖 HTML5+ 原生桥接能力，处理原生底层硬件开关、动态权限直申与系统设置跳转。
 */

import { APP_CONFIG } from "@/config";
import { translate } from "@/locale/i18n";
import { isAppAndroid as _envIsAppAndroid, isAppIOS as _envIsAppIOS } from "@uni-helper/uni-env";
import type { PermissionDiagnosticState } from "./index";

// 声明 html5+ 原生桥接命名空间变量，防止 TS 编译器因缺少 plus 类型定义而报错
declare const plus: any;

// 跨端环境判断：在 uni-env 基础上补充 5+ App 运行时原生 plus.os.name 与 uni.getSystemInfoSync 平台兜底，彻底消除客户端运行时环境变量缺失引发的误判
const isAppAndroid: boolean = Boolean(
  _envIsAppAndroid ||
    (typeof plus !== "undefined" && plus.os?.name?.toLowerCase() === "android") ||
    (typeof uni !== "undefined" && (uni.getSystemInfoSync().platform || "").toLowerCase() === "android"),
);

const isAppIOS: boolean = Boolean(
  _envIsAppIOS ||
    (typeof plus !== "undefined" && plus.os?.name?.toLowerCase() === "ios") ||
    (typeof uni !== "undefined" && (uni.getSystemInfoSync().platform || "").toLowerCase() === "ios"),
);

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
   * 诊断并获取当前系统的所有硬件服务开关和应用级权限状态
   * 统一作为系统权限检测页、设备搜索列表页及扫码连接的单一真理源 (Single Source of Truth)
   */
  async diagnosePermissions(): Promise<PermissionDiagnosticState> {
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
          // 交叉核验：原生反射探测与 uni-app 平台 locationEnabled 双重通过才算开启
          state.gpsHardware = this.checkAndroidGps() && systemInfo.locationEnabled !== false;
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
        } else {
          state.btPermission = true;
          state.locPermission = true;
        }

        // 统一计算当前平台是否全部就绪以及首个阻断项类型（单一真理源）
        let isReady = false;
        let firstBlockingType: "btHardware" | "gpsHardware" | "btPermission" | "locPermission" | null = null;

        if (isAppIOS) {
          isReady = state.btHardware && state.btPermission;
          if (!state.btHardware) {
            firstBlockingType = "btHardware";
          } else if (!state.btPermission) {
            firstBlockingType = "btPermission";
          }
        } else if (isAppAndroid) {
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
          isReady = state.btHardware;
          firstBlockingType = state.btHardware ? null : "btHardware";
        }

        const finalState: PermissionDiagnosticState = {
          ...state,
          isReady,
          firstBlockingType,
        };
        resolve(finalState);
      } catch (err) {
        console.error("[BLE 权限诊断 App] diagnosePermissions 异常:", err);
        resolve({
          ...state,
          isReady: false,
          firstBlockingType: "btHardware",
        });
      }
    });
  },

  /**
   * 引导用户修复或授予特定权限（底层直接触发原生设置跳转或原生权限申请，不含任何视图弹窗）
   */
  async requestSettingOrResolve(type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission"): Promise<boolean> {
    try {
      if (type === "btHardware") {
        this.openBluetoothSettings();
        return true;
      }

      if (type === "gpsHardware") {
        this.openGpsSettings();
        return true;
      }

      if (type === "btPermission") {
        if (isAppAndroid) {
          const permissions = [
            APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN,
            APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT,
          ];
          return new Promise((resolve) => {
            plus.android.requestPermissions(permissions, (res: any) => {
              const isAllGranted = permissions.every((p) => (res.granted || []).includes(p));
              if (isAllGranted) {
                resolve(true);
              } else {
                this.openAppSettings();
                resolve(false);
              }
            });
          });
        } else if (isAppIOS) {
          this.openAppSettings();
          return false;
        }
        return false;
      }

      if (type === "locPermission") {
        if (isAppAndroid) {
          const permissions = [APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION];
          return new Promise((resolve) => {
            plus.android.requestPermissions(permissions, (res: any) => {
              const isAllGranted = permissions.every((p) => (res.granted || []).includes(p));
              if (isAllGranted) {
                resolve(true);
              } else {
                this.openAppSettings();
                resolve(false);
              }
            });
          });
        } else if (isAppIOS) {
          this.openAppSettings();
          return false;
        }
        return false;
      }

      return false;
    } catch (err) {
      console.error("[BLE 权限修复 App] requestSettingOrResolve 异常:", err);
      return false;
    }
  },

  /**
   * 诊断并检测当前运行环境下的蓝牙和位置相关权限状态
   * 完全委托单一真理源 diagnosePermissions 执行检测，消除两套逻辑不一致的隐患
   * @param initBluetoothCallback 用于进行动态蓝牙适配器初始化的回调函数
   */
  async checkBleEnvironment(initBluetoothCallback: () => Promise<any>): Promise<boolean> {
    const systemInfo = uni.getSystemInfoSync();

    // 1. 如果在 Android 平台且应用级权限未就绪，先主动拉起原生直申流程
    if (isAppAndroid) {
      const diagBefore = await this.diagnosePermissions();
      if (!diagBefore.btPermission || !diagBefore.locPermission) {
        await this.requestAndroidPermissions(systemInfo);
      }
    }

    // 2. 统一调取全站唯一的系统硬件与权限诊断结果
    const diagState = await this.diagnosePermissions();

    if (!diagState.isReady) {
      if (diagState.firstBlockingType === "btHardware") {
        throw createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled");
      }
      if (diagState.firstBlockingType === "gpsHardware") {
        throw createBleEnvError(BLE_ENV_ERROR.GPS_DISABLED, "bms.ble.env.androidGpsDisabled");
      }
      if (diagState.firstBlockingType === "btPermission" || diagState.firstBlockingType === "locPermission") {
        throw createBleEnvError(BLE_ENV_ERROR.ANDROID_PERMISSION_DENIED, "bms.ble.env.androidPermissionDenied");
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

        const locFineGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
        const locCoarseGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION) === 0;
        if (!locFineGranted) {
          permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
        }
        if (!locCoarseGranted) {
          permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION);
        }
      } catch (e) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION);
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
   * 采用原生 LocationManager 服务、Provider 状态以及 Settings 系统模式三重交叉核验，
   * 并配合 uni.getSystemInfoSync().locationEnabled 进行降级兜底，防止 Android 10/11 定制系统上误判通过导致扫描报 10016
   */
  checkAndroidGps(): boolean {
    try {
      const systemInfo = uni.getSystemInfoSync();
      // 第一层防御：uni-app 系统信息中已明确显示定位未开启时直接判定为 false
      if (systemInfo.locationEnabled === false) {
        console.warn("[BLE 权限 App] uni.getSystemInfoSync 检测到系统定位服务开关明确为 false");
        return false;
      }

      const context: any = plus.android.runtimeMainActivity();
      if (!context) {
        return (systemInfo as any).locationEnabled !== false;
      }

      // Android 原生 Context.LOCATION_SERVICE 静态常量值为 "location"
      let locationManager: any = context.getSystemService("location");
      if (!locationManager) {
        try {
          const ContextClass: any = plus.android.importClass("android.content.Context");
          locationManager = context.getSystemService(ContextClass.LOCATION_SERVICE);
        } catch (e) {
          // 忽略反射导类异常
        }
      }

      const Build: any = plus.android.importClass("android.os.Build");
      const sdkVersion: number = Build?.VERSION?.SDK_INT || 0;

      // 第二层防御：原生 LocationManager 探测
      if (locationManager) {
        // Android 9+ (API >= 28) 提供 isLocationEnabled 原生方法
        if (sdkVersion >= 28 && typeof locationManager.isLocationEnabled === "function") {
          try {
            const isEnabled = locationManager.isLocationEnabled();
            if (!isEnabled) {
              console.warn("[BLE 权限 App] LocationManager.isLocationEnabled 返回 false");
              return false;
            }
          } catch (e) {
            console.warn("[BLE 权限 App] 调用 isLocationEnabled 异常，进入 Provider 探测:", e);
          }
        }

        // 针对 Android 10 及各版本 ROM 进行 Provider 探测（GPS 或 网络定位）
        try {
          const isGpsOn = locationManager.isProviderEnabled("gps");
          const isNetworkOn = locationManager.isProviderEnabled("network");
          if (!isGpsOn && !isNetworkOn) {
            console.warn("[BLE 权限 App] LocationManager 的 GPS 与 Network 定位 Provider 均未启用");
            return false;
          }
          return true;
        } catch (e) {
          console.warn("[BLE 权限 App] LocationManager.isProviderEnabled 校验异常:", e);
        }
      }

      // 第三层防御：Settings 系统底层定位模式探测
      try {
        const Settings: any = plus.android.importClass("android.provider.Settings");
        const locationMode: number = Settings.Secure.getInt(
          context.getContentResolver(),
          Settings.Secure.LOCATION_MODE,
          Settings.Secure.LOCATION_MODE_OFF,
        );
        if (locationMode === Settings.Secure.LOCATION_MODE_OFF) {
          console.warn("[BLE 权限 App] Settings.Secure.LOCATION_MODE 明确为 OFF");
          return false;
        }
      } catch (e) {
        console.warn("[BLE 权限 App] Settings.Secure 校验异常:", e);
      }

      // 所有校验层均通过时返回 true
      return true;
    } catch (e) {
      console.error("[BLE 权限 App] Android 原生定位开关综合校验异常:", e);
      // 发生未知异常时，优先根据 uni.getSystemInfoSync() 的结果决定，不再无脑盲目放行返回 true
      const fallbackInfo = uni.getSystemInfoSync();
      return fallbackInfo.locationEnabled !== false;
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
      const locFineGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
      const locCoarseGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION) === 0;
      if (!locFineGranted) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      }
      if (!locCoarseGranted) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION);
      }
    } catch (e) {
      permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_COARSE_LOCATION);
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
      console.log("[BLE 权限 App] 准备打开应用详情设置页, isAppAndroid =", isAppAndroid, "isAppIOS =", isAppIOS);
      if (isAppAndroid) {
        const main = plus.android.runtimeMainActivity();
        const Intent = plus.android.importClass("android.content.Intent");
        const Uri = plus.android.importClass("android.net.Uri");
        const intent = new Intent("android.settings.APPLICATION_DETAILS_SETTINGS");
        const uri = Uri.fromParts("package", main.getPackageName(), null);
        intent.setData(uri);
        main.startActivity(intent);
        console.log("[BLE 权限 App] 成功拉起 Android 应用详情设置页");
      } else if (isAppIOS) {
        const UIApplication = plus.ios.importClass("UIApplication");
        const NSURL = plus.ios.importClass("NSURL");
        const sharedApplication = UIApplication.sharedApplication();
        const settingsURL = NSURL.URLWithString("app-settings:");
        if (sharedApplication.canOpenURL(settingsURL)) {
          sharedApplication.openURL(settingsURL);
          console.log("[BLE 权限 App] 成功拉起 iOS 应用设置页");
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
      console.log("[BLE 权限 App] 准备打开系统蓝牙设置页, isAppAndroid =", isAppAndroid);
      if (isAppAndroid) {
        const BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter");
        const bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (bluetoothAdapter && !bluetoothAdapter.isEnabled()) {
          const Intent = plus.android.importClass("android.content.Intent");
          const intent = new Intent("android.bluetooth.adapter.action.REQUEST_ENABLE");
          const mainActivity = plus.android.runtimeMainActivity();
          mainActivity.startActivity(intent);
          console.log("[BLE 权限 App] 成功拉起原生开启蓝牙提示弹窗");
          return;
        }
        const Intent = plus.android.importClass("android.content.Intent");
        const intent = new Intent("android.settings.BLUETOOTH_SETTINGS");
        const mainActivity = plus.android.runtimeMainActivity();
        mainActivity.startActivity(intent);
        console.log("[BLE 权限 App] 成功拉起系统蓝牙设置页");
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
      console.log("[BLE 权限 App] 准备打开系统 GPS 定位设置页, isAppAndroid =", isAppAndroid);
      if (isAppAndroid) {
        const Intent = plus.android.importClass("android.content.Intent");
        const intent = new Intent("android.settings.LOCATION_SOURCE_SETTINGS");
        const mainActivity = plus.android.runtimeMainActivity();
        mainActivity.startActivity(intent);
        console.log("[BLE 权限 App] 成功拉起系统 GPS 定位设置页");
      }
    } catch (err) {
      console.error("[BLE 权限 App] 打开 GPS 设置失败:", err);
      try {
        console.log("[BLE 权限 App] 降级拉起通用应用详情页");
        this.openAppSettings();
      } catch (e) {}
    }
  },
};
