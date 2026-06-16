<template>
  <view class="soc-dashboard-container wot-flex wot-flex-col wot-items-center wot-justify-center">
    <!-- 仪表盘主体区域：将 SVG 绘制为背景图像，确保在微信小程序等各端完美显示 -->
    <view 
      class="soc-dashboard-dial wot-relative wot-flex wot-items-center wot-justify-center"
      :style="dialBgStyle"
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
      <view class="dial-content wot-flex wot-flex-col wot-items-center wot-justify-center">
        <!-- 充电状态下的闪烁雷电微图标 -->
        <view
          v-if="isConnected && isCharging"
          class="charging-icon-wrap wot-flex wot-items-center wot-justify-center wot-mb-1"
        >
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon name="flash-power" size="18px" color="#10b981" />
        </view>

        <!-- SOC 电量大百分比字样 -->
        <view class="soc-text-wrap wot-flex wot-items-baseline">
          <text class="soc-num wot-text-white wot-font-extrabold font-numeric">
            {{ isConnected ? displayPercent : "0" }}
          </text>
          <text class="soc-unit wot-text-white wot-font-bold">%</text>
        </view>

        <!-- 连接状态/电池充放电状态的胶囊指示标签 -->
        <view
          class="status-badge wot-mt-2"
          :class="{
            'badge-disconnected': !isConnected,
            'badge-charging': isConnected && isCharging,
            'badge-discharging': isConnected && isDischarging,
            'badge-normal': isConnected && !isCharging && !isDischarging,
          }"
        >
          <text class="status-label wot-font-bold">
            {{ statusLabelText }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import gsap from "gsap";

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
  // 底部胶囊文字标签（多国语言回执）
  statusLabelText: {
    type: String,
    required: true,
    default: "",
  },
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
  // 半径为 88（即 80 * 1.1 比例缩放），圆心位于 (110, 110)
  const x = 110 + 88 * Math.cos(rad);
  const y = 110 + 88 * Math.sin(rad);
  // 避让指示点自身半宽度（如整体宽度为 16px，则减去 8px）
  return {
    x: (x - 8).toFixed(1),
    y: (y - 8).toFixed(1),
  };
});

// 动态生成 SVG 代码并进行 URL 编码，供给 CSS background-image，以彻底解决微信小程序端无法使用 inline <svg> 的问题
const dialBgStyle = computed(() => {
  const p = animatedPercent.value;
  const activeLength = ((p / 100) * 376.99).toFixed(2);

  // 根据当前状态确定进度条的颜色/渐变
  let strokeColor = "rgba(255, 255, 255, 0.15)";
  if (props.isConnected) {
    if (p < 20) {
      strokeColor = "url(#lowGrad)";
    } else if (props.isCharging) {
      strokeColor = "url(#chargingGrad)";
    } else {
      strokeColor = "url(#normalGrad)";
    }
  }

  // 构造标准的 SVG 数据格式，包含刻度、背景环与进度条
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
    <!-- 1. 最外侧精细装饰刻度环 -->
    <path d='M 36.36 163.64 A 90 90 0 1 1 163.64 163.64' fill='none' stroke='rgba(255, 255, 255, 0.08)' stroke-width='1.5' stroke-dasharray='2 4' />
    <!-- 2. 内侧主进度条背景轨道 -->
    <path d='M 43.44 156.57 A 80 80 0 1 1 156.56 156.57' fill='none' stroke='rgba(255, 255, 255, 0.12)' stroke-width='8' stroke-linecap='round' />
    <!-- 3. 动态彩色进度条 -->
    <path d='M 43.44 156.57 A 80 80 0 1 1 156.56 156.57' fill='none' stroke='${strokeColor}' stroke-width='8' stroke-linecap='round' stroke-dasharray='${activeLength} 376.99' />
  </svg>`;

  const encodedSvg = encodeURIComponent(svgString);

  return {
    backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
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
  background-color: radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  box-shadow: 
    inset 0 0 24px rgba(255, 255, 255, 0.05),
    0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* 游标指示点样式定义（多端兼容） */
.indicator-dot {
  width: 16px;
  height: 16px;
  pointer-events: none;
  z-index: 15;
}

.indicator-glow-outer {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  opacity: 0.25;
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
}

/* 数字文本框与精细字重搭配 */
.soc-text-wrap {
  line-height: 1;
}

.soc-num {
  font-size: 80rpx;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.soc-unit {
  font-size: 32rpx;
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

/* 状态药丸标签样式定义 */
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.status-label {
  font-size: 20rpx;
  line-height: 1.2;
}

.badge-disconnected {
  background-color: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.badge-charging {
  background-color: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #a7f3d0;
}

.badge-discharging {
  background-color: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fde68a;
}

.badge-normal {
  background-color: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* 等宽字体类定义 */
.font-numeric {
  font-family: "Outfit", "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
}
</style>
