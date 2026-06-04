<template>
  <layout-provider>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <!-- Source: uni_modules/wot-ui/components/wd-navbar/wd-navbar.vue -->
    <wd-navbar
      :title="$t('bms.mine.permissionsTitle')"
      fixed
      placeholder
      left-arrow
      safe-area-inset-top
      @click-left="goBack"
    />

    <view class="wot-px-3 wot-py-4">
      <!-- 系统权限与诊断服务卡片组 (Google Pixel 风格卡片) -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <view
          class="wot-p-4 wot-border-b wot-border-gray-100 dark:wot-border-neutral-800 wot-flex wot-justify-between wot-items-center"
        >
          <view class="wot-flex wot-items-center">
            <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
            <wd-icon css-icon="i-lucide-shield-check" size="20px" class="wot-mr-2" :color="activeThemeColor" />
            <text class="wot-text-base wot-font-bold wot-text-text-main">{{ $t("bms.mine.permissionsTitle") }}</text>
          </view>
          <!-- Source: uni_modules/wot-ui/components/wd-button/wd-button.vue -->
          <wd-button size="small" plain @click="checkAllPermissions(true)">
            {{ $t("bms.mine.checkPermissions") }}
          </wd-button>
        </view>
        <!-- Source: uni_modules/wot-ui/components/wd-cell-group/wd-cell-group.vue -->
        <wd-cell-group border>
          <!-- 系统蓝牙服务 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
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
                <view
                  :class="['status-dot', permissionsState.btHardware ? 'status-dot-success' : 'status-dot-danger']"
                />
                <text
                  :class="[permissionsState.btHardware ? 'status-text-success' : 'status-text-danger']"
                  class="wot-text-sm"
                >
                  {{ permissionsState.btHardware ? $t("bms.mine.enabled") : $t("bms.mine.disabled") }}
                </text>
              </view>
            </template>
          </wd-cell>

          <!-- 系统定位服务 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
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
                <view
                  :class="['status-dot', permissionsState.gpsHardware ? 'status-dot-success' : 'status-dot-danger']"
                />
                <text
                  :class="[permissionsState.gpsHardware ? 'status-text-success' : 'status-text-danger']"
                  class="wot-text-sm"
                >
                  {{ permissionsState.gpsHardware ? $t("bms.mine.enabled") : $t("bms.mine.disabled") }}
                </text>
              </view>
            </template>
          </wd-cell>

          <!-- 蓝牙应用级权限 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
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
                <view
                  :class="['status-dot', permissionsState.btPermission ? 'status-dot-success' : 'status-dot-danger']"
                />
                <text
                  :class="[permissionsState.btPermission ? 'status-text-success' : 'status-text-danger']"
                  class="wot-text-sm"
                >
                  {{ permissionsState.btPermission ? $t("bms.mine.authorized") : $t("bms.mine.unauthorized") }}
                </text>
              </view>
            </template>
          </wd-cell>

          <!-- 定位应用级权限 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
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
                <view
                  :class="['status-dot', permissionsState.locPermission ? 'status-dot-success' : 'status-dot-danger']"
                />
                <text
                  :class="[permissionsState.locPermission ? 'status-text-success' : 'status-text-danger']"
                  class="wot-text-sm"
                >
                  {{ permissionsState.locPermission ? $t("bms.mine.authorized") : $t("bms.mine.unauthorized") }}
                </text>
              </view>
            </template>
          </wd-cell>
        </wd-cell-group>
      </view>

      <!-- 设备与环境信息卡片 (Google Pixel 风格卡片) -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <view
          class="wot-p-4 wot-border-b wot-border-gray-100 dark:wot-border-neutral-800 wot-flex wot-items-center"
        >
          <!-- Source: uni_modules/wot-ui/components/wd-icon/wd-icon.vue -->
          <wd-icon css-icon="i-lucide-smartphone" size="20px" class="wot-mr-2" :color="activeThemeColor" />
          <text class="wot-text-base wot-font-bold wot-text-text-main">{{ $t("bms.mine.deviceInfo") }}</text>
        </view>
        <wd-cell-group border>
          <!-- 运行平台（端） -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.devicePlatform')" :value="clientPlatform" />
          <!-- 设备品牌 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.deviceBrand')" :value="deviceBrand" />
          <!-- 设备型号 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.deviceModel')" :value="deviceModel" />
          <!-- 系统版本 -->
          <!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->
          <wd-cell :title="$t('bms.mine.deviceSystem')" :value="deviceSystem" />
        </wd-cell-group>
      </view>
    </view>
    <!-- 显式挂载 toast 实例，防止 useToast() 弹窗失效 -->
    <wd-toast />
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow, onUnload } from "@dcloudio/uni-app";
import { useToast } from "@/uni_modules/wot-ui";
import { permissionManager } from "@/service/permission";
import { translate } from "@/locale/i18n";
import { useAppStore } from "@/stores/app";
import { storeToRefs } from "pinia";

// 初始化消息提示实例
const toast = useToast();

// 初始化并引入全局设备与环境存储仓
const appStore = useAppStore();
const { deviceInfo, activeThemeColor } = storeToRefs(appStore);


// 诊断当前运行宿主平台所在的端并转换为对应的翻译字词，使用运行时 uniPlatform 避免条件编译失效问题
const clientPlatform = computed(() => {
  let platform = "web";
  let os = "";
  try {
    const sys = uni.getSystemInfoSync();
    platform = sys.uniPlatform || "web";
    os = (sys.osName || sys.platform || "").toLowerCase();
    console.log("[设备诊断] 当前运行期 uniPlatform:", platform, "osName/platform:", os);
  } catch (e) {
    console.error("获取运行期系统信息异常:", e);
  }

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

// 提取设备品牌并安全转化为大写首字母格式，做 Unknown 兜底防缺失
const deviceBrand = computed(() => {
  const brand = deviceInfo.value?.deviceBrand;
  if (!brand) return "Unknown";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
});

// 提取设备型号名称，做 Unknown 兜底防缺失
const deviceModel = computed(() => {
  return deviceInfo.value?.deviceModel || "Unknown";
});

// 拼装设备系统名称与系统版本号以进行一体化诊断显示
const deviceSystem = computed(() => {
  const os = deviceInfo.value?.osName;
  const version = deviceInfo.value?.osVersion;
  if (!os) return "Unknown";
  const formattedOs = os.charAt(0).toUpperCase() + os.slice(1);
  return version ? `${formattedOs} ${version}` : formattedOs;
});

// 判定当前平台是否需要展示定位相关的硬件及应用权限（苹果应用平台下完全不需要，做免除和隐藏）
const showLocationCheck = computed(() => {
  let isIosApp = false;
  // #ifdef APP-PLUS
  try {
    const sys = uni.getSystemInfoSync();
    isIosApp = (sys.platform || "").toLowerCase() === "ios";
  } catch (e) {
    isIosApp = false;
  }
  // #endif
  return !isIosApp;
});

// 四项必要系统与应用权限服务的实时物理诊断状态值
const permissionsState = ref({
  btHardware: false, // 手机蓝牙硬件开关是否开启
  gpsHardware: false, // 手机定位硬件服务是否开启
  btPermission: false, // 蓝牙应用级是否已授权
  locPermission: false, // 定位应用级是否已授权
});

/**
 * 诊断并刷新当前系统的所有硬件服务开关和应用级权限状态，保持多端高兼容性与高稳定性
 * @param manual 是否为手动触发（手动触发会弹出加载诊断框与结果气泡）
 */
const checkAllPermissions = async (manual = false) => {
  console.log("[系统权限诊断] 启动权限与服务诊断核验流程, manual =", manual);
  let loadingToast: any = null;
  if (manual) {
    loadingToast = toast.loading(translate("bms.mine.diagnosing"));
  }

  try {
    // 委托底层核心诊断逻辑给服务层，实现职责隔离并杜绝视图层耦合原生桥接
    const state = await permissionManager.diagnosePermissions();
    permissionsState.value = state;

    console.log("[系统权限诊断] 诊断流程完结。最终状态为:", JSON.stringify(permissionsState.value));

    if (manual) {
      // 增加五百毫秒的拟真诊断延时，提升质感与可信度
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
 * 点击某项未就绪的权限/服务时，进行原生修复自适应，跳转相应系统页面或开启二次权限申请
 */
const fixPermission = async (type: "btHardware" | "gpsHardware" | "btPermission" | "locPermission") => {
  console.log("[系统权限诊断] 尝试修复权限/服务并拉起原生跳转流程:", type);
  // 调用底层的原生修复自适应接口
  await permissionManager.requestSettingOrResolve(type);
  // 修复跳转后，当用户回到小程序/App时，onShow 会自动再次静默刷新诊断状态
};

/**
 * 返回上一页
 */
const goBack = () => {
  uni.navigateBack();
};

// 绑定生命周期 onShow，每次唤起该页面时均进行静默权限诊断，保证从系统设置页返回时状态能即时更新
onShow(() => {
  checkAllPermissions(false);
});

// 应用切到前台时的回调函数
const handleAppShow = () => {
  console.log("[系统权限诊断] 监听到 App 回到前台，自动执行权限刷新诊断");
  checkAllPermissions(false);
};

// 注册全局 App 前台切回事件，保证从外部系统设置页切回 App 时 100% 触发状态刷新
uni.onAppShow(handleAppShow);

// 页面卸载时注销全局监听，防内存泄漏
onUnload(() => {
  uni.offAppShow(handleAppShow);
});
</script>

<style scoped>
/* 自定义指示灯样式，避开小程序插槽样式隔离与 UnoCSS 动态字符串过滤 Bug */
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
