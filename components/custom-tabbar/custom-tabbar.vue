<template>
  <!-- 自定义底部导航栏组件 -->
  <wd-tabbar
    :model-value="activeTab"
    @change="handleChange"
    fixed
    :placeholder="activeTab !== 'realtime'"
    bordered
    safe-area-inset-bottom
    :z-index="100"
    :active-color="activeThemeColor"
  >
    <!-- 实时数据 Tab 选项项 -->
    <wd-tabbar-item name="realtime" :title="$t('bms.tab.realtime')">
      <template #icon>
        <wd-icon 
          css-icon="i-lucide-activity" 
          size="22px" 
          :color="activeTab === 'realtime' ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>

    <!-- 参数设置 Tab 选项项 -->
    <wd-tabbar-item name="param" :title="$t('bms.tab.params')">
      <template #icon>
        <wd-icon 
          css-icon="i-lucide-sliders" 
          size="22px" 
          :color="activeTab === 'param' ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>

    <!-- 控制开关 Tab 选项项 -->
    <wd-tabbar-item name="control" :title="$t('bms.tab.control')">
      <template #icon>
        <wd-icon 
          css-icon="i-lucide-settings" 
          size="22px" 
          :color="activeTab === 'control' ? activeThemeColor : '#858585'" 
        />
      </template>
    </wd-tabbar-item>

    <!-- 个人中心 Tab 选项项 (采用默认插槽并在内层绑定点击，确保在小程序端重复点击依然能被精准捕获) -->
    <wd-tabbar-item name="mine">
      <view class="wot-flex wot-flex-col wot-items-center wot-justify-center wot-w-full wot-h-full" @click="handleMineClick">
        <wd-icon 
          css-icon="i-lucide-user" 
          size="22px" 
          :color="activeTab === 'mine' ? activeThemeColor : '#858585'" 
        />
        <text 
          class="wot-text-[10px] wot-mt-0.5"
          :style="{ color: activeTab === 'mine' ? activeThemeColor : '#858585', fontWeight: activeTab === 'mine' ? '500' : 'normal' }"
        >
          {{ $t("bms.tab.mine") }}
        </text>
      </view>
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
