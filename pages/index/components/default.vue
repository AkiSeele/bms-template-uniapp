<template>
  <view class="default-panel-shell">
    <drawer-panel v-if="homeStyle === 'drawer'" />
    <scroll-panel v-else />
  </view>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAppStore } from "@/stores/app";
import DrawerPanel from "./drawer-panel.vue";
import ScrollPanel from "./scroll-panel.vue";

// 获取全局应用配置 Store
const appStore = useAppStore();
const { homeStyle } = storeToRefs(appStore);
</script>

<style scoped>
.default-panel-shell {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}
</style>
