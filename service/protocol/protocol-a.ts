import { BmsProtocolParser, BmsTelemetryUpdate, ProtocolSpec } from "@/types/protocol";
import { verifyChecksum, uint8ArrayToHexString } from "@/utils/bms-helper";

// ============================================================
// 协议规格声明区（Protocol Specification）
//
// 本区域是协议的"说明书"，集中描述该协议的全部物理帧格式规范。
// 客户或开发者需要调整协议参数时，只需修改此处，无需改动下方的解析逻辑。
//
// 协议来源文档：（接入时请在此注明协议文档的版本和来源，例如：
//   "某厂商蓝牙 BMS 通讯协议 V2.1 - 2026-04-01"）
// ============================================================
const PROTOCOL_SPEC: ProtocolSpec = {
  /**
   * 帧头标识
   * 每帧数据的首字节固定为 0xAA，解析器以此判断帧起始边界
   */
  frameHeader: [0xaa],

  /**
   * 最小有效帧长度（字节）
   * 帧头(1) + 命令字(1) + 数据长度字(1) + 校验码低字节(1) + 校验码高字节(1) = 5 字节
   */
  minFrameLength: 5,

  /**
   * 字节序：小端（Low Byte First）
   * 多字节数值的低位字节存放在低地址（先传输），高位字节存放在高地址（后传输）
   */
  byteOrder: "little-endian",

  /**
   * 校验算法：16 位小端双字节累加和（Sum-16 LE）
   * 校验覆盖范围：从命令字节（bytes[1]）开始，到数据段末尾（不含最后 2 字节的校验码）
   * 计算结果拆分为 sumL（低字节）和 sumH（高字节），依次存放在帧末
   */
  checksumAlgorithm: "sum16le",
  checksumRange: {
    start: 1,      // 从命令字节（bytes[1]）开始纳入校验，跳过帧头 0xAA
    endOffset: 2,  // 最后 2 字节为双字节校验码，不纳入校验计算
  },

  /**
   * 指令集字典（集中管理所有下行指令的十六进制定义）
   *
   * 帧格式说明（下行查询帧，固定 5 字节）：
   *   帧头(1) + 命令字(1) + 数据长度=0x00(1) + 校验码低字节(1) + 校验码高字节(1)
   *   校验 = 命令字 + 数据长度 = cmd + 0x00 = cmd
   *   因此校验码 sumL = cmd & 0xFF，sumH = 0x00
   *
   * 上行响应帧格式（动态长度）：
   *   帧头(1) + 命令字(1) + 数据长度 LEN(1) + 数据 DAT(LEN 字节) + 校验低(1) + 校验高(1)
   *   总长度 = 3 + LEN + 2 = LEN + 5 字节
   *
   * 命令字说明：
   *   - 0x20: 查询系统运行时间、运行状态（FET 开关）、电芯平衡与断线报警
   *   - 0x21: 查询核心遥测（总电压、电流、SOC、SOH、容量、循环次数、多路温度）
   *   - 0x22: 查询所有电芯单体电压（最多 24 节，每节 2 字节小端，单位 mV）
   *   - 0x50: 充电 MOS 控制（数据 1 字节：0x01=开启, 0x00=关闭）
   *   - 0x51: 放电 MOS 控制（数据 1 字节：0x01=开启, 0x00=关闭）
   *   - 0x52: 低温加热控制（数据 1 字节：0x01=开启, 0x00=关闭）
   *   - 0x53: 清除故障标志
   *   - 0x54: 强制休眠
   *   - 0x55: 强制启动
   */
  commandSet: {
    READ_STATUS: "AA 20 00 20 00", // 查询系统状态（0x20 帧）
    READ_INFO: "AA 21 00 21 00", // 查询核心遥测（0x21 帧）
    READ_CELLS: "AA 22 00 22 00", // 查询电芯单体电压（0x22 帧）
    CTRL_CHARGE_ON: "AA 50 01 01 52 00", // 充电 MOS 开启
    CTRL_CHARGE_OFF: "AA 50 01 00 51 00", // 充电 MOS 关闭
    CTRL_DISCHARGE_ON: "AA 51 01 01 53 00", // 放电 MOS 开启
    CTRL_DISCHARGE_OFF: "AA 51 01 00 52 00", // 放电 MOS 关闭
    CTRL_HEAT_ON: "AA 52 01 01 54 00", // 低温加热开启
    CTRL_HEAT_OFF: "AA 52 01 00 53 00", // 低温加热关闭
    CTRL_CLEAR: "AA 53 00 53 00", // 清除故障标志
    CTRL_SLEEP: "AA 54 00 54 00", // 强制休眠
    CTRL_START: "AA 55 00 55 00", // 强制启动
  },

  /** 协议版本（对应协议文档版本，便于日后追溯） */
  version: "TODO: Please fill in protocol document version number",
};
// ============================================================
// 协议规格声明区 结束
// ============================================================

/**
 * 协议 A —— BMS 蓝牙通信协议策略解析器
 *
 * 协议核心特征（详见上方 PROTOCOL_SPEC）：
 *   - 帧头：0xAA（单字节）
 *   - 字节序：小端（低位先传）
 *   - 校验：16 位小端双字节累加和
 *   - 帧结构：动态长度（数据段长度由第 3 字节 LEN 决定）
 *
 * 该类为无状态纯解析策略，所有解析方法均为纯函数，可多实例共用。
 */
export class ProtocolAParser implements BmsProtocolParser {
  /** 协议类型标识符，视图层据此挂载对应的控制面板组件 */
  readonly protocolType = "protocol-a";

  /** 协议显示名称（用于日志和界面展示） */
  readonly protocolName = "Protocol A (BMS BLE)";

  /** 暴露协议规格声明对象，供 Store 层和调试工具读取 */
  readonly spec: ProtocolSpec = PROTOCOL_SPEC;

  /**
   * 获取本次轮询需下发的查询指令数组
   * 采用三帧循环轮转策略：0x20 → 0x21 → 0x22 → 0x20 → ...
   * 每 2 秒（Store 定时器周期）轮换下发一帧，3 轮覆盖全部遥测数据
   */
  getPollCommands(step: number): string[] {
    const index = step % 3;
    if (index === 0) return [PROTOCOL_SPEC.commandSet["READ_STATUS"]!];
    if (index === 1) return [PROTOCOL_SPEC.commandSet["READ_INFO"]!];
    return [PROTOCOL_SPEC.commandSet["READ_CELLS"]!];
  }

  /**
   * 解析 BMS 上报的原始数据帧
   * 解析流程：帧头验证 → 长度合法性检查 → 双字节累加和校验 → 按命令字分支解析
   */
  parseReceivedData(bytes: Uint8Array): BmsTelemetryUpdate | null {
    // 1. 最小包长度与帧头双重验证
    if (bytes.length < PROTOCOL_SPEC.minFrameLength || bytes[0] !== PROTOCOL_SPEC.frameHeader[0]) {
      return null;
    }

    const cmdId = bytes[1];
    const dataLen = bytes[2];

    // 2. 确保数据包包含足够字节（头部 3 字节 + 数据段 + 2 字节校验码）
    if (bytes.length < dataLen + 5) {
      return null;
    }

    // 3. 调用通用校验分发器验证帧完整性（委托给 bms-helper.ts，无需手写校验逻辑）
    const isValid = verifyChecksum(bytes, PROTOCOL_SPEC.checksumAlgorithm, PROTOCOL_SPEC.checksumRange);
    if (!isValid) {
      console.warn(`[协议 A] 校验失败，丢弃帧 (CMD=0x${cmdId.toString(16).toUpperCase()}):`, uint8ArrayToHexString(bytes));
      return null;
    }

    // 4. 提取纯数据段（跳过头部 3 字节：帧头 + 命令字 + 长度）
    const data = bytes.slice(3, 3 + dataLen);
    const update: BmsTelemetryUpdate = {};
    const ext: Record<string, unknown> = {};

    if (cmdId === 0x20) {
      // ====================================================
      // 0x20 帧：系统运行时间 + 运行状态（FET 开关）+ 电芯平衡/断线报警
      // ====================================================
      if (data.length >= 11) {
        // 运行时间：字节 0-3
        // - 字节 0-1（小端）：运行天数
        // - 字节 2：运行小时数（0-23）
        // - 字节 3：运行分钟数（0-59）
        ext.runTimeDays = data[0]! | (data[1]! << 8);
        ext.runTimeHours = data[2]!;
        ext.runTimeMinutes = data[3]!;

        // 运行状态：字节 4-7（4 字节状态位字段）
        const state0 = data[4]!;
        const state2 = data[6]!;

        // 充电 FET 开启标志：第 0 状态字节的 Bit7（1=打开）
        update.isCharging = (state0 & 0x80) !== 0;
        // 放电 FET 开启标志：第 2 状态字节的 Bit7（1=打开）
        update.isDischarging = (state2 & 0x80) !== 0;

        // 电芯平衡状态：字节 8-10（3 字节共 24 位，每位对应一节电芯）
        const balanceStates: boolean[] = [];
        for (let b = 8; b <= 10; b++) {
          for (let bit = 0; bit < 8; bit++) {
            balanceStates.push(((data[b]! >> bit) & 0x01) === 1);
          }
        }
        ext.balanceStates = balanceStates;

        // 断线报警状态：字节 11-13（仅在数据段长度 ≥ 14 时存在）
        if (data.length >= 14) {
          const wireBrokenStates: boolean[] = [];
          for (let b = 11; b <= 13; b++) {
            for (let bit = 0; bit < 8; bit++) {
              wireBrokenStates.push(((data[b]! >> bit) & 0x01) === 1);
            }
          }
          ext.wireBrokenStates = wireBrokenStates;
        }
      }
      update.extendedData = ext;
    } else if (cmdId === 0x21) {
      // ====================================================
      // 0x21 帧：核心遥测（总电压、电流、SOC、SOH、容量、循环次数、多路温度）
      // ====================================================
      if (data.length >= 26) {
        // 电池包总电压：字节 0-3（4 字节小端，单位 mV，÷1000 转换为 V）
        const rawVolt = data[0]! | (data[1]! << 8) | (data[2]! << 16) | (data[3]! << 24);
        update.totalVoltage = parseFloat((rawVolt / 1000).toFixed(2));

        // 实时电流：字节 4-7（4 字节小端带符号，单位 mA，÷1000 转换为 A）
        // 使用 >> 0 将无符号 32 位结果强制转为有符号 32 位（JavaScript 的位运算特性）
        const rawCurrent = data[4]! | (data[5]! << 8) | (data[6]! << 16) | (data[7]! << 24);
        const currentMa = rawCurrent >> 0;
        update.realtimeCurrent = parseFloat((currentMa / 1000).toFixed(2));

        // 充放电状态：以 ±100mA 为死区，过滤轻微漏电流波动
        update.isCharging = currentMa > 100;
        update.isDischarging = currentMa < -100;

        // 剩余电量 SOC：字节 8（单字节，单位 %）
        update.batteryPercent = data[8]!;

        // 电池健康度 SOH：字节 9（单字节，单位 %）
        ext.soh = data[9]!;

        // 剩余容量：字节 10-13（4 字节小端，单位 mAh，÷1000 转换为 Ah）
        const rawRemain = data[10]! | (data[11]! << 8) | (data[12]! << 16) | (data[13]! << 24);
        ext.remainingCapacity = parseFloat((rawRemain / 1000).toFixed(1));

        // 充满额定容量：字节 14-17（4 字节小端，单位 mAh，÷1000 转换为 Ah）
        const rawFull = data[14]! | (data[15]! << 8) | (data[16]! << 16) | (data[17]! << 24);
        ext.fullCapacity = parseFloat((rawFull / 1000).toFixed(1));

        // 循环次数：字节 18-19（2 字节小端，单位：次）
        ext.cycleCount = data[18]! | (data[19]! << 8);

        // 多路温度传感器：字节 20-25（6 路，每路 1 字节，单位 °C，直接为实际温度值）
        // 电芯温度 1-4（字节 20-23），MOS 管温度（字节 24），环境温度（字节 25）
        const t1 = data[20]!;
        const t2 = data[21]!;
        const t3 = data[22]!;
        const t4 = data[23]!;
        ext.mosTemperature = data[24]!;
        ext.envTemperature = data[25]!;
        ext.temperatures = [t1, t2, t3, t4];

        // 取 4 路电芯温度中有效值（非 0 且非 0xFF 的无效填充）的最大值作为代表温度
        const validTemps = [t1, t2, t3, t4].filter((t) => t !== 0 && t !== 0xff);
        update.temperature = validTemps.length > 0 ? Math.max(...validTemps) : t1;
      }
      update.extendedData = ext;
    } else if (cmdId === 0x22) {
      // ====================================================
      // 0x22 帧：所有电芯单体电压（最多 24 节）
      // 每节占 2 字节小端，单位 mV
      // ====================================================
      const cellVoltages: number[] = [];
      const cellsCount = Math.floor(data.length / 2);
      for (let i = 0; i < cellsCount; i++) {
        const v = data[i * 2]! | (data[i * 2 + 1]! << 8);
        cellVoltages.push(v);
      }
      ext.cellVoltages = cellVoltages;
      update.extendedData = ext;
    }

    return update;
  }

  /**
   * 组装控制指令（充电/放电 MOS 开关、加热、清除故障、休眠、启动）
   *
   * 下行控制帧格式：
   *   帧头 0xAA + 命令字 + 数据长度 + [数据字节] + 校验低 + 校验高
   *   校验覆盖：命令字 + 数据长度 + [数据字节]（不含帧头和校验码本身）
   */
  getControlCommand(
    type: "charge" | "discharge" | "heat" | "clear" | "sleep" | "start",
    open: boolean,
  ): string {
    // 根据控制类型确定命令字节和数据字节
    let cmd = 0x00;
    let dataByte: number | null = null;

    switch (type) {
      case "charge":
        cmd = 0x50;
        dataByte = open ? 0x01 : 0x00;
        break;
      case "discharge":
        cmd = 0x51;
        dataByte = open ? 0x01 : 0x00;
        break;
      case "heat":
        cmd = 0x52;
        dataByte = open ? 0x01 : 0x00;
        break;
      case "clear":
        cmd = 0x53;
        break;
      case "sleep":
        cmd = 0x54;
        break;
      case "start":
        cmd = 0x55;
        break;
      default:
        // 不支持的控制类型，返回空字符串，Store 层将跳过下发
        return "";
    }

    const hasData = dataByte !== null;
    const dataLen = hasData ? 1 : 0;

    // 组装帧字节数组：帧头(1) + 命令字(1) + 数据长度(1) + [数据(0~1)] + 校验低(1) + 校验高(1)
    const packet = new Uint8Array(5 + dataLen);
    packet[0] = 0xaa; // 帧头
    packet[1] = cmd; // 命令字
    packet[2] = dataLen; // 数据长度
    if (hasData && dataByte !== null) {
      packet[3] = dataByte; // 数据字节
    }

    // 计算双字节小端累加和校验（覆盖范围：命令字 + 数据长度 + 数据，不含帧头）
    let sum = cmd + dataLen;
    if (hasData && dataByte !== null) {
      sum += dataByte;
    }
    packet[3 + dataLen] = sum & 0xff; // 校验低字节
    packet[4 + dataLen] = (sum >> 8) & 0xff; // 校验高字节

    // 转换为十六进制字符串（去除空格，供 bleManager.writeCommand 直接使用）
    return Array.from(packet)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  }
}
