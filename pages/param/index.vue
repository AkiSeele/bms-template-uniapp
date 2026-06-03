<template>
  <layout-provider>
    <view>
      <!-- 依据已连接设备协议自适应装载专属参数面板或默认通用参数面板 -->
      <component :is="paramPanelComponent" v-if="paramPanelComponent" />
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useBleStore } from "@/stores/ble-store";
import { resolveParamPanel } from "@/components/panel-registry";

const bleStore = useBleStore();
const { activeProtocolParser } = storeToRefs(bleStore);

// 自适应解析参数页协议面板组件引用，若不存在则自动降级
const paramPanelComponent = computed(() => {
  return resolveParamPanel(activeProtocolParser.value?.protocolType);
});
</script>

<style scoped>
/* 本页作为容器仅承载子面板，无特殊定制样式 */
</style>
