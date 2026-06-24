<template>
  <view class="scroll-page-container wot-w-full" :class="[actualTheme === 'dark' ? 'theme-dark' : 'theme-light']">
    <!-- 导航栏底色遮罩，由 WXS 控制透明度以实现零延迟变色 -->
    <view
      class="navbar-bg-overlay"
      :style="{
        height: navbarHeight + 'px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 199,
        pointerEvents: 'none',
        backgroundColor: actualTheme === 'dark' ? 'rgba(15, 23, 42, 0)' : 'rgba(246, 248, 252, 0)',
      }"
    />

    <!-- 顶部固定定位导航栏（背景始终保持透明） -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar
      fixed
      safe-area-inset-top
      custom-style="background-color: transparent !important; border-bottom: none !important; z-index: 200 !important; box-shadow: none !important; transition: none !important;"
      @click-left="handleScanConnect"
    >
      <template #left>
        <view class="wot-flex wot-items-center wot-gap-2">
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon name="scan" size="20px" :color="navbarContentColor" />
          <view v-if="!isOfflineMode" class="wot-flex wot-items-center wot-gap-1">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-cloud" size="14px" :color="navbarContentColor" />
            <text class="wot-font-bold wot-text-caption wot-scale-90" :style="{ color: navbarContentColor }">
              {{ $t("bms.mine.cloudOnline") }}
            </text>
          </view>
        </view>
      </template>
      <template #title>
        <text
          class="wot-font-bold navbar-title-target"
          :style="{ fontSize: '28rpx', color: navbarContentColor, opacity: 0 }"
        >
          {{ $t("bms.title") }}
        </text>
      </template>
    </wd-navbar>

    <!-- 滚动容器：在滑动模式下管理首页整体滚动 -->
    <!-- scroll-top 受控绑定 scrollResetTop，仅在 onShow 时赋值归零，平时不干涉用户滚动 -->
    <scroll-view
      scroll-y
      class="scroll-mode-layout"
      :show-scrollbar="false"
      :enhanced="true"
      :scroll-top="scrollResetTop"
      :data-target-scroll="targetScroll"
      :data-navbar-height="navbarHeight"
      :data-theme="actualTheme"
      :data-theme-color="activeThemeColor"
      @scroll="navbarWxs.onScroll"
    >
      <!-- 上半部分大背景层：使用相对/文档流排列，彻底隔离绝对定位 -->
      <view class="scroll-header-wrap wot-relative">
        <view class="scroll-header-bg wot-overflow-hidden wot-w-full" :style="headerBgStyle">
          <!-- 顶部内容占位：防止内容与固定导航栏重叠 -->
          <view class="navbar-placeholder" />

          <!-- 上半部分可淡出内容包装器：随滚动透明度降低，与背景色彩过渡相得益彰 -->
          <view class="header-content-target" :style="{ opacity: 1 }">
            <!-- 隔离的高精度矢量 SVG 仪表盘组件 -->
            <view class="soc-dashboard-wrap wot-flex wot-justify-center wot-items-center wot-mt-2">
              <soc-dashboard
                :percent="socPercent"
                :is-connected="isConnected"
                :is-charging="isCharging"
                :is-discharging="isDischarging"
              />
            </view>

            <!-- 电流与电压实时数据面板（磨砂玻璃双联卡片） -->
            <view class="wot-px-3 wot-mt-3 wot-mb-6 wot-w-full wot-box-border">
              <view class="telemetry-panel wot-flex wot-items-center wot-justify-between wot-py-4">
                <!-- 电流展示项 -->
                <view class="telemetry-item wot-flex wot-items-center wot-justify-center wot-flex-1">
                  <view class="telemetry-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3">
                    <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                    <wd-icon
                      css-icon="i-ri-pulse-line"
                      size="18px"
                      :color="actualTheme === 'dark' ? '#ffffff' : activeThemeColor"
                    />
                  </view>
                  <view class="wot-flex wot-flex-col wot-justify-center">
                    <text class="telemetry-value wot-text-white wot-font-extrabold monospace">
                      {{ isConnected ? (realtimeCurrent >= 0 ? "+" : "") + realtimeCurrent : "0.00" }}
                      <text class="telemetry-unit">A</text>
                    </text>
                    <text class="telemetry-label wot-text-white wot-opacity-80">
                      {{ $t("bms.params.realtimeCurrent") }}
                    </text>
                  </view>
                </view>

                <!-- 中间分割线 -->
                <view class="telemetry-divider"></view>

                <!-- 电压展示项 -->
                <view class="telemetry-item wot-flex wot-items-center wot-justify-center wot-flex-1">
                  <view class="telemetry-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3">
                    <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                    <wd-icon
                      css-icon="i-ri-flashlight-line"
                      size="18px"
                      :color="actualTheme === 'dark' ? '#ffffff' : activeThemeColor"
                    />
                  </view>
                  <view class="wot-flex wot-flex-col wot-justify-center">
                    <text class="telemetry-value wot-text-white wot-font-extrabold monospace">
                      {{ isConnected ? totalVoltage : "0.00" }}
                      <text class="telemetry-unit">V</text>
                    </text>
                    <text class="telemetry-label wot-text-white wot-opacity-80">
                      {{ $t("bms.params.totalVoltage") }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 平滑过渡遮罩层：上滑时通过 opacity 变化渐变为底部背景色 -->
        <view
          class="scroll-header-mask header-mask-target"
          :style="{
            opacity: 0,
            backgroundColor: actualTheme === 'dark' ? '#0f172a' : '#f6f8fc',
          }"
        />
      </view>

      <!-- 粘性蓝牙状态栏：它在 scroll-view 中是独立的 sticky 元素，其父容器是整个 scroll-view -->
      <view
        class="sticky-bluetooth-wrapper bluetooth-sticky-target"
        :style="{
          top: navbarHeight + 'px',
          backgroundColor: actualTheme === 'dark' ? '#0f172a' : '#f6f8fc',
          borderRadius: '16px 16px 0 0',
          padding: '12px 16px 8px',
        }"
      >
        <!-- 蓝牙连接状态面板（内容区域融合卡片） -->
        <view class="bluetooth-status-panel wot-flex wot-items-center wot-justify-between wot-p-4">
          <view class="wot-flex wot-items-center wot-min-w-0">
            <!-- 蓝牙图标呼吸闪烁动画 -->
            <view
              class="status-icon-wrapper wot-flex wot-items-center wot-justify-center wot-mr-3 wot-flex-shrink-0"
              :class="isConnected ? 'bg-primary-light' : 'bg-neutral-light'"
              :style="isConnected ? pulseStyle : undefined"
            >
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon
                :css-icon="isConnected ? 'i-ri-bluetooth-fill' : 'i-ri-bluetooth-line'"
                size="20px"
                :color="isConnected ? activeThemeColor : '#858585'"
              />
            </view>
            <view class="wot-flex wot-flex-col wot-min-w-0">
              <text class="wot-text-text-main wot-font-bold wot-truncate" :style="{ fontSize: '26rpx' }">
                {{ isConnected ? connectedName : $t("bms.ble.disconnected") }}
              </text>
              <text class="wot-text-text-secondary wot-mt-[2rpx] wot-truncate" :style="{ fontSize: '20rpx' }">
                {{ isConnected ? $t("bms.ble.deviceMac") + connectedMac : $t("bms.ble.promptConnect") }}
              </text>
            </view>
          </view>

          <!-- 快速连接/断开按钮 -->
          <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
          <wd-button size="small" :type="isConnected ? 'danger' : 'primary'" @click="toggleConnection" plain>
            {{ isConnected ? $t("bms.ble.disconnect") : $t("bms.ble.connect") }}
          </wd-button>
        </view>
      </view>

      <!-- 下半部分卡片容器 -->
      <view class="scroll-bottom-container" :style="scrollBottomContainerStyle">
        <!-- 下半部分主要数据面板（普通文档流跟随滚动） -->
        <view class="scroll-body-content wot-px-4 wot-pb-24">
          <!-- 4 个核心参数 Google MD3 规格卡片网格 -->
          <view class="wot-grid wot-grid-cols-4 wot-gap-3 wot-pt-2">
            <!-- 剩余容量卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper bg-primary-light wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-battery-2-charge-line" size="18px" :color="activeThemeColor" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.battery.remainingCapacity") }}
              </text>
              <text
                class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1 wot-truncate wot-w-full"
              >
                {{ remainCap }}
              </text>
            </view>

            <!-- 健康度 SOH 卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper bg-success-light wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-heart-pulse-line" size="18px" color="#10b981" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.params.soh") }}
              </text>
              <text class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1">
                {{ sohDisplay }}
              </text>
            </view>

            <!-- 循环次数卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper bg-warning-light wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-loop-left-line" size="18px" color="#f59e0b" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.params.cycleCount") }}
              </text>
              <text class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1">
                {{ cycleCountDisplay }}
              </text>
            </view>

            <!-- 运行总时长卡片 -->
            <view class="md3-metric-card">
              <view class="card-icon-wrapper bg-info-light wot-flex wot-items-center wot-justify-center">
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-time-line" size="18px" color="#06b6d4" />
              </view>
              <text class="metric-label wot-text-text-secondary wot-font-semibold wot-text-center wot-mt-2">
                {{ $t("bms.params.runTime") }}
              </text>
              <text
                class="metric-value wot-text-text-main wot-font-extrabold wot-text-center wot-mt-1 wot-truncate wot-w-full"
              >
                {{ runTimeStr }}
              </text>
            </view>
          </view>

          <!-- 充放电开关控制卡片 -->
          <view class="wot-grid wot-grid-cols-2 wot-gap-3 wot-mt-4">
            <!-- 充电 MOS 控制卡片 -->
            <view
              class="md3-switch-card wot-box-border wot-flex wot-items-center wot-justify-between"
              :class="{ 'is-active': isCharging && isConnected }"
            >
              <view class="wot-flex wot-items-center wot-min-w-0 wot-flex-1">
                <view
                  class="control-icon-wrapper bg-primary-light wot-flex wot-items-center wot-justify-center wot-mr-2 wot-flex-shrink-0"
                >
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-battery-charge-line" size="18px" :color="activeThemeColor" />
                </view>
                <view class="wot-flex wot-flex-col wot-min-w-0">
                  <text
                    class="wot-font-bold wot-text-text-main wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '24rpx' }"
                  >
                    {{ $t("bms.control.chargeMos") }}
                  </text>
                  <text
                    class="wot-text-text-auxiliary wot-mt-[2rpx] wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '20rpx' }"
                  >
                    {{ $t("bms.control.chargeMosDesc") }}
                  </text>
                </view>
              </view>
              <view class="wot-flex wot-justify-end wot-items-center wot-flex-shrink-0" :style="{ width: '80rpx' }">
                <!-- Source: uni_modules/wot-ui/components/wd-switch/wd-switch.vue -->
                <wd-switch
                  :model-value="isCharging"
                  :disabled="!isConnected"
                  @change="toggleCharge"
                  :active-color="activeThemeColor"
                  size="18px"
                />
              </view>
            </view>

            <!-- 放电 MOS 控制卡片 -->
            <view
              class="md3-switch-card wot-box-border wot-flex wot-items-center wot-justify-between"
              :class="{ 'is-active': isDischarging && isConnected }"
            >
              <view class="wot-flex wot-items-center wot-min-w-0 wot-flex-1">
                <view
                  class="control-icon-wrapper bg-success-light wot-flex wot-items-center wot-justify-center wot-mr-2 wot-flex-shrink-0"
                >
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-flashlight-line" size="18px" color="#10b981" />
                </view>
                <view class="wot-flex wot-flex-col wot-min-w-0">
                  <text
                    class="wot-font-bold wot-text-text-main wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '24rpx' }"
                  >
                    {{ $t("bms.control.dischargeMos") }}
                  </text>
                  <text
                    class="wot-text-text-auxiliary wot-mt-[2rpx] wot-whitespace-nowrap wot-truncate"
                    :style="{ fontSize: '20rpx' }"
                  >
                    {{ $t("bms.control.dischargeMosDesc") }}
                  </text>
                </view>
              </view>
              <view class="wot-flex wot-justify-end wot-items-center wot-flex-shrink-0" :style="{ width: '80rpx' }">
                <!-- Source: uni_modules/wot-ui/components/wd-switch/wd-switch.vue -->
                <wd-switch
                  :model-value="isDischarging"
                  :disabled="!isConnected"
                  @change="toggleDischarge"
                  :active-color="activeThemeColor"
                  size="18px"
                />
              </view>
            </view>
          </view>

          <!-- 温度监控看板卡片 -->
          <view class="md3-panel-card wot-box-border wot-mt-4">
            <view
              class="wot-border-solid wot-border-divider-main wot-border-t-0 wot-border-l-0 wot-border-r-0 wot-border-b-[1.5px] wot-flex wot-items-center wot-justify-between wot-pb-2.5"
            >
              <view class="wot-flex wot-items-center">
                <view class="card-decorator wot-mr-2" :style="{ backgroundColor: activeThemeColor }"></view>
                <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '26rpx' }">
                  {{ $t("bms.params.multiTempMonitor") }}
                </text>
              </view>
            </view>
            <view
              class="monitor-body wot-flex wot-items-center wot-pt-3.5"
              v-if="isConnected && temperatureList.length > 0"
            >
              <view
                class="wot-mr-4 wot-flex wot-items-center wot-justify-center wot-flex-shrink-0"
                :style="{ width: '80rpx', height: '80rpx' }"
              >
                <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                <wd-icon css-icon="i-ri-temp-hot-line" size="80rpx" color="#10b981" />
              </view>
              <view class="wot-grid wot-grid-cols-2 wot-gap-2 wot-flex-1">
                <view v-for="(tItem, index) in temperatureList" :key="index" class="temp-item-pill">
                  <text class="wot-text-text-secondary" :style="{ fontSize: '22rpx' }">
                    {{ tItem.name }}
                  </text>
                  <text class="wot-font-bold temp-val-color" :style="{ fontSize: '24rpx' }">{{ tItem.value }}°C</text>
                </view>
              </view>
            </view>
            <view v-else class="wot-py-4">
              <!-- Source: uni_modules/wot-ui/components/wd-empty/wd-empty.vue -->
              <wd-empty image="empty" :description="$t('bms.battery.noData')" />
            </view>
          </view>

          <!-- 单体电压监控卡片 -->
          <view class="md3-panel-card wot-box-border wot-mt-4">
            <view
              class="wot-border-solid wot-border-divider-main wot-border-t-0 wot-border-l-0 wot-border-r-0 wot-border-b-[1.5px] wot-flex wot-items-center wot-justify-between wot-pb-2.5"
            >
              <view class="wot-flex wot-items-center">
                <view class="card-decorator wot-mr-2" :style="{ backgroundColor: activeThemeColor }"></view>
                <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '26rpx' }">
                  {{ $t("bms.params.cellVoltage") }}
                </text>
              </view>
            </view>
            <view class="monitor-body wot-pt-3.5" v-if="isConnected && cellVoltageList.length > 0">
              <!-- 单体电压栅格，使用5列展示以适配多电芯并呈现电池形态 -->
              <view class="wot-grid wot-grid-cols-5 wot-gap-2">
                <view v-for="(vItem, index) in cellVoltageList" :key="index" class="battery-cell-wrap">
                  <view
                    class="battery-cell"
                    :class="{ 'is-max': vItem.isMax, 'is-min': vItem.isMin }"
                    :style="
                      vItem.isMax
                        ? {
                            borderColor: activeThemeColor,
                            backgroundColor: activeThemeColor + '12',
                            '--battery-head-color': activeThemeColor,
                            '--battery-head-border-color': activeThemeColor,
                            '--battery-text-color': activeThemeColor,
                          }
                        : undefined
                    "
                  >
                    <text class="cell-num">
                      {{ vItem.name }}
                    </text>
                    <text class="cell-val">
                      {{ vItem.value }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="wot-py-4">
              <!-- Source: uni_modules/wot-ui/components/wd-empty/wd-empty.vue -->
              <wd-empty image="empty" :description="$t('bms.battery.noData')" />
            </view>
          </view>

          <!-- BMS 安全保护状态列表卡片 -->
          <view class="md3-panel-card wot-box-border wot-mt-4">
            <view
              class="wot-border-solid wot-border-divider-main wot-border-t-0 wot-border-l-0 wot-border-r-0 wot-border-b-[1.5px] wot-flex wot-items-center wot-justify-between wot-pb-2.5"
            >
              <view class="wot-flex wot-items-center">
                <view class="card-decorator wot-mr-2" :style="{ backgroundColor: activeThemeColor }"></view>
                <text class="wot-font-bold wot-text-text-main" :style="{ fontSize: '26rpx' }">
                  {{ $t("bms.protect.title") }}
                </text>
              </view>
            </view>
            <view class="wot-flex wot-flex-col wot-gap-3 wot-pt-3.5">
              <view class="wot-flex wot-items-center wot-justify-between">
                <view class="wot-flex wot-items-center">
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-shield-flash-line" size="18px" color="#10b981" class="wot-mr-2" />
                  <text class="wot-text-sm wot-text-text-secondary">{{ $t("bms.protect.overTemp") }}</text>
                </view>
                <view
                  :class="isConnected ? 'badge-success-outline' : 'badge-neutral-outline'"
                  class="wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-xs wot-font-bold"
                >
                  {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
                </view>
              </view>
              <view class="wot-flex wot-items-center wot-justify-between">
                <view class="wot-flex wot-items-center">
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-shield-flash-line" size="18px" color="#10b981" class="wot-mr-2" />
                  <text class="wot-text-sm wot-text-text-secondary">{{ $t("bms.protect.overVolt") }}</text>
                </view>
                <view
                  :class="isConnected ? 'badge-success-outline' : 'badge-neutral-outline'"
                  class="wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-xs wot-font-bold"
                >
                  {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
                </view>
              </view>
              <view class="wot-flex wot-items-center wot-justify-between">
                <view class="wot-flex wot-items-center">
                  <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                  <wd-icon css-icon="i-ri-shield-keyhole-line" size="18px" color="#10b981" class="wot-mr-2" />
                  <text class="wot-text-sm wot-text-text-secondary">{{ $t("bms.protect.shortCircuit") }}</text>
                </view>
                <view
                  :class="isConnected ? 'badge-success-outline' : 'badge-neutral-outline'"
                  class="wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-xs wot-font-bold"
                >
                  {{ isConnected ? $t("bms.protect.normal") : $t("bms.protect.unmonitored") }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script module="navbarWxs" lang="wxs">
function onScroll(event, ownerInstance) {
  var scrollTop = event.detail.scrollTop;
  var dataset = event.currentTarget.dataset;

  var targetScroll = dataset.targetScroll || 0;
  var navbarHeight = dataset.navbarHeight || 0;
  var isDark = dataset.theme === "dark";

  // 1. 计算导航栏背景及标题的透明度 navbarOpacity
  // 起点设定为 80px，终点设定在吸顶（targetScroll）前 40px，确保吸顶瞬间导航栏早已涂实，抵消穿透
  var startFade = 80;
  var endFade = targetScroll - 40;
  if (endFade <= startFade) {
    endFade = startFade + 40;
  }

  var navbarOpacity = 0;
  if (scrollTop > startFade) {
    if (scrollTop >= endFade) {
      navbarOpacity = 1;
    } else {
      var t = (scrollTop - startFade) / (endFade - startFade);
      navbarOpacity = t * t * (3 - 2 * t);
    }
  }

  // 2. 修改导航栏底色遮罩背景色
  var bgOverlay = ownerInstance.selectComponent(".navbar-bg-overlay");
  if (bgOverlay) {
    var bg = isDark ? "rgba(15, 23, 42, " + navbarOpacity + ")" : "rgba(246, 248, 252, " + navbarOpacity + ")";
    bgOverlay.setStyle({
      "background-color": bg,
    });
  }

  // 3. 修改导航栏标题的透明度
  var navbarTitle = ownerInstance.selectComponent(".navbar-title-target");
  if (navbarTitle) {
    navbarTitle.setStyle({
      opacity: navbarOpacity,
    });
  }

  // 4. 修改上半部分淡出内容的透明度
  // 保持典雅的慢速淡出曲线，淡出区间为原本的 80px 至 200px
  var startFadeHeader = 80;
  var endFadeHeader = 200;
  var headerContentOpacity = 1;
  if (scrollTop > startFadeHeader) {
    if (scrollTop >= endFadeHeader) {
      headerContentOpacity = 0;
    } else {
      var tHeader = (scrollTop - startFadeHeader) / (endFadeHeader - startFadeHeader);
      headerContentOpacity = 1 - tHeader * tHeader * (3 - 2 * tHeader);
    }
  }
  var headerContent = ownerInstance.selectComponent(".header-content-target");
  if (headerContent) {
    headerContent.setStyle({
      opacity: headerContentOpacity,
    });
  }

  // 5. 滑动模式下的过渡遮罩透明度
  var scrollHeaderMaskOpacity = 0;
  if (targetScroll > 0 && scrollTop > 0) {
    if (scrollTop >= targetScroll) {
      scrollHeaderMaskOpacity = 1;
    } else {
      var tMask = scrollTop / targetScroll;
      scrollHeaderMaskOpacity = tMask * tMask * (3 - 2 * tMask);
    }
  }
  var headerMask = ownerInstance.selectComponent(".header-mask-target");
  if (headerMask) {
    headerMask.setStyle({
      opacity: scrollHeaderMaskOpacity,
    });
  }

  // 6. 蓝牙状态栏的圆角和 padding
  var startSticky = targetScroll - 80;
  var endSticky = targetScroll;
  var radius = 16;
  if (scrollTop >= endSticky) {
    radius = 0;
  } else if (scrollTop > startSticky) {
    radius = 16 * (1 - (scrollTop - startSticky) / (endSticky - startSticky));
  }

  var paddingTop = 12;
  if (scrollTop >= endSticky) {
    paddingTop = 8;
  } else if (scrollTop > startSticky) {
    paddingTop = 12 - 4 * ((scrollTop - startSticky) / (endSticky - startSticky));
  }

  var bluetoothSticky = ownerInstance.selectComponent(".bluetooth-sticky-target");
  if (bluetoothSticky) {
    bluetoothSticky.setStyle({
      "border-radius": radius + "px " + radius + "px 0 0",
      "padding-top": paddingTop + "px",
    });
  }
}

module.exports = {
  onScroll: onScroll,
};
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, getCurrentInstance } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import SocDashboard from "@/components/soc-dashboard/soc-dashboard.vue";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useDeviceInfo } from "@/uni_modules/wot-ui/composables/useDeviceInfo";
import { useBleStore } from "@/stores/ble-store";
import { useAppStore } from "@/stores/app";
import { useScanConnect } from "@/composables/use-scan-connect";
import { useAutoConnect } from "@/composables/use-auto-connect";
import { usePulseAnimation } from "@/composables/use-pulse-animation";
import { APP_CONFIG } from "@/config";

// 挂载扫码一键连接的业务交互组合式函数
const { handleScanConnect } = useScanConnect();

// 挂载自动连接业务交互组合式函数
const { triggerAutoConnect } = useAutoConnect();

// 初始化交互弹出组件与国际化翻译实例
const toast = useToast();
const dialog = useDialog();
const { t } = useI18n();

// 获取全局蓝牙 Store 管理器
const bleStore = useBleStore();

// 获取全局应用配置 Store
const appStore = useAppStore();
const { activeThemeColor, actualTheme } = storeToRefs(appStore);

// 联动全局蓝牙连接状态、已连接设备信息及电池物理遥测响应式状态
const {
  isBleConnected: isConnected,
  connectedDeviceName: connectedName,
  connectedDeviceMac: connectedMac,
  isCharging,
  isDischarging,
  batteryPercent,
  totalVoltage,
  realtimeCurrent,
  temperature,
  extendedProtocolData,
} = storeToRefs(bleStore);

// 蓝牙图标呼吸动画脉冲效果
const { pulseStyle, stopPulse } = usePulseAnimation(isConnected);

// scroll-view 受控 scroll-top 重置信号：
// 在 onShow 时短暂赋值为 0 将 scroll-view 物理位置归零，再立即恢复为 -1（非受控）以不阻断用户滚动
const scrollResetTop = ref(-1);

// 组件销毁时清理
onUnmounted(() => {
  stopPulse();
});

// 每次页面显示（Tab 切换回来）时，将 scroll-view 物理位置同步归零，
// 防止 v-show 保活场景下状态与实际位置脱节导致整页偏高的布局 Bug
onShow(() => {
  // 将受控 scroll-top 置 0，触发 scroll-view 物理归零
  scrollResetTop.value = 0;
  // 在下一个 tick 将受控值还原为 -1，恢复自由滚动模式，不持续干扰用户手势
  setTimeout(() => {
    scrollResetTop.value = -1;
  }, 50);
});

// 引入 wot-ui 底层设备信息适配
const { statusBarHeight, navBarTotalHeight } = useDeviceInfo();

// 动态计算系统的导航栏高度
const navbarHeight = computed(() => {
  if (navBarTotalHeight.value && navBarTotalHeight.value > 0) {
    return navBarTotalHeight.value;
  }
  return (statusBarHeight.value || 0) + 44;
});

// 判定当前运行模式是否为单机离线模式
const isOfflineMode = computed(() => APP_CONFIG.APP_MODE === "offline");

// 获取当前组件实例，用以执行物理布局测量
const instance = getCurrentInstance();
const headerHeight = ref(380);

// 动态计算蓝牙卡片吸顶时所需的精确滚动距离，彻底杜绝硬编码误差
const targetScroll = computed(() => {
  return headerHeight.value - navbarHeight.value - 24;
});

// 动态定制顶部区域的大背景渐变，亮暗色下将渐变色起终点进行对调，高雅对比
const headerBgStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  const themeColor = activeThemeColor.value;
  return {
    background: isDark
      ? `linear-gradient(135deg, ${themeColor}22 0%, #0f172a 100%)`
      : `linear-gradient(135deg, #f4f8fc 0%, ${themeColor}0a 35%, ${themeColor}30 100%)`,
  };
});

watch(
  actualTheme,
  (theme) => {
    // #ifdef MP-WEIXIN || APP-PLUS
    uni.setNavigationBarColor({
      frontColor: theme === "dark" ? "#ffffff" : "#000000",
      backgroundColor: "#000000",
    });
    // #endif
  },
  { immediate: true },
);

// 动态计算导航栏内容颜色，仅在彻底接触吸顶的瞬间触发黑白反色
const navbarContentColor = computed(() => {
  const isDark = actualTheme.value === "dark";
  if (isDark) {
    return "#ffffff";
  }
  return "#1d1f29";
});

// 动态计算下半部分容器的样式（仅处理背景色以与蓝牙状态栏无缝拼接）
const scrollBottomContainerStyle = computed(() => {
  const isDark = actualTheme.value === "dark";
  return {
    backgroundColor: isDark ? "#0f172a" : "#f6f8fc",
  };
});

// 动态提取并拼接温度数据列表
const temperatureList = computed(() => {
  const list: { name: string; value: number }[] = [];
  if (temperature.value && Array.isArray(temperature.value)) {
    temperature.value.forEach((val, idx) => {
      if (val !== undefined && val !== 0) {
        list.push({
          name: "T" + (idx + 1),
          value: val,
        });
      }
    });
  }
  if (extendedProtocolData.value?.mosTemperature !== undefined && extendedProtocolData.value.mosTemperature !== 0) {
    list.push({
      name: "MOS",
      value: extendedProtocolData.value.mosTemperature,
    });
  }
  if (extendedProtocolData.value?.envTemperature !== undefined && extendedProtocolData.value.envTemperature !== 0) {
    list.push({
      name: t("bms.params.envTempShort"),
      value: extendedProtocolData.value.envTemperature,
    });
  }
  return list;
});

// 动态提取并格式化单体电压列表 (mV 单位)
const cellVoltageList = computed(() => {
  if (!extendedProtocolData.value?.cellVoltages) return [];
  const rawVolts = extendedProtocolData.value.cellVoltages;
  const validVolts = rawVolts.filter((v) => v > 0);
  if (validVolts.length === 0) return [];
  const maxVolt = Math.max(...validVolts);
  const minVolt = Math.min(...validVolts);
  const hasDiff = maxVolt !== minVolt;

  // 确保最高与最低在全图中有且仅有唯一一个高亮（锁定首个极值索引）
  const firstMaxIdx = rawVolts.indexOf(maxVolt);
  const firstMinIdx = rawVolts.indexOf(minVolt);

  return rawVolts.map((volt, idx) => ({
    name: `#${String(idx + 1).padStart(2, "0")}`,
    value: volt > 0 ? volt + " mV" : "--",
    isMax: hasDiff && idx === firstMaxIdx && volt > 0,
    isMin: hasDiff && idx === firstMinIdx && volt > 0,
  }));
});

// 处理连接/断开蓝牙按钮点击事件
const toggleConnection = () => {
  if (!isConnected.value) {
    uni.navigateTo({
      url: "/pages/ble-search/index",
    });
  } else {
    dialog
      .confirm({
        title: t("bms.common.prompt"),
        msg: t("bms.ble.disconnectConfirmPrefix") + connectedName.value + t("bms.ble.disconnectConfirmSuffix"),
        zIndex: 2000,
      })
      .then(async () => {
        try {
          await bleStore.disconnectDevice();
          toast.show({ msg: t("bms.ble.disconnectSuccess") });
        } catch (e) {
          console.error("断开蓝牙连接出现异常:", e);
        }
      })
      .catch(() => {});
  }
};

// 切换充电 MOS 开关状态
const toggleCharge = async (e: any) => {
  const nextVal = e.value;
  try {
    toast.loading({ msg: t("bms.control.sending"), cover: true });
    await bleStore.sendControlCommand("charge", nextVal);
    toast.success(t("bms.control.chargeSuccess"));
  } catch (err: any) {
    console.error("充电开关指令下发失败:", err);
    toast.error(err.message || t("bms.control.sendFailed"));
  } finally {
    toast.close();
  }
};

// 切换放电 MOS 开关状态
const toggleDischarge = async (e: any) => {
  const nextVal = e.value;
  try {
    toast.loading({ msg: t("bms.control.sending"), cover: true });
    await bleStore.sendControlCommand("discharge", nextVal);
    toast.success(t("bms.control.dischargeSuccess"));
  } catch (err: any) {
    console.error("放电开关指令下发失败:", err);
    toast.error(err.message || t("bms.control.sendFailed"));
  } finally {
    toast.close();
  }
};

// 监听全局蓝牙连接成功状态
watch(isConnected, (newVal) => {
  if (newVal) {
    toast.success(t("bms.ble.connectSuccess"));
  }
});

// 电池 SOC 百分比
const socPercent = computed(() => {
  return isConnected.value ? batteryPercent.value || 0 : 0;
});

// 剩余容量
const remainCap = computed(() => {
  if (!isConnected.value) return "-- Ah";
  const nominal = extendedProtocolData.value?.fullCapacity || 100;
  const current = (socPercent.value / 100) * nominal;
  return `${current.toFixed(1)} Ah`;
});

// 健康度 SOH 显示
const sohDisplay = computed(() => {
  if (!isConnected.value) return "-- %";
  return `${extendedProtocolData.value?.soh || 100} %`;
});

// 循环次数显示
const cycleCountDisplay = computed(() => {
  if (!isConnected.value) return "--";
  return `${extendedProtocolData.value?.cycleCount || 0}`;
});

// 运行总时长显示
const runTimeStr = computed(() => {
  if (!isConnected.value) return "--";
  const days = extendedProtocolData.value?.runTimeDays ?? 0;
  const hours = extendedProtocolData.value?.runTimeHours ?? 0;
  const minutes = extendedProtocolData.value?.runTimeMinutes ?? 0;
  if (days === 0 && hours === 0 && minutes === 0) {
    return "0" + t("bms.common.minute");
  }
  let str = "";
  if (days > 0) str += `${days}${t("bms.common.day")} `;
  if (hours > 0 || days > 0) str += `${hours}${t("bms.common.hour")} `;
  str += `${minutes}${t("bms.common.minute")}`;
  return str;
});

onMounted(() => {
  triggerAutoConnect();
  // 延迟一小段时间，确保布局完全就绪后，动态测量上半部分包装器的实际高度
  setTimeout(() => {
    uni
      .createSelectorQuery()
      .in(instance)
      .select(".scroll-header-wrap")
      .boundingClientRect((rect: any) => {
        if (rect && rect.height) {
          headerHeight.value = rect.height;
        }
      })
      .exec();
  }, 100);
});
</script>

<style scoped lang="scss">
.scroll-page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f6f8fc;

  &.theme-dark {
    background-color: #0f172a !important;
  }
}

/* 滚动模式专属样式 */
.scroll-mode-layout {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  touch-action: pan-y;
}

.scroll-header-wrap {
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.scroll-header-bg {
  width: 100%;
  padding-bottom: 24rpx;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.15);
  box-sizing: border-box;
}

.scroll-header-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* 穿透触摸 */
  z-index: 2; /* 盖在大背景最上层 */
}

.scroll-bottom-container {
  width: 100%;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  z-index: 3;
  margin-top: 0;
}

.scroll-body-content {
  width: 100%;
  box-sizing: border-box;
  background-color: transparent;
}

:deep(.wd-navbar) {
  background-color: transparent !important;
  border-bottom: none !important;
  /* 背景色始终实色，无需过渡动画，移除 transition 避免无效开销 */
  .wd-navbar__title {
    font-weight: bold;
    font-size: 28rpx;
    transition: color 0.3s ease !important;
  }
  .wd-navbar__left {
    transition: color 0.3s ease !important;
  }
  uni-text,
  text,
  .wd-icon {
    transition: color 0.3s ease !important;
  }
}

.navbar-placeholder {
  height: calc(var(--status-bar-height) + 44px);
}

.sticky-bluetooth-wrapper {
  position: sticky;
  left: 0;
  right: 0;
  z-index: 10;
  /* border-radius 与 padding 已完全由 stickyBluetoothStyle 内联样式实时差值驱动，CSS 中仅保留结构定位属性 */
  box-sizing: border-box;
  margin-top: -24px;
  /* 移除 transition 和 will-change，圆角和间距变化已为逐帧跟手，无需过渡补帧 */
  box-shadow: none;
}

.bluetooth-status-panel {
  background-color: var(--wot-filled-oppo, #ffffff);
  border: 1px solid var(--wot-border-light, #eef2f6);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.status-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.bg-primary-light {
  background-color: var(--wot-color-theme-light, rgba(28, 110, 255, 0.12));
}

.bg-success-light {
  background-color: var(--wot-color-success-light, rgba(16, 185, 129, 0.12));
}

.bg-warning-light {
  background-color: var(--wot-color-warning-light, rgba(245, 158, 11, 0.12));
}

.bg-info-light {
  background-color: rgba(6, 182, 212, 0.12);
}

.bg-neutral-light {
  background-color: var(--wot-filled-content, #f2f3f5);
}

.telemetry-panel {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.theme-light {
  .telemetry-panel {
    background: rgba(255, 255, 255, 0.75) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.9) !important;
    box-shadow:
      0 10px 25px -4px rgba(148, 163, 184, 0.18),
      inset 0 2px 4px rgba(255, 255, 255, 0.6) !important;
  }
  .telemetry-value {
    color: #0f172a !important;
  }
  .telemetry-unit {
    color: #475569 !important;
  }
  .telemetry-label {
    color: #475569 !important;
    opacity: 0.85 !important;
  }
  .telemetry-icon-wrapper {
    background-color: rgba(37, 99, 235, 0.08) !important;
  }
  .telemetry-divider {
    background-color: rgba(148, 163, 184, 0.18) !important;
  }
}

.telemetry-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.12);
}

.telemetry-value {
  font-size: 38rpx;
  line-height: 1.1;
}

.telemetry-unit {
  font-size: 24rpx;
  margin-left: 2rpx;
  font-weight: 500;
}

.telemetry-label {
  font-size: 20rpx;
  margin-top: 4rpx;
}

.telemetry-divider {
  width: 1px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.18);
}

.drawer-handle {
  width: 100%;
  height: 4px;
  padding: 14px 0 8px;
  box-sizing: content-box;
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform, opacity;
}

.md3-metric-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
  &:active {
    transform: scale(0.96);
    background-color: var(--wot-filled-content, #f2f3f5);
  }
}

.card-icon-wrapper {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.metric-label {
  font-size: 18rpx;
}

.metric-value {
  font-size: 22rpx;
}

.md3-switch-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
  &.is-active {
    background: linear-gradient(135deg, rgba(28, 110, 255, 0.04) 0%, rgba(28, 110, 255, 0.08) 100%);
    border-color: rgba(28, 110, 255, 0.25);
    box-shadow: 0 4px 12px rgba(28, 110, 255, 0.05);
  }
}

.control-icon-wrapper {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.md3-panel-card {
  background-color: var(--wot-filled-oppo, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--wot-border-light, #eef2f6);
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  box-sizing: border-box;
}

.card-decorator {
  width: 6rpx;
  height: 26rpx;
  border-radius: 99px;
  flex-shrink: 0;
}

.temp-item-pill {
  background-color: var(--wot-filled-content, #f2f3f5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
}

.battery-cell-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 8rpx; /* 为右侧凸起留出空间 */
  width: 100%;
}

.battery-cell {
  position: relative;
  width: 100%;
  height: 72rpx; /* 恢复为饱满舒适的 72rpx 高度 */
  border: 1px solid var(--wot-border-light, #eef2f6);
  border-radius: 6px;
  background-color: var(--wot-filled-content, #f2f3f5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
  padding-right: 4rpx; /* 轻微右偏移以补偿右极耳占位 */

  /* 电池正极凸起头（右侧） */
  &::before {
    content: "";
    position: absolute;
    right: -7rpx; /* 移出以保持轮廓清晰 */
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx; /* 调大凸起使默认状态更加显眼 */
    height: 35%;
    background-color: var(--battery-head-color, var(--wot-filled-content, #f2f3f5));
    border: 1px solid var(--battery-head-border-color, var(--wot-border-light, #eef2f6));
    border-left: none; /* 与主体融合，凸显电池外观 */
    border-radius: 0 3px 3px 0;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .cell-num {
    font-size: 16rpx;
    color: var(--battery-text-color, var(--wot-color-secondary, #858585));
    line-height: 1.1;
    font-weight: 500;
  }

  .cell-val {
    font-size: 18rpx;
    font-weight: bold;
    color: var(--battery-text-color, var(--wot-color-title, #1d1f29));
    line-height: 1.1;
    margin-top: 2rpx;
    font-family: ui-monospace, SFMono-Regular, monospace;
  }

  /* 最高电压高亮样式 (使用自定义主题色，已由 :style 覆盖 border 和 bg) */
  &.is-max {
    box-shadow: 0 0 8rpx rgba(28, 110, 255, 0.1);

    .cell-num {
      font-weight: bold;
    }
  }

  /* 最低电压高亮样式 */
  &.is-min {
    border-color: var(--wot-color-danger, #fa4350);
    background-color: var(--wot-color-danger-light, rgba(250, 67, 80, 0.08));
    box-shadow: 0 0 8rpx rgba(250, 67, 80, 0.1);

    &::before {
      background-color: var(--wot-color-danger, #fa4350);
      border-color: var(--wot-color-danger, #fa4350);
    }

    .cell-num {
      color: var(--wot-color-danger, #fa4350);
      font-weight: bold;
    }

    .cell-val {
      color: var(--wot-color-danger, #fa4350);
    }
  }
}

.temp-val-color {
  color: #10b981;
}

.badge-success-outline {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #10b981;
}

.badge-neutral-outline {
  background-color: var(--wot-filled-content, #f2f3f5);
  border: 1px solid var(--wot-border-light, #eef2f6);
  color: #858585;
}

.monospace {
  font-family:
    ui-monospace,
    SFMono-Regular,
    SF Mono,
    Menlo,
    Monaco,
    Consolas,
    monospace;
}
</style>
