/**
 * 全局应用配置文件
 * 用于存放整个项目的基础运行环境参数、多套蓝牙 UUID 服务集、以及网络接口地址等
 */

// 应用当前运行模式类型定义
export type AppMode = "cloud" | "offline";

// 蓝牙 UUID 服务特征值配置项类型定义
export interface BleServiceConfig {
  serviceId: string; // 蓝牙主服务 UUID
  writeCharacteristicId: string; // 写入特征值 UUID (向蓝牙外设下发指令)
  readCharacteristicId: string; // 读取特征值 UUID (主动读取外设状态)
  notifyCharacteristicId: string; // 通知特征值 UUID (监听外设的数据主动上报)
}

export const APP_CONFIG = {
  // 当前运行模式：'cloud' 表示接入云平台模式，需要登录和网络通信；'offline' 表示纯单机模式
  APP_MODE: "cloud" as AppMode,

  // 云端 API 服务器接口请求基准地址
  BASE_URL: "https://api.bms-battery.com",

  // 请求超时时间配置（单位：毫秒）
  REQUEST_TIMEOUT: 10000,

  // 蓝牙扫描相关配置
  BLE_SCAN: {
    // 单次扫描最长持续时间（毫秒），超时后自动停止以释放硬件资源
    SCAN_TIMEOUT_MS: 8000,
    // MTU 单包最大字节数，默认为 BLE 协议标准下限值，协商成功后可增大
    DEFAULT_MTU: 20,
    // 分包发送时每包间的最小延时（毫秒），防止 BLE 控制器缓冲区堵包
    CHUNK_DELAY_MS: 50,
  },

  // Android 运行时动态权限名称常量
  // 按照 Android 版本区分：Android 12+ (API 31+) 使用附近设备权限组；低版本使用定位权限
  ANDROID_PERMISSIONS: {
    // Android 12+ 蓝牙扫描权限（附近设备）
    BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
    // Android 12+ 蓝牙连接权限（附近设备）
    BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
    // Android 11 及以下：蓝牙扫描必须使用精确位置权限（系统强制绑定）
    ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
  },

  // 蓝牙 UUID 配置组（支持兼容多套不同厂商/型号对应的服务和特征值配置）
  BLE_SERVICES: {
    // 默认厂商 A 蓝牙模块配置
    DEFAULT_SERVICE: {
      serviceId: "0000FF00-0000-1000-8000-00805F9B34FB",
      writeCharacteristicId: "0000FF01-0000-1000-8000-00805F9B34FB",
      readCharacteristicId: "0000FF02-0000-1000-8000-00805F9B34FB",
      notifyCharacteristicId: "0000FF02-0000-1000-8000-00805F9B34FB",
    } as BleServiceConfig,

    // 备用厂商 B 蓝牙模块配置 (支持兼容另外一套读写 UUID)
    ALTERNATIVE_SERVICE: {
      serviceId: "0000FEE0-0000-1000-8000-00805F9B34FB",
      writeCharacteristicId: "0000FEE1-0000-1000-8000-00805F9B34FB",
      readCharacteristicId: "0000FEE2-0000-1000-8000-00805F9B34FB",
      notifyCharacteristicId: "0000FEE2-0000-1000-8000-00805F9B34FB",
    } as BleServiceConfig,

    // JLW 蓝牙模块配置 (主服务与读写特征值共用同一 UUID)
    JLW_SERVICE: {
      serviceId: "00010203-0405-0607-0809-0a0b0c0d1912",
      writeCharacteristicId: "00010203-0405-0607-0809-0a0b0c0d2b12",
      readCharacteristicId: "00010203-0405-0607-0809-0a0b0c0d2b12",
      notifyCharacteristicId: "00010203-0405-0607-0809-0a0b0c0d2b12",
    } as BleServiceConfig,
  },
};
