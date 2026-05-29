import { APP_CONFIG } from "@/config";
import { useUserStore } from "@/stores/user";
import { translate as t } from "@/locale/i18n";

// 基础网络请求配置扩展，增加 noAuth 配置项决定是否跳过 Token 鉴权
interface RequestOptions extends UniApp.RequestOptions {
  noAuth?: boolean; // 为 true 时表示无需在 header 中携带 Token
}

/**
 * 核心网络请求服务拦截器
 * 负责底层 HTTP 请求的发送、请求头 Token 注入、离线单机拦截以及 401 未授权处理
 */
export const request = <T = any>(options: RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    // 1. 请求拦截 - 判定单机离线模式
    if (APP_CONFIG.APP_MODE === "offline") {
      console.warn("[BMS 离线单机模式拦截] 已成功拦截网络请求:", options.url);
      uni.showToast({
        title: t("bms.request.offlineMode"),
        icon: "none",
      });
      return reject(new Error("OFFLINE_MODE"));
    }

    // 2. 请求拦截 - 智能拼接云平台 API 请求主地址
    let fullUrl = options.url;
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      // 规整斜杠连接符
      const separator = fullUrl.startsWith("/") ? "" : "/";
      fullUrl = `${APP_CONFIG.BASE_URL}${separator}${fullUrl}`;
    }

    // 3. 请求拦截 - 组装 Header 请求头并自动注入 Token 鉴权字段
    const header = { ...(options.header || {}) };
    if (!options.noAuth) {
      const userStore = useUserStore();
      if (userStore.token) {
        header["Authorization"] = `Bearer ${userStore.token}`;
      }
    }

    // 发起 uni-app 跨端通用网络请求服务
    uni.request({
      ...options,
      url: fullUrl,
      header,
      timeout: APP_CONFIG.REQUEST_TIMEOUT,
      success: (res) => {
        const statusCode = res.statusCode;

        // 4. 响应拦截 - 解析处理服务端响应结果
        if (statusCode >= 200 && statusCode < 300) {
          // 响应成功，解析返回核心数据
          resolve(res.data as T);
        } else if (statusCode === 401) {
          // 401 未授权或 Token 已过期：执行登出清理缓存，并退回到个人中心
          const userStore = useUserStore();
          userStore.logout();

          uni.showToast({
            title: t("bms.request.loginExpired"),
            icon: "none",
          });

          // 延时 1.5s 重定向，保证用户能完整看清 Toast 过期提示
          setTimeout(() => {
            uni.reLaunch({
              url: "/pages/mine/index",
            });
          }, 1500);

          reject(new Error("UNAUTHORIZED"));
        } else {
          // 其它 400、404、500 等异常 HTTP 状态码报错提示
          const errorMsg = (res.data as any)?.message || (t("bms.request.serverError") + statusCode);
          uni.showToast({
            title: errorMsg,
            icon: "none",
          });
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        // 因网络中断、服务器宕机或请求超时而触发的系统底层 fail 回调
        console.error("[BMS 请求失败] 连接云服务发生严重错误:", err);
        uni.showToast({
          title: t("bms.request.networkFailed"),
          icon: "none",
        });
        reject(err);
      },
    });
  });
};
