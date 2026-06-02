import { useI18n } from "vue-i18n";
import { useToast } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";
import { bleManager } from "@/service/ble-manager";
import { permissionManager } from "@/service/permission";
import { resolveDeviceMac } from "@/utils/bms-helper";
import { APP_CONFIG } from "@/config";

// 全局变量：用于控制仅触发一次自动连接，避免在应用生命周期内重复触发
let hasTriggeredAutoConnect = false;

/**
 * 自动连接业务 Hook（全局高阶集成版）
 * 职责：负责读取本地缓存、环境校验、限时扫描匹配设备。
 * 一旦匹配成功，直接委托给全局 bleStore 进行连接及 UI 弹窗托管，实现零重复代码。
 */
export function useAutoConnect() {
  const { t } = useI18n();
  const toast = useToast();
  const bleStore = useBleStore();

  // 扫描计时器，用于限时十秒未搜寻到设备时执行超时逻辑
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // 主动取消自动连接的方法
  const cancelAutoConnect = async () => {
    console.log("[自动连接] 正在主动取消或关闭自动连接流程");
    
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    try {
      await bleManager.stopScan();
    } catch (err) {
      console.error("[自动连接] 停止扫描异常:", err);
    }
    bleStore.isAutoConnecting = false;
    bleStore.isAutoConnectingCancelable = false;
  };

  // 核心触发自动连接的方法
  const triggerAutoConnect = async () => {
    // 如果已经触发过，则直接拦截
    if (hasTriggeredAutoConnect) {
      console.log("[自动连接] 全局标记指示已触发过自动连接，本次跳过");
      return;
    }

    // 标记已触发过，确保仅重连一次
    hasTriggeredAutoConnect = true;

    // 从本地缓存中读取是否开启了自动连接开关
    const autoConnectEnabled = uni.getStorageSync("auto_connect_enabled");
    if (!autoConnectEnabled) {
      console.log("[自动连接] 本地缓存中未开启自动连接开关，跳过自动连接");
      return;
    }

    // 从本地缓存中读取上次成功连接的物理地址与名称
    const lastConnectedMac = uni.getStorageSync("last_connected_mac");
    if (!lastConnectedMac) {
      console.log("[自动连接] 本地缓存中没有上次连接的物理地址记录，跳过自动连接");
      return;
    }

    console.log("[自动连接] 开始执行自动连接，目标物理地址为:", lastConnectedMac);

    // 展现前置扫描搜索 Loading，提升用户直观反馈
    bleStore.isAutoConnecting = true;
    bleStore.isAutoConnectingCancelable = true;
    bleStore.cancelAutoConnectCallback = cancelAutoConnect;

    // 步骤一：检测低功耗蓝牙与定位硬件环境的复合校验与诊断
    try {
      const checkOk = await permissionManager.checkBleEnvironment(async () => {
        await bleManager.initBluetooth();
      });
      if (!checkOk) {
        console.warn("[自动连接] 蓝牙底层环境校验未通过，中断自动重连");
        bleStore.isAutoConnecting = false;
        bleStore.isAutoConnectingCancelable = false;
        toast.error(t("bms.ble.initFailed"));
        return;
      }
    } catch (err: any) {
      console.error("[自动连接] 蓝牙底层环境校验抛出异常:", err);
      bleStore.isAutoConnecting = false;
      bleStore.isAutoConnectingCancelable = false;
      toast.error(err.message || t("bms.ble.initFailed"));
      return;
    }

    // 步骤二：开启超时计时器
    let hasFound = false;
    timeoutTimer = setTimeout(async () => {
      if (!hasFound) {
        try {
          await bleManager.stopScan();
        } catch (stopErr) {
          console.error("[自动连接] 超时停止扫描异常:", stopErr);
        }
        bleStore.isAutoConnecting = false;
        bleStore.isAutoConnectingCancelable = false;
        toast.error(t("bms.ble.autoConnectTimeout"));
        console.warn(`[自动连接] 配对超时，未能在 ${APP_CONFIG.BLE_SCAN.PAIRING_TIMEOUT_MS / 1000} 秒内搜索匹配到指定的物理地址设备`);
      }
    }, APP_CONFIG.BLE_SCAN.PAIRING_TIMEOUT_MS);

    // 步骤三：发起搜寻比对流程
    try {
      const cleanTargetMac = lastConnectedMac.toUpperCase().replace(/[^0-9A-F]/g, "");
      
      await bleManager.startScan(async (device) => {
        if (hasFound) return;

        // 提取物理地址并过滤掉非物理字符
        const deviceMac = resolveDeviceMac(device).toUpperCase().replace(/[^0-9A-F]/g, "");
        console.log(`[自动连接扫描] 搜寻到设备: ${device.name}, 物理地址: ${deviceMac}`);

        if (deviceMac === cleanTargetMac) {
          hasFound = true;
          
          // 清除超时计时器
          if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }

          try {
            // 停止蓝牙扫描
            await bleManager.stopScan();
          } catch (stopScanErr) {
            console.error("[自动连接] 命中设备后停止扫描异常:", stopScanErr);
          }

          // 核心重构：关闭搜索 Loading，直接发起连接并由全局 Layout-Provider / bleStore 托管 UI 提示
          bleStore.isAutoConnecting = false;
          bleStore.isAutoConnectingCancelable = false;

          try {
            console.log(`[自动连接] 物理地址命中！匹配成功。发起连接。设备标识符: ${device.deviceId}`);
            // 直接触发 store 的连接行为，这会自动呼起全局的「连接中...」Popup，若报错也会自动呼起「连接失败」Popup！
            await bleStore.connectDevice(device.deviceId, device.name || "BMS Device", deviceMac);
          } catch (connectErr: any) {
            console.error("[自动连接] 物理连接建立失败:", connectErr);
            // 异常已由 store 抛出并自动通过 isConnectionErrorVisible 展示在 layout-provider 中，此处置空放行
          }
        }
      });
    } catch (scanErr: any) {
      console.error("[自动连接] 发起设备扫描异常:", scanErr);
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      bleStore.isAutoConnecting = false;
      bleStore.isAutoConnectingCancelable = false;
      toast.error(scanErr.message || t("bms.ble.scanStartFailed"));
    }
  };

  return {
    triggerAutoConnect,
    cancelAutoConnect,
  };
}
