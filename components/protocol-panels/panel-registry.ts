/**
 * 协议专属 UI 面板注册表
 *
 * 与 service/protocol/protocol-registry.ts 形成双注册表架构：
 *   - protocol-registry.ts → UUID → 协议解析器（数据层）
 *   - panel-registry.ts    → protocolType → Vue 组件对象（视图层）
 *
 * 为何必须静态 import：
 * UniApp 小程序平台不支持运行时动态 import()，且 <component :is="字符串"> 会失效。
 * 所有面板组件必须在此处静态导入，以组件对象引用（而非字符串）传入 <component :is>。
 *
 * 扩展方式与完整使用示例见 cursorruler.md 第二十二条第 8 节。
 */

import type { Component } from "vue";

// ============================================================
// 兜底通用面板（协议专属面板未注册时渲染此组件）
// ============================================================
// import DefaultHomePanel from "@/components/protocol-panels/default-home-panel.vue";
// import DefaultControlPanel from "@/components/protocol-panels/default-control-panel.vue";

// ============================================================
// 协议专属面板静态导入区
// 新增协议面板时，在此追加一行静态 import（严禁改为动态 import）
// 组件文件创建后解除对应注释即可完成接入
// ============================================================
// import ProtocolAHomePanel from "@/components/protocol-panels/protocol-a-home-panel.vue";
// import ProtocolAControlPanel from "@/components/protocol-panels/protocol-a-control-panel.vue";
// import ProtocolBHomePanel from "@/components/protocol-panels/protocol-b-home-panel.vue";

// ============================================================
// 首页面板映射表
// 键：protocolType 标识符（与 BmsProtocolParser.protocolType 保持一致）
// 值：对应的 Vue 组件对象引用（必须来自上方的静态 import，而非字符串）
// ============================================================
const HOME_PANEL_MAP: Record<string, Component> = {
  // "protocol-a": ProtocolAHomePanel,
  // "protocol-b": ProtocolBHomePanel,
};

// ============================================================
// 控制页面板映射表
// 不同协议支持的控制操作差异极大（加热/均衡/定时等），通过此表按协议切换
// ============================================================
const CONTROL_PANEL_MAP: Record<string, Component> = {
  // "protocol-a": ProtocolAControlPanel,
};

/**
 * 根据协议标识符查找首页数据面板的 Vue 组件对象引用
 * 未注册时返回 undefined，页面应降级渲染通用兜底面板
 *
 * @param protocolType 当前激活协议的类型标识符（来自 BmsProtocolParser.protocolType）
 * @returns 可直接传入 <component :is> 的组件对象引用，或 undefined
 */
export const resolveHomePanel = (protocolType: string | undefined): Component | undefined => {
  if (!protocolType) return undefined;
  return HOME_PANEL_MAP[protocolType];
};

/**
 * 根据协议标识符查找控制页操作面板的 Vue 组件对象引用
 * 未注册时返回 undefined，页面应降级渲染通用控制面板
 *
 * @param protocolType 当前激活协议的类型标识符（来自 BmsProtocolParser.protocolType）
 * @returns 可直接传入 <component :is> 的组件对象引用，或 undefined
 */
export const resolveControlPanel = (protocolType: string | undefined): Component | undefined => {
  if (!protocolType) return undefined;
  return CONTROL_PANEL_MAP[protocolType];
};

/**
 * 返回当前已注册首页面板的所有协议标识符（供调试时检查注册状态使用）
 */
export const getRegisteredPanelProtocols = (): string[] => {
  return Object.keys(HOME_PANEL_MAP);
};
