<template>
  <layout-provider>

    <!-- 
      使用 z-paging 插件进行列表展示
      :use-local-list="true" 开启本地分页数据托管，适合蓝牙上报列表的本地去重管理
      @query 绑定下拉刷新或初始加载触发的扫描函数
    -->
    <z-paging
      ref="paging"
      v-model="deviceList"
      @query="onQuery"
      :use-local-list="true"
      :refresher-enabled="true"
      class="wot-min-h-0"
    >
      <!-- 将自定义顶部导航栏放在 z-paging 内部的 slot="top" 内，让组件自动精确计算高度，防止白边及首项遮挡 -->
      <template #top>
        <wd-navbar :title="$t('bms.ble.searchTitle')" left-arrow safe-area-inset-top @click-left="goBack" />
      </template>

      <!-- 扫描状态指示栏 -->
      <view class="wot-flex wot-items-center wot-justify-center wot-py-main wot-gap-2" v-if="isScanning">
        <wd-loading size="20px" color="#0052d9" />
        <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.ble.scanning") }}</text>
      </view>
      <view class="wot-flex wot-items-center wot-justify-center wot-py-main" v-else>
        <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.ble.scanStopped") }}</text>
      </view>

      <!-- 搜索到的蓝牙设备列表区域 -->
      <view class="wot-px-main wot-pb-10">
        <view
          v-for="device in deviceList"
          :key="device.deviceId"
          @click="handleConnect(device)"
          class="device-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-mb-3 wot-flex wot-items-center wot-justify-between wot-border wot-border-solid wot-border-transparent active:wot-bg-neutral-200 active:wot-border-primary"
        >
          <view class="wot-flex wot-items-center wot-gap-3">
            <!-- 蓝牙图标：连接态高亮展示 -->
            <wd-icon css-icon="i-ri-bluetooth-fill" size="24px" color="#0052d9" />
            <view class="wot-flex wot-flex-col">
              <text class="wot-text-body-main wot-font-bold wot-text-text-main">
                {{ device.name || device.localName || "Unknown Device" }}
              </text>
              <!-- 兼容性更好的拼接写法，规避部分引擎不支持 i18n 多语言变量插值导致显示花括号的问题 -->
              <text class="wot-text-caption wot-text-text-secondary wot-mt-0.5">
                {{ $t("bms.ble.deviceMac") }}{{ resolveDeviceMac(device) }}
              </text>
            </view>
          </view>

          <!-- 设备 RSSI 信号强度展示 -->
          <view class="wot-flex wot-items-center wot-gap-1">
            <wd-icon css-icon="i-ri-signal-tower-fill" size="18px" color="#2ba471" />
            <text class="wot-text-caption wot-text-success-main wot-font-semibold">{{ device.RSSI }} dBm</text>
          </view>
        </view>
      </view>

      <!-- 空列表缺省图插槽 -->
      <template #empty>
        <view class="wot-flex wot-flex-col wot-items-center wot-justify-center wot-py-super-loose wot-mt-10">
          <wd-icon css-icon="i-lucide-search-code" size="64px" color="#858585" />
          <text class="wot-text-body-main wot-text-text-secondary wot-mt-4 wot-px-super-loose wot-text-center">
            {{ $t("bms.ble.searchEmpty") }}
          </text>
        </view>
      </template>
    </z-paging>
  </layout-provider>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useToast } from "@/uni_modules/wot-ui";
import { useI18n } from "vue-i18n";
import { bleManager } from "@/service/ble-manager";
import { useBleStore } from "@/stores/ble-store";
import { useBlePermission } from "@/composables/use-ble-permission";
import { resolveDeviceMac } from "@/utils/bms-helper";

// 初始化 wot-ui 交互 Hooks 与 i18n
const toast = useToast();
const { t } = useI18n();

// 初始化 Pinia 全局蓝牙状态仓
const bleStore = useBleStore();

// 引入统一封装的可复用蓝牙与定位权限管理 Hook
const { envWarningText, checkStatus, resolveEnv, resolveEnvAlert } = useBlePermission();

// z-paging 绑定数据与实例 Ref
const paging = ref<any>(null);
const deviceList = ref<any[]>([]);

// 搜索状态管理与超时定时器句柄
const isScanning = ref(false);
let scanTimer: any = null;

/**
 * 返回上一页，并在返回前确保扫描已完全关闭以释放硬件资源
 */
const goBack = async () => {
  await stopScanProcess();
  uni.navigateBack();
};

/**
 * 封装停止扫描及清理定时器的流程，防止内存泄漏 and 接口调用冲突
 */
const stopScanProcess = async () => {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  if (isScanning.value) {
    try {
      await bleManager.stopScan();
    } catch (e) {
      console.error("停止蓝牙扫描异常:", e);
    }
    isScanning.value = false;
  }
};

/**
 * 下拉刷新或初始化加载时由 z-paging 触发的扫描回调函数
 */
const onQuery = async () => {
  // 1. 如果当前正处于扫描状态中，先彻底关闭当前扫描
  await stopScanProcess();

  // 2. 刷新最新系统状态通告
  const isReady = await checkStatus();

  // 3. 校验诊断结果警告，若存在阻断级配置，则中断扫描并强引导
  if (!isReady) {
    paging.value?.complete([]);
    resolveEnvAlert();
    return;
  }

  // 4. 诊断环境通过后，清空历史列表，开始本次设备搜索
  deviceList.value = [];
  isScanning.value = true;

  try {
    // 4.1 初始化宿主蓝牙物理模块
    await bleManager.initBluetooth();

    // 4.2 调用底层扫描，实时上报设备信息
    await bleManager.startScan((device) => {
      // 针对 deviceId (MAC 地址或 UUID) 进行去重，防止列表项频繁重绘闪烁
      const exists = deviceList.value.some((d) => d.deviceId === device.deviceId);
      if (!exists) {
        deviceList.value.push(device);
        // 本地分页模式下，每次发现新设备即时通过 complete 更新视图数据
        paging.value?.complete(deviceList.value);
      }
    });

    // 4.3 设定 5 秒超时保护，5 秒后强制中止扫描释放带宽，并通知组件刷新完成
    scanTimer = setTimeout(async () => {
      await stopScanProcess();
      paging.value?.complete();
    }, 5000);
  } catch (err: any) {
    console.error("启动蓝牙扫描或适配器初始化失败:", err);
    await stopScanProcess();
    paging.value?.complete([]);
    const errMsg = err.message || err.errMsg || String(err);
    toast.error(`${t("bms.ble.connectFailed")}: ${errMsg}`);
  }
};

// 页面连接处理入口（用户点击列表设备时触发）
const handleConnect = async (device: any) => {
  console.log("准备连接设备:", device);
  // 1. 停止当前的扫描进程，释放物理带宽
  await stopScanProcess();

  // 2. 呼出加载中提示，防止用户在连接期间重复连点
  toast.show({
    type: "loading",
    msg: t("bms.ble.connectingPrefix") + (device.name || "BMS") + t("bms.ble.connectingSuffix"),
    loadingType: "circular",
  });

  try {
    // 3. 提取设备真实物理 MAC 并调用 Store 发起连接、握手与特征值订阅
    const macAddress = resolveDeviceMac(device);
    await bleStore.connectDevice(device.deviceId, device.name, macAddress);

    // 4. 连接成功提示，并延时返回首页
    toast.success(t("bms.ble.connectSuccess"));
    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch (err: any) {
    console.error("连接蓝牙设备失败:", err);
    const errMsg = err.message || err.errMsg || String(err);
    toast.error(`${t("bms.ble.connectFailed")}: ${errMsg}`);
  }
};


// 页面卸载时，强制清理长扫描进程，防止内存泄漏
onUnload(() => {
  stopScanProcess();
});
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}
.device-card {
  transition: all 0.2s ease-in-out;
}
.device-card:active {
  transform: scale(0.98);
}
</style>
