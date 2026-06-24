<template>
  <view class="wot-w-full wot-bg-filled-bottom wot-box-border wot-px-4">
    <!-- 自定义顶部导航栏 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.tab.control')" fixed safe-area-inset-top />

    <view class="tab-content-wrap page-body-animate" :style="{ 'padding-top': (navbarHeight + 16) + 'px' }">
      <!-- 蓝牙未连接时的空状态 -->
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

      <!-- 已连接时的控制面板 -->
      <view v-else class="wot-flex wot-flex-col wot-gap-4">
        <!-- 1. 核心开关控制卡片 (开启/关闭按钮组方式，解决读不到状态值引起的 Switch 假滑动问题) -->
        <view class="wot-bg-filled-oppo wot-p-4 control-panel-card">
          <view
            class="wot-flex wot-items-center wot-gap-2 wot-mb-4 wot-border-0 wot-border-b wot-border-solid wot-border-divider-main wot-pb-2.5"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-ri-toggle-line" size="20px" color="var(--wot-icon-auxiliary)" />
            <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '30rpx' }">
              {{ $t("bms.control.title") }}
            </text>
          </view>

          <view class="wot-flex wot-flex-col wot-gap-4">
            <!-- 充电 MOS 控制 -->
            <view class="wot-flex wot-items-center wot-justify-between">
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.chargeMos") }}
              </text>
              <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-shrink-0">
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="primary"
                  plain
                  @click="handleControlAction('charge', true)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.enable") }}
                </wd-button>
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="danger"
                  plain
                  @click="handleControlAction('charge', false)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.disable") }}
                </wd-button>
              </view>
            </view>

            <!-- 放电 MOS 控制 -->
            <view
              class="wot-flex wot-items-center wot-justify-between wot-pt-3 wot-border-0 wot-border-t wot-border-solid wot-border-divider-main"
            >
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.dischargeMos") }}
              </text>
              <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-shrink-0">
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="primary"
                  plain
                  @click="handleControlAction('discharge', true)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.enable") }}
                </wd-button>
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="danger"
                  plain
                  @click="handleControlAction('discharge', false)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.disable") }}
                </wd-button>
              </view>
            </view>

            <!-- 低温自加热控制 -->
            <view
              class="wot-flex wot-items-center wot-justify-between wot-pt-3 wot-border-0 wot-border-t wot-border-solid wot-border-divider-main"
            >
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.heatMos") }}
              </text>
              <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-shrink-0">
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="primary"
                  plain
                  @click="handleControlAction('heat', true)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.enable") }}
                </wd-button>
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="danger"
                  plain
                  @click="handleControlAction('heat', false)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.disable") }}
                </wd-button>
              </view>
            </view>

            <!-- 测试模式控制 -->
            <view
              class="wot-flex wot-items-center wot-justify-between wot-pt-3 wot-border-0 wot-border-t wot-border-solid wot-border-divider-main"
            >
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.testMode") }}
              </text>
              <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-shrink-0">
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="primary"
                  plain
                  @click="handleControlAction('test', true)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.enable") }}
                </wd-button>
                <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
                <wd-button
                  size="small"
                  type="danger"
                  plain
                  @click="handleControlAction('test', false)"
                  custom-class="btn-control-style"
                >
                  {{ $t("bms.common.disable") }}
                </wd-button>
              </view>
            </view>
          </view>
        </view>

        <!-- 2. 系统维护与紧急动作卡片 -->
        <view class="wot-bg-filled-oppo wot-p-4 control-panel-card">
          <view
            class="wot-flex wot-items-center wot-gap-2 wot-mb-4 wot-border-0 wot-border-b wot-border-solid wot-border-divider-main wot-pb-2.5"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-ri-settings-5-line" size="20px" color="var(--wot-icon-secondary)" />
            <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '30rpx' }">
              {{ $t("bms.control.systemMaintenance") }}
            </text>
          </view>

          <!-- 维护与紧急指令按钮列表 -->
          <view class="wot-flex wot-flex-col wot-gap-3.5">
            <!-- 清除异常状态 -->
            <view class="wot-flex wot-items-center wot-justify-between">
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.clearStatus") }}
              </text>
              <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
              <wd-button size="small" plain @click="confirmAction('clear')" custom-class="btn-style">
                {{ $t("bms.control.btnClear") }}
              </wd-button>
            </view>

            <!-- 清除累计参数 -->
            <view
              class="wot-flex wot-items-center wot-justify-between wot-pt-3 wot-border-0 wot-border-t wot-border-solid wot-border-divider-main"
            >
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.clearParam") }}
              </text>
              <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
              <wd-button size="small" plain @click="confirmAction('clearParam')" custom-class="btn-style">
                {{ $t("bms.control.btnClear") }}
              </wd-button>
            </view>

            <!-- 强制拉起启动 -->
            <view
              class="wot-flex wot-items-center wot-justify-between wot-pt-3 wot-border-0 wot-border-t wot-border-solid wot-border-divider-main"
            >
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.forceStart") }}
              </text>
              <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
              <wd-button size="small" plain @click="confirmAction('start')" custom-class="btn-style">
                {{ $t("bms.control.btnStart") }}
              </wd-button>
            </view>

            <!-- 强制休眠关断 -->
            <view
              class="wot-flex wot-items-center wot-justify-between wot-pt-3 wot-border-0 wot-border-t wot-border-solid wot-border-divider-main"
            >
              <text class="wot-font-semibold wot-text-text-main" :style="{ fontSize: '28rpx' }">
                {{ $t("bms.control.forceSleep") }}
              </text>
              <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
              <wd-button size="small" plain @click="confirmAction('sleep')" custom-class="btn-style">
                {{ $t("bms.control.btnSleep") }}
              </wd-button>
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
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";
import { useUserStore } from "@/stores/user";
import { useDeviceInfo } from "@/uni_modules/wot-ui/composables/useDeviceInfo";

// 初始化 UI 交互反馈与翻译
const toast = useToast();
const dialog = useDialog();
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

// 获取状态存储层数据
const userStore = useUserStore();
const { isAuthorized } = storeToRefs(userStore);
const bleStore = useBleStore();
const { isBleConnected: isConnected } = storeToRefs(bleStore);

// 导航至蓝牙搜寻连接页
const toConnect = () => {
  uni.navigateTo({
    url: "/pages/ble-search/index",
  });
};

// 未授权激活弹框提示
const showAuthRequiredDialog = () => {
  dialog
    .confirm({
      title: t("bms.auth.expireTitle"),
      msg: t("bms.auth.expireMsg"),
      zIndex: 2000,
    })
    .then(() => {
      uni.navigateTo({
        url: "/pages/mine/auth",
      });
    })
    .catch(() => {
      // 用户取消授权跳转
    });
};

// 异常响应错误清洗
const getControlErrorMessage = (err: any): string => {
  if (err?.message === "Timeout waiting for response") {
    return t("bms.control.timeout");
  }
  return err?.message || t("bms.control.sendFailed");
};

// 统一的开关控制动作下发
const handleControlAction = (type: "charge" | "discharge" | "heat" | "test", open: boolean) => {
  if (!isAuthorized.value) {
    showAuthRequiredDialog();
    return;
  }

  // 动态拼装二次确认文案
  let title = "";
  let typeText = "";
  if (type === "charge") {
    title = t("bms.control.chargeMos");
    typeText = t("bms.control.charge");
  } else if (type === "discharge") {
    title = t("bms.control.dischargeMos");
    typeText = t("bms.control.discharge");
  } else if (type === "heat") {
    title = t("bms.control.heatMos");
    typeText = t("bms.control.heatMos");
  } else {
    title = t("bms.control.testMode");
    typeText = t("bms.control.testMode");
  }

  const actionText = open ? t("bms.common.enable") : t("bms.common.disable");
  const isEn = t("bms.control.confirmPrefix").startsWith("Are");
  const space = isEn ? " " : "";
  const actionWord = isEn ? actionText.toLowerCase() : actionText;
  const typeWord = isEn ? typeText.toLowerCase() : typeText;
  const promptMsg = t("bms.control.confirmPrefix") + actionWord + space + typeWord + t("bms.control.confirmSuffix");

  dialog
    .confirm({
      title: title,
      msg: promptMsg,
      zIndex: 2000,
    })
    .then(async () => {
      try {
        toast.loading({ msg: t("bms.control.sending"), cover: true });
        await bleStore.sendControlCommand(type, open);
        toast.success(t("bms.control.sendSuccess"));
      } catch (err: any) {
        console.error(`${typeText}控制下发异常:`, err);
        toast.error(getControlErrorMessage(err));
      } finally {
        toast.close();
      }
    })
    .catch(() => {
      // 用户取消
    });
};

// 系统级维护与安全拉起动作 Dialog 二次授权校验
const confirmAction = (action: "clear" | "sleep" | "start" | "clearParam") => {
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
  } else if (action === "start") {
    title = t("bms.control.forceStart");
    msg = t("bms.control.forceStartConfirm");
  } else {
    title = t("bms.control.clearParam");
    msg = t("bms.control.clearParamConfirm");
  }

  dialog
    .confirm({
      title: title,
      msg: msg,
      zIndex: 2000,
    })
    .then(async () => {
      try {
        toast.loading({ msg: t("bms.control.executing"), cover: true });
        await bleStore.sendControlCommand(action, true);
        toast.success(t("bms.common.opSuccess"));
      } catch (err: any) {
        console.error(`维护指令下发失败: ${action}`, err);
        toast.error(getControlErrorMessage(err));
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
/* 按钮基础风格重置，融入 wot-ui 配色设计 */
:deep(.btn-style) {
  min-width: 140rpx;
  font-weight: 600;
  border-radius: 12rpx;
}

:deep(.btn-control-style) {
  min-width: 110rpx;
  font-weight: 600;
  border-radius: 12rpx;
}

.control-panel-card {
  border-radius: 28rpx;
  box-shadow: 0 8px 20px rgba(163, 177, 198, 0.1);
}

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
</style>
