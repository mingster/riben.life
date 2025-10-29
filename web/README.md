# Riben.life Web Application

A modern e-commerce platform built with Next.js 15, featuring multi-store support, payment processing, and comprehensive admin tools.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **Payments**: Stripe, LINE Pay
- **UI**: Tailwind CSS, Shadcn UI, Radix UI
- **Internationalization**: next-intl
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Bun installed ([Installation Guide](https://bun.sh))
- PostgreSQL database
- Required environment variables (see `ENVIRONMENT_VARIABLES.md`)

### Installation

```bash
# Install dependencies
bun install

# Set up database
bunx prisma generate
bunx prisma db push

# Run database migrations (if any)
bunx prisma migrate dev

# Initialize platform (run once after database setup)
# This populates countries, currencies, locales, payment methods, shipping methods,
# and creates Stripe products
bun run install:platform
```

### Development

```bash
# Run the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

```bash
# Create production build
bun run build

# Start production server
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

- **Multi-store Management**: Support for multiple stores with individual settings
- **Product Catalog**: Categories, products, and variants
- **Order Management**: Complete order processing workflow
- **Payment Integration**: Stripe and LINE Pay support
- **Admin Dashboard**: Store and platform administration
- **User Authentication**: Email, magic link, social login (Google, LINE), and passkey support via Better Auth
- **Internationalization**: Multi-language support

## Documentation

Additional documentation can be found in the `/doc` directory:

- [Deployment Guide](../doc/DEPLOYMENT.md)
- [Environment Variables](../doc/ENVIRONMENT_VARIABLES.md)
- [Contributing Guidelines](../doc/CONTRIBUTING.md)
- [Security](../doc/SECURITY.md)

## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run install:platform` - Initialize platform data (run once after setup)
- `bun run lint` - Run linting
- `bun run format` - Format code with Biome
- `bun run sql:generate` - Generate Prisma client
- `bun run sql:dbpush` - Push schema changes to database

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Bun Documentation](https://bun.sh/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
