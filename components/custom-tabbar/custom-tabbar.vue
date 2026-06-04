<template>
  <!-- 自定义底部导航栏组件，fixed 属性开启固定定位，placeholder 属性生成底部占位，bordered 开启上边框 -->
  <!-- Source: uni_modules/wot-ui/components/wd-tabbar/wd-tabbar.vue -->
  <wd-tabbar :model-value="activeTab" @change="handleChange" fixed placeholder bordered :active-color="activeThemeColor">
    <!-- 实时数据 Tab 选项项 -->
    <!-- Source: uni_modules/wot-ui/components/wd-tabbar-item/wd-tabbar-item.vue -->
    <wd-tabbar-item name="realtime" :title="$t('bms.tab.realtime')">
      <template #icon="{ active }">
        <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
        <wd-icon 
          css-icon="i-lucide-activity" 
          size="22px" 
          :color="active ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
    <!-- 参数设置 Tab 选项项 -->
    <!-- Source: uni_modules/wot-ui/components/wd-tabbar-item/wd-tabbar-item.vue -->
    <wd-tabbar-item name="param" :title="$t('bms.tab.params')">
      <template #icon="{ active }">
        <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
        <wd-icon 
          css-icon="i-lucide-sliders" 
          size="22px" 
          :color="active ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
    <!-- 控制开关 Tab 选项项 -->
    <!-- Source: uni_modules/wot-ui/components/wd-tabbar-item/wd-tabbar-item.vue -->
    <wd-tabbar-item name="control" :title="$t('bms.tab.control')">
      <template #icon="{ active }">
        <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
        <wd-icon 
          css-icon="i-lucide-settings" 
          size="22px" 
          :color="active ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
    <!-- 个人中心 Tab 选项项 -->
    <!-- Source: uni_modules/wot-ui/components/wd-tabbar-item/wd-tabbar-item.vue -->
    <wd-tabbar-item name="mine" :title="$t('bms.tab.mine')" @click="handleMineClick">
      <template #icon="{ active }">
        <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
        <wd-icon 
          css-icon="i-lucide-user" 
          size="22px" 
          :color="active ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
  </wd-tabbar>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import { useLogStore } from "@/stores/log-store";

// 获取全局 appStore 配色与底栏选项激活状态管理器
const appStore = useAppStore();
const { activeThemeColor, activeTab } = storeToRefs(appStore);

// 个人中心 Tab 点击回调，用于连续点击计数解锁系统调试日志
const handleMineClick = () => {
  try {
    const logStore = useLogStore();
    logStore.recordMineTabClick();
  } catch (e) {
    console.error("记录我的 Tab 点击失败:", e);
  }
};

// 处理底部 Tabbar 切换的核心跳转逻辑
const handleChange = ({ value }: { value: string }) => {
  if (value === activeTab.value) return;
  appStore.setActiveTab(value);
};
</script>

<style scoped>
/* 组件级局部样式覆盖区域 */
</style>
