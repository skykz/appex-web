import type { Request } from 'express'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface AuthenticatedRequest extends Request {
  userId: string
  userEmail: string
}
