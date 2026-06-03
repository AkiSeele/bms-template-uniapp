<template>
  <view>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.tab.params')" fixed safe-area-inset-top />

    <!-- 暂无数据的空白页面卡片占位 -->
    <view class="tab-content-wrap wot-p-main wot-flex wot-flex-col wot-items-center wot-justify-center wot-py-20 page-body-animate">
      <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
      <wd-icon css-icon="i-lucide-sliders" size="64px" color="#bfbfbf" />
      <text class="wot-text-body-main wot-text-text-secondary wot-mt-4">
        {{ $t("bms.tab.params") }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
// 页面内部的业务逻辑定义区
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}

/* 顶部安全区域与自定义导航栏高度自适应占位 */
.tab-content-wrap {
  padding-top: calc(var(--status-bar-height) + 44px + 80px) !important;
}
</style>
