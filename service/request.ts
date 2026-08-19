import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { createUniAppAxiosAdapter } from "@uni-helper/axios-adapter";
import { APP_CONFIG } from "@/config";
import { useUserStore } from "@/stores/user";
import { translate as t } from "@/locale/i18n";
import { useLogStore } from "@/stores/log-store";

// 扩展 Axios 请求配置，增加 noAuth 字段决定是否免 Token 鉴权
export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  noAuth?: boolean; // 为 true 时表示无需在请求头中携带 Token
}

// 扩展内部请求配置
interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  noAuth?: boolean;
}

/**
 * 实例化基于 uni-app 跨端适配器的 Axios 请求客户端
 */
export const http = axios.create({
  baseURL: APP_CONFIG.BASE_URL,
  timeout: APP_CONFIG.REQUEST_TIMEOUT,
  adapter: createUniAppAxiosAdapter(),
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
});

/**
 * 1. 请求拦截器 (Request Interceptor)
 * 职责：离线单机模式拦截、Token 鉴权凭证自动注入
 */
http.interceptors.request.use(
  (config: CustomInternalAxiosRequestConfig) => {
    const logStore = useLogStore();
    const fullUrl = `${config.baseURL || ""}${config.url || ""}`;

    // 离线单机模式物理拦截：禁止向外发起真实网络请求
    if (APP_CONFIG.APP_MODE === "offline") {
      console.warn("[BMS 离线单机模式拦截] 已成功拦截网络请求:", fullUrl);
      uni.showToast({
        title: t("bms.request.offlineMode"),
        icon: "none",
      });
      // 记录离线拦截接口日志
      logStore.addApiLog(fullUrl, config.method?.toUpperCase() || "GET", config.data, 0, undefined, "OFFLINE_MODE");
      return Promise.reject(new Error("OFFLINE_MODE"));
    }

    // 注入 Token 鉴权请求头
    if (!config.noAuth) {
      const userStore = useUserStore();
      if (userStore.token) {
        config.headers.set("Authorization", `Bearer ${userStore.token}`);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 2. 响应拦截器 (Response Interceptor)
 * 职责：成功响应解析解包、401 凭证失效重定向与全局异常捕获
 */
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const logStore = useLogStore();
    const fullUrl = `${response.config.baseURL || ""}${response.config.url || ""}`;

    // 记录正常成功响应日志
    logStore.addApiLog(
      fullUrl,
      response.config.method?.toUpperCase() || "GET",
      response.config.data,
      response.status,
      response.data
    );

    // 自动解包，直接返回后端真实业务数据载荷
    return response.data;
  },
  (error) => {
    const logStore = useLogStore();
    const config = error.config || {};
    const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
    const statusCode = error.response?.status;
    const responseData = error.response?.data;

    if (statusCode === 401) {
      // 401 未授权或 Token 已过期：执行登出清理缓存，并退回到个人中心
      const userStore = useUserStore();
      userStore.logout();

      uni.showToast({
        title: t("bms.request.loginExpired"),
        icon: "none",
      });

      // 记录 Token 过期接口日志
      logStore.addApiLog(
        fullUrl,
        config.method?.toUpperCase() || "GET",
        config.data,
        statusCode,
        responseData,
        "UNAUTHORIZED"
      );

      // 延时 1.5s 重定向，保证用户能完整看清 Toast 过期提示
      setTimeout(() => {
        uni.reLaunch({
          url: "/pages/index/index?tab=mine",
        });
      }, 1500);

      return Promise.reject(new Error("UNAUTHORIZED"));
    } else if (statusCode) {
      // 其它 400、404、500 等异常 HTTP 状态码报错提示
      const errorMsg = responseData?.message || `${t("bms.request.serverError")}${statusCode}`;
      uni.showToast({
        title: errorMsg,
        icon: "none",
      });
      // 记录 HTTP 异常状态码日志
      logStore.addApiLog(
        fullUrl,
        config.method?.toUpperCase() || "GET",
        config.data,
        statusCode,
        responseData,
        errorMsg
      );
      return Promise.reject(new Error(errorMsg));
    } else {
      // 因网络中断、服务器宕机或请求超时而触发底层失败
      console.error("[BMS 请求失败] 连接云服务发生严重错误:", error);
      uni.showToast({
        title: t("bms.request.networkFailed"),
        icon: "none",
      });
      // 记录底层请求失败日志
      logStore.addApiLog(
        fullUrl,
        config.method?.toUpperCase() || "GET",
        config.data,
        0,
        undefined,
        error.message || String(error)
      );
      return Promise.reject(error);
    }
  }
);

/**
 * 统一网络请求入口函数（完全兼容旧版 request 调用规范）
 * @param config 请求配置参数
 */
export const request = <T = any>(config: CustomAxiosRequestConfig): Promise<T> => {
  return http.request(config) as unknown as Promise<T>;
};
