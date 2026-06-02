<template>
  <!-- 自定义底部导航栏组件，fixed 属性开启固定定位，placeholder 属性生成底部占位，bordered 开启上边框 -->
  <wd-tabbar :model-value="active" @change="handleChange" fixed placeholder bordered>
    <!-- 实时数据 Tab 选项项 -->
    <wd-tabbar-item name="realtime" :title="$t('bms.tab.realtime')">
      <template #icon="{ active }">
        <wd-icon 
          css-icon="i-lucide-activity" 
          size="22px" 
          :color="active ? '#0052d9' : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
    <!-- 参数设置 Tab 选项项 -->
    <wd-tabbar-item name="param" :title="$t('bms.tab.params')">
      <template #icon="{ active }">
        <wd-icon 
          css-icon="i-lucide-sliders" 
          size="22px" 
          :color="active ? '#0052d9' : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
    <!-- 控制开关 Tab 选项项 -->
    <wd-tabbar-item name="control" :title="$t('bms.tab.control')">
      <template #icon="{ active }">
        <wd-icon 
          css-icon="i-lucide-settings" 
          size="22px" 
          :color="active ? '#0052d9' : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
    <!-- 个人中心 Tab 选项项 -->
    <!-- Source: uni_modules/wot-ui/components/wd-tabbar-item/wd-tabbar-item.vue -->
    <wd-tabbar-item name="mine" :title="$t('bms.tab.mine')" @click="handleMineClick">
      <template #icon="{ active }">
        <wd-icon 
          css-icon="i-lucide-user" 
          size="22px" 
          :color="active ? '#0052d9' : '#858585'" 
        />
      </template>
    </wd-tabbar-item>
  </wd-tabbar>
</template>

<script setup lang="ts">
import { useLogStore } from "@/stores/log-store";

// 接收父组件传入的 active，代表当前页面高亮的 Tab 标识
const props = defineProps<{
  active: string
}>()

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
  if (value === props.active) return
  
  let url = ''
  switch (value) {
    case 'realtime':
      url = '/pages/index/index'
      break
    case 'param':
      url = '/pages/param/index'
      break
    case 'control':
      url = '/pages/control/index'
      break
    case 'mine':
      url = '/pages/mine/index'
      break
  }
  
  if (url) {
    // 采用 redirectTo 跳转以防止普通页面之间切换时历史栈无限堆叠导致返回键失效的 Bug
    uni.redirectTo({
      url
    })
  }
}
</script>

<style scoped>
/* 组件级局部样式覆盖区域 */
</style>
