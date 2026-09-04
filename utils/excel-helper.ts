/**
 * 跨端 Excel (.xlsx) 导出与文件保存工具类（零外部依赖，极速轻量，全端兼容）
 * 基于纯原生 OpenXML 规范与 SimpleZip 容器构建多工作表（Sheet）专业级报表
 * 完美兼容 App（Android 公共 Download 目录直写与媒体库广播 / iOS 沙盒）、微信小程序（wx.openDocument 预览与分享）、H5 浏览器直接下载
 */

// 声明多端原生宿主全局环境对象
declare const plus: any;
declare const wx: any;

/**
 * CRC-32 计算表（基于多项式 0xEDB88320 构建，用于极速计算 ZIP 数据校验码）
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

/**
 * 计算字节数组的 CRC-32 校验和
 * @param bytes 目标字节数组
 */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * 字符串转 UTF-8 字节数组（完整支持 BMP 与 Unicode 补充平面代理对，确保中文与 Emoji 字符不乱码）
 * @param str 输入字符串
 */
function stringToUtf8Bytes(str: string): Uint8Array {
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      );
    } else {
      // 代理对高低位合并转换
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      );
    }
  }
  return new Uint8Array(utf8);
}

/**
 * ZIP 归档内部单条文件实体契约
 */
interface ZipEntry {
  name: string;
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  size: number;
}

/**
 * 简易纯 JS/TS PKZip 打包器（生成标准的 .xlsx 格式压缩包容器，零任何第三方依赖）
 */
class SimpleZip {
  private files: ZipEntry[] = [];

  /**
   * 向 ZIP 归档容器中添加文件
   * @param name 文件在 ZIP 包内的相对路径
   * @param content 文件内容（字符串或字节数组）
   */
  public addFile(name: string, content: string | Uint8Array): void {
    const data = typeof content === "string" ? stringToUtf8Bytes(content) : content;
    this.files.push({
      name,
      nameBytes: stringToUtf8Bytes(name),
      data,
      crc: crc32(data),
      size: data.length,
    });
  }

  /**
   * 构建标准的 PKZip 规范二进制 ArrayBuffer
   */
  public buildArrayBuffer(): ArrayBuffer {
    let localHeadersSize = 0;
    let cdSize = 0;

    for (const f of this.files) {
      localHeadersSize += 30 + f.nameBytes.length + f.size;
      cdSize += 46 + f.nameBytes.length;
    }

    const totalSize = localHeadersSize + cdSize + 22;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    let offset = 0;
    const cdEntries: Array<{ file: ZipEntry; offset: number }> = [];

    // 1. 写入 Local File Headers 局部文件头与文件体数据
    for (const f of this.files) {
      const localHeaderOffset = offset;
      view.setUint32(offset, 0x04034b50, true); // 局部文件头签名
      view.setUint16(offset + 4, 20, true); // 提取所需版本
      view.setUint16(offset + 6, 0x0800, true); // 通用标志位（第11位声明文件名及注释采用 UTF-8 编码）
      view.setUint16(offset + 8, 0, true); // 压缩方法：0（Store 存储模式，无损免额外解压损耗）
      view.setUint16(offset + 10, 0, true); // 修改时间
      view.setUint16(offset + 12, 0, true); // 修改日期
      view.setUint32(offset + 14, f.crc, true); // CRC-32 校验值
      view.setUint32(offset + 18, f.size, true); // 压缩后大小
      view.setUint32(offset + 22, f.size, true); // 原始大小
      view.setUint16(offset + 26, f.nameBytes.length, true); // 文件名长度
      view.setUint16(offset + 28, 0, true); // 扩展字段长度
      offset += 30;

      bytes.set(f.nameBytes, offset);
      offset += f.nameBytes.length;

      bytes.set(f.data, offset);
      offset += f.size;

      cdEntries.push({ file: f, offset: localHeaderOffset });
    }

    const cdStartOffset = offset;

    // 2. 写入 Central Directory Headers 中央目录结构头
    for (const entry of cdEntries) {
      const f = entry.file;
      view.setUint32(offset, 0x02014b50, true); // 中央目录文件头签名
      view.setUint16(offset + 4, 20, true); // 创建版本
      view.setUint16(offset + 6, 20, true); // 提取所需版本
      view.setUint16(offset + 8, 0x0800, true); // 通用标志位（UTF-8）
      view.setUint16(offset + 10, 0, true); // 压缩方法（Store）
      view.setUint16(offset + 12, 0, true); // 修改时间
      view.setUint16(offset + 14, 0, true); // 修改日期
      view.setUint32(offset + 16, f.crc, true); // CRC-32 校验值
      view.setUint32(offset + 20, f.size, true); // 压缩后大小
      view.setUint32(offset + 24, f.size, true); // 原始大小
      view.setUint16(offset + 28, f.nameBytes.length, true); // 文件名长度
      view.setUint16(offset + 30, 0, true); // 扩展字段长度
      view.setUint16(offset + 32, 0, true); // 文件注释长度
      view.setUint16(offset + 34, 0, true); // 磁盘编号开始
      view.setUint16(offset + 36, 0, true); // 内部文件属性
      view.setUint32(offset + 38, 0, true); // 外部文件属性
      view.setUint32(offset + 42, entry.offset, true); // 对应局部文件头的相对偏移量
      offset += 46;

      bytes.set(f.nameBytes, offset);
      offset += f.nameBytes.length;
    }

    const cdEndOffset = offset;
    const cdLength = cdEndOffset - cdStartOffset;

    // 3. 写入 End of Central Directory Record (EOCD) 中央目录结尾记录
    view.setUint32(offset, 0x06054b50, true); // EOCD 签名
    view.setUint16(offset + 4, 0, true); // 当前磁盘编号
    view.setUint16(offset + 6, 0, true); // 中央目录开始磁盘编号
    view.setUint16(offset + 8, this.files.length, true); // 当前磁盘上的记录总数
    view.setUint16(offset + 10, this.files.length, true); // 中央目录结构总记录数
    view.setUint32(offset + 12, cdLength, true); // 中央目录大小
    view.setUint32(offset + 16, cdStartOffset, true); // 中央目录起始偏移量
    view.setUint16(offset + 20, 0, true); // 注释长度

    return buffer;
  }
}

/**
 * 转义 XML 特殊字符，保障 Excel 解析时不因字符冲突中断
 * @param str 输入内容
 */
function escapeXml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 将列号（1-indexed）转换为 Excel 标准列字母（如 1 -> A, 2 -> B, 26 -> Z, 27 -> AA）
 * @param col 列号索引（从 1 开始）
 */
function colIndexToName(col: number): string {
  let temp = col;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * 单个单元格数据定义契约
 */
export interface ExcelCellData {
  /** 单元格文本或数值 */
  v: any;
  /** 关联的 OpenXML 样式表索引 ID */
  s?: number;
}

/**
 * 构建单个 Sheet 工作表的 XML 源码
 * @param columns 列配置列表（包含推荐宽度）
 * @param rows 单元格行二维矩阵
 */
function buildSheetXml(
  columns: Array<{ width?: number }>,
  rows: Array<Array<string | number | ExcelCellData>>,
): string {
  let xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n";
  xml += "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n";

  // 1. 定义列宽参数
  if (columns && columns.length > 0) {
    xml += "  <cols>\n";
    columns.forEach((col, idx) => {
      const colNum = idx + 1;
      const width = col.width || 15;
      xml += `    <col min="${colNum}" max="${colNum}" width="${width}" customWidth="1"/>\n`;
    });
    xml += "  </cols>\n";
  }

  // 2. 写入单元格数据与样式 ID 绑定
  xml += "  <sheetData>\n";
  rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1;
    xml += `    <row r="${rowNum}">\n`;
    row.forEach((cell, cIdx) => {
      const cellRef = `${colIndexToName(cIdx + 1)}${rowNum}`;
      let val: any = cell;
      let styleId = 0;

      if (cell && typeof cell === "object" && "v" in cell) {
        val = cell.v;
        styleId = cell.s || 0;
      }

      const escaped = escapeXml(val);
      const styleAttr = styleId > 0 ? ` s="${styleId}"` : "";
      xml += `      <c r="${cellRef}"${styleAttr} t="inlineStr"><is><t>${escaped}</t></is></c>\n`;
    });
    xml += "    </row>\n";
  });
  xml += "  </sheetData>\n";
  xml += "</worksheet>";
  return xml;
}

/**
 * 将 ArrayBuffer 转为 Base64（分块 32KB 处理，彻底杜绝调用栈溢出问题）
 * @param buffer 输入 ArrayBuffer
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
 * 格式化当前时间为文件名友好格式 (如 20260828_175000)
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
 * 核心导出函数：将全量日志与系统环境数据转换为美观的多 Sheet Excel (.xlsx) ArrayBuffer（零外部依赖）
 * @param payload 包含指令、连接、网络接口日志及系统全量报告的数据载荷
 */
export function buildLogsExcelBuffer(payload: {
  commandLogs: any[];
  connectionLogs?: any[];
  apiCallbackLogs?: any[];
  apiLogs: any[];
  systemReport: any;
}): ArrayBuffer {
  const zip = new SimpleZip();

  // =========================================================================
  // 1. [Content_Types].xml - 声明包内各个 XML 文件的 MIME 类型映射
  // =========================================================================
  zip.addFile(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  );

  // =========================================================================
  // 2. _rels/.rels - 声明根目录关系指向工作簿
  // =========================================================================
  zip.addFile(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );

  // =========================================================================
  // 3. xl/_rels/workbook.xml.rels - 声明工作簿内部关联的所有 Sheet 及样式表
  // =========================================================================
  zip.addFile(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );

  // =========================================================================
  // 4. xl/workbook.xml - 声明包含的 4 个工作表名称与顺序
  // =========================================================================
  zip.addFile(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="指令报文日志" sheetId="1" r:id="rId1"/>
    <sheet name="API 回调日志" sheetId="2" r:id="rId2"/>
    <sheet name="网络接口日志" sheetId="3" r:id="rId3"/>
    <sheet name="系统环境与全量缓存" sheetId="4" r:id="rId4"/>
  </sheets>
</workbook>`,
  );

  // =========================================================================
  // 5. xl/styles.xml - 统一 OpenXML 样式表（定制科技蓝表头、状态徽标、边框及对齐）
  // =========================================================================
  zip.addFile(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6">
    <!-- 0: 默认正文字体 (10pt, #1D1F29) -->
    <font>
      <sz val="10"/>
      <color rgb="FF1D1F29"/>
      <name val="Calibri"/>
    </font>
    <!-- 1: 表头粗体白字 (10pt, #FFFFFF, bold) -->
    <font>
      <b/>
      <sz val="10"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
    </font>
    <!-- 2: TX 发送科技蓝粗体 (9pt, #0052D9, bold) -->
    <font>
      <b/>
      <sz val="9"/>
      <color rgb="FF0052D9"/>
      <name val="Calibri"/>
    </font>
    <!-- 3: RX 接收 / 成功森林绿粗体 (9pt, #2BA471, bold) -->
    <font>
      <b/>
      <sz val="9"/>
      <color rgb="FF2BA471"/>
      <name val="Calibri"/>
    </font>
    <!-- 4: 危险 / 失败告警红色粗体 (9pt, #FA3534, bold) -->
    <font>
      <b/>
      <sz val="9"/>
      <color rgb="FFFA3534"/>
      <name val="Calibri"/>
    </font>
    <!-- 5: 分类标题深灰粗体 (9pt, #4E5369, bold) -->
    <font>
      <b/>
      <sz val="9"/>
      <color rgb="FF4E5369"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="7">
    <!-- 0: 无填充 (OpenXML 规范必选) -->
    <fill>
      <patternFill patternType="none"/>
    </fill>
    <!-- 1: 灰色预留 (OpenXML 规范必选) -->
    <fill>
      <patternFill patternType="gray125"/>
    </fill>
    <!-- 2: 表头科技蓝 (#0052D9) -->
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FF0052D9"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <!-- 3: TX 发送浅蓝底 (#EBF3FF) -->
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFEBF3FF"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <!-- 4: RX / 成功浅绿底 (#E8F8F0) -->
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFE8F8F0"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <!-- 5: 失败 / 错误浅红底 (#FEECEB) -->
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFFEECEB"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <!-- 6: 分类标题浅灰底 (#F3F4F6) -->
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFF3F4F6"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <!-- 0: 无边框 -->
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <!-- 1: 浅灰细边框 (#D1D5DB) -->
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <!-- s=0: 默认正文样式 -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- s=1: 表头样式 (科技蓝背景 + 白色粗体 + 居中 + 细边框) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- s=2: 普通居中单元格 (居中 + 细边框) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- s=3: 普通左对齐单元格 (左对齐 + 细边框) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
    <!-- s=4: TX 发送徽标 (淡蓝底 + 科技蓝字 + 居中 + 细边框) -->
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- s=5: RX / 成功徽标 (淡绿底 + 森林绿字 + 居中 + 细边框) -->
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- s=6: 失败 / 错误徽标 (淡红底 + 危险红字 + 居中 + 细边框) -->
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- s=7: 分类标题 (淡灰底 + 深灰字 + 居中 + 细边框) -->
    <xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`,
  );

  // =========================================================================
  // 6. Sheet 1: 指令报文日志 (Command Logs)
  // =========================================================================
  const sheet1Cols = [
    { width: 8 }, // 序号
    { width: 22 }, // 记录时间
    { width: 12 }, // 流向
    { width: 45 }, // HEX 原始报文
    { width: 10 }, // 字节数
    { width: 22 }, // 说明
  ];
  const sheet1Rows: Array<Array<string | number | ExcelCellData>> = [
    [
      { v: "序号", s: 1 },
      { v: "记录时间", s: 1 },
      { v: "流向", s: 1 },
      { v: "HEX 原始报文", s: 1 },
      { v: "字节数", s: 1 },
      { v: "说明", s: 1 },
    ],
  ];
  (payload.commandLogs || []).forEach((item, idx) => {
    const isTx = (item.direction || "TX") === "TX";
    const hex = item.hexData || "";
    const byteLen = hex ? Math.ceil(hex.replace(/\s+/g, "").length / 2) : 0;
    sheet1Rows.push([
      { v: idx + 1, s: 2 },
      { v: item.timestamp || "-", s: 2 },
      { v: isTx ? "TX 发送" : "RX 接收", s: isTx ? 4 : 5 },
      { v: hex, s: 3 },
      { v: byteLen, s: 2 },
      { v: item.desc || "-", s: 3 },
    ]);
  });
  zip.addFile("xl/worksheets/sheet1.xml", buildSheetXml(sheet1Cols, sheet1Rows));

  // =========================================================================
  // 7. Sheet 2: API 回调日志 (API Callback Logs)
  // =========================================================================
  const sheet2Cols = [
    { width: 8 }, // 序号
    { width: 22 }, // 记录时间
    { width: 12 }, // 执行状态
    { width: 30 }, // API 方法名
    { width: 12 }, // 耗时(ms)
    { width: 35 }, // 输入参数
    { width: 35 }, // 回调结果
  ];
  const sheet2Rows: Array<Array<string | number | ExcelCellData>> = [
    [
      { v: "序号", s: 1 },
      { v: "记录时间", s: 1 },
      { v: "执行状态", s: 1 },
      { v: "API 方法名", s: 1 },
      { v: "耗时(ms)", s: 1 },
      { v: "输入参数", s: 1 },
      { v: "回调结果", s: 1 },
    ],
  ];
  const callbackLogs = payload.apiCallbackLogs || payload.connectionLogs || [];
  callbackLogs.forEach((item, idx) => {
    const isSuccess = item.status === "success";
    sheet2Rows.push([
      { v: idx + 1, s: 2 },
      { v: item.timestamp || "-", s: 2 },
      { v: isSuccess ? "SUCCESS" : "FAIL", s: isSuccess ? 5 : 6 },
      { v: item.apiName || "-", s: 3 },
      { v: item.duration !== undefined ? `${item.duration}ms` : "-", s: 2 },
      { v: item.params || "-", s: 3 },
      { v: item.result || "-", s: 3 },
    ]);
  });
  zip.addFile("xl/worksheets/sheet2.xml", buildSheetXml(sheet2Cols, sheet2Rows));

  // =========================================================================
  // 8. Sheet 3: 网络接口日志 (API Logs)
  // =========================================================================
  const sheet3Cols = [
    { width: 8 }, // 序号
    { width: 22 }, // 记录时间
    { width: 10 }, // 请求方式
    { width: 12 }, // HTTP状态
    { width: 35 }, // 请求路径
    { width: 30 }, // 请求入参
    { width: 35 }, // 响应数据
    { width: 30 }, // 异常详情
  ];
  const sheet3Rows: Array<Array<string | number | ExcelCellData>> = [
    [
      { v: "序号", s: 1 },
      { v: "记录时间", s: 1 },
      { v: "请求方式", s: 1 },
      { v: "HTTP状态", s: 1 },
      { v: "请求路径 (URL)", s: 1 },
      { v: "请求入参", s: 1 },
      { v: "响应数据", s: 1 },
      { v: "异常详情", s: 1 },
    ],
  ];
  (payload.apiLogs || []).forEach((item, idx) => {
    const isSuccess = typeof item.status === "number" && item.status >= 200 && item.status < 300;
    sheet3Rows.push([
      { v: idx + 1, s: 2 },
      { v: item.timestamp || "-", s: 2 },
      { v: item.method || "GET", s: 2 },
      { v: item.status ?? "-", s: isSuccess ? 5 : 6 },
      { v: item.url || "-", s: 3 },
      { v: item.params || "-", s: 3 },
      { v: item.response || "-", s: 3 },
      { v: item.error || "-", s: item.error ? 6 : 3 },
    ]);
  });
  zip.addFile("xl/worksheets/sheet3.xml", buildSheetXml(sheet3Cols, sheet3Rows));

  // =========================================================================
  // 9. Sheet 4: 系统环境与全量缓存 (System & Cache)
  // =========================================================================
  const sheet4Cols = [
    { width: 22 }, // 分类模块
    { width: 32 }, // 配置属性 / 缓存 Key
    { width: 65 }, // 属性取值 / 缓存 Value
  ];
  const sheet4Rows: Array<Array<string | number | ExcelCellData>> = [
    [
      { v: "分类模块", s: 1 },
      { v: "配置属性 / 缓存 Key", s: 1 },
      { v: "属性取值 / 缓存 Value", s: 1 },
    ],
  ];

  const rep = payload.systemReport || {};
  const addReportRow = (category: string, prop: string, val: any) => {
    const valStr = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val ?? "-");
    sheet4Rows.push([
      { v: category, s: 7 },
      { v: prop, s: 3 },
      { v: valStr, s: 3 },
    ]);
  };

  // 9.1 系统基础硬件信息
  if (rep.system) {
    addReportRow("系统与硬件", "设备品牌 (Brand)", rep.system.brand);
    addReportRow("系统与硬件", "设备型号 (Model)", rep.system.model);
    addReportRow("系统与硬件", "操作系统名称 (OS Name)", rep.system.osName);
    addReportRow("系统与硬件", "操作系统版本 (OS Version)", rep.system.osVersion);
    addReportRow("系统与硬件", "运行平台 (Platform)", rep.system.platform);
    addReportRow("系统与硬件", "uni-app平台 (UniPlatform)", rep.system.uniPlatform);
    addReportRow("系统与硬件", "屏幕宽度 (Screen Width)", rep.system.screenWidth);
    addReportRow("系统与硬件", "屏幕高度 (Screen Height)", rep.system.screenHeight);
    addReportRow("系统与硬件", "设备像素比 (Pixel Ratio)", rep.system.pixelRatio);
    addReportRow("系统与硬件", "状态栏高度 (Status Bar)", `${rep.system.statusBarHeight}px`);
    addReportRow("系统与硬件", "网络连接类型 (Network)", rep.system.networkType);
  }

  // 9.2 蓝牙通信状态
  if (rep.bluetooth) {
    addReportRow("蓝牙通信", "连接状态 (Connected)", rep.bluetooth.isConnected ? "已连接" : "未连接");
    addReportRow("蓝牙通信", "设备名称 (Device Name)", rep.bluetooth.deviceName);
    addReportRow("蓝牙通信", "物理 MAC 地址", rep.bluetooth.macAddress);
    addReportRow("蓝牙通信", "系统 Device ID", rep.bluetooth.deviceId);
    addReportRow("蓝牙通信", "当前匹配协议 (Protocol)", rep.bluetooth.activeProtocol);
  }

  // 9.3 应用全局配置
  if (rep.appState) {
    addReportRow("应用状态", "当前激活语言 (Locale)", rep.appState.locale);
    addReportRow("应用状态", "主题模式 (Theme)", rep.appState.theme);
    addReportRow("应用状态", "实际物理主题 (Actual Theme)", rep.appState.actualTheme);
  }

  // 9.4 存储指标
  if (rep.storageOverview) {
    addReportRow("存储统计", "缓存 Key 总数", rep.storageOverview.keysCount);
    addReportRow("存储统计", "已用空间占用", `${rep.storageOverview.currentSize} KB`);
  }

  // 9.5 全量本地缓存数据 Dump
  if (rep.storageData && typeof rep.storageData === "object") {
    Object.keys(rep.storageData).forEach((k) => {
      addReportRow("本地缓存数据 (Storage Dump)", k, rep.storageData[k]);
    });
  }

  zip.addFile("xl/worksheets/sheet4.xml", buildSheetXml(sheet4Cols, sheet4Rows));

  // 组装并输出 ZIP 二进制流
  return zip.buildArrayBuffer();
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
