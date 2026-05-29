/**
 * BMS BLE 项目全局 TypeScript 类型定义文件
 * 存放整个应用共享的核心数据实体与底层传输格式定义
 */

// 电池核心实时状态参数数据结构
export interface BatteryData {
  voltage: number       // 电池总电压 (V)
  current: number       // 实时电流 (A)，正数代表充电，负数代表放电
  capacity: number      // 剩余电量容量 (Ah)
  totalCapacity: number  // 电池额定总容量 (Ah)
  percent: number       // 剩余电量百分比 (%)
  temp: number          // 电池最高温度 (°C)
  soh: number           // 电池健康度 SOH (%)
}

// 电池安全及异常保护状态标志集
export interface BatteryProtection {
  overTemperature: boolean // 单体过温保护是否已触发
  overVoltage: boolean     // 单体过压保护是否已触发
  shortCircuit: boolean    // 放电短路保护是否已触发
}

// 蓝牙设备连接及基本描述信息
export interface BleDevice {
  deviceId: string      // 蓝牙设备的 Mac 地址或系统底层生成的连接 UUID
  name: string          // 蓝牙外设广播出的蓝牙名称
  rssi: number          // 设备当前信号强度指标 (dBm)
  connected: boolean    // 当前设备是否已经处于建立连接状态
}
