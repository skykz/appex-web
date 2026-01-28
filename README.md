# AppEx Web

Modern, production-ready web application built with React, Vite, TypeScript, and mobile-first design principles.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix)
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **i18n**: i18next (English/Russian)
- **Quality**: ESLint + Prettier + TypeScript strict mode

## Project Structure

```
src/
├── app/              # Application initialization
│   ├── providers/    # Context providers (Query, i18n)
│   ├── router/       # Route configuration
│   └── styles/       # Global styles
├── pages/            # Page components (lazy-loaded)
├── features/         # Feature modules with logic + UI
├── entities/         # Domain entities (models, API, queries)
├── widgets/          # Complex UI blocks
└── shared/           # Shared utilities
    ├── api/          # HTTP client
    ├── ui/           # UI primitives (Button, Input, etc.)
    ├── lib/          # Utility functions
    ├── i18n/         # Translations
    └── config/       # Environment config
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Development

```bash
# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Features

- **Mobile-First Design**: Responsive layouts with safe-area support
- **Type Safety**: Full TypeScript strict mode with path aliases
- **Code Splitting**: Lazy-loaded routes for optimal performance
- **Form Validation**: Accessible forms with Zod schemas
- **API Layer**: Typed HTTP client with Bearer token auth
- **Internationalization**: English/Russian translations ready
- **Design System**: shadcn/ui components with CVA variants

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:3000/api
```

## License

Private
