/**
 * 系统与应用权限管理器 - 默认与 H5/Web 平台实现
 * 作为默认兜底实现，同时作为基础 TypeScript 类型契约源。
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
 */
function createBleEnvError(code: string, translateKey: string): Error {
  const errMsg = translate(translateKey);
  console.log(`[BLE 权限 Default] 抛出环境错误: code=${code}, key=${translateKey}, message=${errMsg}`);
  const err = new Error(errMsg);
  err.name = code;
  return err;
}

/**
 * 结构化权限与硬件环境诊断状态对象接口
 * 作为全平台单一真理源 (Single Source of Truth) 数据契约
 */
export interface PermissionDiagnosticState {
  /** 手机蓝牙硬件开关是否开启 */
  btHardware: boolean;
  /** 手机系统定位(GPS)硬件服务开关是否开启（Android 必须） */
  gpsHardware: boolean;
  /** 应用蓝牙权限是否已授权（Android 12+ 附近设备 / iOS 蓝牙权限） */
  btPermission: boolean;
  /** 应用定位权限是否已授权（Android 11 及以下必须 / 小程序 scope.userLocation） */
  locPermission: boolean;
  /** 综合判定当前平台运行环境下所有必要条件是否完全满足并允许开启蓝牙扫描 */
  isReady: boolean;
  /** 若环境未就绪，首个阻断性缺失项类型，为 null 表示已全部就绪 */
  firstBlockingType: "btHardware" | "gpsHardware" | "btPermission" | "locPermission" | null;
}

export const permissionManager = {
  /**
   * 诊断并获取系统硬件与权限状态（Web/H5 默认全部放行）
   */
  async diagnosePermissions(): Promise<PermissionDiagnosticState> {
    const systemInfo = uni.getSystemInfoSync();
    const btHardware = systemInfo.bluetoothEnabled !== false;
    return {
      btHardware,
      gpsHardware: true,
      btPermission: true,
      locPermission: true,
      isReady: btHardware,
      firstBlockingType: btHardware ? null : "btHardware",
    };
  },

  /**
   * 引导用户修复或授予特定权限
   */
  async requestSettingOrResolve(_type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission"): Promise<boolean> {
    return true;
  },

  /**
   * 诊断并检测蓝牙运行环境
   */
  async checkBleEnvironment(initBluetoothCallback: () => Promise<any>): Promise<boolean> {
    const systemInfo = uni.getSystemInfoSync();
    if (systemInfo.bluetoothEnabled === false) {
      throw createBleEnvError(BLE_ENV_ERROR.BLUETOOTH_DISABLED, "bms.ble.env.bluetoothDisabled");
    }

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
   * 启动时预申请权限（默认空实现）
   */
  requestAppPermissionsOnLaunch(): void {
    // Web/H5 环境无需启动申请
  },

  /**
   * 打开应用设置页
   */
  openAppSettings(): void {
    uni.openSetting();
  },

  /**
   * 打开蓝牙设置
   */
  openBluetoothSettings(): void {
    uni.showToast({
      title: translate("bms.ble.env.bluetoothDisabled"),
      icon: "none",
    });
  },

  /**
   * 打开 GPS 设置
   */
  openGpsSettings(): void {
    uni.showToast({
      title: translate("bms.ble.env.locationDisabled"),
      icon: "none",
    });
  },
};
