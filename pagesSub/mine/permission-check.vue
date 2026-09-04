<template>
  <layout-provider>
    <!-- 自定义顶部导航栏 -->
    <wd-navbar
      :title="$t('bms.mine.permissionsTitle')"
      fixed
      placeholder
      left-arrow
      safe-area-inset-top
      @click-left="goBack"
    />

    <view class="wot-px-3 wot-py-4">
      <!-- 系统权限与诊断服务卡片组 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <view class="wot-p-4 wot-border-b wot-border-divider-main wot-flex wot-justify-between wot-items-center">
          <view class="wot-flex wot-items-center">
            <wd-icon css-icon="i-lucide-shield-check" size="20px" class="wot-mr-2" :color="activeThemeColor" />
            <text class="wot-text-base wot-font-bold wot-text-text-main">{{ $t("bms.mine.permissionsTitle") }}</text>
          </view>
          <wd-button size="small" plain @click="checkAllPermissions(true)">
            {{ $t("bms.mine.checkPermissions") }}
          </wd-button>
        </view>

        <wd-cell-group border>
          <!-- 系统蓝牙服务 -->
          <wd-cell
            :title="$t('bms.mine.btHardware')"
            :label="$t('bms.mine.btHardwareDesc')"
            :clickable="!permissionsState.btHardware"
            :is-link="!permissionsState.btHardware"
            center
            @click="permissionsState.btHardware ? null : fixPermission('btHardware')"
          >
            <template #default>
              <view class="wot-flex wot-items-center wot-gap-1 wot-justify-end wot-ml-auto">
                <view :class="['status-dot', permissionsState.btHardware ? 'status-dot-success' : 'status-dot-danger']" />
                <text :class="[permissionsState.btHardware ? 'status-text-success' : 'status-text-danger']" class="wot-text-sm">
                  {{ permissionsState.btHardware ? $t("bms.mine.enabled") : $t("bms.mine.disabled") }}
                </text>
              </view>
            </template>
          </wd-cell>

          <!-- 系统定位服务 -->
          <wd-cell
            v-if="showLocationCheck"
            :title="$t('bms.mine.gpsHardware')"
            :label="$t('bms.mine.gpsHardwareDesc')"
            :clickable="!permissionsState.gpsHardware"
            :is-link="!permissionsState.gpsHardware"
            center
            @click="permissionsState.gpsHardware ? null : fixPermission('gpsHardware')"
          >
            <template #default>
              <view class="wot-flex wot-items-center wot-gap-1 wot-justify-end wot-ml-auto">
                <view :class="['status-dot', permissionsState.gpsHardware ? 'status-dot-success' : 'status-dot-danger']" />
                <text :class="[permissionsState.gpsHardware ? 'status-text-success' : 'status-text-danger']" class="wot-text-sm">
                  {{ permissionsState.gpsHardware ? $t("bms.mine.enabled") : $t("bms.mine.disabled") }}
                </text>
              </view>
            </template>
          </wd-cell>

          <!-- 蓝牙应用级权限 -->
          <wd-cell
            :title="$t('bms.mine.btPermission')"
            :label="$t('bms.mine.btPermissionDesc')"
            :clickable="!permissionsState.btPermission"
            :is-link="!permissionsState.btPermission"
            center
            @click="permissionsState.btPermission ? null : fixPermission('btPermission')"
          >
            <template #default>
              <view class="wot-flex wot-items-center wot-gap-1 wot-justify-end wot-ml-auto">
                <view :class="['status-dot', permissionsState.btPermission ? 'status-dot-success' : 'status-dot-danger']" />
                <text :class="[permissionsState.btPermission ? 'status-text-success' : 'status-text-danger']" class="wot-text-sm">
                  {{ permissionsState.btPermission ? $t("bms.mine.authorized") : $t("bms.mine.unauthorized") }}
                </text>
              </view>
            </template>
          </wd-cell>

          <!-- 定位应用级权限 -->
          <wd-cell
            v-if="showLocationCheck"
            :title="$t('bms.mine.locPermission')"
            :label="$t('bms.mine.locPermissionDesc')"
            :clickable="!permissionsState.locPermission"
            :is-link="!permissionsState.locPermission"
            center
            @click="permissionsState.locPermission ? null : fixPermission('locPermission')"
          >
            <template #default>
              <view class="wot-flex wot-items-center wot-gap-1 wot-justify-end wot-ml-auto">
                <view :class="['status-dot', permissionsState.locPermission ? 'status-dot-success' : 'status-dot-danger']" />
                <text :class="[permissionsState.locPermission ? 'status-text-success' : 'status-text-danger']" class="wot-text-sm">
                  {{ permissionsState.locPermission ? $t("bms.mine.authorized") : $t("bms.mine.unauthorized") }}
                </text>
              </view>
            </template>
          </wd-cell>
        </wd-cell-group>
      </view>

      <!-- 设备与环境信息卡片 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <view class="wot-p-4 wot-border-b wot-border-divider-main wot-flex wot-items-center">
          <wd-icon css-icon="i-lucide-smartphone" size="20px" class="wot-mr-2" :color="activeThemeColor" />
          <text class="wot-text-base wot-font-bold wot-text-text-main">{{ $t("bms.mine.deviceInfo") }}</text>
        </view>
        <wd-cell-group border>
          <wd-cell :title="$t('bms.mine.devicePlatform')" :value="clientPlatform" />
          <wd-cell :title="$t('bms.mine.deviceBrand')" :value="deviceBrand" />
          <wd-cell :title="$t('bms.mine.deviceModel')" :value="deviceModel" />
          <wd-cell :title="$t('bms.mine.deviceSystem')" :value="deviceSystem" />
        </wd-cell-group>
      </view>
    </view>
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow, onUnload } from "@dcloudio/uni-app";
import { useToast } from "@wot-ui/ui";
import { isAppIOS, isMpWeixin, isApp } from "@uni-helper/uni-env";
import { permissionManager } from "@/service/permission";
import { translate } from "@/locale/i18n";
import { useAppStore } from "@/stores/app";
import { storeToRefs } from "pinia";

// 初始化消息提示实例
const toast = useToast();

// 初始化并引入全局设备与环境存储仓
const appStore = useAppStore();
const { deviceInfo, activeThemeColor } = storeToRefs(appStore);

// 诊断当前运行宿主平台所在的端并转换为对应的翻译字词
const clientPlatform = computed(() => {
  const platform = deviceInfo.value?.uniPlatform || (isMpWeixin ? "mp-weixin" : isApp ? "app" : "web");
  const os = (deviceInfo.value?.osName || deviceInfo.value?.platform || "").toLowerCase();

  // 微信小程序平台
  if (platform === "mp-weixin") {
    if (os === "harmonyos") {
      return translate("bms.mine.platformWechatHarmony");
    }
    if (os === "ios") {
      return translate("bms.mine.platformWechatIos");
    }
    if (os === "android") {
      return translate("bms.mine.platformWechatAndroid");
    }
    return translate("bms.mine.platformWechat");
  }

  // APP 移动端平台
  if (platform === "app") {
    if (os === "harmonyos") {
      return translate("bms.mine.platformAppHarmony");
    }
    if (os === "ios") {
      return translate("bms.mine.platformAppIos");
    }
    if (os === "android") {
      return translate("bms.mine.platformAppAndroid");
    }
    return translate("bms.mine.platformApp");
  }

  // H5 网页端平台
  if (platform === "web") {
    if (os === "ios") {
      return translate("bms.mine.platformH5Ios");
    }
    if (os === "android") {
      return translate("bms.mine.platformH5Android");
    }
    return translate("bms.mine.platformH5");
  }

  return translate("bms.mine.platformUnknown");
});

// 提取设备品牌
const deviceBrand = computed(() => {
  const brand = deviceInfo.value?.deviceBrand;
  if (!brand) return "Unknown";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
});

// 提取设备型号名称
const deviceModel = computed(() => {
  return deviceInfo.value?.deviceModel || "Unknown";
});

// 拼装设备系统名称与系统版本号
const deviceSystem = computed(() => {
  const os = deviceInfo.value?.osName;
  const version = deviceInfo.value?.osVersion;
  if (!os) return "Unknown";
  const formattedOs = os.charAt(0).toUpperCase() + os.slice(1);
  return version ? `${formattedOs} ${version}` : formattedOs;
});

// 判定当前平台是否需要展示定位相关权限
const showLocationCheck = computed(() => !isAppIOS);

// 四项权限诊断状态
const permissionsState = ref({
  btHardware: false,
  gpsHardware: false,
  btPermission: false,
  locPermission: false,
});

/**
 * 诊断并刷新所有硬件服务开关和应用级权限状态
 */
const checkAllPermissions = async (manual = false) => {
  console.log("[系统权限诊断] 启动权限与服务诊断核验流程, manual =", manual);
  let loadingToast: any = null;
  if (manual) {
    loadingToast = toast.loading(translate("bms.mine.diagnosing"));
  }

  try {
    const state = await permissionManager.diagnosePermissions();
    permissionsState.value = state;

    console.log("[系统权限诊断] 诊断流程完结。最终状态为:", JSON.stringify(permissionsState.value));

    if (manual) {
      setTimeout(() => {
        if (loadingToast) {
          toast.close();
        }
        const isAllOk =
          permissionsState.value.btHardware &&
          permissionsState.value.btPermission &&
          (!showLocationCheck.value ||
            (permissionsState.value.gpsHardware && permissionsState.value.locPermission));

        if (isAllOk) {
          toast.success(translate("bms.mine.diagnoseSuccess"));
        } else {
          toast.info(translate("bms.mine.diagnosePartial"));
        }
      }, 500);
    }
  } catch (err) {
    console.error("[系统权限诊断] 诊断流程抛错:", err);
    if (manual) {
      if (loadingToast) {
        toast.close();
      }
      toast.error(translate("bms.mine.diagnoseError"));
    }
  }
};

/**
 * 原生权限跳转与修复
 */
const fixPermission = async (type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission") => {
  console.log("[系统权限诊断] 尝试修复权限/服务并拉起原生跳转流程:", type);
  await permissionManager.requestSettingOrResolve(type);
};

const goBack = () => {
  uni.navigateBack();
};

onShow(() => {
  checkAllPermissions(false);
});

const handleAppShow = () => {
  console.log("[系统权限诊断] 监听到 App 回到前台，自动执行权限刷新诊断");
  checkAllPermissions(false);
};

uni.onAppShow(handleAppShow);

onUnload(() => {
  uni.offAppShow(handleAppShow);
});
</script>

<style scoped>
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}
.status-dot-success {
  background-color: var(--wot-color-success, #2ba471) !important;
  box-shadow: 0 0 6px rgba(43, 164, 113, 0.4);
}
.status-dot-danger {
  background-color: var(--wot-color-danger, #d54941) !important;
  box-shadow: 0 0 6px rgba(213, 73, 65, 0.4);
}
.status-text-success {
  color: var(--wot-color-success, #2ba471) !important;
  font-weight: 500;
}
.status-text-danger {
  color: var(--wot-color-danger, #d54941) !important;
  font-weight: 500;
}
</style>
