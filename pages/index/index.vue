<template>
  <layout-provider>
    <view :class="activeTab === 'realtime' ? 'realtime-page-wrapper' : 'wot-pb-4'">
      <!-- 依据 activeTab 局部切换并缓存四大面板，消除路由跳转白屏 -->
      
      <!-- #ifdef MP-WEIXIN -->
      <view v-show="activeTab === 'realtime'">
        <realtime-default-panel v-if="currentProtocolType === 'default'" />
      </view>
      <view v-show="activeTab === 'param'">
        <param-default-panel v-if="currentProtocolType === 'default'" />
      </view>
      <view v-show="activeTab === 'control'">
        <control-default-panel v-if="currentProtocolType === 'default'" />
      </view>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view v-show="activeTab === 'realtime'">
        <component :is="homePanelComponent" v-if="homePanelComponent" />
      </view>
      <view v-show="activeTab === 'param'">
        <component :is="paramPanelComponent" v-if="paramPanelComponent" />
      </view>
      <view v-show="activeTab === 'control'">
        <component :is="controlPanelComponent" v-if="controlPanelComponent" />
      </view>
      <!-- #endif -->

      <view v-show="activeTab === 'mine'">
        <mine-panel />
      </view>
    </view>

    <!-- 统一的全局自定义底部导航栏 -->
    <custom-tabbar />
  </layout-provider>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { useBleStore } from "@/stores/ble-store";
import { useAppStore } from "@/stores/app";
import { resolveHomePanel, resolveParamPanel, resolveControlPanel } from "@/components/panel-registry";
import MinePanel from "@/pages/mine/index.vue";
import CustomTabbar from "@/components/custom-tabbar/custom-tabbar.vue";

// 静态导入默认通用面板组件以支持微信小程序端条件编译
import RealtimeDefaultPanel from "./components/default.vue";
import ParamDefaultPanel from "../param/components/default.vue";
import ControlDefaultPanel from "../control/components/default.vue";

// 获取全局 App 状态仓
const appStore = useAppStore();
const { activeTab } = storeToRefs(appStore);

// 接收外部传参（如重载/重定向），实现精确激活 Tab 分发
onLoad((options) => {
  if (options && options.tab) {
    appStore.setActiveTab(options.tab as any);
  }
});

// 获取蓝牙通信状态仓
const bleStore = useBleStore();
const { activeProtocolParser, isBleConnected } = storeToRefs(bleStore);

// 动态判定当前协议类型以供给微信小程序条件编译进行静态分支分流
const currentProtocolType = computed(() => activeProtocolParser.value?.protocolType || "default");

// 自适应解析当前设备协议专属的首页、参数页、控制页面板组件引用
const homePanelComponent = computed(() => {
  return resolveHomePanel(activeProtocolParser.value?.protocolType);
});

const paramPanelComponent = computed(() => {
  return resolveParamPanel(activeProtocolParser.value?.protocolType);
});

const controlPanelComponent = computed(() => {
  return resolveControlPanel(activeProtocolParser.value?.protocolType);
});

// 核心能耗优化：监听当前激活 Tab 变化，切离实时数据页面与状态页面时自动挂起蓝牙遥测轮询
watch(
  [activeTab, isBleConnected],
  ([newTab, connected]) => {
    if ((newTab === "realtime" || newTab === "param") && connected) {
      console.log("[Shell] 切换到实时数据/状态页，激活蓝牙数据轮询");
      bleStore.setPollingActive(true);
    } else {
      console.log("[Shell] 离开实时数据/状态页或断开连接，暂停蓝牙数据轮询");
      bleStore.setPollingActive(false);
    }
  },
  { immediate: true }
);

// 页面切入显示生命周期回调
onShow(() => {
  if ((activeTab.value === "realtime" || activeTab.value === "param") && isBleConnected.value) {
    bleStore.setPollingActive(true);
  }
});

// 页面切出隐藏生命周期回调
onHide(() => {
  bleStore.setPollingActive(false);
});

// 页面销毁生命周期回调
onUnload(() => {
  bleStore.setPollingActive(false);
});
</script>

<style scoped>
/* 壳页面容器样式 */
.realtime-page-wrapper {
  height: 100vh;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}
</style>
