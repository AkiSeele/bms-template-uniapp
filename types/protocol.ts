/**
 * BMS BLE 多协议策略接口及扩展遥测数据类型声明
 * 本文件定义了策略模式下，所有厂商协议解析器必须遵循的契约接口
 *
 * 设计原则：
 * - 本文件是协议层的"宪法"，所有具体协议实现必须满足此处定义的接口契约
 * - protocolType 为开放字符串类型，不受编译期枚举限制，支持任意数量的协议扩展
 * - 每个协议实现必须通过 spec 属性暴露完整的协议规格声明（ProtocolSpec）
 * - 协议层（service/）是纯数据层，严禁在此导入任何 Vue 组件（.vue 文件）
 *
 * 协议驱动视图自适应的正确实现路径（重要架构约定）：
 *   协议专属 UI 面板通过独立的"面板注册表"实现，而非存放在协议解析器中。
 *   原因：service/ 层不应依赖 components/ 层（违反分层原则），
 *         且 UniApp 小程序平台不支持动态 import() 懒加载组件。
 *   正确路径：
 *     1. 面板组件存放在对应业务页面的 components/ 目录下（例如 pages/index/components/juliwei.vue）
 *     2. 在 components/panel-registry.ts 中静态扫描并注册
 *     3. 页面通过 resolveHomePanel(protocolType) 获取组件对象引用
 *     4. 使用 <component :is="panelComponent" /> 渲染（传入对象引用，兼容小程序）
 */

/**
 * 协议规格声明接口
 * 每个具体协议实现文件的顶部必须声明一个满足此接口的 PROTOCOL_SPEC 常量
 * 客户或开发者调整协议参数时，只需修改这个集中的规格声明区，无需改动解析逻辑
 */
export interface ProtocolSpec {
  /** 帧头标识字节数组，例如 [0xAA] 或 [0xA5, 0x40] 等多字节帧头 */
  frameHeader: number[];

  /** 帧尾标识字节数组（若协议无帧尾则传空数组） */
  frameTail?: number[];

  /** 最小有效帧长度（字节数），用于快速过滤不完整数据包 */
  minFrameLength: number;

  /** 字节序声明：大端（高位在前）或小端（低位在前） */
  byteOrder: "big-endian" | "little-endian";

  /**
   * 校验算法名称标识，须与 utils/bms-helper.ts 中导出的校验函数名对应
   * 内置支持："sum8"（单字节累加和）、"sum16le"（双字节小端累加和）、"crc16-modbus"（Modbus CRC-16）
   * 扩展时在 bms-helper.ts 增加实现函数，并在此填写对应名称即可
   */
  checksumAlgorithm: "sum8" | "sum16le" | "crc16-modbus" | string;

  /**
   * 校验和覆盖范围
   * start: 从第几个字节（含）开始纳入计算（0-indexed）
   * endOffset: 从包尾倒数第几个字节（不含）止，即最后 endOffset 个字节为校验码本身
   * 例如：{ start: 1, endOffset: 2 } 表示从第 2 字节开始，最后 2 字节为双字节校验码
   */
  checksumRange: {
    start: number;
    endOffset: number;
  };

  /**
   * 协议指令集字典（人类可读的说明性文档）
   * 键：指令语义名称（如 "READ_STATUS"、"CTRL_CHARGE_ON"）
   * 值：对应的十六进制字节字符串（如 "AA 20 00 20 00"）
   * 此字典作为协议说明文档，也用于构造轮询指令时的集中管理
   */
  commandSet: Record<string, string>;

  /** 轮询指令的语义名称序列（声明哪些指令需要按顺序进入轮询心跳中） */
  pollingSequence?: string[];

  /** 协议通信波特率（仅作文档记录，蓝牙 BLE 协议此字段可选填） */
  baudRate?: number;

  /** 协议版本号或文档版本（便于追溯协议文档的版本） */
  version?: string;
}

/**
 * 协议扩展的高阶遥测数据实体定义
 * 此处字段为通用 BMS 场景的高频扩展属性，不应与任何具体协议强绑定
 * 具体协议如有专属字段，应在此接口新增可选字段，而非在协议类内自定义随机结构
 */
export interface BmsExtendedData {
  /** 电池健康度 SOH (%) */
  soh?: number;
  /** 剩余电量容量 (Ah) */
  remainingCapacity?: number;
  /** 充满额定容量 (Ah) */
  fullCapacity?: number;
  /** 电池循环充电次数 (次) */
  cycleCount?: number;
  /** 运行天数 (天) */
  runTimeDays?: number;
  /** 运行小时数 (时) */
  runTimeHours?: number;
  /** 运行分钟数 (分) */
  runTimeMinutes?: number;
  /** 多路温度传感器数据 (°C)，索引对应传感器编号 */
  temperatures?: number[];
  /** MOS 管温度 (°C) */
  mosTemperature?: number;
  /** 环境温度 (°C) */
  envTemperature?: number;
  /** 各电芯的物理平衡状态集 (true 表示处于平衡状态) */
  balanceStates?: boolean[];
  /** 各电芯的物理断线状态集 (true 表示处于断线状态) */
  wireBrokenStates?: boolean[];
  /** 单体电芯电压列表 (mV)，索引对应电芯编号 */
  cellVoltages?: number[];
}

/**
 * 每次解析完成单个蓝牙特征值帧后，向上层上报的增量更新包
 * 采用全可选字段设计，协议解析器只需填写本次帧中包含的字段，
 * Store 层接收后做浅合并（shallow merge），不会覆盖其他字段
 */
export interface BmsTelemetryUpdate {
  /** 电池总电压 (V) */
  totalVoltage?: number;
  /** 实时电流 (A)，充电为正，放电为负 */
  realtimeCurrent?: number;
  /** 剩余电量百分比 (%) */
  batteryPercent?: number;
  /** 是否在充电 */
  isCharging?: boolean;
  /** 是否在放电 */
  isDischarging?: boolean;
  /** 电池代表性最高温 (°C) */
  temperature?: number;
  /** 扩展高阶遥测参数增量更新包 */
  extendedData?: BmsExtendedData;
  /** 控制指令的响应状态 */
  controlResponse?: {
    /** 响应的命令 ID */
    cmdId: number;
    /** 操作是否成功 */
    success: boolean;
  };
}

/**
 * 抽象协议解析策略接口契约（BmsProtocolParser）
 *
 * 所有具体协议解析器类必须实现此接口。
 * 新增协议时，只需执行以下步骤，无需修改任何现有文件：
 *   1. 在 service/protocol/ 下新建协议策略文件（如 protocol-c.ts）
 *   2. 实现此接口的全部属性和方法
 *   3. 在 service/protocol/protocol-registry.ts 中注册对应的蓝牙服务 UUID
 *   4. （可选）在 pages/index/components/ 下新建专属首页面板，在 pages/control/components/ 下新建专属控制面板
 *   5. 系统编译时会在 components/panel-registry.ts 中自动扫描并与数据层解析器建立关联
 *
 * 注意：协议解析器属于 service 层，严禁在此文件或任何协议实现文件中导入 Vue 组件。
 * 协议与 UI 的映射关系由独立的"面板注册表"（panel-registry.ts）管理。
 */
export interface BmsProtocolParser {
  /**
   * 协议类型标识符
   * 使用业务自定义的唯一字符串标识（如 "protocol-a"、"modbus-rtu"、"j1939"）
   * 此标识符同时用于在面板注册表中查找对应的 UI 面板组件
   * 注意：此字段为开放字符串类型，不受编译期固定枚举约束，支持无限扩展
   */
  readonly protocolType: string;

  /** 协议的人类友好显示名称（用于日志和界面展示） */
  readonly protocolName: string;

  /**
   * 协议规格声明对象（必须实现）
   * 暴露本协议的帧结构、校验算法、指令集等全部规格参数
   * 这是协议的"说明书"，客户调整协议参数时只需修改 PROTOCOL_SPEC 常量
   */
  readonly spec: ProtocolSpec;

  /** 轮询指令的循环步数周期长度（即有多少步不同的查询帧） */
  readonly pollingCycleLength: number;

  /**
   * 根据当前轮询计数器，获取本次需要向 BMS 下发的十六进制查询指令字符串数组
   * @param step 轮询心跳步数计数器，用于实现多帧轮转查询
   */
  getPollCommands(step: number): string[];

  /**
   * 解析从特征值上报监听中抓取到的字节帧
   * @param bytes 蓝牙外设上报的原始 Uint8Array 二进制字节数组
   * @returns 解析成功时返回增量遥测更新包，帧校验失败或不支持的命令时返回 null
   */
  parseReceivedData(bytes: Uint8Array): BmsTelemetryUpdate | null;

  /**
   * 根据控制类型及开关状态，组装下发写入所需的十六进制控制指令
   * @param type 控制类型：charge(充电MOS), discharge(放电MOS), heat(低温加热),
   *             clear(清除故障), sleep(休眠), start(启动)
   * @param open 开启或关闭标志 (true 为开，false 为关)
   * @returns 十六进制字符串指令，协议不支持该控制类型时返回空字符串
   */
  getControlCommand(
    type: "charge" | "discharge" | "heat" | "clear" | "sleep" | "start",
    open: boolean,
  ): string;
}
