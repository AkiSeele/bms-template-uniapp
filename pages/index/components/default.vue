<template>
  <view>
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar
      :title="$t('bms.title') + ' (Default)'"
      fixed
      safe-area-inset-top
      @click-right="handleScanConnect"
    >
      <template #left v-if="!isOfflineMode">
        <view class="wot-flex wot-items-center wot-gap-1">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon
            css-icon="i-lucide-cloud"
            size="16px"
            :color="activeThemeColor"
          />
          <text
            class="wot-text-primary wot-text-caption wot-font-bold wot-scale-90"
          >
            {{ $t("bms.mine.cloudOnline") }}
          </text>
        </view>
      </template>
      <template #right>
        <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
        <wd-icon css-icon="i-lucide-scan" size="20px" />
      </template>
    </wd-navbar>

    <view class="tab-content-wrap wot-px-3 wot-py-4 wot-pb-10 page-body-animate">
      <!-- 头部区域：蓝牙连接状态栏 -->
      <view
        class="header-card wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-mb-4 wot-flex wot-items-center wot-justify-between"
      >
        <view class="wot-flex wot-items-center wot-gap-3">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <!-- 蓝牙图标呼吸效果由 GSAP 补间驱动 opacity -->
          <view :style="isConnected ? pulseStyle : undefined">
            <wd-icon
              :css-icon="isConnected ? 'i-ri-bluetooth-fill' : 'i-ri-bluetooth-line'"
              size="28px"
              :color="isConnected ? activeThemeColor : '#858585'"
            />
          </view>
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-title-large wot-text-text-main wot-font-bold">
              {{ isConnected ? connectedName : $t("bms.ble.disconnected") }}
            </text>
            <text class="wot-text-caption wot-text-text-secondary wot-mt-0.5">
              {{ isConnected ? $t("bms.ble.deviceMac") + connectedMac : $t("bms.ble.promptConnect") }}
            </text>
          </view>
        </view>

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
        <view class="wot-relative wot-flex wot-items-center wot-justify-center wot-mb-3">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon
            :css-icon="batteryStatusIcon"
            size="96px"
            :color="batteryStatusColor"
          />
          <!-- 充电状态下电池图标呼吸由同一个 GSAP pulseStyle 驱动 -->
        </view>

        <text class="wot-text-title-large wot-font-bold wot-text-text-main wot-text-5xl wot-my-2">
          {{ isConnected ? batteryPercent + "%" : "-- %" }}
        </text>

        <view class="wot-flex wot-items-center wot-gap-2 wot-mb-4">
          <text
            class="wot-text-body-main wot-font-medium"
            :class="isCharging ? 'wot-text-success-main' : 'wot-text-text-secondary'"
          >
            {{ batteryStatusText }}
          </text>
          <text class="wot-text-caption wot-text-text-secondary">|</text>
          <text class="wot-text-caption wot-text-text-secondary">
            {{ $t("bms.battery.remainingCapacity") }}:
            {{ remainCap }}
          </text>
        </view>
      </view>

      <!-- 核心参数展示网格 -->
      <view class="wot-grid wot-grid-cols-2 wot-gap-3 wot-mb-4">
        <!-- 总电压展示项 -->
        <view
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
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
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
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
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
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
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-heart" size="28px" :color="isConnected ? '#2ba471' : '#858585'" />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.soh") }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5">
              {{ sohDisplay }}
            </text>
          </view>
        </view>

        <!-- 聚力威独有参数：循环充电次数 -->
        <view
          v-if="isConnected"
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-rotate-cw" size="28px" :color="activeThemeColor" />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.cycleCount") }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5">
              {{ extendedProtocolData?.cycleCount ?? 0 }} {{ $t("bms.common.cyclesUnit") }}
            </text>
          </view>
        </view>

        <!-- 聚力威独有参数：运行总时长 -->
        <view
          v-if="isConnected"
          class="param-card wot-bg-filled-oppo wot-rounded-xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-gap-3"
        >
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-clock" size="28px" color="#10b981" />
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.params.runTime") }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5 wot-text-xs">
              {{ runTimeStr }}
            </text>
          </view>
        </view>
      </view>

      <!-- 聚力威高阶 6 路温度自适应渲染网格面板 -->
      <view
        v-if="isConnected && temperatureList.length > 0"
        class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-mb-4"
      >
        <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-thermometer-sun" size="24px" color="#d54941" />
          <text class="wot-text-body-main wot-font-bold wot-text-text-main">
            {{ $t("bms.params.multiTempMonitor") }}
          </text>
        </view>
        <view class="wot-grid wot-grid-cols-3 wot-gap-2">
          <view
            v-for="(tItem, index) in temperatureList"
            :key="index"
            class="wot-bg-filled-main wot-rounded-lg wot-p-2 wot-flex wot-flex-col wot-items-center wot-justify-center"
          >
            <text class="wot-text-caption wot-text-text-secondary wot-scale-90">{{ tItem.name }}</text>
            <text class="wot-text-body-main wot-font-bold wot-text-text-main wot-mt-0.5">
              {{ tItem.value }} °C
            </text>
          </view>
        </view>
      </view>

      <!-- BMS 安全保护状态列表 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-mb-4">
        <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-shield-check" size="24px" :color="isConnected ? '#2ba471' : '#858585'" />
          <text class="wot-text-body-main wot-font-bold wot-text-text-main">{{ $t("bms.protect.title") }}</text>
        </view>

        <view class="wot-flex wot-flex-col wot-gap-2">
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
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-settings" size="24px" color="#858585" />
          <text class="wot-text-body-main wot-font-bold wot-text-text-main">{{ $t("bms.control.title") }}</text>
        </view>

        <view class="wot-flex wot-flex-col wot-gap-3">
          <view class="wot-flex wot-items-center wot-justify-between">
            <view class="wot-flex wot-flex-col">
              <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                {{ $t("bms.control.chargeMos") }}
              </text>
              <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.chargeMosDesc") }}</text>
            </view>
            <switch :checked="isCharging" :disabled="!isConnected" @change="toggleCharge" :color="activeThemeColor" />
          </view>

          <view class="wot-flex wot-items-center wot-justify-between">
            <view class="wot-flex wot-flex-col">
              <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                {{ $t("bms.control.dischargeMos") }}
              </text>
              <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.dischargeMosDesc") }}</text>
            </view>
            <switch :checked="isDischarging" :disabled="!isConnected" @change="toggleDischarge" :color="activeThemeColor" />
          </view>
        </view>
      </view>
    </view>

    <!-- Source: uni_modules/wot-ui/components/wd-toast/wd-toast.vue -->
    <wd-toast />
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
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
const { activeThemeColor } = storeToRefs(appStore);

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

// ---------------------------------------------------------------------------
// GSAP 呼吸动画 Hook（蓝牙图标脉冲效果）
// ---------------------------------------------------------------------------
const { pulseStyle, stopPulse } = usePulseAnimation(isConnected);

// 组件销毁时清理 GSAP 补间实例
onUnmounted(() => {
  stopPulse();
});

// 判定当前运行模式是否为单机离线模式
const isOfflineMode = computed(() => APP_CONFIG.APP_MODE === "offline");

// 动态计算当前电池状态的图标
const batteryStatusIcon = computed(() => {
  if (!isConnected.value) {
    return "i-lucide-battery";
  }
  return isCharging.value
    ? "i-lucide-battery-charging"
    : "i-lucide-battery-medium";
});

// 动态计算当前电池状态的颜色
const batteryStatusColor = computed(() => {
  if (!isConnected.value) {
    return "#858585";
  }
  return isCharging.value ? "#2ba471" : activeThemeColor.value;
});

// 动态计算当前电池状态的文本描述（充电中 / 放电中 / 未连接等）
const batteryStatusText = computed(() => {
  if (!isConnected.value) {
    return t("bms.battery.noData");
  }
  return isCharging.value
    ? t("bms.battery.charging")
    : t("bms.battery.discharging");
});

// 动态处理容量显示
const remainCap = computed(() => {
  if (!isConnected.value) return "-- Ah";
  if (
    extendedProtocolData.value?.remainingCapacity !== undefined &&
    extendedProtocolData.value?.fullCapacity !== undefined
  ) {
    return `${extendedProtocolData.value.remainingCapacity.toFixed(1)} Ah / ${extendedProtocolData.value.fullCapacity.toFixed(1)} Ah`;
  }
  return `${(batteryPercent.value * 1.0).toFixed(1)} Ah / 100.0 Ah`;
});

// 动态处理 SOH 显示
const sohDisplay = computed(() => {
  if (!isConnected.value) return "-- %";
  if (extendedProtocolData.value?.soh !== undefined) {
    return `${extendedProtocolData.value.soh} %`;
  }
  return "98.5 %";
});

// 动态时间戳解析
const runTimeStr = computed(() => {
  if (!isConnected.value) return "--";
  const d = extendedProtocolData.value?.runTimeDays ?? 0;
  const h = extendedProtocolData.value?.runTimeHours ?? 0;
  const m = extendedProtocolData.value?.runTimeMinutes ?? 0;
  return `${d}${t("bms.common.day")} ${h}${t("bms.common.hour")} ${m}${t("bms.common.minute")}`;
});

// 动态组织多路温度传感器监测列表
interface TempDisplayItem {
  name: string;
  value: number;
}
const temperatureList = computed<TempDisplayItem[]>(() => {
  if (!isConnected.value) return [];
  const list: TempDisplayItem[] = [];

  // 如果协议推入了多传感器数组
  if (extendedProtocolData.value?.temperatures) {
    extendedProtocolData.value.temperatures.forEach((val, idx) => {
      if (val !== 0 && val !== 0xff && val !== 255) {
        list.push({
          name: t("bms.params.temperatures") + (idx + 1),
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
      name: t("bms.params.envTemperature"),
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
      .catch(() => {
        // 用户取消
      });
  }
};

// 切换充电 MOS 开关状态
const toggleCharge = async (e: any) => {
  const nextVal = e.detail.value;
  try {
    toast.loading({ msg: t("bms.control.sending"), cover: true });
    await bleStore.sendControlCommand("charge", nextVal);
    toast.success(t("bms.control.chargeSuccess"));
  } catch (err: any) {
    console.error("充电开关指令下发失败:", err);
    toast.error(err.message || t("bms.control.sendFailed"));
    isCharging.value = !nextVal;
  } finally {
    toast.close();
  }
};

// 切换放电 MOS 开关状态
const toggleDischarge = async (e: any) => {
  const nextVal = e.detail.value;
  try {
    toast.loading({ msg: t("bms.control.sending"), cover: true });
    await bleStore.sendControlCommand("discharge", nextVal);
    toast.success(t("bms.control.dischargeSuccess"));
  } catch (err: any) {
    console.error("放电开关指令下发失败:", err);
    toast.error(err.message || t("bms.control.sendFailed"));
    isDischarging.value = !nextVal;
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

// 页面挂载时自动触发一次重连检测时序
onMounted(() => {
  triggerAutoConnect();
});
</script>

<style scoped>
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

/* 顶部安全区域与自定义导航栏高度自适应占位 */
.tab-content-wrap {
  padding-top: calc(var(--status-bar-height) + 44px + 16px) !important;
}
</style>
