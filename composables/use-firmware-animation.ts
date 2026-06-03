import { ref, computed, watch, type Ref } from "vue";
import gsap from "gsap";

/**
 * 固件更新页面的 GSAP 状态补间动画 Hook
 * 管理装饰浮动圆圈、脉冲圆环、指示灯闪烁等所有 GSAP 补间实例
 * 严禁操作 DOM，所有补间仅驱动响应式 ref 数值，由模板 :style 绑定消费
 *
 * @param isUpdating 是否正在写入固件中（用于自动控制闪烁动画的启停）
 */
export function useFirmwareAnimation(isUpdating: Ref<boolean>) {
  // ---------------------------------------------------------------------------
  // 响应式数值区（GSAP 补间目标值，由 onUpdate 回调写入）
  // ---------------------------------------------------------------------------

  /** 浮动装饰圆圈 A 的垂直位移（px） */
  const circleAY = ref(0);
  /** 浮动装饰圆圈 B 的垂直位移（px） */
  const circleBY = ref(0);

  /** 脉冲圆环缩放系数 */
  const pulseScale = ref(1);
  /** 脉冲圆环透明度 */
  const pulseOpacity = ref(0.6);

  /** 闪烁动画透明度（状态指示灯 + 文字呼吸灯共用） */
  const blinkOpacity = ref(1);

  // ---------------------------------------------------------------------------
  // GSAP 补间实例引用（onUnmounted 时必须全部 kill 防内存泄漏）
  // ---------------------------------------------------------------------------
  let tweenCircleA: gsap.core.Tween | null = null;
  let tweenCircleB: gsap.core.Tween | null = null;
  let tweenPulse: gsap.core.Tween | null = null;
  let tweenBlink: gsap.core.Tween | null = null;

  // ---------------------------------------------------------------------------
  // 计算属性：内联样式对象（模板 :style 直接绑定，仅使用 GPU 加速属性）
  // ---------------------------------------------------------------------------

  /** 装饰圆圈 A 内联样式 — 仅 translateY，GPU 加速 */
  const circleAStyle = computed(() => ({
    transform: `translateY(${circleAY.value}px)`,
  }));

  /** 装饰圆圈 B 内联样式 — 仅 translateY，GPU 加速 */
  const circleBStyle = computed(() => ({
    transform: `translateY(${circleBY.value}px)`,
  }));

  /** 脉冲圆环内联样式 — opacity + scale，GPU 加速 */
  const pulseRingStyle = computed(() => ({
    opacity: pulseOpacity.value,
    transform: `scale(${pulseScale.value})`,
  }));

  /** 闪烁透明度内联样式（指示灯和文字共用） */
  const blinkStyle = computed(() => ({
    opacity: blinkOpacity.value,
  }));

  // ---------------------------------------------------------------------------
  // 动画启停方法
  // ---------------------------------------------------------------------------

  /**
   * 启动所有常驻装饰动画（浮动圆圈 + 脉冲圆环）
   * 应在页面 onMounted 中调用
   */
  const startAnimations = () => {
    // 圆圈 A：缓慢浮动，yoyo 往返，sine 缓动模拟呼吸感
    const circleATarget = { y: 0 };
    tweenCircleA = gsap.to(circleATarget, {
      y: -12,
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      onUpdate() {
        circleAY.value = circleATarget.y;
      },
    });

    // 圆圈 B：反向节奏浮动，制造错落层次感
    const circleBTarget = { y: 0 };
    tweenCircleB = gsap.to(circleBTarget, {
      y: -9,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      onUpdate() {
        circleBY.value = circleBTarget.y;
      },
    });

    // 脉冲圆环：从中心向外扩散消失，repeat 无限循环
    const pulseTarget = { opacity: 0.6, scale: 1 };
    tweenPulse = gsap.to(pulseTarget, {
      opacity: 0,
      scale: 1.55,
      duration: 2,
      repeat: -1,
      ease: "power1.out",
      onUpdate() {
        pulseOpacity.value = pulseTarget.opacity;
        pulseScale.value = pulseTarget.scale;
      },
    });
  };

  /**
   * 启动闪烁动画（写入中的指示灯和文字呼吸效果）
   * 由 watch(isUpdating) 自动触发，无需手动调用
   */
  const startBlink = () => {
    tweenBlink?.kill();
    const blinkTarget = { opacity: 1 };
    tweenBlink = gsap.to(blinkTarget, {
      opacity: 0.3,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      onUpdate() {
        blinkOpacity.value = blinkTarget.opacity;
      },
    });
  };

  /**
   * 停止闪烁动画并重置透明度为 1
   */
  const stopBlink = () => {
    tweenBlink?.kill();
    tweenBlink = null;
    blinkOpacity.value = 1;
  };

  // 监听写入状态自动控制闪烁动画启停，视图层无需关心时序
  watch(isUpdating, (val) => {
    if (val) {
      startBlink();
    } else {
      stopBlink();
    }
  });

  /**
   * 销毁所有 GSAP 补间实例，防内存泄漏
   * 必须在页面 onUnload / onUnmounted 中调用
   */
  const stopAnimations = () => {
    tweenCircleA?.kill();
    tweenCircleB?.kill();
    tweenPulse?.kill();
    tweenBlink?.kill();
    tweenCircleA = null;
    tweenCircleB = null;
    tweenPulse = null;
    tweenBlink = null;
  };

  return {
    /** 装饰圆圈 A 的 :style 绑定值 */
    circleAStyle,
    /** 装饰圆圈 B 的 :style 绑定值 */
    circleBStyle,
    /** 脉冲圆环的 :style 绑定值 */
    pulseRingStyle,
    /** 闪烁透明度的 :style 绑定值（指示灯 + 文字共用） */
    blinkStyle,
    /** 启动常驻装饰动画 */
    startAnimations,
    /** 销毁所有动画实例 */
    stopAnimations,
  };
}
