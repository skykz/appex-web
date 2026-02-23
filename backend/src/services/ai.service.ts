/**
 * AI Service — proxies chat messages to the appropriate AI model.
 *
 * Currently returns a mock response. When AI provider keys are configured,
 * replace the mock with actual SDK calls (OpenAI, Anthropic, etc.).
 */

const MOCK_RESPONSES: Record<string, string> = {
  chatgpt:
    'I can assist with generating text, images, and provide guidance on creating video and audio content. Could you please specify what you need help with?',
  'chatgpt-image':
    'I can generate images based on your description. Please tell me what you would like me to create.',
  deepseek:
    'I specialize in code generation and technical analysis. What would you like me to help you with?',
  claude:
    'I can help with analysis, writing, math, and coding. What would you like to work on?',
  'nano-banana':
    'I am a lightweight model optimized for fast responses. How can I help?',
  'stable-diffusion':
    'I generate images from text prompts. Describe the image you want to create.',
  perplexity:
    'I can search the web and provide up-to-date answers with citations. What would you like to know?',
}

export async function getAIResponse(
  modelId: string,
  _userMessage: string
): Promise<string> {
  // TODO: Replace with actual AI SDK calls when keys are configured
  // Example for OpenAI:
  // const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   messages: [{ role: 'user', content: userMessage }],
  // })
  // return completion.choices[0].message.content

  // Mock: return a model-specific response with slight delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  return (
    MOCK_RESPONSES[modelId] ??
    'I can help you with a variety of tasks. What would you like to do?'
  )
}

export const AVAILABLE_MODELS = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖' },
  { id: 'chatgpt-image', name: 'ChatGPT Image', icon: '🖼️' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔮' },
  { id: 'claude', name: 'Claude', icon: '✳️' },
  { id: 'nano-banana', name: 'Nano Banana', icon: '🍌' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '🎨' },
  { id: 'perplexity', name: 'Perplexity AI', icon: '❇️' },
]
