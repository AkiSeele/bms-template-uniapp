/**
 * 固件文件选取与读取服务 - 默认与 H5/Web 平台实现
 */

export interface FirmwareSelectedFile {
  name: string;
  size: number;
  path: string;
}

export const firmwareFileService = {
  /**
   * 默认文件选择器
   */
  chooseFirmwareFile(
    onSuccess: (file: FirmwareSelectedFile) => void,
    _onPermissionDenied: () => void,
  ): void {
    uni.chooseFile({
      count: 1,
      type: "all",
      success: (res: any) => {
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
   * 将文件转换为 Base64
   */
  pathToBase64(_path: string): Promise<string> {
    return Promise.resolve("");
  },

  /**
   * 设置页面卸载拦截
   */
  setPageUnloadAlert(_enable: boolean, _message?: string): void {
    // 默认空实现
  },
};
