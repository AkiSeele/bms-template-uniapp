<template>
  <view>
    <!-- 自定义顶部导航栏 -->
    <wd-navbar :title="$t('bms.mine.title')" fixed safe-area-inset-top />

    <!-- 用户个人中心头部卡片 -->
    <view class="tab-content-wrap wot-px-3 wot-py-4 page-body-animate" :style="{ 'padding-top': (navbarHeight + 16) + 'px' }">
      <view
        class="user-card wot-bg-filled-oppo wot-rounded-2xl wot-p-3.5 wot-shadow-sm wot-mb-4 wot-flex wot-items-center wot-justify-between"
        @click="handleUserCardClick"
        v-if="!isOfflineMode"
      >
        <view class="wot-flex wot-items-center wot-gap-4">
          <!-- 头像区 -->
          <view
            :class="[isOfflineMode ? 'wot-bg-slate-100' : isLoggedIn ? 'wot-bg-primary/10' : 'wot-bg-orange-50']"
            class="wot-w-16 wot-h-16 wot-rounded-full wot-flex wot-items-center wot-justify-center"
          >
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

        <!-- 模式徽章胶囊 -->
        <view>
          <view
            v-if="isOfflineMode"
            class="wot-bg-slate-100 wot-text-slate-600 wot-border wot-border-slate-200/50 wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-caption wot-flex wot-items-center wot-gap-1 wot-font-semibold"
          >
            <wd-icon css-icon="i-lucide-cloud-off" size="12px" />
            <text>{{ $t("bms.mine.offlineMode") }}</text>
          </view>
          <view
            v-else-if="isLoggedIn"
            class="wot-bg-green-50 wot-text-green-700 wot-border wot-border-green-200/50 wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-caption wot-flex wot-items-center wot-gap-1 wot-font-semibold"
          >
            <wd-icon css-icon="i-lucide-cloud" size="12px" />
            <text>{{ $t("bms.mine.cloudOnline") }}</text>
          </view>
          <view
            v-else
            class="wot-bg-orange-50 wot-text-orange-700 wot-border wot-border-orange-200/50 wot-rounded-full wot-px-2.5 wot-py-0.5 wot-text-caption wot-flex wot-items-center wot-gap-1 wot-font-semibold"
          >
            <wd-icon css-icon="i-lucide-user-x" size="12px" />
            <text>{{ $t("bms.mine.clickToLogin") }}</text>
          </view>
        </view>
      </view>

      <!-- 系统设置项单元格列表 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <wd-cell-group border custom-class="custom-settings-group">
          <!-- 切换语言 -->
          <wd-cell
            :title="$t('bms.mine.language')"
            :value="currentLanguageLabel"
            is-link
            @click="showLanguagePicker = true"
          >
            <template #prefix>
              <wd-icon css-icon="i-lucide-globe" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 主题模式 -->
          <wd-cell :title="$t('bms.mine.themeMode')" center custom-class="compact-cell">
            <template #prefix>
              <wd-icon css-icon="i-lucide-palette" size="20px" class="wot-mr-2" color="#858585" />
            </template>
            <view class="wot-flex wot-justify-end">
              <wd-segmented
                v-if="activeTab === 'mine'"
                v-model:value="themeMode"
                :options="themeOptions"
                @change="handleThemeModeChange"
                custom-style="width: 160px"
                custom-class="custom-segmented"
              >
                <template #label="{ option }">
                  <view class="wot-flex wot-items-center wot-justify-center wot-py-0.5">
                    <wd-icon :css-icon="getThemeIcon(option.value)" size="18px" />
                  </view>
                </template>
              </wd-segmented>
            </view>
          </wd-cell>

          <!-- 自动连接 -->
          <wd-cell :title="$t('bms.mine.autoConnect')" center custom-class="compact-cell">
            <template #prefix>
              <wd-icon css-icon="i-lucide-zap" size="20px" class="wot-mr-2" color="#858585" />
            </template>
            <wd-switch v-model="autoConnectEnabled" @change="handleAutoConnectChange" size="20px" />
          </wd-cell>

          <!-- 项目配置 -->
          <wd-cell :title="$t('bms.settings.title')" is-link @click="navigateToSettings">
            <template #prefix>
              <wd-icon css-icon="i-lucide-settings" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 系统权限诊断 -->
          <wd-cell :title="$t('bms.mine.permissionsTitle')" is-link @click="navigateToPermissionCheck">
            <template #prefix>
              <wd-icon css-icon="i-lucide-shield-check" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 设备授权激活 -->
          <wd-cell :title="$t('bms.auth.title')" :value="authStateLabel" is-link @click="navigateToAuth">
            <template #prefix>
              <wd-icon css-icon="i-ri-shield-keyhole-line" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 固件升级 -->
          <wd-cell :title="$t('bms.firmware.title')" is-link @click="navigateToFirmwareUpdate">
            <template #prefix>
              <wd-icon css-icon="i-lucide-cpu" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 系统日志 -->
          <wd-cell v-if="isSystemLogsUnlocked" :title="$t('bms.mine.systemLogs')" is-link @click="navigateToSystemLogs">
            <template #prefix>
              <wd-icon css-icon="i-lucide-scroll-text" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 调试测试页面 -->
          <wd-cell v-if="isSystemLogsUnlocked" :title="$t('bms.mine.testPage')" is-link @click="navigateToTestPage">
            <template #prefix>
              <wd-icon css-icon="i-lucide-flask-conical" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>

          <!-- 退出登录 -->
          <wd-cell v-if="!isOfflineMode && isLoggedIn" :title="$t('bms.mine.logout')" is-link @click="handleLogout">
            <template #prefix>
              <wd-icon css-icon="i-lucide-log-out" size="20px" class="wot-mr-2" color="#d54941" />
            </template>
          </wd-cell>
        </wd-cell-group>
      </view>

      <!-- 底部备案与版本号 -->
      <view class="mine-footer wot-flex wot-flex-col wot-items-center wot-justify-center wot-mt-8 wot-pb-6">
        <text class="icp-text wot-text-text-auxiliary">
          {{ $t("bms.mine.icpLicense") }}
        </text>
        <view class="version-text wot-mt-1.5 wot-flex wot-items-center wot-text-text-auxiliary">
          <text class="wot-mr-1">{{ $t("bms.mine.appVersion") }}:</text>
          <text v-if="isOfflineMode">{{ appVersionDisplay }}</text>
          <view
            v-else
            class="version-btn-online"
            :class="{ 'version-btn-checking': isChecking }"
            @click="handleVersionClick"
          >
            <text>{{ isChecking ? $t("bms.mine.checking") : appVersionDisplay }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 语言选择弹窗 -->
    <wd-action-sheet
      v-model="showLanguagePicker"
      :actions="languageActions"
      :cancel-text="$t('bms.common.cancel')"
      :title="$t('bms.common.selectLanguage')"
      root-portal
      :z-index="150"
      @select="handleLanguageSelect"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast, useDialog } from "@wot-ui/ui";
import { useDeviceInfo } from "@wot-ui/ui/composables/useDeviceInfo";
import { useAppStore } from "@/stores/app";
import { useUserStore } from "@/stores/user";
import { useLogStore } from "@/stores/log-store";
import { storeToRefs } from "pinia";
import { APP_CONFIG } from "@/config";
import { appVersionService } from "@/service/app-version";
import { onLoad } from "@dcloudio/uni-app";

const { locale, t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();
const logStore = useLogStore();
const toast = useToast();
const dialog = useDialog();

const { statusBarHeight, navBarTotalHeight } = useDeviceInfo();

const navbarHeight = computed(() => {
  const minHeight = (statusBarHeight.value || 0) + 44;
  if (navBarTotalHeight.value && navBarTotalHeight.value >= minHeight) {
    return navBarTotalHeight.value;
  }
  return minHeight;
});

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

const { token, userInfo, isAuthorized } = storeToRefs(userStore);
const { isSystemLogsUnlocked, passwordPromptTrigger } = storeToRefs(logStore);

const autoConnectStorage = uni.getStorageSync("auto_connect_enabled");
const autoConnectEnabled = ref(autoConnectStorage === "" ? APP_CONFIG.AUTO_CONNECT : !!autoConnectStorage);

const handleAutoConnectChange = ({ value }: { value: boolean }) => {
  uni.setStorageSync("auto_connect_enabled", value);
};

const { theme, activeThemeColor, activeTab } = storeToRefs(appStore);

const themeMode = ref(theme.value);

watch(theme, (newVal) => {
  themeMode.value = newVal;
});

const themeOptions = computed(() => [
  { value: "light", label: t("bms.mine.themeLight") },
  { value: "dark", label: t("bms.mine.themeDark") },
  { value: "system", label: t("bms.mine.themeSystem") },
]);

const getThemeIcon = (val: string | number) => {
  if (val === "light") return "i-lucide-sun";
  if (val === "dark") return "i-lucide-moon";
  return "i-lucide-smartphone";
};

const handleThemeModeChange = (option: { value: "light" | "dark" | "system" }) => {
  appStore.setTheme(option.value);
};

const showLanguagePicker = ref(false);

const languageActions = computed(() => [
  { name: t("bms.mine.chinese"), value: "zh-Hans" },
  { name: t("bms.mine.traditional"), value: "zh-Hant" },
  { name: t("bms.mine.english"), value: "en" },
]);

const currentLanguageLabel = computed(() => {
  if (appStore.locale === "zh-Hans") return t("bms.mine.chinese");
  if (appStore.locale === "zh-Hant") return t("bms.mine.traditional");
  return t("bms.mine.english");
});

const handleLanguageSelect = ({ item }: { item: { name: string; value: "zh-Hans" | "zh-Hant" | "en" } }) => {
  const selectedLocale = item.value;
  if (appStore.locale !== selectedLocale) {
    appStore.setLocale(selectedLocale);
    locale.value = selectedLocale;
    toast.success({
      msg: t("bms.mine.switchSuccess"),
      duration: 1000,
      closed: () => {
        uni.reLaunch({
          url: "/pages/index/index?tab=mine",
        });
      },
    });
  }
};

const navigateToSettings = () => {
  uni.navigateTo({
    url: "/pagesSub/mine/settings",
  });
};

const navigateToPermissionCheck = () => {
  uni.navigateTo({
    url: "/pagesSub/mine/permission-check",
  });
};

const appVersionDisplay = computed(() => {
  return appVersionService.getAppVersion(t);
});

const isChecking = ref(false);

const handleVersionClick = () => {
  // 点击版本号也计入连续点击统计，方便在个人中心直接连击 5 次版本号触发密码输入框
  logStore.recordMineTabClick();
  if (isOfflineMode.value || isChecking.value) return;
  checkUpdate();
};

const checkUpdate = async () => {
  if (APP_CONFIG.APP_MODE === "offline" || isChecking.value) {
    return;
  }
  isChecking.value = true;
  try {
    await appVersionService.checkAppUpdate(toast, t);
  } finally {
    isChecking.value = false;
  }
};

const authStateLabel = computed(() => {
  return isAuthorized.value ? t("bms.auth.statusAuthorized") : t("bms.auth.statusUnAuthorized");
});

const navigateToAuth = () => {
  uni.navigateTo({
    url: "/pagesSub/mine/auth",
  });
};

watch(passwordPromptTrigger, (newVal) => {
  if (newVal > 0) {
    showPasswordPrompt();
  }
});

const showPasswordPrompt = () => {
  dialog
    .prompt({
      title: t("bms.logs.inputPasswordTitle"),
      inputValue: "",
      zIndex: 3000,
      inputProps: {
        type: "text",
        showPassword: true,
        maxlength: 6,
        placeholder: t("bms.logs.inputPasswordPlaceholder"),
      },
      beforeConfirm: (options: any) => {
        const rawVal = typeof options === "object" && options !== null && "value" in options ? options.value : options;
        if (String(rawVal) === APP_CONFIG.DEBUG_CONFIG.PASSWORD) {
          return true;
        } else {
          toast.error(t("bms.logs.passwordError"));
          return false;
        }
      },
    })
    .then(() => {
      logStore.unlockSystemLogs();
      toast.success(t("bms.logs.unlocked"));
    })
    .catch(() => {});
};

const navigateToFirmwareUpdate = () => {
  uni.navigateTo({
    url: "/pagesSub/mine/firmware-update",
  });
};

const navigateToSystemLogs = () => {
  uni.navigateTo({
    url: "/pagesSub/mine/system-logs",
  });
};

const navigateToTestPage = () => {
  uni.navigateTo({
    url: "/pagesSub/mine/test-page",
  });
};

watch(isSystemLogsUnlocked, (unlocked) => {
  if (!unlocked) {
    toast.show(t("bms.mine.debugLocked"));
  }
});

const isOfflineMode = computed(() => APP_CONFIG.APP_MODE === "offline");
const isLoggedIn = computed(() => !!token.value);

const userDisplayName = computed(() => {
  if (isOfflineMode.value) {
    return t("bms.mine.offlineGuest");
  }
  return isLoggedIn.value
    ? userInfo.value.nickname || userInfo.value.username || t("bms.mine.cloudUser")
    : t("bms.mine.notLoggedIn");
});

const userDisplayId = computed(() => {
  if (isOfflineMode.value) {
    return "ID: " + t("bms.mine.offlineMode");
  }
  return isLoggedIn.value ? "ID: " + (userInfo.value.userId || "BMS-CLOUD-USER") : t("bms.mine.clickToLogin");
});

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
        zIndex: 2000,
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
      .catch(() => {});
  }
};

const handleLogout = () => {
  dialog
    .confirm({
      title: t("bms.common.prompt"),
      msg: t("bms.mine.logoutConfirm"),
      zIndex: 2000,
    })
    .then(() => {
      userStore.logout();
    })
    .catch(() => {});
};
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}
.user-card {
  transition: all 0.2s ease-in-out;
}
.custom-settings-group {
  --wot-cell-padding: 10px 16px;
}
.compact-cell {
  --wot-cell-padding: 6px 16px;
}
.custom-segmented {
  --wot-segmented-padding: 2px;
  --wot-segmented-item-padding: 2px 12px;
}
.tab-content-wrap {
  box-sizing: border-box;
}
.mine-footer {
  text-align: center;
}
.icp-text {
  font-size: 24rpx;
  opacity: 0.85;
}
.version-text {
  font-size: 24rpx;
}
.version-btn-online {
  font-size: 24rpx;
  color: var(--wot-color-theme, #0052d9);
  cursor: pointer;
  transition: opacity 0.2s ease-in-out;
}
.version-btn-online:active {
  opacity: 0.6;
}
.version-btn-checking {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
