<template>
  <layout-provider>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <wd-navbar
      :title="$t('bms.testPage.title')"
      fixed
      placeholder
      left-arrow
      safe-area-inset-top
      @click-left="goBack"
    />

    <view class="wot-px-3.5 wot-py-4 wot-flex wot-flex-col wot-gap-4 page-body-animate">
      <!-- 1. AntV F2 移动端可视化图表组件展示 -->
      <bms-f2-chart
        ref="f2ChartRef"
        canvas-id="bmsF2TestCanvas"
        :chart-type="currentChartType"
        :title="$t('bms.testPage.f2ChartTitle')"
      />

      <!-- 图表类型切换控制 -->
      <view class="wot-flex wot-justify-end">
        <wd-button
          size="small"
          plain
          custom-class="wot-rounded-lg"
          @click="toggleChartType"
        >
          <view class="wot-flex wot-items-center wot-gap-1">
            <wd-icon css-icon="i-lucide-refresh-cw" size="13px" />
            <text>{{ $t('bms.testPage.f2ToggleBtn') }}</text>
          </view>
        </wd-button>
      </view>

      <!-- 2. PDF 纯数据与图表导出控制卡片 -->
      <view
        class="wot-bg-filled-oppo wot-rounded-2xl wot-p-4 wot-border wot-border-solid wot-border-border-main wot-shadow-sm"
      >
        <view class="wot-flex wot-items-center wot-gap-2.5 wot-mb-2">
          <view class="wot-w-8 wot-h-8 wot-rounded-lg wot-bg-primary/10 wot-flex wot-items-center wot-justify-center">
            <wd-icon css-icon="i-lucide-file-text" size="18px" color="var(--wot-color-theme, #0052d9)" />
          </view>
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-sm wot-font-bold wot-text-text-main">
              {{ $t('bms.testPage.pdfSectionTitle') }}
            </text>
            <text class="wot-text-[11px] wot-text-text-auxiliary">
              {{ $t('bms.testPage.pdfSectionDesc') }}
            </text>
          </view>
        </view>

        <!-- 导出操作按钮组 -->
        <view class="wot-flex wot-flex-col wot-gap-2.5 wot-mt-4">
          <!-- 导出基础矢量数据诊断报告 -->
          <wd-button
            type="primary"
            block
            :loading="isExportingNormal"
            custom-class="wot-rounded-lg"
            @click="handleExportNormalPdf"
          >
            <view class="wot-flex wot-items-center wot-justify-center wot-gap-1.5">
              <wd-icon css-icon="i-lucide-file-spreadsheet" size="16px" />
              <text>{{ $t('bms.testPage.exportReportBtn') }}</text>
            </view>
          </wd-button>

          <!-- 导出包含 AntV F2 当前图表快照的 PDF 报告 -->
          <wd-button
            type="success"
            block
            plain
            :loading="isExportingWithChart"
            custom-class="wot-rounded-lg"
            @click="handleExportPdfWithChart"
          >
            <view class="wot-flex wot-items-center wot-justify-center wot-gap-1.5">
              <wd-icon css-icon="i-lucide-bar-chart-3" size="16px" />
              <text>{{ $t('bms.testPage.exportChartPdfBtn') }}</text>
            </view>
          </wd-button>
        </view>
      </view>

      <!-- 3. 导出成功二次确认弹窗 -->
      <wd-popup
        v-model="showSuccessModal"
        position="center"
        custom-style="width: 88%; max-width: 360px; border-radius: 16px; overflow: hidden;"
        :close-on-click-modal="false"
      >
        <view class="wot-p-5 wot-flex wot-flex-col wot-items-center wot-box-border">
          <!-- 成功图标 -->
          <view class="wot-w-12 wot-h-12 wot-rounded-full wot-bg-emerald-500/10 wot-flex wot-items-center wot-justify-center wot-mb-3">
            <wd-icon css-icon="i-lucide-check-circle" size="28px" color="#10b981" />
          </view>

          <!-- 标题 -->
          <text class="wot-text-base wot-font-bold wot-text-text-main wot-mb-1.5">
            {{ $t('bms.testPage.exportSuccessTitle') }}
          </text>

          <!-- 描述 -->
          <text class="wot-text-xs wot-text-text-auxiliary wot-text-center wot-mb-4 wot-leading-relaxed">
            {{ $t('bms.testPage.savedDesc') }}
          </text>

          <!-- 目录地址卡片 (可点击直接打开 PDF 文件 + 自动换行无横向滚动条) -->
          <view
            class="directory-card wot-w-full wot-p-3 wot-rounded-lg wot-box-border wot-mb-4 wot-cursor-pointer"
            @click="handleOpenPdf"
          >
            <view class="wot-flex wot-items-center wot-justify-between wot-mb-1.5">
              <view class="wot-flex wot-items-center wot-gap-1.5">
                <wd-icon css-icon="i-lucide-folder-open" size="14px" color="#10b981" />
                <text class="wot-text-[11px] wot-font-bold wot-text-text-main">{{ $t('bms.logs.savedDirectoryTitle') }}</text>
              </view>
              <view class="wot-flex wot-items-center wot-gap-1">
                <text class="wot-text-[10px] wot-text-emerald-600 dark:wot-text-emerald-400">{{ $t('bms.logs.tapToOpenFolder') }}</text>
                <wd-icon css-icon="i-lucide-chevron-right" size="10px" color="#10b981" />
              </view>
            </view>

            <text class="directory-path-text monospace">
              {{ exportedPdfPath }}
            </text>
          </view>

          <!-- 底部操作按钮 -->
          <view class="wot-flex wot-gap-2.5 wot-w-full">
            <wd-button
              plain
              block
              custom-class="wot-rounded-lg"
              class="wot-flex-1"
              @click="showSuccessModal = false"
            >
              {{ $t('bms.testPage.close') }}
            </wd-button>
            <wd-button
              type="primary"
              block
              custom-class="wot-rounded-lg"
              class="wot-flex-1"
              @click="handleOpenPdf"
            >
              {{ $t('bms.testPage.openPdfBtn') }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@wot-ui/ui";
import { useBleStore } from "@/stores/ble-store";
import { storeToRefs } from "pinia";
import BmsF2Chart from "@/components/bms-f2-chart/bms-f2-chart.vue";
import {
  buildBmsReportPdf,
  savePdfFile,
  openPdfDocument,
  formatPdfFileName,
  type BmsReportData,
} from "@/utils/pdf-helper";

// 获取 i18n 与交互 Toast
const { t } = useI18n();
const toast = useToast();
const bleStore = useBleStore();
const {
  connectedDeviceName,
  connectedDeviceMac,
  isBleConnected,
  batteryPercent,
  totalVoltage,
  realtimeCurrent,
  temperature,
  extendedProtocolData,
} = storeToRefs(bleStore);

// 图表引用与状态
const f2ChartRef = ref<InstanceType<typeof BmsF2Chart> | null>(null);
const currentChartType = ref<"line" | "bar">("line");

// 导出交互状态控制
const isExportingNormal = ref(false);
const isExportingWithChart = ref(false);
const showSuccessModal = ref(false);
const exportedPdfPath = ref("");

/**
 * 切换 AntV F2 图表呈现形式（折线趋势 <-> 电芯离散柱状）
 */
const toggleChartType = () => {
  currentChartType.value = currentChartType.value === "line" ? "bar" : "line";
};

/**
 * 返回上一级页面
 */
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({
        url: "/pages/mine/index",
      });
    },
  });
};

/**
 * 组装当前 BMS 电池运行与遥测报告模拟数据源
 */
const getBmsReportPayload = async (includeChart = false): Promise<BmsReportData> => {
  const dateStr = new Date().toLocaleString();
  const cellVoltages: Array<{ index: number; voltage: string }> = [];

  // 纯模拟数据：16 串锂电池单体电芯数据
  for (let i = 1; i <= 16; i++) {
    const mockMv = 3315 + Math.floor(Math.sin(i) * 15);
    cellVoltages.push({
      index: i,
      voltage: `${(mockMv / 1000).toFixed(3)}V`,
    });
  }

  const payload: BmsReportData = {
    title: "BMS BATTERY TELEMETRY & DIAGNOSTIC REPORT",
    deviceName: "BMS-TEST-DEVICE-01",
    deviceMac: "AA:BB:CC:DD:EE:FF",
    reportTime: dateStr,
    summary: {
      totalVoltage: "53.12 V",
      current: "12.50 A",
      soc: "88 %",
      soh: "99 %",
      remainingCapacity: "88.0 Ah",
      cycleCount: "45",
      cellCount: `${cellVoltages.length}`,
      maxCellVoltage: "3328 mV",
      minCellVoltage: "3312 mV",
      cellDiffVoltage: "16 mV",
      maxTemperature: "26.5 °C",
      minTemperature: "24.0 °C",
      tempDiff: "2.5 °C",
      chargeMos: "ON (NORMAL)",
      dischargeMos: "ON (NORMAL)",
      balanceStatus: "ACTIVE",
    },
    cellVoltages,
  };

  // 如果需要包含图表，严格提取真实 AntV F2 图表 Base64 快照，失败直接抛错提示
  if (includeChart) {
    if (!f2ChartRef.value) {
      throw new Error(t("bms.testPage.chartCaptureFail"));
    }
    const chartBase64 = await f2ChartRef.value.exportChartBase64();
    if (!chartBase64 || chartBase64.length < 50) {
      throw new Error(t("bms.testPage.chartCaptureFail"));
    }
    payload.chartImageBase64 = chartBase64;
  }

  return payload;
};

/**
 * 导出基础矢量数据 PDF 报告
 */
const handleExportNormalPdf = async () => {
  if (isExportingNormal.value) return;
  isExportingNormal.value = true;
  toast.loading(t("bms.testPage.exporting"));

  try {
    const payload = await getBmsReportPayload(false);
    const pdfBytes = await buildBmsReportPdf(payload);
    const fileName = formatPdfFileName("bms_diagnostic");
    const savedPath = await savePdfFile(pdfBytes, fileName);

    exportedPdfPath.value = savedPath;
    showSuccessModal.value = true;
    toast.success(t("bms.testPage.exportSuccess"));
  } catch (err: any) {
    console.error("[PdfTest] 导出 PDF 失败:", err);
    toast.error(t("bms.testPage.exportFail") + ": " + (err.message || err));
  } finally {
    isExportingNormal.value = false;
  }
};

/**
 * 导出包含实时 AntV F2 图表截图的 PDF 报告
 */
const handleExportPdfWithChart = async () => {
  if (isExportingWithChart.value) return;
  isExportingWithChart.value = true;
  toast.loading(t("bms.testPage.exporting"));

  try {
    const payload = await getBmsReportPayload(true);
    const pdfBytes = await buildBmsReportPdf(payload);
    const fileName = formatPdfFileName("bms_chart_report");
    const savedPath = await savePdfFile(pdfBytes, fileName);

    exportedPdfPath.value = savedPath;
    showSuccessModal.value = true;
    toast.success(t("bms.testPage.exportSuccess"));
  } catch (err: any) {
    console.error("[PdfTest] 导出带图表 PDF 失败:", err);
    toast.error(t("bms.testPage.exportFail") + ": " + (err.message || err));
  } finally {
    isExportingWithChart.value = false;
  }
};

/**
 * 打开或预览已生成的 PDF 文件
 */
const handleOpenPdf = async () => {
  if (!exportedPdfPath.value) return;

  // 自动将路径复制到剪贴板，方便用户留存
  uni.setClipboardData({
    data: exportedPdfPath.value,
    showToast: false,
    success: () => {
      toast.show(t("bms.logs.pathCopiedHint"));
    },
  });

  const success = await openPdfDocument(exportedPdfPath.value);
  if (success) {
    showSuccessModal.value = false;
  }
};
</script>

<style scoped>
.page-body-animate {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 目录卡片样式 */
.directory-card {
  background-color: var(--wot-color-bg-base, #f1f5f9);
  border: 1px solid var(--wot-color-border, #e2e8f0);
}

.directory-path-text {
  font-size: 11px;
  color: var(--wot-color-text-description, #475569);
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
  display: block;
}

.monospace {
  font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
