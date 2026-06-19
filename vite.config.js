import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 挂载全局编译配置，自动注入编译期逻辑
export default defineConfig(async () => {
  const UnoCSS = (await import("unocss/vite")).default;
  return {
    plugins: [
      uni(),
      UnoCSS({
        configFile: path.resolve(__dirname, "uno.config.js"),
      }),
    ],
    // 强制编译器与打包链将 ES2020 可选链、空值合并等语法降级转译，保障小程序全端预览与上传兼容性
    build: {
      target: "es2015",
    },
    /* esbuild: {
      target: "es2015",
    }, */
    define: {
      // 消除 vue-i18n esm-bundler 警告，明确声明特性标志为布尔值以支持正确的 tree-shaking
      // __VUE_I18N_FULL_INSTALL__: true  启用完整安装（包含所有组件 and 指令）
      // __VUE_I18N_LEGACY_API__: false   禁用 Legacy API，与 i18n.ts 中 legacy: false 保持一致
      // __INTLIFY_PROD_DEVTOOLS__: false 生产环境关闭 devtools 支持
      __VUE_I18N_FULL_INSTALL__: true,
      __VUE_I18N_LEGACY_API__: false,
      __INTLIFY_PROD_DEVTOOLS__: false,
    },
  };
});
