/**
 * 全局自定义主题变量配置入口文件
 * 用于定义并托管应用在亮色模式 (Light) 与暗黑模式 (Dark) 下的 wot-ui CSS 变量
 * 各页面或包装层只需由此文件进行变量配置，实现配置与视图渲染的彻底解耦 (SOC)
 */

// 亮色模式 (Light Theme) 定制配置：选用经典宝石科技蓝，背景清爽浅灰
export const LIGHT_THEME_VARS = {
  // 核心主色调
  colorTheme: "#0052d9",
  primaryColor: "#0052d9",
  primary6: "#0052d9",
  
  // 亮色清爽底色与卡片白色背景
  colorBg: "#f5f6f8",
  filledBottom: "#f5f6f8",
  filledOppo: "#ffffff",
  
  // 亮色高对比度文字与图标色阶
  textMain: "#1d1f29",
  textSecondary: "#4e5369",
  textAuxiliary: "#868a9c",
  iconMain: "#1d1f29",
  iconSecondary: "#4e5369",
  
  // 细节线框与分割线色阶
  borderMain: "#e5e6eb",
  borderStrong: "#c9cbd4",
  dividerMain: "#0000000a",
};

// 暗黑模式 (Dark Theme) 定制配置：选用极光天青蓝，背景深邃防眩光炭黑
export const DARK_THEME_VARS = {
  // 核心科技极光天青蓝主色调
  colorTheme: "#0ea5e9",
  primaryColor: "#0ea5e9",
  primary6: "#0ea5e9",
  
  // 暗黑沉浸式基准背景与卡片拟物深灰底色
  colorBg: "#121212",
  filledBottom: "#121212",
  filledOppo: "#232631", // 极为平滑的深卡片底色，调亮以增强对比度
  
  // 暗黑柔和度文字与图标色阶适配，有效缓解眼部疲劳
  textMain: "#e5e6eb",
  textSecondary: "#9ca3af",
  textAuxiliary: "#6b7280",
  iconMain: "#e5e6eb",
  iconSecondary: "#9ca3af",
  
  // 细节暗色线框与分割线色阶
  borderMain: "#383c4e", // 调亮线框以增加卡片轮廓感
  borderStrong: "#3f3f46",
  dividerMain: "#ffffff14",
};
