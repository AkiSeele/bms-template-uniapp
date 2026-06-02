<template>
  <!-- 全局配置提供者，动态接收当前主题与自定义 CSS 主题色变量 -->
  <wd-config-provider :theme="actualTheme" :theme-vars="themeVars">
    <!-- 独立的背景容器，铺垫明暗切换的平滑颜色过渡，避免影响页面内 fixed 组件的定位上下文 -->
    <view 
      :class="[actualTheme === 'dark' ? 'wot-theme-dark bg-dark-gradient' : 'wot-theme-light bg-light-gradient']" 
      class="layout-background"
    />
    
    <!-- 内容容器，剥离 transition，恢复 fixed 组件的自然视口参照 -->
    <view class="layout-provider-content wot-min-h-screen">
      <!-- 插槽投影承载具体的页面正文内容 -->
      <slot />



      <!-- 全局「连接/自动连接中」Popup：底部浮动加载层 -->
      <!-- Source: uni_modules/wot-ui/components/wd-popup/wd-popup.vue -->
      <wd-popup
        v-model="showConnectingPopup"
        position="bottom"
        :close-on-click-modal="false"
        :round="true"
        safe-area-inset-bottom
        :z-index="2000"
        custom-style="background: transparent; box-shadow: none; z-index: 2000;"
      >
        <view class="connecting-popup wot-flex wot-flex-col wot-items-center wot-py-8 wot-px-6 wot-relative">
          <!-- 取消自动连接按钮 (仅在自动连接搜索阶段展示) -->
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <view
            v-if="isAutoConnecting && isAutoConnectingCancelable"
            class="wot-absolute wot-right-4 wot-top-4 wot-p-1 wot-cursor-pointer"
            @click="triggerCancelAutoConnect"
          >
            <wd-icon css-icon="i-ri-close-line" size="20px" color="#858585" />
          </view>
          <!-- 环形旋转加载组件 -->
          <view class="connect-spinner wot-mb-4" />
          <!-- 加载状态提示词 -->
          <text class="wot-text-base wot-font-medium wot-text-[#202124]">
            {{ connectingText }}
          </text>
        </view>
      </wd-popup>

      <!-- 全局「连接失败」Popup：居中弹出，展示失败具体原因 -->
      <!-- Source: uni_modules/wot-ui/components/wd-popup/wd-popup.vue -->
      <wd-popup
        v-model="isConnectionErrorVisible"
        position="center"
        :close-on-click-modal="true"
        :modal="true"
        :round="true"
        :z-index="2000"
        custom-style="width: 82%; padding: 28px 24px 20px; z-index: 2000;"
      >
        <view class="wot-flex wot-flex-col wot-items-center">
          <view class="error-icon-ring wot-flex wot-items-center wot-justify-center wot-rounded-full wot-mb-3">
            <wd-icon css-icon="i-ri-close-circle-fill" size="36px" color="#ea4335" />
          </view>
          <text class="wot-text-base wot-font-bold wot-text-[#202124] wot-mb-2">
            {{ $t("bms.ble.connectFailed") }}
          </text>
          <text class="wot-text-sm wot-text-[#5f6368] wot-text-center">{{ connectionError }}</text>
          <view class="wot-mt-6 wot-w-full">
            <wd-button block type="primary" @click="isConnectionErrorVisible = false">
              {{ $t("bms.common.confirm") }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
    </view>
  </wd-config-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";
import { useBleStore } from "@/stores/ble-store";
import { LIGHT_THEME_VARS, DARK_THEME_VARS } from "@/config/theme";

// 获取全局应用层状态 store
const appStore = useAppStore();
const { actualTheme } = storeToRefs(appStore);

// 获取全局低功耗蓝牙通信状态 store，共享连接中与失败提示状态
const bleStore = useBleStore();
const {
  isConnecting,
  connectingDeviceName,
  connectionError,
  isConnectionErrorVisible,
  isAutoConnecting,
  isAutoConnectingCancelable,
} = storeToRefs(bleStore);

const { triggerCancelAutoConnect } = bleStore;

const { t } = useI18n();

// 计算属性：动态控制全局连接 Popup 的可见性（合并自动连接与普通连接）
const showConnectingPopup = computed(() => isConnecting.value || isAutoConnecting.value);

// 计算属性：根据当前的具体连接阶段，动态渲染对应的文案提示
const connectingText = computed(() => {
  if (isAutoConnecting.value) {
    return t("bms.ble.autoConnecting");
  }
  return t("bms.ble.connectingPrefix") + connectingDeviceName.value + t("bms.ble.connectingSuffix");
});

// 根据当前明暗主题，动态切换并覆盖自定义主题配色
// 因三方组件库的 ConfigProviderThemeVars 类型声明限制，在此强制使用 as any 类型断言进行兜底，以顺利通过 IDE 静态校验
const themeVars = computed(() => {
  const baseVars = actualTheme.value === "dark" ? DARK_THEME_VARS : LIGHT_THEME_VARS;
  
  // 智能混入用户在“项目设置”中自定义的色彩参数，若为空则沿用默认主题配置
  const customVars: Record<string, string> = {};
  if (appStore.customThemeColor) {
    customVars["colorTheme"] = appStore.customThemeColor;
    customVars["primaryColor"] = appStore.customThemeColor;
    customVars["primary6"] = appStore.customThemeColor;
  }
  if (appStore.customWarningColor) {
    customVars["warningColor"] = appStore.customWarningColor;
    customVars["colorWarning"] = appStore.customWarningColor;
  }
  if (appStore.customDangerColor) {
    customVars["dangerColor"] = appStore.customDangerColor;
    customVars["colorDanger"] = appStore.customDangerColor;
  }
  if (appStore.customSuccessColor) {
    customVars["successColor"] = appStore.customSuccessColor;
    customVars["colorSuccess"] = appStore.customSuccessColor;
  }
  
  return {
    ...baseVars,
    ...customVars,
  } as any;
});
</script>

<style scoped>
/* 独立的背景容器，固定在视口底层，不影响子元素的 CSS containing block 参照系 */
.layout-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  transition: background-color 0.35s ease-in-out;
}

/* 内容层容器，确保正常呈现页面元素及拥有正常的 min-height */
.layout-provider-content {
  box-sizing: border-box;
}

/* 亮色模式的高端微渐变灰白色大背景 */
.bg-light-gradient {
  background-color: #f5f6f8;
}

/* 暗色模式的防眩光沉浸式微渐变深炭黑大背景 */
.bg-dark-gradient {
  background-color: #121212;
}

/* 确保深色卡片或特定 wot 选择器在此环境下也有平滑的渐变过渡 */
:deep(.header-card),
:deep(.battery-card),
:deep(.param-card),
:deep(.device-card),
:deep(.user-card),
:deep(.wot-bg-filled-oppo) {
  transition: background-color 0.35s ease-in-out, border-color 0.35s ease-in-out, box-shadow 0.35s ease-in-out !important;
}

/* 全局「连接中」Popup 背景样式 */
.connecting-popup {
  background: #ffffff;
  border-radius: 20px;
  margin: 0 12px 12px;
}

/* 全局连接中高帧率旋转环形 */
.connect-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #e8f0fe;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 错误 Popup 图标背景圆 */
.error-icon-ring {
  width: 64px;
  height: 64px;
  background-color: #fce8e6;
  border-radius: 50%;
}
</style>
