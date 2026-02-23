export interface SkillLesson {
  id: number
  label: string
  title: string
  emoji: string
  locked: boolean
}

export interface SkillModule {
  id: number
  title: string
  lessonCount: number
  lessons: SkillLesson[]
}

export interface Skill {
  id: number
  title: string
  description: string
  about: string
  emoji: string
  category: SkillCategory
  progress: number
  status: 'not_started' | 'in_progress' | 'completed'
  duration: string
  modules: SkillModule[]
}

export type SkillCategory = 'all' | 'ai_automations' | 'freelancing' | 'marketing' | 'ai_content'

export const skillCategories: { value: SkillCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ai_automations', label: 'AI automations' },
  { value: 'freelancing', label: 'Freelancing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ai_content', label: 'AI content' },
]

export const mockSkills: Skill[] = [
  {
    id: 1,
    title: 'Build Task Manager Bot',
    description: 'Build an AI agent that handles appointment booking via Telegram and syncs with Google Calendar automatically — no coding required.',
    about: 'Managing tasks manually in spreadsheets is tedious and error-prone. This practical course shows you how to build an AI-powered task agent that lives in Google Sheets. Using n8n automation, you\'ll create a Telegram bot that lets you add, update, and complete tasks through simple messages — all synced with Google Calendar automatically.',
    emoji: '📞',
    category: 'ai_automations',
    progress: 0,
    status: 'not_started',
    duration: '2 hours',
    modules: [
      {
        id: 1,
        title: 'Module 1: Build Task Manager Bot',
        lessonCount: 4,
        lessons: [
          { id: 101, label: 'Lesson 1', title: 'Explore the project', emoji: '🔵', locked: false },
          { id: 102, label: 'Lesson 2', title: 'Start your workflow', emoji: '⚡', locked: true },
          { id: 103, label: 'Lesson 3', title: 'Give the bot a brain', emoji: '💡', locked: true },
          { id: 104, label: 'Lesson 4', title: 'Close the loop', emoji: '🔗', locked: true },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Build Gmail Manager Bot',
    description: 'Automate your email management with an intelligent Gmail bot assistant',
    about: 'Email overload slows you down. In this course, you\'ll build an AI-powered Gmail manager that categorizes, labels, and responds to emails automatically. Using n8n and the Gmail API, you\'ll create workflows that save hours every week.',
    emoji: '📧',
    category: 'ai_automations',
    progress: 100,
    status: 'completed',
    duration: '1.5 hours',
    modules: [
      {
        id: 2,
        title: 'Module 1: Build Gmail Manager Bot',
        lessonCount: 3,
        lessons: [
          { id: 201, label: 'Lesson 1', title: 'Connect Gmail API', emoji: '📬', locked: false },
          { id: 202, label: 'Lesson 2', title: 'Build email classifier', emoji: '🏷️', locked: false },
          { id: 203, label: 'Lesson 3', title: 'Auto-reply workflow', emoji: '✉️', locked: false },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Build Calendar Manager Bot',
    description: 'Smart scheduling bot that manages your calendar and meetings effortlessly',
    about: 'Scheduling meetings across time zones is a pain. This course teaches you to build an AI calendar assistant that handles scheduling, rescheduling, and reminders through a simple chat interface.',
    emoji: '📅',
    category: 'ai_automations',
    progress: 45,
    status: 'in_progress',
    duration: '2 hours',
    modules: [
      {
        id: 3,
        title: 'Module 1: Build Calendar Manager Bot',
        lessonCount: 4,
        lessons: [
          { id: 301, label: 'Lesson 1', title: 'Set up Calendar API', emoji: '🗓️', locked: false },
          { id: 302, label: 'Lesson 2', title: 'Parse natural language', emoji: '💬', locked: false },
          { id: 303, label: 'Lesson 3', title: 'Handle conflicts', emoji: '⚠️', locked: true },
          { id: 304, label: 'Lesson 4', title: 'Add reminders', emoji: '🔔', locked: true },
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Upwork Essentials for Freelancers',
    description: 'Master the fundamentals of landing clients and building a career on Upwork',
    about: 'Upwork can be overwhelming for beginners. This course walks you through creating a standout profile, writing winning proposals, and building long-term client relationships that grow your freelance career.',
    emoji: '💼',
    category: 'freelancing',
    progress: 0,
    status: 'not_started',
    duration: '1.5 hours',
    modules: [
      {
        id: 4,
        title: 'Module 1: Getting Started on Upwork',
        lessonCount: 3,
        lessons: [
          { id: 401, label: 'Lesson 1', title: 'Create your profile', emoji: '👤', locked: false },
          { id: 402, label: 'Lesson 2', title: 'Write proposals', emoji: '📝', locked: true },
          { id: 403, label: 'Lesson 3', title: 'Win your first client', emoji: '🏆', locked: true },
        ],
      },
    ],
  },
  {
    id: 5,
    title: 'Start Freelancing with AI',
    description: 'Leverage AI tools to kickstart your freelancing journey and win more projects',
    about: 'AI is transforming freelancing. Learn how to use ChatGPT, Claude, and other AI tools to write better proposals, deliver faster results, and stand out from the competition.',
    emoji: '🚀',
    category: 'freelancing',
    progress: 0,
    status: 'not_started',
    duration: '2 hours',
    modules: [
      {
        id: 5,
        title: 'Module 1: AI-Powered Freelancing',
        lessonCount: 4,
        lessons: [
          { id: 501, label: 'Lesson 1', title: 'AI tools overview', emoji: '🤖', locked: false },
          { id: 502, label: 'Lesson 2', title: 'AI for proposals', emoji: '📋', locked: true },
          { id: 503, label: 'Lesson 3', title: 'AI for delivery', emoji: '🚀', locked: true },
          { id: 504, label: 'Lesson 4', title: 'Scale with AI', emoji: '📈', locked: true },
        ],
      },
    ],
  },
  {
    id: 6,
    title: 'Freelance Growth',
    description: 'Scale your freelance business with proven strategies and automation techniques',
    about: 'Ready to go beyond side income? This course covers pricing strategies, client retention, automation of repetitive tasks, and building systems that let you earn more while working less.',
    emoji: '📈',
    category: 'freelancing',
    progress: 0,
    status: 'not_started',
    duration: '2.5 hours',
    modules: [
      {
        id: 6,
        title: 'Module 1: Scaling Your Business',
        lessonCount: 3,
        lessons: [
          { id: 601, label: 'Lesson 1', title: 'Pricing strategy', emoji: '💰', locked: false },
          { id: 602, label: 'Lesson 2', title: 'Client retention', emoji: '🤝', locked: true },
          { id: 603, label: 'Lesson 3', title: 'Automate operations', emoji: '⚙️', locked: true },
        ],
      },
    ],
  },
  {
    id: 7,
    title: 'AI Marketing Fundamentals',
    description: 'Learn how to use AI for marketing campaigns, content, and audience targeting',
    about: 'Marketing with AI is the new standard. Learn to create targeted campaigns, generate ad copy, analyze audience data, and optimize your marketing funnel using the latest AI tools.',
    emoji: '📣',
    category: 'marketing',
    progress: 0,
    status: 'not_started',
    duration: '2 hours',
    modules: [
      {
        id: 7,
        title: 'Module 1: AI Marketing Basics',
        lessonCount: 3,
        lessons: [
          { id: 701, label: 'Lesson 1', title: 'AI in marketing', emoji: '📊', locked: false },
          { id: 702, label: 'Lesson 2', title: 'Generate ad copy', emoji: '✍️', locked: true },
          { id: 703, label: 'Lesson 3', title: 'Optimize campaigns', emoji: '🎯', locked: true },
        ],
      },
    ],
  },
  {
    id: 8,
    title: 'AI Content Creation',
    description: 'Generate high-quality content at scale using the latest AI writing tools',
    about: 'Content is king, but creating it is time-consuming. This course teaches you to use AI for blog posts, social media content, video scripts, and more — maintaining quality while dramatically increasing output.',
    emoji: '✍️',
    category: 'ai_content',
    progress: 0,
    status: 'not_started',
    duration: '1.5 hours',
    modules: [
      {
        id: 8,
        title: 'Module 1: Content with AI',
        lessonCount: 3,
        lessons: [
          { id: 801, label: 'Lesson 1', title: 'AI writing tools', emoji: '🖊️', locked: false },
          { id: 802, label: 'Lesson 2', title: 'Blog & social content', emoji: '📱', locked: true },
          { id: 803, label: 'Lesson 3', title: 'Video scripts', emoji: '🎬', locked: true },
        ],
      },
    ],
  },
]
