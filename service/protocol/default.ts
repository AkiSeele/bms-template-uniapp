import { BmsProtocolParser, BmsTelemetryUpdate, ProtocolSpec } from "@/types/protocol";
import { verifyChecksum, uint8ArrayToHexString } from "@/utils/bms-helper";

// ============================================================
// 协议规格声明区（Protocol Specification）
//
// 本区域是协议的"说明书"，集中描述该协议的全部物理帧格式规范。
// 开发者需要调整协议参数时，只需修改此处，无需改动下方的解析逻辑。
//
// 协议来源文档：通用默认 BMS 蓝牙通信协议 V1.0
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
    start: 1, // 从命令字节（bytes[1]）开始纳入校验，跳过帧头 0xAA
    endOffset: 2, // 最后 2 字节为双字节校验码，不纳入校验计算
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
    READ_STATUS: "20", // 查询系统状态
    READ_INFO: "21", // 查询核心遥测
    READ_CELLS: "22", // 查询电芯单体电压
    CTRL_CHARGE: "50", // 充电控制
    CTRL_DISCHARGE: "51", // 放电控制
    CTRL_HEAT: "52", // 加热控制
    CTRL_CLEAR: "53", // 清除故障
    CTRL_SLEEP: "54", // 强制休眠
    CTRL_START: "55", // 强制启动
    CTRL_CLEAR_PARAM: "F3", // 清除参数
    CTRL_TEST_MODE: "F4", // 测试模式
    READ_VERSION: "F5", // 读取版本号
  },

  pollingSequence: ["READ_STATUS", "READ_INFO", "READ_CELLS"], // 需要按顺序轮询的指令键名序列

  /** 协议版本 */
  version: "1.0.0",
};
// ============================================================
// 协议规格声明区 结束
// ============================================================

/**
 * 默认协议 —— BMS 蓝牙通信协议策略解析器
 *
 * 协议核心特征（详见上方 PROTOCOL_SPEC）：
 *   - 帧头：0xAA（单字节）
 *   - 字节序：小端（低位先传）
 *   - 校验：16 位小端双字节累加和
 *   - 帧结构：动态长度（数据段长度由第 3 字节 LEN 决定）
 *
 * 该类为无状态纯解析策略，所有解析方法均为纯函数，可多实例共用。
 */
export class DefaultParser implements BmsProtocolParser {
  /** 协议类型标识符，视图层据此挂载对应的控制面板组件 */
  readonly protocolType: string;

  /** 协议显示名称（用于日志和界面展示） */
  readonly protocolName: string;

  /** 暴露协议规格声明对象，供 Store 层和调试工具读取 */
  readonly spec: ProtocolSpec = PROTOCOL_SPEC;

  /** 轮询指令的循环步数周期长度（从规格中的轮询序列自适应获取） */
  readonly pollingCycleLength = PROTOCOL_SPEC.pollingSequence?.length ?? 0;

  constructor(protocolType: string) {
    this.protocolType = protocolType;
    this.protocolName =
      protocolType === "default"
        ? "Default (BMS BLE)"
        : protocolType.charAt(0).toUpperCase() + protocolType.slice(1) + " (BMS BLE)";
  }

  // 动态组装下行命令帧
  private buildFrame(cmdHex: string, dataBytes: number[] = []): string {
    const cmd = parseInt(cmdHex, 16);
    const dataLen = dataBytes.length;

    const packet = new Uint8Array(5 + dataLen);

    packet[0] = PROTOCOL_SPEC.frameHeader[0] ?? 0xaa;
    packet[1] = cmd;
    packet[2] = dataLen;

    for (let i = 0; i < dataLen; i++) {
      packet[3 + i] = dataBytes[i]!;
    }

    let sum = cmd + dataLen;
    for (let i = 0; i < dataLen; i++) {
      sum += dataBytes[i]!;
    }

    packet[3 + dataLen] = sum & 0xff;
    packet[4 + dataLen] = (sum >> 8) & 0xff;

    return Array.from(packet)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  }

  // 获取本次轮询需下发的查询指令数组
  // 根据配置的轮询序列自动进行循环分发
  getPollCommands(step: number): string[] {
    const sequence = PROTOCOL_SPEC.pollingSequence || [];
    if (sequence.length === 0) {
      return [];
    }
    const index = step % sequence.length;
    const key = sequence[index]!;
    const cmdHex = PROTOCOL_SPEC.commandSet[key]!;
    return [this.buildFrame(cmdHex)];
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
      console.warn(
        `[默认协议] 校验失败，丢弃帧 (CMD=0x${cmdId.toString(16).toUpperCase()}):`,
        uint8ArrayToHexString(bytes),
      );
      return null;
    }

    // 4. 提取纯数据段（跳过头部 3 字节：帧头 + 命令字 + 长度）
    const data = bytes.slice(3, 3 + dataLen);
    const update: BmsTelemetryUpdate = {};
    const ext: Record<string, unknown> = {};
    const rawHexMap: Record<string, string> = {};

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

        rawHexMap["runTimeDays"] = uint8ArrayToHexString(data.slice(0, 2));
        rawHexMap["runTimeHours"] = uint8ArrayToHexString(data.slice(2, 3));
        rawHexMap["runTimeMinutes"] = uint8ArrayToHexString(data.slice(3, 4));

        // 运行状态：字节 4-7（4 字节状态位字段）
        const state0 = data[4]!;
        const state1 = data[5]!;
        const state2 = data[6]!;
        const state3 = data[7]!;

        // 充电开关状态 (第零个状态字节的第七位)
        ext.chargeFetState = (state0 & 0x80) !== 0;
        // 低温加热开关状态 (第一个状态字节的第七位)
        ext.heatingState = (state1 & 0x80) !== 0;
        // 放电开关状态 (第二个状态字节的第七位)
        ext.dischargeFetState = (state2 & 0x80) !== 0;
        // 预放电开关状态 (第三个状态字节的第七位)
        ext.preChargeFetState = (state3 & 0x80) !== 0;

        rawHexMap["chargeFetState"] = uint8ArrayToHexString(data.slice(4, 5));
        rawHexMap["heatingState"] = uint8ArrayToHexString(data.slice(5, 6));
        rawHexMap["dischargeFetState"] = uint8ArrayToHexString(data.slice(6, 7));
        rawHexMap["preChargeFetState"] = uint8ArrayToHexString(data.slice(7, 8));

        // 定义报警映射表
        const alarmKeys: Record<number, string> = {
          0: "bms.protect.chargeOvercurrent",
          1: "bms.protect.chargeOvertemp",
          2: "bms.protect.chargeUndertemp",
          3: "bms.protect.cellOvercharge",
          4: "bms.protect.packOvercharge",
          5: "bms.protect.afeError",
          6: "bms.protect.chargeCutoff",
          7: "bms.protect.chargeFet",
          8: "bms.protect.chargeOvercurrentWarning",
          9: "bms.protect.chargeOvertempWarning",
          10: "bms.protect.chargeUndertempWarning",
          11: "bms.protect.cellOverchargeWarning",
          12: "bms.protect.packOverchargeWarning",
          13: "bms.protect.voltDiffWarning",
          14: "bms.protect.voltDiffTooLarge",
          15: "bms.protect.heatingState",
          16: "bms.protect.dischargeOvercurrent",
          17: "bms.protect.dischargeOvertemp",
          18: "bms.protect.dischargeUndertemp",
          19: "bms.protect.cellOverdischarge",
          20: "bms.protect.shortCircuit",
          21: "bms.protect.packOverdischarge",
          22: "bms.protect.dischargeCutoff",
          23: "bms.protect.dischargeFet",
          24: "bms.protect.dischargeOvercurrentWarning",
          25: "bms.protect.dischargeOvertempWarning",
          26: "bms.protect.dischargeUndertempWarning",
          27: "bms.protect.cellOverdischargeWarning",
          28: "bms.protect.packOverdischargeWarning",
          29: "bms.protect.mosOvertempWarning",
          30: "bms.protect.mosOvertemp",
          31: "bms.protect.preChargeFet",
        };

        const statusVal = state0 | (state1 << 8) | (state2 << 16) | (state3 << 24);
        const activeAlarms: string[] = [];
        for (const [bitStr, key] of Object.entries(alarmKeys)) {
          const bit = Number(bitStr);
          if ((statusVal & (1 << bit)) !== 0) {
            activeAlarms.push(key);
          }
        }
        ext.activeAlarms = activeAlarms;
        rawHexMap["activeAlarms"] = uint8ArrayToHexString(data.slice(4, 8));

        // 电芯平衡状态：字节 8-10（3 字节共 24 位，每位对应一节电芯）
        const balanceStates: boolean[] = [];
        for (let b = 8; b <= 10; b++) {
          for (let bit = 0; bit < 8; bit++) {
            balanceStates.push(((data[b]! >> bit) & 0x01) === 1);
          }
        }
        ext.balanceStates = balanceStates;
        rawHexMap["balanceStates"] = uint8ArrayToHexString(data.slice(8, 11));

        // 断线报警状态：字节 11-13（仅在数据段长度 ≥ 14 时存在）
        if (data.length >= 14) {
          const wireBrokenStates: boolean[] = [];
          for (let b = 11; b <= 13; b++) {
            for (let bit = 0; bit < 8; bit++) {
              wireBrokenStates.push(((data[b]! >> bit) & 0x01) === 1);
            }
          }
          ext.wireBrokenStates = wireBrokenStates;
          rawHexMap["wireBrokenStates"] = uint8ArrayToHexString(data.slice(11, 14));
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
        rawHexMap["totalVoltage"] = uint8ArrayToHexString(data.slice(0, 4));

        // 实时电流：字节 4-7（4 字节小端带符号，单位 mA，÷1000 转换为 A）
        // 使用 >> 0 将无符号 32 位结果强制转为有符号 32 位（JavaScript 的位运算特性）
        const rawCurrent = data[4]! | (data[5]! << 8) | (data[6]! << 16) | (data[7]! << 24);
        const currentMa = rawCurrent >> 0;
        update.realtimeCurrent = parseFloat((currentMa / 1000).toFixed(2));
        rawHexMap["realtimeCurrent"] = uint8ArrayToHexString(data.slice(4, 8));

        // 充放电状态：以 ±100mA 为死区，过滤轻微漏电流波动
        update.isCharging = currentMa > 100;
        update.isDischarging = currentMa < -100;
        rawHexMap["isCharging"] = uint8ArrayToHexString(data.slice(4, 8));
        rawHexMap["isDischarging"] = uint8ArrayToHexString(data.slice(4, 8));

        // 剩余电量 SOC：字节 8（单字节，单位 %）
        update.batteryPercent = data[8]!;
        rawHexMap["batteryPercent"] = uint8ArrayToHexString(data.slice(8, 9));

        // 电池健康度 SOH：字节 9（单字节，单位 %）
        ext.soh = data[9]!;
        rawHexMap["soh"] = uint8ArrayToHexString(data.slice(9, 10));

        // 剩余容量：字节 10-13（4 字节小端，单位 mAh，÷1000 转换为 Ah）
        const rawRemain = data[10]! | (data[11]! << 8) | (data[12]! << 16) | (data[13]! << 24);
        ext.remainingCapacity = parseFloat((rawRemain / 1000).toFixed(1));
        rawHexMap["remainingCapacity"] = uint8ArrayToHexString(data.slice(10, 14));

        // 充满额定容量：字节 14-17（4 字节小端，单位 mAh，÷1000 转换为 Ah）
        const rawFull = data[14]! | (data[15]! << 8) | (data[16]! << 16) | (data[17]! << 24);
        ext.fullCapacity = parseFloat((rawFull / 1000).toFixed(1));
        rawHexMap["fullCapacity"] = uint8ArrayToHexString(data.slice(14, 18));

        // 循环次数：字节 18-19（2 字节小端，单位：次）
        ext.cycleCount = data[18]! | (data[19]! << 8);
        rawHexMap["cycleCount"] = uint8ArrayToHexString(data.slice(18, 20));

        // 多路温度传感器：字节 20-25（6 路，每路 1 字节，单位 °C）
        // 电芯温度 1-4（字节 20-23），MOS 管温度（字节 24），环境温度（字节 25）
        // 采用位移操作 (raw << 24) >> 24 将无符号 8 位数转换为有符号整型数，以完美兼容冬季低温负数场景
        const t1 = (data[20]! << 24) >> 24;
        const t2 = (data[21]! << 24) >> 24;
        const t3 = (data[22]! << 24) >> 24;
        const t4 = (data[23]! << 24) >> 24;
        const mos = (data[24]! << 24) >> 24;
        const env = (data[25]! << 24) >> 24;

        ext.mosTemperature = mos;
        ext.envTemperature = env;
        ext.temperatures = [t1, t2, t3, t4];

        rawHexMap["mosTemperature"] = uint8ArrayToHexString(data.slice(24, 25));
        rawHexMap["envTemperature"] = uint8ArrayToHexString(data.slice(25, 26));
        rawHexMap["temperatures"] = uint8ArrayToHexString(data.slice(20, 24));

        // 取 4 路电芯温度中有效值（非 0 且非 -1 的无效填充，-1 对应原无符号的 0xFF）的最大值作为代表温度
        const validTemps = [t1, t2, t3, t4].filter((t) => t !== 0 && t !== -1);
        update.temperature = validTemps.length > 0 ? Math.max(...validTemps) : t1;

        // 计算代表温度所对应物理字节的 16 进制
        let tempByteIndex = 20;
        if (validTemps.length > 0) {
          const maxVal = Math.max(...validTemps);
          if (t1 === maxVal) tempByteIndex = 20;
          else if (t2 === maxVal) tempByteIndex = 21;
          else if (t3 === maxVal) tempByteIndex = 22;
          else if (t4 === maxVal) tempByteIndex = 23;
        }
        rawHexMap["temperature"] = uint8ArrayToHexString(data.slice(tempByteIndex, tempByteIndex + 1));
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
      rawHexMap["cellVoltages"] = uint8ArrayToHexString(data);
      update.extendedData = ext;
    } else if (cmdId === 0xF5) {
      // ====================================================
      // 0xF5 帧：读取编译版本号响应
      // 数据段长度通常为 12 字节 (ASCII 字符)
      // ====================================================
      let verStr = "";
      for (let i = 0; i < data.length; i++) {
        verStr += String.fromCharCode(data[i]!);
      }
      ext.softwareVersion = verStr.trim();
      update.controlResponse = {
        cmdId,
        success: true,
        data: verStr.trim(),
      };
      rawHexMap["softwareVersion"] = uint8ArrayToHexString(data);
      update.extendedData = ext;
    } else if (
      (cmdId >= 0x50 && cmdId <= 0x55) ||
      cmdId === 0xF3 ||
      cmdId === 0xF4
    ) {
      // ====================================================
      // 0x50 - 0x55, 0xF3, 0xF4 帧：控制指令响应帧
      // 数据段包含操作结果，通常为单字节，数值 1 表示成功，数值 0 表示失败
      // 若协议无特定数据段，则默认只要收到合法响应帧即表示成功
      // ====================================================
      const isSuccess = data.length > 0 ? data[0] === 0x01 : true;
      update.controlResponse = {
        cmdId,
        success: isSuccess,
      };
      rawHexMap["controlResponse"] = uint8ArrayToHexString(data);
    }

    update.fieldRawHex = rawHexMap;
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
    type:
      | "charge"
      | "discharge"
      | "heat"
      | "clear"
      | "sleep"
      | "start"
      | "clearParam"
      | "test"
      | "readVersion",
    open: boolean,
  ): string {
    let cmdHex = "";
    let dataBytes: number[] = [];

    switch (type) {
      case "charge":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_CHARGE"]!;
        dataBytes = [open ? 0x01 : 0x00];
        break;
      case "discharge":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_DISCHARGE"]!;
        dataBytes = [open ? 0x01 : 0x00];
        break;
      case "heat":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_HEAT"]!;
        dataBytes = [open ? 0x01 : 0x00];
        break;
      case "clear":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_CLEAR"]!;
        break;
      case "sleep":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_SLEEP"]!;
        break;
      case "start":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_START"]!;
        break;
      case "clearParam":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_CLEAR_PARAM"]!;
        break;
      case "test":
        cmdHex = PROTOCOL_SPEC.commandSet["CTRL_TEST_MODE"]!;
        dataBytes = [open ? 0x01 : 0x00];
        break;
      case "readVersion":
        cmdHex = PROTOCOL_SPEC.commandSet["READ_VERSION"]!;
        break;
      default:
        return "";
    }

    if (!cmdHex) {
      return "";
    }
    return this.buildFrame(cmdHex, dataBytes);
  }
}
