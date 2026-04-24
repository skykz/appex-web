export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin'
}

export interface AdminAuthResponse {
  accessToken: string
  refreshToken: string
  user: AdminUser
}
