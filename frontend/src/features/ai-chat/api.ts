import { httpClient } from '@shared/api'
import type { AIModel, ChatMessage } from './mock-data'

interface SendMessageRequest {
  sessionId?: string
  modelId: string
  content: string
}

interface SendMessageResponse {
  sessionId: string
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  creditsRemaining: number
}

interface ChatSession {
  id: string
  title: string
  model_id: string
  created_at: string
}

interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[]
}

export const chatApi = {
  async getModels(): Promise<AIModel[]> {
    return httpClient.get('/chat/models')
  },

  async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
    return httpClient.post('/chat/messages', data)
  },

  async listSessions(): Promise<ChatSession[]> {
    return httpClient.get('/chat/sessions')
  },

  async getSession(id: string): Promise<ChatSessionDetail> {
    return httpClient.get(`/chat/sessions/${id}`)
  },

  async deleteSession(id: string): Promise<{ success: boolean }> {
    return httpClient.delete(`/chat/sessions/${id}`)
  },

  async getCredits(): Promise<{ balance: number }> {
    return httpClient.get('/credits')
  },
}
