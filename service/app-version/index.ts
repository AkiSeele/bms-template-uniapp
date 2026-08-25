/**
 * 应用版本与更新管理器 - 默认与 H5/Web 平台实现
 */

export const appVersionService = {
  /**
   * 获取当前运行版本号
   */
  getAppVersion(_t?: (key: string) => string): string {
    return "v1.0.0";
  },

  /**
   * 检查应用更新状态（默认/Web 端）
   */
  checkAppUpdate(toast: any, t: (key: string) => string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        toast.show({ msg: t("bms.mine.alreadyLatest"), duration: 2000 });
        resolve();
      }, 1000);
    });
  },
};
