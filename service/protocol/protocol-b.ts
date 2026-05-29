import { BmsProtocolParser, BmsTelemetryUpdate, ProtocolSpec } from "@/types/protocol";

// ============================================================
// 协议规格声明区（Protocol Specification）
//
// 本区域是协议的"说明书"，集中描述该协议的全部物理帧格式规范。
// 客户或开发者需要调整协议参数时，只需修改此处，无需改动下方的解析逻辑。
//
// ⚠️ 待实现：此文件为架构占位存根，协议规格字段尚未填写。
// 待办条件：获取该协议的官方通讯文档后，请：
//   1. 填写下方 PROTOCOL_SPEC 中的所有字段（帧头、校验方式、指令集等）
//   2. 实现 parseReceivedData、getPollCommands、getControlCommand 三个方法
//   3. 在 protocol-registry.ts 中解除对应的注释，完成 UUID 注册
// ============================================================
const PROTOCOL_SPEC: ProtocolSpec = {
  /** 帧头标识字节（待填写） */
  frameHeader: [], // TODO: 填写帧头字节，如 [0xA5, 0x40]

  /** 最小有效帧长度（待填写） */
  minFrameLength: 0, // TODO: 填写最小帧字节数

  /** 字节序（待确认） */
  byteOrder: "big-endian", // TODO: 根据协议文档确认字节序

  /**
   * 校验算法（待确认）
   * 可选值："sum8" | "sum16le" | "crc16-modbus" | 自定义标识符
   */
  checksumAlgorithm: "sum8", // TODO: 根据协议文档确认校验算法

  /**
   * 校验覆盖范围（待确认）
   * start: 校验计算起始字节索引（含，0-indexed）
   * endOffset: 帧末校验码占用的字节数
   */
  checksumRange: {
    start: 0, // TODO: 填写校验起始字节索引
    endOffset: 1, // TODO: 填写校验码字节数（sum8=1, sum16le/crc16=2）
  },

  /**
   * 指令集字典（待填写）
   * 键：指令语义名称；值：十六进制字符串（含空格分隔，便于阅读）
   */
  commandSet: {
    // TODO: 根据协议文档填写所有下行指令的十六进制定义
    // 示例：READ_STATUS: "A5 40 90 08 00 00 00 00 00 00 00 00 7D",
  },

  /** 协议文档版本（待填写） */
  version: "TODO: 填写协议文档版本号",
};
// ============================================================
// 协议规格声明区 结束
// ============================================================

/**
 * 协议 B —— BMS 蓝牙通信协议策略解析器（待实现存根）
 *
 * ⚠️ 警告：此文件为架构占位存根，当前不包含任何真实协议解析逻辑！
 * 所有方法均返回安全的空值，不会下发任何指令或解析任何数据帧。
 *
 * 正确实现此协议前，请勿在 protocol-registry.ts 中注册此解析器。
 */
export class ProtocolBParser implements BmsProtocolParser {
  /** 协议类型标识符（视图层据此挂载对应控制面板组件） */
  readonly protocolType = "protocol-b";

  /** 协议显示名称（用于日志和界面展示） */
  readonly protocolName = "协议 B（待实现）";

  /** 暴露协议规格声明对象 */
  readonly spec: ProtocolSpec = PROTOCOL_SPEC;

  /**
   * 获取轮询指令 —— 待实现存根
   * 当前返回空数组，不会下发任何查询帧
   */
  getPollCommands(_step: number): string[] {
    console.warn("[协议 B] getPollCommands 尚未实现，请先填写协议文档并完善此方法！");
    return [];
  }

  /**
   * 解析接收数据帧 —— 待实现存根
   * 当前始终返回 null，不对任何接收帧做解析
   */
  parseReceivedData(_bytes: Uint8Array): BmsTelemetryUpdate | null {
    console.warn("[协议 B] parseReceivedData 尚未实现，请先填写协议文档并完善此方法！");
    return null;
  }

  /**
   * 组装控制指令 —— 待实现存根
   * 当前始终返回空字符串，不会下发任何控制帧
   */
  getControlCommand(
    _type: "charge" | "discharge" | "heat" | "clear" | "sleep" | "start",
    _open: boolean,
  ): string {
    console.warn("[协议 B] getControlCommand 尚未实现，请先填写协议文档并完善此方法！");
    return "";
  }
}
