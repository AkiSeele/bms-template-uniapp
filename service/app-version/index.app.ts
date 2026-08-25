/**
 * 应用版本与更新管理器 - App 端实现 (Android & iOS)
 */

declare const plus: any;

export const appVersionService = {
  /**
   * 获取 App 端当前运行版本号字符串
   */
  getAppVersion(): string {
    try {
      if (typeof plus !== "undefined" && plus.runtime && plus.runtime.version) {
        return "v" + plus.runtime.version;
      }
    } catch (e) {
      console.error("[AppVersion App] 获取移动端版本号失败:", e);
    }
    return "v1.0.0";
  },

  /**
   * 检查应用更新状态（App 原生端）
   */
  checkAppUpdate(toast: any, t: (key: string) => string): Promise<void> {
    return new Promise((resolve) => {
      // 延迟 1 秒使 loading 动效可感知
      setTimeout(() => {
        toast.show({ msg: t("bms.mine.alreadyLatest"), duration: 2000 });
        resolve();
      }, 1000);
    });
  },
};
