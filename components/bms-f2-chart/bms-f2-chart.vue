<template>
  <view class="bms-chart-card wot-w-full wot-bg-filled-oppo wot-rounded-2xl wot-p-4 wot-border wot-border-solid wot-border-border-main wot-shadow-sm wot-box-border">
    <!-- 图表标题与类型指示栏 -->
    <view class="wot-flex wot-items-center wot-justify-between wot-mb-2">
      <view class="wot-flex wot-items-center wot-gap-2">
        <view class="wot-w-2 wot-h-3.5 wot-rounded-full wot-bg-primary"></view>
        <text class="wot-text-xs wot-font-bold wot-text-text-main">{{ title || $t('bms.testPage.f2ChartTitle') }}</text>
      </view>

      <!-- 图表类型切换指示 -->
      <view class="wot-flex wot-items-center wot-gap-1.5 wot-text-[11px] wot-text-text-auxiliary">
        <text class="wot-text-[10px] wot-text-primary">{{ currentTypeLabel }}</text>
      </view>
    </view>

    <!-- LimeEchart 跨端渲染容器 (支持微信小程序 Canvas 2D 同层渲染，彻底消灭弹窗穿透) -->
    <view class="chart-canvas-wrapper wot-w-full wot-h-[200px] wot-relative wot-rounded-xl wot-overflow-hidden wot-bg-filled-main wot-box-border">
      <l-echart ref="chartRef" custom-style="width: 100%; height: 100%;" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";
import { storeToRefs } from "pinia";
import LEchart from "@/uni_modules/lime-echart/components/l-echart/l-echart.vue";

// 引入插件预打包的 ESM 单文件产物（已内联合并 zrender，彻底杜绝散列文件路径解析异常）
// @ts-ignore
import * as echarts from "@/uni_modules/lime-echart/lib/echarts.esm.min.js";

declare const wx: any;
declare const plus: any;

/**
 * 图表数据项接口定义
 */
export interface ChartDataItem {
  label: string;
  value: number;
}

/**
 * 电池图表组件对外暴露的方法定义
 */
export interface BmsF2ChartExpose {
  /** 导出当前图表的高清 PNG Base64/本地路径数据串 */
  exportChartBase64: () => Promise<string>;
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
    chartData?: ChartDataItem[];
  }>(),
  {
    canvasId: "bmsChartCanvas",
    title: "",
    chartType: "line",
    chartData: () => [],
  },
);

const { t } = useI18n();
const appStore = useAppStore();
const { actualTheme } = storeToRefs(appStore);

const chartRef = ref<any>(null);
let myChart: any = null;

// 计算当前图表类型显示标签（收拢三目运算符）
const currentTypeLabel = computed(() => {
  if (props.chartType === "bar") {
    return t("bms.testPage.f2BarType");
  }
  return t("bms.testPage.f2LineType");
});

/**
 * 默认模拟数据生成
 */
const getDefaultData = (): ChartDataItem[] => {
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

/**
 * 构建 ECharts 标准配置对象
 */
const buildChartOption = () => {
  const isDark = actualTheme.value === "dark";
  const data = getDefaultData();
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);

  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#f1f5f9";
  const splitLineColor = isDark ? "#334155" : "#e2e8f0";
  const primaryColor = "#0052d9";

  if (props.chartType === "bar") {
    return {
      animation: false,
      grid: { top: 28, right: 12, bottom: 24, left: 48 },
      tooltip: {
        trigger: "axis",
        formatter: "{b}: {c} V",
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: {
          color: textColor,
          fontSize: 9,
          interval: labels.length > 8 ? 1 : 0,
        },
      },
      yAxis: {
        type: "value",
        min: (val: any) => Math.floor((val.min - 0.02) * 100) / 100,
        max: (val: any) => Math.ceil((val.max + 0.02) * 100) / 100,
        axisLabel: {
          formatter: "{value}V",
          color: textColor,
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: "dashed",
          },
        },
      },
      series: [
        {
          data: values,
          type: "bar",
          barWidth: "55%",
          itemStyle: {
            color: primaryColor,
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }

  // 折线平滑趋势图
  return {
    animation: false,
    grid: { top: 28, right: 16, bottom: 24, left: 45 },
    tooltip: {
      trigger: "axis",
      formatter: "{b}: {c}%",
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: splitLineColor } },
      axisLabel: { color: textColor, fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: {
        formatter: "{value}%",
        color: textColor,
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: gridColor,
          type: "dashed",
        },
      },
    },
    series: [
      {
        data: values,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: {
          color: primaryColor,
          borderColor: "#ffffff",
          borderWidth: 1.5,
        },
        lineStyle: { width: 2.5, color: primaryColor },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0, 82, 217, 0.3)" },
              { offset: 1, color: "rgba(0, 82, 217, 0.02)" },
            ],
          },
        },
      },
    ],
  };
};

/**
 * 驱动 LimeEchart 执行图表初始化与渲染
 */
const renderChart = async () => {
  if (!chartRef.value) return;

  try {
    if (!myChart) {
      myChart = await chartRef.value.init(echarts);
    }
    const option = buildChartOption();
    if (myChart && typeof myChart.setOption === "function") {
      myChart.setOption(option, true);
    }
  } catch (err) {
    console.error("[LimeEchart] 图表渲染异常:", err);
  }
};

/**
 * 导出图表的高清快照 Base64 数据串（支持微信小程序与 App 端）
 */
const exportChartBase64 = async (): Promise<string> => {
  return new Promise((resolve) => {
    if (!chartRef.value || typeof chartRef.value.canvasToTempFilePath !== "function") {
      console.warn("[LimeEchart] chartRef 尚未就绪，无法提取快照");
      resolve("");
      return;
    }

    const readBase64FromPath = (path: string): string => {
      // #ifdef MP-WEIXIN
      try {
        const fs = typeof wx !== "undefined" ? wx.getFileSystemManager() : null;
        if (fs && typeof fs.readFileSync === "function") {
          const fileData = fs.readFileSync(path, "base64");
          if (fileData) {
            return `data:image/png;base64,${fileData}`;
          }
        }
      } catch (e) {
        console.warn("[LimeEchart] 小程序 readFileSync 异常:", e);
      }
      // #endif

      // #ifdef APP-PLUS
      try {
        if (typeof plus !== "undefined" && plus.io) {
          plus.io.resolveLocalFileSystemURL(
            path,
            (entry: any) => {
              entry.file((file: any) => {
                const reader = new plus.io.FileReader();
                reader.onloadend = (e: any) => {
                  resolve(e.target.result || path);
                };
                reader.onerror = () => {
                  resolve(path);
                };
                reader.readAsDataURL(file);
              });
            },
            () => {
              resolve(path);
            },
          );
          return "";
        }
      } catch (appErr) {
        console.warn("[LimeEchart] App FileReader 异常:", appErr);
      }
      // #endif

      return path;
    };

    chartRef.value.canvasToTempFilePath({
      fileType: "png",
      quality: 1,
      success: (res: any) => {
        if (res && res.tempFilePath) {
          const base64 = readBase64FromPath(res.tempFilePath);
          if (base64) {
            resolve(base64);
          }
        } else {
          resolve("");
        }
      },
      fail: (err: any) => {
        console.error("[LimeEchart] canvasToTempFilePath 失败:", err);
        resolve("");
      },
    });
  });
};

// 监听类型、数据和主题变化自动重绘
watch(
  () => [props.chartType, props.chartData, actualTheme.value],
  () => {
    renderChart();
  },
  { deep: true },
);

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      renderChart();
    }, 100);
  });
});

onUnmounted(() => {
  if (myChart && typeof myChart.dispose === "function") {
    myChart.dispose();
    myChart = null;
  }
});

defineExpose({
  exportChartBase64,
});
</script>

<style scoped>
.bms-chart-card {
  transition: all 0.25s ease;
}

.chart-canvas-wrapper {
  background-color: var(--wot-color-bg-base, #f8fafc);
}
</style>
