<template>
  <view class="page-container wot-bg-neutral-100 wot-min-h-screen">
    <!-- 自定义顶部导航栏组件，fixed 属性用于固定在顶端，placeholder 用于在流中保留占位避免内容遮挡 -->
    <wd-navbar :title="$t('bms.title')" fixed safe-area-inset-top placeholder />

    <!-- 实例组件挂载，确保全局 Toast 和 Dialog 可以成功弹窗 -->
    <wd-toast />
    <wd-dialog />

    <view class="wot-p-main wot-pb-10">
      <!-- 头部区域：蓝牙连接状态栏 -->
      <view
        class="header-card wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-mb-4 wot-flex wot-items-center wot-justify-between"
      >
        <view class="wot-flex wot-items-center wot-gap-3">
          <!-- 蓝牙状态图标：使用 wd-icon 结合 UnoCSS 动态图标类名承载，并在连接状态下添加呼吸灯动画效果 -->
          <wd-icon
            :css-icon="isConnected ? 'i-ri-bluetooth-fill animate-pulse' : 'i-ri-bluetooth-line'"
            size="28px"
            :color="isConnected ? '#0052d9' : '#858585'"
          />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-title-large wot-text-text-main wot-font-bold">
              {{ isConnected ? connectedName : $t("bms.ble.disconnected") }}
            </text>
            <text class="wot-text-caption wot-text-text-secondary wot-mt-0.5">
              {{ isConnected ? $t("bms.ble.deviceMac") + connectedMac : $t("bms.ble.promptConnect") }}
            </text>
          </view>
        </view>

        <!-- 连接/断开蓝牙设备的控制按钮 -->
        <button
          @click="toggleConnection"
          :class="isConnected ? 'wot-border-border-main wot-text-text-main' : 'wot-bg-primary wot-text-text-white'"
          class="connect-btn wot-rounded-full wot-px-main wot-py-extra-tight wot-text-label-large wot-font-semibold wot-shadow-sm"
        >
          {{ isConnected ? $t("bms.ble.disconnect") : $t("bms.ble.connect") }}
        </button>
      </view>

      <!-- 核心状态区域：电池电量卡片 -->
      <view
        class="battery-card wot-bg-filled-oppo wot-rounded-2xl wot-p-super-loose wot-shadow-sm wot-mb-4 wot-flex wot-flex-col wot-items-center"
      >
        <!-- 电池状态图标：在断开连接、充电、普通放电状态下切换展示不同的 Lucide 图标 -->
        <view class="wot-relative wot-flex wot-items-center wot-justify-center wot-mb-3">
          <wd-icon
            :css-icon="
              !isConnected
                ? 'i-lucide-battery'
                : isCharging
                  ? 'i-lucide-battery-charging animate-pulse'
                  : 'i-lucide-battery-medium'
            "
            size="96px"
            :color="!isConnected ? '#858585' : isCharging ? '#2ba471' : '#0052d9'"
          />
        </view>

        <!-- 剩余电量百分比展示 -->
        <text class="wot-text-title-large wot-font-bold wot-text-text-main wot-text-5xl wot-my-2">
          {{ isConnected ? batteryPercent + "%" : "-- %" }}
        </text>

        <!-- 充电/放电的详细容量信息状态栏 -->
        <view class="wot-flex wot-items-center wot-gap-2 wot-mb-4">
          <text
            class="wot-text-body-main wot-font-medium"
            :class="isCharging ? 'wot-text-success-main' : 'wot-text-text-secondary'"
          >
            {{
              isConnected
                ? isCharging
                  ? $t("bms.battery.charging")
                  : $t("bms.battery.discharging")
                : $t("bms.battery.noData")
            }}
          </text>
          <text class="wot-text-caption wot-text-text-secondary">|</text>
          <text class="wot-text-caption wot-text-text-secondary">
            {{ $t("bms.battery.remainingCapacity") }}:
            {{ isConnected ? (batteryPercent * 1.0).toFixed(1) + " Ah / 100.0" + " Ah" : "-- Ah" }}
          </text>
        </view>
      </view>

      <!-- 核心参数展示网格 -->
      <view class="wot-grid wot-grid-cols-2 wot-gap-3 wot-mb-4">
        <!-- 总电压展示项 -->
        <view
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <wd-icon css-icon="i-lucide-zap" size="28px" color="#e37318" />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.totalVoltage") }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5">
              {{ isConnected ? totalVoltage + " V" : "-- V" }}
            </text>
          </view>
        </view>

        <!-- 实时电流展示项 -->
        <view
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <wd-icon
            css-icon="i-lucide-activity"
            size="28px"
            :color="isConnected ? (isCharging ? '#2ba471' : '#d54941') : '#858585'"
          />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.realtimeCurrent") }}</text>
            <text
              class="wot-text-body-main wot-font-bold wot-mt-0.5"
              :class="
                isConnected ? (isCharging ? 'wot-text-success-main' : 'wot-text-danger-main') : 'wot-text-text-main'
              "
            >
              {{ isConnected ? (realtimeCurrent >= 0 ? "+" : "") + realtimeCurrent + " A" : "-- A" }}
            </text>
          </view>
        </view>

        <!-- 电池最高温度展示项 -->
        <view
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <wd-icon css-icon="i-lucide-thermometer" size="28px" :color="isConnected ? '#d54941' : '#858585'" />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.maxTemp") }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5">
              {{ isConnected ? temperature + " °C" : "-- °C" }}
            </text>
          </view>
        </view>

        <!-- 健康度 SOH 展示项 -->
        <view
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <wd-icon css-icon="i-lucide-heart" size="28px" :color="isConnected ? '#2ba471' : '#858585'" />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.soh") }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5">
              {{ isConnected ? "98.5 %" : "-- %" }}
            </text>
          </view>
        </view>
      </view>

      <!-- BMS 安全保护状态列表 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-mb-4">
        <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
          <wd-icon css-icon="i-lucide-shield-check" size="24px" :color="isConnected ? '#2ba471' : '#858585'" />
          <text class="wot-text-body-main wot-font-bold wot-text-text-main">{{ $t("bms.protect.title") }}</text>
        </view>

        <view class="wot-flex wot-flex-col wot-gap-2">
          <!-- 单体过温保护状态 -->
          <view class="wot-flex wot-items-center wot-justify-between">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.protect.overTemp") }}</text>
            <view class="wot-flex wot-items-center wot-gap-1">
              <view
                :class="
                  isConnected
                    ? 'wot-bg-success-surface wot-text-success-main'
                    : 'wot-bg-neutral-200 wot-text-text-secondary'
                "
                class="wot-rounded-full wot-px-tight wot-py-extra-tight wot-text-caption wot-font-semibold"
              >
                {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
              </view>
            </view>
          </view>

          <!-- 单体过压保护状态 -->
          <view class="wot-flex wot-items-center wot-justify-between">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.protect.overVolt") }}</text>
            <view class="wot-flex wot-items-center wot-gap-1">
              <view
                :class="
                  isConnected
                    ? 'wot-bg-success-surface wot-text-success-main'
                    : 'wot-bg-neutral-200 wot-text-text-secondary'
                "
                class="wot-rounded-full wot-px-tight wot-py-extra-tight wot-text-caption wot-font-semibold"
              >
                {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
              </view>
            </view>
          </view>

          <!-- 放电短路保护状态 -->
          <view class="wot-flex wot-items-center wot-justify-between">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.protect.shortCircuit") }}</text>
            <view class="wot-flex wot-items-center wot-gap-1">
              <view
                :class="
                  isConnected
                    ? 'wot-bg-success-surface wot-text-success-main'
                    : 'wot-bg-neutral-200 wot-text-text-secondary'
                "
                class="wot-rounded-full wot-px-tight wot-py-extra-tight wot-text-caption wot-font-semibold"
              >
                {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- MOS 管控制开关面板 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm">
        <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
          <wd-icon css-icon="i-lucide-settings" size="24px" color="#858585" />
          <text class="wot-text-body-main wot-font-bold wot-text-text-main">{{ $t("bms.control.title") }}</text>
        </view>

        <view class="wot-flex wot-flex-col wot-gap-3">
          <!-- 充电 MOS 开关 -->
          <view class="wot-flex wot-items-center wot-justify-between">
            <view class="wot-flex wot-flex-col">
              <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                {{ $t("bms.control.chargeMos") }}
              </text>
              <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.chargeMosDesc") }}</text>
            </view>
            <switch :checked="isCharging" :disabled="!isConnected" @change="toggleCharge" color="#0052d9" />
          </view>

          <!-- 放电 MOS 开关 -->
          <view class="wot-flex wot-items-center wot-justify-between">
            <view class="wot-flex wot-flex-col">
              <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                {{ $t("bms.control.dischargeMos") }}
              </text>
              <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.dischargeMosDesc") }}</text>
            </view>
            <switch :checked="isDischarging" :disabled="!isConnected" @change="toggleDischarge" color="#0052d9" />
          </view>
        </view>
      </view>
    </view>

    <!-- 自定义底部 Tabbar 组件 -->
    <custom-tabbar active="realtime" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";

// 初始化 wot-ui 交互 Hooks 与国际化翻译实例
const toast = useToast();
const dialog = useDialog();
const { t } = useI18n();

// 获取全局蓝牙 Store 管理器
const bleStore = useBleStore();

// 联动全局蓝牙连接状态和已连接设备名称及真实 MAC
const isConnected = computed(() => bleStore.isBleConnected);
const connectedName = computed(() => bleStore.connectedDeviceName);
const connectedMac = computed(() => bleStore.connectedDeviceMac);

// 电池物理状态，直接联动全局蓝牙 Store 的响应式字段
const isCharging = computed(() => bleStore.isCharging);
const isDischarging = computed(() => bleStore.isDischarging);
const batteryPercent = computed(() => bleStore.batteryPercent);
const totalVoltage = computed(() => bleStore.totalVoltage);
const realtimeCurrent = computed(() => bleStore.realtimeCurrent);
const temperature = computed(() => bleStore.temperature);

// 处理连接/断开蓝牙按钮点击事件
const toggleConnection = () => {
  if (!isConnected.value) {
    // 若蓝牙处于未连接状态，则跳转至蓝牙设备搜索列表页面
    uni.navigateTo({
      url: "/pages/ble-search/index",
    });
  } else {
    // 若蓝牙已成功建立连接，点击则弹出二次确认框引导用户断开连接
    dialog
      .confirm({
        title: t("bms.common.prompt"),
        msg: t("bms.ble.disconnectConfirm", { name: connectedName.value }),
      })
      .then(async () => {
        try {
          await bleStore.disconnectDevice();
          toast.success(t("bms.ble.disconnected"));
        } catch (e) {
          console.error("断开蓝牙连接出现异常:", e);
        }
      })
      .catch(() => {
        // 用户取消或关闭弹窗
      });
  }
};

// 切换充电 MOS 开关状态
const toggleCharge = (e: any) => {
  isCharging.value = e.detail.value;
};

// 切换放电 MOS 开关状态
const toggleDischarge = (e: any) => {
  isDischarging.value = e.detail.value;
};
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}

.connect-btn {
  font-size: 26rpx;
  margin: 0;
  line-height: 2.2;
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
}

.connect-btn:active {
  opacity: 0.8;
}

/* 呼吸灯效果动画 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
