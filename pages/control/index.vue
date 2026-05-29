<template>
  <layout-provider>
    <!-- 自定义顶部导航栏 -->
    <wd-navbar :title="$t('bms.tab.control')" fixed safe-area-inset-top placeholder />

    <view class="wot-p-main wot-pb-10">
      <!-- 场景1：设备未连接的优雅引导面板 -->
      <view
        v-if="!isConnected"
        class="wot-bg-filled-oppo wot-rounded-2xl wot-p-super-loose wot-shadow-sm wot-flex wot-flex-col wot-items-center wot-justify-center wot-min-h-[50vh] wot-mt-4"
      >
        <wd-icon css-icon="i-lucide-settings-2 animate-spin-slow" size="64px" color="#bfbfbf" />
        <text class="wot-text-title-large wot-text-text-main wot-font-bold wot-mt-6">
          {{ $t("bms.ble.disconnected") }}
        </text>
        <text class="wot-text-caption wot-text-text-secondary wot-mt-2 wot-text-center wot-px-super-loose">
          {{ $t("bms.ble.promptConnect") }}
        </text>
        <button
          @click="goConnect"
          class="connect-btn wot-bg-primary wot-text-text-white wot-rounded-full wot-px-super-loose wot-py-tight wot-text-body-main wot-font-semibold wot-shadow-md wot-mt-8 wot-flex wot-items-center wot-gap-2"
        >
          <wd-icon css-icon="i-lucide-link" size="18px" color="#fff" />
          {{ $t("bms.ble.connect") }}
        </button>
      </view>

      <!-- 场景2：设备已连接，展示多协议控制中枢 -->
      <view v-else class="wot-flex wot-flex-col wot-gap-4">
        <!-- 头部设备概览小卡片 -->
        <view
          class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-flex wot-items-center wot-justify-between"
        >
          <view class="wot-flex wot-items-center wot-gap-3">
            <wd-icon css-icon="i-lucide-cpu" size="32px" color="#0052d9" />
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
              <switch :checked="isCharging" @change="toggleCharge" color="#0052d9" />
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
              <switch :checked="isDischarging" @change="toggleDischarge" color="#0052d9" />
            </view>

            <!-- 聚力威独有高阶控制：低温加热 MOSFET (0x52) -->
            <view v-if="protocolType === 'jlw'" class="wot-flex wot-items-center wot-justify-between wot-mt-2 wot-pt-2 wot-border-t wot-border-border-main">
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
        <view v-if="protocolType === 'jlw'" class="wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm">
          <view class="wot-flex wot-items-center wot-gap-2 wot-mb-3 wot-border-b wot-border-border-main wot-pb-2">
            <wd-icon css-icon="i-lucide-shield-alert" size="24px" color="#e37318" />
            <text class="wot-text-body-main wot-font-bold wot-text-text-main">硬件级紧急维护动作</text>
          </view>

          <view class="wot-flex wot-flex-col wot-gap-3 wot-mt-2">
            <!-- 清除异常状态 -->
            <view class="wot-flex wot-items-center wot-justify-between">
              <view class="wot-flex wot-flex-col wot-w-[65%]">
                <text class="wot-text-body-main wot-font-medium wot-text-text-main">
                  {{ $t("bms.control.clearStatus") }}
                </text>
                <text class="wot-text-caption wot-text-text-secondary">重置并清除硬件内部的临时异常报警标识</text>
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
                <text class="wot-text-caption wot-text-text-secondary">强行迫使保护板进入低功耗深度休眠关断模式</text>
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
                <text class="wot-text-caption wot-text-text-secondary">强行从深度休眠中激活启动电池保护板硬件工作</text>
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

    <!-- 自定义底部导航栏 -->
    <custom-tabbar active="control" />
  </layout-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";

// 初始化 UI 交互及多语言翻译
const toast = useToast();
const dialog = useDialog();
const { t } = useI18n();

// 获取全局蓝牙状态
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
const protocolName = computed(() => bleStore.activeProtocolParser?.protocolName || "未知协议");

// 判断低温加热管是否开启（JLW 独有，状态码 Bit 15 为加热状态）
const isHeating = computed(() => {
  // 原状态由 extendedProtocolData 反馈，或者在此进行基础响应式绑定
  return extendedProtocolData.value?.mosTemperature !== undefined && extendedProtocolData.value.mosTemperature > 45; 
});

// 跳转到蓝牙搜索页面进行连接
const goConnect = () => {
  uni.navigateTo({
    url: "/pages/ble-search/index",
  });
};

// 充电控制
const toggleCharge = async (e: any) => {
  const nextVal = e.detail.value;
  try {
    toast.loading({ message: "发送充电控制指令...", mask: true });
    await bleStore.sendControlCommand("charge", nextVal);
    toast.success("指令下发成功");
  } catch (err: any) {
    console.error("充电开关下发异常:", err);
    toast.error(err.message || "下发失败");
    isCharging.value = !nextVal;
  } finally {
    toast.close();
  }
};

// 放电控制
const toggleDischarge = async (e: any) => {
  const nextVal = e.detail.value;
  try {
    toast.loading({ message: "发送放电控制指令...", mask: true });
    await bleStore.sendControlCommand("discharge", nextVal);
    toast.success("指令下发成功");
  } catch (err: any) {
    console.error("放电开关下发异常:", err);
    toast.error(err.message || "下发失败");
    isDischarging.value = !nextVal;
  } finally {
    toast.close();
  }
};

// 低温自加热控制（仅 JLW 协议可用）
const toggleHeating = async (e: any) => {
  const nextVal = e.detail.value;
  try {
    toast.loading({ message: "下发加热控制...", mask: true });
    await bleStore.sendControlCommand("heat", nextVal);
    toast.success("指令下发成功");
  } catch (err: any) {
    console.error("自加热下发异常:", err);
    toast.error(err.message || "下发失败");
  } finally {
    toast.close();
  }
};

// 针对紧急、危险指令加装弹窗二次校验确认
const confirmAction = (action: "clear" | "sleep" | "start") => {
  let title = "";
  let msg = "";

  if (action === "clear") {
    title = t("bms.control.clearStatus") || "清除异常";
    msg = "您确定要强制重置并清除保护板当前的全部异常状态标识吗？这可能会掩盖硬件真实故障，请谨慎操作。";
  } else if (action === "sleep") {
    title = t("bms.control.forceSleep") || "强制休眠";
    msg = "【警告】强制休眠将彻底切断电池组向外输出与充电电流！可能会导致设备掉电关机，确定执行吗？";
  } else {
    title = t("bms.control.forceStart") || "强制启动";
    msg = "确定要强制唤醒并重新拉起启动电池保护板系统吗？";
  }

  dialog
    .confirm({
      title: title,
      msg: msg,
    })
    .then(async () => {
      try {
        toast.loading({ message: "执行指令中...", mask: true });
        await bleStore.sendControlCommand(action, true);
        toast.success("操作执行成功");
      } catch (err: any) {
        console.error(`紧急指令下发失败: ${action}`, err);
        toast.error(err.message || "操作失败");
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
.page-container {
  box-sizing: border-box;
}

.connect-btn {
  line-height: 2.2;
  margin: 0;
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
}

.connect-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}

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

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.animate-spin-slow {
  animation: spin-slow 12s linear infinite;
}
</style>
