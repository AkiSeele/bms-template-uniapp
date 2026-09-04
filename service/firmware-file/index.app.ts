/**
 * 固件文件选取与读取服务 - App 端实现 (Android & iOS)
 * 依赖 lemonjk-FileSelect 原生插件与 HTML5+ IO 接口。
 */

import { isAppAndroid as _envIsAppAndroid } from "@uni-helper/uni-env";

declare const plus: any;

const isAppAndroid: boolean = Boolean(
  _envIsAppAndroid ||
    (typeof plus !== "undefined" && plus.os?.name?.toLowerCase() === "android") ||
    (typeof uni !== "undefined" && (uni.getSystemInfoSync().platform || "").toLowerCase() === "android"),
);

export interface FirmwareSelectedFile {
  name: string;
  size: number;
  path: string;
}

export const firmwareFileService = {
  /**
   * 拉起原生文件选择器选取固件文件
   */
  chooseFirmwareFile(
    onSuccess: (file: FirmwareSelectedFile) => void,
    onPermissionDenied: () => void,
  ): void {
    const fileSelectPlugin = uni.requireNativePlugin("lemonjk-FileSelect");

    const fileCallback = (result: any) => {
      if (result.code === 1001) {
        onPermissionDenied();
        return;
      }
      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        const mockSize = Math.floor(Math.random() * 512 * 1024) + 64 * 1024;
        onSuccess({
          name: file.fileName || "",
          size: mockSize,
          path: file.path || file.filePath || "",
        });
      }
    };

    if (isAppAndroid) {
      fileSelectPlugin?.showNativePicker(
        { pathScope: "/Download", mimeType: "*/*" },
        fileCallback,
      );
    } else {
      fileSelectPlugin?.showPicker(
        { pathScope: "/Download", mimeType: "*/*", utisType: ["public.data"] },
        fileCallback,
      );
    }
  },

  /**
   * 跳转原生文件插件权限设置页
   */
  openPluginSettings(): void {
    const fileSelectPlugin = uni.requireNativePlugin("lemonjk-FileSelect");
    fileSelectPlugin?.gotoSetting();
  },

  /**
   * 将本地文件路径读取并转换为 base64 DataURL
   */
  pathToBase64(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      plus.io.resolveLocalFileSystemURL(
        path,
        (entry: any) => {
          entry.file(
            (file: any) => {
              const fileReader = new plus.io.FileReader();
              fileReader.onload = (evt: any) => {
                resolve(evt.target.result);
              };
              fileReader.onerror = (error: any) => {
                reject(error);
              };
              fileReader.readAsDataURL(file);
            },
            (error: any) => {
              reject(error);
            },
          );
        },
        (error: any) => {
          reject(error);
        },
      );
    });
  },

  /**
   * 设置页面卸载/返回拦截提示
   */
  setPageUnloadAlert(_enable: boolean, _message?: string): void {
    // App 端通过 onBackPress 进行拦截
  },
};
