import { defineConfig } from "unocss";
import { presetUni } from "@uni-helper/unocss-preset-uni";
import { presetWot } from "@wot-ui/unocss-preset";
import presetIcons from "@unocss/preset-icons";

// 静态导入本地图标数据，避免 HBuilderX 编译时的路径解析错误
import lucideIcons from "@iconify-json/lucide/icons.json";
import riIcons from "@iconify-json/ri/icons.json";

export default defineConfig({
  presets: [
    presetUni({
      // 显式禁用属性模式及 transformerAttributify，杜绝组件 props 误识别与 magic-string chunk 冲突
      attributify: false,
      uno: {
        prefix: "wot-",
        presetOptions: {
          prefix: "wot-",
        },
      },
    }),
    presetWot({
      prefix: "wot",
      preflight: true,
      baseTokens: false,
    }),
    presetIcons({
      collections: {
        lucide: () => lucideIcons,
        ri: () => riIcons,
      },
      scale: 1.2,
      warn: false,
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
    }),
  ],
  safelist: [
    "i-lucide-file-check-2",
    "i-lucide-file-up",
    "i-ri-signal-tower-fill",
    "i-ri-signal-tower-line",
    "i-ri-bluetooth-fill",
    "i-ri-bluetooth-line",
    "i-ri-search-line",
    "i-ri-close-circle-fill",
    "i-ri-close-fill",
    "i-ri-check-line",
    "i-ri-arrow-right-s-line",
  ],
});
