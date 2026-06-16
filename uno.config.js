import { defineConfig } from 'unocss'
import presetWeapp from 'unocss-preset-weapp'
import { transformerClass } from 'unocss-preset-weapp/transformer'
import { presetWot } from '@wot-ui/unocss-preset'
import presetIcons from '@unocss/preset-icons'

// 静态导入本地图标数据，避免 HBuilderX 编译时的路径解析错误
import lucideIcons from '@iconify-json/lucide/icons.json'
import riIcons from '@iconify-json/ri/icons.json'

export default defineConfig({
  presets: [
    presetWeapp({
      prefix: 'wot-',
      platform: 'uniapp',
    }),
    presetWot({
      prefix: 'wot',
      preflight: true,
      baseTokens: false,
    }),
    presetIcons({
      collections: {
        lucide: () => lucideIcons,
        ri: () => riIcons,
      },
      scale: 1.2,
      warn: true,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [
    transformerClass(),
  ],
})
