<template>
  <layout-provider>
    <!-- 自定义顶部导航栏 -->
    <wd-navbar
      :title="$t('bms.auth.title')"
      fixed
      placeholder
      left-arrow
      safe-area-inset-top
      @click-left="goBack"
    />

    <view class="wot-px-3 wot-py-4 page-body-animate">
      <!-- 核心授权状态指示卡片 -->
      <wd-card class="wot-mb-4">
        <view class="wot-flex wot-items-center wot-py-4 wot-px-2">
          <!-- 状态圆环与图标 -->
          <view
            :class="statusCircleClass"
            class="status-circle-small wot-flex wot-items-center wot-justify-center wot-rounded-full wot-mr-4"
          >
            <wd-icon :css-icon="statusIconName" :color="statusIconColor" size="26px" />
          </view>

          <!-- 状态与期限右侧排版 -->
          <view class="wot-flex wot-flex-col wot-justify-center">
            <text class="wot-text-title-medium wot-font-bold wot-text-text-main wot-mb-1">
              {{ statusText }}
            </text>
            <view class="wot-flex">
              <view :class="statusBadgeClass" class="wot-px-2.5 wot-py-0.5 wot-rounded wot-text-caption wot-font-semibold">
                {{ expirationText }}
              </view>
            </view>
          </view>
        </view>
      </wd-card>

      <!-- 设备硬件码复制卡片 -->
      <wd-card class="wot-mb-4" :title="$t('bms.auth.deviceCode')">
        <view
          class="wot-flex wot-flex-col wot-items-center wot-py-6 wot-bg-filled-main wot-rounded-xl"
          @click="copyDeviceCode"
        >
          <text class="device-code-value wot-font-black wot-text-primary wot-tracking-widest wot-pointer-events-none">
            {{ codeDev }}
          </text>
          <view class="wot-flex wot-items-center wot-mt-3 wot-gap-1 wot-pointer-events-none">
            <wd-icon css-icon="i-ri-file-copy-2-line" size="14px" color="#80868b" />
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.auth.copyHint") }}</text>
          </view>
        </view>
      </wd-card>

      <!-- 激活指令输入与确认按钮卡片 -->
      <wd-card class="wot-mb-4" :title="$t('bms.auth.authCode')">
        <view class="wot-py-2">
          <wd-input
            v-model="codeCheck"
            type="text"
            clearable
            :placeholder="$t('bms.auth.inputPlaceholder')"
            :maxlength="8"
            custom-style="margin-bottom: 24px;"
          />
          <wd-button block type="primary" size="large" @click="onCheckCode">
            {{ $t("bms.auth.activateBtn") }}
          </wd-button>
        </view>
      </wd-card>
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@wot-ui/ui";
import { permissionManager } from "@/service/permission";
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { generateRandomDeviceCode, calculateAuthCode, decodeAuthCode, calculateEndTime } from "@/utils/auth-helper";

// 初始化国际化实例、气泡提示与对话框反馈实例
const { t } = useI18n();
const toast = useToast();
const dialog = useDialog();

// 声明页面绑定的状态变量
const codeDev = ref("");
const codeCheck = ref("");

// 获取全局用户状态仓
const userStore = useUserStore();
const { isAuthorized, authEndTime, authType } = storeToRefs(userStore);

// 状态指示圆环背景样式计算属性
const statusCircleClass = computed(() => {
  if (isAuthorized.value) {
    return "wot-bg-green-50 dark:wot-bg-green-950/30";
  }
  if (authEndTime.value === 0) {
    return "wot-bg-slate-100 dark:wot-bg-zinc-800";
  }
  return "wot-bg-orange-50 dark:wot-bg-orange-950/30";
});

// 状态气泡标签样式计算属性
const statusBadgeClass = computed(() => {
  if (isAuthorized.value) {
    return "wot-bg-green-100 wot-text-green-700 dark:wot-bg-green-950/50 dark:wot-text-green-400";
  }
  if (authEndTime.value === 0) {
    return "wot-bg-slate-200 wot-text-slate-600 dark:wot-bg-zinc-800 dark:wot-text-zinc-400";
  }
  return "wot-bg-orange-100 wot-text-orange-700 dark:wot-bg-orange-950/50 dark:wot-text-orange-400";
});

// 状态图标名称计算属性
const statusIconName = computed(() => {
  if (isAuthorized.value) {
    return "i-ri-shield-check-fill";
  }
  if (authEndTime.value === 0) {
    return "i-ri-shield-user-line";
  }
  return "i-ri-shield-flash-line";
});

// 状态图标颜色计算属性
const statusIconColor = computed(() => {
  if (isAuthorized.value) {
    return "#07c160";
  }
  if (authEndTime.value === 0) {
    return "#80868b";
  }
  return "#ff9900";
});

onMounted(() => {
  let devCode = uni.getStorageSync("code_dev");
  if (!devCode) {
    devCode = generateRandomDeviceCode();
    uni.setStorageSync("code_dev", devCode);
  }
  codeDev.value = devCode;
});

const expirationText = computed(() => {
  if (!isAuthorized.value) {
    return authEndTime.value === 0 ? t("bms.auth.toBeActivated") : t("bms.auth.expired");
  }

  if (authType.value === 1) {
    return t("bms.auth.permanent");
  }

  const timeDifference = authEndTime.value - Date.now();
  const remainingDays = Math.max(0, Math.ceil(timeDifference / (1000 * 60 * 60 * 24)));

  return t("bms.auth.authorizedTime") + remainingDays + t("bms.auth.days");
});

const statusText = computed(() => {
  if (isAuthorized.value) {
    return t("bms.auth.statusAuthorized");
  }
  return authEndTime.value === 0
    ? t("bms.auth.statusNotActivated")
    : t("bms.auth.statusExpired");
});

const goBack = () => {
  uni.navigateBack();
};

const copyDeviceCode = () => {
  const textToCopy = codeDev.value || uni.getStorageSync("code_dev") || "UNKNOWN";
  console.log("开始复制设备识别码:", textToCopy);

  (uni.setClipboardData as any)({
    data: textToCopy,
    showToast: false,
    success: () => {
      toast.success(t("bms.auth.copied"));
    },
    fail: (err: any) => {
      console.error("写入剪切板失败，引导系统授权:", err);
      showPermissionDialog();
    },
  });
};

const showPermissionDialog = () => {
  dialog
    .confirm({
      title: t("bms.auth.clipboardPermissionTitle"),
      msg: t("bms.auth.clipboardPermissionMsg"),
      confirmButtonText: t("bms.common.goSettings"),
      cancelButtonText: t("bms.common.cancel"),
      zIndex: 2000,
    })
    .then(() => {
      openSystemSettings();
    })
    .catch(() => {});
};

const openSystemSettings = () => {
  permissionManager.openAppSettings();
};

const onCheckCode = () => {
  const cleanInput = codeCheck.value.trim().toUpperCase();
  if (cleanInput.length !== 8) {
    toast.show({
      msg: t("bms.auth.failed"),
    });
    return;
  }

  const decoded = decodeAuthCode(codeDev.value.length, cleanInput);
  if (!decoded) {
    toast.show({
      msg: t("bms.auth.failed"),
    });
    return;
  }

  const { time, type } = decoded;
  const expectedCode = calculateAuthCode(codeDev.value, time, type);

  if (expectedCode.toUpperCase() === cleanInput) {
    const endTimeStamp = calculateEndTime(codeDev.value.length, time);
    userStore.saveAuthInfo(endTimeStamp, time, type);

    toast.success(t("bms.auth.success"));

    const nextDevCode = generateRandomDeviceCode();
    uni.setStorageSync("code_dev", nextDevCode);
    codeDev.value = nextDevCode;
    codeCheck.value = "";
  } else {
    toast.show({
      msg: t("bms.auth.failed"),
    });
  }
};
</script>

<style scoped lang="scss">
.status-circle-small {
  width: 52px;
  height: 52px;
  transition: background-color 0.3s ease;
}

.device-code-value {
  font-size: 32px;
}

.page-body-animate {
  --wot-card-margin-horizontal: 0;
}
</style>
