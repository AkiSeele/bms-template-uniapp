<template>
  <layout-provider>
    <view>
      <!-- 依据已连接设备协议自适应装载专属参数面板或默认通用参数面板 -->
      <!-- #ifdef MP-WEIXIN -->
      <param-default-panel v-if="currentProtocolType === 'default'" />
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <component :is="paramPanelComponent" v-if="paramPanelComponent" />
      <!-- #endif -->
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useBleStore } from "@/stores/ble-store";
import { resolveParamPanel } from "@/components/panel-registry";

// 静态导入默认通用参数面板组件以支持微信小程序端条件编译
import ParamDefaultPanel from "./components/default.vue";

const bleStore = useBleStore();
const { activeProtocolParser } = storeToRefs(bleStore);

// 动态判定当前协议类型以供给微信小程序条件编译进行静态分支分流
const currentProtocolType = computed(() => activeProtocolParser.value?.protocolType || "default");

// 自适应解析参数页协议面板组件引用，若不存在则自动降级
const paramPanelComponent = computed(() => {
  return resolveParamPanel(activeProtocolParser.value?.protocolType);
});
</script>

<style scoped>
/* 本页作为容器仅承载子面板，无特殊定制样式 */
</style>
