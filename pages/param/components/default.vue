<template>
  <view class="wot-w-full wot-bg-filled-bottom wot-box-border wot-px-4">
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.tab.params')" fixed safe-area-inset-top />

    <view class="tab-content-wrap page-body-animate" :style="{ 'padding-top': (navbarHeight + 16) + 'px' }">
      <!-- 蓝牙未连接时的空状态展示 -->
      <!-- Source: uni_modules/wot-ui/components/wd-empty/wd-empty.vue -->
      <view v-if="!isConnected" class="empty-wrap wot-flex wot-flex-col wot-items-center wot-justify-center">
        <wd-empty icon="empty" :tip="$t('bms.battery.noData')">
          <template #bottom>
            <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
            <wd-button size="small" plain @click="toConnect" custom-class="empty-btn">
              {{ $t("bms.ble.connect") }}
            </wd-button>
          </template>
        </wd-empty>
      </view>

      <!-- 已连接时的状态看板 -->
      <view v-else>
        <!-- 32项保护状态平铺大卡片 -->
        <view class="wot-bg-filled-oppo alarm-grid-card wot-p-3">
          <!-- 标题栏，包含右侧紧凑的运行总时间 -->
          <view
            class="wot-border-solid wot-border-divider-main wot-border-t-0 wot-border-l-0 wot-border-r-0 wot-pb-2.5 wot-mb-3.5 wot-flex wot-items-center wot-justify-between"
            :style="{ borderBottomWidth: '1.5px' }"
          >
            <view class="wot-flex wot-items-center">
              <view
                class="wot-rounded-full wot-mr-2"
                :style="{ width: '3px', height: '14px', backgroundColor: '#1c6eff' }"
              ></view>
              <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.protect.title") }}
              </text>
            </view>
            <!-- 运行时间并入标题栏右侧，节约一屏垂直空间 -->
            <view
              v-if="runTimeStr"
              class="wot-flex wot-items-center wot-text-text-auxiliary"
              :style="{ fontSize: '22rpx' }"
            >
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-time-line" size="12px" color="var(--wot-icon-auxiliary)" class="wot-mr-1" />
              <text>{{ runTimeStr }}</text>
            </view>
          </view>

          <!-- 2列网格，平铺展示所有的保护状态项 -->
          <view class="wot-grid wot-grid-cols-2 wot-gap-x-2 wot-gap-y-1.5">
            <view
              v-for="item in allAlarmList"
              :key="item.key"
              class="wot-flex wot-items-center wot-bg-filled-content wot-px-2 wot-py-1.5 wot-border wot-border-solid wot-transition-all"
              :class="
                isAlarmActive(item.key) ? 'wot-bg-danger-surface wot-border-danger-disabled' : 'wot-border-transparent'
              "
              :style="{ borderRadius: '14rpx' }"
            >
              <!-- 徽标指示灯 -->
              <view
                class="wot-relative wot-w-3 wot-h-3 wot-mr-2 wot-flex wot-items-center wot-justify-center wot-flex-shrink-0"
              >
                <view
                  v-if="isAlarmActive(item.key)"
                  class="status-dot-pulse-danger wot-absolute wot-w-full wot-h-full wot-rounded-full"
                  :style="{ backgroundColor: 'rgba(244, 67, 54, 0.40)' }"
                ></view>
                <view
                  class="wot-rounded-full wot-z-10"
                  :class="isAlarmActive(item.key) ? 'wot-bg-danger' : 'wot-bg-filled-strong'"
                  :style="{ width: '7px', height: '7px' }"
                ></view>
              </view>

              <!-- 状态名称 -->
              <text
                class="wot-truncate wot-flex-1"
                :class="isAlarmActive(item.key) ? 'wot-text-danger wot-font-bold' : 'wot-text-text-secondary'"
                :style="{ fontSize: '22rpx' }"
              >
                {{ $t(item.key) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useBleStore } from "@/stores/ble-store";
import { useDeviceInfo } from "@/uni_modules/wot-ui/composables/useDeviceInfo";

const bleStore = useBleStore();
const { isBleConnected: isConnected, extendedProtocolData } = storeToRefs(bleStore);
const { t } = useI18n();

// 引入 wot-ui 底层设备信息适配，以彻底破除微信小程序 v-show 保活机制下 placeholder 测量塌陷的 bug
const { statusBarHeight, navBarTotalHeight } = useDeviceInfo();

// 动态计算系统的导航栏高度以彻底保障安全区高度自适应
const navbarHeight = computed(() => {
  const minHeight = (statusBarHeight.value || 0) + 44;
  if (navBarTotalHeight.value && navBarTotalHeight.value >= minHeight) {
    return navBarTotalHeight.value;
  }
  return minHeight;
});

// 导航至蓝牙搜寻连接页
const toConnect = () => {
  uni.navigateTo({
    url: "/pages/ble-search/index",
  });
};

// 提取当前活动的系统警报事件
const activeAlarms = computed(() => {
  if (!isConnected.value) {
    return [];
  }
  return extendedProtocolData.value?.activeAlarms ?? [];
});

// 判定该报警项目前是否处于触发状态
const isAlarmActive = (key: string): boolean => {
  return activeAlarms.value.includes(key);
};

// 格式化系统持续运行时间
const runTimeStr = computed(() => {
  if (!isConnected.value) {
    return "";
  }
  const days = extendedProtocolData.value?.runTimeDays ?? 0;
  const hours = extendedProtocolData.value?.runTimeHours ?? 0;
  const minutes = extendedProtocolData.value?.runTimeMinutes ?? 0;
  if (days === 0 && hours === 0 && minutes === 0) {
    return "";
  }
  return `${days}${t("bms.common.day")} ${hours}${t("bms.common.hour")} ${minutes}${t("bms.common.minute")}`;
});

// 所有系统安全与保护状态项列表
const allAlarmList = [
  { key: "bms.protect.chargeOvercurrent" },
  { key: "bms.protect.chargeOvertemp" },
  { key: "bms.protect.chargeUndertemp" },
  { key: "bms.protect.cellOvercharge" },
  { key: "bms.protect.packOvercharge" },
  { key: "bms.protect.afeError" },
  { key: "bms.protect.chargeCutoff" },
  { key: "bms.protect.chargeFet" },
  { key: "bms.protect.chargeOvercurrentWarning" },
  { key: "bms.protect.chargeOvertempWarning" },
  { key: "bms.protect.chargeUndertempWarning" },
  { key: "bms.protect.cellOverchargeWarning" },
  { key: "bms.protect.packOverchargeWarning" },
  { key: "bms.protect.voltDiffWarning" },
  { key: "bms.protect.voltDiffTooLarge" },
  { key: "bms.protect.heatingState" },
  { key: "bms.protect.dischargeOvercurrent" },
  { key: "bms.protect.dischargeOvertemp" },
  { key: "bms.protect.dischargeUndertemp" },
  { key: "bms.protect.cellOverdischarge" },
  { key: "bms.protect.shortCircuit" },
  { key: "bms.protect.packOverdischarge" },
  { key: "bms.protect.dischargeCutoff" },
  { key: "bms.protect.dischargeFet" },
  { key: "bms.protect.dischargeOvercurrentWarning" },
  { key: "bms.protect.dischargeOvertempWarning" },
  { key: "bms.protect.dischargeUndertempWarning" },
  { key: "bms.protect.cellOverdischargeWarning" },
  { key: "bms.protect.packOverdischargeWarning" },
  { key: "bms.protect.mosOvertempWarning" },
  { key: "bms.protect.mosOvertemp" },
  { key: "bms.protect.preChargeFet" },
];
</script>

<style scoped>
/* 顶部安全区域与自定义导航栏高度自适应占位 */
.tab-content-wrap {
  padding-bottom: env(safe-area-inset-bottom);
}

.empty-wrap {
  min-height: 65vh;
  box-sizing: border-box;
}

:deep(.empty-btn) {
  margin-top: 24rpx;
  min-width: 180rpx;
  border-radius: 100rpx;
}

.alarm-grid-card {
  border-radius: 28rpx;
  box-shadow: 0 8px 20px rgba(163, 177, 198, 0.1);
}

/* 红色指示灯呼吸动画 */
.status-dot-pulse-danger {
  animation: pulse-red 2s infinite ease-in-out;
}

@keyframes pulse-red {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}
</style>
