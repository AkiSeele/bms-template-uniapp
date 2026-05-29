/**
 * 全局自定义主题变量配置入口文件
 * 用于定义并托管应用在亮色模式 (Light) 与暗黑模式 (Dark) 下的 wot-ui CSS 变量
 * 各页面或包装层只需由此文件进行变量配置，实现配置与视图渲染的彻底解耦 (SOC)
 */

// 亮色模式 (Light Theme) 定制配置：选用经典宝石科技蓝，背景清爽浅灰
export const LIGHT_THEME_VARS = {
  // 核心主色调
  "--wot-color-theme": "#0052d9",
  "--wot-primary-color": "#0052d9",
  "--wot-primary-6": "#0052d9",
  
  // 亮色清爽底色与卡片白色背景
  "--wot-color-bg": "#f5f6f8",
  "--wot-filled-bottom": "#f5f6f8",
  "--wot-filled-oppo": "#ffffff",
  
  // 亮色高对比度文字与图标色阶
  "--wot-text-main": "#1d1f29",
  "--wot-text-secondary": "#4e5369",
  "--wot-text-auxiliary": "#868a9c",
  "--wot-icon-main": "#1d1f29",
  "--wot-icon-secondary": "#4e5369",
  
  // 细节线框与分割线色阶
  "--wot-border-main": "#e5e6eb",
  "--wot-border-strong": "#c9cbd4",
  "--wot-divider-main": "#0000000a",
};

// 暗黑模式 (Dark Theme) 定制配置：选用极光天青蓝，背景深邃防眩光炭黑
export const DARK_THEME_VARS = {
  // 核心科技极光天青蓝主色调
  "--wot-color-theme": "#0ea5e9",
  "--wot-primary-color": "#0ea5e9",
  "--wot-primary-6": "#0ea5e9",
  
  // 暗黑沉浸式基准背景与卡片拟物深灰底色
  "--wot-color-bg": "#121212",
  "--wot-filled-bottom": "#121212",
  "--wot-filled-oppo": "#1e1e1e", // 极为平滑的深卡片底色
  
  // 暗黑柔和度文字与图标色阶适配，有效缓解眼部疲劳
  "--wot-text-main": "#e5e6eb",
  "--wot-text-secondary": "#9ca3af",
  "--wot-text-auxiliary": "#6b7280",
  "--wot-icon-main": "#e5e6eb",
  "--wot-icon-secondary": "#9ca3af",
  
  // 细节暗色线框与分割线色阶
  "--wot-border-main": "#2a2a2a",
  "--wot-border-strong": "#3f3f46",
  "--wot-divider-main": "#ffffff14",
};
