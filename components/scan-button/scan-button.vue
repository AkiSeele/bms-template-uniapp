<template>
  <view class="scan-button-wrapper">
    <!-- 调起系统原生扫码的交互按钮组件 -->
    <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
    <wd-button
      :size="size"
      :type="type"
      :plain="plain"
      :block="block"
      :disabled="disabled"
      @click="triggerScan"
    >
      <template #icon>
        <!-- 扫码图标 -->
        <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
        <wd-icon :css-icon="icon" size="18px" class="wot-mr-1" />
      </template>
      {{ buttonText || $t("bms.ble.scanTitle") }}
    </wd-button>
  </view>
</template>

<script setup lang="ts">
import { useScanConnect } from "@/composables/use-scan-connect";

// 扫码组件属性定义
const props = withDefaults(
  defineProps<{
    buttonText?: string; // 按钮上显示的文字内容
    size?: "small" | "medium" | "large"; // 按钮的尺寸大小
    type?: "primary" | "success" | "info" | "warning" | "danger" | "secondary"; // 按钮的主题样式类型
    plain?: boolean; // 是否开启镂空扁平化样式
    block?: boolean; // 是否展现为满宽的块级元素
    disabled?: boolean; // 是否禁用该按钮
    icon?: string; // 图标的类名定义
  }>(),
  {
    buttonText: "",
    size: "medium",
    type: "primary",
    plain: false,
    block: false,
    disabled: false,
    icon: "i-lucide-scan"
  }
);

// 引入扫码一键配对逻辑
const { handleScanConnect } = useScanConnect();

// 调起扫码流程的方法
const triggerScan = async () => {
  if (props.disabled) return;
  await handleScanConnect();
};
</script>

<style scoped>
.scan-button-wrapper {
  display: inline-block;
  width: 100%;
}

</style>
