import { request } from '@/service/request'

/**
 * 账号密码登录接口 API
 * @param data 包含账户名和密码的请求体数据
 */
export const loginApi = (data: Record<string, any>) => {
  return request<{ token: string; user: any }>({
    url: '/api/v1/auth/login',
    method: 'POST',
    noAuth: true, // 登录接口不需要携带 Token
    data
  })
}

/**
 * 获取当前账户详细资料 API
 */
export const getUserInfoApi = () => {
  return request({
    url: '/api/v1/user/profile',
    method: 'GET'
  })
}
