<template>
  <layout-provider>
    <!-- 自定义顶部导航栏 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.auth.title')" fixed placeholder left-arrow safe-area-inset-top @click-left="goBack" />

    <view class="wot-px-3 wot-py-4 page-body-animate">
      <!-- 核心授权状态指示卡片（扁平三态版） -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card class="wot-mb-4">
        <view class="wot-flex wot-items-center wot-py-4 wot-px-2">
          <!-- 状态圆环与图标（三色动态联动） -->
          <view
            :class="[
              isAuthorized
                ? 'wot-bg-green-50 dark:wot-bg-green-950/30'
                : authEndTime === 0
                  ? 'wot-bg-slate-100 dark:wot-bg-zinc-800'
                  : 'wot-bg-orange-50 dark:wot-bg-orange-950/30',
            ]"
            class="status-circle-small wot-flex wot-items-center wot-justify-center wot-rounded-full wot-mr-4"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon
              :css-icon="
                isAuthorized
                  ? 'i-ri-shield-check-fill'
                  : authEndTime === 0
                    ? 'i-ri-shield-user-line'
                    : 'i-ri-shield-flash-line'
              "
              :color="isAuthorized ? '#07c160' : authEndTime === 0 ? '#80868b' : '#ff9900'"
              size="26px"
            />
          </view>

          <!-- 状态与期限右侧排版 -->
          <view class="wot-flex wot-flex-col wot-justify-center">
            <!-- 状态主文案（自适应细分状态） -->
            <text class="wot-text-title-medium wot-font-bold wot-text-text-main wot-mb-1">
              {{ statusText }}
            </text>

            <!-- 时限说明气泡标签贴纸（三色气泡） -->
            <view class="wot-flex">
              <view
                :class="[
                  isAuthorized
                    ? 'wot-bg-green-100 wot-text-green-700 dark:wot-bg-green-950/50 dark:wot-text-green-400'
                    : authEndTime === 0
                      ? 'wot-bg-slate-200 wot-text-slate-600 dark:wot-bg-zinc-800 dark:wot-text-zinc-400'
                      : 'wot-bg-orange-100 wot-text-orange-700 dark:wot-bg-orange-950/50 dark:wot-text-orange-400',
                ]"
                class="wot-px-2.5 wot-py-0.5 wot-rounded wot-text-caption wot-font-semibold"
              >
                {{ expirationText }}
              </view>
            </view>
          </view>
        </view>
      </wd-card>

      <!-- 设备硬件码复制卡片 -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card class="wot-mb-4" :title="$t('bms.auth.deviceCode')">
        <view
          class="wot-flex wot-flex-col wot-items-center wot-py-6 wot-bg-filled-main wot-rounded-xl"
          @click="copyDeviceCode"
        >
          <!-- 硬件码内容排版 -->
          <text class="device-code-value wot-font-black wot-text-primary wot-tracking-widest wot-pointer-events-none">
            {{ codeDev }}
          </text>
          <!-- 点击复制操作引导文案 -->
          <view class="wot-flex wot-items-center wot-mt-3 wot-gap-1 wot-pointer-events-none">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-ri-file-copy-2-line" size="14px" color="#80868b" />
            <text class="wot-text-caption wot-text-text-secondary">{{ $t("bms.auth.copyHint") }}</text>
          </view>
        </view>
      </wd-card>

      <!-- 激活指令输入与确认按钮卡片 -->
      <!-- Source: uni_modules/wot-ui/components/wd-card/wd-card.vue -->
      <wd-card class="wot-mb-4" :title="$t('bms.auth.authCode')">
        <view class="wot-py-2">
          <!-- 授权激活输入框 -->
          <!-- Source: uni_modules/wot-ui/components/wd-input/wd-input.vue -->
          <wd-input
            v-model="codeCheck"
            type="text"
            clearable
            :placeholder="$t('bms.auth.inputPlaceholder')"
            :maxlength="8"
            custom-style="margin-bottom: 24px;"
          />

          <!-- 激活保存大按钮 -->
          <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
          <wd-button block type="primary" size="large" @click="onCheckCode">
            {{ $t("bms.auth.activateBtn") }}
          </wd-button>
        </view>
      </wd-card>
    </view>

    <!-- 挂载反馈实例 -->
    <!-- Source: uni_modules/wot-ui/components/wd-toast/wd-toast.vue -->
    <wd-toast />
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </layout-provider>
</template>

<script setup lang="ts">
// 声明 html5+ 原生桥接命名空间变量，防止 TS 编译器编译时报错
declare const plus: any;

import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
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

// 获取全局用户状态仓并进行解构响应式关联
const userStore = useUserStore();
const { isAuthorized, authEndTime, authType } = storeToRefs(userStore);

// 页面挂载时初始化设备识别特征码
onMounted(() => {
  let devCode = uni.getStorageSync("code_dev");
  if (!devCode) {
    // 缓存为空则自动产生九位大写随机序列保存到本地作为硬件标识
    devCode = generateRandomDeviceCode();
    uni.setStorageSync("code_dev", devCode);
  }
  codeDev.value = devCode;
});

// 计算属性：自适应算出当前剩余期限说明文案（纯字符串拼接规避大括号插值语法）
const expirationText = computed(() => {
  if (!isAuthorized.value) {
    // 若从未激活过，返回“待激活”，否则返回“已过期”
    return authEndTime.value === 0 ? t("bms.auth.toBeActivated") : t("bms.auth.expired");
  }

  // 永久授权类型直接返回常驻说明文案
  if (authType.value === 1) {
    return t("bms.auth.permanent");
  }

  // 换算当前距离截止时刻的剩余天数
  const timeDifference = authEndTime.value - Date.now();
  const remainingDays = Math.max(0, Math.ceil(timeDifference / (1000 * 60 * 60 * 24)));

  return t("bms.auth.authorizedTime") + remainingDays + t("bms.auth.days");
});

// 计算属性：自适应细分展示授权主状态文案
const statusText = computed(() => {
  if (isAuthorized.value) {
    return t("bms.auth.statusAuthorized"); // 已授权激活
  }
  // 未激活状态细分：从来没有进行过授权激活，或者因为时间到期而过期
  return authEndTime.value === 0
    ? t("bms.auth.statusNotActivated") // 未激活
    : t("bms.auth.statusExpired"); // 授权已过期
});

// 安全返回上一页面
const goBack = () => {
  uni.navigateBack();
};

// 一键将特征硬件识别码写入剪切板，并触发延迟权限回读检测
const copyDeviceCode = () => {
  const textToCopy = codeDev.value || uni.getStorageSync("code_dev") || "UNKNOWN";
  console.log("开始复制设备识别码:", textToCopy);

  // 执行 uni 官方剪贴板写入 API
  uni.setClipboardData({
    data: textToCopy,
    showToast: false, // 拦截微信小程序默认提示
    success: () => {
      // 成功写入回调
      console.log("uni.setClipboardData 成功触发");
    },
    fail: (err) => {
      // 写入失败回调
      console.error("uni.setClipboardData 复制失败:", err);
    },
  });

  // 延迟校验回读剪切板数据，确保写入成功且未被系统拦截
  verifyClipboard(textToCopy);
};

// 延迟 200 毫秒从系统剪贴板回读并比对，判定写入权限是否被系统拦截
const verifyClipboard = (expectedText: string) => {
  setTimeout(() => {
    uni.getClipboardData({
      success: (res) => {
        // 比对读取的数据与期望的设备码是否一致
        if (res.data !== expectedText) {
          console.error("剪切板内容校验失败，预期值:", expectedText, "实际值:", res.data);
          showPermissionDialog();
        } else {
          console.log("剪贴板校验匹配成功，弹出复制成功反馈");
          toast.show({
            msg: t("bms.auth.copied"),
          });
        }
      },
      fail: (err) => {
        console.error("回读剪贴板数据失败，可能未获系统授权:", err);
        showPermissionDialog();
      },
    });
  }, 200);
};

// 弹出权限未开启确认对话框，引导去系统设置页
const showPermissionDialog = () => {
  dialog
    .confirm({
      title: t("bms.auth.clipboardPermissionTitle"),
      msg: t("bms.auth.clipboardPermissionMsg"),
      confirmButtonText: t("bms.common.goSettings"),
      cancelButtonText: t("bms.common.cancel"),
    })
    .then(() => {
      openSystemSettings();
    })
    .catch(() => {
      // 用户取消
    });
};

// 引导并跳转至系统设置页（分平台自适应适配）
const openSystemSettings = () => {
  // #ifdef APP-PLUS
  try {
    const systemInfo = uni.getSystemInfoSync();
    const osName = (systemInfo.osName || "").toLowerCase();
    const platform = (systemInfo.platform || "").toLowerCase();
    if (platform === "android" || osName === "harmonyos" || platform === "harmonyos") {
      const main = plus.android.runtimeMainActivity();
      const Intent = plus.android.importClass("android.content.Intent");
      const Settings = plus.android.importClass("android.provider.Settings");
      const Uri = plus.android.importClass("android.net.Uri");
      const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      const uri = Uri.fromParts("package", main.getPackageName(), null);
      intent.setData(uri);
      main.startActivity(intent);
    } else if (platform === "ios") {
      const UIApplication = plus.ios.importClass("UIApplication");
      const NSURL = plus.ios.importClass("NSURL");
      const sharedApplication = UIApplication.sharedApplication();
      const settingsURL = NSURL.URLWithString("app-settings:");
      if (sharedApplication.canOpenURL(settingsURL)) {
        sharedApplication.openURL(settingsURL);
      }
    }
  } catch (err) {
    console.error("反射跳转系统设置失败:", err);
  }
  // #endif

  // #ifdef MP-WEIXIN
  uni.openSetting();
  // #endif
};

// 激活指令对账与校验确认核心逻辑
const onCheckCode = () => {
  // 清洗用户填写的校验串并进行大写规格化
  const cleanInput = codeCheck.value.trim().toUpperCase();
  if (cleanInput.length !== 8) {
    toast.show({
      msg: t("bms.auth.failed"),
    });
    return;
  }

  // 离线反转运算出该激活序列中所内蕴的时效长短与级别类型
  const decoded = decodeAuthCode(codeDev.value.length, cleanInput);
  if (!decoded) {
    toast.show({
      msg: t("bms.auth.failed"),
    });
    return;
  }

  const { time, type } = decoded;

  // 根据当前物理特征码、运算出的时间与级别类型重新在本地演算出比对码
  const expectedCode = calculateAuthCode(codeDev.value, time, type);

  // 严格比对生成的标准校验序列与用户输入串
  if (expectedCode.toUpperCase() === cleanInput) {
    // 匹配成功：计算截止时刻时间戳并更新状态持久化
    const endTimeStamp = calculateEndTime(codeDev.value.length, time);
    userStore.saveAuthInfo(endTimeStamp, time, type);

    // 弹出绿色尊贵成功勾状态气泡
    toast.success(t("bms.auth.success"));

    // 安全机制：为杜绝该激活码被多机或同机重放激活，验证通过后即刻废除并重新演变一个全新的设备识别码
    const nextDevCode = generateRandomDeviceCode();
    uni.setStorageSync("code_dev", nextDevCode);
    codeDev.value = nextDevCode;

    // 清空历史填写框
    codeCheck.value = "";
  } else {
    // 验证失败弹出气泡提醒
    toast.show({
      msg: t("bms.auth.failed"),
    });
  }
};
</script>

<style scoped lang="scss">
/* 状态勋章外包圆环样式（扁平紧凑版） */
.status-circle-small {
  width: 52px;
  height: 52px;
  transition: background-color 0.3s ease;
}



/* 硬件设备特征码专属大字体 */
.device-code-value {
  font-size: 32px;
}

/* 样式穿透覆盖卡片默认的左右外边距，防止与主页面边距叠加导致留白过宽 */
:deep(.wd-card) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}
</style>
