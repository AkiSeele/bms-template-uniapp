<template>
  <layout-provider>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <wd-navbar :title="$t('bms.tab.params')" fixed safe-area-inset-top placeholder />
    
    <!-- 暂无数据的空白页面卡片占位 -->
    <view class="wot-p-main wot-flex wot-flex-col wot-items-center wot-justify-center wot-min-h-[50vh]">
      <wd-icon css-icon="i-lucide-sliders" size="64px" color="#bfbfbf" />
      <text class="wot-text-body-main wot-text-text-secondary wot-mt-4">
        {{ $t('bms.tab.params') }}
      </text>
    </view>
    
    <!-- 自定义底部导航栏 -->
    <custom-tabbar active="param" />
  </layout-provider>
</template>

<script setup lang="ts">
// 页面内部的业务逻辑定义区
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}
</style>
