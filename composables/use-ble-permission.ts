import { ref } from "vue";
import { useToast, useDialog } from "@wot-ui/ui";
import { useI18n } from "vue-i18n";
import { permissionManager, BLE_ENV_ERROR } from "@/service/permission";
import type { PermissionDiagnosticState } from "@/service/permission";
import { bleManager } from "@/service/ble-manager";

/**
 * 蓝牙及定位权限管理的可复用 Vue 组合式函数 (Composable)
 * 职责分工：全站统一权限状态消费、NoticeBar 警告、强引导弹窗与一键跳转修复。
 * 底层核验与硬件/原生交互统一委托 service/permission 中的 permissionManager。
 */
export function useBlePermission() {
  const toast = useToast();
  const dialog = useDialog();
  const { t } = useI18n();

  // 全局响应式权限诊断状态（单一真理源）
  const permissionsState = ref<PermissionDiagnosticState>({
    btHardware: false,
    gpsHardware: false,
    btPermission: false,
    locPermission: false,
    isReady: false,
    firstBlockingType: null,
  });

  // 当前诊断出的错误提示文本，可直接用于 wd-notice-bar 的 :text 属性展示
  const envWarningText = ref("");
  // 当前诊断出的错误类型代码（如 bluetooth, androidGps, wechatSetting, androidPermission）
  const envErrorType = ref("");

  /**
   * 全量诊断当前系统的硬件服务开关与应用级权限状态
   * 统一作为系统权限检测页与各业务页面的单一真理源
   * @param manual 是否为用户手动点击触发（手动触发时提供 Loading 遮罩与 Toast 反馈）
   */
  const diagnoseAll = async (manual = false): Promise<PermissionDiagnosticState> => {
    let loadingToast: any = null;
    if (manual) {
      loadingToast = toast.loading(t("bms.mine.diagnosing"));
    }

    try {
      const state = await permissionManager.diagnosePermissions();
      permissionsState.value = state;

      if (state.isReady) {
        envWarningText.value = "";
        envErrorType.value = "";
      }

      if (manual) {
        setTimeout(() => {
          if (loadingToast) {
            toast.close();
          }
          if (state.isReady) {
            toast.success(t("bms.mine.diagnoseSuccess"));
          } else {
            toast.info(t("bms.mine.diagnosePartial"));
          }
        }, 500);
      }

      return state;
    } catch (err) {
      console.error("[useBlePermission] diagnoseAll 异常:", err);
      if (manual) {
        if (loadingToast) {
          toast.close();
        }
        toast.error(t("bms.mine.diagnoseError"));
      }
      return permissionsState.value;
    }
  };

  /**
   * 获取指定硬件/权限项对应的标准化弹窗文案与参数
   */
  const getPermissionDialogConfig = (
    type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission",
  ) => {
    switch (type) {
      case "btHardware":
        return {
          title: t("bms.common.bluetoothTitle"),
          msg: t("bms.ble.env.bluetoothDisabled"),
          confirmButtonText: t("bms.common.goOpen"),
          action: () => permissionManager.openBluetoothSettings(),
        };
      case "gpsHardware":
        return {
          title: t("bms.common.gpsTitle"),
          msg: t("bms.ble.env.androidGpsDisabled"),
          confirmButtonText: t("bms.common.goOpen"),
          action: () => permissionManager.openGpsSettings(),
        };
      case "btPermission":
        return {
          title: t("bms.common.authPrompt"),
          msg: t("bms.ble.env.androidPermissionDenied"),
          confirmButtonText: t("bms.common.goSettings"),
          action: () => permissionManager.requestSettingOrResolve("btPermission"),
        };
      case "locPermission":
        return {
          title: t("bms.common.authPrompt"),
          msg: t("bms.ble.env.androidPermissionDenied"),
          confirmButtonText: t("bms.common.goSettings"),
          action: () => permissionManager.requestSettingOrResolve("locPermission"),
        };
    }
  };

  /**
   * 统一弹出 Wot UI 风格的权限与硬件设置引导弹窗
   */
  const showPermissionDialog = (
    type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission",
    options?: {
      onConfirm?: () => void;
      onCancel?: () => void;
    },
  ) => {
    const config = getPermissionDialogConfig(type);
    console.log("[useBlePermission] 呼起统一 Wot UI 权限弹窗, 类型:", type, "配置:", config);

    dialog
      .confirm({
        title: config.title,
        msg: config.msg,
        confirmButtonText: config.confirmButtonText,
        cancelButtonText: t("bms.common.cancel"),
      })
      .then(async () => {
        console.log("[useBlePermission] 用户在统一弹窗中点击确认, 触发跳转");
        uni.setStorageSync("returned_from_settings", true);
        await config.action();
        await diagnoseAll(false);
        if (options?.onConfirm) {
          options.onConfirm();
        }
      })
      .catch((action) => {
        console.log("[useBlePermission] 用户在统一弹窗中取消:", action);
        if (options?.onCancel) {
          options.onCancel();
        }
      });
  };

  /**
   * 统一引导用户修复或授予特定权限
   * 统一呼出 Wot UI 风格的引导弹窗，点击确认后前往对应系统/设置页
   */
  const fixPermission = (
    type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission",
    onCancel?: () => void,
  ) => {
    showPermissionDialog(type, { onCancel });
  };

  /**
   * 静默诊断当前系统的蓝牙/定位/权限环境，并更新相关的响应式状态
   * @returns 返回 Promise<boolean>，指示当前环境是否已完全满足蓝牙运行条件
   */
  const checkStatus = async (): Promise<boolean> => {
    try {
      // 调用解耦后的权限管理器，并将蓝牙初始化的操作通过回调传入（规避循环引用）
      const ready = await permissionManager.checkBleEnvironment(() => bleManager.initBluetooth());
      await diagnoseAll(false);
      if (ready) {
        envWarningText.value = "";
        envErrorType.value = "";
        return true;
      }
    } catch (err: any) {
      await diagnoseAll(false);
      // 捕获异常，将用户可读的翻译文本同步至 envWarningText
      const errMsg = err.message || String(err);
      console.log("[useBlePermission] checkStatus catch error:", err, "message:", errMsg);
      envWarningText.value = errMsg;

      // 使用 Error.name 精确路由错误类型，方便后续一键修复
      const errCode = err.name || "";
      if (errCode === BLE_ENV_ERROR.BLUETOOTH_DISABLED) {
        envErrorType.value = "bluetooth";
      } else if (errCode === BLE_ENV_ERROR.GPS_DISABLED) {
        envErrorType.value = "androidGps";
      } else if (
        errCode === BLE_ENV_ERROR.WECHAT_BT_REFUSED ||
        errCode === BLE_ENV_ERROR.WECHAT_LOC_REFUSED ||
        errCode === BLE_ENV_ERROR.LOCATION_NOT_AUTHORIZED
      ) {
        envErrorType.value = "wechatSetting";
      } else if (errCode === BLE_ENV_ERROR.ANDROID_PERMISSION_DENIED) {
        envErrorType.value = "androidPermission";
      } else {
        envErrorType.value = "other";
      }
    }
    return false;
  };

  /**
   * 触发一键开启/修复逻辑
   * 委托给分平台 permissionManager 处理原生 Intent 跳转与小程序设置页唤起。
   */
  const resolveEnv = (forcedType?: string) => {
    const targetType = forcedType || envErrorType.value;
    console.log("[useBlePermission] 触发一键跳转修复 resolveEnv, 目标类型:", targetType);

    // 标记 returned_from_settings 为 true，当用户返回页面时自动触发重新核验与扫描刷新
    uni.setStorageSync("returned_from_settings", true);

    if (targetType === "bluetooth") {
      permissionManager.openBluetoothSettings();
    } else if (targetType === "androidGps") {
      permissionManager.openGpsSettings();
    } else if (targetType === "wechatSetting" || targetType === "androidPermission") {
      permissionManager.openAppSettings();
    } else {
      console.warn("[useBlePermission] 未识别到明确的错误类型，默认拉起 GPS 定位设置");
      permissionManager.openGpsSettings();
    }
  };

  /**
   * 主动弹出强引导确认 Dialog 弹窗
   */
  const resolveEnvAlert = (onCancel?: () => void) => {
    let targetType: "btHardware" | "gpsHardware" | "btPermission" | "locPermission" = "btHardware";
    if (permissionsState.value.firstBlockingType) {
      targetType = permissionsState.value.firstBlockingType;
    } else if (envErrorType.value === "androidGps") {
      targetType = "gpsHardware";
    } else if (envErrorType.value === "bluetooth") {
      targetType = "btHardware";
    } else if (envErrorType.value === "androidPermission" || envErrorType.value === "wechatSetting") {
      targetType = "btPermission";
    }

    showPermissionDialog(targetType, { onCancel });
  };

  /**
   * 针对启动扫描期间抛出的低功耗蓝牙硬件/权限异常进行拦截与友好引导
   * 自动识别 Android 10016（系统定位未开）、10001（蓝牙未开）等特定错误码并呼起统一 Wot UI 引导弹窗
   * @param err 异常对象
   * @param onCancel 用户取消引导时的回调
   * @returns boolean 是否命中特定异常并成功呼起引导弹窗（返回 false 说明为普通异常，由调用方通过 toast 等形式展示）
   */
  const handleBleScanError = (err: any, onCancel?: () => void): boolean => {
    const code = err?.errCode || err?.code;
    const errMsg = err?.message || err?.errMsg || String(err || "");

    // 1. Android 10016 错误：手机系统定位 (GPS) 开关未开启
    if (code === 10016 || errMsg.includes("Location services are turned off")) {
      console.warn("[useBlePermission] 命中 10016 定位服务未开启异常，呼起系统 GPS 设置引导");
      showPermissionDialog("gpsHardware", { onCancel });
      return true;
    }

    // 2. 10001 错误：手机系统蓝牙硬件开关未开启
    if (code === 10001 || errMsg.includes("not available")) {
      console.warn("[useBlePermission] 命中 10001 蓝牙硬件未就绪异常，呼起系统蓝牙设置引导");
      showPermissionDialog("btHardware", { onCancel });
      return true;
    }

    // 3. 微信小程序或 Android 应用级定位/蓝牙未授权
    if (errMsg.includes("auth deny") || errMsg.includes("authorize") || code === 10012) {
      console.warn("[useBlePermission] 命中权限被拒异常，呼起应用详情权限设置引导");
      showPermissionDialog("btPermission", { onCancel });
      return true;
    }

    return false;
  };

  /**
   * 极简“检测并拦截”一键化入口
   * 适用于业务按钮点击事件（如连接蓝牙电池），如果核验不通过会自动呼出 Dialog 弹窗并拦截流程
   * @returns 指示环境是否完全就绪
   */
  const validateAndPrompt = async (): Promise<boolean> => {
    const isReady = await checkStatus();
    if (!isReady) {
      resolveEnvAlert();
      return false;
    }
    return true;
  };

  return {
    permissionsState,
    envWarningText,
    envErrorType,
    diagnoseAll,
    fixPermission,
    showPermissionDialog,
    checkStatus,
    resolveEnv,
    resolveEnvAlert,
    validateAndPrompt,
    handleBleScanError,
  };
}
