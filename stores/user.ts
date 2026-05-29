import { defineStore } from 'pinia'
import { ref } from 'vue'
import { APP_CONFIG } from '@/config'
import { loginApi } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  // 用户授权身份令牌凭证 Token（初始化时优先从本地持久化缓存读取）
  const token = ref<string>(uni.getStorageSync('app_token') || '')
  
  // 用户账户的个人详细资料信息（初始化时从缓存读取并做反序列化解析）
  const userInfo = ref<Record<string, any>>(
    uni.getStorageSync('app_user_info') 
      ? JSON.parse(uni.getStorageSync('app_user_info')) 
      : {}
  )

  // 判定当前用户是否处于有效登录状态
  const isLoggedIn = () => {
    return !!token.value
  }

  /**
   * 执行账户登录控制逻辑
   * 自动判定并兼容：云平台网络请求登录 与 纯单机模式离线登录
   */
  const login = async (username?: string, password?: string) => {
    if (APP_CONFIG.APP_MODE === 'offline') {
      // 1. 纯单机离线模式：直接在本地生成模拟的安全 Token 和用户资料
      const mockToken = 'mock_offline_token_jlw_bms_8888'
      const mockUser = {
        userId: 'BMS-8888',
        username: username || 'Offline_Guest',
        nickname: '离线测试账户',
        role: 'Administrator'
      }

      token.value = mockToken
      userInfo.value = mockUser
      
      // 执行本地 Storage 异步持久化存储
      uni.setStorageSync('app_token', mockToken)
      uni.setStorageSync('app_user_info', JSON.stringify(mockUser))
      
      return { success: true, mode: 'offline', data: mockUser }
    } else {
      // 2. 接入云平台模式：使用标准的 API 接口函数进行登录验证
      try {
        const res = await loginApi({
          username,
          password
        })
        
        // 服务端校验成功后，更新响应式登录态
        token.value = res.token
        userInfo.value = res.user
        
        // 写入本地缓存以保持持久登录态
        uni.setStorageSync('app_token', res.token)
        uni.setStorageSync('app_user_info', JSON.stringify(res.user))
        
        return { success: true, mode: 'cloud', data: res.user }
      } catch (err) {
        console.error('[BMS 登录失败] 远程云端服务验证失败:', err)
        throw err
      }
    }
  }

  // 清除用户的登录会话状态，安全退出登录
  const logout = () => {
    token.value = ''
    userInfo.value = {}
    uni.removeStorageSync('app_token')
    uni.removeStorageSync('app_user_info')
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout
  }
})
