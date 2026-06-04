<template>
  <view>
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.tab.control') + ' (Default)'" fixed safe-area-inset-top />

    <view class="tab-content-wrap wot-px-3 wot-py-4 wot-pb-10 page-body-animate">
      <view class="wot-flex wot-flex-col wot-gap-4">
        <!-- 头部设备概览小卡片 -->
        <view
          class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-justify-between"
        >
          <view class="wot-flex wot-items-center wot-gap-3">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-cpu" size="32px" :color="activeThemeColor" />
            <view class="wot-flex wot-flex-col">
              <text class="wot-text-body-main wot-font-bold wot-text-text-main">{{ connectedName }}</text>
              <text class="wot-text-caption wot-text-text-secondary wot-mt-0.5">
                {{ protocolName }} ({{ protocolType.toUpperCase() }})
              </text>
            </view>
          </view>
          <view
            class="wot-bg-success-surface wot-text-success-main wot-rounded-full wot-px-tight wot-py-extra-tight wot-text-caption wot-font-semibold wot-flex wot-items-center wot-gap-1"
          >
            <view class="wot-w-2 wot-h-2 wot-bg-success-main wot-rounded-full animate-ping" />
            {{ $t("bms.protect.normal") }}
          </view>
        </view>

        <!-- 通用 MOS 控制卡片 -->
        <view class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm">
          <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-toggle-left" size="24px" color="#858585" />
            <text class="wot-text-body-main wot-font-bold wot-text-text-main">
              {{ $t("bms.control.title") }}
            </text>
          </view>

          <view class="wot-flex wot-flex-col wot-gap-4">
            <!-- 充电 MOS -->
            <view class="wot-flex wot-items-center wot-justify-between">
              <view class="wot-flex wot-flex-col">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.chargeMos") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">
                  {{ $t("bms.control.chargeMosDesc") }}
                </text>
              </view>
              <switch :checked="isCharging" @change="toggleCharge" :color="activeThemeColor" />
            </view>

            <!-- 放电 MOS -->
            <view class="wot-flex wot-items-center wot-justify-between">
              <view class="wot-flex wot-flex-col">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.dischargeMos") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">
                  {{ $t("bms.control.dischargeMosDesc") }}
                </text>
              </view>
              <switch :checked="isDischarging" @change="toggleDischarge" :color="activeThemeColor" />
            </view>

            <!-- 聚力威独有高阶控制：低温加热 MOSFET (0x52) -->
            <view class="wot-flex wot-items-center wot-justify-between wot-mt-2 wot-pt-2 wot-border-t wot-border-border-main">
              <view class="wot-flex wot-flex-col">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.heatMos") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">
                  {{ $t("bms.control.heatMosDesc") }}
                </text>
              </view>
              <switch :checked="isHeating" @change="toggleHeating" color="#10b981" />
            </view>
          </view>
        </view>

        <!-- 聚力威专有硬件系统级别保护动作面板 -->
        <view class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm">
          <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-shield-alert" size="24px" color="#e37318" />
            <text class="wot-text-body-main wot-font-bold wot-text-text-main">{{ $t("bms.control.hardwareEmergencyAction") }}</text>
          </view>

          <view class="wot-flex wot-flex-col wot-gap-3 wot-mt-2">
            <!-- 清除异常状态 -->
            <view class="wot-flex wot-items-center wot-justify-between">
              <view class="wot-flex wot-flex-col wot-w-[65%]">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.clearStatus") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.clearStatusDesc") }}</text>
              </view>
              <button
                @click="confirmAction('clear')"
                class="action-btn wot-rounded-lg wot-border-border-main wot-text-text-main wot-text-caption wot-font-semibold wot-py-extra-tight wot-px-main wot-shadow-sm"
              >
                {{ $t("bms.control.clearStatus") }}
              </button>
            </view>

            <!-- 强制休眠保护 -->
            <view class="wot-flex wot-items-center wot-justify-between wot-pt-2 wot-border-t wot-border-border-main">
              <view class="wot-flex wot-flex-col wot-w-[65%]">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.forceSleep") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.forceSleepDesc") }}</text>
              </view>
              <button
                @click="confirmAction('sleep')"
                class="action-btn wot-rounded-lg wot-bg-error-surface wot-text-danger-main wot-text-caption wot-font-semibold wot-py-extra-tight wot-px-main wot-shadow-sm"
              >
                {{ $t("bms.control.forceSleep") }}
              </button>
            </view>

            <!-- 强制拉起启动 -->
            <view class="wot-flex wot-items-center wot-justify-between wot-pt-2 wot-border-t wot-border-border-main">
              <view class="wot-flex wot-flex-col wot-w-[65%]">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.forceStart") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.control.forceStartDesc") }}</text>
              </view>
              <button
                @click="confirmAction('start')"
                class="action-btn wot-rounded-lg wot-bg-success-surface wot-text-success-main wot-text-caption wot-font-semibold wot-py-extra-tight wot-px-main wot-shadow-sm"
              >
                {{ $t("bms.control.forceStart") }}
              </button>
            </view>
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
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";
import { useUserStore } from "@/stores/user";
import { useAppStore } from "@/stores/app";

// 初始化 UI 交互及多语言翻译
const toast = useToast();
const dialog = useDialog();
const { t } = useI18n();

// 获取全局用户授权状态仓及全局蓝牙状态
const userStore = useUserStore();
const { isAuthorized } = storeToRefs(userStore);
const appStore = useAppStore();
const { activeThemeColor } = storeToRefs(appStore);
const bleStore = useBleStore();
const {
  isBleConnected: isConnected,
  connectedDeviceName: connectedName,
  isCharging,
  isDischarging,
  extendedProtocolData,
} = storeToRefs(bleStore);

// 读取协议基本描述
const protocolType = computed(() => bleStore.activeProtocolParser?.protocolType || "");
const protocolName = computed(() => bleStore.activeProtocolParser?.protocolName || t("bms.ble.unknownProtocol"));

// 判断低温加热管是否开启
const isHeating = computed(() => {
  return extendedProtocolData.value?.mosTemperature !== undefined && extendedProtocolData.value.mosTemperature > 45;
});

// 弹出授权激活引导对话框
const showAuthRequiredDialog = () => {
  dialog
    .confirm({
      title: t("bms.auth.expireTitle"),
      msg: t("bms.auth.expireMsg"),
    })
    .then(() => {
      uni.navigateTo({
        url: "/pages/mine/auth",
      });
    })
    .catch(() => {
      // 用户取消
    });
};

// 获取控制下发错误提示字串
const getControlErrorMessage = (err: any): string => {
  if (err?.message === "Timeout waiting for response") {
    return t("bms.control.timeout");
  }
  return err?.message || t("bms.control.sendFailed");
};

// 充电控制
const toggleCharge = async (e: any) => {
  const nextVal = e.detail.value;
  if (!isAuthorized.value) {
    isCharging.value = !nextVal;
    showAuthRequiredDialog();
    return;
  }
  try {
    toast.loading({ msg: t("bms.control.chargeSending"), cover: true });
    await bleStore.sendControlCommand("charge", nextVal);
    toast.success(t("bms.control.sendSuccess"));
  } catch (err: any) {
    console.error("充电开关下发异常:", err);
    toast.error(getControlErrorMessage(err));
    isCharging.value = !nextVal;
  } finally {
    toast.close();
  }
};

// 放电控制
const toggleDischarge = async (e: any) => {
  const nextVal = e.detail.value;
  if (!isAuthorized.value) {
    isDischarging.value = !nextVal;
    showAuthRequiredDialog();
    return;
  }
  try {
    toast.loading({ msg: t("bms.control.dischargeSending"), cover: true });
    await bleStore.sendControlCommand("discharge", nextVal);
    toast.success(t("bms.control.sendSuccess"));
  } catch (err: any) {
    console.error("放电开关下发异常:", err);
    toast.error(getControlErrorMessage(err));
    isDischarging.value = !nextVal;
  } finally {
    toast.close();
  }
};

// 低温自加热控制
const toggleHeating = async (e: any) => {
  const nextVal = e.detail.value;
  if (!isAuthorized.value) {
    showAuthRequiredDialog();
    return;
  }
  try {
    toast.loading({ msg: t("bms.control.heatSending"), cover: true });
    await bleStore.sendControlCommand("heat", nextVal);
    toast.success(t("bms.control.sendSuccess"));
  } catch (err: any) {
    console.error("自加热下发异常:", err);
    toast.error(getControlErrorMessage(err));
  } finally {
    toast.close();
  }
};

// 针对紧急、危险指令加装弹窗二次校验确认
const confirmAction = (action: "clear" | "sleep" | "start") => {
  if (!isAuthorized.value) {
    showAuthRequiredDialog();
    return;
  }
  let title = "";
  let msg = "";

  if (action === "clear") {
    title = t("bms.control.clearStatus");
    msg = t("bms.control.clearStatusConfirm");
  } else if (action === "sleep") {
    title = t("bms.control.forceSleep");
    msg = t("bms.control.forceSleepConfirm");
  } else {
    title = t("bms.control.forceStart");
    msg = t("bms.control.forceStartConfirm");
  }

  dialog
    .confirm({
      title: title,
      msg: msg,
    })
    .then(async () => {
      try {
        toast.loading({ msg: t("bms.control.executing"), cover: true });
        await bleStore.sendControlCommand(action, true);
        toast.success(t("bms.common.opSuccess"));
      } catch (err: any) {
        console.error(`紧急指令下发失败: ${action}`, err);
        const errMsg = err?.message === "Timeout waiting for response"
          ? t("bms.control.timeout")
          : (err?.message || t("bms.common.opFailed"));
        toast.error(errMsg);
      } finally {
        toast.close();
      }
    })
    .catch(() => {
      // 用户取消
    });
};
</script>

<style scoped>
.action-btn {
  font-size: 24rpx;
  line-height: 2.2;
  margin: 0;
  border: 1px solid #bfbfbf;
  background-color: transparent;
  transition: all 0.2s ease;
}

.action-btn:active {
  opacity: 0.8;
  transform: scale(0.96);
}

/* 顶部安全区域与自定义导航栏高度自适应占位 */
.tab-content-wrap {
  padding-top: calc(var(--status-bar-height) + 44px + 16px) !important;
}
</style>
