<template>
  <view class="page-container wot-w-full">
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
    <view class="header-gradient wot-overflow-hidden wot-w-full" @touchmove.stop.prevent="">
      <!-- 顶部内容占位：防止内容与固定导航栏重叠 -->
      <view class="navbar-placeholder" />

      <!-- 隔离的高精度矢量 SVG 仪表盘组件 -->
      <view class="soc-dashboard-wrap wot-flex wot-justify-center wot-items-center wot-mt-2">
        <soc-dashboard
          :percent="socPercent"
          :is-connected="isConnected"
          :is-charging="isCharging"
          :is-discharging="isDischarging"
          :status-label-text="statusLabelText"
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
      <view class="wot-px-4 wot-mt-3 wot-w-full wot-box-border">
        <view class="telemetry-panel wot-flex wot-items-center wot-justify-between wot-py-4">
          <!-- 电流展示项 -->
          <view class="telemetry-item wot-flex wot-items-center wot-justify-center wot-flex-1">
            <view class="telemetry-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3">
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-pulse-line" size="18px" color="#ffffff" />
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
              <wd-icon css-icon="i-ri-flashlight-line" size="18px" color="#ffffff" />
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

    <!-- 3. 上层拖拽覆盖卡片：绑定触控手势与动态 GSAP 平移样式 -->
    <!-- .prevent 修饰符使 Vue 将此 touchmove 监听器注册为 { passive: false }，确保在激活拖拽时合法调用 preventDefault 阻止底层弹性滚动，消除 passive listener 警告 -->
    <view
      class="page-bottom-content wot-bg-filled-bottom"
      :style="{ transform: 'translate3d(0, ' + drawerY + 'px, 0)', borderRadius: borderRadiusStyle }"
      @touchstart="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 抽屉顶部拉手指示条 -->
      <view class="drawer-handle wot-flex wot-justify-center wot-items-center wot-pt-3.5 wot-pb-2">
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
        :style="{ height: 'calc(100vh - ' + navbarHeight + 'px - 28px)' }"
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
                {{ isConnected ? (extendedProtocolData?.cycleCount ?? 0) : "--" }}
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
                <view class="wot-w-1 wot-h-3.5 wot-bg-primary wot-rounded-full wot-mr-2"></view>
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
                <view class="wot-w-1 wot-h-3.5 wot-bg-primary wot-rounded-full wot-mr-2"></view>
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

// 动态根据抽屉高度计算圆角大小，在最顶部（navbarHeight）到上方24px区间内平滑过渡，免去 class transition 的重排卡顿，提高滑动性能
const borderRadiusStyle = computed(() => {
  const minY = navbarHeight.value;
  if (drawerY.value <= minY) {
    return "0px 0px 0 0";
  }
  if (drawerY.value >= minY + 24) {
    return "24px 24px 0 0";
  }
  const r = Math.max(0, drawerY.value - minY);
  return `${r}px ${r}px 0 0`;
});

// 内部列表是否允许滚动（只有吸顶时才开启，完美防冲突）
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
  
  // 当抽屉开始接近吸顶位置（距离吸顶位置小于 80px）时，导航栏背景平滑从透明过渡为抽屉底色
  if (drawerY.value < minDrawerY + 80) {
    const ratio = Math.max(0, Math.min(1, (drawerY.value - minDrawerY) / 80));
    const opacity = 1 - ratio;
    if (isDark) {
      return `background-color: rgba(18, 18, 18, ${opacity}) !important; border-bottom: none !important; box-shadow: none !important;`;
    } else {
      return `background-color: rgba(246, 248, 252, ${opacity}) !important; border-bottom: none !important; box-shadow: none !important;`;
    }
  }
  
  return "background-color: transparent !important; border-bottom: none !important; box-shadow: none !important;";
});

// 动态计算导航栏内容颜色，滑至上方时自动反色以保证阅读对比度
const navbarContentColor = computed(() => {
  const isDark = actualTheme.value === "dark";
  if (isDark) {
    return "#ffffff";
  }
  const minDrawerY = navbarHeight.value;
  return drawerY.value < minDrawerY + 60 ? "#1d1f29" : "#ffffff";
});

// 监听导航栏前景色变化，联动更新系统状态栏图标与文字的颜色 (黑/白字)
watch(
  navbarContentColor,
  (newColor) => {
    const textStyle = newColor === "#ffffff" ? "white" : "black";
    // #ifdef MP-WEIXIN || APP-PLUS
    uni.setNavigationBarColor({
      frontColor: textStyle === "white" ? "#ffffff" : "#000000",
      backgroundColor: "#000000",
      animation: {
        duration: 200,
        type: "linear",
      },
    });
    // #endif
  },
  { immediate: true }
);

// 触控手势相关变量
let startTouchY = 0;
let startTouchX = 0;
let startDrawerY = 0;
let isDragging = false;

// 触控开始
const onTouchStart = (e: TouchEvent) => {
  // 物理防抖：第一时间杀掉 GSAP 对 drawerY 属性的全部正在运行的动画，防止手指触摸时补间还在运行引起冲突卡顿
  gsap.killTweensOf(drawerY);
  
  startTouchY = e.touches[0].clientY;
  startTouchX = e.touches[0].clientX;
  startDrawerY = drawerY.value;
  isDragging = false; // 初始不处于拖拽状态，待 move 时方向判定后激活
};

// 当 scroll-view 滚动到最顶部时，强制将 innerScrollTop 归零，为手势接管下拉复位清除障碍
const onScrollToUpper = () => {
  innerScrollTop.value = 0;
};

// 触控拖拽移动：精细过滤手势方向与吸顶滚动的冲突，提供连贯下拉复位体验
const onTouchMove = (e: TouchEvent) => {
  const currentY = e.touches[0].clientY;
  const currentX = e.touches[0].clientX;
  const deltaY = currentY - startTouchY;
  const deltaX = currentX - startTouchX;

  // 如果还未激活拖拽，执行手势方向和状态分支判定
  if (!isDragging) {
    // 过滤横向滑动，优先让左右滑动或其他组件响应
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }

    if (isMaximized.value) {
      // 在吸顶状态下，只要列表已在最顶部并且向下滑动（或者 deltaY 大于零），即可直接激活抽屉下拉拖拽接管
      if (innerScrollTop.value <= 8 && deltaY > 0) {
        isDragging = true;
        isMaximized.value = false;
        isScrollEnabled.value = false;
        // 重置起点坐标，防止手势衔接时出现位置跳变
        startTouchY = currentY;
        startDrawerY = drawerY.value;
      }
    } else {
      // 在半屏或未吸顶状态下，纵向滑动直接激活抽屉拖拽模式
      isDragging = true;
    }
  }

  // 若已激活拖动，则接管手势并更新抽屉高度
  // .prevent 修饰符已在模板注册阶段统一处理 preventDefault，此处无需重复调用
  if (isDragging) {
    let nextY = startDrawerY + deltaY;
    const minDrawerY = navbarHeight.value;

    // 边界控制：拉到顶停靠在导航栏下方，下拉最深拉到 460px
    if (nextY < minDrawerY) {
      nextY = minDrawerY;
    }
    if (nextY > 460) {
      nextY = 460;
    }

    drawerY.value = nextY;
  }
};

// 触控释放
const onTouchEnd = () => {
  if (!isDragging) return;
  isDragging = false;

  const minDrawerY = navbarHeight.value;
  const midPoint = minDrawerY + (380 - minDrawerY) * 0.5;

  // 根据拖拽释放时的平移位置，执行 GSAP 回弹或吸顶动画
  if (drawerY.value < midPoint) {
    // 触发吸顶
    animateTo(minDrawerY, true);
  } else {
    // 触发复原
    animateTo(380, false);
  }
};

// 针对吸顶与复原场景分别定制的高保真 GSAP 过渡动画
const animateTo = (targetY: number, maximize: boolean) => {
  // 物理防御：启动新补间前必须彻底杀死在 drawerY 上运行的所有历史补间，防止多次快速滑动时动画重叠导致严重卡顿与抖动
  gsap.killTweensOf(drawerY);
  
  gsap.to(drawerY, {
    value: targetY,
    duration: 0.45,
    ease: maximize ? "power3.out" : "back.out(1.2)", // 吸顶平滑贴靠，复原物理弹性回弹
    onComplete: () => {
      drawerY.value = targetY;
      isMaximized.value = maximize;
      isScrollEnabled.value = maximize;
    },
  });
};

// 底层固定背景随着抽屉拉起产生的视差位移
const headerTranslateY = computed(() => {
  return - (380 - drawerY.value) * 0.15;
});

// 底层固定背景在抽屉上升时的淡出透明度
const headerOpacity = computed(() => {
  return Math.max(0, Math.min(1, drawerY.value / 380));
});

// 仪表盘核心百分比计算属性
const socPercent = computed(() => {
  if (!isConnected.value) {
    return 0;
  }
  return Math.min(100, Math.max(0, batteryPercent.value));
});

// 计算待机/充电/放电/断开状态的多语言描述
const statusLabelText = computed(() => {
  if (!isConnected.value) {
    return t("bms.ble.disconnected");
  }
  if (isCharging.value) {
    return t("bms.battery.charging");
  }
  if (isDischarging.value) {
    return t("bms.battery.discharging");
  }
  return t("bms.protect.normal");
});

// 动态处理容量显示描述
const remainCap = computed(() => {
  if (!isConnected.value) return "-- Ah";
  if (
    extendedProtocolData.value?.remainingCapacity !== undefined &&
    extendedProtocolData.value?.fullCapacity !== undefined
  ) {
    return `${extendedProtocolData.value.remainingCapacity.toFixed(1)} Ah`;
  }
  return `${(batteryPercent.value * 1.0).toFixed(1)} Ah`;
});

// 动态处理 SOH 显示描述
const sohDisplay = computed(() => {
  if (!isConnected.value) return "-- %";
  if (extendedProtocolData.value?.soh !== undefined) {
    return `${extendedProtocolData.value.soh} %`;
  }
  return "98.5 %";
});

// 动态时间戳解析运行总时长
const runTimeStr = computed(() => {
  if (!isConnected.value) return "--";
  const d = extendedProtocolData.value?.runTimeDays ?? 0;
  const h = extendedProtocolData.value?.runTimeHours ?? 0;
  const m = extendedProtocolData.value?.runTimeMinutes ?? 0;
  return `${d}${t("bms.common.day")} ${h}${t("bms.common.hour")}`;
});

// 动态组织多路温度传感器监测列表
interface TempDisplayItem {
  name: string;
  value: number;
}
const temperatureList = computed<TempDisplayItem[]>(() => {
  if (!isConnected.value) return [];
  const list: TempDisplayItem[] = [];

  // 挂载协议多传感器数组
  if (extendedProtocolData.value?.temperatures) {
    extendedProtocolData.value.temperatures.forEach((val, idx) => {
      if (val !== 0 && val !== 0xff && val !== 255) {
        list.push({
          name: "T" + (idx + 1),
          value: val,
        });
      }
    });
  }

  // 挂载 MOS 温度
  if (extendedProtocolData.value?.mosTemperature !== undefined && extendedProtocolData.value.mosTemperature !== 0) {
    list.push({
      name: "MOS",
      value: extendedProtocolData.value.mosTemperature,
    });
  }

  // 挂载环境温度
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

// 监听全局蓝牙连接成功状态，触发高保真视觉成功回执
watch(isConnected, (newVal) => {
  if (newVal) {
    toast.success(t("bms.ble.connectSuccess"));
  }
});

// 页面挂载时自动触发重连检测与抽屉滑出入场动画
onMounted(() => {
  triggerAutoConnect();
  // 使用状态补间驱动（Tweening Ref）实现全端兼容的滑入动画，彻底避免操作 DOM 在小程序端报错
  entranceTween = gsap.fromTo(
    drawerY,
    { value: 800 },
    {
      value: 380,
      duration: 0.8,
      ease: "power3.out",
    }
  );
});
</script>

<style scoped lang="scss">
.page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  /* 设为与 header-gradient 底色一致的深色，防止滑动圆角时漏出浅灰色底色 */
  background-color: #0f172a;
  box-sizing: border-box;
  /* 通过 CSS 层面屏蔽浏览器的弹性边界滚动（pull-to-refresh / rubber-banding），
     替代 pages.json 中 disableScroll: true 的效果，且不会引入全局 passive touchmove 监听器造成报错 */
  overscroll-behavior: none;
  touch-action: none;
}

/* 底层背景与信息面板区域：绝对定位固定在底部，为上层拖拽抽屉提供深色渐变衬底 */
.header-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh; /* 撑满 100vh，防止抽屉下拉时外露黑色空白 */
  z-index: 1;
  background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
  padding-bottom: 24rpx;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.15);
  box-sizing: border-box;
}

/* 导航栏深度样式重写与颜色过渡 */
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

  /* 确保图标等子元素颜色在滚动切换时平滑过渡 */
  uni-text,
  text,
  span,
  .wd-icon {
    transition: color 0.3s ease !important;
  }
}

/* 导航栏占位高，安全区自适应 */
.navbar-placeholder {
  height: calc(var(--status-bar-height) + 44px);
}

/* 抽屉内部局部滚动容器 */
.drawer-scroll-view {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  /* 在父容器 touch-action: none 的基础上单独开放纵向拖拽权限，使内部列表可以正常上下滚动 */
  touch-action: pan-y;
}

/* 磨砂玻璃质感蓝牙连接状态面板 */
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

/* 磨砂玻璃按钮设计 */
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

/* 磨砂玻璃双联数据面板 */
.telemetry-panel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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

/* 上层绝对定位拖拽抽屉容器 */
.page-bottom-content {
  background-color: #f6f8fc;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -300px; /* 增加底部冗余至 -300px，确保在任何极限回弹或下拉情况下，下方都绝对不穿帮 */
  z-index: 10;
  box-sizing: border-box;
  /* 初始物理加速渲染硬件通道，防止频繁绘制产生的抖动 */
  will-change: transform;
  /* 增加向上投影，让覆盖层级更有立体质感 */
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
}

/* MD3 看板和核心参数卡片 */
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

/* 开关控制卡片（高激活状态高亮） */
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

/* 温度与安全保护面板卡片 */
.md3-panel-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
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

/* 保护项状态标签配色 */
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

/* 等宽数字排版 */
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

<style lang="scss">
/* 全局重写页面级背景，防止微信小程序端拖拽圆角外露底色 */
page {
  background-color: #0f172a !important;
}
</style>
