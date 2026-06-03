<template>
  <layout-provider>
    <view class="wot-flex wot-flex-col wot-h-screen wot-overflow-hidden">
      <!-- 自定义顶部导航栏 -->
      <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
      <wd-navbar 
        :title="$t('bms.logs.title')" 
        left-arrow 
        fixed 
        safe-area-inset-top 
        placeholder 
        @click-left="navigateBack" 
      />

      <!-- 日志分类 Tabs -->
      <!-- Source: uni_modules/wot-ui/components/wd-tabs/wd-tabs.vue -->
      <wd-tabs v-model:value="activeTab" class="wot-flex-1 wot-flex wot-flex-col wot-overflow-hidden">
        <!-- 连接日志 Tab -->
        <!-- Source: uni_modules/wot-ui/components/wd-tab/wd-tab.vue -->
        <wd-tab name="connection" :title="$t('bms.logs.tabConnection')">
          <scroll-view scroll-y class="scroll-container wot-p-2.5 wot-box-border wot-h-full">
            <view v-if="connectionLogs.length === 0" class="wot-py-12">
              <!-- Source: uni_modules/wot-ui/components/wd-empty/wd-empty.vue -->
              <wd-empty :description="$t('bms.logs.empty')" />
            </view>
            <view v-else class="wot-flex wot-flex-col wot-gap-1">
              <view 
                v-for="(log, index) in connectionLogs" 
                :key="index" 
                class="log-card wot-p-3 wot-rounded-xl wot-shadow-sm wot-bg-filled-oppo wot-mb-2.5"
                :class="log.status === 'success' ? 'connection-card-success' : 'connection-card-danger'"
              >
                <view 
                  class="log-title-header"
                  :class="{ 'has-divider': log.params || log.result }"
                >
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-1 wot-min-w-0">
                    <view class="wot-flex wot-items-center wot-justify-center wot-flex-shrink-0">
                      <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                      <wd-icon name="link" size="13px" color="#858585" />
                    </view>
                    <text class="wot-text-[11px] wot-text-text-main wot-truncate wot-flex-1 monospace">{{ log.apiName }}</text>
                  </view>
                  <text class="time-stamp wot-text-[10px] wot-text-text-secondary wot-flex-shrink-0">{{ log.timestamp }}</text>
                </view>
                <view v-if="log.params" class="command-row tx-row wot-p-2 wot-rounded-lg wot-mt-1.5">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot tx-dot" />
                    <text class="wot-text-[9px] wot-font-bold wot-text-primary">INPUT PARAMETERS</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-text-main wot-break-all">{{ log.params }}</text>
                </view>
                <view v-if="log.result" class="command-row wot-p-2 wot-rounded-lg wot-mt-1.5" :class="log.status === 'success' ? 'rx-row' : 'err-row'">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot" :class="log.status === 'success' ? 'rx-dot' : 'err-dot'" />
                    <text class="wot-text-[9px] wot-font-bold" :class="log.status === 'success' ? 'wot-text-success' : 'wot-text-danger'">OUTPUT RESULT</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-text-main wot-break-all">{{ log.result }}</text>
                </view>
              </view>
            </view>
            <view class="bottom-placeholder" />
          </scroll-view>
        </wd-tab>

        <!-- 指令日志 Tab -->
        <!-- Source: uni_modules/wot-ui/components/wd-tab/wd-tab.vue -->
        <wd-tab name="command" :title="$t('bms.logs.tabCommand')">
          <scroll-view scroll-y class="scroll-container wot-p-2.5 wot-box-border wot-h-full">
            <view v-if="commandGroups.length === 0" class="wot-py-12">
              <!-- Source: uni_modules/wot-ui/components/wd-empty/wd-empty.vue -->
              <wd-empty :description="$t('bms.logs.empty')" />
            </view>
            <view v-else class="wot-flex wot-flex-col wot-gap-1">
              <view 
                v-for="group in commandGroups" 
                :key="group.id" 
                class="log-card wot-p-3 wot-rounded-xl wot-shadow-sm wot-bg-filled-oppo wot-mb-2.5 command-group-card"
              >
                <!-- 组标题：时间戳 -->
                <view class="log-title-header has-divider">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-1 wot-min-w-0">
                    <view class="wot-flex wot-items-center wot-justify-center wot-flex-shrink-0">
                      <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                      <wd-icon name="swap" size="13px" color="#858585" />
                    </view>
                    <text class="wot-text-[11px] wot-font-bold wot-text-text-secondary wot-truncate">{{ $t('bms.logs.cmdInteractionFrame') }}</text>
                  </view>
                  <text class="time-stamp wot-text-[10px] wot-text-text-secondary wot-flex-shrink-0">{{ group.tx ? group.tx.timestamp : group.rx?.timestamp }}</text>
                </view>
                
                <!-- 发送指令 TX -->
                <view v-if="group.tx" class="command-row tx-row wot-p-2 wot-rounded-lg wot-mb-1.5">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot tx-dot" />
                    <text class="wot-text-[9px] wot-font-bold wot-text-primary">TX ({{ $t('bms.logs.directionTx') }})</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-text-main wot-break-all">{{ group.tx.hexData }}</text>
                </view>
                
                <!-- 接收指令 RX -->
                <view v-if="group.rx" class="command-row rx-row wot-p-2 wot-rounded-lg">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot rx-dot" />
                    <text class="wot-text-[9px] wot-font-bold wot-text-success">RX ({{ $t('bms.logs.directionRx') }})</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-text-main wot-break-all">{{ group.rx.hexData }}</text>
                </view>

                <!-- 主动推送小标识 -->
                <view v-if="!group.tx && group.rx" class="wot-flex wot-items-center wot-gap-1.5 wot-mt-2 wot-text-[9px] wot-text-text-secondary wot-pl-1">
                  <view class="wot-w-1.2 wot-h-1.2 wot-bg-orange-500 wot-rounded-full animate-pulse" />
                  <text>{{ $t('bms.logs.unsolicitedTelemetry') }}</text>
                </view>
              </view>
            </view>
            <view class="bottom-placeholder" />
          </scroll-view>
        </wd-tab>

        <!-- 接口日志 Tab -->
        <!-- Source: uni_modules/wot-ui/components/wd-tab/wd-tab.vue -->
        <wd-tab name="api" :title="$t('bms.logs.tabApi')">
          <scroll-view scroll-y class="scroll-container wot-p-2.5 wot-box-border wot-h-full">
            <view v-if="apiLogs.length === 0" class="wot-py-12">
              <!-- Source: uni_modules/wd-empty/wd-empty.vue -->
              <wd-empty :description="$t('bms.logs.empty')" />
            </view>
            <view v-else class="wot-flex wot-flex-col wot-gap-1">
              <view 
                v-for="(log, index) in apiLogs" 
                :key="index" 
                class="log-card wot-p-3 wot-rounded-xl wot-shadow-sm wot-bg-filled-oppo wot-mb-2.5"
                :class="isSuccessStatus(log.status) ? 'api-card-success' : 'api-card-danger'"
              >
                <view 
                  class="log-title-header"
                  :class="{ 'has-divider': log.params || log.response || log.error }"
                >
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-1 wot-min-w-0">
                    <view class="wot-flex wot-items-center wot-justify-center wot-flex-shrink-0">
                      <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                      <wd-icon name="cloud" size="13px" color="#858585" />
                    </view>
                    <text class="wot-text-[10px] wot-font-bold wot-px-1.5 wot-py-0.5 wot-rounded wot-bg-purple-50 dark:wot-bg-purple-950/30 wot-text-purple-600 dark:wot-text-purple-400">{{ log.method }}</text>
                    <text class="wot-text-[11px] wot-text-text-main wot-truncate wot-flex-1 monospace">{{ cleanUrl(log.url) }}</text>
                  </view>
                  <text class="time-stamp wot-text-[10px] wot-text-text-secondary wot-flex-shrink-0">{{ log.timestamp }}</text>
                </view>
                <view v-if="log.params" class="command-row tx-row wot-p-2 wot-rounded-lg wot-mt-1.5">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot tx-dot" />
                    <text class="wot-text-[9px] wot-font-bold wot-text-primary">REQUEST PARAMS</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-text-main wot-break-all">{{ log.params }}</text>
                </view>
                <view v-if="log.response" class="command-row rx-row wot-p-2 wot-rounded-lg wot-mt-1.5">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot rx-dot" />
                    <text class="wot-text-[9px] wot-font-bold wot-text-success">RESPONSE DATA</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-text-main wot-break-all">{{ log.response }}</text>
                </view>
                <view v-if="log.error" class="command-row err-row wot-p-2 wot-rounded-lg wot-mt-1.5">
                  <view class="wot-flex wot-items-center wot-gap-1.5 wot-mb-1">
                    <view class="indicator-dot err-dot" />
                    <text class="wot-text-[9px] wot-font-bold wot-text-danger">EXCEPTIONAL ERROR</text>
                  </view>
                  <text class="monospace wot-text-xs wot-font-bold wot-text-danger wot-break-all">{{ log.error }}</text>
                </view>
              </view>
            </view>
            <view class="bottom-placeholder" />
          </scroll-view>
        </wd-tab>
      </wd-tabs>

      <!-- 底部控制按钮栏 -->
      <view class="control-bar wot-p-3 wot-bg-filled-oppo wot-flex wot-gap-3 wot-shadow-md">
        <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
        <wd-button type="danger" plain block class="wot-flex-1" @click="handleClearLogs">
          {{ $t('bms.logs.clearBtn') }}
        </wd-button>
        <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
        <wd-button type="primary" block class="wot-flex-1" @click="handleCopyLogs">
          {{ $t('bms.logs.copyBtn') }}
        </wd-button>
      </view>
    </view>
    
    <wd-toast />
    <wd-dialog />
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useLogStore } from "@/stores/log-store";
import { storeToRefs } from "pinia";

// 获取 i18n 翻译实例、消息提示及对话框 Hooks
const { t } = useI18n();
const toast = useToast();
const dialog = useDialog();
const logStore = useLogStore();

// 解构获取响应式日志列表
const { connectionLogs, commandLogs, apiLogs } = storeToRefs(logStore);

// 当前高亮选中的 Tab 页签
const activeTab = ref("connection");

// 将一维的指令日志 commandLogs 包装重组为“发送-接收”配对组
const commandGroups = computed(() => {
  const groups: Array<{ tx?: typeof commandLogs.value[0]; rx?: typeof commandLogs.value[0]; id: string }> = [];
  const logs = commandLogs.value;
  let i = 0;
  
  while (i < logs.length) {
    const current = logs[i];
    
    // 因为是 unshift 写入，时间越新越靠前。
    // 如果当前是接收 (RX)，且下一个是发送 (TX)，则它们是时间接近的一对交互（TX 发送在前，RX 接收在后，在反序列表中 RX 处于 TX 前面）
    if (current.direction === "RX" && i + 1 < logs.length && logs[i + 1].direction === "TX") {
      groups.push({
        rx: current,
        tx: logs[i + 1],
        id: `${current.timestamp}-${logs[i + 1].timestamp}-${i}`
      });
      i += 2;
    } else {
      // 孤立的一条日志，无对应配对
      if (current.direction === "TX") {
        groups.push({
          tx: current,
          id: `tx-${current.timestamp}-${i}`
        });
      } else {
        groups.push({
          rx: current,
          id: `rx-${current.timestamp}-${i}`
        });
      }
      i += 1;
    }
  }
  return groups;
});

/**
 * 返回上一页
 */
const navigateBack = () => {
  uni.navigateBack();
};

/**
 * 格式化精简 URL (只显示路径，不显示域名，方便小屏终端展示)
 */
const cleanUrl = (url: string): string => {
  if (!url) return "";
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const match = url.match(/https?:\/\/[^\/]+(\/.*)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    console.error("解析 URL 异常:", e);
  }
  return url;
};

/**
 * 判断是否为成功的 HTTP 响应状态码
 */
const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

/**
 * 清空所有调试日志的交互回调，加入安全二次确认
 */
const handleClearLogs = () => {
  dialog.confirm({
    title: t("bms.common.prompt"),
    msg: t("bms.logs.clearConfirmMsg"),
  }).then(() => {
    logStore.clearLogs();
    toast.success(t("bms.logs.clearSuccess"));
  }).catch(() => {
    // 用户取消清空
  });
};

/**
 * 导出并复制完整系统日志到剪切板的交互回调
 */
const handleCopyLogs = () => {
  if (connectionLogs.value.length === 0 && commandLogs.value.length === 0 && apiLogs.value.length === 0) {
    toast.show({ msg: t("bms.logs.empty") });
    return;
  }

  let logText = "";
  
  logText += `=== BMS System Logs Export ===\n`;
  logText += `Export Time: ${new Date().toISOString()}\n\n`;

  logText += "=== [1] Connection Logs ===\n";
  connectionLogs.value.forEach((log) => {
    logText += `[${log.timestamp}] [${log.status.toUpperCase()}] ${log.apiName}\n`;
    if (log.params) logText += `  Params: ${log.params}\n`;
    if (log.result) logText += `  Result: ${log.result}\n`;
  });
  logText += "\n";

  logText += "=== [2] Command Logs ===\n";
  commandLogs.value.forEach((log) => {
    logText += `[${log.timestamp}] [${log.direction}] ${log.hexData}\n`;
  });
  logText += "\n";

  logText += "=== [3] API Logs ===\n";
  apiLogs.value.forEach((log) => {
    logText += `[${log.timestamp}] [STATUS ${log.status}] ${log.method} ${log.url}\n`;
    if (log.params) logText += `  Params: ${log.params}\n`;
    if (log.response) logText += `  Response: ${log.response}\n`;
    if (log.error) logText += `  Error: ${log.error}\n`;
  });

  uni.setClipboardData({
    data: logText,
    success: () => {
      toast.success(t("bms.logs.copied"));
    },
    fail: () => {
      toast.error(t("bms.auth.clipboardPermissionMsg"));
    }
  });
};
</script>

<style scoped lang="scss">
/* 动态适配各系统安全高度的日志内容滚动容器 */
.scroll-container {
  height: calc(100vh - var(--status-bar-height) - 88px - 72px - env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.bottom-placeholder {
  height: 20px;
}

/* 日志卡片的基础与渐变微雕 */
.log-card {
  transition: all 0.2s ease-in-out;
  border: 1px solid rgba(0, 82, 217, 0.05);
  box-shadow: 0 4px 12px -2px rgba(0, 82, 217, 0.03);
  
  &:active {
    transform: scale(0.995);
  }
}

.dark .log-card {
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.2);
}

/* 侧边高雅状态条 */
.connection-card-success {
  border-left: 4px solid var(--wot-color-theme, #0052d9);
}

.connection-card-danger {
  border-left: 4px solid var(--wot-color-danger, #fa3534);
}

.api-card-success {
  border-left: 4px solid var(--wot-color-theme, #0052d9);
}

.api-card-danger {
  border-left: 4px solid var(--wot-color-danger, #fa3534);
}

.command-group-card {
  border-left: 4px solid var(--wot-color-theme, #0052d9);
}

/* 指令收发内部卡片微渐变 */
.command-row {
  box-sizing: border-box;
}

.tx-row {
  background: rgba(0, 82, 217, 0.03);
  border: 1px solid rgba(0, 82, 217, 0.06);
}

.dark .tx-row {
  background: rgba(0, 82, 217, 0.08);
  border: 1px solid rgba(0, 82, 217, 0.15);
}

.rx-row {
  background: rgba(43, 164, 113, 0.03);
  border: 1px solid rgba(43, 164, 113, 0.06);
}

.dark .rx-row {
  background: rgba(43, 164, 113, 0.08);
  border: 1px solid rgba(43, 164, 113, 0.15);
}

.err-row {
  background: rgba(250, 53, 52, 0.03);
  border: 1px solid rgba(250, 53, 52, 0.06);
}

.dark .err-row {
  background: rgba(250, 53, 52, 0.08);
  border: 1px solid rgba(250, 53, 52, 0.15);
}

/* 小圆点发光状态指示 */
.indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.tx-dot {
  background-color: var(--wot-color-theme, #0052d9);
  box-shadow: 0 0 6px rgba(0, 82, 217, 0.6);
}

.rx-dot {
  background-color: var(--wot-color-success, #2ba471);
  box-shadow: 0 0 6px rgba(43, 164, 113, 0.6);
}

.err-dot {
  background-color: var(--wot-color-danger, #fa3534);
  box-shadow: 0 0 6px rgba(250, 53, 52, 0.6);
}

/* 统一等宽代码排版 */
.monospace {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, monospace;
}

.time-stamp {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, monospace;
}

.code-title {
  letter-spacing: 0.5px;
}

.control-bar {
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

/* 日志卡片顶部标题栏对齐微调 */
.log-title-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 8px 0;
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
  
  &.has-divider {
    border-bottom: 1px dashed rgba(241, 245, 249, 1);
  }
  
  wd-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  
  :deep(.wd-icon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    vertical-align: middle;
  }

  text, .time-stamp {
    line-height: 1.2;
    display: inline-block;
    vertical-align: middle;
  }
}

.dark .log-title-header.has-divider {
  border-bottom: 1px dashed rgba(63, 63, 70, 0.8);
}
</style>
