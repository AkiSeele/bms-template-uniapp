import { defineStore } from "pinia";
import { ref } from "vue";
import { translate as t } from "@/locale/i18n";

// 连接日志数据结构定义
export interface ConnectionLog {
  timestamp: string;      // 记录时间戳，格式为 HH:mm:ss.SSS
  apiName: string;        // 调用的 API 名称或步骤名称
  params?: string;        // 调用传入的参数（序列化为 JSON 字符串）
  result?: string;        // 调用返回的结果或错误信息（序列化为 JSON 字符串）
  status: "success" | "fail"; // 成功或失败状态
}

// 指令日志数据结构定义
export interface CommandLog {
  timestamp: string;      // 记录时间戳，格式为 HH:mm:ss.SSS
  direction: "TX" | "RX"; // 传输方向：TX 代表发送，RX 代表接收
  hexData: string;        // 十六进制报文字符串
}

// 接口日志数据结构定义
export interface ApiLog {
  timestamp: string;      // 记录时间戳，格式为 HH:mm:ss.SSS
  url: string;            // HTTP 请求完整或相对 URL
  method: string;         // 请求方法（GET, POST 等）
  params?: string;        // 请求传参（Query 或 Body 序列化）
  status: number;         // HTTP 响应状态码（如 200, 401 等）
  response?: string;      // 响应结果内容
  error?: string;         // 异常时的报错描述
}

/**
 * 全局系统运行调试日志管理 Pinia Store
 * 负责收集、存储及管理：连接日志、指令日志、网络接口日志
 */
export const useLogStore = defineStore("log", () => {
  // 连接日志集合
  const connectionLogs = ref<ConnectionLog[]>([]);
  // 指令日志集合
  const commandLogs = ref<CommandLog[]>([]);
  // 接口日志集合
  const apiLogs = ref<ApiLog[]>([]);

  // 连续点击我的 Tab 的计数器
  const mineTabClickCount = ref(0);
  // 上次点击我的 Tab 的时间戳
  const lastMineTabClickTime = ref(0);
  // 触发显示密码输入弹窗的响应式计数器（页面监听此计数器变化并拉起弹窗）
  const passwordPromptTrigger = ref(0);

  // 系统日志调试模式（即开发入口）是否已解锁，初始化从本地缓存读取
  const isSystemLogsUnlocked = ref<boolean>(!!uni.getStorageSync("system_logs_unlocked"));

  /**
   * 解锁系统调试日志入口，持久化缓存
   */
  const unlockSystemLogs = () => {
    isSystemLogsUnlocked.value = true;
    uni.setStorageSync("system_logs_unlocked", true);
  };

  /**
   * 获取格式化的当前时间字符串 (格式: HH:mm:ss.SSS)
   */
  const getFormattedTime = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${ms}`;
  };

  /**
   * 上报记录一次低功耗蓝牙物理/时序连接步骤日志
   */
  const addConnectionLog = (
    apiName: string,
    params?: any,
    result?: any,
    status: "success" | "fail" = "success"
  ) => {
    connectionLogs.value.unshift({
      timestamp: getFormattedTime(),
      apiName,
      params: params ? (typeof params === "string" ? params : JSON.stringify(params)) : undefined,
      result: result ? (typeof result === "string" ? result : JSON.stringify(result)) : undefined,
      status,
    });
    // 限制最大缓存数量以防内存泄露
    if (connectionLogs.value.length > 200) {
      connectionLogs.value.pop();
    }
  };

  /**
   * 上报记录一次蓝牙指令数据收发 HEX 日志
   */
  const addCommandLog = (direction: "TX" | "RX", hexData: string) => {
    commandLogs.value.unshift({
      timestamp: getFormattedTime(),
      direction,
      hexData,
    });
    // 限制最大缓存数量以防内存泄露
    if (commandLogs.value.length > 200) {
      commandLogs.value.pop();
    }
  };

  /**
   * 上报记录一次网络接口 HTTP 请求/响应日志
   */
  const addApiLog = (
    url: string,
    method: string,
    params: any,
    status: number,
    response?: any,
    error?: string
  ) => {
    apiLogs.value.unshift({
      timestamp: getFormattedTime(),
      url,
      method,
      params: params ? (typeof params === "string" ? params : JSON.stringify(params)) : undefined,
      status,
      response: response ? (typeof response === "string" ? response : JSON.stringify(response)) : undefined,
      error,
    });
    // 限制最大缓存数量以防内存泄露
    if (apiLogs.value.length > 200) {
      apiLogs.value.pop();
    }
  };

  /**
   * 记录并上报一次底部导航栏 “我的” Tab 选项项点击事件
   */
  const recordMineTabClick = () => {
    const now = Date.now();
    // 判定 1.5s 内的点击为连续点击
    if (now - lastMineTabClickTime.value < 1500) {
      mineTabClickCount.value++;
    } else {
      mineTabClickCount.value = 1;
    }
    lastMineTabClickTime.value = now;

    // 连续点击达到 5 次，触发弹窗，重置计数器
    if (mineTabClickCount.value === 5) {
      mineTabClickCount.value = 0;
      passwordPromptTrigger.value++;
    }
  };

  /**
   * 一键清空所有系统日志数据
   */
  const clearLogs = () => {
    connectionLogs.value = [];
    commandLogs.value = [];
    apiLogs.value = [];
  };

  return {
    connectionLogs,
    commandLogs,
    apiLogs,
    passwordPromptTrigger,
    isSystemLogsUnlocked,
    unlockSystemLogs,
    addConnectionLog,
    addCommandLog,
    addApiLog,
    recordMineTabClick,
    clearLogs,
  };
});
