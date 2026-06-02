/**
 * BMS BLE 电池数据包帧解析与格式转换通用算法工具集
 * 提供十六进制转换、温度换算、电压换算及多种通信校验算法等底层算法支持
 * 本文件为纯函数沙盒，严禁导入 Pinia Store、网络拦截器或任何带副作用的模块
 */

/**
 * 将十六进制字符串转换为 Uint8Array 字节数组（下发蓝牙底层原始指令时必备）
 * @param hexString 十六进制字符串，如 "A55A010200"，支持含空格格式如 "AA 20 00"
 */
export const hexStringToUint8Array = (hexString: string): Uint8Array => {
  // 去除所有空格
  const cleanHex = hexString.replace(/\s+/g, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Hex string length must be even");
  }
  const length = cleanHex.length / 2;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return result;
};

/**
 * 将 Uint8Array 字节数组转换为十六进制可视化字符串（解析蓝牙上报帧及写日志时常用）
 * @param bytes 字节数组
 * @param separator 各字节之间的连接分隔符，默认带空格
 */
export const uint8ArrayToHexString = (bytes: Uint8Array, separator = " "): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(separator);
};

/**
 * 转换并规整 BMS 读取的原始双字节电压值
 * @param highByte 高位字节
 * @param lowByte 低位字节
 * @returns 实际电压值，单位 (V)
 */
export const formatVoltage = (highByte: number, lowByte: number): number => {
  // 组合成 16 位整数，原始协议数据通常单位为 mV 或者是 10mV
  const rawValue = (highByte << 8) | lowByte;
  // 假定协议默认原始值为 mV，除以 1000 转换为 V
  return parseFloat((rawValue / 1000).toFixed(2));
};

/**
 * 转换并规整 BMS 协议上报的原始温度字节
 * 多数 BMS 蓝牙芯片对温度传输做偏移处理 (例如实际温度 = 原始值 - 40)
 * @param rawTempByte 原始单字节温度值
 * @param offset 偏移常量，默认 40
 */
export const formatTemperature = (rawTempByte: number, offset = 40): number => {
  return rawTempByte - offset;
};

/**
 * 计算 BMS 通信帧校验和 (Checksum) —— 兼容旧版 API
 * 此函数保留以兼容历史调用，新协议实现请改用 calcChecksum8
 * @param data 待计算校验和的原始字节数组
 */
export const calculateChecksum = (data: Uint8Array): number => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  // 取低 8 位作为校验和
  return sum & 0xff;
};

/**
 * 从蓝牙扫描设备对象中解析真实的物理 MAC 地址
 * 针对 iOS 和鸿蒙系统，将 advertisData（自定义广播数据包）的前 6 字节逆序重排得到真实 MAC 地址；
 * 针对 Android，则直接使用其原生的 deviceId 属性（本身就是 MAC 地址）。
 * @param device 蓝牙扫描发现的设备对象
 * @returns 格式化后的标准 MAC 地址字符串，例如 "A4:C1:38:00:52:5C"
 */
export const resolveDeviceMac = (device: any): string => {
  if (!device) return "";

  // 获取系统平台并转换为小写
  const systemInfo = uni.getSystemInfoSync();
  const platform = (systemInfo.platform || "").toLowerCase();

  // Android 下 deviceId 直接是设备物理 MAC 地址
  if (platform === "android") {
    return device.deviceId;
  }

  // iOS / 鸿蒙系统下，从广播包数据中反推真实 MAC 地址
  if (device.advertisData) {
    try {
      const buffer = device.advertisData;
      const uint8 = new Uint8Array(buffer);

      // 提取前 6 个字节作为 MAC 地址并执行逆序排列
      if (uint8.byteLength >= 6) {
        const macBytes = Array.from(uint8.slice(0, 6));
        macBytes.reverse();

        // 格式化为大写的带冒号十六进制地址
        return macBytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
      }
    } catch (e) {
      console.error("[BMS Helper] 解析自定义广播包 MAC 地址失败:", e);
    }
  }

  // 兜底策略：若上述条件均不满足（如广播包缺失），直接返回 deviceId (iOS 下为 UUID)
  return device.deviceId || "";
};

// ============================================================
// 以下为可插拔校验算法工具集
// 各协议在 PROTOCOL_SPEC.checksumAlgorithm 中声明算法名称
// 调用 verifyChecksum() 自动分发，无需在协议类内手写校验逻辑
// 新增算法时：在此处增加计算函数 + 在 verifyChecksum 中增加分支即可
// ============================================================

/**
 * 计算 8 位单字节累加和校验（Sum-8）
 * 适用于帧数据按字节逐一累加、取低 8 位的校验方式
 * @param data  完整帧字节数组
 * @param start 校验覆盖起始字节索引（含，0-indexed）
 * @param end   校验覆盖结束字节索引（不含）
 * @returns 单字节校验和（0x00 ~ 0xFF）
 */
export const calcChecksum8 = (data: Uint8Array, start: number, end: number): number => {
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += data[i];
  }
  return sum & 0xff;
};

/**
 * 计算 16 位小端双字节累加和校验（Sum-16 Little-Endian）
 * 适用于将所有覆盖字节累加后，拆分为低字节（SumL）和高字节（SumH）分别存放的协议
 * @param data  完整帧字节数组
 * @param start 校验覆盖起始字节索引（含，0-indexed）
 * @param end   校验覆盖结束字节索引（不含）
 * @returns 包含低字节（sumL）和高字节（sumH）的对象
 */
export const calcChecksum16LE = (
  data: Uint8Array,
  start: number,
  end: number,
): { sumL: number; sumH: number } => {
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += data[i];
  }
  return { sumL: sum & 0xff, sumH: (sum >> 8) & 0xff };
};

/**
 * 计算 Modbus RTU CRC-16 校验（CRC-16/IBM，多项式 0x8005，初始值 0xFFFF）
 * 适用于 Modbus RTU 及其他使用标准 CRC-16 的工业协议
 * @param data  完整帧字节数组
 * @param start 校验覆盖起始字节索引（含，0-indexed）
 * @param end   校验覆盖结束字节索引（不含）
 * @returns 包含低字节（crcL）和高字节（crcH）的对象（Modbus 小端传输顺序）
 */
export const calcCRC16Modbus = (
  data: Uint8Array,
  start: number,
  end: number,
): { crcL: number; crcH: number } => {
  let crc = 0xffff;
  for (let i = start; i < end; i++) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x0001) !== 0) {
        // 多项式 0x8005 的小端反射形式为 0xA001
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }
  return { crcL: crc & 0xff, crcH: (crc >> 8) & 0xff };
};

/**
 * 通用校验验证分发器
 * 根据协议规格声明中的 checksumAlgorithm 自动分发到对应算法函数进行校验验证
 * 协议解析器在 parseReceivedData 中调用此函数即可完成校验，无需手写重复的校验代码
 *
 * 内置支持算法（须与 ProtocolSpec.checksumAlgorithm 取值一致）：
 *   - "sum8"         → 8 位单字节累加和，帧末 1 字节为校验码
 *   - "sum16le"      → 16 位小端双字节累加和，帧末 2 字节为 sumL + sumH
 *   - "crc16-modbus" → Modbus RTU CRC-16，帧末 2 字节为 crcL + crcH
 *
 * 扩展方法：在 bms-helper.ts 中新增计算函数，并在此函数中增加 else-if 分支即可
 *
 * @param bytes     完整接收帧的字节数组
 * @param algorithm 校验算法名称标识（来自 ProtocolSpec.checksumAlgorithm）
 * @param range     校验覆盖范围 { start: 起始索引, endOffset: 末尾校验码占用字节数 }
 * @returns true 表示校验通过，false 表示校验失败（帧应被丢弃）
 */
export const verifyChecksum = (
  bytes: Uint8Array,
  algorithm: string,
  range: { start: number; endOffset: number },
): boolean => {
  // 计算校验覆盖范围的结束索引（不含帧末的校验码字节）
  const end = bytes.length - range.endOffset;

  if (algorithm === "sum8") {
    // 单字节校验：帧末 1 字节为校验码
    const calculated = calcChecksum8(bytes, range.start, end);
    return calculated === bytes[bytes.length - 1];
  } else if (algorithm === "sum16le") {
    // 双字节小端校验：帧末倒数第 2 字节为 sumL，倒数第 1 字节为 sumH
    const { sumL, sumH } = calcChecksum16LE(bytes, range.start, end);
    return sumL === bytes[bytes.length - 2] && sumH === bytes[bytes.length - 1];
  } else if (algorithm === "crc16-modbus") {
    // Modbus CRC-16：帧末倒数第 2 字节为 crcL，倒数第 1 字节为 crcH
    const { crcL, crcH } = calcCRC16Modbus(bytes, range.start, end);
    return crcL === bytes[bytes.length - 2] && crcH === bytes[bytes.length - 1];
  }

  // 未知校验算法：记录告警并放行，防止因算法名拼写错误导致所有帧被静默丢弃
  console.warn(`[BMS Helper] 未知校验算法标识: "${algorithm}"，跳过校验放行`);
  return true;
};
