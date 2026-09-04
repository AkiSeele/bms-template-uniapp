<template>
  <layout-provider>
    <view class="wot-flex wot-flex-col wot-h-screen wot-overflow-hidden wot-bg-[#f5f6f8] dark:wot-bg-[#121212]">
      <!-- 自定义顶部导航栏 -->
      <wd-navbar
        :title="$t('bms.logs.title')"
        left-arrow
        fixed
        safe-area-inset-top
        placeholder
        @click-left="navigateBack"
      />

      <!-- 官方默认标准 Tabs（开启 swipeable 手势滑动切换与 animated 丝滑动画） -->
      <wd-tabs
        v-model="activeTab"
        swipeable
        animated
        slidable="always"
        class="wot-flex-1 wot-flex wot-flex-col wot-overflow-hidden"
      >
        <!-- 1. 指令日志 Tab (BMS 专属蓝牙报文流，置于首位) -->
        <wd-tab
          name="command"
          :title="$t('bms.logs.tabCommand')"
        >
          <view class="tab-pane-wrapper wot-flex wot-flex-col wot-h-full wot-overflow-hidden">
            <!-- 快捷搜索与筛选工具栏 -->
            <view class="search-toolbar wot-flex-shrink-0 wot-px-3 wot-pt-2 wot-pb-2 wot-bg-filled-oppo wot-border-b wot-border-slate-100 dark:wot-border-zinc-800">
              <view class="wot-flex wot-items-center wot-gap-2 wot-mb-2">
                <view class="search-input-box wot-flex-1 wot-flex wot-items-center wot-bg-[#f5f6f8] dark:wot-bg-[#1e2029] wot-rounded-lg wot-px-3 wot-h-9 wot-box-border">
                  <wd-icon css-icon="i-lucide-search" size="15px" color="#858585" class="wot-mr-2 wot-flex-shrink-0" />
                  <input
                    v-model="searchKeyword"
                    type="text"
                    :placeholder="$t('bms.logs.searchPlaceholder')"
                    class="search-native-input wot-flex-1 wot-text-xs wot-text-text-main wot-h-full"
                  />
                  <view
                    v-if="searchKeyword"
                    class="wot-flex wot-items-center wot-justify-center wot-p-1 wot-cursor-pointer"
                    @click.stop="searchKeyword = ''"
                  >
                    <wd-icon css-icon="i-ri-close-circle-fill" size="14px" color="#858585" />
                  </view>
                </view>

                <view
                  class="sort-toggle-btn wot-flex wot-items-center wot-justify-center wot-h-9 wot-w-9 wot-rounded-lg wot-bg-[#f5f6f8] dark:wot-bg-[#1e2029] wot-box-border wot-flex-shrink-0 wot-cursor-pointer"
                  @click="toggleSortOrder"
                >
                  <wd-icon
                    :css-icon="sortOrder === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
                    size="17px"
                    :color="sortOrder === 'desc' ? 'var(--wot-color-theme, #0052d9)' : '#858585'"
                  />
                </view>
              </view>

              <view class="filter-wrapper">
                <wd-segmented v-model:value="currentFilter" :options="filterOptions" size="small" />
              </view>
            </view>

            <!-- 列表滚动区容器：100% 充满剩余空间 -->
            <view class="scroll-wrapper wot-flex-1 wot-overflow-hidden wot-min-h-0">
              <scroll-view scroll-y style="height: 100%; width: 100%;" class="scroll-container wot-p-2.5 wot-box-border">
                <view v-if="filteredCommandGroups.length === 0" class="wot-py-12">
                  <wd-empty icon="empty" :tip="$t('bms.logs.empty')" />
                </view>
                <view v-else class="wot-flex wot-flex-col wot-gap-2">
                  <view
                    v-for="group in filteredCommandGroups"
                    :key="group.id"
                    class="log-item-card wot-p-3 wot-rounded-lg wot-bg-filled-oppo wot-shadow-sm"
                  >
                    <!-- 卡片头部：交互耗时 + 时间戳 -->
                    <view class="wot-flex wot-items-center wot-justify-between wot-mb-2">
                      <view class="wot-flex wot-items-center wot-gap-2">
                        <text class="wot-text-[11px] wot-font-bold wot-text-text-secondary">{{ $t('bms.logs.cmdInteractionFrame') }}</text>
                        <view v-if="group.latency !== undefined" class="latency-pill">
                          ⚡ {{ group.latency }}ms
                        </view>
                      </view>
                      <text class="time-text">{{ group.tx ? group.tx.timestamp : group.rx?.timestamp }}</text>
                    </view>

                    <!-- 发送指令 TX -->
                    <view v-if="group.tx" class="stream-row stream-tx wot-p-2 wot-rounded-md wot-mb-1.5" @click.stop="copyText(group.tx.hexData)">
                      <view class="wot-flex wot-items-center wot-justify-between wot-mb-0.5">
                        <text class="stream-tag tag-tx">TX {{ $t('bms.logs.directionTx') }}</text>
                        <view class="copy-btn">
                          <wd-icon css-icon="i-lucide-copy" size="10px" color="#858585" />
                        </view>
                      </view>
                      <text class="hex-text monospace">{{ formatHex(group.tx.hexData) }}</text>
                    </view>

                    <!-- 接收指令 RX -->
                    <view v-if="group.rx" class="stream-row stream-rx wot-p-2 wot-rounded-md" @click.stop="copyText(group.rx.hexData)">
                      <view class="wot-flex wot-items-center wot-justify-between wot-mb-0.5">
                        <text class="stream-tag tag-rx">RX {{ $t('bms.logs.directionRx') }}</text>
                        <view class="copy-btn">
                          <wd-icon css-icon="i-lucide-copy" size="10px" color="#858585" />
                        </view>
                      </view>
                      <text class="hex-text monospace">{{ formatHex(group.rx.hexData) }}</text>
                    </view>
                  </view>
                </view>
                <view class="bottom-placeholder" />
              </scroll-view>
            </view>
          </view>
        </wd-tab>

        <!-- 2. API 回调日志 Tab -->
        <wd-tab
          name="apiCallback"
          :title="$t('bms.logs.tabApiCallback')"
        >
          <view class="tab-pane-wrapper wot-flex wot-flex-col wot-h-full wot-overflow-hidden">
            <!-- 快捷搜索与筛选工具栏 -->
            <view class="search-toolbar wot-flex-shrink-0 wot-px-3 wot-pt-2 wot-pb-2 wot-bg-filled-oppo wot-border-b wot-border-slate-100 dark:wot-border-zinc-800">
              <view class="wot-flex wot-items-center wot-gap-2 wot-mb-2">
                <view class="search-input-box wot-flex-1 wot-flex wot-items-center wot-bg-[#f5f6f8] dark:wot-bg-[#1e2029] wot-rounded-lg wot-px-3 wot-h-9 wot-box-border">
                  <wd-icon css-icon="i-lucide-search" size="15px" color="#858585" class="wot-mr-2 wot-flex-shrink-0" />
                  <input
                    v-model="searchKeyword"
                    type="text"
                    :placeholder="$t('bms.logs.searchPlaceholder')"
                    class="search-native-input wot-flex-1 wot-text-xs wot-text-text-main wot-h-full"
                  />
                  <view
                    v-if="searchKeyword"
                    class="wot-flex wot-items-center wot-justify-center wot-p-1 wot-cursor-pointer"
                    @click.stop="searchKeyword = ''"
                  >
                    <wd-icon css-icon="i-ri-close-circle-fill" size="14px" color="#858585" />
                  </view>
                </view>

                <view
                  class="sort-toggle-btn wot-flex wot-items-center wot-justify-center wot-h-9 wot-w-9 wot-rounded-lg wot-bg-[#f5f6f8] dark:wot-bg-[#1e2029] wot-box-border wot-flex-shrink-0 wot-cursor-pointer"
                  @click="toggleSortOrder"
                >
                  <wd-icon
                    :css-icon="sortOrder === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
                    size="17px"
                    :color="sortOrder === 'desc' ? 'var(--wot-color-theme, #0052d9)' : '#858585'"
                  />
                </view>
              </view>

              <view class="filter-wrapper">
                <wd-segmented v-model:value="currentFilter" :options="filterOptions" size="small" />
              </view>
            </view>

            <!-- 列表滚动区容器：100% 充满剩余空间 -->
            <view class="scroll-wrapper wot-flex-1 wot-overflow-hidden wot-min-h-0">
              <scroll-view scroll-y style="height: 100%; width: 100%;" class="scroll-container wot-p-2.5 wot-box-border">
                <view v-if="filteredApiCallbackLogs.length === 0" class="wot-py-12">
                  <wd-empty icon="empty" :tip="$t('bms.logs.empty')" />
                </view>
                <view v-else class="wot-flex wot-flex-col wot-gap-2">
                  <view
                    v-for="log in filteredApiCallbackLogs"
                    :key="log.id"
                    class="log-item-card wot-p-3 wot-rounded-lg wot-bg-filled-oppo wot-shadow-sm"
                  >
                    <!-- 卡片头部：状态徽标 + API名称 + 耗时 + 时间戳与复制 -->
                    <view class="wot-flex wot-items-center wot-justify-between wot-mb-2">
                      <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-1 wot-min-w-0">
                        <text
                          class="status-pill"
                          :class="log.status === 'success' ? 'pill-success' : 'pill-danger'"
                        >
                          {{ log.status.toUpperCase() }}
                        </text>
                        <text class="wot-text-xs wot-font-bold wot-text-text-main wot-truncate monospace">{{ log.apiName }}</text>
                        <view v-if="log.duration !== undefined" class="latency-pill">
                          ⚡ {{ log.duration }}ms
                        </view>
                      </view>
                      <view class="wot-flex wot-items-center wot-gap-2">
                        <text class="time-text">{{ log.timestamp }}</text>
                        <view class="copy-btn" @click.stop="copyText(log.apiName + (log.params ? ' ' + log.params : '') + (log.result ? ' -> ' + log.result : ''))">
                          <wd-icon css-icon="i-lucide-copy" size="12px" color="#858585" />
                        </view>
                      </view>
                    </view>

                    <!-- 参数展示区 -->
                    <view v-if="log.params" class="code-box wot-p-2 wot-rounded-md wot-mb-1.5" @click.stop="copyText(log.params)">
                      <text class="code-label">Params:</text>
                      <text class="code-content monospace">{{ log.params }}</text>
                    </view>

                    <!-- 结果展示区 -->
                    <view v-if="log.result" class="code-box wot-p-2 wot-rounded-md" :class="{ 'code-box-err': log.status !== 'success' }" @click.stop="copyText(log.result)">
                      <text class="code-label" :class="{ 'text-danger': log.status !== 'success' }">Callback Result:</text>
                      <text class="code-content monospace" :class="{ 'text-danger': log.status !== 'success' }">{{ log.result }}</text>
                    </view>
                  </view>
                </view>
                <view class="bottom-placeholder" />
              </scroll-view>
            </view>
          </view>
        </wd-tab>

        <!-- 3. 接口日志 Tab -->
        <wd-tab
          name="api"
          :title="$t('bms.logs.tabApi')"
        >
          <view class="tab-pane-wrapper wot-flex wot-flex-col wot-h-full wot-overflow-hidden">
            <!-- 快捷搜索与筛选工具栏 -->
            <view class="search-toolbar wot-flex-shrink-0 wot-px-3 wot-pt-2 wot-pb-2 wot-bg-filled-oppo wot-border-b wot-border-slate-100 dark:wot-border-zinc-800">
              <view class="wot-flex wot-items-center wot-gap-2 wot-mb-2">
                <view class="search-input-box wot-flex-1 wot-flex wot-items-center wot-bg-[#f5f6f8] dark:wot-bg-[#1e2029] wot-rounded-lg wot-px-3 wot-h-9 wot-box-border">
                  <wd-icon css-icon="i-lucide-search" size="15px" color="#858585" class="wot-mr-2 wot-flex-shrink-0" />
                  <input
                    v-model="searchKeyword"
                    type="text"
                    :placeholder="$t('bms.logs.searchPlaceholder')"
                    class="search-native-input wot-flex-1 wot-text-xs wot-text-text-main wot-h-full"
                  />
                  <view
                    v-if="searchKeyword"
                    class="wot-flex wot-items-center wot-justify-center wot-p-1 wot-cursor-pointer"
                    @click.stop="searchKeyword = ''"
                  >
                    <wd-icon css-icon="i-ri-close-circle-fill" size="14px" color="#858585" />
                  </view>
                </view>

                <view
                  class="sort-toggle-btn wot-flex wot-items-center wot-justify-center wot-h-9 wot-w-9 wot-rounded-lg wot-bg-[#f5f6f8] dark:wot-bg-[#1e2029] wot-box-border wot-flex-shrink-0 wot-cursor-pointer"
                  @click="toggleSortOrder"
                >
                  <wd-icon
                    :css-icon="sortOrder === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
                    size="17px"
                    :color="sortOrder === 'desc' ? 'var(--wot-color-theme, #0052d9)' : '#858585'"
                  />
                </view>
              </view>

              <view class="filter-wrapper">
                <wd-segmented v-model:value="currentFilter" :options="filterOptions" size="small" />
              </view>
            </view>

            <!-- 列表滚动区容器：100% 充满剩余空间 -->
            <view class="scroll-wrapper wot-flex-1 wot-overflow-hidden wot-min-h-0">
              <scroll-view scroll-y style="height: 100%; width: 100%;" class="scroll-container wot-p-2.5 wot-box-border">
                <view v-if="filteredApiLogs.length === 0" class="wot-py-12">
                  <wd-empty icon="empty" :tip="$t('bms.logs.empty')" />
                </view>
                <view v-else class="wot-flex wot-flex-col wot-gap-2">
                  <view
                    v-for="(log, index) in filteredApiLogs"
                    :key="index"
                    class="log-item-card wot-p-3 wot-rounded-lg wot-bg-filled-oppo wot-shadow-sm"
                  >
                    <!-- 头部：Method + Status + URL + 时间戳 -->
                    <view class="wot-flex wot-items-center wot-justify-between wot-mb-2">
                      <view class="wot-flex wot-items-center wot-gap-1.5 wot-flex-1 wot-min-w-0">
                        <text class="method-pill">{{ log.method }}</text>
                        <text
                          class="status-pill"
                          :class="isSuccessStatus(log.status) ? 'pill-success' : 'pill-danger'"
                        >
                          {{ log.status }}
                        </text>
                        <text class="wot-text-xs wot-text-text-main wot-truncate wot-flex-1 monospace">{{ cleanUrl(log.url) }}</text>
                      </view>
                      <view class="wot-flex wot-items-center wot-gap-2">
                        <text class="time-text">{{ log.timestamp }}</text>
                        <view class="copy-btn" @click.stop="copyText(`${log.method} ${log.url} -> ${log.status}`)">
                          <wd-icon css-icon="i-lucide-copy" size="12px" color="#858585" />
                        </view>
                      </view>
                    </view>

                    <!-- 参数 -->
                    <view v-if="log.params" class="code-box wot-p-2 wot-rounded-md wot-mb-1.5" @click.stop="copyText(log.params)">
                      <text class="code-label">Params:</text>
                      <text class="code-content monospace">{{ log.params }}</text>
                    </view>

                    <!-- 响应 -->
                    <view v-if="log.response" class="code-box wot-p-2 wot-rounded-md" @click.stop="copyText(log.response)">
                      <text class="code-label">Response:</text>
                      <text class="code-content monospace">{{ log.response }}</text>
                    </view>

                    <!-- 异常错误 -->
                    <view v-if="log.error" class="code-box code-box-err wot-p-2 wot-rounded-md wot-mt-1.5" @click.stop="copyText(log.error)">
                      <text class="code-label text-danger">Error:</text>
                      <text class="code-content text-danger monospace">{{ log.error }}</text>
                    </view>
                  </view>
                </view>
                <view class="bottom-placeholder" />
              </scroll-view>
            </view>
          </view>
        </wd-tab>

        <!-- 4. 系统环境与诊断 Tab -->
        <wd-tab
          name="system"
          :title="$t('bms.logs.tabSystem')"
        >
          <view class="tab-pane-wrapper wot-flex wot-flex-col wot-h-full wot-overflow-hidden">
            <view class="scroll-wrapper wot-flex-1 wot-overflow-hidden wot-min-h-0">
              <scroll-view scroll-y style="height: 100%; width: 100%;" class="scroll-container wot-p-2.5 wot-box-border">
                <view class="wot-flex wot-flex-col wot-gap-2.5">
                  <!-- 设备与系统卡片 -->
                  <view class="log-item-card wot-p-3 wot-rounded-lg wot-bg-filled-oppo">
                    <view class="card-section-title wot-mb-2.5">
                      <wd-icon css-icon="i-lucide-smartphone" size="14px" color="#858585" />
                      <text class="wot-text-xs wot-font-bold wot-text-text-main">{{ $t('bms.logs.sysDeviceInfo') }}</text>
                    </view>
                    <view class="wot-flex wot-flex-col wot-gap-2">
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.deviceBrand') }}</text>
                        <text class="info-v monospace">{{ systemInfo.brand }} {{ systemInfo.model }}</text>
                      </view>
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.osVersion') }}</text>
                        <text class="info-v monospace">{{ systemInfo.osName }} {{ systemInfo.osVersion }}</text>
                      </view>
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.platform') }}</text>
                        <text class="info-v monospace">{{ systemInfo.platform }} ({{ systemInfo.uniPlatform }})</text>
                      </view>
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.screenRes') }}</text>
                        <text class="info-v monospace">{{ systemInfo.screenWidth }}x{{ systemInfo.screenHeight }} (DPR: {{ systemInfo.pixelRatio }})</text>
                      </view>
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.safeArea') }}</text>
                        <text class="info-v monospace">Top: {{ systemInfo.statusBarHeight }}px</text>
                      </view>
                    </view>
                  </view>

                  <!-- 蓝牙通信与硬件状态卡片 -->
                  <view class="log-item-card wot-p-3 wot-rounded-lg wot-bg-filled-oppo">
                    <view class="card-section-title wot-mb-2.5">
                      <wd-icon css-icon="i-lucide-bluetooth" size="14px" color="#858585" />
                      <text class="wot-text-xs wot-font-bold wot-text-text-main">{{ $t('bms.logs.sysBleState') }}</text>
                    </view>
                    <view class="wot-flex wot-flex-col wot-gap-2">
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.bleConnectedDevice') }}</text>
                        <text class="info-v monospace">{{ bleConnectedDeviceName }}</text>
                      </view>
                      <view class="info-row">
                        <text class="info-k">MAC Address</text>
                        <text class="info-v monospace">{{ bleConnectedMac }}</text>
                      </view>
                    </view>
                  </view>

                  <!-- 本地存储与环境复制卡片 -->
                  <view class="log-item-card wot-p-3 wot-rounded-lg wot-bg-filled-oppo">
                    <view class="card-section-title wot-mb-2.5">
                      <wd-icon css-icon="i-lucide-database" size="14px" color="#858585" />
                      <text class="wot-text-xs wot-font-bold wot-text-text-main">{{ $t('bms.logs.sysStorage') }}</text>
                    </view>
                    <view class="wot-flex wot-flex-col wot-gap-2 wot-mb-3">
                      <view class="info-row">
                        <text class="info-k">{{ $t('bms.logs.storageUsed') }}</text>
                        <text class="info-v monospace">{{ storageInfo.keysCount }} Keys ({{ storageInfo.currentSize }} KB)</text>
                      </view>
                    </view>
                    <wd-button
                      size="small"
                      plain
                      block
                      type="primary"
                      custom-class="wot-rounded-lg"
                      :loading="isCopyingSystemInfo"
                      @click="handleCopySystemInfo"
                    >
                      {{ $t('bms.logs.copySystemInfo') }}
                    </wd-button>
                  </view>
                </view>
                <view class="bottom-placeholder" />
              </scroll-view>
            </view>
          </view>
        </wd-tab>
      </wd-tabs>

      <!-- 底部控制按钮栏 -->
      <view class="control-bar wot-p-3 wot-bg-filled-oppo wot-flex wot-gap-3 wot-shadow-md">
        <wd-button type="danger" plain block custom-class="wot-rounded-lg" class="wot-flex-1" @click="handleClearLogs">
          {{ $t('bms.logs.clearBtn') }}
        </wd-button>
        <wd-button
          type="success"
          block
          custom-class="wot-rounded-lg"
          class="wot-flex-1"
          :loading="isExportingLogs"
          @click="handleExportLogs"
        >
          {{ $t('bms.logs.exportBtn') }}
        </wd-button>
      </view>

      <!-- 导出成功专属弹窗 (支持点击目录地址与前往手机文件管理) -->
      <wd-popup
        v-model="showExportSuccessModal"
        position="center"
        transition="zoom-in"
        custom-class="export-success-popup wot-rounded-xl"
        :close-on-click-modal="true"
      >
        <view class="export-modal-content wot-p-5 wot-flex wot-flex-col wot-items-center wot-box-border wot-bg-filled-oppo">
          <!-- 成功图标徽章 -->
          <view class="icon-circle wot-w-12 wot-h-12 wot-rounded-full wot-bg-emerald-500/10 dark:wot-bg-emerald-500/20 wot-flex wot-items-center wot-justify-center wot-mb-3">
            <wd-icon css-icon="i-lucide-check-circle-2" size="28px" color="#10b981" />
          </view>

          <!-- 弹窗标题 -->
          <text class="wot-text-base wot-font-bold wot-text-text-main wot-mb-1.5">
            {{ $t('bms.logs.exportSuccessTitle') }}
          </text>

          <!-- 提示副标题 -->
          <text class="wot-text-xs wot-text-text-secondary wot-mb-3.5 wot-text-center">
            {{ $t('bms.logs.exportSavedDesc') }}
          </text>

          <!-- 目录地址卡片 (可点击直接打开文件 + 自动换行无横向滚动条) -->
          <view
            class="directory-card wot-w-full wot-p-3 wot-rounded-lg wot-box-border wot-mb-4 wot-cursor-pointer"
            @click="handleOpenFileDirectory"
          >
            <view class="wot-flex wot-items-center wot-justify-between wot-mb-1.5">
              <view class="wot-flex wot-items-center wot-gap-1.5">
                <wd-icon css-icon="i-lucide-folder-open" size="14px" color="#10b981" />
                <text class="wot-text-[11px] wot-font-bold wot-text-text-main">{{ $t('bms.logs.savedDirectoryTitle') }}</text>
              </view>
              <view class="wot-flex wot-items-center wot-gap-1">
                <text class="wot-text-[10px] wot-text-emerald-600 dark:wot-text-emerald-400">{{ $t('bms.logs.tapToOpenFolder') }}</text>
                <wd-icon css-icon="i-lucide-chevron-right" size="10px" color="#10b981" />
              </view>
            </view>

            <!-- 路径文本：强制 break-all，自然换行，杜绝横向滚动条 -->
            <text class="directory-path-text monospace">
              {{ exportedFilePath }}
            </text>
          </view>

          <!-- 底部操作按钮 -->
          <view class="wot-flex wot-gap-2.5 wot-w-full">
            <wd-button
              plain
              block
              custom-class="wot-rounded-lg"
              class="wot-flex-1"
              @click="showExportSuccessModal = false"
            >
              {{ $t('bms.logs.close') }}
            </wd-button>
            <wd-button
              type="success"
              block
              custom-class="wot-rounded-lg"
              class="wot-flex-1"
              @click="handleOpenFileDirectory"
            >
              {{ $t('bms.logs.openFolderBtn') }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@wot-ui/ui";
import { useLogStore } from "@/stores/log-store";
import { useBleStore } from "@/stores/ble-store";
import { useAppStore } from "@/stores/app";
import {
  buildLogsExcelBuffer,
  saveExcelFile,
  openFileDirectory,
  formatDateTimeForFileName,
} from "@/utils/excel-helper";
import { storeToRefs } from "pinia";

// 获取 i18n 翻译实例、消息提示及对话框 Hooks
const { t } = useI18n();
const toast = useToast();
const dialog = useDialog();
const logStore = useLogStore();
const bleStore = useBleStore();
const appStore = useAppStore();

// 解构获取响应式日志列表与蓝牙真实状态
const { apiCallbackLogs, commandLogs, apiLogs } = storeToRefs(logStore);
const { isBleConnected, connectedDeviceId, connectedDeviceMac, connectedDeviceName } = storeToRefs(bleStore);

// 当前高亮选中的 Tab 页签
const activeTab = ref("command");

// 复制与导出操作 Loading 状态，防止重复连点并提供即时交互反馈
const isCopyingSystemInfo = ref(false);
const isExportingLogs = ref(false);

// 导出成功弹窗展示状态及保存成功的物理路径
const showExportSuccessModal = ref(false);
const exportedFilePath = ref("");

// 搜索关键词
const searchKeyword = ref("");

// 排序模式：默认 'desc'（最新在前/降序）
const sortOrder = ref<"desc" | "asc">("desc");

// 切换排序模式
const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  toast.show({
    msg: sortOrder.value === "desc" ? t("bms.logs.sortNewestFirst") : t("bms.logs.sortOldestFirst"),
  });
};

// 当前过滤状态 (全部: all, 成功: success, 失败: error, 发送: tx, 接收: rx)
const currentFilter = ref("all");

// 过滤选项配置（符合 wd-segmented 的 SegmentedOption 规范）
const filterOptions = computed(() => {
  if (activeTab.value === "command") {
    return [
      { label: t("bms.logs.filterAll"), value: "all" },
      { label: t("bms.logs.filterTx"), value: "tx" },
      { label: t("bms.logs.filterRx"), value: "rx" },
    ];
  }
  return [
    { label: t("bms.logs.filterAll"), value: "all" },
    { label: t("bms.logs.filterSuccess"), value: "success" },
    { label: t("bms.logs.filterError"), value: "error" },
  ];
});

/**
 * 格式化 HEX 字符串，每两个字符插入一个空格以增强可读性
 * 示例: "A55A0301" -> "A5 5A 03 01"
 */
const formatHex = (hex: string): string => {
  if (!hex) return "";
  const cleaned = hex.replace(/\s+/g, "");
  return cleaned.match(/.{1,2}/g)?.join(" ") || hex;
};

/**
 * 将一维指令日志 commandLogs 包装重组为“发送-接收”配对组并计算精准响应耗时
 */
const commandGroups = computed(() => {
  const groups: Array<{
    tx?: typeof commandLogs.value[0];
    rx?: typeof commandLogs.value[0];
    id: string;
    latency?: number;
  }> = [];
  const logs = commandLogs.value;
  let i = 0;

  while (i < logs.length) {
    const current = logs[i];

    if (current.direction === "RX" && i + 1 < logs.length && logs[i + 1].direction === "TX") {
      const rxLog = current;
      const txLog = logs[i + 1];

      // 计算毫秒级时间差
      let latency: number | undefined = undefined;
      try {
        const parseMs = (timeStr: string) => {
          const parts = timeStr.split(":");
          if (parts.length === 3) {
            const secParts = parts[2].split(".");
            return (
              parseInt(parts[0], 10) * 3600000 +
              parseInt(parts[1], 10) * 60000 +
              parseInt(secParts[0], 10) * 1000 +
              (secParts[1] ? parseInt(secParts[1], 10) : 0)
            );
          }
          return 0;
        };
        const diff = parseMs(rxLog.timestamp) - parseMs(txLog.timestamp);
        if (diff >= 0 && diff < 30000) {
          latency = diff;
        }
      } catch (err) {
        console.error("计算指令响应耗时失败:", err);
      }

      groups.push({
        rx: rxLog,
        tx: txLog,
        id: `${rxLog.timestamp}-${txLog.timestamp}-${i}`,
        latency,
      });
      i += 2;
    } else {
      if (current.direction === "TX") {
        groups.push({
          tx: current,
          id: `tx-${current.timestamp}-${i}`,
        });
      } else {
        groups.push({
          rx: current,
          id: `rx-${current.timestamp}-${i}`,
        });
      }
      i += 1;
    }
  }
  return groups;
});

// 过滤并排序后的 API 回调日志 (默认最新在前)
const filteredApiCallbackLogs = computed(() => {
  let list = apiCallbackLogs.value;
  const kw = searchKeyword.value.trim().toLowerCase();

  if (kw) {
    list = list.filter(
      (item) =>
        item.apiName.toLowerCase().includes(kw) ||
        (item.params && item.params.toLowerCase().includes(kw)) ||
        (item.result && item.result.toLowerCase().includes(kw)),
    );
  }

  if (currentFilter.value === "success") {
    list = list.filter((item) => item.status === "success");
  } else if (currentFilter.value === "error") {
    list = list.filter((item) => item.status !== "success");
  }

  return sortOrder.value === "desc" ? list : [...list].reverse();
});

// 过滤并排序后的指令日志组 (默认最新在前)
const filteredCommandGroups = computed(() => {
  let list = commandGroups.value;
  const kw = searchKeyword.value.trim().toLowerCase();

  if (kw) {
    list = list.filter(
      (group) =>
        (group.tx && group.tx.hexData.toLowerCase().includes(kw)) ||
        (group.rx && group.rx.hexData.toLowerCase().includes(kw)),
    );
  }

  if (currentFilter.value === "tx") {
    list = list.filter((group) => !!group.tx);
  } else if (currentFilter.value === "rx") {
    list = list.filter((group) => !!group.rx);
  }

  return sortOrder.value === "desc" ? list : [...list].reverse();
});

// 过滤并排序后的 API 日志 (默认最新在前)
const filteredApiLogs = computed(() => {
  let list = apiLogs.value;
  const kw = searchKeyword.value.trim().toLowerCase();

  if (kw) {
    list = list.filter(
      (item) =>
        item.url.toLowerCase().includes(kw) ||
        item.method.toLowerCase().includes(kw) ||
        (item.params && item.params.toLowerCase().includes(kw)) ||
        (item.response && item.response.toLowerCase().includes(kw)) ||
        (item.error && item.error.toLowerCase().includes(kw)),
    );
  }

  if (currentFilter.value === "success") {
    list = list.filter((item) => isSuccessStatus(item.status));
  } else if (currentFilter.value === "error") {
    list = list.filter((item) => !isSuccessStatus(item.status));
  }

  return sortOrder.value === "desc" ? list : [...list].reverse();
});

// 系统与环境数据
const systemInfo = ref({
  brand: "-",
  model: "-",
  osName: "-",
  osVersion: "-",
  platform: "-",
  uniPlatform: "-",
  screenWidth: 0,
  screenHeight: 0,
  pixelRatio: 1,
  statusBarHeight: 0,
});

const storageInfo = ref({
  keysCount: 0,
  currentSize: 0,
});

const bleConnectedDeviceName = computed(() => {
  if (isBleConnected.value && connectedDeviceName.value) {
    return connectedDeviceName.value;
  }
  return t("bms.logs.bleNoDevice");
});

const bleConnectedMac = computed(() => {
  if (isBleConnected.value && (connectedDeviceMac.value || connectedDeviceId.value)) {
    return connectedDeviceMac.value || connectedDeviceId.value;
  }
  return "-";
});

// 挂载时抓取系统信息与存储状态
onMounted(() => {
  try {
    const info = uni.getSystemInfoSync();
    systemInfo.value = {
      brand: info.brand || "Generic",
      model: info.model || "Unknown",
      osName: info.osName || info.platform || "-",
      osVersion: info.osVersion || "-",
      platform: info.platform || "-",
      uniPlatform: (info as any).uniPlatform || "-",
      screenWidth: info.screenWidth || 0,
      screenHeight: info.screenHeight || 0,
      pixelRatio: info.pixelRatio || 1,
      statusBarHeight: info.statusBarHeight || 0,
    };

    const storage = uni.getStorageInfoSync();
    storageInfo.value = {
      keysCount: storage.keys?.length || 0,
      currentSize: storage.currentSize || 0,
    };
  } catch (e) {
    console.error("获取系统诊断信息失败:", e);
  }
});

/**
 * 抓取全量本地缓存数据键值对 (Local Storage Dump)
 */
const getFullLocalStorageDump = () => {
  const storageDump: Record<string, any> = {};
  try {
    const storage = uni.getStorageInfoSync();
    if (storage.keys && storage.keys.length > 0) {
      storage.keys.forEach((key) => {
        try {
          const val = uni.getStorageSync(key);
          // 尝试解析 JSON 字符串，以结构化对象展示；否则以原始值展示
          if (typeof val === "string") {
            try {
              storageDump[key] = JSON.parse(val);
            } catch {
              storageDump[key] = val;
            }
          } else {
            storageDump[key] = val;
          }
        } catch (readErr) {
          storageDump[key] = `<Error Reading: ${readErr}>`;
        }
      });
    }
  } catch (e) {
    console.error("读取本地缓存全量数据失败:", e);
  }
  return storageDump;
};

/**
 * 复制系统诊断信息与全量本地缓存数据 (Full Diagnostic & Storage Dump)
 */
const handleCopySystemInfo = async () => {
  if (isCopyingSystemInfo.value) return;
  isCopyingSystemInfo.value = true;
  try {
    let networkType = "unknown";
    try {
      const net = await uni.getNetworkType();
      networkType = net.networkType || "unknown";
    } catch (netErr) {
      console.warn("获取网络类型失败:", netErr);
    }

    // 抓取全量本地缓存数据键值对
    const storageDump = getFullLocalStorageDump();
    let currentStorageInfo = storageInfo.value;
    try {
      const st = uni.getStorageInfoSync();
      currentStorageInfo = {
        keysCount: st.keys?.length || 0,
        currentSize: st.currentSize || 0,
      };
    } catch (stErr) {
      console.warn("刷新存储统计失败:", stErr);
    }

    // 组合全景诊断与缓存报表
    const fullDiagnosticReport = {
      reportTitle: "BMS System & Environment Diagnostic Report",
      exportedAt: new Date().toISOString(),
      // 1. 系统与设备运行环境
      system: {
        ...systemInfo.value,
        networkType,
      },
      // 2. 蓝牙与 BMS 通信状态
      bluetooth: {
        isConnected: isBleConnected.value,
        deviceName: connectedDeviceName.value || null,
        macAddress: connectedDeviceMac.value || null,
        deviceId: connectedDeviceId.value || null,
        activeProtocol: bleStore.activeProtocolId || "auto",
      },
      // 3. 应用全局配置与主题状态
      appState: {
        locale: appStore.locale,
        theme: appStore.theme,
        actualTheme: appStore.actualTheme,
      },
      // 4. 本地存储概览指标
      storageOverview: currentStorageInfo,
      // 5. 本地缓存数据全量明细 (Storage Key-Value Dump)
      storageData: storageDump,
    };

    const data = JSON.stringify(fullDiagnosticReport, null, 2);
    await copyTextAsync(data, t("bms.logs.systemInfoCopied"));
  } catch (err) {
    console.error("复制系统环境信息失败:", err);
    toast.error(t("bms.auth.clipboardPermissionMsg"));
  } finally {
    isCopyingSystemInfo.value = false;
  }
};

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
 * 通用单文本复制函数
 */
const copyText = (content: string, customMsg?: string) => {
  if (!content) return;
  (uni.setClipboardData as any)({
    data: content,
    showToast: false,
    success: () => {
      toast.success(customMsg || t("bms.logs.copySingleSuccess"));
    },
    fail: () => {
      toast.error(t("bms.auth.clipboardPermissionMsg"));
    },
  });
};

/**
 * 异步文本复制函数 (支持 Promise 状态闭环)
 */
const copyTextAsync = (content: string, customMsg?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!content) {
      resolve();
      return;
    }
    (uni.setClipboardData as any)({
      data: content,
      showToast: false,
      success: () => {
        toast.success(customMsg || t("bms.logs.copySingleSuccess"));
        resolve();
      },
      fail: (err: any) => {
        toast.error(t("bms.auth.clipboardPermissionMsg"));
        reject(err);
      },
    });
  });
};

/**
 * 清空所有调试日志的交互回调，加入安全二次确认
 */
const handleClearLogs = () => {
  dialog
    .confirm({
      title: t("bms.common.prompt"),
      msg: t("bms.logs.clearConfirmMsg"),
      zIndex: 2000,
    })
    .then(() => {
      logStore.clearLogs();
      toast.success(t("bms.logs.clearSuccess"));
    })
    .catch(() => {
      // 用户取消清空
    });
};

/**
 * 导出全量系统运行日志为专业多 Sheet Excel 文件 (包含指令、连接、接口与全景系统环境)
 */
const handleExportLogs = async () => {
  if (isExportingLogs.value) return;

  isExportingLogs.value = true;
  try {
    // 1. 抓取网络状态与存储数据
    let networkType = "unknown";
    try {
      const net = await uni.getNetworkType();
      networkType = net.networkType || "unknown";
    } catch (netErr) {
      console.warn("获取网络类型失败:", netErr);
    }

    const storageDump = getFullLocalStorageDump();
    let currentStorageInfo = storageInfo.value;
    try {
      const st = uni.getStorageInfoSync();
      currentStorageInfo = {
        keysCount: st.keys?.length || 0,
        currentSize: st.currentSize || 0,
      };
    } catch (stErr) {
      console.warn("刷新存储统计失败:", stErr);
    }

    const systemReport = {
      system: { ...systemInfo.value, networkType },
      bluetooth: {
        isConnected: isBleConnected.value,
        deviceName: connectedDeviceName.value || null,
        macAddress: connectedDeviceMac.value || null,
        deviceId: connectedDeviceId.value || null,
        activeProtocol: bleStore.activeProtocolId || "auto",
      },
      appState: {
        locale: appStore.locale,
        theme: appStore.theme,
        actualTheme: appStore.actualTheme,
      },
      storageOverview: currentStorageInfo,
      storageData: storageDump,
    };

    // 2. 生成多 Sheet Excel ArrayBuffer
    const buffer = buildLogsExcelBuffer({
      commandLogs: commandLogs.value,
      apiCallbackLogs: apiCallbackLogs.value,
      connectionLogs: apiCallbackLogs.value,
      apiLogs: apiLogs.value,
      systemReport,
    });

    // 3. 跨平台保存文件
    const fileName = `bms_logs_${formatDateTimeForFileName()}.xlsx`;
    const savedPath = await saveExcelFile(buffer, fileName);

    // 4. 关键：文件落盘保存完毕，记录路径并关闭 loading
    exportedFilePath.value = savedPath;
    isExportingLogs.value = false;

    // 5. 弹出专属导出成功弹窗 (展示美观无横向滚动条的目录卡片)
    showExportSuccessModal.value = true;
  } catch (err: any) {
    console.error("导出日志 Excel 失败:", err);
    toast.error(t("bms.logs.exportFail"));
  } finally {
    isExportingLogs.value = false;
  }
};

/**
 * 点击目录地址或底部按钮：打开手机文件管理并定位到对应目录 (同时复制路径供用户自主管理)
 */
const handleOpenFileDirectory = async () => {
  if (!exportedFilePath.value) return;

  console.log("[SystemLogs] 用户触发 handleOpenFileDirectory, path:", exportedFilePath.value);

  // 1. 复制文件路径到剪切板，方便用户在任何地方粘贴定位
  copyText(exportedFilePath.value, t("bms.logs.pathCopiedHint"));

  // 2. 调用跨平台文件管理打开方法
  try {
    const success = await openFileDirectory(exportedFilePath.value);
    console.log("[SystemLogs] openFileDirectory 执行结果:", success);
  } catch (err) {
    console.warn("[SystemLogs] 唤起文件管理器异常:", err);
  }
};
</script>

<style scoped lang="scss">
/* 导出成功弹窗容器 */
:deep(.export-success-popup) {
  width: 320px !important;
  max-width: 90vw !important;
  overflow: hidden !important;
  background: transparent !important;
}

.export-modal-content {
  width: 100%;
  border-radius: 16px;
}

.directory-card {
  background-color: rgba(16, 185, 129, 0.06);
  border: 1px dashed rgba(16, 185, 129, 0.35);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
    background-color: rgba(16, 185, 129, 0.12);
  }
}

.dark .directory-card {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px dashed rgba(16, 185, 129, 0.4);
}

.directory-path-text {
  display: block;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wot-color-theme, #0052d9);
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  white-space: pre-wrap !important;
  user-select: text;
}

/* 确保 wd-tabs 内部手势滑动容器 100% 填满视口剩余高度，全屏手势无死角响应 */
:deep(.wd-tabs) {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
  height: 100% !important;
  min-height: 0 !important;
}

:deep(.wd-tabs__container) {
  flex: 1 !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

:deep(.wd-tabs__body) {
  height: 100% !important;
  min-height: 0 !important;
}

:deep(.wd-tab) {
  height: 100% !important;
  min-height: 0 !important;
  flex-shrink: 0 !important;
}

:deep(.wd-tab__body) {
  height: 100% !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}

.tab-pane-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 列表滚动外部视口容器：确立严格的 flex 剩余高度边界 */
.scroll-wrapper {
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* 内部 scroll-view 组件：100% 继承父级视口高度，内部内容超出时触发原生纵向平滑滚动 */
.scroll-container {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}

.bottom-placeholder {
  height: 24px;
}

/* 搜索输入框与原生 input */
.search-input-box {
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.dark .search-input-box {
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.search-native-input {
  border: none;
  outline: none;
  background: transparent;
}

/* 排序切换按钮：与输入框 1:1 精确高度 (36px) 与圆角 */
.sort-toggle-btn {
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.92);
    background-color: rgba(0, 82, 217, 0.12);
  }
}

.dark .sort-toggle-btn {
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* 日志卡片：极简通透风格 */
.log-item-card {
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;

  &:active {
    background-color: rgba(0, 0, 0, 0.015);
  }
}

.dark .log-item-card {
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:active {
    background-color: rgba(255, 255, 255, 0.02);
  }
}

/* 状态小胶囊 */
.status-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.pill-success {
  background-color: rgba(43, 164, 113, 0.1);
  color: #2ba471;
}

.pill-danger {
  background-color: rgba(250, 53, 52, 0.1);
  color: #fa3534;
}

.method-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background-color: rgba(147, 51, 234, 0.1);
  color: #9333ea;
  flex-shrink: 0;
}

.latency-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background-color: rgba(0, 82, 217, 0.08);
  color: var(--wot-color-theme, #0052d9);
}

.dark .latency-pill {
  background-color: rgba(0, 82, 217, 0.2);
}

/* 时间文本 */
.time-text {
  font-size: 10px;
  color: #858585;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* 极简复制按钮 */
.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s ease;

  &:active {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.06);
  }
}

.dark .copy-btn:active {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 代码/数据块 */
.code-box {
  background-color: rgba(0, 0, 0, 0.025);
  border: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dark .code-box {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.code-box-err {
  background-color: rgba(250, 53, 52, 0.04);
  border: 1px solid rgba(250, 53, 52, 0.12);
}

.dark .code-box-err {
  background-color: rgba(250, 53, 52, 0.08);
  border: 1px solid rgba(250, 53, 52, 0.2);
}

.code-label {
  font-size: 10px;
  font-weight: 600;
  color: #858585;
}

.code-content {
  font-size: 11px;
  color: var(--wot-text-main, #1d1f29);
  word-break: break-all;
}

.text-danger {
  color: #fa3534 !important;
}

/* 指令流单行 */
.stream-row {
  display: flex;
  flex-direction: column;
  border-radius: 6px;
}

.stream-tx {
  background-color: rgba(0, 82, 217, 0.035);
  border: 1px solid rgba(0, 82, 217, 0.08);
}

.dark .stream-tx {
  background-color: rgba(0, 82, 217, 0.08);
  border: 1px solid rgba(0, 82, 217, 0.16);
}

.stream-rx {
  background-color: rgba(43, 164, 113, 0.035);
  border: 1px solid rgba(43, 164, 113, 0.08);
}

.dark .stream-rx {
  background-color: rgba(43, 164, 113, 0.08);
  border: 1px solid rgba(43, 164, 113, 0.16);
}

.stream-tag {
  font-size: 9px;
  font-weight: 700;
}

.tag-tx {
  color: var(--wot-color-theme, #0052d9);
}

.tag-rx {
  color: #2ba471;
}

.hex-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--wot-text-main, #1d1f29);
  word-break: break-all;
  letter-spacing: 0.4px;
}

/* 系统环境参数行 */
.card-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.06);
}

.dark .card-section-title {
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.info-k {
  color: #858585;
}

.info-v {
  color: var(--wot-text-main, #1d1f29);
  font-weight: 600;
}

/* 等宽字体 */
.monospace {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.control-bar {
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
</style>
