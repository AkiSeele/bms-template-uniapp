/**
 * 固件文件选取与读取服务 - 微信小程序端实现 (WeChat Mini Program)
 * 依赖 wx.chooseMessageFile 与 wx.getFileSystemManager。
 */

declare const wx: any;

export interface FirmwareSelectedFile {
  name: string;
  size: number;
  path: string;
}

export const firmwareFileService = {
  /**
   * 微信小程序：从微信聊天会话中选取固件文件
   */
  chooseFirmwareFile(
    onSuccess: (file: FirmwareSelectedFile) => void,
    _onPermissionDenied: () => void,
  ): void {
    wx.chooseMessageFile({
      count: 1,
      type: "all",
      success(res: any) {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const file = res.tempFiles[0];
          onSuccess({
            name: file.name || "",
            size: file.size || 0,
            path: file.path || "",
          });
        }
      },
    });
  },

  /**
   * 跳转设置页
   */
  openPluginSettings(): void {
    uni.openSetting();
  },

  /**
   * 微信小程序：通过 FileSystemManager 读取文件为 Base64
   */
  pathToBase64(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: path,
        encoding: "base64",
        success: (res: any) => {
          resolve("data:image/png;base64," + res.data);
        },
        fail: (err: any) => {
          reject(err);
        },
      });
    });
  },

  /**
   * 微信小程序：设置页面关闭前拦截警告
   */
  setPageUnloadAlert(enable: boolean, message?: string): void {
    if (enable) {
      wx.enableAlertBeforeUnload({
        message: message || "固件正在升级中，退出将导致升级中断！",
      });
    } else {
      wx.disableAlertBeforeUnload();
    }
  },
};
