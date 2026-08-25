import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

declare const wx: any;

/**
 * BMS 电池检测与运行报告数据结构契约
 */
export interface BmsReportData {
  /** 报告标题 */
  title: string;
  /** 设备名称 */
  deviceName: string;
  /** 设备 MAC 地址 */
  deviceMac: string;
  /** 报告生成时间 */
  reportTime: string;
  /** 电池基本指标 */
  summary: {
    totalVoltage: string;
    current: string;
    soc: string;
    soh: string;
    remainingCapacity: string;
    cycleCount: string;
    cellCount: string;
    maxCellVoltage: string;
    minCellVoltage: string;
    cellDiffVoltage: string;
    maxTemperature: string;
    minTemperature: string;
    tempDiff: string;
    chargeMos: string;
    dischargeMos: string;
    balanceStatus: string;
  };
  /** 单体电芯电压列表 (mV 或 V) */
  cellVoltages: Array<{ index: number; voltage: string }>;
  /** 保护状态/告警标签列表 */
  alarms?: string[];
  /** 可选：图表截图 Base64 (PNG 格式) */
  chartImageBase64?: string;
}

/**
 * 辅助函数：格式化生成默认 PDF 文件名 (带时间戳)
 */
export function formatPdfFileName(prefix = "bms_report"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}.pdf`;
}

/**
 * 运行时多端环境检测辅助函数
 */
function checkIsAndroid(): boolean {
  // #ifdef APP-PLUS
  return Boolean(typeof plus !== "undefined" && plus.os && plus.os.name && plus.os.name.toLowerCase() === "android");
  // #endif
  // #ifndef APP-PLUS
  return false;
  // #endif
}

function checkIsIOS(): boolean {
  // #ifdef APP-PLUS
  return Boolean(typeof plus !== "undefined" && plus.os && plus.os.name && plus.os.name.toLowerCase() === "ios");
  // #endif
  // #ifndef APP-PLUS
  return false;
  // #endif
}

/**
 * 纯数据驱动：基于 pdf-lib 生成结构化 BMS 电池诊断与遥测 PDF 报告
 * @param reportData 报告数据源
 * @returns PDF 二进制 Uint8Array 数据
 */
export async function buildBmsReportPdf(reportData: BmsReportData): Promise<Uint8Array> {
  console.log("[PdfExport] 开始生成 PDF 报告, 标题:", reportData.title);

  // 1. 创建全新的 PDF 文档实例
  const pdfDoc = await PDFDocument.create();

  // 2. 加载内置标准字体 (Helvetica 矢量英文字体用于英文字符与高精度数据)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 3. A4 纸张尺寸标准 (595.28 x 841.89 pt)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // 新建第 1 页
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // --- 颜色常数定义 ---
  const primaryColor = rgb(0 / 255, 82 / 255, 217 / 255); // #0052d9
  const textMainColor = rgb(24 / 255, 27 / 255, 34 / 255); // #181b22
  const textSubColor = rgb(100 / 255, 116 / 255, 139 / 255); // #64748b
  const borderColor = rgb(226 / 255, 232 / 255, 240 / 255); // #e2e8f0
  const bgLightColor = rgb(248 / 255, 250 / 255, 252 / 255); // #f8fafc
  const successColor = rgb(16 / 255, 185 / 255, 129 / 255); // #10b981
  const dangerColor = rgb(239 / 255, 68 / 255, 68 / 255); // #ef4444

  // --- 绘制顶部 Header 区域 ---
  // 顶部彩色装饰条
  page.drawRectangle({
    x: margin,
    y: currentY - 4,
    width: contentWidth,
    height: 4,
    color: primaryColor,
  });
  currentY -= 20;

  // 报告主标题
  page.drawText(reportData.title || "BMS BATTERY TELEMETRY & DIAGNOSTIC REPORT", {
    x: margin,
    y: currentY,
    size: 16,
    font: fontBold,
    color: primaryColor,
  });
  currentY -= 16;

  // 设备元信息栏 (Device, MAC, Report Time)
  const metaLine = `Device: ${reportData.deviceName} | MAC: ${reportData.deviceMac} | Generated: ${reportData.reportTime}`;
  page.drawText(metaLine, {
    x: margin,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: textSubColor,
  });
  currentY -= 14;

  // 分隔线
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: margin + contentWidth, y: currentY },
    thickness: 0.75,
    color: borderColor,
  });
  currentY -= 18;

  // --- 模块 1: 核心电池指标网格 (Summary Grid) ---
  page.drawText("1. CORE BATTERY METRICS", {
    x: margin,
    y: currentY,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  currentY -= 12;

  // 网格参数
  const cols = 4;
  const colWidth = contentWidth / cols;
  const rowHeight = 32;

  const summaryItems = [
    { label: "Total Voltage", value: reportData.summary.totalVoltage },
    { label: "Current", value: reportData.summary.current },
    { label: "SOC", value: reportData.summary.soc },
    { label: "SOH", value: reportData.summary.soh },
    { label: "Rem. Capacity", value: reportData.summary.remainingCapacity },
    { label: "Cycle Count", value: reportData.summary.cycleCount },
    { label: "Cell Count", value: reportData.summary.cellCount },
    { label: "Cell Max-V", value: reportData.summary.maxCellVoltage },
    { label: "Cell Min-V", value: reportData.summary.minCellVoltage },
    { label: "Diff-V", value: reportData.summary.cellDiffVoltage },
    { label: "Max Temp", value: reportData.summary.maxTemperature },
    { label: "Min Temp", value: reportData.summary.minTemperature },
    { label: "Temp Diff", value: reportData.summary.tempDiff },
    { label: "Charge MOS", value: reportData.summary.chargeMos },
    { label: "Discharge MOS", value: reportData.summary.dischargeMos },
    { label: "Balance Status", value: reportData.summary.balanceStatus },
  ];

  const totalRows = Math.ceil(summaryItems.length / cols);
  const gridHeight = totalRows * rowHeight;

  // 绘制网格背景与边框
  page.drawRectangle({
    x: margin,
    y: currentY - gridHeight,
    width: contentWidth,
    height: gridHeight,
    color: bgLightColor,
    borderColor: borderColor,
    borderWidth: 0.75,
  });

  // 填充网格内容
  summaryItems.forEach((item, idx) => {
    const colIdx = idx % cols;
    const rowIdx = Math.floor(idx / cols);
    const cellX = margin + colIdx * colWidth + 6;
    const cellY = currentY - rowIdx * rowHeight - 12;

    page.drawText(item.label, {
      x: cellX,
      y: cellY,
      size: 7.5,
      font: fontRegular,
      color: textSubColor,
    });

    page.drawText(item.value || "--", {
      x: cellX,
      y: cellY - 12,
      size: 9.5,
      font: fontBold,
      color: textMainColor,
    });
  });

  currentY -= gridHeight + 20;

  // --- 模块 2: 可选图表嵌入 (Chart Image Section) ---
  if (reportData.chartImageBase64) {
    try {
      console.log("[PdfExport] 检测到图表图片，正在嵌入 PDF...");
      const cleanBase64 = reportData.chartImageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = base64ToUint8Array(cleanBase64);
      let embeddedImage;
      if (reportData.chartImageBase64.startsWith("data:image/jpeg") || reportData.chartImageBase64.startsWith("data:image/jpg")) {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      }

      page.drawText("2. TELEMETRY GRAPH & DISTRIBUTION", {
        x: margin,
        y: currentY,
        size: 11,
        font: fontBold,
        color: primaryColor,
      });
      currentY -= 12;

      const chartHeight = 140;
      page.drawImage(embeddedImage, {
        x: margin,
        y: currentY - chartHeight,
        width: contentWidth,
        height: chartHeight,
      });

      currentY -= chartHeight + 20;
    } catch (chartErr) {
      console.warn("[PdfExport] 图表嵌入异常:", chartErr);
    }
  }

  // --- 模块 3: 单体电芯电压明细表格 (Cell Voltages Table) ---
  if (currentY < 180) {
    // 页面剩余空间不足时新建页面
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin - 20;
  }

  page.drawText("3. INDIVIDUAL CELL VOLTAGES", {
    x: margin,
    y: currentY,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  currentY -= 14;

  const cellCols = 8;
  const cellColWidth = contentWidth / cellCols;
  const cellRowHeight = 24;

  // 表格头部背景
  page.drawRectangle({
    x: margin,
    y: currentY - cellRowHeight,
    width: contentWidth,
    height: cellRowHeight,
    color: primaryColor,
  });

  // 表头文字
  for (let c = 0; c < cellCols; c++) {
    page.drawText(`Cell #${c + 1}-${c + 1 + cellCols * 2}`, {
      x: margin + c * cellColWidth + 4,
      y: currentY - 15,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }
  currentY -= cellRowHeight;

  // 渲染电芯列表
  const cells = reportData.cellVoltages || [];
  const cellRows = Math.ceil(cells.length / cellCols);

  for (let r = 0; r < cellRows; r++) {
    const isEven = r % 2 === 0;
    const rowY = currentY - (r + 1) * cellRowHeight;

    page.drawRectangle({
      x: margin,
      y: rowY,
      width: contentWidth,
      height: cellRowHeight,
      color: isEven ? bgLightColor : rgb(1, 1, 1),
      borderColor: borderColor,
      borderWidth: 0.5,
    });

    for (let c = 0; c < cellCols; c++) {
      const cellIdx = r * cellCols + c;
      if (cellIdx < cells.length) {
        const cellData = cells[cellIdx];
        const cellX = margin + c * cellColWidth + 4;

        page.drawText(`C${cellData.index}: ${cellData.voltage}`, {
          x: cellX,
          y: rowY + 7,
          size: 8,
          font: fontRegular,
          color: textMainColor,
        });
      }
    }
  }

  currentY -= cellRows * cellRowHeight + 24;

  // --- 模块 4: 底部版权与免责信息 ---
  const pages = pdfDoc.getPages();
  pages.forEach((p, pIndex) => {
    p.drawLine({
      start: { x: margin, y: margin + 15 },
      end: { x: margin + contentWidth, y: margin + 15 },
      thickness: 0.5,
      color: borderColor,
    });

    p.drawText("BMS Intelligent Battery Management System - Confidential Telemetry Report", {
      x: margin,
      y: margin + 4,
      size: 7,
      font: fontRegular,
      color: textSubColor,
    });

    const pageText = `Page ${pIndex + 1} of ${pages.length}`;
    p.drawText(pageText, {
      x: margin + contentWidth - 45,
      y: margin + 4,
      size: 7,
      font: fontRegular,
      color: textSubColor,
    });
  });

  // 保存为 Uint8Array
  const pdfBytes = await pdfDoc.save();
  console.log("[PdfExport] PDF 字节流生成成功, 大小:", pdfBytes.length, "bytes");
  return pdfBytes;
}

/**
 * 跨端文件保存：将 PDF 二进制数据保存到手机存储中并返回绝对路径
 * @param pdfBytes PDF 二进制数据
 * @param customName 自定义文件名
 */
export function savePdfFile(pdfBytes: Uint8Array, customName?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileName = customName || formatPdfFileName();
    const isAndroid = checkIsAndroid();
    const isIOS = checkIsIOS();
    console.log("[PdfExport] savePdfFile 启动, 文件名:", fileName, "isAndroid:", isAndroid, "isIOS:", isIOS);

    // #ifdef APP-PLUS
    // Android 原生首选：直接通过 Java FileOutputStream 写入手机公共 Download 目录
    if (isAndroid) {
      try {
        console.log("[PdfExport] 开始执行 Android 原生直写公共 Download 目录流程...");
        const File = (plus.android.importClass("java.io.File") as any);
        const FileOutputStream = (plus.android.importClass("java.io.FileOutputStream") as any);
        const Environment = (plus.android.importClass("android.os.Environment") as any);
        const context = (plus.android.runtimeMainActivity() as any);

        const downloadDir = Environment.getExternalStoragePublicDirectory("Download");
        if (!downloadDir.exists()) {
          downloadDir.mkdirs();
        }

        const destFile = new File(downloadDir, fileName);
        const publicPath = destFile.getAbsolutePath();

        const outStream = new FileOutputStream(destFile);
        // 通过 Base64 桥接转为 Java byte[]，保障大数组高效写入
        const base64Data = uint8ArrayToBase64(pdfBytes);
        const Base64 = (plus.android.importClass("android.util.Base64") as any);
        const decodedBytes = Base64.decode(base64Data, 0);

        outStream.write(decodedBytes);
        outStream.flush();
        outStream.close();

        if (destFile.exists() && destFile.length() > 0) {
          const Intent = (plus.android.importClass("android.content.Intent") as any);
          const Uri = (plus.android.importClass("android.net.Uri") as any);
          const intent = new Intent("android.intent.action.MEDIA_SCANNER_SCAN_FILE");
          intent.setData(Uri.fromFile(destFile));
          context.sendBroadcast(intent);

          console.log("[PdfExport] 成功直接写入公共 Download 目录:", publicPath);
          resolve(publicPath);
          return;
        }
      } catch (fileStreamErr) {
        console.error("[PdfExport] Android FileOutputStream 直写异常，降级使用沙盒处理:", fileStreamErr);
      }
    }

    // iOS 或 Android 降级使用 HTML5+ 沙盒文件系统
    const tempPath = "_doc/" + fileName;
    console.log("[PdfExport] 开始执行 HTML5+ 沙盒文件写入流程, tempPath:", tempPath);
    plus.io.resolveLocalFileSystemURL(
      "_doc/",
      (entry: any) => {
        entry.getFile(
          fileName,
          { create: true },
          (fileEntry: any) => {
            fileEntry.createWriter(
              (writer: any) => {
                writer.onwrite = () => {
                  const nativePath = fileEntry.toLocalURL();
                  console.log("[PdfExport] 沙盒 PDF 写入成功:", nativePath);
                  resolve(nativePath);
                };
                writer.onerror = (err: any) => {
                  console.error("[PdfExport] 写入沙盒失败:", err);
                  reject(err);
                };
                const base64Data = uint8ArrayToBase64(pdfBytes);
                const blob = base64ToBlob(base64Data, "application/pdf");
                writer.write(blob);
              },
              (writerErr: any) => reject(writerErr),
            );
          },
          (getFileErr: any) => reject(getFileErr),
        );
      },
      (resolveErr: any) => reject(resolveErr),
    );
    // #endif

    // #ifdef MP-WEIXIN
    try {
      const fs = wx.getFileSystemManager();
      const targetPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      fs.writeFile({
        filePath: targetPath,
        data: pdfBytes.buffer,
        encoding: "binary",
        success: () => {
          console.log("[PdfExport] 微信小程序沙盒 PDF 写入成功:", targetPath);
          resolve(targetPath);
        },
        fail: (err: any) => {
          console.error("[PdfExport] 微信小程序写入 PDF 失败:", err);
          reject(err);
        },
      });
    } catch (wxErr) {
      reject(wxErr);
    }
    // #endif

    // #ifdef H5
    try {
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve(fileName);
    } catch (h5Err: any) {
      reject(new Error("浏览器下载 PDF 失败: " + (h5Err.message || h5Err)));
    }
    // #endif
  });
}

/**
 * 跨端打开 PDF 文件进行查看、管理与分享（基于 uni.openDocument 官方原生组件）
 * @param filePath 保存成功的文件路径
 */
export function openPdfDocument(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("[PdfExport] openPdfDocument 启动, 目标路径:", filePath);

    // #ifndef H5
    uni.openDocument({
      filePath,
      showMenu: true,
      fileType: "pdf",
      success: () => {
        console.log("[PdfExport] uni.openDocument 成功打开 PDF");
        resolve(true);
      },
      fail: (err: any) => {
        console.error("[PdfExport] uni.openDocument 打开 PDF 失败:", err);
        resolve(false);
      },
    });
    // #endif

    // #ifdef H5
    resolve(true);
    // #endif
  });
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * 纯工具函数：Uint8Array 转 Base64 (兼容所有 JS 引擎与小程序)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    let enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    let enc4 = b3 & 63;

    if (i + 1 >= len) {
      enc3 = 64;
      enc4 = 64;
    } else if (i + 2 >= len) {
      enc4 = 64;
    }

    result +=
      BASE64_CHARS.charAt(enc1) +
      BASE64_CHARS.charAt(enc2) +
      (enc3 === 64 ? "=" : BASE64_CHARS.charAt(enc3)) +
      (enc4 === 64 ? "=" : BASE64_CHARS.charAt(enc4));
  }
  return result;
}

/**
 * 纯工具函数：Base64 转 Uint8Array (兼容所有 JS 引擎与小程序)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  const bufferLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(bufferLen);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(clean.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const enc3 = BASE64_CHARS.indexOf(clean.charAt(i + 2));
    const enc4 = BASE64_CHARS.indexOf(clean.charAt(i + 3));

    const b1 = (enc1 << 2) | (enc2 >> 4);
    const b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const b3 = ((enc3 & 3) << 6) | enc4;

    bytes[p++] = b1;
    if (enc3 !== -1 && enc3 !== 64 && p < bufferLen) bytes[p++] = b2;
    if (enc4 !== -1 && enc4 !== 64 && p < bufferLen) bytes[p++] = b3;
  }
  return bytes.subarray(0, p);
}

/**
 * 纯工具函数：Base64 转 Blob (用于沙盒 writer)
 */
function base64ToBlob(base64Data: string, contentType: string): Blob {
  const bytes = base64ToUint8Array(base64Data);
  return new Blob([bytes], { type: contentType });
}
