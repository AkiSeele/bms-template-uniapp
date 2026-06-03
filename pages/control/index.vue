<template>
  <layout-provider>
    <view>
      <!-- 依据已连接设备协议自适应装载专属控制面板或默认通用控制面板 -->
      <component :is="controlPanelComponent" v-if="controlPanelComponent" />
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useBleStore } from "@/stores/ble-store";
import { resolveControlPanel } from "@/components/panel-registry";

const bleStore = useBleStore();
const { activeProtocolParser } = storeToRefs(bleStore);

// 自适应解析控制页协议面板组件引用，若不存在则自动降级
const controlPanelComponent = computed(() => {
  return resolveControlPanel(activeProtocolParser.value?.protocolType);
});
</script>

<style scoped>
/* 本页作为容器仅承载子面板，无特殊定制样式 */
</style>
