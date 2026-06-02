import CryptoJS from "crypto-js";
import { APP_CONFIG } from "@/config";

/**
 * 授权激活纯算法工具函数库
 *
 * 职责：
 *   一、 生成随机设备码
 *   二、 加密算法实现
 *   三、 校验和计算与授权激活码验证
 */

/**
 * 生成随机设备码（大写英文字母与数字组合，长度固定为九位）
 */
export function generateRandomDeviceCode(): string {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let randomString = "";
  for (let i = 0; i < 9; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
}

/**
 * 对称加解密算法（密码分组链接模式，填充格式七）
 * @param message 待加密的字符串
 * @param key 密钥
 * @param iv 偏移向量
 * @returns 加密后的字节数组
 */
export function encryptDes(message: string, key: string, iv: string): number[] {
  const keyHex = CryptoJS.enc.Utf8.parse(key);
  const ivHex = CryptoJS.enc.Utf8.parse(iv);
  
  const encrypted = CryptoJS.DES.encrypt(message, keyHex, {
    iv: ivHex,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const hexString = encrypted.ciphertext.toString();
  const byteArray: number[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray.push(parseInt(hexString.substr(i, 2), 16));
  }
  return byteArray;
}

/**
 * 两位十六进制格式化，前置补零
 */
function formatHexByte(value: number): string {
  const str = value.toString(16);
  return str.length === 1 ? "0" + str : str;
}

/**
 * 十六进制格式化，前置补零至指定长度
 */
function formatHexByteWithLength(value: number, length: number): string {
  let str = value.toString(16);
  const originalLen = str.length;
  if (originalLen < length) {
    str = "0".repeat(length - originalLen) + str;
  }
  return str;
}

/**
 * 根据设备码、时间及授权类型计算正确的授权验证激活码
 * @param deviceCode 设备码（大写，长度为八位或九位）
 * @param time 授权时间数量（月数或天数）
 * @param type 授权类型
 */
export function calculateAuthCode(deviceCode: string, time: number, type: number): string {
  if (!deviceCode || (deviceCode.length !== 8 && deviceCode.length !== 9)) {
    return "";
  }

  // 校验和计算基底：加密得到的字节数组，从全局配置层动态导入密钥与偏移向量以保障跨项目自适应
  const codeByte = encryptDes(deviceCode, APP_CONFIG.AUTH_CONFIG.KEY, APP_CONFIG.AUTH_CONFIG.IV);

  // 累加字节数组
  let checkSum = 0;
  for (let i = 0; i < codeByte.length; i++) {
    checkSum += codeByte[i] & 0xff;
  }

  // 加入动态偏移校验和计算
  checkSum +=
    ((codeByte[1] & 0xff) % time) +
    ((codeByte[2] & 0xff) % type) +
    (codeByte[3] & 0xff);

  let sb = "";
  if (deviceCode.length === 8) {
    sb += formatHexByte(checkSum & 0xff);
    sb += formatHexByteWithLength(time + 360, 4);
    sb += formatHexByteWithLength(type + 30, 2);
  } else if (deviceCode.length === 9) {
    sb += formatHexByte(checkSum & 0xff);
    sb += formatHexByteWithLength(time + 100, 4);
    sb += formatHexByteWithLength(type + 6, 2);
  }
  
  return sb.toUpperCase();
}

/**
 * 解码用户输入的激活码，从中解析出授权时间（月数/天数）与授权类型
 * @param deviceCodeLength 当前设备码的长度（八位或九位）
 * @param authCode 用户输入的激活码（大写十六进制字符串，长度为八位）
 */
export function decodeAuthCode(deviceCodeLength: number, authCode: string): { time: number; type: number } | null {
  if (!authCode || authCode.length !== 8) {
    return null;
  }

  try {
    let time = 0;
    let type = 0;

    if (deviceCodeLength === 8) {
      // 提取时间并做偏移反转（月数）
      time = parseInt(authCode.substring(2, 6), 16) - 360;
      // 提取授权类型并做偏移反转
      type = parseInt(authCode.substring(6, 8), 16) - 30;
    } else if (deviceCodeLength === 9) {
      // 提取时间并做偏移反转（天数）
      time = parseInt(authCode.substring(2, 6), 16) - 100;
      // 提取授权类型并做偏移反转
      type = parseInt(authCode.substring(6, 8), 16) - 6;
    }

    return { time, type };
  } catch (e) {
    return null;
  }
}

/**
 * 根据授权时间数量，计算出全新的截止到期时间戳
 * @param deviceCodeLength 当前设备码的长度
 * @param time 授权数量
 * @returns 到期时间戳
 */
export function calculateEndTime(deviceCodeLength: number, time: number): number {
  const newDate = new Date();
  if (deviceCodeLength === 8) {
    // 八位设备码代表按月授权
    newDate.setMonth(newDate.getMonth() + time);
  } else if (deviceCodeLength === 9) {
    // 九位设备码代表按天授权
    newDate.setDate(newDate.getDate() + time);
  }
  return newDate.getTime();
}
