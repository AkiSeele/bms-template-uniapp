<template>
  <view class="scroll-page-container wot-w-full" :class="[actualTheme === 'dark' ? 'theme-dark' : 'theme-light']">
    <!-- 顶部固定定位导航栏 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar fixed safe-area-inset-top :custom-style="navbarStyle" @click-left="handleScanConnect">
      <template #left>
        <view class="wot-flex wot-items-center wot-gap-2">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon name="scan" size="20px" :color="navbarContentColor" />
          <view v-if="!isOfflineMode" class="wot-flex wot-items-center wot-gap-1">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-cloud" size="14px" :color="navbarContentColor" />
            <text class="wot-font-bold wot-text-caption wot-scale-90" :style="{ color: navbarContentColor }">
              {{ $t("bms.mine.cloudOnline") }}
            </text>
          </view>
        </view>
      </template>
      <template #title>
        <text class="wot-font-bold" :style="{ fontSize: '28rpx', color: navbarContentColor }">
          {{ $t("bms.title") }}
        </text>
      </template>
    </wd-navbar>

    <!-- 滚动容器：在滑动模式下管理首页整体滚动 -->
    <scroll-view
      scroll-y
      class="scroll-mode-layout"
      :show-scrollbar="false"
      :enhanced="true"
      @scroll="onScrollModeScroll"
    >
      <!-- 上半部分大背景层：使用相对/文档流排列，彻底隔离绝对定位 -->
      <view class="scroll-header-wrap wot-relative">
        <view class="scroll-header-bg wot-overflow-hidden wot-w-full" :style="headerBgStyle">
          <!-- 顶部内容占位：防止内容与固定导航栏重叠 -->
          <view class="navbar-placeholder" />

          <!-- 上半部分可淡出内容包装器：随滚动透明度降低，与背景色彩过渡相得益彰 -->
          <view :style="{ opacity: headerContentOpacity }">
            <!-- 隔离的高精度矢量 SVG 仪表盘组件 -->
            <view class="soc-dashboard-wrap wot-flex wot-justify-center wot-items-center wot-mt-2">
              <soc-dashboard
                :percent="socPercent"
                :is-connected="isConnected"
                :is-charging="isCharging"
                :is-discharging="isDischarging"
              />
            </view>

            <!-- 电流与电压实时数据面板（磨砂玻璃双联卡片） -->
            <view class="wot-px-3 wot-mt-3 wot-mb-6 wot-w-full wot-box-border">
              <view class="telemetry-panel wot-flex wot-items-center wot-justify-between wot-py-4">
                <!-- 电流展示项 -->
                <view class="telemetry-item wot-flex wot-items-center wot-justify-center wot-flex-1">
                  <view class="telemetry-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3">
                    <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                    <wd-icon
                      css-icon="i-ri-pulse-line"
                      size="18px"
                      :color="actualTheme === 'dark' ? '#ffffff' : activeThemeColor"
                    />
                  </view>
                  <view class="wot-flex wot-flex-col wot-justify-center">
                    <text class="telemetry-value wot-text-white wot-font-extrabold monospace">
                      {{ isConnected ? (realtimeCurrent >= 0 ? "+" : "") + realtimeCurrent : "0.00" }}
                      <text class="telemetry-unit">A</text>
                    </text>
                    <text class="telemetry-label wot-text-white wot-opacity-80">
                      {{ $t("bms.params.realtimeCurrent") }}
                    </text>
                  </view>
                </view>

                <!-- 中间分割线 -->
                <view class="telemetry-divider"></view>

                <!-- 电压展示项 -->
                <view class="telemetry-item wot-flex wot-items-center wot-justify-center wot-flex-1">
                  <view class="telemetry-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3">
                    <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                    <wd-icon
                      css-icon="i-ri-flashlight-line"
                      size="18px"
                      :color="actualTheme === 'dark' ? '#ffffff' : activeThemeColor"
                    />
                  </view>
                  <view class="wot-flex wot-flex-col wot-justify-center">
                    <text class="telemetry-value wot-text-white wot-font-extrabold monospace">
                      {{ isConnected ? totalVoltage : "0.00" }}
                      <text class="telemetry-unit">V</text>
                    </text>
                    <text class="telemetry-label wot-text-white wot-opacity-80">
                      {{ $t("bms.params.totalVoltage") }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 平滑过渡遮罩层：上滑时通过 opacity 变化渐变为底部背景色 -->
        <view
          class="scroll-header-mask"
          :style="{
            opacity: scrollHeaderMaskOpacity,
            backgroundColor: actualTheme === 'dark' ? '#0f172a' : '#f6f8fc',
          }"
        />
      </view>

      <!-- 粘性蓝牙状态栏：它在 scroll-view 中是独立的 sticky 元素，其父容器是整个 scroll-view -->
      <view class="sticky-bluetooth-wrapper" :style="stickyBluetoothStyle">
        <!-- 蓝牙连接状态面板（内容区域融合卡片） -->
        <view class="bluetooth-status-panel wot-flex wot-items-center wot-justify-between wot-p-4">
          <view class="wot-flex wot-items-center wot-min-w-0">
            <!-- 蓝牙图标呼吸闪烁动画 -->
            <view
              class="status-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3 wot-flex-shrink-0"
              :class="isConnected ? 'bg-primary-light' : 'bg-neutral-light'"
              :style="isConnected ? pulseStyle : undefined"
            >
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon
                :css-icon="isConnected ? 'i-ri-bluetooth-fill' : 'i-ri-bluetooth-line'"
                size="20px"
                :color="isConnected ? activeThemeColor : '#858585'"
              />
            </view>
            <view class="wot-flex wot-flex-col wot-min-w-0">
              <text class="wot-text-text-main wot-font-bold wot-truncate" :style="{ fontSize: '26rpx' }">
                {{ isConnected ? connectedName : $t("bms.ble.disconnected") }}
              </text>
              <text class="wot-text-text-secondary wot-mt-[2rpx] wot-truncate" :style="{ fontSize: '20rpx' }">
                {{ isConnected ? $t("bms.ble.deviceMac") + connectedMac : $t("bms.ble.promptConnect") }}
              </text>
            </view>
          </view>

          <!-- 快速连接/断开按钮 -->
          <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
          <wd-button size="small" :type="isConnected ? 'error' : 'primary'" @click="toggleConnection" plain>
            {{ isConnected ? $t("bms.ble.disconnect") : $t("bms.ble.connect") }}
          </wd-button>
        </view>
      </view>

      <!-- 下半部分卡片容器 -->
      <view class="scroll-bottom-container" :style="scrollBottomContainerStyle">
        <!-- 下半部分主要数据面板（普通文档流跟随滚动） -->
        <view class="scroll-body-content wot-px-4 wot-pb-24">
          <!-- 4 个核心参数 Google MD3 规格卡片网格 -->
          <view class="wot-grid wot-grid-cols-4 wot-gap-3 wot-pt-2">
            <!-- 剩余容量卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper wot-bg-primary-1 wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-battery-2-charge-line" size="18px" :color="activeThemeColor" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.battery.remainingCapacity") }}
              </text>
              <text
                class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1 wot-truncate wot-w-full"
              >
                {{ remainCap }}
              </text>
            </view>

            <!-- 健康度 SOH 卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper wot-bg-success-1 wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-heart-pulse-line" size="18px" color="#10b981" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.params.soh") }}
              </text>
              <text class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1">
                {{ sohDisplay }}
              </text>
            </view>

            <!-- 循环次数卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper wot-bg-warning-1 wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-loop-left-line" size="18px" color="#f59e0b" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.params.cycleCount") }}
              </text>
              <text class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1">
                {{ cycleCountDisplay }}
              </text>
            </view>

            <!-- 运行总时长卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper wot-bg-info-1 wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-time-line" size="18px" color="#06b6d4" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.params.runTime") }}
              </text>
              <text
                class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1 wot-truncate wot-w-full"
              >
                {{ runTimeStr }}
              </text>
            </view>
          </view>

          <!-- 充放电开关控制卡片 -->
          <view class="wot-grid wot-grid-cols-2 wot-gap-3 wot-mt-4">
            <!-- 充电 MOS 控制卡片 -->
            <view
              class="md3-switch-card wot-box-border wot-flex wot-items-center wot-justify-between"
              :class="{ 'is-active': isCharging && isConnected }"
            >
              <view class="wot-flex wot-items-center wot-min-w-0 wot-flex-1">
                <view
                  class="control-icon-wrapper wot-bg-primary-1 wot-flex wot-items-center wot-justify-center wot-mr-2 wot-flex-shrink-0"
                >
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-battery-charge-line" size="18px" :color="activeThemeColor" />
                </view>
                <view class="wot-flex wot-flex-col wot-min-w-0">
                  <text
                    class="wot-font-bold wot-text-text-main wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '24rpx' }"
                  >
                    {{ $t("bms.control.chargeMos") }}
                  </text>
                  <text
                    class="wot-text-text-auxiliary wot-mt-[2rpx] wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '20rpx' }"
                  >
                    {{ $t("bms.control.chargeMosDesc") }}
                  </text>
                </view>
              </view>
              <view class="wot-flex wot-justify-end wot-items-center wot-flex-shrink-0" :style="{ width: '80rpx' }">
                <!-- Source: uni_modules/wot-ui/components/wd-switch/wd-switch.vue -->
                <wd-switch
                  :model-value="isCharging"
                  :disabled="!isConnected"
                  @change="toggleCharge"
                  :active-color="activeThemeColor"
                  size="18px"
                />
              </view>
            </view>

            <!-- 放电 MOS 控制卡片 -->
            <view
              class="md3-switch-card wot-box-border wot-flex wot-items-center wot-justify-between"
              :class="{ 'is-active': isDischarging && isConnected }"
            >
              <view class="wot-flex wot-items-center wot-min-w-0 wot-flex-1">
                <view
                  class="control-icon-wrapper wot-bg-success-1 wot-flex wot-items-center wot-justify-center wot-mr-2 wot-flex-shrink-0"
                >
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-flashlight-line" size="18px" color="#10b981" />
                </view>
                <view class="wot-flex wot-flex-col wot-min-w-0">
                  <text
                    class="wot-font-bold wot-text-text-main wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '24rpx' }"
                  >
                    {{ $t("bms.control.dischargeMos") }}
                  </text>
                  <text
                    class="wot-text-text-auxiliary wot-mt-[2rpx] wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '20rpx' }"
                  >
                    {{ $t("bms.control.dischargeMosDesc") }}
                  </text>
                </view>
              </view>
              <view class="wot-flex wot-justify-end wot-items-center wot-flex-shrink-0" :style="{ width: '80rpx' }">
                <!-- Source: uni_modules/wot-ui/components/wd-switch/wd-switch.vue -->
                <wd-switch
                  :model-value="isDischarging"
                  :disabled="!isConnected"
                  @change="toggleDischarge"
                  :active-color="activeThemeColor"
                  size="18px"
                />
              </view>
            </view>
          </view>

          <!-- 温度监控看板卡片 -->
          <view class="md3-panel-card wot-box-border wot-mt-4">
            <view
              class="wot-border-solid wot-border-divider-main wot-border-t-0 wot-border-l-0 wot-border-r-0 wot-border-b-[1.5px] wot-flex wot-items-center wot-justify-between wot-pb-2.5"
            >
              <view class="wot-flex wot-items-center">
                <view class="card-decorator wot-mr-2" :style="{ backgroundColor: activeThemeColor }"></view>
                <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '26rpx' }">
                  {{ $t("bms.params.multiTempMonitor") }}
                </text>
              </view>
            </view>
            <view
              class="monitor-body wot-flex wot-items-center wot-pt-3.5"
              v-if="isConnected && temperatureList.length > 0"
            >
              <view
                class="wot-mr-4 wot-flex wot-items-center wot-justify-center wot-flex-shrink-0"
                :style="{ width: '80rpx', height: '80rpx' }"
              >
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-temp-hot-line" size="80rpx" color="#10b981" />
              </view>
              <view class="wot-grid wot-grid-cols-2 wot-gap-2 wot-flex-1">
                <view v-for="(tItem, index) in temperatureList" :key="index" class="temp-item-pill">
                  <text class="wot-text-text-secondary" :style="{ fontSize: '22rpx' }">
                    {{ tItem.name }}
                  </text>
                  <text class="wot-font-bold temp-val-color" :style="{ fontSize: '24rpx' }">{{ tItem.value }}°C</text>
                </view>
              </view>
            </view>
            <view v-else class="wot-py-4">
              <!-- Source: uni_modules/wot-ui/components/wd-empty/wd-empty.vue -->
              <wd-empty image="empty" :description="$t('bms.battery.noData')" />
            </view>
          </view>

          <!-- BMS 安全保护状态列表卡片 -->
          <view class="md3-panel-card wot-box-border wot-mt-4">
            <view
              class="wot-border-solid wot-border-divider-main wot-border-t-0 wot-border-l-0 wot-border-r-0 wot-border-b-[1.5px] wot-flex wot-items-center wot-justify-between wot-pb-2.5"
            >
              <view class="wot-flex wot-items-center">
                <view class="card-decorator wot-mr-2" :style="{ backgroundColor: activeThemeColor }"></view>
                <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '26rpx' }">
                  {{ $t("bms.protect.title") }}
                </text>
              </view>
            </view>
            <view class="wot-flex wot-flex-col wot-gap-3 wot-pt-3.5">
              <view class="wot-flex wot-items-center wot-justify-between">
                <view class="wot-flex wot-items-center">
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-shield-flash-line" size="18px" color="#10b981" class="wot-mr-2" />
                  <text class="wot-text-sm wot-text-text-secondary">{{ $t("bms.protect.overTemp") }}</text>
                </view>
                <view
                  :class="isConnected ? 'badge-success-outline' : 'badge-neutral-outline'"
                  class="wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-xs wot-font-bold"
                >
                  {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
                </view>
              </view>
              <view class="wot-flex wot-items-center wot-justify-between">
                <view class="wot-flex wot-items-center">
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-shield-flash-line" size="18px" color="#10b981" class="wot-mr-2" />
                  <text class="wot-text-sm wot-text-text-secondary">{{ $t("bms.protect.overVolt") }}</text>
                </view>
                <view
                  :class="isConnected ? 'badge-success-outline' : 'badge-neutral-outline'"
                  class="wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-xs wot-font-bold"
                >
                  {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
                </view>
              </view>
              <view class="wot-flex wot-items-center wot-justify-between">
                <view class="wot-flex wot-items-center">
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-shield-keyhole-line" size="18px" color="#10b981" class="wot-mr-2" />
                  <text class="wot-text-sm wot-text-text-secondary">{{ $t("bms.protect.shortCircuit") }}</text>
                </view>
                <view
                  :class="isConnected ? 'badge-success-outline' : 'badge-neutral-outline'"
                  class="wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-xs wot-font-bold"
                >
                  {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Source: uni_modules/wot-ui/components/wd-toast/wd-toast.vue -->
    <wd-toast />
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, getCurrentInstance } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import gsap from "gsap";
import SocDashboard from "@/components/soc-dashboard/soc-dashboard.vue";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useDeviceInfo } from "@/uni_modules/wot-ui/composables/useDeviceInfo";
import { useBleStore } from "@/stores/ble-store";
import { useAppStore } from "@/stores/app";
import { useScanConnect } from "@/composables/use-scan-connect";
import { useAutoConnect } from "@/composables/use-auto-connect";
import { usePulseAnimation } from "@/composables/use-pulse-animation";
import { APP_CONFIG } from "@/config";

// 挂载扫码一键连接的业务交互组合式函数
const { handleScanConnect } = useScanConnect();

// 挂载自动连接业务交互组合式函数
const { triggerAutoConnect } = useAutoConnect();

// 初始化交互弹出组件与国际化翻译实例
const toast = useToast();
const dialog = useDialog();
const { t } = useI18n();

// 获取全局蓝牙 Store 管理器
const bleStore = useBleStore();

// 获取全局应用配置 Store
const appStore = useAppStore();
const { activeThemeColor, actualTheme } = storeToRefs(appStore);

// 联动全局蓝牙连接状态、已连接设备信息及电池物理遥测响应式状态
const {
  isBleConnected: isConnected,
  connectedDeviceName: connectedName,
  connectedDeviceMac: connectedMac,
  isCharging,
  isDischarging,
  batteryPercent,
  totalVoltage,
  realtimeCurrent,
  temperature,
  extendedProtocolData,
} = storeToRefs(bleStore);

// 蓝牙图标呼吸动画脉冲效果
const { pulseStyle, stopPulse } = usePulseAnimation(isConnected);

// 内部列表当前的滚动高度与 GSAP 平滑缓动高度
const scrollModeTop = ref(0);
const scrollTopSmooth = ref(0);

// 组件销毁时清理
onUnmounted(() => {
  stopPulse();
  gsap.killTweensOf(scrollTopSmooth);
});

// 引入 wot-ui 底层设备信息适配
const { statusBarHeight, navBarTotalHeight } = useDeviceInfo();

// 动态计算系统的导航栏高度
const navbarHeight = computed(() => {
  if (navBarTotalHeight.value && navBarTotalHeight.value > 0) {
    return navBarTotalHeight.value;
  }
  return (statusBarHeight.value || 0) + 44;
});

// 监听滑动模式 scroll-view 的滚动事件，并使用 GSAP 进行 60fps 平滑插值缓动
const onScrollModeScroll = (e: any) => {
  scrollModeTop.value = e.detail.scrollTop;
  gsap.to(scrollTopSmooth, {
    value: e.detail.scrollTop,
    duration: 0.2, // 200ms 保证了快速滚动的响应灵敏度
    overwrite: "auto",
    ease: "power1.out",
  });
};

// 判定当前运行模式是否为单机离线模式
const isOfflineMode = computed(() => APP_CONFIG.APP_MODE === "offline");

// 获取当前组件实例，用以执行物理布局测量
const instance = getCurrentInstance();
const headerHeight = ref(380);

// 动态计算蓝牙卡片吸顶时所需的精确滚动距离，彻底杜绝硬编码误差
const targetScroll = computed(() => {
  return headerHeight.value - navbarHeight.value - 24;
});

// 动态定制顶部区域的大背景渐变，亮暗色下将渐变色起终点进行对调，高雅对比
const headerBgStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  const themeColor = activeThemeColor.value;
  return {
    background: isDark
      ? `linear-gradient(135deg, ${themeColor}22 0%, #0f172a 100%)`
      : `linear-gradient(135deg, #f4f8fc 0%, ${themeColor}0a 35%, ${themeColor}30 100%)`,
  };
});

// 上半部分内容的透明度，随滚动逐渐变淡，防止与渐变背景色重叠影响字色对比度
const headerContentOpacity = computed(() => {
  if (targetScroll.value <= 0) return 1;
  // 在前 60% 的滚动距离中平滑变淡消失
  const fadeRange = targetScroll.value * 0.6;
  return Math.max(0, 1 - scrollTopSmooth.value / fadeRange);
});

// 滑动模式下的过渡遮罩透明度（在滚动过程中平滑变淡为灰色底色）
const scrollHeaderMaskOpacity = computed(() => {
  if (targetScroll.value <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTopSmooth.value / targetScroll.value));
});

// 动态检测是否处于吸顶状态以切换状态栏及微信胶囊的前景颜色
const isHeaderSticky = computed(() => {
  return scrollTopSmooth.value >= targetScroll.value;
});

watch(
  [isHeaderSticky, actualTheme],
  ([sticky, theme]) => {
    // #ifdef MP-WEIXIN || APP-PLUS
    uni.setNavigationBarColor({
      frontColor: sticky && theme !== "dark" ? "#000000" : "#ffffff",
      backgroundColor: "#000000",
    });
    // #endif
  },
  { immediate: true },
);

// 滑动模式下吸顶卡片头部的圆角过渡样式（在贴合高度前 60px 内实现平滑收起）
const scrollHeaderBorderRadius = computed(() => {
  if (scrollTopSmooth.value >= targetScroll.value) {
    return "0px 0px 0 0";
  }
  if (scrollTopSmooth.value <= targetScroll.value - 60) {
    return "16px 16px 0 0";
  }
  const ratio = (targetScroll.value - scrollTopSmooth.value) / 60;
  const r = Math.max(0, ratio * 16);
  return `${r}px ${r}px 0 0`;
});

// 动态定制导航栏背景样式，仅在彻底接触吸顶的瞬间突变为底色
const navbarStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  const isSticky = scrollTopSmooth.value >= targetScroll.value;

  if (isSticky) {
    const endR = isDark ? 15 : 246;
    const endG = isDark ? 23 : 248;
    const endB = isDark ? 42 : 252;
    const shadowAlpha = isDark ? 0.25 : 0.05;
    return `background-color: rgb(${endR}, ${endG}, ${endB}) !important; border-bottom: none !important; z-index: 200 !important; box-shadow: 0 4px 20px rgba(0, 0, 0, ${shadowAlpha}) !important;`;
  }

  return "background-color: transparent !important; border-bottom: none !important; box-shadow: none !important; z-index: 200 !important;";
});

// 动态计算导航栏内容颜色，仅在彻底接触吸顶的瞬间触发黑白反色
const navbarContentColor = computed(() => {
  const isDark = actualTheme.value === "dark";
  if (isDark) {
    return "#ffffff";
  }
  return "#1d1f29";
});

// 动态计算下半部分容器的样式（仅处理背景色以与蓝牙状态栏无缝拼接）
const scrollBottomContainerStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  return {
    backgroundColor: isDark ? "#0f172a" : "#f6f8fc",
  };
});

// 粘性蓝牙状态栏的动态定位、背景、圆角及悬浮阴影样式，作为卡片顶边缘接管视觉交互
const stickyBluetoothStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  const ratio = targetScroll.value > 0 ? Math.max(0, Math.min(1, scrollTopSmooth.value / targetScroll.value)) : 0;

  // 计算顶部的动态阴影，越接近吸顶阴影越弱，直到完全贴口时消失
  const maxShadowOpacity = isDark ? 0.35 : 0.08;
  const shadowAlpha = (1 - ratio) * maxShadowOpacity;
  const shadow = shadowAlpha > 0.005 ? `0 -10px 30px rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})` : "none";

  return {
    top: navbarHeight.value + "px",
    backgroundColor: isDark ? "#0f172a" : "#f6f8fc",
    borderRadius: scrollHeaderBorderRadius.value,
    boxShadow: shadow,
  };
});

// 动态提取并拼接温度数据列表
const temperatureList = computed(() => {
  const list: { name: string; value: number }[] = [];
  if (temperature.value && Array.isArray(temperature.value)) {
    temperature.value.forEach((val, idx) => {
      if (val !== undefined && val !== 0) {
        list.push({
          name: "T" + (idx + 1),
          value: val,
        });
      }
    });
  }
  if (extendedProtocolData.value?.mosTemperature !== undefined && extendedProtocolData.value.mosTemperature !== 0) {
    list.push({
      name: "MOS",
      value: extendedProtocolData.value.mosTemperature,
    });
  }
  if (extendedProtocolData.value?.envTemperature !== undefined && extendedProtocolData.value.envTemperature !== 0) {
    list.push({
      name: t("bms.params.envTempShort"),
      value: extendedProtocolData.value.envTemperature,
    });
  }
  return list;
});

// 处理连接/断开蓝牙按钮点击事件
const toggleConnection = () => {
  if (!isConnected.value) {
    uni.navigateTo({
      url: "/pages/ble-search/index",
    });
  } else {
    dialog
      .confirm({
        title: t("bms.common.prompt"),
        msg: t("bms.ble.disconnectConfirmPrefix") + connectedName.value + t("bms.ble.disconnectConfirmSuffix"),
      })
      .then(async () => {
        try {
          await bleStore.disconnectDevice();
          toast.show({ msg: t("bms.ble.disconnected") });
        } catch (e) {
          console.error("断开蓝牙连接出现异常:", e);
        }
      })
      .catch(() => {});
  }
};

// 切换充电 MOS 开关状态
const toggleCharge = async (e: any) => {
  const nextVal = e.value;
  try {
    toast.loading({ msg: t("bms.control.sending"), cover: true });
    await bleStore.sendControlCommand("charge", nextVal);
    toast.success(t("bms.control.chargeSuccess"));
  } catch (err: any) {
    console.error("充电开关指令下发失败:", err);
    toast.error(err.message || t("bms.control.sendFailed"));
  } finally {
    toast.close();
  }
};

// 切换放电 MOS 开关状态
const toggleDischarge = async (e: any) => {
  const nextVal = e.value;
  try {
    toast.loading({ msg: t("bms.control.sending"), cover: true });
    await bleStore.sendControlCommand("discharge", nextVal);
    toast.success(t("bms.control.dischargeSuccess"));
  } catch (err: any) {
    console.error("放电开关指令下发失败:", err);
    toast.error(err.message || t("bms.control.sendFailed"));
  } finally {
    toast.close();
  }
};

// 监听全局蓝牙连接成功状态
watch(isConnected, (newVal) => {
  if (newVal) {
    toast.success(t("bms.ble.connectSuccess"));
  }
});

// 电池 SOC 百分比
const socPercent = computed(() => {
  return isConnected.value ? batteryPercent.value || 0 : 0;
});

// 剩余容量
const remainCap = computed(() => {
  if (!isConnected.value) return "-- Ah";
  const nominal = extendedProtocolData.value?.nominalCapacity || 100;
  const current = (socPercent.value / 100) * nominal;
  return `${current.toFixed(1)} / ${nominal} Ah`;
});

// 健康度 SOH 显示
const sohDisplay = computed(() => {
  if (!isConnected.value) return "-- %";
  return `${extendedProtocolData.value?.soh || 100} %`;
});

// 循环次数显示
const cycleCountDisplay = computed(() => {
  if (!isConnected.value) return "--";
  return `${extendedProtocolData.value?.cycleCount || 0}`;
});

// 运行总时长显示
const runTimeStr = computed(() => {
  if (!isConnected.value) return "--";
  const seconds = extendedProtocolData.value?.runTimeSeconds || 0;
  const d = Math.floor(seconds / (24 * 3600));
  const h = Math.floor((seconds % (24 * 3600)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  let str = "";
  if (d > 0) str += `${d}${t("common.day")} `;
  if (h > 0 || d > 0) str += `${h}${t("common.hour")} `;
  str += `${m}${t("common.minute")}`;
  return str;
});

onMounted(() => {
  triggerAutoConnect();
  // 延迟一小段时间，确保布局完全就绪后，动态测量上半部分包装器的实际高度
  setTimeout(() => {
    uni
      .createSelectorQuery()
      .in(instance)
      .select(".scroll-header-wrap")
      .boundingClientRect((rect: any) => {
        if (rect && rect.height) {
          headerHeight.value = rect.height;
        }
      })
      .exec();
  }, 100);
});
</script>

<style scoped lang="scss">
.scroll-page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f6f8fc;
}

/* 滑动模式专属样式，无绝对定位，避免高度覆盖冲突 */
.scroll-mode-layout {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  touch-action: pan-y;
}

.scroll-header-wrap {
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.scroll-header-bg {
  width: 100%;
  padding-bottom: 24rpx;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.15);
  box-sizing: border-box;
}

.scroll-header-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* 穿透触摸 */
  z-index: 2; /* 盖在大背景最上层 */
  transition: opacity 0.1s linear;
  will-change: opacity;
}

.scroll-bottom-container {
  width: 100%;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  z-index: 3;
  margin-top: 0;
}

.scroll-body-content {
  width: 100%;
  box-sizing: border-box;
  background-color: transparent;
}

:deep(.wd-navbar) {
  border-bottom: none !important;
  .wd-navbar__title {
    font-weight: bold;
    font-size: 28rpx;
    transition: color 0.3s ease !important;
  }
  .wd-navbar__left {
    transition: color 0.3s ease !important;
  }
  uni-text,
  text,
  span,
  .wd-icon {
    transition: color 0.3s ease !important;
  }
}

.navbar-placeholder {
  height: calc(var(--status-bar-height) + 44px);
}

.sticky-bluetooth-wrapper {
  position: sticky;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 12px 16px 8px;
  box-sizing: border-box;
  margin-top: -24px;
  will-change: border-radius, box-shadow;
}

.bluetooth-status-panel {
  background-color: var(--wot-filled-oppo, #ffffff);
  border: 1px solid var(--wot-border-light, #eef2f6);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.status-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.bg-primary-light {
  background-color: var(--wot-color-theme-light, rgba(28, 110, 255, 0.12));
}

.bg-neutral-light {
  background-color: var(--wot-filled-content, #f2f3f5);
}

.telemetry-panel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.theme-light {
  .telemetry-panel {
    background: rgba(255, 255, 255, 0.75) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.9) !important;
    box-shadow:
      0 10px 25px -4px rgba(148, 163, 184, 0.18),
      inset 0 2px 4px rgba(255, 255, 255, 0.6) !important;
  }
  .telemetry-value {
    color: #0f172a !important;
  }
  .telemetry-unit {
    color: #475569 !important;
  }
  .telemetry-label {
    color: #475569 !important;
    opacity: 0.85 !important;
  }
  .telemetry-icon-wrapper {
    background-color: rgba(37, 99, 235, 0.08) !important;
  }
  .telemetry-divider {
    background-color: rgba(148, 163, 184, 0.18) !important;
  }
}

.telemetry-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.12);
}

.telemetry-value {
  font-size: 38rpx;
  line-height: 1.1;
}

.telemetry-unit {
  font-size: 24rpx;
  margin-left: 2rpx;
  font-weight: 500;
}

.telemetry-label {
  font-size: 20rpx;
  margin-top: 4rpx;
}

.telemetry-divider {
  width: 1px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.18);
}

.drawer-handle {
  width: 100%;
  height: 4px;
  padding: 14px 0 8px;
  box-sizing: content-box;
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform, opacity;
}

.md3-metric-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
  &:active {
    transform: scale(0.96);
    background-color: var(--wot-filled-content, #f2f3f5);
  }
}

.card-icon-wrapper {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.metric-label {
  font-size: 18rpx;
}

.metric-value {
  font-size: 22rpx;
}

.md3-switch-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
  &.is-active {
    background: linear-gradient(135deg, rgba(28, 110, 255, 0.04) 0%, rgba(28, 110, 255, 0.08) 100%);
    border-color: rgba(28, 110, 255, 0.25);
    box-shadow: 0 4px 12px rgba(28, 110, 255, 0.05);
  }
}

.control-icon-wrapper {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.md3-panel-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
}

.card-decorator {
  width: 6rpx;
  height: 26rpx;
  border-radius: 99px;
  flex-shrink: 0;
}

.temp-item-pill {
  background-color: var(--wot-filled-content, #f2f3f5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
}

.temp-val-color {
  color: #10b981;
}

.badge-success-outline {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10b981;
}

.badge-neutral-outline {
  background-color: var(--wot-filled-content, #f2f3f5);
  border: 1px solid var(--wot-border-light, #eef2f6);
  color: #858585;
}

.monospace {
  font-family:
    ui-monospace,
    SFMono-Regular,
    SF Mono,
    Menlo,
    Monaco,
    Consolas,
    monospace;
}
</style>
