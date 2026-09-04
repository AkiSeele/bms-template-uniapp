/**
 * 全局 uni/wx 运行时 API 回调拦截与日志采集器
 * 负责无侵入式代理并监听全站所有 uni 与 wx 异步 API 的调用及 success/fail 回调，
 * 统一采集并上报至 logStore，彻底取代在业务层手动记录连接流程的代码。
 */

import { useLogStore } from "@/stores/log-store";

// 声明全局宿主命名空间，防止 TS 编译器报错
declare const wx: any;

// 排除在回调拦截之外的高频同步/只读 API 集合（避免无意义的同步开销或循环引用）
const IGNORED_API_SET = new Set([
  "getStorageSync",
  "setStorageSync",
  "removeStorageSync",
  "clearStorageSync",
  "getStorageInfoSync",
  "getSystemInfoSync",
  "getDeviceInfo",
  "getAppAuthorizeSetting",
  "canIUse",
  "getLocale",
  "setLocale",
  "createSelectorQuery",
  "createAnimation",
  "createIntersectionObserver",
  "nextTick",
  "onAppShow",
  "offAppShow",
  "onAppHide",
  "offAppHide",
  "onError",
  "offError",
  "onThemeChange",
  "offThemeChange",
]);

// 全局防重入调用锁，防止日志收集过程中的内部调用触发递归死循环
let isLogging = false;

// 记录已安装拦截标记，防止热重载重复安装
let isInterceptorInstalled = false;

/**
 * 序列化 API 参数对象，安全剥离 success、fail、complete 等函数回调
 */
function safeSerializeParams(args: any[]): string | undefined {
  if (!args || args.length === 0) return undefined;
  try {
    const firstArg = args[0];
    if (typeof firstArg === "object" && firstArg !== null) {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(firstArg)) {
        if (key !== "success" && key !== "fail" && key !== "complete") {
          const val = firstArg[key];
          if (typeof val !== "function") {
            sanitized[key] = val;
          }
        }
      }
      return Object.keys(sanitized).length > 0 ? JSON.stringify(sanitized) : undefined;
    }
    return typeof firstArg === "string" ? firstArg : JSON.stringify(firstArg);
  } catch {
    return undefined;
  }
}

/**
 * 安全序列化回调返回值或错误对象
 */
function safeSerializeResult(result: any): string | undefined {
  if (result === undefined) return undefined;
  try {
    if (typeof result === "string") return result;
    if (result instanceof Error) {
      return JSON.stringify({ name: result.name, message: result.message, stack: result.stack });
    }
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

/**
 * 上报单条 API 回调日志至 LogStore
 */
function recordApiCallback(
  apiName: string,
  params: string | undefined,
  result: any,
  status: "success" | "fail",
  callbackType: "success" | "fail" | "complete" | "promise",
  duration: number,
) {
  if (isLogging) return;
  isLogging = true;
  try {
    const logStore = useLogStore();
    logStore.addApiCallbackLog({
      apiName,
      params,
      result: safeSerializeResult(result),
      status,
      callbackType,
      duration,
    });
  } catch (err) {
    console.error("[ApiInterceptor] 记录 API 回调日志异常:", err);
  } finally {
    isLogging = false;
  }
}

/**
 * 对单个 API 函数进行代理包装
 * @param targetName 宿主名称 ("uni" 或 "wx")
 * @param apiKey API 属性名 (如 "openBluetoothAdapter")
 * @param originalFn 原生函数引用
 */
function wrapApiFunction(targetName: string, apiKey: string, originalFn: Function): Function {
  const fullApiName = `${targetName}.${apiKey}`;

  return function (this: any, ...args: any[]) {
    const startTime = Date.now();
    const paramsStr = safeSerializeParams(args);
    let hasHandledCallback = false;

    // 1. 回调拦截：检查入参 options 是否包含 success/fail 回调
    if (args.length > 0 && typeof args[0] === "object" && args[0] !== null) {
      const options = args[0];
      const originalSuccess = options.success;
      const originalFail = options.fail;

      // 包装 success 回调
      options.success = function (res: any) {
        hasHandledCallback = true;
        const duration = Date.now() - startTime;
        recordApiCallback(fullApiName, paramsStr, res, "success", "success", duration);
        if (typeof originalSuccess === "function") {
          return originalSuccess.apply(this, arguments);
        }
      };

      // 包装 fail 回调
      options.fail = function (err: any) {
        hasHandledCallback = true;
        const duration = Date.now() - startTime;
        recordApiCallback(fullApiName, paramsStr, err, "fail", "fail", duration);
        if (typeof originalFail === "function") {
          return originalFail.apply(this, arguments);
        }
      };
    }

    // 2. 执行原函数
    let result: any;
    try {
      result = originalFn.apply(this, args);
    } catch (syncErr: any) {
      const duration = Date.now() - startTime;
      recordApiCallback(fullApiName, paramsStr, syncErr, "fail", "fail", duration);
      throw syncErr;
    }

    // 3. Promise 风格拦截：若方法返回 Promise 且尚未被回调捕获，则挂载 .then/.catch 监听
    if (result && typeof result.then === "function" && typeof result.catch === "function") {
      return result
        .then((res: any) => {
          if (!hasHandledCallback) {
            const duration = Date.now() - startTime;
            recordApiCallback(fullApiName, paramsStr, res, "success", "promise", duration);
          }
          return res;
        })
        .catch((err: any) => {
          if (!hasHandledCallback) {
            const duration = Date.now() - startTime;
            recordApiCallback(fullApiName, paramsStr, err, "fail", "promise", duration);
          }
          throw err;
        });
    }

    return result;
  };
}

/**
 * 安装全局 uni 与 wx API 回调拦截器
 * 自动遍历并代理对象上的所有异步方法，支持动态访问劫持
 */
export function initUniApiInterceptor(): void {
  if (isInterceptorInstalled) {
    return;
  }
  isInterceptorInstalled = true;

  console.log("[ApiInterceptor] 正在初始化全局 uni/wx API 回调拦截监听器...");

  const targets: Array<{ name: string; obj: any }> = [];

  if (typeof uni !== "undefined" && uni !== null) {
    targets.push({ name: "uni", obj: uni });
  }

  if (typeof wx !== "undefined" && wx !== null && wx !== (typeof uni !== "undefined" ? uni : null)) {
    targets.push({ name: "wx", obj: wx });
  }

  targets.forEach(({ name, obj }) => {
    try {
      // 遍历目标对象自身及原型链上的可枚举与不可枚举属性
      const propNames = Object.getOwnPropertyNames(obj);
      for (const prop of propNames) {
        if (IGNORED_API_SET.has(prop)) {
          continue;
        }

        try {
          const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
          if (descriptor && typeof descriptor.value === "function" && descriptor.writable !== false) {
            const originalFn = descriptor.value;
            obj[prop] = wrapApiFunction(name, prop, originalFn);
          }
        } catch {
          // 忽略只读或受保护原生属性的代理异常
        }
      }
      console.log(`[ApiInterceptor] 成功挂载 ${name} 全局 API 回调拦截代理`);
    } catch (e) {
      console.error(`[ApiInterceptor] 挂载 ${name} 拦截代理失败:`, e);
    }
  });
}
