import { useI18n } from "vue-i18n";
import { useToast } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";
import { bleManager } from "@/service/ble-manager";
import { permissionManager } from "@/service/permission";
import { resolveDeviceMac } from "@/utils/bms-helper";
import { APP_CONFIG } from "@/config";

/**
 * 视图交互服务：扫码一键连接蓝牙设备的业务控制组合式函数
 * 统一使用 uni.scanCode 系统原生全屏扫码，兼容所有端（App / 微信小程序）
 */
export function useScanConnect() {
  const toast = useToast();
  const { t } = useI18n();
  const bleStore = useBleStore();

  /**
   * 调起扫码与设备一键连接流程（提供给外部视图调用的统一出口）
   */
  const handleScanConnect = async () => {
    console.log("[扫码连接] 触发扫码一键配对连接流程");

    // 进行前置低功耗蓝牙与定位硬件环境的复合校验与诊断
    try {
      const checkOk = await permissionManager.checkBleEnvironment(async () => {
        await bleManager.initBluetooth();
      });
      if (!checkOk) {
        console.warn("[扫码连接] 蓝牙底层环境校验未通过，中断扫码配对流程");
        return;
      }
    } catch (err: any) {
      console.error("[扫码连接] 蓝牙底层环境校验抛出异常:", err);
      toast.error(err.message || t("bms.ble.initFailed"));
      return;
    }

    // 统一调用系统原生全屏扫码，无需区分端差异
    uni.scanCode({
      success: (res: any) => {
        const codeResult = (res.result || "").trim();
        if (!codeResult) {
          toast.error(t("bms.ble.scanFailed"));
          return;
        }
        console.log("[扫码连接] 扫码成功，内容:", codeResult);
        processScanResult(codeResult);
      },
      fail: (err: any) => {
        console.warn("[扫码连接] 扫码操作被取消或失败:", err);
      },
    });
  };

  /**
   * 解析扫码数据并分发多端连接逻辑的决策中枢
   */
  const processScanResult = async (rawResult: string) => {
    const parseMode = APP_CONFIG.SCAN_CONNECT.PARSE_MODE;
    console.log(`[扫码连接] 开始处理解析逻辑，当前配置模式为: ${parseMode}`);

    if (parseMode === "mac") {
      // 物理地址模式：解析和洗涤出大写无符号的物理地址
      const cleanResult = rawResult.toUpperCase().replace(/[^0-9A-F]/g, "");
      if (cleanResult.length !== 12) {
        console.error("[扫码连接] 二维码内容非合法的物理地址格式:", rawResult);
        toast.error(t("bms.ble.invalidFormat"));
        return;
      }

      // 格式化为标准冒号相连的物理地址字串
      const formattedMac = cleanResult.match(/.{1,2}/g)?.join(":") || "";

      // 获取当前物理系统平台类型
      const systemInfo = uni.getSystemInfoSync();
      const os = (systemInfo.platform || "").toLowerCase();

      let isAndroid = false;
      // #ifdef APP-PLUS
      isAndroid = os === "android";
      // #endif

      if (isAndroid) {
        // 安卓原生端直接传入物理地址作为系统标示符，达到极速连接
        console.log(`[扫码连接] 安卓平台直接发起物理连接: ${formattedMac}`);
        connectWithToast(formattedMac, "BMS Device", formattedMac);
      } else {
        // 苹果端、小程序、以及鸿蒙系统：启动限时扫描比对真实地址流程
        console.log(`[扫码连接] 苹果/小程序/鸿蒙平台，启动扫描比对配对流程`);
        pairDeviceByMac(cleanResult, formattedMac);
      }
    } else {
      // 广播名称模式：扫码内容为目标设备蓝牙广播名
      console.log(`[扫码连接] 广播名称模式，启动扫描比对配对流程: ${rawResult}`);
      pairDeviceByName(rawResult);
    }
  };

  /**
   * 苹果、小程序、以及鸿蒙平台下的物理地址限时扫描比对配对匹配算法
   */
  const pairDeviceByMac = async (cleanMac: string, formattedMac: string) => {
    toast.loading({
      msg: t("bms.ble.scanningPair"),
      cover: true,
    });

    let hasFound = false;

    // 设定超时配对限制，超时则清理搜索并不再接收回调
    const timeoutTimer = setTimeout(() => {
      if (!hasFound) {
        bleManager.stopScan().catch(() => {});
        toast.close();
        toast.error(t("bms.ble.scanTimeout"));
        console.warn(
          `[扫码连接] 配对超时，未能在 ${APP_CONFIG.BLE_SCAN.PAIRING_TIMEOUT_MS / 1000} 秒内匹配到指定的物理地址设备`,
        );
      }
    }, APP_CONFIG.BLE_SCAN.PAIRING_TIMEOUT_MS);

    try {
      await bleManager.startScan((device) => {
        if (hasFound) return;

        const deviceMac = resolveDeviceMac(device)
          .toUpperCase()
          .replace(/[^0-9A-F]/g, "");
        console.log(`[扫码配对] 搜寻到附近设备: ${device.name}, 物理地址: ${deviceMac}`);

        if (deviceMac === cleanMac) {
          hasFound = true;
          clearTimeout(timeoutTimer);
          bleManager.stopScan().catch(() => {});
          toast.close();

          console.log(`[扫码配对] 物理地址命中！匹配成功。系统分配标识符: ${device.deviceId}`);
          connectWithToast(device.deviceId, device.name || "BMS Device", formattedMac);
        }
      });
    } catch (err) {
      console.error("[扫码配对] 开启设备扫描失败:", err);
      clearTimeout(timeoutTimer);
      toast.close();
      toast.error(t("bms.ble.scanStartFailed"));
    }
  };

  /**
   * 蓝牙广播名称匹配算法（所有平台通用）
   */
  const pairDeviceByName = async (targetName: string) => {
    toast.loading({
      msg: t("bms.ble.scanningPair"),
      cover: true,
    });

    const upperTargetName = targetName.toUpperCase();
    let hasFound = false;

    const timeoutTimer = setTimeout(() => {
      if (!hasFound) {
        bleManager.stopScan().catch(() => {});
        toast.close();
        toast.error(t("bms.ble.scanTimeout"));
        console.warn(
          `[扫码连接] 配对超时，未能在 ${APP_CONFIG.BLE_SCAN.PAIRING_TIMEOUT_MS / 1000} 秒内匹配到指定的广播名设备`,
        );
      }
    }, APP_CONFIG.BLE_SCAN.PAIRING_TIMEOUT_MS);

    try {
      await bleManager.startScan((device) => {
        if (hasFound) return;

        const name = (device.name || device.localName || "").toUpperCase();
        console.log(`[扫码配对] 搜寻到附近设备: ${device.name}`);

        if (name.includes(upperTargetName)) {
          hasFound = true;
          clearTimeout(timeoutTimer);
          bleManager.stopScan().catch(() => {});
          toast.close();

          const deviceMac = resolveDeviceMac(device);
          console.log(`[扫码配对] 广播名匹配命中！系统分配标识符: ${device.deviceId}, 物理地址: ${deviceMac}`);
          connectWithToast(device.deviceId, device.name || targetName, deviceMac);
        }
      });
    } catch (err) {
      console.error("[扫码配对] 开启设备扫描失败:", err);
      clearTimeout(timeoutTimer);
      toast.close();
      toast.error(t("bms.ble.scanStartFailed"));
    }
  };

  /**
   * 调起低功耗蓝牙服务建立物理连接，附带交互加载遮罩
   */
  const connectWithToast = async (deviceId: string, name: string, mac: string) => {
    try {
      const res = await bleStore.connectDevice(deviceId, name, mac);
      if (res.success) {
        if (res.alreadyConnected) {
          toast.success(t("bms.ble.deviceAlreadyConnected"));
        }
      }
    } catch (err: any) {
      console.error("[扫码连接] 物理连接建立失败:", err);
      // 全局 Store 已自动捕获并在全局弹出层中展示具体异常原因，此处无须重复弹出
    }
  };

  return {
    handleScanConnect,
  };
}
