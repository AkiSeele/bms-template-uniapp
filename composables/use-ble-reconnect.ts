import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useToast, useDialog } from "@wot-ui/ui";
import { useBleStore } from "@/stores/ble-store";

/**
 * 蓝牙意外断开后自动触发重连确认弹窗的 Composable Hook
 * 职责分工：
 *   1. 监听全局 bleStore 的意外断开信号 (isUnexpectedDisconnected)
 *   2. 意外断开时唤起 wot-ui 的确认对话框 (useDialog)
 *   3. 触发重连动作 (reconnect) 并同步维护 Toast Loading 与结果状态
 */
export function useBleReconnect() {
  const { t } = useI18n();
  const toast = useToast();
  const dialog = useDialog();
  const bleStore = useBleStore();

  // 从 Pinia 状态仓安全解构响应式状态
  const { isUnexpectedDisconnected } = storeToRefs(bleStore);

  // 监听蓝牙是否发生非用户主动操作的意外断开
  watch(
    isUnexpectedDisconnected,
    (newVal) => {
      if (newVal) {
        console.warn("[useBleReconnect] 监听到蓝牙意外断开信号，准备唤起重连提示框");
        
        dialog
          .confirm({
            title: t("bms.ble.reconnect.title"),
            msg: t("bms.ble.reconnect.content"),
            confirmButtonText: t("bms.ble.reconnect.confirm"),
            cancelButtonText: t("bms.ble.reconnect.cancel"),
          })
          .then(async () => {
            console.log("[useBleReconnect] 用户确认重连，正在启动重连逻辑");
            
            try {
              // 执行重连时序，此时全局状态 bleStore.isConnecting 会自动在底部唤起统一的全局连接加载层
              await bleStore.reconnect();
              
              // 重连成功，Toast 反馈
              toast.success(t("bms.ble.reconnect.success"));
              console.log("[useBleReconnect] 重连成功并就绪");
            } catch (err) {
              // 重连失败，Toast 报错反馈
              toast.error(t("bms.ble.reconnect.failed"));
              console.error("[useBleReconnect] 重连失败:", err);
            }
          })
          .catch(() => {
            console.log("[useBleReconnect] 用户取消了重连，清空意外断开状态");
            // 用户主动拒绝重连，手动清除意外断连的提示状态，避免干扰下一次连接
            bleStore.clearUnexpectedDisconnectState();
          });
      }
    },
    { immediate: false }
  );

  return {};
}
