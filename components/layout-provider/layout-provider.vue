<template>
  <!-- 全局配置提供者，动态接收当前主题与自定义 CSS 主题色变量 -->
  <wd-config-provider :theme="theme" :theme-vars="themeVars">
    <view 
      :class="[theme === 'dark' ? 'wot-theme-dark bg-dark-gradient' : 'wot-theme-light bg-light-gradient']" 
      class="layout-provider-root wot-min-h-screen"
    >
      <!-- 插槽投影承载具体的页面正文内容 -->
      <slot />

      <!-- 全局高阶集成反馈挂载点，确保 useToast / useDialog 可以在各个包装页面被无差别触发 -->
      <wd-toast />
      <wd-dialog />
    </view>
  </wd-config-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import { LIGHT_THEME_VARS, DARK_THEME_VARS } from "@/config/theme";

// 获取全局应用层状态 store
const appStore = useAppStore();
const { theme } = storeToRefs(appStore);

// 根据当前明暗主题，动态切换及映射 config/theme 中定义的自定义主题 CSS 变量
// 因三方组件库的 ConfigProviderThemeVars 类型声明限制，在此强制使用 as any 类型断言进行兜底，以顺利通过 IDE 静态校验
const themeVars = computed(() => {
  return (theme.value === "dark" ? DARK_THEME_VARS : LIGHT_THEME_VARS) as any;
});
</script>

<style scoped>
/* 整个布局大底部的平滑背景过渡动画，赋予明暗模式切换以WOW极客质感 */
.layout-provider-root {
  box-sizing: border-box;
  transition: background-color 0.35s ease-in-out, color 0.35s ease-in-out;
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
</style>
