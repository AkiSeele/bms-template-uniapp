/**
 * 跨端 Excel 导出与文件保存工具类
 * 基于 xlsx-js-style 构建多工作表（Sheet）专业级报表
 * 完美兼容 App（Android公共Download目录零拷贝+媒体库广播/iOS沙盒）、微信小程序（wx.openDocument预览与分享）、H5浏览器下载
 */

import * as XLSX from "xlsx-js-style";
import { isAppAndroid, isAppIOS } from "@uni-helper/uni-env";

// 声明多端原生宿主全局环境对象
declare const plus: any;
declare const wx: any;

/**
 * 通用单元格细边框样式
 */
const THIN_BORDER = {
  top: { style: "thin", color: { rgb: "D1D5DB" } },
  bottom: { style: "thin", color: { rgb: "D1D5DB" } },
  left: { style: "thin", color: { rgb: "D1D5DB" } },
  right: { style: "thin", color: { rgb: "D1D5DB" } },
};

/**
 * 表头样式：宝石科技蓝背景 + 白色粗体居中
 */
const HEADER_STYLE = {
  font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "0052D9" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: THIN_BORDER,
};

/**
 * 普通居中单元格样式
 */
const CELL_CENTER_STYLE = {
  font: { sz: 9, color: { rgb: "1D1F29" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: THIN_BORDER,
};

/**
 * 普通左对齐单元格样式（适合路径、参数、长文本）
 */
const CELL_LEFT_STYLE = {
  font: { sz: 9, color: { rgb: "1D1F29" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border: THIN_BORDER,
};

/**
 * 成功状态徽标单元格样式（淡绿底 + 深绿字）
 */
const SUCCESS_STYLE = {
  font: { bold: true, sz: 9, color: { rgb: "2BA471" } },
  fill: { fgColor: { rgb: "E8F8F0" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: THIN_BORDER,
};

/**
 * 失败状态徽标单元格样式（淡红底 + 深红字）
 */
const DANGER_STYLE = {
  font: { bold: true, sz: 9, color: { rgb: "FA3534" } },
  fill: { fgColor: { rgb: "FEECEB" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: THIN_BORDER,
};

/**
 * 发送 TX 标识样式（淡蓝底 + 科技蓝字）
 */
const TX_STYLE = {
  font: { bold: true, sz: 9, color: { rgb: "0052D9" } },
  fill: { fgColor: { rgb: "EBF3FF" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: THIN_BORDER,
};

/**
 * 接收 RX 标识样式（淡绿底 + 绿字）
 */
const RX_STYLE = {
  font: { bold: true, sz: 9, color: { rgb: "2BA471" } },
  fill: { fgColor: { rgb: "E8F8F0" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: THIN_BORDER,
};

/**
 * 系统属性分类标题样式
 */
const CATEGORY_STYLE = {
  font: { bold: true, sz: 9, color: { rgb: "4E5369" } },
  fill: { fgColor: { rgb: "F3F4F6" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: THIN_BORDER,
};

/**
 * 将 ArrayBuffer 转为 Base64（分块 32KB 处理，彻底杜绝调用栈溢出）
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

/**
 * 格式化当前时间为文件名友好格式 (如 20260821_175000)
 */
export function formatDateTimeForFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

/**
 * 为工作表的指定范围应用单元格样式
 */
function applySheetStyles(ws: XLSX.WorkSheet, stylesMatrix: any[][]) {
  stylesMatrix.forEach((rowStyles, r) => {
    rowStyles.forEach((style, c) => {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      if (ws[cellAddr]) {
        ws[cellAddr].s = style;
      }
    });
  });
}

/**
 * 核心导出函数：将全量日志与系统环境数据转换为美观的多 Sheet Excel ArrayBuffer
 */
export function buildLogsExcelBuffer(payload: {
  commandLogs: any[];
  connectionLogs: any[];
  apiLogs: any[];
  systemReport: any;
}): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // Sheet 1: 指令报文日志 (Command Logs)
  // ==========================================
  {
    const wsData: any[][] = [];
    const stylesMatrix: any[][] = [];

    // 1.1 表头
    const headers = ["序号", "记录时间", "流向", "HEX 原始报文", "字节数", "说明"];
    wsData.push(headers);
    stylesMatrix.push(headers.map(() => HEADER_STYLE));

    // 1.2 数据行
    payload.commandLogs.forEach((item, idx) => {
      const direction = item.direction || "TX";
      const hex = item.hexData || "";
      const byteLen = hex ? Math.ceil(hex.replace(/\s+/g, "").length / 2) : 0;
      const row = [idx + 1, item.timestamp || "-", direction, hex, byteLen, item.desc || "-"];
      wsData.push(row);

      stylesMatrix.push([
        CELL_CENTER_STYLE,
        CELL_CENTER_STYLE,
        direction === "TX" ? TX_STYLE : RX_STYLE,
        CELL_LEFT_STYLE,
        CELL_CENTER_STYLE,
        CELL_LEFT_STYLE,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applySheetStyles(ws, stylesMatrix);
    ws["!cols"] = [
      { wch: 8 }, // 序号
      { wch: 22 }, // 时间
      { wch: 10 }, // 流向
      { wch: 45 }, // HEX 报文
      { wch: 10 }, // 字节数
      { wch: 20 }, // 说明
    ];
    XLSX.utils.book_append_sheet(wb, ws, "指令报文日志");
  }

  // ==========================================
  // Sheet 2: 连接调用日志 (Connection Logs)
  // ==========================================
  {
    const wsData: any[][] = [];
    const stylesMatrix: any[][] = [];

    // 2.1 表头
    const headers = ["序号", "记录时间", "执行状态", "API 方法名", "输入参数", "返回结果"];
    wsData.push(headers);
    stylesMatrix.push(headers.map(() => HEADER_STYLE));

    // 2.2 数据行
    payload.connectionLogs.forEach((item, idx) => {
      const isSuccess = item.status === "success";
      const row = [
        idx + 1,
        item.timestamp || "-",
        isSuccess ? "SUCCESS" : "ERROR",
        item.apiName || "-",
        item.params || "-",
        item.result || "-",
      ];
      wsData.push(row);

      stylesMatrix.push([
        CELL_CENTER_STYLE,
        CELL_CENTER_STYLE,
        isSuccess ? SUCCESS_STYLE : DANGER_STYLE,
        CELL_LEFT_STYLE,
        CELL_LEFT_STYLE,
        CELL_LEFT_STYLE,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applySheetStyles(ws, stylesMatrix);
    ws["!cols"] = [
      { wch: 8 }, // 序号
      { wch: 22 }, // 时间
      { wch: 12 }, // 状态
      { wch: 30 }, // API 方法
      { wch: 35 }, // 入参
      { wch: 35 }, // 结果
    ];
    XLSX.utils.book_append_sheet(wb, ws, "连接调用日志");
  }

  // ==========================================
  // Sheet 3: 网络接口日志 (API Logs)
  // ==========================================
  {
    const wsData: any[][] = [];
    const stylesMatrix: any[][] = [];

    // 3.1 表头
    const headers = [
      "序号",
      "记录时间",
      "请求方式",
      "HTTP状态",
      "请求路径 (URL)",
      "请求入参",
      "响应数据",
      "异常详情",
    ];
    wsData.push(headers);
    stylesMatrix.push(headers.map(() => HEADER_STYLE));

    // 3.2 数据行
    payload.apiLogs.forEach((item, idx) => {
      const isSuccess = typeof item.status === "number" && item.status >= 200 && item.status < 300;
      const row = [
        idx + 1,
        item.timestamp || "-",
        item.method || "GET",
        item.status ?? "-",
        item.url || "-",
        item.params || "-",
        item.response || "-",
        item.error || "-",
      ];
      wsData.push(row);

      stylesMatrix.push([
        CELL_CENTER_STYLE,
        CELL_CENTER_STYLE,
        CELL_CENTER_STYLE,
        isSuccess ? SUCCESS_STYLE : DANGER_STYLE,
        CELL_LEFT_STYLE,
        CELL_LEFT_STYLE,
        CELL_LEFT_STYLE,
        item.error ? DANGER_STYLE : CELL_LEFT_STYLE,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applySheetStyles(ws, stylesMatrix);
    ws["!cols"] = [
      { wch: 8 }, // 序号
      { wch: 22 }, // 时间
      { wch: 10 }, // 方法
      { wch: 12 }, // 状态码
      { wch: 35 }, // URL
      { wch: 30 }, // 入参
      { wch: 35 }, // 响应
      { wch: 30 }, // 异常
    ];
    XLSX.utils.book_append_sheet(wb, ws, "网络接口日志");
  }

  // ==========================================
  // Sheet 4: 系统环境与全量缓存 (System & Cache)
  // ==========================================
  {
    const wsData: any[][] = [];
    const stylesMatrix: any[][] = [];

    // 4.1 表头
    const headers = ["分类模块", "配置属性 / 缓存 Key", "属性取值 / 缓存 Value"];
    wsData.push(headers);
    stylesMatrix.push(headers.map(() => HEADER_STYLE));

    const rep = payload.systemReport || {};
    const addRow = (category: string, prop: string, val: any) => {
      const valStr = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val ?? "-");
      wsData.push([category, prop, valStr]);
      stylesMatrix.push([CATEGORY_STYLE, CELL_LEFT_STYLE, CELL_LEFT_STYLE]);
    };

    // 系统基础信息
    if (rep.system) {
      addRow("系统与硬件", "设备品牌 (Brand)", rep.system.brand);
      addRow("系统与硬件", "设备型号 (Model)", rep.system.model);
      addRow("系统与硬件", "操作系统名称 (OS Name)", rep.system.osName);
      addRow("系统与硬件", "操作系统版本 (OS Version)", rep.system.osVersion);
      addRow("系统与硬件", "运行平台 (Platform)", rep.system.platform);
      addRow("系统与硬件", "uni-app平台 (UniPlatform)", rep.system.uniPlatform);
      addRow("系统与硬件", "屏幕宽度 (Screen Width)", rep.system.screenWidth);
      addRow("系统与硬件", "屏幕高度 (Screen Height)", rep.system.screenHeight);
      addRow("系统与硬件", "设备像素比 (Pixel Ratio)", rep.system.pixelRatio);
      addRow("系统与硬件", "状态栏高度 (Status Bar)", `${rep.system.statusBarHeight}px`);
      addRow("系统与硬件", "网络连接类型 (Network)", rep.system.networkType);
    }

    // 蓝牙状态
    if (rep.bluetooth) {
      addRow("蓝牙通信", "连接状态 (Connected)", rep.bluetooth.isConnected ? "已连接" : "未连接");
      addRow("蓝牙通信", "设备名称 (Device Name)", rep.bluetooth.deviceName);
      addRow("蓝牙通信", "物理 MAC 地址", rep.bluetooth.macAddress);
      addRow("蓝牙通信", "系统 Device ID", rep.bluetooth.deviceId);
      addRow("蓝牙通信", "当前匹配协议 (Protocol)", rep.bluetooth.activeProtocol);
    }

    // 应用运行时
    if (rep.appState) {
      addRow("应用状态", "当前激活语言 (Locale)", rep.appState.locale);
      addRow("应用状态", "主题模式 (Theme)", rep.appState.theme);
      addRow("应用状态", "实际物理主题 (Actual Theme)", rep.appState.actualTheme);
    }

    // 存储指标
    if (rep.storageOverview) {
      addRow("存储统计", "缓存 Key 总数", rep.storageOverview.keysCount);
      addRow("存储统计", "已用空间占用", `${rep.storageOverview.currentSize} KB`);
    }

    // 全量本地缓存 Dump
    if (rep.storageData && typeof rep.storageData === "object") {
      Object.keys(rep.storageData).forEach((k) => {
        addRow("本地缓存数据 (Storage Dump)", k, rep.storageData[k]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applySheetStyles(ws, stylesMatrix);
    ws["!cols"] = [
      { wch: 22 }, // 分类
      { wch: 30 }, // 属性名
      { wch: 60 }, // 属性值
    ];
    XLSX.utils.book_append_sheet(wb, ws, "系统环境与全量缓存");
  }

  // 写入二进制字节流
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

/**
 * 运行期精准判定是否为 Android 原生 App 宿主环境
 */
function checkIsAndroid(): boolean {
  // #ifdef APP-PLUS
  try {
    if (typeof plus !== "undefined" && plus.os && plus.os.name) {
      return String(plus.os.name).toLowerCase() === "android";
    }
  } catch (e) {
    console.warn("判定 Android 宿主异常:", e);
  }
  // #endif
  return false;
}

/**
 * 运行期精准判定是否为 iOS 原生 App 宿主环境
 */
function checkIsIOS(): boolean {
  // #ifdef APP-PLUS
  try {
    if (typeof plus !== "undefined" && plus.os && plus.os.name) {
      return String(plus.os.name).toLowerCase() === "ios";
    }
  } catch (e) {
    console.warn("判定 iOS 宿主异常:", e);
  }
  // #endif
  return false;
}

/**
 * 跨平台保存 Excel 二进制文件到设备存储中
 * @param arrayBuffer Excel 字节数组
 * @param fileName 文件名称
 * @returns 返回保存成功的绝对物理路径或沙盒路径
 */
export function saveExcelFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const name = fileName || `bms_logs_${formatDateTimeForFileName()}.xlsx`;
    const isAndroid = checkIsAndroid();
    console.log("[ExcelExport] saveExcelFile 启动, 目标文件名:", name, "当前宿主 isAndroid:", isAndroid);

    // #ifdef APP-PLUS
    let base64Data = "";
    try {
      base64Data = arrayBufferToBase64(arrayBuffer);
    } catch (e: any) {
      console.error("[ExcelExport] ArrayBuffer 转 Base64 失败:", e);
      reject(new Error("文件数据编码转换失败: " + (e.message || e)));
      return;
    }

    // Android 原生首选：直接通过 Java FileOutputStream 写入公共 Download 目录
    if (isAndroid) {
      console.log("[ExcelExport] 开始执行 Android 原生直写公共 Download 目录流程...");
      try {
        const Base64 = plus.android.importClass("android.util.Base64");
        const File = plus.android.importClass("java.io.File");
        const FileOutputStream = plus.android.importClass("java.io.FileOutputStream");
        const Environment = plus.android.importClass("android.os.Environment");
        const context = plus.android.runtimeMainActivity();

        const downloadDir = Environment.getExternalStoragePublicDirectory("Download");
        if (!downloadDir.exists()) {
          downloadDir.mkdirs();
        }

        const destFile = new File(downloadDir, name);
        const publicPath = destFile.getAbsolutePath();

        const decodedBytes = Base64.decode(base64Data, 0);
        const outStream = new FileOutputStream(destFile);
        outStream.write(decodedBytes);
        outStream.flush();
        outStream.close();

        if (destFile.exists() && destFile.length() > 0) {
          const Intent = plus.android.importClass("android.content.Intent");
          const Uri = plus.android.importClass("android.net.Uri");
          const intent = new Intent("android.intent.action.MEDIA_SCANNER_SCAN_FILE");
          intent.setData(Uri.fromFile(destFile));
          context.sendBroadcast(intent);

          console.log("[ExcelExport] 成功直接写入公共 Download 目录:", publicPath);
          resolve(publicPath);
          return;
        }
      } catch (fileStreamErr) {
        console.error("[ExcelExport] Android FileOutputStream 直写异常，降级使用沙盒处理:", fileStreamErr);
      }
    }

    // iOS 或 Android 降级使用 HTML5+ 沙盒文件系统
    const tempPath = "_doc/" + name;
    console.log("[ExcelExport] 开始执行 HTML5+ 沙盒文件写入流程, tempPath:", tempPath);
    plus.io.resolveLocalFileSystemURL(
      "_doc/",
      (dirEntry: any) => {
        dirEntry.getFile(
          name,
          { create: true },
          (fileEntry: any) => {
            fileEntry.createWriter(
              (writer: any) => {
                writer.onwrite = () => {
                  const privateFullPath = plus.io.convertLocalFileSystemURL(tempPath);
                  console.log("[ExcelExport] 沙盒 Excel 写入成功:", privateFullPath);

                  // 如果是 Android 环境，使用 NIO FileChannel 零拷贝复制到公共 Download 目录
                  if (isAndroid) {
                    try {
                      console.log("[ExcelExport] 正在将沙盒文件转存至公共 Download 目录...");
                      const File = plus.android.importClass("java.io.File");
                      const FileInputStream = plus.android.importClass("java.io.FileInputStream");
                      const FileOutputStream = plus.android.importClass("java.io.FileOutputStream");
                      const FileChannel = plus.android.importClass("java.nio.channels.FileChannel");

                      // 去除 file:// 前缀，保障 Java File 路径解析
                      const cleanSrcPath = privateFullPath.replace(/^file:\/\//i, "");
                      const srcFile = new File(cleanSrcPath);

                      const Environment = plus.android.importClass("android.os.Environment");
                      const downloadDir = Environment.getExternalStoragePublicDirectory("Download");
                      if (!downloadDir.exists()) {
                        downloadDir.mkdirs();
                      }

                      const destFile = new File(downloadDir, name);
                      const publicPath = destFile.getAbsolutePath();

                      // NIO FileChannel 零拷贝传输
                      const inStream = new FileInputStream(srcFile);
                      const outStream = new FileOutputStream(destFile);
                      const inChannel = inStream.getChannel();
                      const outChannel = outStream.getChannel();

                      inChannel.transferTo(0, srcFile.length(), outChannel);

                      inStream.close();
                      outStream.close();

                      if (destFile.exists() && destFile.length() > 0) {
                        // 广播系统媒体库与下载管理器刷新通知
                        const context = plus.android.runtimeMainActivity();
                        const Intent = plus.android.importClass("android.content.Intent");
                        const Uri = plus.android.importClass("android.net.Uri");
                        const intent = new Intent("android.intent.action.MEDIA_SCANNER_SCAN_FILE");
                        intent.setData(Uri.fromFile(destFile));
                        context.sendBroadcast(intent);

                        console.log("[ExcelExport] 沙盒文件已成功转存并广播到 Download 目录:", publicPath);
                        resolve(publicPath);
                        return;
                      }
                    } catch (androidErr) {
                      console.error("[ExcelExport] 转存到公共 Download 目录异常，降级使用沙盒路径:", androidErr);
                    }
                  }

                  // iOS 或 Android 降级返回沙盒路径
                  resolve(privateFullPath);
                };

                writer.onerror = (err: any) => {
                  reject(new Error("写入文件失败: " + (err.message || JSON.stringify(err))));
                };

                writer.seek(0);
                // 使用 HTML5+ 的 writeAsBinary 写入 Base64 字符串
                writer.writeAsBinary(base64Data);
              },
              (err: any) => {
                reject(new Error("创建写入器失败: " + JSON.stringify(err)));
              },
            );
          },
          (err: any) => {
            reject(new Error("创建文件失败: " + JSON.stringify(err)));
          },
        );
      },
      (err: any) => {
        reject(new Error("解析沙盒目录失败: " + JSON.stringify(err)));
      },
    );
    // #endif

    // #ifdef MP-WEIXIN
    try {
      const fs = wx.getFileSystemManager();
      const wxTempPath = `${wx.env.USER_DATA_PATH}/${name}`;

      fs.writeFile({
        filePath: wxTempPath,
        data: arrayBuffer,
        success: () => {
          console.log("[ExcelExport] 微信小程序 Excel 保存成功:", wxTempPath);
          resolve(wxTempPath);
        },
        fail: (err: any) => {
          reject(new Error("微信写入文件失败: " + JSON.stringify(err)));
        },
      });
    } catch (e: any) {
      reject(new Error("微信文件管理器异常: " + (e.message || e)));
    }
    // #endif

    // #ifdef H5
    try {
      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve(name);
    } catch (h5Err: any) {
      reject(new Error("浏览器下载失败: " + (h5Err.message || h5Err)));
    }
    // #endif
  });
}

/**
 * 跨端打开 Excel 文件进行查看与管理（统一基于 uni.openDocument 官方原生文档组件与系统菜单）
 * @param filePath 保存成功的文件绝对物理路径或沙盒路径
 */
export function openFileDirectory(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log("[ExcelExport] openFileDirectory 启动, 目标路径:", filePath);

    // #ifndef H5
    uni.openDocument({
      filePath,
      showMenu: true,
      fileType: "xlsx",
      success: () => {
        console.log("[ExcelExport] uni.openDocument 成功打开文档");
        resolve(true);
      },
      fail: (err: any) => {
        console.error("[ExcelExport] uni.openDocument 打开文档失败:", err);
        resolve(false);
      },
    });
    // #endif

    // #ifdef H5
    resolve(true);
    // #endif
  });
}
