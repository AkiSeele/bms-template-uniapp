<template>
  <layout-provider>
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar
      :title="$t('bms.firmware.title')"
      fixed
      placeholder
      left-arrow
      safe-area-inset-top
      @click-left="handleBack"
    />

    <!-- 顶部渐变装饰背景层（绝对定位，不影响文档流） -->
    <view class="fw-header-bg">
      <!-- 浮动圆圈由 GSAP 补间驱动 translateY，will-change 已在 CSS 中声明 -->
      <view class="fw-circle fw-circle--a" :style="circleAStyle" />
      <view class="fw-circle fw-circle--b" :style="circleBStyle" />
    </view>

    <view class="wot-px-3 wot-py-4 wot-relative wot-z-1">

      <!-- ① 设备状态英雄卡片 -->
      <view class="fw-hero wot-flex wot-items-center wot-mb-4 wot-rounded-3xl wot-p-4 page-body-animate">
        <!-- 脉冲图标容器 -->
        <view class="fw-hero__icon wot-relative wot-flex-shrink-0 wot-flex wot-items-center wot-justify-center">
          <!-- 脉冲圆环由 GSAP 补间驱动 scale + opacity -->
          <view class="fw-pulse-ring" :style="pulseRingStyle" />
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-cpu" size="32px" color="#fff" />
        </view>

        <view class="wot-flex wot-flex-col wot-ml-4">
          <text class="wot-text-2xl wot-font-bold wot-text-white">{{ $t("bms.firmware.deviceName") }}</text>
          <!-- 状态胶囊 -->
          <view class="fw-capsule wot-flex wot-items-center wot-mt-2" :class="statusCapsuleClass">
            <!-- 闪烁动画由 GSAP 补间驱动 opacity -->
            <view class="fw-capsule__dot" :class="{ 'fw-capsule__dot--blink': isUpdating }" :style="isUpdating ? blinkStyle : undefined" />
            <text class="wot-text-xs wot-text-white wot-ml-1 wot-font-medium">{{ statusCapsuleText }}</text>
          </view>
        </view>
      </view>

      <!-- ② 流程步骤条 -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card class="wot-mb-4">
        <!-- Source: uni_modules/wot-ui/components/wd-steps/wd-steps.vue -->
        <wd-steps :active="currentStep" align-center>
          <!-- Source: uni_modules/wot-ui/components/wd-step/wd-step.vue -->
          <wd-step :title="$t('bms.firmware.stepSelect')" />
          <!-- Source: uni_modules/wot-ui/components/wd-step/wd-step.vue -->
          <wd-step :title="$t('bms.firmware.stepVerify')" />
          <!-- Source: uni_modules/wot-ui/components/wd-step/wd-step.vue -->
          <wd-step :title="$t('bms.firmware.stepFlash')" />
          <!-- Source: uni_modules/wot-ui/components/wd-step/wd-step.vue -->
          <wd-step :title="$t('bms.firmware.stepDone')" />
        </wd-steps>
      </wd-card>

      <!-- ③ 文件选择卡片 -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card class="wot-mb-4" :title="$t('bms.firmware.selectFile')">
        <view
          class="fw-file-zone wot-flex wot-items-center wot-rounded-xl wot-p-3"
          :class="{ 'fw-file-zone--active': hasFileSelected }"
          @click="handleSelectFile"
        >
          <!-- 文件图标 -->
          <view
            class="fw-file-icon wot-flex wot-items-center wot-justify-center wot-flex-shrink-0 wot-rounded-xl"
            :class="{ 'fw-file-icon--active': hasFileSelected }"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon :css-icon="fileIconName" size="26px" :color="fileIconColor" />
          </view>

          <!-- 文件名和提示 -->
          <view class="wot-flex wot-flex-col wot-flex-1 wot-ml-3 wot-overflow-hidden">
            <text
              class="wot-text-sm wot-font-semibold"
              :class="hasFileSelected ? 'wot-text-text-main' : 'wot-text-text-secondary'"
            >
              {{ fileNameDisplay }}
            </text>
            <text v-if="fileSizeText" class="wot-text-xs wot-text-green-500 wot-mt-1">{{ fileSizeText }}</text>
            <text v-else class="wot-text-xs wot-text-text-secondary wot-mt-1">{{ $t("bms.firmware.supportedFormats") }}</text>
          </view>

          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-chevron-right" size="18px" color="#94a3b8" />
        </view>
      </wd-card>

      <!-- ④ 进度卡片（写入中或完成后显示） -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card v-if="showProgressCard" class="wot-mb-4">
        <!-- 进度头部行 -->
        <view class="wot-flex wot-items-center wot-justify-between wot-mb-3">
          <view class="wot-flex wot-items-center">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-download" size="18px" color="#22c55e" class="wot-mr-2" />
            <text class="wot-text-sm wot-font-semibold wot-text-text-main">{{ $t("bms.firmware.flashProgress") }}</text>
          </view>
          <text class="fw-progress-pct">{{ displayProgressValue }}%</text>
        </view>

        <!-- Source: uni_modules/wot-ui/components/wd-progress/wd-progress.vue -->
        <wd-progress
          :percentage="displayProgressValue"
          :color="progressBarColor"
          :hide-text="true"
          :duration="20"
        />

        <!-- 阶段文案行 -->
        <view class="wot-flex wot-items-center wot-justify-between wot-mt-3">
          <!-- 进度阶段文字呼吸灯由 GSAP blinkStyle 驱动 -->
          <text class="wot-text-xs wot-font-medium" :class="isUpdating ? 'wot-text-blue-500' : 'wot-text-text-secondary'" :style="isUpdating ? blinkStyle : undefined">
            {{ progressPhaseText }}
          </text>
          <text v-if="isUpdating" class="wot-text-xs wot-text-text-secondary">{{ $t("bms.firmware.processing") }}</text>
        </view>
      </wd-card>

      <!-- ⑤ 固件信息卡片（选中文件后显示） -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card v-if="hasFileSelected" class="wot-mb-4" :title="$t('bms.firmware.fwInfo')">
        <!-- Source: uni_modules/wot-ui/components/wd-cell-group/wd-cell-group.vue -->
        <wd-cell-group border>
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.firmware.fwFileName')" :value="selectedFileName" />
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.firmware.fwSize')" :value="fileSizeText" />
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.firmware.fwStatus')">
            <template #default>
              <text class="wot-text-green-500 wot-font-medium">{{ $t("bms.firmware.fwReadyToFlash") }}</text>
            </template>
          </wd-cell>
        </wd-cell-group>
      </wd-card>

      <!-- ⑥ 底部操作按钮区 -->
      <view class="wot-mt-4 wot-mb-6">
        <!-- 开始写入 / 更新中 / 完成 主按钮 -->
        <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
        <wd-button
          block
          size="large"
          :type="mainBtnType"
          :disabled="mainBtnDisabled"
          :loading="isUpdating"
          :loading-text="$t('bms.firmware.updating')"
          @click="handleStartUpdate"
        >
          {{ mainBtnText }}
        </wd-button>

        <!-- 取消/重置 次要按钮 -->
        <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
        <wd-button
          v-if="showCancelBtn"
          block
          size="large"
          plain
          class="wot-mt-3"
          @click="handleCancelOrReset"
        >
          {{ cancelBtnText }}
        </wd-button>
      </view>
    </view>

    <!-- 显式挂载 toast 实例，useToast() 必须对应模板中的 wd-toast 实例 -->
    <!-- Source: uni_modules/wot-ui/components/wd-toast/wd-toast.vue -->
    <wd-toast />
    <!-- 显式挂载 dialog 实例，useDialog() 必须对应模板中的 wd-dialog 实例 -->
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
// @ts-ignore
import { onUnload, onBackPress } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useFirmwareAnimation } from "@/composables/use-firmware-animation";
import { useToast, useDialog } from "@/uni_modules/wot-ui";

const { t } = useI18n();
const toast = useToast();
const dialog = useDialog();

// ---------------------------------------------------------------------------
// 业务状态
// ---------------------------------------------------------------------------

/** 步骤条当前激活索引（0:选择 1:校验 2:写入 3:完成） */
const currentStep = ref(0);

/** 已选文件名 */
const selectedFileName = ref("");

/** 已选文件大小（字节） */
const selectedFileSize = ref(0);

/** 是否正在固件写入中 */
const isUpdating = ref(false);

/** 固件写入是否已成功完成 */
const updateSuccess = ref(false);

/** 内部进度数值（0-100），驱动分段推进 */
const progressValue = ref(0);

/** 展示用进度数值，绑定到 wd-progress 组件 */
const displayProgressValue = ref(0);

/** 是否显示进度卡片 */
const showProgressCard = ref(false);

// ---------------------------------------------------------------------------
// GSAP 动画 Hook（装饰浮动圆圈、脉冲圆环、指示灯闪烁）
// 动画逻辑收拢至 composables/use-firmware-animation.ts，此处仅绑定
// ---------------------------------------------------------------------------
const {
  circleAStyle,
  circleBStyle,
  pulseRingStyle,
  blinkStyle,
  startAnimations,
  stopAnimations,
} = useFirmwareAnimation(isUpdating);

// 页面挂载后启动常驻装饰动画
onMounted(() => {
  startAnimations();
});

// 页面卸载/组件销毁时彻底清理 GSAP 补间实例
onUnmounted(() => {
  stopAnimations();
});

// 拦截物理按键及手机侧滑返回
onBackPress(() => {
  if (isUpdating.value) {
    toast.show({ msg: t("bms.firmware.updatingNoBack") });
    return true; // 返回 true 表示阻止默认的返回行为
  }
  return false;
});

/** 模拟写入定时器句柄（页面卸载时必须清理） */
let simulateTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// 计算属性区（模板中所有复杂逻辑必须收拢至此，禁止模板内嵌套三目运算符）
// ---------------------------------------------------------------------------

/** 是否已选中文件 */
const hasFileSelected = computed(() => !!selectedFileName.value);

/** 文件大小格式化展示（自动换算 KB / MB） */
const fileSizeText = computed(() => {
  if (!selectedFileSize.value) return "";
  const kb = selectedFileSize.value / 1024;
  if (kb < 1024) {
    return kb.toFixed(1) + " KB";
  }
  return (kb / 1024).toFixed(2) + " MB";
});

/** 文件名展示文本（未选时显示引导文案） */
const fileNameDisplay = computed(() =>
  hasFileSelected.value ? selectedFileName.value : t("bms.firmware.tapToSelect"),
);

/** 文件图标名 */
const fileIconName = computed(() =>
  hasFileSelected.value ? "i-lucide-file-check-2" : "i-lucide-file-up",
);

/** 文件图标颜色 */
const fileIconColor = computed(() => (hasFileSelected.value ? "#22c55e" : "#94a3b8"));

/** 状态胶囊 CSS 追加类 */
const statusCapsuleClass = computed(() => {
  if (updateSuccess.value) return "fw-capsule--success";
  if (isUpdating.value) return "fw-capsule--updating";
  return "";
});

/** 状态胶囊文案 */
const statusCapsuleText = computed(() => {
  if (updateSuccess.value) return t("bms.firmware.statusSuccess");
  if (isUpdating.value) return t("bms.firmware.statusUpdating");
  if (hasFileSelected.value) return t("bms.firmware.statusReady");
  return t("bms.firmware.statusIdle");
});

/** 进度条颜色 */
const progressBarColor = computed(() => (updateSuccess.value ? "#22c55e" : "#3b82f6"));

/** 进度阶段说明文案 */
const progressPhaseText = computed(() => {
  if (updateSuccess.value) return t("bms.firmware.phaseComplete");
  if (displayProgressValue.value < 10) return t("bms.firmware.phaseInit");
  if (displayProgressValue.value < 50) return t("bms.firmware.phaseVerify");
  if (displayProgressValue.value < 95) return t("bms.firmware.phaseFlash");
  return t("bms.firmware.phaseFinalizing");
});

/** 主按钮类型（wd-button 的 type 属性） */
const mainBtnType = computed(() => {
  if (updateSuccess.value) return "success";
  return "primary";
});

/** 主按钮是否禁用 */
const mainBtnDisabled = computed(() => {
  if (isUpdating.value || updateSuccess.value) return true;
  return !hasFileSelected.value;
});

/** 主按钮文案 */
const mainBtnText = computed(() => {
  if (updateSuccess.value) return t("bms.firmware.updateSuccess");
  return t("bms.firmware.startUpdate");
});

/** 是否显示取消/重置次要按钮 */
const showCancelBtn = computed(() => updateSuccess.value);

/** 取消/重置按钮文案 */
const cancelBtnText = computed(() =>
  updateSuccess.value ? t("bms.firmware.reset") : t("bms.firmware.cancel"),
);

// ---------------------------------------------------------------------------
// 页面卸载清理（防定时器泄漏）
// ---------------------------------------------------------------------------
onUnload(() => {
  if (simulateTimer) {
    clearInterval(simulateTimer);
    simulateTimer = null;
  }
  // #ifdef MP-WEIXIN
  wx.disableAlertBeforeUnload();
  // #endif
});

// ---------------------------------------------------------------------------
// 事件处理函数
// ---------------------------------------------------------------------------

/**
 * 返回上一页
 * 如果正在写入固件中，提示并禁止返回，否则执行 navigateBack
 */
const handleBack = () => {
  if (isUpdating.value) {
    toast.show({ msg: t("bms.firmware.updatingNoBack") });
    return;
  }
  uni.navigateBack();
};

/**
 * 选择固件文件
 * 通过条件编译为不同平台分发不同文件选择方式
 */
const handleSelectFile = () => {
  if (isUpdating.value) {
    toast.show({ msg: t("bms.firmware.updatingNoSelect") });
    return;
  }

  // #ifdef MP-WEIXIN
  wx.chooseMessageFile({
    count: 1,
    type: "all",
    success(res: any) {
      const file = res.tempFiles[0];
      onFileSelected(file.name, file.size || 0);
    },
  });
  // #endif

  // #ifdef APP-PLUS
  const fileSelectPlugin = uni.requireNativePlugin("lemonjk-FileSelect");
  const sysInfo = uni.getSystemInfoSync();

  const fileCallback = (result: any) => {
    if (result.code === 1001) {
      // 权限代码 1001 表示存储权限未授权
      dialog
        .confirm({
          title: t("bms.firmware.permTitle"),
          msg: t("bms.firmware.permMsg"),
        })
        .then(() => {
          fileSelectPlugin.gotoSetting();
        })
        .catch(() => {});
      return;
    }
    if (result.files && result.files.length > 0) {
      const file = result.files[0];
      // lemonjk-FileSelect 回调不返回文件大小，使用模拟值
      const mockSize = Math.floor(Math.random() * 512 * 1024) + 64 * 1024;
      onFileSelected(file.fileName || "", mockSize);
    }
  };

  if (sysInfo.osName === "android") {
    fileSelectPlugin?.showNativePicker(
      { pathScope: "/Download", mimeType: "*/*" },
      fileCallback,
    );
  } else {
    fileSelectPlugin?.showPicker(
      { pathScope: "/Download", mimeType: "*/*", utisType: ["public.data"] },
      fileCallback,
    );
  }
  // #endif
};

/**
 * 文件选中后统一状态重置（各平台回调汇聚至此）
 * @param name 文件名
 * @param size 文件大小（字节）
 */
const onFileSelected = (name: string, size: number) => {
  selectedFileName.value = name;
  selectedFileSize.value = size;
  currentStep.value = 0;
  updateSuccess.value = false;
  showProgressCard.value = false;
  progressValue.value = 0;
  displayProgressValue.value = 0;
};

/**
 * 点击开始写入固件
 * 未对接协议前先进行三段式模拟进度推进，验证 UI 流程完整性
 */
const handleStartUpdate = () => {
  if (isUpdating.value || updateSuccess.value) return;
  if (!hasFileSelected.value) {
    toast.show({ msg: t("bms.firmware.noFileSelected") });
    return;
  }

  isUpdating.value = true;
  // #ifdef MP-WEIXIN
  wx.enableAlertBeforeUnload({
    message: t("bms.firmware.updatingNoBack"),
  });
  // #endif

  progressValue.value = 0;
  displayProgressValue.value = 0;
  currentStep.value = 1;
  showProgressCard.value = true;

  // 模拟三段进度推进：校验（0→20%），写入（20→95%），收尾（95→100%）
  let phase = 0;
  let targetProgress = 20;

  simulateTimer = setInterval(() => {
    if (progressValue.value < targetProgress) {
      const step = phase === 1 ? 1.5 : phase === 2 ? 0.4 : 0.6;
      progressValue.value = Math.min(progressValue.value + step, targetProgress);
      displayProgressValue.value = Math.round(progressValue.value);

      // 随进度推进步骤条
      if (progressValue.value >= 10 && currentStep.value < 1) {
        currentStep.value = 1;
      }
      if (progressValue.value >= 20 && currentStep.value < 2) {
        currentStep.value = 2;
      }
    } else {
      if (phase === 0) {
        phase = 1;
        targetProgress = 95;
      } else if (phase === 1) {
        phase = 2;
        targetProgress = 100;
      } else {
        // 写入完成
        clearInterval(simulateTimer as ReturnType<typeof setInterval>);
        simulateTimer = null;
        displayProgressValue.value = 100;
        progressValue.value = 100;
        currentStep.value = 3;
        isUpdating.value = false;
        // #ifdef MP-WEIXIN
        wx.disableAlertBeforeUnload();
        // #endif
        updateSuccess.value = true;
        toast.success({ msg: t("bms.firmware.updateSuccess") });
      }
    }
  }, 80);
};

/**
 * 停止模拟写入（返回或取消时调用）
 */
const 停止模拟写入 = () => {
  if (simulateTimer) {
    clearInterval(simulateTimer);
    simulateTimer = null;
  }
  isUpdating.value = false;
};

/**
 * 点击取消写入或重置页面状态
 */
const handleCancelOrReset = () => {
  if (isUpdating.value) {
    toast.show({ msg: t("bms.firmware.updatingNoCancel") });
    return;
  }
  if (updateSuccess.value) {
    // 完成后重置所有状态
    updateSuccess.value = false;
    selectedFileName.value = "";
    selectedFileSize.value = 0;
    currentStep.value = 0;
    progressValue.value = 0;
    displayProgressValue.value = 0;
    showProgressCard.value = false;
    return;
  }

  // 写入中：二次确认
  dialog
    .confirm({
      title: t("bms.common.prompt"),
      msg: t("bms.firmware.cancelConfirm"),
    })
    .then(() => {
      停止模拟写入();
      currentStep.value = 0;
      progressValue.value = 0;
      displayProgressValue.value = 0;
      showProgressCard.value = false;
    })
    .catch(() => {});
};
</script>

<style scoped lang="scss">
/* 顶部渐变背景装饰层（渐变 + 浮动圆圈无法用 UnoCSS 表达，必须自定义） */
.fw-header-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 500rpx;
  background: linear-gradient(135deg, #1a2f5a 0%, #2563eb 50%, #7c3aed 100%);
  z-index: 0;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(240, 242, 245, 0) 0%, rgba(240, 242, 245, 1) 86%);
  }
}

/* 浮动装饰圆圈（GSAP 状态补间驱动 translateY） */
.fw-circle {
  position: absolute;
  border-radius: 50%;
  will-change: transform;

  &--a {
    top: -70rpx;
    right: -70rpx;
    width: 360rpx;
    height: 360rpx;
    background: rgba(255, 255, 255, 0.1);
  }

  &--b {
    bottom: 30rpx;
    left: -80rpx;
    width: 250rpx;
    height: 250rpx;
    background: rgba(255, 255, 255, 0.07);
  }
}

/* 英雄卡片玻璃态背景（backdrop-filter 无法用 UnoCSS 表达） */
.fw-hero {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border: 1.5rpx solid rgba(255, 255, 255, 0.25);
}

/* 英雄区图标容器 */
.fw-hero__icon {
  width: 100rpx;
  height: 100rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  border: 1.5rpx solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.3);
}

/* 脉冲圆环（GSAP 状态补间驱动 scale + opacity） */
.fw-pulse-ring {
  position: absolute;
  inset: -8rpx;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  will-change: transform, opacity;
}

/* 状态胶囊基础样式 */
.fw-capsule {
  padding: 6rpx 20rpx;
  border-radius: 100rpx;
  background: rgba(255, 255, 255, 0.15);
  border: 1.5rpx solid rgba(255, 255, 255, 0.22);
  width: fit-content;
  transition: background 0.3s ease, border-color 0.3s ease;

  &--updating {
    background: rgba(59, 130, 246, 0.28);
    border-color: rgba(147, 197, 253, 0.5);
  }

  &--success {
    background: rgba(34, 197, 94, 0.28);
    border-color: rgba(134, 239, 172, 0.5);
  }
}

/* 胶囊内部状态指示点 */
.fw-capsule__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);

  &--blink {
    background: #93c5fd;
  }
}

/* 文件选择触发区（虚线边框 + 点击缩放反馈） */
.fw-file-zone {
  background: #f8fafc;
  border: 2rpx dashed #e2e8f0;
  transition: all 0.25s ease;

  &:active {
    transform: scale(0.985);
  }

  &--active {
    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
    border-color: rgba(59, 130, 246, 0.4);
    border-style: solid;
  }
}

/* 文件图标容器 */
.fw-file-icon {
  width: 80rpx;
  height: 80rpx;
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

  &--active {
    background: linear-gradient(135deg, #dbeafe, #dcfce7);
  }
}

/* 进度百分比文字（tabular-nums 确保数字等宽不跳动） */
.fw-progress-pct {
  font-size: 32rpx;
  font-weight: 700;
  color: #3b82f6;
  font-variant-numeric: tabular-nums;
}

/* 样式穿透：消除 wd-card 默认左右外边距，防止与页面 px-3 叠加导致留白过宽 */
:deep(.wd-card) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}
</style>
