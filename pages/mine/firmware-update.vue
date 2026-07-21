<template>
  <layout-provider>
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar
      :title="$t('bms.firmware.title')"
      fixed
      left-arrow
      safe-area-inset-top
      custom-style="background-color: transparent !important; border-bottom: none !important;"
      @click-left="handleBack"
    />

    <!-- 顶部渐变装饰背景层（绝对定位，不影响文档流） -->
    <view class="fw-header-bg" :style="headerBgStyle">
      <!-- 浮动圆圈由 GSAP 补间驱动 translateY，will-change 已在 CSS 中声明 -->
      <view class="fw-circle fw-circle--a" :style="circleAStyle" />
      <view class="fw-circle fw-circle--b" :style="circleBStyle" />
    </view>

    <view class="fw-container wot-px-3 wot-pb-4 wot-relative wot-z-1">

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

  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
// @ts-ignore
import { onUnload, onBackPress } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useFirmwareAnimation } from "@/composables/use-firmware-animation";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useBleStore } from "@/stores/ble-store";
import { useAppStore } from "@/stores/app";
import { calcChecksum16LE, uint8ArrayToHexString } from "@/utils/bms-helper";
import { storeToRefs } from "pinia";

const { t } = useI18n();
const toast = useToast();
const dialog = useDialog();

// 初始化 Pinia 全局蓝牙与应用状态仓
const bleStore = useBleStore();
const appStore = useAppStore();
const { isBleConnected } = storeToRefs(bleStore);
const { activeThemeColor } = storeToRefs(appStore);

// ---------------------------------------------------------------------------
// 业务状态
// ---------------------------------------------------------------------------

/** 步骤条当前激活索引（0:选择 1:校验 2:写入 3:完成） */
const currentStep = ref(0);

/** 固件升级协议阶段（空闲、预备升级、数据写入、结束升级、成功） */
const otaProtocolPhase = ref<"idle" | "f0" | "f1" | "f2" | "success">("idle");

/** 已选文件名 */
const selectedFileName = ref("");

/** 已选文件大小（字节） */
const selectedFileSize = ref(0);

/** 已选文件的真实物理/临时路径 */
const selectedFilePath = ref("");

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

/** 顶部渐变背景装饰层样式，与当前品牌主题色进行物理联动 */
const headerBgStyle = computed(() => {
  const themeColor = activeThemeColor.value;
  return {
    background: `linear-gradient(135deg, #1a2f5a 0%, ${themeColor} 50%, #7c3aed 100%)`,
  };
});

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
  switch (otaProtocolPhase.value) {
    case "f0":
      return t("bms.firmware.phaseF0");
    case "f1":
      return t("bms.firmware.phaseF1");
    case "f2":
      return t("bms.firmware.phaseF2");
    case "success":
      return t("bms.firmware.phaseComplete");
    default:
      return t("bms.firmware.statusIdle");
  }
});

/** 主按钮类型（wd-button 的 type 属性） */
const mainBtnType = computed(() => {
  if (updateSuccess.value) return "success";
  return "primary";
});

/** 主按钮是否禁用 */
const mainBtnDisabled = computed(() => {
  if (isUpdating.value || updateSuccess.value) return true;
  return !hasFileSelected.value || !fileArrayBuffer.value;
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
      onFileSelected(file.name, file.size || 0, file.path || "");
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
          zIndex: 2000,
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
      onFileSelected(file.fileName || "", mockSize, file.path || file.filePath || "");
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
 * 将本地文件路径读取并转换为 base64 DataURL (符合 HTML5+ / 微信小程序规范)
 * @param path 文件本地路径
 */
const pathToBase64 = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.io.resolveLocalFileSystemURL(
      path,
      (entry) => {
        (entry as any).file(
          (file: any) => {
            const fileReader = new plus.io.FileReader();
            fileReader.onload = (evt: any) => {
              resolve(evt.target.result);
            };
            fileReader.onerror = (error: any) => {
              reject(error);
            };
            fileReader.readAsDataURL(file);
          },
          (error: any) => {
            reject(error);
          }
        );
      },
      (error) => {
        reject(error);
      }
    );
    // #endif

    // #ifdef MP-WEIXIN
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: "base64",
      success: (res) => {
        resolve("data:image/png;base64," + res.data);
      },
      fail: (error) => {
        reject(error);
      },
    });
    // #endif
  });
};

/** 内存中缓存的固件文件二进制字节流，以彻底防范在通道锁定和清空时发生文件系统 IO 挂起 */
const fileArrayBuffer = ref<ArrayBuffer | null>(null);

/**
 * 提前读取所选的物理文件内容并存入内存 ArrayBuffer 中，以防升级锁通道后发生文件系统 IO 挂起卡死
 * @param path 文件路径
 */
const readFileContentToArrayBuffer = (path: string) => {
  if (!path) return;

  pathToBase64(path)
    .then((base64) => {
      const base64Data = base64.split("base64,")[1];
      if (!base64Data) {
        throw new Error("Invalid base64 format");
      }
      const arrayBuffer = uni.base64ToArrayBuffer(base64Data);
      fileArrayBuffer.value = arrayBuffer;
      selectedFileSize.value = arrayBuffer.byteLength;
      console.log("[OTA] 文件读取并转换为 ArrayBuffer 成功，大小:", arrayBuffer.byteLength);
    })
    .catch((err) => {
      console.error("[OTA] 文件转换 base64/ArrayBuffer 异常:", err);
      toast.error(t("bms.firmware.readFailed"));
    });
};

/**
 * 文件选中后统一状态重置（各平台回调汇聚至此）
 * @param name 文件名
 * @param size 文件大小（字节）
 * @param path 物理路径
 */
const onFileSelected = (name: string, size: number, path: string) => {
  selectedFileName.value = name;
  selectedFileSize.value = size;
  selectedFilePath.value = path;
  currentStep.value = 0;
  otaProtocolPhase.value = "idle";
  updateSuccess.value = false;
  showProgressCard.value = false;
  progressValue.value = 0;
  displayProgressValue.value = 0;
  fileArrayBuffer.value = null; // 重置之前已读的缓存

  // 立即发起后台文件加载，提前在内存中准备好数据
  readFileContentToArrayBuffer(path);
};

/**
 * 组装分包升级写入所需的 0xF1 物理帧
 * 格式：0xAA + 0xF1 + 0x42 + 地址(2字节小端) + 数据(64字节) + 校验和(2字节小端)
 */
const buildF1Frame = (addr: number, chunk: Uint8Array): string => {
  const frame = new Uint8Array(71);
  frame[0] = 0xaa;
  frame[1] = 0xf1;
  frame[2] = 0x42; // 66 字节数据段长度
  
  // 地址 2 字节小端
  frame[3] = addr & 0xff;
  frame[4] = (addr >> 8) & 0xff;
  
  // 数据：64字节。不足 64 字节的部分用 0xff 填充
  frame.set(chunk, 5);
  if (chunk.length < 64) {
    for (let i = 5 + chunk.length; i < 69; i++) {
      frame[i] = 0xff;
    }
  }

  // 累加校验和（从 CMD 到数据段末尾）
  const { sumL, sumH } = calcChecksum16LE(frame, 1, 69);
  frame[69] = sumL;
  frame[70] = sumH;

  return uint8ArrayToHexString(frame, "");
};

/**
 * 物理执行固件升级状态机
 */
const executeFirmwareFlash = () => {
  isUpdating.value = true;
  showProgressCard.value = true;
  progressValue.value = 0;
  displayProgressValue.value = 0;
  currentStep.value = 1; // 校验/初始化阶段
  otaProtocolPhase.value = "f0";

  // #ifdef MP-WEIXIN
  wx.enableAlertBeforeUnload({
    message: t("bms.firmware.updatingNoBack"),
  });
  // #endif

  // 挂起其它遥测轮询，锁定升级通道
  bleStore.isOtaUpdating = true;

  // 读取文件 ArrayBuffer 并执行写入分发
  const onFileReadSuccess = async (arrayBuffer: ArrayBuffer) => {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      handleFlashError(new Error(t("bms.firmware.fileEmpty")));
      return;
    }

    // 更新真实大小
    selectedFileSize.value = arrayBuffer.byteLength;

    try {
      // ① 预备升级 (0xF0)
      progressValue.value = 5;
      displayProgressValue.value = 5;
      console.log("[OTA] 发送预备升级帧 F0");
      // 发送：AA F0 00 F0 00，等待应答 CMD=0xF0
      const resF0 = await bleStore.sendOtaFrame("AAF000F000", 0xf0, 5000);
      
      // 应答：AA F0 01 [status] [sumL] [sumH]，判断第四字节是否为 0x01
      if (resF0.length < 4 || resF0[3] !== 0x01) {
        throw new Error(t("bms.firmware.deviceNotReady"));
      }

      // 进入写入包步骤
      currentStep.value = 2; // 写入阶段
      otaProtocolPhase.value = "f1";
      progressValue.value = 10;
      displayProgressValue.value = 10;

      // ② 循环发送数据包片
      const fileData = new Uint8Array(arrayBuffer);
      const totalSize = fileData.length;
      const chunkSize = 64;
      const totalChunks = Math.ceil(totalSize / chunkSize);

      console.log(`[OTA] 文件加载成功，共 ${totalSize} 字节，切分为 ${totalChunks} 个分片进行传输`);

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        // 安全防护：在发送分包前检查蓝牙是否突然掉线
        if (!isBleConnected.value) {
          throw new Error(t("bms.ble.connectionLost"));
        }

        const startOffset = chunkIdx * chunkSize;
        const endOffset = Math.min(startOffset + chunkSize, totalSize);
        const chunk = fileData.slice(startOffset, endOffset);

        const addr = startOffset;
        const commandHex = buildF1Frame(addr, chunk);

        // 单个分片包最大重试发送 3 次
        let success = false;
        let retryCount = 0;
        const maxRetry = 3;

        while (!success && retryCount < maxRetry) {
          try {
            // 发送数据，等待 0xF1 成功应答 (应答：AA F1 00 xx xx)
            await bleStore.sendOtaFrame(commandHex, 0xf1, 3000);
            success = true;
          } catch (err) {
            retryCount++;
            console.warn(`[OTA] 分片 [${chunkIdx + 1}/${totalChunks}] 第 ${retryCount} 次发送失败/超时:`, err);
            if (retryCount >= maxRetry) {
              throw err; // 重试用尽，抛出错误打断整个升级
            }
            // 每次重试前增加 100ms 物理避让延迟
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        // 更新进度百分比 (范围 10% - 95%)
        const pct = 10 + Math.round((chunkIdx + 1) / totalChunks * 85);
        progressValue.value = pct;
        displayProgressValue.value = pct;

        // 每次物理分包下发后强制等待 50ms 冷却，防板端接收芯片写 Flash 缓存溢出
        await new Promise((r) => setTimeout(r, 50));
      }

      // ③ 升级结束 (0xF2)
      console.log("[OTA] 固件包全部传送完毕，发送升级结束帧 F2");
      progressValue.value = 98;
      displayProgressValue.value = 98;
      otaProtocolPhase.value = "f2";

      // 发送：AA F2 00 F2 00，等待应答 CMD=0xF2 (应答：AA F2 00 F2 00)
      await bleStore.sendOtaFrame("AAF200F200", 0xf2, 5000);

      // 固件升级完美收网
      displayProgressValue.value = 100;
      progressValue.value = 100;
      currentStep.value = 3;
      otaProtocolPhase.value = "success";
      isUpdating.value = false;
      updateSuccess.value = true;
      bleStore.isOtaUpdating = false;

      // #ifdef MP-WEIXIN
      wx.disableAlertBeforeUnload();
      // #endif

      toast.success({ msg: t("bms.firmware.updateSuccess") });

    } catch (flashErr: any) {
      handleFlashError(flashErr);
    }
  };

  if (!fileArrayBuffer.value || fileArrayBuffer.value.byteLength === 0) {
    handleFlashError(new Error(t("bms.firmware.readFailed")));
    return;
  }

  // 此时已经准备好，直接在内存中触发升级包发送状态机
  onFileReadSuccess(fileArrayBuffer.value);
};

/**
 * 升级异常报错通用出口
 */
const handleFlashError = (err: Error) => {
  console.error("[OTA] 固件升级执行异常被捕获:", err);
  
  isUpdating.value = false;
  bleStore.isOtaUpdating = false;
  otaProtocolPhase.value = "idle";

  // #ifdef MP-WEIXIN
  wx.disableAlertBeforeUnload();
  // #endif

  const errMsg = err.message || String(err);
  dialog.alert({
    title: t("bms.firmware.updateFailedTitle"),
    msg: errMsg,
    zIndex: 2000,
  });
};

/**
 * 点击开始写入固件
 */
const handleStartUpdate = () => {
  if (isUpdating.value || updateSuccess.value) return;
  if (!hasFileSelected.value || !selectedFilePath.value) {
    toast.show({ msg: t("bms.firmware.noFileSelected") });
    return;
  }

  // 检查蓝牙连接状态
  if (!isBleConnected.value) {
    toast.error(t("bms.ble.disconnected"));
    return;
  }

  // 二次确认是否开始升级
  dialog
    .confirm({
      title: t("bms.common.prompt"),
      msg: t("bms.firmware.startUpdateConfirm"),
      zIndex: 2000,
    })
    .then(() => {
      executeFirmwareFlash();
    })
    .catch(() => {});
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
    selectedFilePath.value = "";
    currentStep.value = 0;
    otaProtocolPhase.value = "idle";
    progressValue.value = 0;
    displayProgressValue.value = 0;
    showProgressCard.value = false;
    fileArrayBuffer.value = null;
    return;
  }

  // 写入中：二次确认
  dialog
    .confirm({
      title: t("bms.common.prompt"),
      msg: t("bms.firmware.cancelConfirm"),
      zIndex: 2000,
    })
    .then(() => {
      isUpdating.value = false;
      bleStore.isOtaUpdating = false;
      currentStep.value = 0;
      otaProtocolPhase.value = "idle";
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

/* 样式穿透：定制透明导航栏的标题和返回箭头为白色 */
:deep(.wd-navbar) {
  background-color: transparent !important;
}

:deep(.wd-navbar__title) {
  color: #ffffff !important;
}

:deep(.wd-navbar__arrow) {
  color: #ffffff !important;
}

/* 主内容容器顶部预留出状态栏加导航栏的安全高度，防止被透明导航栏遮挡 */
.fw-container {
  padding-top: calc(var(--status-bar-height) + 44px + 16px);
}

/* ==========================================================================
   暗黑模式 (Dark Mode) 适配
   ========================================================================== */
:deep(.wot-theme-dark) {
  /* 顶部装饰渐变背景底层淡出遮罩：淡出到暗黑大背景 #121212 */
  .fw-header-bg {
    &::after {
      background: linear-gradient(to bottom, rgba(18, 18, 18, 0) 0%, #121212 86%) !important;
    }
  }

  /* 文件选择触发区暗色适配 */
  .fw-file-zone {
    background: #1e1e1e !important;
    border-color: #333333 !important;

    &--active {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(20, 83, 45, 0.25) 100%) !important;
      border-color: rgba(59, 130, 246, 0.3) !important;
    }
  }

  /* 文件图标容器暗色适配 */
  .fw-file-icon {
    background: #2a2a2a !important;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.3) !important;

    &--active {
      background: linear-gradient(135deg, #1e293b, #14532d) !important;
    }
  }
}
</style>
