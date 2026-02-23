export type LessonBlock =
  | { type: 'text'; content: string }
  | { type: 'bold-text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'list'; items: string[] }
  | { type: 'user-message'; name: string; text: string }
  | { type: 'mentor-message'; text: string }

export interface LessonStep {
  blocks: LessonBlock[]
}

export interface LessonContent {
  lessonId: number
  steps: LessonStep[]
}

export const mockLessonContents: Record<number, LessonContent> = {
  // Skills — Build Task Manager Bot — Lesson 1: Explore the project
  101: {
    lessonId: 101,
    steps: [
      {
        blocks: [
          {
            type: 'text',
            content:
              "In this mini-course, you won't just learn how individual nodes work. You'll build a ",
          },
          {
            type: 'bold-text',
            content: 'complete automation',
          },
          {
            type: 'text',
            content:
              ", step by step, the same way it's done in real projects.",
          },
          {
            type: 'text',
            content: "We'll move slowly and deliberately:",
          },
          {
            type: 'list',
            items: [
              'One node per lesson',
              'One clear goal per step',
              'No jumping ahead',
            ],
          },
          {
            type: 'text',
            content:
              'This makes the workflow easier to understand, easier to debug, and easier to reuse later.',
          },
          {
            type: 'text',
            content:
              "You don't need a technical background. You don't need to write code. You just need to follow the flow.",
          },
          {
            type: 'user-message',
            name: 'Yera',
            text: "I've watched a few tutorials before, but they always feel rushed.",
          },
          {
            type: 'mentor-message',
            text: "That's exactly what we're avoiding here. We're building this like a real system, not a demo.",
          },
        ],
      },
      {
        blocks: [
          {
            type: 'text',
            content:
              "Great — now you know the approach. Let's look at what you'll actually be building.",
          },
          {
            type: 'text',
            content:
              "By the end of this course, you'll have a fully working Telegram bot that manages tasks in Google Sheets and syncs with Google Calendar.",
          },
          {
            type: 'user-message',
            name: 'Yera',
            text: 'That sounds like it could actually be useful for my team.',
          },
          {
            type: 'mentor-message',
            text: "That's the point — everything we build here is production-ready, not just a tutorial demo.",
          },
        ],
      },
      {
        blocks: [
          {
            type: 'heading',
            content: "What you'll need before starting",
          },
          {
            type: 'image',
            src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
            alt: 'Students learning together',
          },
          {
            type: 'text',
            content: "Before we build anything, let's make sure you're set up.",
          },
          {
            type: 'text',
            content: "You'll need:",
          },
          {
            type: 'list',
            items: [
              'An n8n account',
              'A Telegram account',
              'A Google account (for Sheets & Calendar)',
            ],
          },
          {
            type: 'text',
            content: "Don't worry — all of these are free. We'll walk through each setup in the next lesson.",
          },
        ],
      },
    ],
  },
  // Skills — Build Task Manager Bot — Lesson 2: Start your workflow
  102: {
    lessonId: 102,
    steps: [
      {
        blocks: [
          {
            type: 'text',
            content:
              "Now let's set up the foundation. Every automation starts with a trigger — something that kicks off the workflow.",
          },
          {
            type: 'text',
            content:
              "In our case, the trigger is a message from Telegram. When someone sends a task, that's the starting point.",
          },
          {
            type: 'list',
            items: [
              'Open n8n and create a new workflow',
              'Add a Telegram Trigger node',
              'Configure your bot token',
            ],
          },
          {
            type: 'user-message',
            name: 'Yera',
            text: 'Where do I get a bot token?',
          },
          {
            type: 'mentor-message',
            text: "Great question — you create one through BotFather on Telegram. I'll walk you through it in the next step.",
          },
        ],
      },
      {
        blocks: [
          {
            type: 'heading',
            content: 'Setting up BotFather',
          },
          {
            type: 'image',
            src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
            alt: 'Team collaboration',
          },
          {
            type: 'text',
            content: 'Open Telegram and search for @BotFather. This is the official bot for creating new bots.',
          },
          {
            type: 'list',
            items: [
              'Send /newbot to BotFather',
              'Choose a name for your bot',
              'Copy the token you receive',
              'Paste it into the n8n Telegram node',
            ],
          },
        ],
      },
    ],
  },
  // Academy — Lesson 526 (Why you are here)
  526: {
    lessonId: 526,
    steps: [
      {
        blocks: [
          {
            type: 'text',
            content:
              "Welcome to the Start Automation Journey course. In this first lesson, we'll explore why automation matters and how it can transform your daily work.",
          },
          {
            type: 'text',
            content:
              "Automation isn't about replacing people — it's about freeing them to focus on what actually matters.",
          },
          {
            type: 'list',
            items: [
              'Save 10+ hours per week on repetitive tasks',
              'Reduce human error in data entry',
              'Scale operations without adding headcount',
            ],
          },
          {
            type: 'user-message',
            name: 'Yera',
            text: 'I spend a lot of time copying data between tools. Can automation help with that?',
          },
          {
            type: 'mentor-message',
            text: "Absolutely — that's one of the most common use cases. By the end of this course, you'll have that fully automated.",
          },
        ],
      },
    ],
  },
  // Academy — Lesson 527 (Meet n8n)
  527: {
    lessonId: 527,
    steps: [
      {
        blocks: [
          {
            type: 'text',
            content:
              'n8n is an open-source workflow automation tool. Think of it as a visual programming environment where you connect blocks (called nodes) to build automations.',
          },
          {
            type: 'text',
            content:
              'Each node does one thing — reads an email, sends a message, updates a spreadsheet. You chain them together to create powerful workflows.',
          },
          {
            type: 'list',
            items: [
              'Visual drag-and-drop interface',
              '400+ integrations available',
              'Self-hosted or cloud — your choice',
            ],
          },
          {
            type: 'user-message',
            name: 'Yera',
            text: 'Is n8n free?',
          },
          {
            type: 'mentor-message',
            text: "The self-hosted version is completely free and open source. There's also a cloud version with a generous free tier.",
          },
        ],
      },
    ],
  },
}

export function getLessonContent(lessonId: number): LessonContent {
  return (
    mockLessonContents[lessonId] ?? {
      lessonId,
      steps: [
        {
          blocks: [
            {
              type: 'text' as const,
              content: 'This lesson content is coming soon. Stay tuned for updates!',
            },
          ],
        },
      ],
    }
  )
}
