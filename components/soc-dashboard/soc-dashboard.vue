<template>
  <view
    class="soc-dashboard-container wot-flex wot-flex-col wot-items-center wot-justify-center"
    :class="['theme-' + actualTheme]"
  >
    <!-- 仪表盘主体区域：将 SVG 绘制为背景图像，确保在微信小程序等各端完美显示 -->
    <view
      class="soc-dashboard-dial wot-relative wot-flex wot-items-center wot-justify-center"
      :style="[dialBgStyle, dialStyle]"
    >
      <!-- 进度条末端的发光游标指示点：由于小程序不支持 inline SVG 互动，使用绝对定位 view 实现，百分百多端兼容 -->
      <view
        v-if="isConnected && animatedPercent > 0.5"
        class="indicator-dot wot-absolute wot-flex wot-items-center wot-justify-center"
        :style="{
          left: indicatorCoords.x + 'px',
          top: indicatorCoords.y + 'px',
        }"
      >
        <!-- 外层大晕染圈 -->
        <view class="indicator-glow-outer wot-absolute" :style="{ backgroundColor: indicatorGlowColor }" />
        <!-- 中层半透明圈 -->
        <view class="indicator-glow-mid wot-absolute" :style="{ backgroundColor: indicatorGlowColor }" />
        <!-- 内层实体白点 -->
        <view class="indicator-inner-white wot-absolute" />
      </view>

      <!-- 仪表盘内部信息块（绝对定位，以支持多国语言自适应换行） -->
      <view class="dial-content wot-flex wot-flex-col wot-items-center wot-justify-end">
        <!-- SOC 电量大百分比字样 -->
        <view class="soc-text-wrap wot-flex wot-items-baseline">
          <text class="soc-num wot-font-extrabold font-numeric" :style="numStyle">
            {{ isConnected ? displayPercent : "0" }}
          </text>
          <text class="soc-unit wot-font-bold" :style="{ color: actualTheme === 'dark' ? '#ffffff' : '#475569' }">
            %
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import gsap from "gsap";
import { useAppStore } from "@/stores/app";

// 接收外部数据供给
const props = defineProps({
  // 电池电量百分比（数值范围 0 - 100）
  percent: {
    type: Number,
    required: true,
    default: 0,
  },
  // 蓝牙设备物理连接状态
  isConnected: {
    type: Boolean,
    required: true,
    default: false,
  },
  // 是否正在充电
  isCharging: {
    type: Boolean,
    required: true,
    default: false,
  },
  // 是否正在放电
  isDischarging: {
    type: Boolean,
    required: true,
    default: false,
  },
});

// 获取应用配置以获取全局实际主题状态
const appStore = useAppStore();
const { actualTheme } = storeToRefs(appStore);

// 动态计算底盘内发光与呼吸阴影效果，深度融合科技拟物美感
const dialStyle = computed(() => {
  let glowColor = "rgba(255, 255, 255, 0.04)";
  if (props.isConnected) {
    if (props.isCharging) {
      glowColor = "rgba(16, 185, 129, 0.14)"; // 充电状态下发绿光
    } else {
      glowColor = "rgba(28, 110, 255, 0.12)"; // 普通连接状态下发蓝光
    }
  }
  return {
    boxShadow: `inset 0 0 32px ${glowColor}, 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 0 2px rgba(255, 255, 255, 0.1)`,
  };
});

// 动态计算电量大字的外发光投影与字体颜色，自适应亮暗色主题，增加视觉深度
const numStyle = computed(() => {
  const isDarkTheme = actualTheme.value === "dark";
  let colorGlow = isDarkTheme ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.05)";
  if (props.isConnected) {
    colorGlow = props.isCharging
      ? "rgba(16, 185, 129, 0.55)"
      : isDarkTheme
        ? "rgba(14, 165, 233, 0.45)"
        : "rgba(0, 82, 217, 0.35)";
  }
  return {
    color: isDarkTheme ? "#ffffff" : "#1e293b",
    textShadow: `0 0 15px ${colorGlow}, 0 1px 3px ${isDarkTheme ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)"}`,
  };
});

// GSAP 平滑缓冲电量数值
const animatedPercent = ref(0);
let socTween: gsap.core.Tween | null = null;

// 监听真实电量变动，使用 GSAP 执行平滑插值过渡
watch(
  () => props.percent,
  (newVal) => {
    const targetVal = props.isConnected ? Math.min(100, Math.max(0, newVal)) : 0;
    if (socTween) {
      socTween.kill();
    }
    socTween = gsap.to(animatedPercent, {
      value: targetVal,
      duration: 0.8,
      ease: "power2.out",
    });
  },
  { immediate: true },
);

// 组件卸载时销毁 GSAP 动画，防止底层定时器发生泄漏
onUnmounted(() => {
  if (socTween) {
    socTween.kill();
  }
});

// 向上取整/四舍五入后的显示电量百分比
const displayPercent = computed(() => {
  return Math.round(animatedPercent.value);
});

// 根据当前百分比与状态动态匹配末端指示点发光颜色
const indicatorGlowColor = computed(() => {
  if (animatedPercent.value < 20) {
    return "#ef4444"; // 报警红色
  }
  if (props.isCharging) {
    return "#10b981"; // 充电绿色
  }
  return "#10b981"; // 默认翡翠绿
});

// 根据当前插值百分比，计算末端游标在绝对定位下的物理坐标 (left, top)
const indicatorCoords = computed(() => {
  const p = animatedPercent.value;
  // 仪表盘起始于 135 度，全长 270 度
  const angle = 135 + p * 2.7;
  const rad = (angle * Math.PI) / 180;
  // 半径为 84（在主轨 R90 的内切边缘 84 px 处顺畅运行，实现游标内凹并紧扣内圈的效果），圆心位于 (110, 110)
  const x = 110 + 84 * Math.cos(rad);
  const y = 110 + 84 * Math.sin(rad);
  // 避让指示点自身半宽度（如整体宽度为 16px，则减去 8px）
  return {
    x: (x - 8).toFixed(1),
    y: (y - 8).toFixed(1),
  };
});

// 动态生成 SVG 代码并进行 URL 编码，供给 CSS background-image，以彻底解决微信小程序端无法使用 inline <svg> 的问题
const dialBgStyle = computed(() => {
  const isDarkTheme = actualTheme.value === "dark";
  const p = animatedPercent.value;
  // 环圈加大至最外侧半径 90 后的 270 度总像素弧长为 424.12
  const activeLength = ((p / 100) * 424.12).toFixed(2);

  let strokeColor = isDarkTheme ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
  if (props.isConnected) {
    if (p < 20) {
      strokeColor = "url(#lowGrad)";
    } else if (props.isCharging) {
      strokeColor = "url(#chargingGrad)";
    } else {
      strokeColor = "url(#normalGrad)";
    }
  }

  // 刻度及轨道颜色配置
  const trackBg = isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";
  const tickColor = isDarkTheme ? "rgba(255, 255, 255, 0.25)" : "rgba(15, 23, 42, 0.16)";
  const textColor = isDarkTheme ? "rgba(255, 255, 255, 0.45)" : "rgba(15, 23, 42, 0.55)";
  const pointerColor = "#ef4444"; // 超跑红指针，经典恒久

  // 计算指针的角度：起始 -135deg 到 135deg，正上方 12 点钟方向为 0deg
  const angle = -135 + p * 2.7;

  // 构造标准的 SVG 数据格式，包含刻度、背景环、进度条、跑车红色指针、刻度文字
  const svgString = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
    <defs>
      <linearGradient id='normalGrad' x1='0%' y1='100%' x2='100%' y2='0%'>
        <stop offset='0%' stop-color='#2563eb' />
        <stop offset='60%' stop-color='#3b82f6' />
        <stop offset='100%' stop-color='#10b981' />
      </linearGradient>
      <linearGradient id='chargingGrad' x1='0%' y1='100%' x2='100%' y2='0%'>
        <stop offset='0%' stop-color='#10b981' />
        <stop offset='50%' stop-color='#34d399' />
        <stop offset='100%' stop-color='#06b6d4' />
      </linearGradient>
      <linearGradient id='lowGrad' x1='0%' y1='100%' x2='100%' y2='0%'>
        <stop offset='0%' stop-color='#f59e0b' />
        <stop offset='100%' stop-color='#ef4444' />
      </linearGradient>
    </defs>
    <!-- 1. 内侧精细装饰刻度虚线环（半径增大至 81 贴合在主轨内壁，轨宽 1.5，作为中层轨道标尺） -->
    <path d='M 42.72 157.28 A 81 81 0 1 1 157.28 157.28' fill='none' stroke='${tickColor}' stroke-width='1.5' stroke-dasharray='1 4' />
    <!-- 2. 内侧主进度条背景轨道（半径增大至最外侧 90，轨宽加宽至 10） -->
    <path d='M 36.36 163.64 A 90 90 0 1 1 163.64 163.64' fill='none' stroke='${trackBg}' stroke-width='10' stroke-linecap='round' />
    <!-- 3. 动态彩色进度条（半径增大至最外侧 90，进度条加宽至 12） -->
    <path d='M 36.36 163.64 A 90 90 0 1 1 163.64 163.64' fill='none' stroke='${strokeColor}' stroke-width='12' stroke-linecap='round' stroke-dasharray='${activeLength} 424.12' />
    <!-- 4. 跑车仪表精密数字刻度值（自适应向外贴近半径 81 虚线刻度环，字号放大至 10.5） -->
    <text x='51' y='149' font-size='10.5' fill='${textColor}' font-weight='800' font-family='sans-serif' text-anchor='middle'>0</text>
    <text x='36' y='74' font-size='10.5' fill='${textColor}' font-weight='800' font-family='sans-serif' text-anchor='middle'>25</text>
    <text x='100' y='31' font-size='10.5' fill='${textColor}' font-weight='800' font-family='sans-serif' text-anchor='middle'>50</text>
    <text x='164' y='74' font-size='10.5' fill='${textColor}' font-weight='800' font-family='sans-serif' text-anchor='middle'>75</text>
    <text x='149' y='149' font-size='10.5' fill='${textColor}' font-weight='800' font-family='sans-serif' text-anchor='middle'>100</text>
    
    <!-- 5. 机械拟物旋转红指针（带有偏置阴影和双层金属拉丝中轴，极致细节） -->
    <!-- 5.1 浮空机械指针阴影（向下偏置 1.2px，营造悬浮立体感） -->
    <g transform='rotate(${angle.toFixed(1)} 100 100) translate(1.2, 1.2)' opacity='0.16'>
      <path d='M 97.5 100 L 100 28 L 102.5 100 L 100 112 Z' fill='#000000' />
      <circle cx='100' cy='100' r='7' fill='#000000' />
    </g>
    <!-- 5.2 跑车梭形配重红针本体与多层精细轴心盖 -->
    <g transform='rotate(${angle.toFixed(1)} 100 100)'>
      <path d='M 97.5 100 L 100 28 L 102.5 100 L 100 112 Z' fill='${pointerColor}' />
      <circle cx='100' cy='100' r='7' fill='${isDarkTheme ? "#1e293b" : "#ffffff"}' stroke='${isDarkTheme ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)"}' stroke-width='1' />
      <circle cx='100' cy='100' r='4.5' fill='${pointerColor}' />
      <circle cx='100' cy='100' r='1.5' fill='#ffffff' />
    </g>
  </svg>`;

  const encodedSvg = encodeURIComponent(svgString);

  return {
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodedSvg}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
});
</script>

<style scoped lang="scss">
.soc-dashboard-container {
  width: 100%;
}

/* 仪表盘圆形发光容器 */
.soc-dashboard-dial {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

/* 亮色模式特异性拟物化表盘，大幅增强边界、立体高光与多层次阴影，彻底告别单调 */
.theme-light .soc-dashboard-dial {
  background-color: rgba(255, 255, 255, 0.72) !important;
  border: 2px solid rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  box-shadow:
    0 14px 35px -4px rgba(148, 163, 184, 0.28),
    inset 0 3px 6px rgba(255, 255, 255, 0.8),
    inset 0 -4px 12px rgba(148, 163, 184, 0.06) !important;
}

/* 游标指示点样式定义（多端兼容） */
.indicator-dot {
  width: 16px;
  height: 16px;
  pointer-events: none;
  z-index: 15;
}

.indicator-glow-outer {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  opacity: 0.35;
  filter: blur(2px);
  animation: glow-pulse 2s infinite ease-in-out;
}

.indicator-glow-mid {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  opacity: 0.6;
}

.indicator-inner-white {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}

/* 内部内容层绝对居中 */
.dial-content {
  position: absolute;
  z-index: 10;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding-bottom: 26px !important;
}

/* 数字文本框与精细字重搭配 */
.soc-text-wrap {
  line-height: 1;
}

.soc-num {
  font-size: 54rpx;
}

.soc-unit {
  font-size: 24rpx;
  margin-left: 2rpx;
  opacity: 0.9;
}

/* 充电微图标呼吸闪烁动画 */
.charging-icon-wrap {
  animation: charging-pulse 1.8s infinite ease-in-out;
}

@keyframes charging-pulse {
  0% {
    opacity: 0.4;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 0.4;
    transform: scale(0.95);
  }
}

.soc-label {
  font-size: 20rpx;
  font-weight: 800;
  color: #ffffff;
  opacity: 0.45;
  letter-spacing: 4rpx;
  margin-top: 6rpx;
  transform: scale(0.9);
}

/* 等宽字体类定义 */
.font-numeric {
  font-family:
    "Outfit",
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

@keyframes glow-pulse {
  0% {
    transform: scale(0.85);
    opacity: 0.25;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.55;
  }
  100% {
    transform: scale(0.85);
    opacity: 0.25;
  }
}
</style>
