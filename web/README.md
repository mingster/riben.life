# riben.life Web Application

A modern web platform built with Next.js 15, featuring user authentication, analytics, and comprehensive admin tools.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **Payments**: Stripe
- **UI**: Tailwind CSS v4, Shadcn UI, Radix UI
- **Internationalization**: i18next
- **Forms**: React Hook Form with Zod validation
- **Analytics**: Google Analytics (optional), Vercel Speed Insights (production)
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Bun installed ([Installation Guide](https://bun.sh))
- PostgreSQL database
- Required environment variables (see `../doc` for documentation)

### Installation

```bash
# Install dependencies
bun install

# Set up database
bunx prisma generate
bunx prisma db push

# Run database migrations (if any)
bunx prisma migrate dev
```

### Development

```bash
# Run the development server (on port 3001 with Turbopack)
bun run dev

# Debug mode with inspector
bun run debugdev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

### Build

```bash
# Create production build
bun run build

# Start production server (on port 3000)
bun run start
```

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable UI components
- `src/actions/` - Server actions for mutations
- `src/lib/` - Utility libraries and integrations
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `prisma/` - Database schema and migrations
- `public/` - Static assets

## Key Features

- **User Authentication**: Email, magic link, social login (Google), and passkey support via Better Auth
- **Admin Dashboard**: Platform administration and settings
- **Analytics**: Google Analytics (optional) and Vercel Speed Insights in production
- **Internationalization**: Multi-language support with i18next
- **Stripe Integration**: Payment processing capabilities
- **Dark Mode**: Theme switching with next-themes
- **Email System**: Nodemailer integration for transactional emails

## Scripts

- `bun run dev` - Start development server on port 3001 with Turbopack
- `bun run debugdev` - Start development server with Node inspector
- `bun run build` - Build for production
- `bun run start` - Start production server on port 3000
- `bun run lint` - Run linting
- `bun run bio_lint` - Run Biome linter with auto-fix
- `bun run format` - Format code with Biome
- `bun run dbpush` - Push Prisma schema to database
- `bun run sql:generate` - Generate Prisma client
- `bun run depcheck` - Check for unused dependencies
- `bun run commit` - Commit with conventional commits format

## Code Quality

This project uses:

- **Biome** for linting and formatting
- **ESLint** with TypeScript support
- **Husky** for git hooks
- **Lint-staged** for pre-commit checks
- **Commitlint** for conventional commits

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Bun Documentation](https://bun.sh/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

## Documentation

Additional documentation can be found in the `../doc` directory.
