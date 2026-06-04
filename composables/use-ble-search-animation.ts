import { ref, computed, watch, type Ref } from "vue";
import gsap from "gsap";

/**
 * 蓝牙搜索页面的 GSAP 状态补间动画 Hook
 * 管理 Google 风格水平流光进度条和雷达同心圆扩散动画
 * 严禁操作 DOM，所有补间仅驱动响应式 ref 数值
 *
 * @param isScanning 是否正在蓝牙扫描中（用于自动启停动画）
 */
export function useBleSearchAnimation(isScanning: Ref<boolean>) {


  // ---------------------------------------------------------------------------
  // 雷达波纹响应式数值区（3 个波纹各自独立控制）
  // ---------------------------------------------------------------------------

  /** 波纹 1 的缩放系数 */
  const ripple1Scale = ref(0.4);
  /** 波纹 1 的透明度 */
  const ripple1Opacity = ref(0);

  /** 波纹 2 的缩放系数 */
  const ripple2Scale = ref(0.4);
  /** 波纹 2 的透明度 */
  const ripple2Opacity = ref(0);

  /** 波纹 3 的缩放系数 */
  const ripple3Scale = ref(0.4);
  /** 波纹 3 的透明度 */
  const ripple3Opacity = ref(0);

  // ---------------------------------------------------------------------------
  // GSAP 补间实例引用
  // ---------------------------------------------------------------------------
  let tweenRipple1: gsap.core.Timeline | null = null;
  let tweenRipple2: gsap.core.Timeline | null = null;
  let tweenRipple3: gsap.core.Timeline | null = null;

  /** 雷达波纹 1 内联样式 — scale + opacity */
  const ripple1Style = computed(() => ({
    opacity: ripple1Opacity.value,
    transform: `scale(${ripple1Scale.value})`,
  }));

  /** 雷达波纹 2 内联样式 */
  const ripple2Style = computed(() => ({
    opacity: ripple2Opacity.value,
    transform: `scale(${ripple2Scale.value})`,
  }));

  /** 雷达波纹 3 内联样式 */
  const ripple3Style = computed(() => ({
    opacity: ripple3Opacity.value,
    transform: `scale(${ripple3Scale.value})`,
  }));

  // ---------------------------------------------------------------------------
  // 动画创建工厂函数
  // ---------------------------------------------------------------------------



  /**
   * 创建单个雷达波纹的 GSAP 时间线
   * 模拟从中心向外扩散并消隐的同心圆效果
   *
   * @param scaleRef 波纹缩放 ref
   * @param opacityRef 波纹透明度 ref
   * @param delay 延迟启动秒数（错开 3 个波纹的节奏）
   */
  const createRippleTimeline = (
    scaleRef: Ref<number>,
    opacityRef: Ref<number>,
    delay: number,
  ) => {
    const target = { scale: 0.4, opacity: 0 };
    const tl = gsap.timeline({
      repeat: -1,
      delay,
      onUpdate() {
        scaleRef.value = target.scale;
        opacityRef.value = target.opacity;
      },
    });
    // 0% → 10%：快速淡入并略微放大
    tl.fromTo(
      target,
      { scale: 0.4, opacity: 0 },
      { scale: 0.47, opacity: 1, duration: 0.3, ease: "none" },
    );
    // 10% → 100%：缓慢扩散至满尺寸并淡出
    tl.to(target, {
      scale: 1.1,
      opacity: 0,
      duration: 2.7,
      ease: "none",
    });
    return tl;
  };

  // ---------------------------------------------------------------------------
  // 启停控制
  // ---------------------------------------------------------------------------

  /**
   * 启动所有扫描态动画（雷达）
   */
  const startAll = () => {
    // 3 个错开节奏的雷达波纹
    tweenRipple1?.kill();
    tweenRipple1 = createRippleTimeline(ripple1Scale, ripple1Opacity, 0);

    tweenRipple2?.kill();
    tweenRipple2 = createRippleTimeline(ripple2Scale, ripple2Opacity, 1);

    tweenRipple3?.kill();
    tweenRipple3 = createRippleTimeline(ripple3Scale, ripple3Opacity, 2);
  };

  /**
   * 停止所有动画并重置数值
   */
  const stopAll = () => {
    tweenRipple1?.kill();
    tweenRipple2?.kill();
    tweenRipple3?.kill();
    tweenRipple1 = null;
    tweenRipple2 = null;
    tweenRipple3 = null;

    // 重置波纹到初始态
    ripple1Scale.value = 0.4;
    ripple1Opacity.value = 0;
    ripple2Scale.value = 0.4;
    ripple2Opacity.value = 0;
    ripple3Scale.value = 0.4;
    ripple3Opacity.value = 0;
  };

  // 监听扫描状态自动控制动画启停
  watch(isScanning, (val) => {
    if (val) {
      startAll();
    } else {
      stopAll();
    }
  });

  return {
    /** 雷达波纹 1 :style 绑定值 */
    ripple1Style,
    /** 雷达波纹 2 :style 绑定值 */
    ripple2Style,
    /** 雷达波纹 3 :style 绑定值 */
    ripple3Style,
    /** 销毁所有动画实例（页面卸载时调用） */
    stopAll,
  };
}
