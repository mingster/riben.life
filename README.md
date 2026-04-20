# bagonia.mingster.com

A modern web platform built with Next.js 15, featuring user authentication, analytics, and comprehensive admin tools.

## Project Overview

This is a monorepo containing the mingster.com web application and related infrastructure.

## Structure

```plaintext
mingster.com/
├── web/          # Main Next.js web application
├── doc/          # Project documentation
└── bin/          # Utility scripts
```

## Quick Start

### Prerequisites

- **Bun** - Package manager and runtime ([Install](https://bun.sh))
- **PostgreSQL** - Database
- **Node.js** - For compatibility with certain tools

### Getting Started

1. **Clone and navigate to the web directory:**

   ```bash
   cd web
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Configure database connection
   - Add API keys (Stripe, Google, etc.)

4. **Initialize database:**

   ```bash
   bun run sql:generate
   bun run dbpush
   ```

5. **Run development server:**

   ```bash
   bun run dev
   ```

Visit [http://localhost:3001](http://localhost:3001) to see the application.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **UI**: Tailwind CSS v4, Shadcn UI, Radix UI
- **Analytics**: Vercel Analytics, Google Analytics
- **Payments**: Stripe
- **Email**: Nodemailer

## Key Features

- ✅ Better Auth authentication (email, social, passkeys)
- ✅ Stripe payment integration
- ✅ Multi-language support (i18next)
- ✅ Dark mode support
- ✅ Admin dashboard
- ✅ Analytics integration
- ✅ Responsive design

## Documentation

Detailed documentation is available in the `/doc` directory:

- Deployment guides
- Environment variable configuration
- Security guidelines
- Contributing guidelines

## Scripts

See the [web README](./web/README.md) for all available scripts.

## Contributing

Please read [CONTRIBUTING.md](./doc/CONTRIBUTING.md) for contribution guidelines.

## Security

For security issues, please see [SECURITY.md](./SECURITY.md).

## License

See [LICENSE](./LICENSE) for details.
