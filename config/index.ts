/**
 * 全局应用配置文件
 * 用于存放整个项目的基础运行环境参数、多套蓝牙 UUID 服务集、以及网络接口地址等
 *
 * 本文件是纯静态配置大本营，严禁编写任何带有运行期副作用或依赖 Pinia 状态的代码
 *
 * 多协议接入指引：
 *   1. 在 BLE_SERVICES 中新增一个 BleServiceConfig 对象，填写目标协议的蓝牙 UUID
 *   2. 在 service/protocol/protocol-registry.ts 中调用 registerProtocol() 注册该 UUID
 *   3. 在 service/protocol/ 下新建对应协议策略文件并实现 BmsProtocolParser 接口
 */

/** 应用当前运行模式类型定义 */
export type AppMode = "cloud" | "offline";

/**
 * 蓝牙 UUID 服务特征值配置项类型定义
 * 每套不同的蓝牙硬件模块通常对应一组不同的 UUID，在此集中管理
 */
export interface BleServiceConfig {
  /** 蓝牙主服务 UUID（用于协议路由匹配，也是 discoverServices 的过滤依据） */
  serviceId: string;
  /** 写入特征值 UUID（向蓝牙外设下发指令时使用） */
  writeCharacteristicId: string;
  /** 读取特征值 UUID（主动轮询读取外设状态时使用） */
  readCharacteristicId: string;
  /** 通知特征值 UUID（监听外设主动上报数据时订阅此特征值） */
  notifyCharacteristicId: string;
}

export const APP_CONFIG = {
  /** 当前运行模式："cloud" 表示接入云平台（需登录和网络通信）；"offline" 表示纯单机模式 */
  APP_MODE: "cloud" as AppMode,

  /** 云端 API 服务器接口请求基准地址（生产环境部署时替换为实际域名） */
  BASE_URL: "https://api.bms-battery.com",

  /** 请求超时时间（单位：毫秒） */
  REQUEST_TIMEOUT: 10000,

  /** 蓝牙扫描与连接相关配置 */
  BLE_SCAN: {
    /** 单次扫描最长持续时间（毫秒），超时后自动停止以释放硬件天线资源 */
    SCAN_TIMEOUT_MS: 8000,
    /** 协商前的默认 MTU 大小（字节），BLE 标准下限值，协商成功后可增大至 247 */
    DEFAULT_MTU: 20,
    /** 多包写入时每包间的最短物理延时（毫秒），防止 BLE 控制器缓冲区堵塞丢包 */
    CHUNK_DELAY_MS: 50,
  },

  /**
   * Android 运行时动态权限名称常量
   * Android 12+（API 31+）引入"附近设备"权限组，低版本需使用位置权限
   * 权限申请逻辑见 service/permission.ts
   */
  ANDROID_PERMISSIONS: {
    /** Android 12+ 蓝牙扫描权限 */
    BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
    /** Android 12+ 蓝牙连接权限 */
    BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
    /** Android 11 及以下：蓝牙扫描须绑定精确位置权限（系统强制要求） */
    ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
  },

  /**
   * 蓝牙 UUID 配置组
   *
   * 每套硬件协议对应一个 BleServiceConfig 配置项。
   * 接入新协议时：
   *   1. 在此处新增配置项（命名格式建议：PROTOCOL_X_SERVICE）
   *   2. 在 service/protocol/protocol-registry.ts 中用该 UUID 注册对应的解析器
   *
   * 命名规则：使用协议序号占位（PROTOCOL_A、PROTOCOL_B...），而非厂商名称，
   * 确保代码在任意客户场景下均可作为通用模板使用。
   */
  BLE_SERVICES: {
    /**
     * 协议 A 蓝牙硬件模块 UUID 配置
     * 主服务 UUID：00010203-0405-0607-0809-0a0b0c0d1912
     * 读写特征值共用同一 UUID：00010203-0405-0607-0809-0a0b0c0d2b12
     */
    PROTOCOL_A_SERVICE: {
      serviceId: "00010203-0405-0607-0809-0a0b0c0d1912",
      writeCharacteristicId: "00010203-0405-0607-0809-0a0b0c0d2b12",
      readCharacteristicId: "00010203-0405-0607-0809-0a0b0c0d2b12",
      notifyCharacteristicId: "00010203-0405-0607-0809-0a0b0c0d2b12",
    } as BleServiceConfig,

    /**
     * 协议 B 蓝牙硬件模块 UUID 配置（待实现，占位预留）
     * ⚠️ 此配置项对应的协议解析器尚未实现，UUID 为占位值，请在获取协议文档后更新
     */
    PROTOCOL_B_SERVICE: {
      serviceId: "0000FF00-0000-1000-8000-00805F9B34FB",
      writeCharacteristicId: "0000FF01-0000-1000-8000-00805F9B34FB",
      readCharacteristicId: "0000FF02-0000-1000-8000-00805F9B34FB",
      notifyCharacteristicId: "0000FF02-0000-1000-8000-00805F9B34FB",
    } as BleServiceConfig,

    // TODO: 接入协议 C 时，在此处新增 PROTOCOL_C_SERVICE 配置项
    // PROTOCOL_C_SERVICE: {
    //   serviceId: "YOUR-PROTOCOL-C-SERVICE-UUID",
    //   writeCharacteristicId: "YOUR-PROTOCOL-C-WRITE-CHAR-UUID",
    //   readCharacteristicId: "YOUR-PROTOCOL-C-READ-CHAR-UUID",
    //   notifyCharacteristicId: "YOUR-PROTOCOL-C-NOTIFY-CHAR-UUID",
    // } as BleServiceConfig,
  },
};
