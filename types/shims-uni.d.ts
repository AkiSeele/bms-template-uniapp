/**
 * TypeScript 全局类型声明垫片 (Shims)
 * 用于为非 NPM 依赖或仅在 uni-app 环境下专用的特定路径模块提供类型存根，
 * 彻底消除本地 IDE 静态分析报错以及 tsc 编译阶段的类型缺失警告。
 */

// 声明 uni-app 框架内置的页面组合式生命周期钩子模块
declare module "@dcloudio/uni-app" {
  /**
   * 页面加载时触发的生命周期钩子
   * @param callback 页面加载回调，query 为页面跳转携带的入参对象
   */
  export function onLoad(callback: (query: Record<string, any>) => void): void;

  /**
   * 页面显示/切入前台时触发的生命周期钩子
   */
  export function onShow(callback: () => void): void;

  /**
   * 页面初次渲染完成时触发的生命周期钩子
   */
  export function onReady(callback: () => void): void;

  /**
   * 页面隐藏/切入后台时触发的生命周期钩子
   */
  export function onHide(callback: () => void): void;

  /**
   * 页面卸载时触发的生命周期钩子
   */
  export function onUnload(callback: () => void): void;
}

// 声明 wot-ui 本地 uni_modules 组件库导出的反馈类 Hooks 模块
declare module "@/uni_modules/wot-ui" {
  /**
   * 获取全局 Toast 交互提示实例的 Hook 函数
   */
  export function useToast(): {
    show: (options: any) => void;
    success: (msg: string | any) => void;
    error: (msg: string | any) => void;
    info: (msg: string | any) => void;
    loading: (options: any) => void;
    close: () => void;
  };

  /**
   * 获取全局 Dialog 对话框交互实例的 Hook 函数
   */
  export function useDialog(): {
    alert: (options: any) => Promise<void>;
    confirm: (options: any) => Promise<void>;
  };
}
