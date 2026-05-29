/**
 * 系统与应用权限管理器 (Permission Service)
 * 集中管理并在各平台（Android, iOS, 微信小程序）下核验、申请蓝牙及位置定位所需的系统级与应用级服务及授权。
 */

import { APP_CONFIG } from "@/config";
import { translate } from "@/locale/i18n";

// 声明 html5+ 原生桥接命名空间变量，防止 TS 编译器因缺少 plus 类型定义而报错
declare const plus: any;

/**
 * 蓝牙环境诊断错误码枚举常量
 * 用于在 Service 层与 View 层之间传递确定性的错误类型标识，
 * 彻底代替脆弱的"翻译字符串比对"模式，保证国际化切换后错误路由不会失效。
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
  console.log(`[BLE 权限] 抛出环境错误: code=${code}, key=${translateKey}, message=${errMsg}`);
  const err = new Error(errMsg);
  err.name = code;
  return err;
}

export const permissionManager = {
  /**
   * 诊断并检测当前运行环境下的蓝牙和位置相关权限状态
   * 包含：手机蓝牙开关检测、手机 GPS 开关检测、应用权限（位置/附近设备蓝牙扫描连接）检测与动态申请
   * 确保在 Android、iOS、微信小程序三端均具备完美兼容与防错能力
   * @param initBluetoothCallback 用于进行动态蓝牙适配器初始化的回调函数（由于 ble-manager 循环引用问题，通过回调传入）
   * @returns 返回 Promise<boolean>，指示当前环境是否已具备启动蓝牙扫描的完整绿灯条件
   */
  async checkBleEnvironment(initBluetoothCallback: () => Promise<any>): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const systemInfo = uni.getSystemInfoSync();
      const platform = systemInfo.platform.toLowerCase();

      // 1. 静态环境诊断：检测手机系统的蓝牙模块本身是否开启
      if (systemInfo.bluetoothEnabled === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled"));
      }

      // #ifdef MP-WEIXIN
      // 2. 微信小程序环境下的权限及开关专项检测
      // 2.1 微信小程序上扫描低功耗蓝牙必须开启手机"系统定位(GPS)"服务，否则会搜空
      if (systemInfo.locationEnabled === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.GPS_DISABLED, "bms.ble.env.locationDisabled"));
      }

      // 2.2 微信客户端自身在手机系统里的位置授权检测
      if (systemInfo.locationAuthorized === false) {
        return reject(createBleEnvError(BLE_ENV_ERROR.LOCATION_NOT_AUTHORIZED, "bms.ble.env.locationNotAuthorized"));
      }

      // 2.3 小程序自身获取并引导申请微信蓝牙及位置的小程序授权
      try {
        const authorized = await this.checkWechatSetting();
        if (!authorized) return resolve(false);
      } catch (e) {
        return reject(e);
      }
      // #endif

      // #ifdef APP-PLUS
      // 3. Android / iOS APP 环境下的权限及开关专项检测
      if (platform === "android") {
        // 3.1 Android 动态权限申请（区分 Android 12 前后版本权限组差异）
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

        // 3.2 检测 Android 手机定位 (GPS) 服务开关是否打开
        try {
          const gpsEnabled = this.checkAndroidGps();
          if (!gpsEnabled) {
            return reject(createBleEnvError(BLE_ENV_ERROR.GPS_DISABLED, "bms.ble.env.androidGpsDisabled"));
          }
        } catch (e) {
          return reject(e);
        }
      }
      // #endif

      // 4. 动态验证补充诊断：前置静态检测存在系统级 Bug，在此通过实际尝试调用底层蓝牙适配器来做最终核实
      // 注意：此步必须放在权限申请通过后进行，防止因无权限调用导致报错不准确
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

  // #ifdef MP-WEIXIN
  /**
   * 微信小程序：检查并动态申请微信小程序对蓝牙及位置的服务授权
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
  // #endif

  // #ifdef APP-PLUS
  /**
   * Android App：根据当前设备的 Android 系统版本，动态选择并申请蓝牙扫描所需的运行时权限。
   *
   * 判断策略说明：
   *   - BLUETOOTH_SCAN / BLUETOOTH_CONNECT 直接加入申请列表，由系统核实状态：
   *     已授权时系统秒回 granted，未授权时系统弹窗引导用户决策。
   *   - ACCESS_FINE_LOCATION 前置 checkSelfPermission 预检，若已授权则跳过，
   *     规避系统在定位已授权时反复弹出"始终允许"提示的 Bug。
   *   - 曾尝试通过 AppOpsManager.checkOpNoThrow 对 Android 12+ 低 targetSdkVersion 基座
   *     做假授权兜底校验，但 HTML5+ 桥接层 uid 类型不匹配（Java Integer vs primitive int）
   *     导致 JNI 反射返回 null，null !== 0 为 true 从而误拦所有用户（假阳性），已彻底移除。
   *     真实拒绝检测依赖：deniedPresent / deniedAlways 数组 + 第 4 步 initBluetooth 硬件核验。
   */
  requestAndroidPermissions(systemInfo: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 组装最终需要向系统请求的权限列表
      const permissions: string[] = [];

      // 1. 附近设备权限（直接加入列表，由系统真实核验状态）
      permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
      permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);

      // 2. 定位权限：前置 checkSelfPermission 过滤，若用户已授权"使用时允许"则跳过，
      //    彻底规避系统反复弹出"始终允许"提示的 Bug
      try {
        const context = plus.android.runtimeMainActivity();
        const locGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
        if (!locGranted) {
          permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
        }
      } catch (e) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      }

      console.log("[BLE 权限] 混合核验 - 开始请求 Android 必要权限:", permissions);

      // 直接调用 plus 权限模块申请，如果已授权系统会自动跳过弹窗，如果被关闭则必然拉起原生弹窗
      plus.android.requestPermissions(
        permissions,
        (resultObj: any) => {
          const granted: string[] = resultObj.granted || [];
          const deniedAlways: string[] = resultObj.deniedAlways || [];

          console.log("[BLE 权限] 直申结果 - 已授权:", granted);
          console.log("[BLE 权限] 直申结果 - 永久拒绝:", deniedAlways);

          // 核心判定：必要权限必须全部处于已授权列表中
          const isAllGranted = permissions.every((p) => granted.includes(p));

          if (isAllGranted) {
            console.log("[BLE 权限] 核心权限全部授权通过，放行蓝牙流程");
            resolve(true);
          } else if (deniedAlways.length > 0) {
            console.error("[BLE 权限] 关键权限被用户永久拒绝，抛出错误引导去设置页");
            reject(createBleEnvError(BLE_ENV_ERROR.ANDROID_PERMISSION_DENIED, "bms.ble.env.androidPermissionDenied"));
          } else {
            console.error("[BLE 权限] 用户本次拒绝了权限申请");
            reject(createBleEnvError(BLE_ENV_ERROR.ANDROID_PERMISSION_DENIED, "bms.ble.env.androidPermissionDenied"));
          }
        },
        (error: any) => {
          console.error("[BLE 权限] requestPermissions 异常:", error);
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
      const LocationManager: any = plus.android.importClass("android.location.LocationManager");
      const locationManager: any = context.getSystemService(context.LOCATION_SERVICE);
      const gpsEnabled: boolean = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
      const networkEnabled: boolean = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);

      console.log("[BLE GPS] GPS 定位开关:", gpsEnabled, "网络定位开关:", networkEnabled);

      if (!gpsEnabled && !networkEnabled) {
        return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  },
  // #endif

  /**
   * App 启动时进行一次静默的系统应用级权限检测与预申请
   */
  requestAppPermissionsOnLaunch(): void {
    // #ifdef APP-PLUS
    const systemInfo = uni.getSystemInfoSync();
    const platform = systemInfo.platform.toLowerCase();

    if (platform !== "android") {
      return;
    }

    // 不管 Android 系统版本是 12 还是更低，启动时均进行附近设备和定位权限的预申请
    const permissions: string[] = [];
    permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_SCAN);
    permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.BLUETOOTH_CONNECT);

    // 定位权限因为 checkSelfPermission 核验精准，前置预检。如果已授权（如"使用时允许"），
    // 启动预检测时就不要重新申请，防止被系统强制弹窗要求"始终允许"。
    try {
      const context = plus.android.runtimeMainActivity();
      const locGranted = context.checkSelfPermission(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION) === 0;
      if (!locGranted) {
        permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
      }
    } catch (e) {
      permissions.push(APP_CONFIG.ANDROID_PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    console.log("[BLE 启动权限] 启动混合直申 - 开始向系统请求权限:", permissions);

    plus.android.requestPermissions(
      permissions,
      (resultObj: any) => {
        console.log("[BLE 启动权限] 预授权结果 - 已授权:", resultObj.granted);
      },
      (error: any) => {
        console.error("[BLE 启动权限] 预授权申请失败:", error);
      },
    );
    // #endif
  },
};
