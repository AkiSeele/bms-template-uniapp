<template>
  <layout-provider>
    <!-- 
      使用 z-paging 插件进行列表展示
      :use-local-list="true" 开启本地分页数据托管，适合蓝牙上报列表的本地去重管理
      :refresher-only="true" 开启仅下拉刷新模式，完全禁用滚动底部的分页加载，彻底解决触底触发 query 导致的扫描中断 bug
      @query 绑定下拉刷新或初始加载触发的扫描函数
    -->
    <z-paging
      ref="paging"
      v-model="deviceList"
      @query="onQuery"
      :use-local-list="true"
      :refresher-enabled="true"
      :refresher-only="true"
      class="wot-min-h-0 wot-bg-[#f6f8fc]"
    >
      <!-- 将自定义顶部导航栏放在 z-paging 内部的 slot="top" 内，让组件自动精确计算高度，防止白边及首项遮挡 -->
      <template #top>
        <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
        <wd-navbar :title="$t('bms.ble.searchTitle')" left-arrow safe-area-inset-top @click-left="goBack" />

        <!-- Google 风格的水平流光进度条：展现现代无边框加载的流场感 -->
        <view class="progress-bar-container" :class="{ 'is-active': isScanning }">
          <view class="progress-bar-indicator"></view>
        </view>

        <!-- 搜索控制台：手写极其轻量精致的 Google Material 圆角输入框，无任何多余嵌套 -->
        <view class="search-box-wrapper wot-px-4 wot-py-3 wot-bg-[#f6f8fc]">
          <view
            class="google-search-box wot-flex wot-items-center wot-bg-white wot-rounded-full wot-px-4 wot-border wot-border-solid wot-border-[#e0e3eb]"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-ri-search-line" size="18px" color="#5f6368" class="wot-mr-2" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('bms.ble.searchPlaceholder')"
              placeholder-class="search-placeholder"
              class="search-input wot-flex-1 wot-text-sm wot-text-[#202124]"
            />
            <!-- 文本清空按钮 -->
            <view
              v-if="searchQuery"
              class="clear-btn wot-flex wot-items-center wot-justify-center wot-p-1"
              @click="clearSearch"
            >
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-close-circle-fill" size="16px" color="#80868b" />
            </view>
          </view>
        </view>
      </template>

      <!-- 搜索到的蓝牙设备列表区域 -->
      <view class="wot-px-4 wot-pt-1 wot-pb-10" v-if="deviceList.length > 0">
        <view
          v-for="device in deviceList"
          :key="device.deviceId"
          @click="handleConnect(device)"
          class="device-card wot-bg-white wot-rounded-xl wot-px-3 wot-py-2.5 wot-mb-2 wot-flex wot-items-center wot-justify-between wot-border wot-border-solid wot-border-[#e0e3eb] active:wot-bg-[#f1f3f4]"
        >
          <!-- 左侧设备信息：min-w-0 flex-1 以保障内部 wot-truncate 省略截断正常生效，flex-shrink-0 保护左侧图标 -->
          <view class="wot-flex wot-items-center wot-gap-3 wot-min-w-0 wot-flex-1">
            <!-- 蓝牙图标圆形外包围，防止被长名称挤变形 -->
            <view
              class="icon-circle wot-flex wot-items-center wot-justify-center wot-bg-[#e8f0fe] wot-rounded-full wot-flex-shrink-0"
            >
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-bluetooth-fill" size="18px" color="#1a73e8" />
            </view>
            <!-- 名称与 MAC 容器：通过 flex-1 与 min-w-0 让剩余空间自适应分配 -->
            <view class="wot-flex wot-flex-col wot-min-w-0 wot-flex-1">
              <!-- 设备名称：加上 wot-truncate 确保文字超长时自动截断为省略号 -->
              <text class="wot-text-sm wot-font-bold wot-text-[#202124] wot-truncate">
                {{ device.name || device.localName || "Unknown Device" }}
              </text>
              <!-- 物理 MAC 地址展示，加上 wot-truncate 确保超长自动截断 -->
              <text class="wot-text-xs wot-text-[#5f6368] wot-mt-0.5 wot-truncate">
                {{ device.macAddress || "" }}
              </text>
            </view>
          </view>

          <!-- 右侧状态：flex-shrink-0 保护右侧信号不被左侧超长文本挤压 -->
          <view class="wot-flex wot-items-center wot-gap-3 wot-flex-shrink-0 wot-ml-2">
            <!-- 信号强度与数值 -->
            <view class="wot-flex wot-items-center wot-gap-1">
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon :css-icon="getSignalIcon(device.RSSI)" size="16px" :color="getSignalColor(device.RSSI)" />
              <text class="wot-text-xs wot-font-medium wot-text-[#5f6368]">{{ device.RSSI }} dBm</text>
            </view>

            <!-- 连接指示箭头 -->
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-ri-arrow-right-s-line" size="18px" color="#9aa0a6" />
          </view>
        </view>
      </view>

      <!-- 空列表缺省图插槽：当未搜寻到设备时，若在扫描中则展示 Google 同心圆雷达，否则展示静态缺省 -->
      <template #empty>
        <view class="wot-flex wot-flex-col wot-items-center wot-justify-center wot-py-12 wot-px-6 wot-mt-10">
          <!-- 雷达波纹同心圆扩散动画区域 -->
          <view class="radar-container wot-mb-8" v-if="isScanning">
            <view class="radar-ripple ripple-1"></view>
            <view class="radar-ripple ripple-2"></view>
            <view class="radar-ripple ripple-3"></view>
            <view class="radar-center wot-flex wot-items-center wot-justify-center">
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-bluetooth-line" size="32px" color="#1a73e8" />
            </view>
          </view>

          <!-- 静态蓝牙无设备插画 -->
          <view class="wot-flex wot-flex-col wot-items-center" v-else>
            <view class="empty-icon-wrapper wot-bg-[#f1f3f4] wot-rounded-full wot-p-4 wot-mb-4">
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-bluetooth-line" size="48px" color="#5f6368" />
            </view>
          </view>

          <text class="wot-text-base wot-font-medium wot-text-[#202124] wot-mt-2">
            {{ isScanning ? $t("bms.ble.scanning") : $t("bms.ble.searchEmpty") }}
          </text>
          <text class="wot-text-xs wot-text-[#5f6368] wot-mt-1 wot-text-center wot-max-w-xs" v-if="isScanning">
            {{ $t("bms.ble.promptConnect") }}
          </text>
        </view>
      </template>
    </z-paging>

    <!-- Source: uni_modules/wot-ui/components/wd-toast/wd-toast.vue -->
    <wd-toast />
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import { onShow, onHide, onUnload } from "@dcloudio/uni-app";

import { useI18n } from "vue-i18n";
import { useToast } from "@/uni_modules/wot-ui";
import { gsap } from "gsap";
import { bleManager } from "@/service/ble-manager";
import { useBleStore } from "@/stores/ble-store";
import { useBlePermission } from "@/composables/use-ble-permission";
import { resolveDeviceMac } from "@/utils/bms-helper";
import { getRegisteredUuids } from "@/service/protocol/protocol-registry";
import { APP_CONFIG } from "@/config";

// 初始化国际化 i18n
const { t } = useI18n();

// 初始化 wot-ui 反馈 Toast
const toast = useToast();



// 初始化 Pinia 全局蓝牙状态仓
const bleStore = useBleStore();

// 引入统一封装的可复用蓝牙与定位权限管理 Hook
const { checkStatus, resolveEnvAlert } = useBlePermission();

// z-paging 绑定数据与实例 Ref
const paging = ref<any>(null);

// 用于缓存所有去重扫描出的设备（全部数据源）
const allScannedDevices = ref<any[]>([]);

// 最终展示到界面上的过滤列表（绑定到 v-model）
const deviceList = ref<any[]>([]);

// 绑定搜索输入框的内容
const searchQuery = ref("");

// 记录权限是否曾经核验通过，避免下拉刷新时重复触发原生直申
const hasCheckedPermission = ref(false);

// 搜索状态管理与超时定时器句柄
const isScanning = ref(false);
let scanTimer: any = null;
let throttleTimer: any = null; // 用于高频更新列表的节流定时器

/**
 * 根据输入框的过滤内容以及厂商在“我的”页面配置的固定匹配规则，动态更新最终展示的列表并完成 z-paging 回调
 * 该方法支持同时对设备名称、原生 ID (含 iOS 随机 UUID) 以及 iOS/鸿蒙反推得到的真物理 MAC 地址进行精确匹配
 */
const updateDisplayList = () => {
  let list = [...allScannedDevices.value];

  // 1. 基于厂商在“我的”页面配置的固定设备名称过滤（大小写不敏感匹配）
  const fixedName = (uni.getStorageSync("ble_fixed_name_filter") || "").trim().toUpperCase();
  if (fixedName) {
    list = list.filter((device) => {
      const name = (device.name || device.localName || "").toUpperCase();
      return name.includes(fixedName);
    });
  }

  // 2. 基于搜索输入框内容过滤名称或 MAC 地址（对大写进行不敏感匹配）
  const query = searchQuery.value.trim().toUpperCase();
  if (query) {
    list = list.filter((device) => {
      // 2.1 匹配设备名称
      const name = (device.name || device.localName || "").toUpperCase();
      if (name.includes(query)) return true;

      // 2.2 匹配原生设备 ID (Android 端为物理 MAC，iOS 端为随机 UUID)
      const deviceId = (device.deviceId || "").toUpperCase();
      if (deviceId.includes(query)) return true;

      // 2.3 匹配 iOS 或鸿蒙系统下从广播包提取解析出的真实物理 MAC 地址，确保跨平台筛选正常
      const mac = (device.macAddress || "").toUpperCase();
      if (mac.includes(query)) return true;

      return false;
    });
  }

  deviceList.value = list;

  // 仅做通知数据变化，决不能清空已有列表
  paging.value?.complete(deviceList.value);
};

// 监听输入框打字输入，实现高频无感实时打字筛选
watch(searchQuery, () => {
  updateDisplayList();
});

/**
 * 清空搜索关键字
 */
const clearSearch = () => {
  searchQuery.value = "";
};

/**
 * 返回上一页，并在返回前确保扫描已完全关闭以释放硬件资源
 */
const goBack = async () => {
  await stopScanProcess();
  uni.navigateBack();
};

/**
 * 封装停止扫描的流程，防止内存泄漏以及接口调用冲突
 * 注意：此处绝不能调用无参 paging.complete() 导致渲染列表被静默清空
 */
const stopScanProcess = async () => {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
    updateDisplayList(); // 停止扫描时强制刷出最后一批缓存的设备
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
 * 下拉刷新或初始化加载时由 z-paging 触发的扫描主函数
 */
const onQuery = async () => {
  // 1. 如果当前正处于扫描状态中，先彻底关闭当前扫描
  await stopScanProcess();

  // 2. 只有在首次加载或先前未通过时，才执行耗时的完整权限状态诊断，下拉刷新则跳过原生直申
  if (!hasCheckedPermission.value) {
    const isReady = await checkStatus();

    // 3. 校验诊断结果警告，若存在阻断级配置，则中断扫描并引导用户
    if (!isReady) {
      paging.value?.complete([]);
      resolveEnvAlert(() => {
        // 用户取消了环境权限引导弹窗，由于此页面是蓝牙连接搜寻页，权限缺失无法进行任何操作，因此直接返回上一页
        goBack();
      });
      return;
    }
    hasCheckedPermission.value = true;
  }

  // 4. 诊断环境通过后，清空历史列表，开始本次设备搜索
  allScannedDevices.value = [];
  deviceList.value = [];
  paging.value?.complete([]);
  isScanning.value = true;

  try {
    // 4.1 初始化宿主蓝牙物理模块
    await bleManager.initBluetooth();

    // 4.2 调用底层扫描，实时上报设备信息
    await bleManager.startScan((device) => {
      // 针对真物理 MAC 进行去重，防止相同设备广播重复渲染导致重绘闪烁
      const mac = resolveDeviceMac(device);
      (device as any).macAddress = mac;
      
      const exists = allScannedDevices.value.some((d) => d.macAddress === mac);
      if (!exists) {
        allScannedDevices.value.push(device);

        // 首个设备发现时立即渲染，无需等待节流窗口，让用户秒看到第一个结果
        // 后续设备通过 150ms 节流窗口合并更新，防止大量设备涌入时高频重排导致卡顿
        if (allScannedDevices.value.length === 1) {
          updateDisplayList();
        } else if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            updateDisplayList();
            throttleTimer = null;
          }, 150);
        }
      }
    });

    // 4.3 设定扫描超时保护，超时后自动静默停止扫描天线以防耗电，但维持界面列表数据不被清空
    // 自动读取配置项 config/index.ts 里的 BLE_SCAN.SCAN_TIMEOUT_MS 设定
    scanTimer = setTimeout(async () => {
      await stopScanProcess();
    }, APP_CONFIG.BLE_SCAN.SCAN_TIMEOUT_MS);
  } catch (err: any) {
    console.error("启动蓝牙扫描或适配器初始化失败:", err);
    await stopScanProcess();
    paging.value?.complete(deviceList.value);
    const errMsg = err.message || err.errMsg || String(err);
    toast.error(`${t("bms.ble.connectFailed")}: ${errMsg}`);
  }
};

/**
 * 依据信号强度获取 Google 风格对应的图标
 * @param rssi 信号强度值
 */
const getSignalIcon = (rssi: number): string => {
  if (rssi >= -60) {
    return "i-ri-signal-tower-fill";
  } else if (rssi >= -80) {
    return "i-ri-signal-tower-fill";
  } else {
    return "i-ri-signal-tower-line";
  }
};

/**
 * 依据信号强度获取对应的莫兰迪配色
 * @param rssi 信号强度值
 */
const getSignalColor = (rssi: number): string => {
  if (rssi >= -60) {
    return "#0f9d58"; // 莫兰迪绿
  } else if (rssi >= -80) {
    return "#f4b400"; // 莫兰迪黄
  } else {
    return "#80868b"; // 莫兰迪灰
  }
};

// 页面连接处理入口（用户点击列表设备时触发，无需二次确认，直接发起连接）
const handleConnect = async (device: any) => {
  const deviceName = device.name || device.localName || "Unknown Device";
  const macAddress = device.macAddress || resolveDeviceMac(device);
  console.log(`[连接] 用户点击设备: name=${deviceName}, deviceId=${device.deviceId}, mac=${macAddress}`);

  // 1. 停止当前扫描进程，释放蓝牙天线物理带宽
  await stopScanProcess();

  try {
    // 2. 调用 Store 发起完整连接时序（内部将自动驱动全局加载及失败弹窗显示）
    await bleStore.connectDevice(device.deviceId, deviceName, macAddress);

    // 3. 连接成功：提示成功并在延时后返回上一页
    uni.showToast({
      title: t("bms.ble.connectSuccess"),
      icon: "success",
      duration: 1200,
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (err: any) {
    console.error("[连接] 蓝牙连接流程异常:", err);
    // 异常流程由全局 layout-provider 自动捕获提示，页面层在此不做任何多余的局部拦截处理
  }
};

// 用于管理 GSAP 动画上下文，方便在组件卸载时一次性 revert 清理
let animContext: any = null;

onMounted(() => {
  // 页面首次挂载时，利用 GSAP 实现顶栏和搜索控制台的弹性入场动画
  animContext = gsap.context(() => {
    // 搜索控制台由上方滑入并微调透明度
    gsap.from(".search-box-wrapper", {
      y: -24,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
    });

    // 搜索输入框添加微弱的缩放弹性动效
    gsap.from(".google-search-box", {
      scale: 0.95,
      duration: 0.65,
      delay: 0.1,
      ease: "back.out(1.5)",
    });
  });
});

// 页面卸载时，强制清理长扫描进程，防止内存泄漏
onUnload(() => {
  stopScanProcess();
  // 释放 GSAP 动画上下文追踪的所有动画资源，避免 detached 节点内存泄漏
  animContext?.revert();
});

/**
 * 页面进入后台（如跳转到其他页面）时停止扫描，防止后台占用蓝牙天线耗电。
 * onHide 在页面被置入导航栈时触发，onUnload 在页面被弹出时触发，两者共同覆盖所有离开场景
 */
onHide(() => {
  stopScanProcess();
});

// 记录是否是页面首次显示
let isFirstShow = true;

/**
 * 页面每次显示时（首次进入 + 从系统设置等页面返回）自动触发扫描
 * 使用 nextTick 确保 z-paging 组件 ref 已完成挂载，再安全调用 reload
 */
onShow(async () => {
  await nextTick();

  // 仅在首次进入页面，或明确从系统设置等页面返回时才触发扫描刷新
  // 规避 Android 因请求已被永久拒绝的权限导致 Activity 上下文瞬时切换从而引起 onHide/onShow 无限循环卡死的 Bug
  const returnedFromSettings = uni.getStorageSync("returned_from_settings");
  if (isFirstShow || returnedFromSettings) {
    isFirstShow = false;
    uni.removeStorageSync("returned_from_settings");
    paging.value?.reload();
  }
});
</script>

<style scoped>
/* 蓝牙图标与圆圈容器 */
.icon-circle {
  width: 34px;
  height: 34px;
  transition: background-color 0.3s ease;
}

/* 设备卡片过渡与触摸动画 */
.device-card {
  transition: all 0.2s ease-in-out;
}
.device-card:active {
  transform: scale(0.98);
}

/* Google 风格水平流光进度条 */
.progress-bar-container {
  width: 100%;
  height: 0px;
  background-color: #e8f0fe;
  overflow: hidden;
  transition: height 0.3s ease;
  position: relative;
}
.progress-bar-container.is-active {
  height: 3px;
}
.progress-bar-indicator {
  height: 100%;
  background-color: #1a73e8;
  width: 50%;
  position: absolute;
  left: -50%;
  animation: google-progress 1.5s infinite linear;
  border-radius: 1.5px;
}
@keyframes google-progress {
  0% {
    left: -50%;
    width: 30%;
  }
  50% {
    width: 60%;
  }
  100% {
    left: 100%;
    width: 30%;
  }
}

/* Google 雷达波纹扫描动画 */
.radar-container {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radar-ripple {
  position: absolute;
  border: 1.5px solid rgba(26, 115, 232, 0.15);
  border-radius: 50%;
  background-color: rgba(26, 115, 232, 0.03);
  width: 100%;
  height: 100%;
  animation: radar-pulse 3s infinite linear;
  opacity: 0;
  box-sizing: border-box;
}
.ripple-1 {
  animation-delay: 0s;
}
.ripple-2 {
  animation-delay: 1s;
}
.ripple-3 {
  animation-delay: 2s;
}
.radar-center {
  position: relative;
  z-index: 10;
  width: 64px;
  height: 64px;
  background-color: #e8f0fe;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.15);
}
@keyframes radar-pulse {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}

/* 手写输入框容器与输入源 */
.google-search-box {
  height: 40px;
  box-sizing: border-box;
  transition: all 0.25s ease;
}
.google-search-box:focus-within {
  border-color: #1a73e8 !important;
  box-shadow: 0 1px 3px rgba(26, 115, 232, 0.12);
}
.search-input {
  border: none;
  background: transparent;
  outline: none;
  height: 100%;
}
.search-placeholder {
  color: #9aa0a6;
  font-size: 14px;
}

/* 「连接中」Popup 内容卡片背景 */
.connecting-popup {
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  margin: 0 12px 12px;
  border-radius: 20px;
}

/* 连接中旋转环形动画 */
.connect-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #e8f0fe;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 错误 Popup 图标背景圆 */
.error-icon-ring {
  width: 64px;
  height: 64px;
  background-color: #fce8e6;
}

/* 列表项加入的平滑渐显飞入动画，100% 避免小程序及 APP 端 shadow-DOM 布局破坏缺陷 */
.device-card {
  animation: cardFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
