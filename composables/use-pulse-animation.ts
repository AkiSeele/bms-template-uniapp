import { ref, computed, watch, type Ref } from "vue";
import gsap from "gsap";

/**
 * 通用脉冲呼吸动画 Hook
 * 用于蓝牙图标等需要"呼吸"视觉反馈的场景
 * 严禁操作 DOM，仅驱动 opacity ref 数值
 *
 * @param isActive 是否激活呼吸动画（为 false 时自动停止并重置透明度为 1）
 */
export function usePulseAnimation(isActive: Ref<boolean>) {
  /** 呼吸动画透明度（1 → 0.5 → 1 循环） */
  const pulseOpacity = ref(1);

  /** GSAP 补间实例引用 */
  let tweenPulse: gsap.core.Tween | null = null;

  /** 呼吸动画内联样式 — 仅 opacity，GPU 友好 */
  const pulseStyle = computed(() => ({
    opacity: pulseOpacity.value,
  }));

  /**
   * 启动呼吸动画
   * 使用 yoyo + repeat 实现 1→0.5→1 的周期性透明度变化
   * 缓动曲线选用 power1.inOut 模拟 CSS cubic-bezier(0.4, 0, 0.6, 1) 的呼吸质感
   */
  const startPulse = () => {
    tweenPulse?.kill();
    const target = { opacity: 1 };
    tweenPulse = gsap.to(target, {
      opacity: 0.5,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
      onUpdate() {
        pulseOpacity.value = target.opacity;
      },
    });
  };

  /**
   * 停止呼吸动画并重置透明度为完全不透明
   */
  const stopPulse = () => {
    tweenPulse?.kill();
    tweenPulse = null;
    pulseOpacity.value = 1;
  };

  // 监听激活状态自动启停呼吸动画
  watch(
    isActive,
    (val) => {
      if (val) {
        startPulse();
      } else {
        stopPulse();
      }
    },
    { immediate: true },
  );

  return {
    /** 呼吸动画 :style 绑定值 */
    pulseStyle,
    /** 销毁动画实例（页面/组件卸载时调用） */
    stopPulse,
  };
}
