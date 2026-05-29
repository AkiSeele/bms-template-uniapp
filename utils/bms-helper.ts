/**
 * BMS BLE 电池数据包帧解析与格式转换通用算法工具集
 * 提供十六进制转换、温度换算、电压换算及通信校验和 Checksum 校验计算等底层算法支持
 */

/**
 * 将十六进制字符串转换为 Uint8Array 字节数组（下发蓝牙底层原始指令时必备）
 * @param hexString 十六进制字符串，如 "A55A010200"
 */
export const hexStringToUint8Array = (hexString: string): Uint8Array => {
  // 去除所有空格
  const cleanHex = hexString.replace(/\s+/g, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("十六进制字符串长度必须为偶数");
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
 * 计算 BMS 通信帧校验和 (Checksum)
 * 一般算法为：从包头开始累加所有字节，最后对 256 取模，或取反码
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
