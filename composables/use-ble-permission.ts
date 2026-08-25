import { ref } from "vue";
import { useToast, useDialog } from "@wot-ui/ui";
import { useI18n } from "vue-i18n";
import { permissionManager, BLE_ENV_ERROR } from "@/service/permission";
import { bleManager } from "@/service/ble-manager";

/**
 * 蓝牙及定位权限管理的可复用 Vue 组合式函数 (Composable)
 * 职责分工：视图层状态管理、NoticeBar 警告及引导 UI。
 * 底层核验与系统跳转已完全交由 service/permission.ts 中的 permissionManager 完成，本层仅处理 UI 联动。
 */
export function useBlePermission() {
  const toast = useToast();
  const dialog = useDialog();
  const { t } = useI18n();

  // 当前诊断出的错误提示文本，可直接用于 wd-notice-bar 的 :text 属性展示
  const envWarningText = ref("");
  // 当前诊断出的错误类型代码（如 bluetooth, androidGps, wechatSetting, androidPermission）
  const envErrorType = ref("");

  /**
   * 静默诊断当前系统的蓝牙/定位/权限环境，并更新相关的响应式状态
   * @returns 返回 Promise<boolean>，指示当前环境是否已完全满足蓝牙运行条件
   */
  const checkStatus = async (): Promise<boolean> => {
    try {
      // 调用解耦后的权限管理器，并将蓝牙初始化的操作通过回调传入（规避循环引用）
      const ready = await permissionManager.checkBleEnvironment(() => bleManager.initBluetooth());
      if (ready) {
        envWarningText.value = "";
        envErrorType.value = "";
        return true;
      }
    } catch (err: any) {
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
  const resolveEnv = () => {
    if (!envErrorType.value) return;

    // 标记 returned_from_settings 为 true，当用户返回页面时自动触发重新核验与扫描刷新
    uni.setStorageSync("returned_from_settings", true);

    if (envErrorType.value === "bluetooth") {
      permissionManager.openBluetoothSettings();
    } else if (envErrorType.value === "androidGps") {
      permissionManager.openGpsSettings();
    } else if (envErrorType.value === "wechatSetting" || envErrorType.value === "androidPermission") {
      permissionManager.openAppSettings();
    }
  };

  /**
   * 主动弹出强引导确认 Dialog 弹窗
   */
  const resolveEnvAlert = (onCancel?: () => void) => {
    const errMsg = envWarningText.value;
    console.log("[useBlePermission] resolveEnvAlert: errMsg=", errMsg, "type=", envErrorType.value);
    if (!errMsg) return;

    let titleKey = "bms.common.prompt";
    let confirmBtnKey = "bms.common.confirm";

    if (envErrorType.value === "wechatSetting") {
      titleKey = "bms.common.authPrompt";
      confirmBtnKey = "bms.common.goSettings";
    } else if (envErrorType.value === "androidGps") {
      titleKey = "bms.common.gpsTitle";
      confirmBtnKey = "bms.common.goOpen";
    } else if (envErrorType.value === "bluetooth") {
      titleKey = "bms.common.bluetoothTitle";
      confirmBtnKey = "bms.common.goOpen";
    } else if (envErrorType.value === "androidPermission") {
      titleKey = "bms.common.permissionDeniedTitle";
      confirmBtnKey = "bms.common.goSettings";
    }

    dialog
      .confirm({
        title: t(titleKey),
        msg: errMsg,
        confirmButtonText: t(confirmBtnKey),
      })
      .then(() => {
        resolveEnv();
      })
      .catch(() => {
        // 用户取消或关闭弹窗
        if (typeof onCancel === "function") {
          onCancel();
        }
      });
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
    envWarningText,
    envErrorType,
    checkStatus,
    resolveEnv,
    resolveEnvAlert,
    validateAndPrompt,
  };
}
