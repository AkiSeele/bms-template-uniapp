import { BmsProtocolParser } from "@/types/protocol";
import { APP_CONFIG } from "@/config";

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
// 协议自动扫描与注册区（基于 Vite 编译期 Glob 自动加载）
// ============================================================

// 1. 使用 Glob Eager 静态读取所有策略解析器文件（排除注册表本身）
// @ts-ignore
const protocolModules = import.meta.glob("./!(protocol-registry).ts", { eager: true });
const parserClasses = new Map<string, any>();

// 2. 遍历模块提取并按文件名规律自动关联装载
for (const path in protocolModules) {
  const match = path.match(/\.\/([a-z0-9\_]+)\.ts$/);
  if (match) {
    const filename = match[1]!;
    const mod = protocolModules[path] as any;
    for (const key in mod) {
      const ExportedClass = mod[key];
      if (typeof ExportedClass === "function" && ExportedClass.prototype) {
        parserClasses.set(filename, ExportedClass);
        break; // 每个文件导出一个主要 Parser
      }
    }
  }
}

// 3. 遍历 config/index.ts 中的多协议服务配置，自适应完成物理注册与缺失报错引导
const bleServicesConfig = APP_CONFIG.BLE_SERVICES as Record<string, any>;
for (const configKey in bleServicesConfig) {
  // 直接以配置键名（如 juliwei、protocol_b）作为协议标识符，实现零转换硬对齐
  const expectedProtocolType = configKey;

  const ParserClass = parserClasses.get(expectedProtocolType);

  if (ParserClass) {
    const serviceConfigs = bleServicesConfig[configKey] || [];
    const uuids = serviceConfigs.map((s: any) => s.serviceId);
    if (uuids.length > 0) {
      // 实例化时自动传入协议标识符作为构造函数参数，对齐协议标识
      registerProtocol(() => new ParserClass(expectedProtocolType), ...uuids);
    }
  } else {
    // 自动抛出报错日志以引导开发者创建对应协议文件
    console.error(
      `[协议注册表] ⚠️ 检测到 config/index.ts 中配置了协议 "${configKey}"，但未找到对应的物理策略文件 "service/protocol/${expectedProtocolType}.ts"。` +
        `请创建该文件并导出解析器类。`
    );
  }
}
