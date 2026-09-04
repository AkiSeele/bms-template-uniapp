import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { AxiosHeaders } from "axios";

/**
 * 构造完整的请求 URL，自动拼装 baseURL 与 query 参数
 */
function buildFullUrl(baseURL: string | undefined, relativeUrl: string | undefined, params?: Record<string, any>): string {
  let url = relativeUrl || "";
  if (baseURL) {
    if (baseURL.endsWith("/") && url.startsWith("/")) {
      url = baseURL + url.slice(1);
    } else if (!baseURL.endsWith("/") && !url.startsWith("/")) {
      url = `${baseURL}/${url}`;
    } else {
      url = baseURL + url;
    }
  }

  if (params && Object.keys(params).length > 0) {
    const queryParts: string[] = [];
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (value !== undefined && value !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    if (queryParts.length > 0) {
      url += (url.includes("?") ? "&" : "?") + queryParts.join("&");
    }
  }

  return url;
}

/**
 * 创建纯净的 Uni-app 原生网络适配器
 * 采用 uni.request 桥接，杜绝第三方依赖中顶层变量与微信小程序沙箱形参冲突
 */
export function createUniAppAxiosAdapter(): AxiosAdapter {
  return (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    return new Promise((resolve, reject) => {
      const fullUrl = buildFullUrl(config.baseURL, config.url, config.params);
      const method = (config.method?.toUpperCase() || "GET") as
        | "GET"
        | "POST"
        | "PUT"
        | "DELETE"
        | "CONNECT"
        | "HEAD"
        | "OPTIONS"
        | "TRACE";

      // 提取请求头
      let header: Record<string, any> = {};
      if (config.headers) {
        if (typeof config.headers.toJSON === "function") {
          header = config.headers.toJSON();
        } else {
          header = { ...config.headers };
        }
      }

      // 请求数据预处理
      let requestData = config.data;
      if (typeof requestData === "string") {
        try {
          requestData = JSON.parse(requestData);
        } catch {
          // 保持原始字符串
        }
      }

      const requestTask = uni.request({
        url: fullUrl,
        method,
        data: requestData,
        header,
        timeout: config.timeout || 60000,
        responseType: config.responseType === "arraybuffer" ? "arraybuffer" : "text",
        dataType: config.responseType === "json" ? "json" : "text",
        success(res) {
          const responseHeaders = new AxiosHeaders(res.header as Record<string, string>);
          const response: AxiosResponse = {
            data: res.data,
            status: res.statusCode,
            statusText: res.errMsg || "OK",
            headers: responseHeaders,
            config,
            request: requestTask,
          };
          resolve(response);
        },
        fail(err) {
          reject(err);
        },
      });

      // 支持请求取消（CancelToken 或 AbortSignal）
      if (config.signal && typeof config.signal.addEventListener === "function") {
        config.signal.addEventListener("abort", () => {
          if (requestTask && typeof requestTask.abort === "function") {
            requestTask.abort();
          }
          reject(new Error("canceled"));
        });
      }
    });
  };
}
