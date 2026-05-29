<script>
import { permissionManager } from "@/service/permission";
import { initI18nLocale } from "@/locale/i18n";
import { useBleStore } from "@/stores/ble-store";
import { useAppStore } from "@/stores/app";

export default {
  onLaunch: function () {
    console.log("App Launch");
    // 阶段二：在应用实例完全就绪后（getApp() 可正常调用），安全读取系统语言并同步到 i18n。
    // 此时调用 uni.getStorageSync / uni.getLocale 不会再触发 getApp() failed 警告。
    initI18nLocale();

    // 阶段三：获取客户端及系统设备信息，兼容 Android、iOS 及鸿蒙 (HarmonyOS) 平台
    const appStore = useAppStore();
    try {
      if (typeof uni.getDeviceInfo === "function") {
        const devInfo = uni.getDeviceInfo();
        console.log("[App Launch] 成功获取设备基础信息:", devInfo);
        appStore.setDeviceInfo(devInfo);
      }
    } catch (err) {
      console.error("获取设备基础信息异常失败:", err);
    }

    // 初始化全局蓝牙事件监听器，托管蓝牙连接和数据变化事件
    const bleStore = useBleStore();
    bleStore.initGlobalListeners();

    // #ifdef APP-PLUS
    // 调用解耦后的系统与应用权限管理器，在启动时进行预检测与申请
    permissionManager.requestAppPermissionsOnLaunch();
    // #endif
  },
  onShow: function () {
    console.log("App Show");
  },
  onHide: function () {
    console.log("App Hide");
  },
};
</script>

<style>
/*每个页面公共css */
</style>
