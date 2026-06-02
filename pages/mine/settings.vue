<template>
  <layout-provider>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.settings.title')" fixed placeholder left-arrow safe-area-inset-top @click-left="goBack" />

    <view class="wot-px-3 wot-py-4 wot-flex wot-flex-col wot-gap-4">
      <!-- 全站视觉配色配置卡片 (主题色、警告色、成功色、危险色) -->
      <view class="config-card wot-bg-white wot-rounded-2xl wot-p-3.5 wot-border wot-border-solid wot-border-[#e0e3eb] wot-shadow-sm">
        <view class="wot-flex wot-flex-col wot-mb-4">
          <text class="wot-text-sm wot-font-bold wot-text-[#202124]">{{ $t("bms.settings.colorConfig") }}</text>
        </view>

        <view class="wot-flex wot-flex-col wot-gap-4">
          <!-- 1. 主题主色配置项 -->
          <view class="color-item-wrapper wot-flex wot-flex-col wot-gap-1.5">
            <view class="wot-flex wot-items-center wot-justify-between">
              <text class="wot-text-xs wot-font-semibold wot-text-[#202124]">{{ $t("bms.settings.themeColor") }}</text>
              <!-- 实时色块预览 -->
              <view class="color-preview wot-rounded-md" :style="{ backgroundColor: themeColor || '#0052d9' }"></view>
            </view>
            <view class="wot-flex wot-items-center wot-bg-[#f1f3f4] wot-rounded-lg wot-px-3 wot-py-1.5">
              <input v-model="themeColor" placeholder="#0052d9" placeholder-class="settings-placeholder" class="settings-input wot-flex-1 wot-text-xs wot-text-[#202124]" />
              <view v-if="themeColor" class="clear-btn wot-flex wot-items-center wot-justify-center wot-p-0.5" @click="themeColor = ''">
                <wd-icon css-icon="i-ri-close-fill" size="14px" color="#80868b" />
              </view>
            </view>
            <!-- 预设色块选项 -->
            <view class="presets-row wot-flex wot-items-center wot-gap-1.5 wot-flex-wrap wot-mt-0.5">
              <view 
                v-for="color in themePresets" 
                :key="color" 
                class="preset-chip wot-rounded-full wot-flex wot-items-center wot-justify-center"
                :style="{ backgroundColor: color, boxShadow: themeColor === color ? `0 0 0 1.5px #ffffff, 0 0 0 3px ${color}` : 'none' }"
                @click="themeColor = color"
              >
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon v-if="themeColor === color" css-icon="i-ri-check-line" size="12px" color="#fff" />
              </view>
            </view>
          </view>

          <!-- 2. 警告状态色配置项 -->
          <view class="color-item-wrapper wot-flex wot-flex-col wot-gap-1.5">
            <view class="wot-flex wot-items-center wot-justify-between">
              <text class="wot-text-xs wot-font-semibold wot-text-[#202124]">{{ $t("bms.settings.warningColor") }}</text>
              <!-- 实时色块预览 -->
              <view class="color-preview wot-rounded-md" :style="{ backgroundColor: warningColor || '#e37318' }"></view>
            </view>
            <view class="wot-flex wot-items-center wot-bg-[#f1f3f4] wot-rounded-lg wot-px-3 wot-py-1.5">
              <input v-model="warningColor" placeholder="#e37318" placeholder-class="settings-placeholder" class="settings-input wot-flex-1 wot-text-xs wot-text-[#202124]" />
              <view v-if="warningColor" class="clear-btn wot-flex wot-items-center wot-justify-center wot-p-0.5" @click="warningColor = ''">
                <wd-icon css-icon="i-ri-close-fill" size="14px" color="#80868b" />
              </view>
            </view>
            <!-- 预设色块选项 -->
            <view class="presets-row wot-flex wot-items-center wot-gap-1.5 wot-flex-wrap wot-mt-0.5">
              <view 
                v-for="color in warningPresets" 
                :key="color" 
                class="preset-chip wot-rounded-full wot-flex wot-items-center wot-justify-center"
                :style="{ backgroundColor: color, boxShadow: warningColor === color ? `0 0 0 1.5px #ffffff, 0 0 0 3px ${color}` : 'none' }"
                @click="warningColor = color"
              >
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon v-if="warningColor === color" css-icon="i-ri-check-line" size="12px" color="#fff" />
              </view>
            </view>
          </view>

          <!-- 3. 成功状态色配置项 -->
          <view class="color-item-wrapper wot-flex wot-flex-col wot-gap-1.5">
            <view class="wot-flex wot-items-center wot-justify-between">
              <text class="wot-text-xs wot-font-semibold wot-text-[#202124]">{{ $t("bms.settings.successColor") }}</text>
              <!-- 实时色块预览 -->
              <view class="color-preview wot-rounded-md" :style="{ backgroundColor: successColor || '#2ba471' }"></view>
            </view>
            <view class="wot-flex wot-items-center wot-bg-[#f1f3f4] wot-rounded-lg wot-px-3 wot-py-1.5">
              <input v-model="successColor" placeholder="#2ba471" placeholder-class="settings-placeholder" class="settings-input wot-flex-1 wot-text-xs wot-text-[#202124]" />
              <view v-if="successColor" class="clear-btn wot-flex wot-items-center wot-justify-center wot-p-0.5" @click="successColor = ''">
                <wd-icon css-icon="i-ri-close-fill" size="14px" color="#80868b" />
              </view>
            </view>
            <!-- 预设色块选项 -->
            <view class="presets-row wot-flex wot-items-center wot-gap-1.5 wot-flex-wrap wot-mt-0.5">
              <view 
                v-for="color in successPresets" 
                :key="color" 
                class="preset-chip wot-rounded-full wot-flex wot-items-center wot-justify-center"
                :style="{ backgroundColor: color, boxShadow: successColor === color ? `0 0 0 1.5px #ffffff, 0 0 0 3px ${color}` : 'none' }"
                @click="successColor = color"
              >
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon v-if="successColor === color" css-icon="i-ri-check-line" size="12px" color="#fff" />
              </view>
            </view>
          </view>

          <!-- 4. 危险状态色配置项 -->
          <view class="color-item-wrapper wot-flex wot-flex-col wot-gap-1.5">
            <view class="wot-flex wot-items-center wot-justify-between">
              <text class="wot-text-xs wot-font-semibold wot-text-[#202124]">{{ $t("bms.settings.dangerColor") }}</text>
              <!-- 实时色块预览 -->
              <view class="color-preview wot-rounded-md" :style="{ backgroundColor: dangerColor || '#d54941' }"></view>
            </view>
            <view class="wot-flex wot-items-center wot-bg-[#f1f3f4] wot-rounded-lg wot-px-3 wot-py-1.5">
              <input v-model="dangerColor" placeholder="#d54941" placeholder-class="settings-placeholder" class="settings-input wot-flex-1 wot-text-xs wot-text-[#202124]" />
              <view v-if="dangerColor" class="clear-btn wot-flex wot-items-center wot-justify-center wot-p-0.5" @click="dangerColor = ''">
                <wd-icon css-icon="i-ri-close-fill" size="14px" color="#80868b" />
              </view>
            </view>
            <!-- 预设色块选项 -->
            <view class="presets-row wot-flex wot-items-center wot-gap-1.5 wot-flex-wrap wot-mt-0.5">
              <view 
                v-for="color in dangerPresets" 
                :key="color" 
                class="preset-chip wot-rounded-full wot-flex wot-items-center wot-justify-center"
                :style="{ backgroundColor: color, boxShadow: dangerColor === color ? `0 0 0 1.5px #ffffff, 0 0 0 3px ${color}` : 'none' }"
                @click="dangerColor = color"
              >
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon v-if="dangerColor === color" css-icon="i-ri-check-line" size="12px" color="#fff" />
              </view>
            </view>
          </view>
        </view>
      </view>


    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useToast } from "@/uni_modules/wot-ui";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";

// 初始化 wot-ui toast 反馈与 i18n
const toast = useToast();
const { t } = useI18n();

// 获取全局 appStore 配色管理器
const appStore = useAppStore();

// 配置数据双向绑定状态
// ------------------------------------------------------------
const themeColor = ref(appStore.customThemeColor);
const warningColor = ref(appStore.customWarningColor);
const successColor = ref(appStore.customSuccessColor);
const dangerColor = ref(appStore.customDangerColor);

// ------------------------------------------------------------
// 预设配色大色板定义 (选用宝石及莫兰迪色系，禁直出高饱和)
// ------------------------------------------------------------
const themePresets = ["#0052d9", "#1a73e8", "#0f9d58", "#f4b400", "#7c4dff"];
const warningPresets = ["#e37318", "#f4b400", "#ff9800", "#e67e22"];
const successPresets = ["#2ba471", "#0f9d58", "#12b886", "#2ecc71"];
const dangerPresets = ["#d54941", "#db4437", "#ff357c", "#e74c3c"];

/**
 * 返回上一级
 */
const goBack = () => {
  uni.navigateBack();
};

// 监听各个自定义配色的状态变动，直接联动提交 appStore 实现无保存按钮式实时热重绘
watch(
  [themeColor, warningColor, successColor, dangerColor],
  ([newTheme, newWarning, newSuccess, newDanger]) => {
    appStore.setProjectColors({
      themeColor: (newTheme || "").trim(),
      warningColor: (newWarning || "").trim(),
      successColor: (newSuccess || "").trim(),
      dangerColor: (newDanger || "").trim(),
    });
  }
);
</script>

<style scoped>
/* Google Pixel 风格扁平卡片 */
.config-card {
  transition: border-color 0.25s ease;
}

/* 过滤名手写输入框 */
.settings-input {
  border: none;
  background: transparent;
  outline: none;
  height: 24px;
}
.settings-placeholder {
  color: #9aa0a6;
  font-size: 12px;
}

/* 色块实时预览 */
.color-preview {
  width: 32px;
  height: 20px;
  border: 1px solid #e0e3eb;
  transition: background-color 0.25s ease;
}

/* 预设色块 Chip 选项 */
.preset-chip {
  width: 20px;
  height: 20px;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
}
.preset-chip:active {
  transform: scale(0.85);
}
</style>
