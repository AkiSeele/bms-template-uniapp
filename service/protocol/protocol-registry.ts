import { BmsProtocolParser } from "@/types/protocol";

/**
 * BMS BLE 协议注册表（Protocol Registry）
 *
 * 架构说明：
 * 本文件是多协议支持的核心调度枢纽，实现"协议零感知"的动态分流。
 * ble-store.ts 在连接成功后，通过匹配到的蓝牙服务 UUID 调用 resolveProtocol() 获取协议实例，
 * 无需任何 if-else 判断，完全满足"开闭原则"。
 *
 * 新增协议时只需两步：
 *   1. 在 service/protocol/ 目录下新建协议策略文件（如 protocol-c.ts）
 *   2. 在本文件底部调用 registerProtocol(uuid, factory) 完成注册
 *   → 无需修改 ble-store.ts、无需修改类型定义，全程零侵入
 *
 * UUID 匹配规则：
 *   - 内部统一转换为大写后进行比较，注册时大小写不敏感
 *   - 支持注册多个 UUID 指向同一个协议解析器（同一硬件不同固件版本的兼容场景）
 */

/** 协议工厂函数类型：每次调用返回一个新的协议解析器实例 */
type ProtocolFactory = () => BmsProtocolParser;

/**
 * 协议注册表内部存储结构
 * 键：蓝牙主服务 UUID（大写标准化）
 * 值：对应的协议解析器工厂函数
 */
const _registry = new Map<string, ProtocolFactory>();

/**
 * 向注册表中登记一组蓝牙服务 UUID 与对应的协议解析器工厂函数
 * 支持一次注册多个 UUID（处理同一协议在不同硬件版本下 UUID 不同的场景）
 *
 * @param factory    协议解析器工厂函数，每次调用返回新实例
 * @param serviceUuids 可变参数：一个或多个蓝牙主服务 UUID 字符串（大小写不敏感）
 *
 * 示例：
 *   registerProtocol(() => new ProtocolAParser(), "00010203-0405-0607-0809-0a0b0c0d1912")
 *   registerProtocol(() => new ProtocolBParser(), "0000FF00-...", "0000FEE0-...")  // 多 UUID
 */
export const registerProtocol = (factory: ProtocolFactory, ...serviceUuids: string[]): void => {
  for (const uuid of serviceUuids) {
    const normalizedUuid = uuid.toUpperCase();
    if (_registry.has(normalizedUuid)) {
      console.warn(`[协议注册表] UUID ${normalizedUuid} 已存在注册项，将被覆盖`);
    }
    _registry.set(normalizedUuid, factory);
    console.log(`[协议注册表] 已注册协议 UUID: ${normalizedUuid}`);
  }
};

/**
 * 根据蓝牙服务 UUID 查找并实例化对应的协议解析器
 * 由 ble-store.ts 在完成服务发现后调用
 *
 * @param serviceUuid 已匹配到的蓝牙主服务 UUID
 * @returns 协议解析器实例，若未找到匹配项则返回 null
 */
export const resolveProtocol = (serviceUuid: string): BmsProtocolParser | null => {
  const normalizedUuid = serviceUuid.toUpperCase();
  const factory = _registry.get(normalizedUuid);
  if (!factory) {
    return null;
  }
  return factory();
};

/**
 * 查询当前注册表中已注册的所有蓝牙服务 UUID 列表（供调试使用）
 * @returns 已注册 UUID 数组
 */
export const getRegisteredUuids = (): string[] => {
  return Array.from(_registry.keys());
};

// ============================================================
// 协议注册区（新增协议时在此处追加 registerProtocol 调用）
// ============================================================
// 注意：导入语句放在文件顶部，注册调用放在此处，保持文件结构整洁
// 每行注册对应一个协议，注释说明对应的协议文件和协议名称

import { ProtocolAParser } from "./protocol-a";

/**
 * 协议 A（基于聚力威通讯协议规格实现的示例协议）
 * 特征：帧头 0xAA，小端字节序，双字节累加和校验
 * 协议文档：参见 service/protocol/protocol-a.ts 文件顶部 PROTOCOL_SPEC 规格声明区
 */
registerProtocol(() => new ProtocolAParser(), "00010203-0405-0607-0809-0A0B0C0D1912");

// ============================================================
// 以下为待接入协议的预留注册位（获取协议文档后解除注释并实现）
// ============================================================
// import { ProtocolBParser } from "./protocol-b";
// registerProtocol(() => new ProtocolBParser(), "0000FF00-0000-1000-8000-00805F9B34FB");
//
// import { ProtocolCParser } from "./protocol-c";
// registerProtocol(() => new ProtocolCParser(), "YOUR-PROTOCOL-C-SERVICE-UUID-HERE");
