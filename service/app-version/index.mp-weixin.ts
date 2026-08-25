/**
 * 应用版本与更新管理器 - 微信小程序端实现 (WeChat Mini Program)
 */

export const appVersionService = {
  /**
   * 获取微信小程序当前运行版本号或开发环境标识
   */
  getAppVersion(t?: (key: string) => string): string {
    try {
      const accountInfo = uni.getAccountInfoSync() as any;
      if (accountInfo.miniProgram && accountInfo.miniProgram.version) {
        return "v" + accountInfo.miniProgram.version;
      }
      if (accountInfo.miniProgram && accountInfo.miniProgram.envVersion) {
        const envNames: Record<string, string> = {
          develop: t ? t("bms.mine.envDevelop") : "开发版",
          trial: t ? t("bms.mine.envTrial") : "体验版",
          release: t ? t("bms.mine.envRelease") : "正式版",
        };
        return envNames[accountInfo.miniProgram.envVersion] || "v1.0.0";
      }
    } catch (e) {
      console.error("[AppVersion MP] 获取微信小程序版本号失败:", e);
    }
    return "v1.0.0";
  },

  /**
   * 触发微信小程序原生 UpdateManager 版本检测
   */
  checkAppUpdate(toast: any, t: (key: string) => string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const updateManager = uni.getUpdateManager();
        updateManager.onCheckForUpdate((res) => {
          setTimeout(() => {
            if (res.hasUpdate) {
              toast.show({ msg: t("bms.mine.newVersionFound"), duration: 2500 });
            } else {
              toast.show({ msg: t("bms.mine.alreadyLatest"), duration: 2000 });
            }
            resolve();
          }, 1000);
        });
      } catch (e) {
        console.error("[AppVersion MP] 微信小程序版本检测异常:", e);
        toast.show({ msg: t("bms.mine.alreadyLatest"), duration: 2000 });
        resolve();
      }
    });
  },
};
