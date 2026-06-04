<template>
  <view>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar :title="$t('bms.mine.title')" fixed safe-area-inset-top />

    <!-- 用户个人中心头部卡片 -->
    <view class="tab-content-wrap wot-px-3 wot-py-4 page-body-animate">
      <view
        class="user-card wot-bg-filled-oppo wot-rounded-2xl wot-p-3.5 wot-shadow-sm wot-mb-4 wot-flex wot-items-center wot-justify-between"
        @click="handleUserCardClick"
        v-if="!isOfflineMode"
      >
        <view class="wot-flex wot-items-center wot-gap-4">
          <!-- 根据登录状态和模式动态变化头像底色与小图标 -->
          <view
            :class="[isOfflineMode ? 'wot-bg-slate-100' : isLoggedIn ? 'wot-bg-primary/10' : 'wot-bg-orange-50']"
            class="wot-w-16 wot-h-16 wot-rounded-full wot-flex wot-items-center wot-justify-center"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon
              :css-icon="isOfflineMode ? 'i-lucide-user' : isLoggedIn ? 'i-lucide-user-check' : 'i-lucide-user'"
              size="36px"
              :color="isOfflineMode ? '#858585' : isLoggedIn ? activeThemeColor : '#ff9900'"
            />
          </view>

          <!-- 用户名与ID标识区 -->
          <view class="wot-flex wot-flex-col">
            <text class="wot-text-title-large wot-text-text-main wot-font-bold">
              {{ userDisplayName }}
            </text>
            <text class="wot-text-caption wot-text-text-secondary wot-mt-1">
              {{ userDisplayId }}
            </text>
          </view>
        </view>

        <!-- 模式徽章胶囊（云端已联 / 单机离线 / 去登录） -->
        <view>
          <!-- 单机离线标签 -->
          <view
            v-if="isOfflineMode"
            class="wot-bg-slate-100 wot-text-slate-600 wot-border wot-border-slate-200/50 wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-caption wot-flex wot-items-center wot-gap-1 wot-font-semibold"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-cloud-off" size="12px" />
            <text>{{ $t("bms.mine.offlineMode") }}</text>
          </view>

          <!-- 云端已联标签 -->
          <view
            v-else-if="isLoggedIn"
            class="wot-bg-green-50 wot-text-green-700 wot-border wot-border-green-200/50 wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-caption wot-flex wot-items-center wot-gap-1 wot-font-semibold"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-cloud" size="12px" />
            <text>{{ $t("bms.mine.cloudOnline") }}</text>
          </view>

          <!-- 去登录标签 -->
          <view
            v-else
            class="wot-bg-orange-50 wot-text-orange-700 wot-border wot-border-orange-200/50 wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-caption wot-flex wot-items-center wot-gap-1 wot-font-semibold"
          >
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-user-x" size="12px" />
            <text>{{ $t("bms.mine.clickToLogin") }}</text>
          </view>
        </view>
      </view>

      <!-- 系统设置项单元格列表 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <!-- Source: uni_modules/wot-ui/components/wd-cell-group/wd-cell-group.vue -->
        <wd-cell-group border custom-class="custom-settings-group">
          <!-- 手动切换语言的单元格 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell
            :title="$t('bms.mine.language')"
            :value="currentLanguageLabel"
            is-link
            @click="showLanguagePicker = true"
          >
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-globe" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 现代化主题模式设置，Google 分段选择卡片设计 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.themeMode')" center custom-class="compact-cell">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-palette" size="20px" class="wot-mr-2" color="#858585" />
            </template>
            <view class="wot-flex wot-justify-end">
              <!-- Source: uni_modules/wot-ui/components/wd-segmented/wd-segmented.vue -->
              <wd-segmented
                v-model:value="themeMode"
                :options="themeOptions"
                @change="handleThemeModeChange"
                custom-style="width: 160px"
                custom-class="custom-segmented"
              >
                <!-- 自定义分段器选项的插槽渲染，在选项中增加对应图标 -->
                <template #label="{ option }">
                  <view class="wot-flex wot-items-center wot-justify-center wot-py-0.5">
                    <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
                    <wd-icon :css-icon="getThemeIcon(option.value)" size="18px" />
                  </view>
                </template>
              </wd-segmented>
            </view>
          </wd-cell>

          <!-- 自动连接设置单元格 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.autoConnect')" center custom-class="compact-cell">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-zap" size="20px" class="wot-mr-2" color="#858585" />
            </template>
            <!-- Source: uni_modules/wot-ui/components/wd-switch/wd-switch.vue -->
            <wd-switch v-model="autoConnectEnabled" @change="handleAutoConnectChange" size="20px" />
          </wd-cell>

          <!-- 项目配置入口单元格：点击跳转至独立的设置页面 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.settings.title')" is-link @click="navigateToSettings">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-settings" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 系统权限诊断入口单元格：点击跳转至独立的诊断页面 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.permissionsTitle')" is-link @click="navigateToPermissionCheck">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-shield-check" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 设备授权激活单元格：跳转至独立的授权激活页面 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.auth.title')" :value="authStateLabel" is-link @click="navigateToAuth">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-ri-shield-keyhole-line" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 当前应用的版本信息单元格，点击可主动负责检测升级 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.appVersion')" :value="appVersionDisplay" is-link @click="checkUpdate">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-info" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 固件升级入口单元格：跳转至固件写入页面 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.firmware.title')" is-link @click="navigateToFirmwareUpdate">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-cpu" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 系统日志入口单元格，仅在解锁时显示 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell v-if="isSystemLogsUnlocked" :title="$t('bms.mine.systemLogs')" is-link @click="navigateToSystemLogs">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-scroll-text" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 安全退出登录单元格：仅在云端联机且已登录时展现 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell v-if="!isOfflineMode && isLoggedIn" :title="$t('bms.mine.logout')" is-link @click="handleLogout">
            <template #prefix>
              <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
              <wd-icon css-icon="i-lucide-log-out" size="20px" class="wot-mr-2" color="#d54941" />
            </template>
          </wd-cell>
        </wd-cell-group>
      </view>
    </view>

    <!-- 语言选择的动作面板弹出层组件，双向绑定 showLanguagePicker 控制显隐，开启 root-portal 与高 z-index 防止被自定义 Tabbar 遮挡 -->
    <wd-action-sheet
      v-model="showLanguagePicker"
      :actions="languageActions"
      :cancel-text="$t('bms.common.cancel')"
      :title="$t('bms.common.selectLanguage')"
      root-portal
      :z-index="150"
      @select="handleLanguageSelect"
    />

    <!-- 显式挂载 toast 实例，防止 useToast() 弹窗失效 -->
    <wd-toast />
    <!-- Source: uni_modules/wot-ui/components/wd-dialog/wd-dialog.vue -->
    <wd-dialog />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@/uni_modules/wot-ui";
import { useAppStore } from "@/stores/app";
import { useUserStore } from "@/stores/user";
import { useLogStore } from "@/stores/log-store";
import { storeToRefs } from "pinia";
import { APP_CONFIG } from "@/config";
import { onLoad } from "@dcloudio/uni-app";

// 获取国际化和消息提示 hooks、对话框 hooks 以及全局 appStore 状态实例
const { locale, t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();
const logStore = useLogStore();
const toast = useToast();
const dialog = useDialog();

// 如果直接作为独立页面加载（比如外部回跳），则自动重定向至主 Shell 页面的“我的”标签页以防布局错乱
onLoad(() => {
  try {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.route === "pages/mine/index") {
        uni.reLaunch({
          url: "/pages/index/index?tab=mine",
        });
      }
    }
  } catch (e) {
    console.error("检测当前页面路由失败:", e);
  }
});

// 解构状态仓中的身份凭证、资料和激活截止时间
const { token, userInfo, isAuthorized } = storeToRefs(userStore);
const { isSystemLogsUnlocked, passwordPromptTrigger } = storeToRefs(logStore);

// 自动连接开关状态的响应式状态，默认从本地缓存初始化
const autoConnectEnabled = ref(!!uni.getStorageSync("auto_connect_enabled"));

// 自动连接开关变更时的回调函数，持久化状态至本地缓存
const handleAutoConnectChange = ({ value }: { value: boolean }) => {
  uni.setStorageSync("auto_connect_enabled", value);
};

// 响应式解构 appStore 中的明暗主题状态，符合规范
const { theme, activeThemeColor } = storeToRefs(appStore);

// 双向绑定分段器选中的当前主题模式值，以保障多端切换的顺畅与同步
const themeMode = ref(theme.value);

// 监听全局主题状态变化，同步分段器的值
watch(theme, (newVal) => {
  themeMode.value = newVal;
});

// 选项列表数据定义，支持国际化
const themeOptions = computed(() => [
  { value: "light", label: t("bms.mine.themeLight") },
  { value: "dark", label: t("bms.mine.themeDark") },
  { value: "system", label: t("bms.mine.themeSystem") },
]);

// 获取各个主题对应图标的辅助函数
const getThemeIcon = (val: string | number) => {
  if (val === "light") return "i-lucide-sun";
  if (val === "dark") return "i-lucide-moon";
  return "i-lucide-smartphone";
};

// 切换主题模式的回调，触发 Pinia
const handleThemeModeChange = (option: { value: "light" | "dark" | "system" }) => {
  appStore.setTheme(option.value);
};

// 控制语言选择动作面板显隐的响应式状态
const showLanguagePicker = ref(false);

// 语言可选项数据列表定义，通过计算属性动态拼装以支持完全零硬编码中文字符和实时翻译
const languageActions = computed(() => [
  { name: t("bms.mine.chinese"), value: "zh-Hans" },
  { name: t("bms.mine.traditional"), value: "zh-Hant" },
  { name: t("bms.mine.english"), value: "en" },
]);

// 计算属性：当前选中语言在单元格右侧的显示标签文案，使用翻译辅助函数规避任何硬编码字符
const currentLanguageLabel = computed(() => {
  if (appStore.locale === "zh-Hans") return t("bms.mine.chinese");
  if (appStore.locale === "zh-Hant") return t("bms.mine.traditional");
  return t("bms.mine.english");
});

// 处理语言选择确认的回调逻辑
const handleLanguageSelect = ({ item }: { item: { name: string; value: "zh-Hans" | "zh-Hant" | "en" } }) => {
  const selectedLocale = item.value;

  if (appStore.locale !== selectedLocale) {
    // 1. 更新全局状态、本地缓存和内置语言设置
    appStore.setLocale(selectedLocale);

    // 2. 同步当前页面的语言实例值
    locale.value = selectedLocale;

    // 3. 弹出修改成功的信息提示，提示完毕后重新拉起应用彻底刷新以让新语言生效
    toast.success({
      msg: t("bms.mine.switchSuccess"),
      duration: 1000,
      closed: () => {
        // 在 SPA 模式下，直接刷新当前页面即可
        uni.reLaunch({
          url: "/pages/index/index?tab=mine",
        });
      },
    });
  }
};

// ------------------------------------------------------------
// 页面路由跳转逻辑
// ------------------------------------------------------------

/**
 * 点击配置项，直接跳转至独立的系统配置页
 */
const navigateToSettings = () => {
  uni.navigateTo({
    url: "/pages/mine/settings",
  });
};

/**
 * 点击系统权限诊断，跳转至独立的权限诊断大页
 */
const navigateToPermissionCheck = () => {
  uni.navigateTo({
    url: "/pages/mine/permission-check",
  });
};

// 计算属性：分平台自适应获取当前应用的真实版本号，并加妥善兜底
const appVersionDisplay = computed(() => {
  let version = "v1.0.0"; // 默认的起步版本号

  // #ifdef MP-WEIXIN
  try {
    const accountInfo = uni.getAccountInfoSync();
    if (accountInfo.miniProgram && accountInfo.miniProgram.version) {
      version = "v" + accountInfo.miniProgram.version;
    } else if (accountInfo.miniProgram && accountInfo.miniProgram.envVersion) {
      const envNames: Record<string, string> = {
        develop: t("bms.mine.envDevelop"),
        trial: t("bms.mine.envTrial"),
        release: t("bms.mine.envRelease"),
      };
      version = envNames[accountInfo.miniProgram.envVersion] || "v1.0.0";
    }
  } catch (e) {
    console.error("获取微信小程序版本号失败:", e);
  }
  // #endif

  // #ifdef APP-PLUS
  try {
    if (typeof plus !== "undefined" && plus.runtime && plus.runtime.version) {
      version = "v" + plus.runtime.version;
    }
  } catch (e) {
    console.error("获取移动端版本号失败:", e);
  }
  // #endif

  return version;
});

// 分平台自适应的版本检测升级函数
const checkUpdate = () => {
  if (APP_CONFIG.APP_MODE === "offline") {
    toast.show({ msg: t("bms.mine.updateUnsupported") });
    return;
  }

  // #ifdef MP-WEIXIN
  try {
    toast.show({ msg: t("bms.mine.checking"), duration: 1500 });
    const updateManager = uni.getUpdateManager();
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        toast.show({ msg: t("bms.mine.newVersionFound"), duration: 2500 });
      } else {
        toast.show({ msg: t("bms.mine.alreadyLatest"), duration: 2000 });
      }
    });
  } catch (e) {
    console.error("微信小程序版本检测异常:", e);
    toast.show({ msg: t("bms.mine.updateFailed") });
  }
  // #endif

  // #ifdef APP-PLUS
  toast.show({ msg: t("bms.mine.checking"), duration: 1500 });
  setTimeout(() => {
    toast.show({ msg: t("bms.mine.alreadyLatest"), duration: 2000 });
  }, 1200);
  // #endif
};

// 计算属性：动态编排当前已连接设备之激活授权指示标签
const authStateLabel = computed(() => {
  return isAuthorized.value ? t("bms.auth.statusAuthorized") : t("bms.auth.statusUnAuthorized");
});

/**
 * 点击设备授权激活，跳转至独立的授权激活页面
 */
const navigateToAuth = () => {
  uni.navigateTo({
    url: "/pages/mine/auth",
  });
};

// 监听密码输入弹窗触发事件
watch(passwordPromptTrigger, (newVal) => {
  if (newVal > 0) {
    showPasswordPrompt();
  }
});

// 显示输入 6 位密码的弹窗
const showPasswordPrompt = () => {
  dialog.prompt({
    title: t("bms.logs.inputPasswordTitle"),
    inputValue: "",
    inputProps: {
      type: "text",
      showPassword: true,
      maxlength: 6,
      placeholder: t("bms.logs.inputPasswordPlaceholder"),
    },
    beforeConfirm: (value: string | number) => {
      if (String(value) === APP_CONFIG.DEBUG_CONFIG.PASSWORD) {
        return true;
      } else {
        toast.error(t("bms.logs.passwordError"));
        return false;
      }
    }
  }).then(() => {
    logStore.unlockSystemLogs();
    toast.success(t("bms.logs.unlocked"));
  }).catch(() => {
    // 用户取消
  });
};

/**
 * 点击固件升级，跳转至固件写入页面
 */
const navigateToFirmwareUpdate = () => {
  uni.navigateTo({
    url: "/pages/mine/firmware-update",
  });
};

// 跳转至系统日志页面
const navigateToSystemLogs = () => {
  uni.navigateTo({
    url: "/pages/mine/system-logs",
  });
};

// 判定当前运行模式是否为单机离线模式
const isOfflineMode = computed(() => APP_CONFIG.APP_MODE === "offline");

// 判定当前是否已处于联机登录状态
const isLoggedIn = computed(() => !!token.value);

// 个人卡片动态显示的展示名
const userDisplayName = computed(() => {
  if (isOfflineMode.value) {
    return t("bms.mine.offlineGuest");
  }
  return isLoggedIn.value
    ? userInfo.value.nickname || userInfo.value.username || t("bms.mine.cloudUser")
    : t("bms.mine.notLoggedIn");
});

// 个人卡片动态显示的标志ID或点击引导
const userDisplayId = computed(() => {
  if (isOfflineMode.value) {
    return "ID: " + t("bms.mine.offlineMode");
  }
  return isLoggedIn.value ? "ID: " + (userInfo.value.userId || "BMS-CLOUD-USER") : t("bms.mine.clickToLogin");
});

// 处理个人中心头像卡片的点击动作
const handleUserCardClick = () => {
  if (isOfflineMode.value) {
    toast.show({
      msg: t("bms.mine.offlineNoLogin"),
    });
    return;
  }

  if (!isLoggedIn.value) {
    dialog
      .confirm({
        title: t("bms.common.prompt"),
        msg: t("bms.mine.cloudLoginPrompt"),
      })
      .then(async () => {
        try {
          toast.loading({ msg: t("bms.mine.checking"), cover: true });
          const res = await userStore.login("BMS_Cloud_User", "******");
          if (res && res.success) {
            toast.success(t("bms.mine.loginSimulate"));
          }
        } catch (e) {
          console.error("模拟登录失败:", e);
        } finally {
          toast.close();
        }
      })
      .catch(() => {
        // 用户取消
      });
  }
};

// 处理退出登录，注销云端账号
const handleLogout = () => {
  dialog
    .confirm({
      title: t("bms.common.prompt"),
      msg: t("bms.mine.logoutConfirm"),
    })
    .then(() => {
      userStore.logout();
    })
    .catch(() => {
      // 用户取消
    });
};
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}

.user-card {
  transition: all 0.2s ease-in-out;
}

/* 通过 CSS 局部变量控制单元格高度对齐，杜绝 :deep 深度覆盖组件库内部类名，完全符合规范 */
.custom-settings-group {
  /* 统一减小默认上下 padding，让普通单元格更紧凑 */
  --wot-cell-padding: 10px 16px;
}

.compact-cell {
  /* 针对包含 Switch 和 Segmented 的单元格进一步缩减 padding，对齐到整体 40px 高度 */
  --wot-cell-padding: 6px 16px;
}

.custom-segmented {
  /* 针对分段器进行尺寸与内边距的微调以对齐 Switch 的高度 */
  --wot-segmented-padding: 2px;
  --wot-segmented-item-padding: 2px 12px;
}

/* 顶部安全区域与自定义导航栏高度自适应占位 */
.tab-content-wrap {
  padding-top: calc(var(--status-bar-height) + 44px + 16px) !important;
}
</style>
