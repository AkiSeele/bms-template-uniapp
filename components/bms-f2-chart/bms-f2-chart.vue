<template>
  <view class="bms-f2-chart-card wot-w-full wot-bg-filled-oppo wot-rounded-2xl wot-p-4 wot-border wot-border-solid wot-border-border-main wot-shadow-sm wot-box-border">
    <!-- 图表标题与切换选项 -->
    <view class="wot-flex wot-items-center wot-justify-between wot-mb-3">
      <view class="wot-flex wot-items-center wot-gap-2">
        <view class="wot-w-2 wot-h-3.5 wot-rounded-full wot-bg-primary"></view>
        <text class="wot-text-xs wot-font-bold wot-text-text-main">{{ title || $t('bms.testPage.f2ChartTitle') }}</text>
      </view>

      <!-- 图表类型切换指示 -->
      <view class="wot-flex wot-items-center wot-gap-1.5 wot-text-[11px] wot-text-text-auxiliary">
        <text class="wot-text-[10px] wot-text-primary">{{ currentTypeLabel }}</text>
      </view>
    </view>

    <!-- Canvas 渲染容器 (固定宽高与边界裁剪，确保图表 100% 贴合容器) -->
    <view class="chart-canvas-wrapper wot-w-full wot-h-[190px] wot-relative wot-rounded-xl wot-overflow-hidden wot-bg-filled-main wot-box-border">
      <!-- 微信小程序与 H5：原生 Canvas 2D 架构 -->
      <!-- #ifndef APP-PLUS -->
      <canvas
        type="2d"
        :id="canvasId"
        class="f2-canvas wot-w-full wot-h-full"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      ></canvas>
      <!-- #endif -->

      <!-- App 原生端：通过 renderjs 动态挂载原生 HTML5 Canvas 2D，完全绕过 uni-app 的 <uni-canvas> 包装器 -->
      <!-- #ifdef APP-PLUS -->
      <view
        :id="canvasId"
        :prop="chartRenderProp"
        :change:prop="f2Render.updateChart"
        class="f2-canvas wot-w-full wot-h-full"
      ></view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script lang="ts">
// Options API 桥接层：接收来自 App-Plus renderjs 视图层的 callMethod 事件回调
export default {
  methods: {
    onAppChartSnapshot(base64: string) {
      if (typeof (this as any).handleSnapshotFromRenderjs === "function") {
        (this as any).handleSnapshotFromRenderjs(base64);
      }
    },
  },
};
</script>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
// #ifndef APP-PLUS
import { Canvas, Chart, Line, Area, Axis, Point, Interval, jsx } from "@antv/f2";
// #endif

/**
 * AntV F2 电池图表组件对外暴露的方法定义
 */
export interface BmsF2ChartExpose {
  /** 导出当前 AntV F2 图表的高清 PNG Base64 数据串 */
  exportChartBase64: () => Promise<string>;
  /** 接收 renderjs 视图层回传的高清 Base64 快照 */
  handleSnapshotFromRenderjs: (base64: string) => void;
}

// 接收组件属性
const props = withDefaults(
  defineProps<{
    /** Canvas 唯一标识 */
    canvasId?: string;
    /** 图表主标题 */
    title?: string;
    /** 图表呈现形式：line 趋势线 / bar 柱状离散 */
    chartType?: "line" | "bar";
    /** 图表数据源列表 */
    chartData?: Array<{ label: string; value: number }>;
  }>(),
  {
    canvasId: "bmsF2ChartCanvas",
    title: "",
    chartType: "line",
    chartData: () => [],
  },
);

const { t } = useI18n();
const instance = getCurrentInstance();

// 内部状态维护
const rawCanvasNode = ref<any>(null);
const f2CanvasInstance = ref<any>(null);
const containerWidth = ref(300);
const containerHeight = ref(190);
const appChartSnapshot = ref("");

// 声明 renderjs 占位引用，防止模板类型检查器报找不到 f2Render 属性
const f2Render = (ref<any>({ updateChart: () => {} }) as any);

/**
 * 接收来自 renderjs 回传的高清图表快照
 */
const handleSnapshotFromRenderjs = (base64: string) => {
  if (base64 && base64.length > 50) {
    appChartSnapshot.value = base64;
  }
};

// 挂载到组件实例上下文，供 Options API 的 methods 桥接调用
if (instance) {
  (instance as any).ctx.handleSnapshotFromRenderjs = handleSnapshotFromRenderjs;
}

// 计算当前图表类型显示标签
const currentTypeLabel = computed(() => {
  return props.chartType === "bar"
    ? t("bms.testPage.f2BarType")
    : t("bms.testPage.f2LineType");
});

/**
 * 默认模拟数据生成（用于未传入数据时的优雅保底展示）
 */
const getDefaultData = () => {
  if (props.chartData && props.chartData.length > 0) {
    return props.chartData;
  }
  if (props.chartType === "bar") {
    // 16 串电芯电压分布 (单位 V，基准 3.30V ~ 3.36V)
    return Array.from({ length: 16 }, (_, i) => ({
      label: `C${i + 1}`,
      value: +(3.31 + Math.sin((i + 1) * 0.8) * 0.025).toFixed(3),
    }));
  }
  // 充放电 SOC 趋势走势 (单位 %)
  return [
    { label: "10:00", value: 65 },
    { label: "11:00", value: 72 },
    { label: "12:00", value: 80 },
    { label: "13:00", value: 88 },
    { label: "14:00", value: 95 },
    { label: "15:00", value: 98 },
    { label: "16:00", value: 100 },
  ];
};

// 传递给 renderjs 的渲染参数响应式对象
const chartRenderProp = computed(() => ({
  canvasId: props.canvasId,
  chartType: props.chartType,
  data: getDefaultData(),
  timestamp: Date.now(),
}));

// #ifndef APP-PLUS
/**
 * 微信小程序与 H5 端：使用 AntV F2 核心引擎绘制图表
 */
const renderF2 = (ctx: any, width: number, height: number, pixelRatio: number) => {
  if (!ctx) return;
  const data = getDefaultData();

  try {
    let chartElement;
    const createJSX: any = jsx;

    if (props.chartType === "bar") {
      // 柱状图：电芯单体电压离散分布
      chartElement = createJSX(Chart, {
        data,
        padding: [16, 16, 32, 45],
        scale: {
          value: {
            min: 3.25,
            max: 3.4,
            tickCount: 4,
            formatter: (v: number) => `${Number(v).toFixed(2)}V`,
          },
          label: {
            range: [0.05, 0.95],
          },
        },
        children: [
          createJSX(Axis, {
            field: "label",
            style: {
              label: { fill: "#64748b", fontSize: "10px" },
              line: { stroke: "#e2e8f0", lineWidth: 1 },
            },
          }),
          createJSX(Axis, {
            field: "value",
            style: {
              label: { fill: "#64748b", fontSize: "10px" },
              grid: { stroke: "#f1f5f9", lineDash: [2, 2] },
            },
          }),
          createJSX(Interval, {
            x: "label",
            y: "value",
            color: "#0052d9",
            style: {
              radius: [2, 2, 0, 0],
            },
          }),
        ],
      });
    } else {
      // 折线面积图：SOC / 电压走势曲线
      chartElement = createJSX(Chart, {
        data,
        padding: [16, 16, 32, 40],
        scale: {
          value: {
            min: 0,
            max: 100,
            tickCount: 5,
            formatter: (v: number) => `${v}%`,
          },
          label: {
            range: [0.06, 0.94],
          },
        },
        children: [
          createJSX(Axis, {
            field: "label",
            style: {
              label: { fill: "#64748b", fontSize: "10px" },
              line: { stroke: "#e2e8f0", lineWidth: 1 },
            },
          }),
          createJSX(Axis, {
            field: "value",
            style: {
              label: { fill: "#64748b", fontSize: "10px" },
              grid: { stroke: "#f1f5f9", lineDash: [2, 2] },
            },
          }),
          createJSX(Area, {
            x: "label",
            y: "value",
            color: "l(90) 0:#0052d9 1:#eff6ff",
            shape: "smooth",
          }),
          createJSX(Line, {
            x: "label",
            y: "value",
            color: "#0052d9",
            shape: "smooth",
          }),
          createJSX(Point, {
            x: "label",
            y: "value",
            color: "#0052d9",
          }),
        ],
      });
    }

    if (f2CanvasInstance.value && typeof f2CanvasInstance.value.destroy === "function") {
      f2CanvasInstance.value.destroy();
    }

    const canvas = new Canvas({
      context: ctx,
      width,
      height,
      pixelRatio,
      px2hd: (v: any) => v,
      theme: {
        fontSize: "10px",
        fontFamily: "sans-serif",
        axis: {
          labelOffset: 8,
          label: {
            fontSize: "10px",
            fill: "#64748b",
          },
          line: {
            stroke: "#e2e8f0",
            lineWidth: 1,
          },
          grid: {
            stroke: "#f1f5f9",
            lineDash: [2, 2],
          },
        },
      },
      children: chartElement,
    });

    f2CanvasInstance.value = canvas;
    canvas.render();
  } catch (renderErr) {
    console.error("[BmsF2Chart] 绘制 AntV F2 图表异常:", renderErr);
  }
};

/**
 * 微信小程序与 H5：初始化并挂载 Canvas 节点
 */
const initChart = () => {
  const query = uni.createSelectorQuery().in(instance?.proxy as any);

  // #ifdef MP-WEIXIN
  query
    .select(`#${props.canvasId}`)
    .fields({ node: true, size: true } as any)
    .exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvasNode = res[0].node;
      const ctx = canvasNode.getContext("2d");
      const dpr = uni.getSystemInfoSync().pixelRatio || 1;

      containerWidth.value = res[0].width;
      containerHeight.value = res[0].height;

      canvasNode.width = res[0].width * dpr;
      canvasNode.height = res[0].height * dpr;

      rawCanvasNode.value = canvasNode;
      renderF2(ctx, res[0].width, res[0].height, dpr);
    });
  // #endif

  // #ifdef H5
  query
    .select(`#${props.canvasId}`)
    .boundingClientRect((res: any) => {
      if (!res || Array.isArray(res) || !res.width) return;
      containerWidth.value = res.width;
      containerHeight.value = res.height;

      const canvasElem = document.getElementById(props.canvasId) as HTMLCanvasElement;
      if (canvasElem) {
        const ctx = canvasElem.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        canvasElem.style.width = res.width + "px";
        canvasElem.style.height = res.height + "px";
        canvasElem.width = res.width * dpr;
        canvasElem.height = res.height * dpr;
        if (ctx) {
          rawCanvasNode.value = canvasElem;
          renderF2(ctx, res.width, res.height, dpr);
        }
      }
    })
    .exec();
  // #endif
};
// #endif

/**
 * 触摸交互事件桥接派发 (非 App 端)
 */
const handleTouchStart = (e: any) => {
  if (f2CanvasInstance.value && typeof f2CanvasInstance.value.dispatchTouchEvent === "function") {
    f2CanvasInstance.value.dispatchTouchEvent(e, "touchstart");
  }
};

const handleTouchMove = (e: any) => {
  if (f2CanvasInstance.value && typeof f2CanvasInstance.value.dispatchTouchEvent === "function") {
    f2CanvasInstance.value.dispatchTouchEvent(e, "touchmove");
  }
};

const handleTouchEnd = (e: any) => {
  if (f2CanvasInstance.value && typeof f2CanvasInstance.value.dispatchTouchEvent === "function") {
    f2CanvasInstance.value.dispatchTouchEvent(e, "touchend");
  }
};

/**
 * 核心对外暴露方法：将当前 AntV F2 图表导出为高分辨率 PNG Base64 格式 (用于无损嵌入 PDF 报告)
 */
const exportChartBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    // 方案 1: App 原生端优先使用 renderjs 提取的高清 Base64 快照
    // #ifdef APP-PLUS
    if (appChartSnapshot.value && appChartSnapshot.value.length > 50) {
      resolve(appChartSnapshot.value);
      return;
    }
    // #endif

    // 方案 2: Canvas 2D 直接通过 toDataURL 提取 Base64 (微信小程序与 H5 原生最快)
    if (rawCanvasNode.value && typeof rawCanvasNode.value.toDataURL === "function") {
      try {
        const base64 = rawCanvasNode.value.toDataURL("image/png");
        if (base64 && base64.length > 50) {
          resolve(base64);
          return;
        }
      } catch {}
    }

    // 方案 3: 降级调用 uni.canvasToTempFilePath
    // #ifdef MP-WEIXIN
    uni.canvasToTempFilePath(
      {
        canvas: rawCanvasNode.value,
        canvasId: props.canvasId,
        fileType: "png",
        success: (res: any) => {
          try {
            const fs = (uni as any).getFileSystemManager?.() || (globalThis as any).wx?.getFileSystemManager?.();
            if (fs && typeof fs.readFileSync === "function") {
              const base64 = fs.readFileSync(res.tempFilePath, "base64");
              resolve(`data:image/png;base64,${base64}`);
            } else {
              resolve(res.tempFilePath);
            }
          } catch (readErr) {
            resolve(res.tempFilePath);
          }
        },
        fail: () => {
          resolve(appChartSnapshot.value || "");
        },
      } as any,
      instance?.proxy as any,
    );
    return;
    // #endif

    // #ifndef MP-WEIXIN
    resolve(appChartSnapshot.value || "");
    // #endif
  });
};

// #ifndef APP-PLUS
// 监听数据源与类型动态变动重绘
watch(
  () => [props.chartType, props.chartData],
  () => {
    initChart();
  },
  { deep: true },
);

onMounted(() => {
  setTimeout(() => {
    initChart();
  }, 100);
});
// #endif

// 对外暴露主动控制接口
defineExpose({
  exportChartBase64,
  handleSnapshotFromRenderjs,
});
</script>

<!-- App-Plus 视图层专属 renderjs 模块：直接运行在真机 WebView 渲染层中，拥有真实 W3C DOM 与 Canvas 2D -->
<!-- #ifdef APP-PLUS -->
<script module="f2Render" lang="renderjs">
import { Canvas, Chart, Line, Area, Axis, Point, Interval, jsx } from "@antv/f2";

export default {
  data() {
    return {
      f2Instance: null,
    };
  },
  mounted() {
    this.$nextTick(() => {
      setTimeout(() => {
        this.renderAppChart(this.chartRenderProp);
      }, 60);
    });
  },
  methods: {
    updateChart(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.renderAppChart(newVal);
        });
      }
    },
    renderAppChart(config) {
      if (!config) return;
      const container = document.getElementById(config.canvasId);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width) || 320;
      const height = Math.floor(rect.height) || 190;
      const dpr = window.devicePixelRatio || 1;

      // 动态在普通 DOM 容器内挂载标准 HTML5 <canvas> 元素，完全绕过 uni-app 的 <uni-canvas> 包装器
      let canvasElem = container.querySelector("canvas");
      if (!canvasElem) {
        canvasElem = document.createElement("canvas");
        canvasElem.id = config.canvasId + "_html5_canvas";
        canvasElem.style.display = "block";
        container.appendChild(canvasElem);
      }

      // 明确设置 Canvas CSS 布局显示尺寸与底层像素分辨率
      canvasElem.style.width = width + "px";
      canvasElem.style.height = height + "px";
      canvasElem.width = width * dpr;
      canvasElem.height = height * dpr;

      const ctx = canvasElem.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const data = config.data;
      let chartElement;
      const createJSX = jsx;

      if (config.chartType === "bar") {
        chartElement = createJSX(Chart, {
          data,
          padding: [16, 16, 32, 45],
          scale: {
            value: {
              min: 3.25,
              max: 3.4,
              tickCount: 4,
              formatter: (v) => `${Number(v).toFixed(2)}V`,
            },
            label: {
              range: [0.05, 0.95],
            },
          },
          children: [
            createJSX(Axis, {
              field: "label",
              style: {
                label: { fill: "#64748b", fontSize: "10px" },
                line: { stroke: "#e2e8f0", lineWidth: 1 },
              },
            }),
            createJSX(Axis, {
              field: "value",
              style: {
                label: { fill: "#64748b", fontSize: "10px" },
                grid: { stroke: "#f1f5f9", lineDash: [2, 2] },
              },
            }),
            createJSX(Interval, {
              x: "label",
              y: "value",
              color: "#0052d9",
              style: {
                radius: [2, 2, 0, 0],
              },
            }),
          ],
        });
      } else {
        chartElement = createJSX(Chart, {
          data,
          padding: [16, 16, 32, 40],
          scale: {
            value: {
              min: 0,
              max: 100,
              tickCount: 5,
              formatter: (v) => `${v}%`,
            },
            label: {
              range: [0.06, 0.94],
            },
          },
          children: [
            createJSX(Axis, {
              field: "label",
              style: {
                label: { fill: "#64748b", fontSize: "10px" },
                line: { stroke: "#e2e8f0", lineWidth: 1 },
              },
            }),
            createJSX(Axis, {
              field: "value",
              style: {
                label: { fill: "#64748b", fontSize: "10px" },
                grid: { stroke: "#f1f5f9", lineDash: [2, 2] },
              },
            }),
            createJSX(Area, {
              x: "label",
              y: "value",
              color: "l(90) 0:#0052d9 1:#eff6ff",
              shape: "smooth",
            }),
            createJSX(Line, {
              x: "label",
              y: "value",
              color: "#0052d9",
              shape: "smooth",
            }),
            createJSX(Point, {
              x: "label",
              y: "value",
              color: "#0052d9",
            }),
          ],
        });
      }

      if (this.f2Instance && typeof this.f2Instance.destroy === "function") {
        this.f2Instance.destroy();
      }

      // 关键：显式设置 px2hd: (v) => v 与 theme.axis 默认字号，彻底禁用移动端 750px rem 放大机制
      const canvas = new Canvas({
        context: ctx,
        width,
        height,
        pixelRatio: dpr,
        px2hd: (v) => v,
        theme: {
          fontSize: "10px",
          fontFamily: "sans-serif",
          axis: {
            labelOffset: 8,
            label: {
              fontSize: "10px",
              fill: "#64748b",
            },
            line: {
              stroke: "#e2e8f0",
              lineWidth: 1,
            },
            grid: {
              stroke: "#f1f5f9",
              lineDash: [2, 2],
            },
          },
        },
        children: chartElement,
      });

      this.f2Instance = canvas;
      canvas.render();

      // 在图表渲染完成后，提取清晰的 Base64 快照并同步给逻辑层
      setTimeout(() => {
        try {
          const base64 = canvasElem.toDataURL("image/png");
          if (base64 && base64.length > 50) {
            this.$ownerInstance.callMethod("onAppChartSnapshot", base64);
          }
        } catch (e) {
          console.warn("[BmsF2Chart] 提取 Base64 异常:", e);
        }
      }, 100);
    },
  },
};
</script>
<!-- #endif -->

<style scoped>
.bms-f2-chart-card {
  transition: all 0.25s ease;
}

.chart-canvas-wrapper {
  background-color: var(--wot-color-bg-base, #f8fafc);
}

.f2-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
