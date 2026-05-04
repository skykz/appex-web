/**
 * AI chat UI and API shapes for models, messages, and onboarding copy.
 */

export interface AIModel {
  id: string
  name: string
  /** Legacy emoji from API; UI prefers `AIModelIcon` keyed by `id`. */
  icon?: string
}

export interface ActionChip {
  id: string
  label: string
  icon: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface OnboardingStep {
  id: number
  title: string
  description: string
}
