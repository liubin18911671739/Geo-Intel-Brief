# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geo-Intel Brief is a Next.js 16 application that generates image-first geo-intelligence briefings as Gamma microsites. It aggregates content from RSS feeds and X (Twitter) queries for regions: Europe, MENA, and Africa.

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Production server
npm start

# Linting
npm run lint
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router (app directory)
- **React 19** with TypeScript
- **Tailwind CSS** for styling with shadcn/ui components
- **Radix UI** primitives for accessible components
- **react-hook-form** + **zod** for form validation

### Project Structure
```
app/
├── api/brief/
│   ├── generate/route.ts       # POST endpoint to start generation
│   └── status/[generationId]/  # GET endpoint for polling status
├── layout.tsx                   # Root layout with Geist fonts
├── page.tsx                     # Main client-side UI
└── globals.css                  # CSS variables for theming

components/
├── ui/                          # shadcn/ui components (40+ components)
└── theme-provider.tsx           # Theme context provider

lib/
└── utils.ts                     # cn() utility for merging Tailwind classes

hooks/
└── use-toast.ts                 # Toast notification hook
```

### Data Flow

1. **Client** (`app/page.tsx`) collects generation config (regions, RSS URLs, X queries, options)
2. **Generate API** (`app/api/brief/generate/route.ts`) creates a `generationId`, stores initial status in-memory, and returns 202
3. **Background simulation** (`simulateGeneration()`) transitions status through: queued → running → completed/failed
4. **Client polls** (`app/api/brief/status/[generationId]/route.ts`) every 2.5s to update UI progress

### In-Memory State

Current implementation uses an in-memory Map for generation state. This means:
- State resets on server restart
- Doesn't scale across multiple server instances
- Cleanup runs every 60s, keeping last 50 generations

### Theming

- CSS variables in `app/globals.css` control colors (HSL format)
- Dark mode via `class` strategy (Tailwind)
- Theme selector in UI is currently decorative (no persistence)

### TypeScript Configuration

- Path alias: `@/*` maps to project root
- Build errors are ignored (`typescript.ignoreBuildErrors: true`)
- Module resolution uses "bundler" mode
