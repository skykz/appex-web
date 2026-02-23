export interface AIModel {
  id: string
  name: string
  icon: string
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

export interface ChatHistoryItem {
  id: string
  title: string
  date: string
  type: 'chat' | 'assistant'
}

export interface OnboardingStep {
  id: number
  title: string
  description: string
}

export const aiModels: AIModel[] = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖' },
  { id: 'chatgpt-image', name: 'ChatGPT Image', icon: '🖼️' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔮' },
  { id: 'claude', name: 'Claude', icon: '✳️' },
  { id: 'nano-banana', name: 'Nano Banana', icon: '🍌' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '🎨' },
  { id: 'perplexity', name: 'Perplexity AI', icon: '❇️' },
]

export const actionChips: ActionChip[] = [
  { id: 'advice', label: 'Give advice', icon: 'help-circle' },
  { id: 'brainstorm', label: 'Brainstorm ideas', icon: 'lightbulb' },
  { id: 'translate', label: 'Translate', icon: 'languages' },
  { id: 'summarize', label: 'Summarize text', icon: 'align-left' },
  { id: 'explain', label: 'Explain simply', icon: 'file-text' },
  { id: 'copy', label: 'Write copy', icon: 'pen-line' },
]

export const mockChatHistory: ChatHistoryItem[] = [
  {
    id: '1',
    title: 'Exploring AI Capabilities',
    date: '2026-02-23',
    type: 'chat',
  },
  {
    id: '2',
    title: 'Marketing Strategy Brainstorm',
    date: '2026-02-22',
    type: 'chat',
  },
  {
    id: '3',
    title: 'Translation Helper',
    date: '2026-02-21',
    type: 'chat',
  },
]

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'All leading AI tools in AppEx',
    description:
      'ChatGPT, Claude, Grok, Perplexity and more — all integrated, all in one place',
  },
  {
    id: 2,
    title: 'Your AI companion for peak productivity',
    description:
      'Use ready-made prompts for advice, writing, translation, brainstorming, and more',
  },
  {
    id: 3,
    title: 'Generate images',
    description:
      'Create stunning visuals with AI-powered image generation models',
  },
  {
    id: 4,
    title: 'Choose any AI model',
    description:
      'Switch between models instantly to find the best fit for your task',
  },
]
