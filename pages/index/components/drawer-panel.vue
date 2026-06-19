<template>
  <view class="page-container wot-w-full" :class="[actualTheme === 'dark' ? 'theme-dark' : 'theme-light']">
    <!-- 顶部固定定位导航栏：通过滚动动态改变底色与字色 -->
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

    <!-- 底层固定定位的深色背景与仪表盘（作为背景层）：阻断手势冒泡防止外层页面滚动 -->
    <view class="header-gradient wot-overflow-hidden wot-w-full" :style="headerBgStyle" @touchmove.stop.prevent="">
      <!-- 顶部内容占位：防止内容与固定导航栏重叠 -->
      <view class="navbar-placeholder" />

      <!-- 隔离的高精度矢量 SVG 仪表盘组件 -->
      <view class="soc-dashboard-wrap wot-flex wot-justify-center wot-items-center wot-mt-2">
        <soc-dashboard
          :percent="socPercent"
          :is-connected="isConnected"
          :is-charging="isCharging"
          :is-discharging="isDischarging"
        />
      </view>

      <!-- 蓝牙连接状态面板（磨砂玻璃卡片） -->
      <view class="wot-px-4 wot-mt-5 wot-w-full wot-box-border">
        <view class="bluetooth-status-panel wot-flex wot-items-center wot-justify-between wot-p-4">
          <view class="wot-flex wot-items-center wot-min-w-0">
            <!-- 蓝牙图标呼吸闪烁动画 -->
            <view
              class="status-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3 wot-flex-shrink-0"
              :style="isConnected ? pulseStyle : undefined"
            >
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon
                :css-icon="isConnected ? 'i-ri-bluetooth-fill' : 'i-ri-bluetooth-line'"
                size="20px"
                color="#ffffff"
              />
            </view>
            <view class="wot-flex wot-flex-col wot-min-w-0">
              <text class="wot-text-white wot-font-bold wot-truncate" :style="{ fontSize: '26rpx' }">
                {{ isConnected ? connectedName : $t("bms.ble.disconnected") }}
              </text>
              <text class="wot-text-white wot-opacity-70 wot-mt-[2rpx] wot-truncate" :style="{ fontSize: '20rpx' }">
                {{ isConnected ? $t("bms.ble.deviceMac") + connectedMac : $t("bms.ble.promptConnect") }}
              </text>
            </view>
          </view>

          <!-- 快速连接/断开按钮 -->
          <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
          <wd-button size="small" custom-class="glass-connect-btn" @click="toggleConnection">
            <text class="wot-text-white wot-font-semibold" :style="{ fontSize: '22rpx' }">
              {{ isConnected ? $t("bms.ble.disconnect") : $t("bms.ble.connect") }}
            </text>
          </wd-button>
        </view>
      </view>

      <!-- 电流与电压实时数据面板（磨砂玻璃双联卡片） -->
      <view class="wot-px-4 wot-mt-3 wot-mb-5 wot-w-full wot-box-border">
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
              <text class="telemetry-label wot-text-white wot-opacity-80">{{ $t("bms.params.realtimeCurrent") }}</text>
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
              <text class="telemetry-label wot-text-white wot-opacity-80">{{ $t("bms.params.totalVoltage") }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 独立的抽屉顶部阴影层：使用纯 opacity 变化，结合 transform 随抽屉移动。 -->
    <view
      class="drawer-shadow-layer"
      :style="{
        transform: 'translate3d(0, ' + drawerY + 'px, 0)',
        opacity: shadowOpacity,
        borderRadius: borderRadiusStyle,
      }"
    />

    <!-- 3. 上层拖拽覆盖卡片：绑定触控手势与动态 GSAP 平移样式 -->
    <view
      class="page-bottom-content wot-bg-filled-bottom"
      :style="{ transform: 'translate3d(0, ' + drawerY + 'px, 0)', borderRadius: borderRadiusStyle }"
      @touchstart="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 抽屉顶部拉手指示条：保持静态常驻，避免吸顶隐藏导致内容高度发生突变 -->
      <view class="drawer-handle wot-flex wot-justify-center wot-items-center">
        <view class="wot-w-10 wot-h-1 wot-bg-gray-300 wot-opacity-60 wot-rounded-full"></view>
      </view>

      <!-- 内部局部列表滚动，只有在完全吸顶时开启滚动，完美防止手势冲突 -->
      <scroll-view
        scroll-y
        :scroll-enabled="isScrollEnabled"
        class="drawer-scroll-view wot-w-full"
        :show-scrollbar="false"
        :enhanced="true"
        @scroll="onInnerScroll"
        @scrolltoupper="onScrollToUpper"
      >
        <view class="wot-px-4 wot-pb-24">
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

          <!-- 充放电开关控制卡片（高内聚 MD3 卡片样式） -->
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
              <!-- 多路温度感应器栅格 -->
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
              <!-- 过温保护行 -->
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

              <!-- 过压保护行 -->
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

              <!-- 短路保护行 -->
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
      </scroll-view>
    </view>

    <!-- Source: uni_modules/wot-ui/components/wd-toast/wd-toast.vue -->
    <wd-toast />
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
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

// 动态定制顶部区域的大背景渐变，亮暗色下将渐变色起终点进行对调，确保风格全站完美统一
const headerBgStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  const themeColor = activeThemeColor.value;
  return {
    background: isDark
      ? `linear-gradient(135deg, ${themeColor}22 0%, #0f172a 100%)`
      : `linear-gradient(135deg, #f4f8fc 0%, ${themeColor}0a 35%, ${themeColor}30 100%)`,
  };
});

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

// 声明挂载入场动画的 GSAP 补间实例引用以供卸载时清理
let entranceTween: gsap.core.Tween | null = null;

// 组件销毁时清理 GSAP 补间实例
onUnmounted(() => {
  stopPulse();
  if (entranceTween) {
    entranceTween.kill();
  }
});

// 抽屉的 translateY 距离，初始值设为 380px (对应在屏幕下半部)
const drawerY = ref(380);

// 引入 wot-ui 底层设备信息适配，实现多端（小程序、H5、App）高度精确对齐
const { statusBarHeight, navBarTotalHeight } = useDeviceInfo();

// 动态计算系统的导航栏高度，适配多端并解决小程序胶囊和 H5 平台下的计算差异
const navbarHeight = computed(() => {
  if (navBarTotalHeight.value && navBarTotalHeight.value > 0) {
    return navBarTotalHeight.value;
  }
  return (statusBarHeight.value || 0) + 44;
});

// 是否处于吸顶最大化状态
const isMaximized = ref(false);

// 动态根据抽屉高度计算圆角大小（冷冻圆角策略）
const borderRadiusStyle = computed(() => {
  const minY = navbarHeight.value;
  if (drawerY.value <= minY + 2) {
    return "0px 0px 0 0";
  }
  if (drawerY.value >= minY + 20) {
    return "24px 24px 0 0";
  }
  const r = Math.max(0, ((drawerY.value - (minY + 2)) / 18) * 24);
  return `${r}px ${r}px 0 0`;
});

// 动态计算 GPU 阴影图层透明度
const shadowOpacity = computed(() => {
  const minY = navbarHeight.value;
  if (drawerY.value <= minY) {
    return 0;
  }
  if (drawerY.value >= minY + 80) {
    return 1;
  }
  return (drawerY.value - minY) / 80;
});

// 内部列表是否允许滚动
const isScrollEnabled = ref(false);

// 内部列表当前的滚动高度
const innerScrollTop = ref(0);

// 监听内部列表滚动
const onInnerScroll = (e: any) => {
  innerScrollTop.value = e.detail.scrollTop;
};

// 判定当前运行模式是否为单机离线模式
const isOfflineMode = computed(() => APP_CONFIG.APP_MODE === "offline");

// 动态定制导航栏背景样式与边线，实现与抽屉和状态栏的无缝融合
const navbarStyle = computed(() => {
  const minDrawerY = navbarHeight.value;
  const isDark = actualTheme.value === "dark";

  if (drawerY.value < minDrawerY + 80) {
    const ratio = Math.max(0, Math.min(1, (drawerY.value - minDrawerY) / 80));
    const opacity = 1 - ratio;
    const shadowAlpha = isDark ? 0.25 * opacity : 0.05 * opacity;
    const shadow = `box-shadow: 0 4px 20px rgba(0, 0, 0, ${shadowAlpha.toFixed(3)}) !important;`;

    if (isDark) {
      return `background-color: rgba(18, 18, 18, ${opacity}) !important; border-bottom: none !important; ${shadow}`;
    } else {
      return `background-color: rgba(246, 248, 252, ${opacity}) !important; border-bottom: none !important; ${shadow}`;
    }
  }

  return "background-color: transparent !important; border-bottom: none !important; box-shadow: none !important;";
});

// 动态计算导航栏内容颜色，在亮色模式下始终为高对比深色
const navbarContentColor = computed(() => {
  const isDark = actualTheme.value === "dark";
  if (isDark) {
    return "#ffffff";
  }
  return "#1d1f29";
});

// 监听吸顶状态变化
watch(
  isMaximized,
  (maximized) => {
    // #ifdef MP-WEIXIN || APP-PLUS
    uni.setNavigationBarColor({
      frontColor: maximized ? "#000000" : "#ffffff",
      backgroundColor: "#000000",
      animation: {
        duration: 200,
        type: "linear",
      } as any,
    });
    // #endif
  },
  { immediate: true },
);

// 触控手势相关变量
let startTouchY = 0;
let startTouchX = 0;
let startDrawerY = 0;
let isDragging = false;

// 触控开始
const onTouchStart = (e: TouchEvent) => {
  gsap.killTweensOf(drawerY);
  startTouchY = e.touches[0].clientY;
  startTouchX = e.touches[0].clientX;
  startDrawerY = drawerY.value;
  isDragging = false;
};

// 当 scroll-view 滚动到最顶部时
const onScrollToUpper = () => {
  innerScrollTop.value = 0;
};

// 触控拖拽移动
const onTouchMove = (e: TouchEvent) => {
  const currentY = e.touches[0].clientY;
  const currentX = e.touches[0].clientX;
  const deltaY = currentY - startTouchY;
  const deltaX = currentX - startTouchX;

  if (!isDragging) {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }

    if (isMaximized.value) {
      if (innerScrollTop.value <= 8 && deltaY > 0) {
        isDragging = true;
        isMaximized.value = false;
        isScrollEnabled.value = false;
        startTouchY = currentY;
        startDrawerY = drawerY.value;
      }
    } else {
      isDragging = true;
    }
  }

  if (isDragging) {
    let nextY = startDrawerY + deltaY;
    const minDrawerY = navbarHeight.value;
    const maxDrawerY = 600;

    if (nextY < minDrawerY) {
      nextY = minDrawerY;
    } else if (nextY > maxDrawerY) {
      nextY = maxDrawerY + (nextY - maxDrawerY) * 0.3; // 阻尼回弹
    }
    drawerY.value = nextY;
  }
};

// 触控结束
const onTouchEnd = () => {
  if (!isDragging) return;
  isDragging = false;

  const minDrawerY = navbarHeight.value;
  const thresholdY = minDrawerY + 120;

  if (drawerY.value <= thresholdY) {
    // 自动吸附至顶部
    isMaximized.value = true;
    entranceTween = gsap.to(drawerY, {
      value: minDrawerY,
      duration: 0.4,
      ease: "power2.out",
      onComplete: () => {
        isScrollEnabled.value = true;
      },
    });
  } else if (drawerY.value > 520) {
    // 下拉关闭重置
    isMaximized.value = false;
    isScrollEnabled.value = false;
    entranceTween = gsap.to(drawerY, {
      value: 600,
      duration: 0.5,
      ease: "bounce.out",
    });
  } else {
    // 复位到半屏位置
    isMaximized.value = false;
    isScrollEnabled.value = false;
    entranceTween = gsap.to(drawerY, {
      value: 380,
      duration: 0.4,
      ease: "power2.out",
    });
  }
};

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
  entranceTween = gsap.fromTo(
    drawerY,
    { value: 800 },
    {
      value: 380,
      duration: 0.8,
      ease: "power3.out",
    },
  );
});
</script>

<style scoped lang="scss">
.page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #0f172a;
}

.header-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  z-index: 1;
  padding-bottom: 24rpx;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.15);
  box-sizing: border-box;
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

.drawer-scroll-view {
  width: 100%;
  flex: 1;
  height: 0;
  box-sizing: border-box;
  touch-action: pan-y;
}

.bluetooth-status-panel {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.status-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.glass-connect-btn) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 20px !important;
  padding: 4px 12px !important;
  transition: all 0.2s ease !important;
  &:active {
    background-color: rgba(255, 255, 255, 0.25) !important;
    transform: scale(0.95);
  }
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
  .bluetooth-status-panel {
    background: rgba(0, 0, 0, 0.03) !important;
    border: 1px solid rgba(0, 0, 0, 0.05) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03) !important;
    text {
      color: #1e293b !important;
    }
    view {
      color: #1e293b !important;
    }
  }
  .status-icon-wrapper {
    background-color: rgba(0, 0, 0, 0.04) !important;
    border: 1px solid rgba(0, 0, 0, 0.06) !important;
    .wd-icon {
      color: #475569 !important;
    }
  }
  :deep(.glass-connect-btn) {
    background-color: rgba(0, 0, 0, 0.04) !important;
    border: 1px solid rgba(0, 0, 0, 0.06) !important;
    text {
      color: #1e293b !important;
    }
  }
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

.drawer-shadow-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  pointer-events: none;
  z-index: 9;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  background-color: transparent;
  will-change: transform, opacity;
  box-sizing: border-box;
}

.page-bottom-content {
  background-color: #f6f8fc;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -300px;
  z-index: 10;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  will-change: transform;
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
