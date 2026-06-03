/**
 * 协议专属 UI 面板注册表
 *
 * 与 service/protocol/protocol-registry.ts 形成双注册表架构：
 *   - protocol-registry.ts → UUID → 协议解析器（数据层）
 *   - panel-registry.ts    → protocolType → Vue 组件对象（视图层）
 *
 * 物理职责：
 * 本注册表使用 Vite 编译期 Glob 静态扫描，查找各业务页面下的 components/ 专属面板组件，
 * 实现协议专属面板的自适应解析与动态装载，若无专属页面或未连接设备，则自动降级为 default。
 */

import type { Component } from "vue";
import { APP_CONFIG } from "@/config";

const HOME_PANEL_MAP: Record<string, Component> = {};
const CONTROL_PANEL_MAP: Record<string, Component> = {};
const PARAM_PANEL_MAP: Record<string, Component> = {};

// 1. 使用 Glob Eager 静态读取页面目录下 components 的专属面板组件
// @ts-ignore
const homeModules = import.meta.glob("../pages/index/components/*.vue", { eager: true });
// @ts-ignore
const controlModules = import.meta.glob("../pages/control/components/*.vue", { eager: true });
// @ts-ignore
const paramModules = import.meta.glob("../pages/param/components/*.vue", { eager: true });

// 2. 遍历首页专属组件并以文件名作为 protocolType 键进行注册
for (const path in homeModules) {
  const match = path.match(/\/([a-z0-9\_]+)\.vue$/);
  if (match) {
    const protocolType = match[1]!;
    const component = (homeModules[path] as any).default;
    if (component) {
      HOME_PANEL_MAP[protocolType] = component;
    }
  }
}

// 3. 遍历控制页专属组件并以文件名作为 protocolType 键进行注册
for (const path in controlModules) {
  const match = path.match(/\/([a-z0-9\_]+)\.vue$/);
  if (match) {
    const protocolType = match[1]!;
    const component = (controlModules[path] as any).default;
    if (component) {
      CONTROL_PANEL_MAP[protocolType] = component;
    }
  }
}

// 4. 遍历参数页专属组件并以文件名作为 protocolType 键进行注册
for (const path in paramModules) {
  const match = path.match(/\/([a-z0-9\_]+)\.vue$/);
  if (match) {
    const protocolType = match[1]!;
    const component = (paramModules[path] as any).default;
    if (component) {
      PARAM_PANEL_MAP[protocolType] = component;
    }
  }
}

// 5. 遍历 config/index.ts 的配置项，自动检查 UI 组件的完整性并输出友情报错引导
const bleServicesConfig = APP_CONFIG.BLE_SERVICES as Record<string, any>;
for (const configKey in bleServicesConfig) {
  const protocolType = configKey;

  // 验证当前是否配置了对应面板，若缺失则打印控制台警告进行精确指引
  if (!HOME_PANEL_MAP[protocolType]) {
    console.warn(
      `[面板注册表] ⚠️ 检测到已配置协议 "${configKey}" 的蓝牙服务，但未找到对应的首页专属面板组件 "pages/index/components/${protocolType}.vue"。` +
        `若需要定制展示，请创建该组件（将自动关联）；否则系统将降级渲染默认通用面板。`
    );
  }
  if (!CONTROL_PANEL_MAP[protocolType]) {
    console.warn(
      `[面板注册表] ⚠️ 检测到已配置协议 "${configKey}" 的蓝牙服务，但未找到对应的控制页专属面板组件 "pages/control/components/${protocolType}.vue"。` +
        `若需要定制展示，请创建该组件（将自动关联）；否则系统将降级渲染默认通用面板。`
    );
  }
  if (!PARAM_PANEL_MAP[protocolType]) {
    console.warn(
      `[面板注册表] ⚠️ 检测到已配置协议 "${configKey}" 的蓝牙服务，但未找到对应的参数页专属面板组件 "pages/param/components/${protocolType}.vue"。` +
        `若需要定制展示，请创建该组件（将自动关联）；否则系统将降级渲染默认通用面板。`
    );
  }
}

/**
 * 根据协议标识符查找首页数据面板的 Vue 组件对象引用
 * 未注册或未连接时，降级返回 default 面板组件
 *
 * @param protocolType 当前激活协议的类型标识符
 * @returns 组件对象引用
 */
export const resolveHomePanel = (protocolType: string | undefined): Component | undefined => {
  const target = protocolType ? HOME_PANEL_MAP[protocolType] : undefined;
  return target || HOME_PANEL_MAP["default"];
};

/**
 * 根据协议标识符查找控制页操作面板的 Vue 组件对象引用
 * 未注册或未连接时，降级返回 default 面板组件
 */
export const resolveControlPanel = (protocolType: string | undefined): Component | undefined => {
  const target = protocolType ? CONTROL_PANEL_MAP[protocolType] : undefined;
  return target || CONTROL_PANEL_MAP["default"];
};

/**
 * 根据协议标识符查找参数页配置面板的 Vue 组件对象引用
 * 未注册或未连接时，降级返回 default 面板组件
 */
export const resolveParamPanel = (protocolType: string | undefined): Component | undefined => {
  const target = protocolType ? PARAM_PANEL_MAP[protocolType] : undefined;
  return target || PARAM_PANEL_MAP["default"];
};

/**
 * 返回当前已注册首页面板的所有协议标识符（供调试时检查注册状态使用）
 */
export const getRegisteredPanelProtocols = (): string[] => {
  return Object.keys(HOME_PANEL_MAP);
};
