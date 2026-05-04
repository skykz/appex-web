import type { ActionChip, OnboardingStep } from './types'

/** Quick actions shown above the chat input on the empty state. */
export const actionChips: ActionChip[] = [
  { id: 'advice', label: 'Give advice', icon: 'help-circle' },
  { id: 'brainstorm', label: 'Brainstorm ideas', icon: 'lightbulb' },
  { id: 'translate', label: 'Translate', icon: 'languages' },
  { id: 'summarize', label: 'Summarize text', icon: 'align-left' },
  { id: 'explain', label: 'Explain simply', icon: 'file-text' },
  { id: 'copy', label: 'Write copy', icon: 'pen-line' },
]

/** First-run product tour steps for the AI tools area. */
export const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'All leading AI tools in AppEx',
    description:
      'ChatGPT, Claude, DeepSeek, Perplexity and more — integrated in one workspace',
  },
  {
    id: 2,
    title: 'Your AI companion for peak productivity',
    description:
      'Open the Prompt library for ideas, or save your own prompts to reuse anytime',
  },
  {
    id: 3,
    title: 'Generate images',
    description:
      'Create visuals with dedicated image models when your plan includes them',
  },
  {
    id: 4,
    title: 'Choose any AI model',
    description:
      'Switch between models to match cost, speed, and quality to each task',
  },
]
