# Riben.life Web Application

A modern, multi-tenant restaurant management and ordering platform built with Next.js 15.

## Overview

Riben.life is a comprehensive platform that enables restaurants to manage their operations online while providing customers with a seamless ordering experience. The platform supports multiple stores, each with their own customizable settings, menus, and ordering workflows.

### Use Cases

**For Customers:**

- Browse stores on Google Maps before visiting
- Make reservations and join virtual queues
- View menus and place orders in advance
- Check real-time queue status
- Order and pay before arrival for quick pickup or dine-in
- Track order status in real-time

**For Store Owners:**

- Receive and manage reservations/orders
- Communicate with customers
- Process orders and payments
- Manage menu items and categories
- Configure store settings and business hours
- View analytics and order history
- Manage multiple stores from one dashboard

**For Platform Administrators:**

- Oversee all stores and users
- Manage system-wide settings
- Monitor platform analytics
- Handle support tickets
- Configure payment and shipping methods

## Tech Stack

### Core Technologies

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun (package manager and runtime)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15+ with Prisma ORM 5.x
- **Authentication**: Better Auth (email, magic link, OAuth, passkeys)
- **Styling**: Tailwind CSS v4 + Shadcn UI + Radix UI

### Integrations

- **Payments**: Stripe, LINE Pay
- **Internationalization**: next-intl
- **Forms**: React Hook Form with Zod validation
- **Analytics**: Google Analytics 4
- **Security**: reCAPTCHA v3
- **Icons**: @tabler/icons-react

### Development Tools

- **Linting**: Biome
- **Code Quality**: TypeScript strict mode
- **Git**: Conventional commits

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

```
/web/
├── bin/                    # Scripts and utilities
│   ├── install.ts         # Platform initialization
│   ├── optimize-build.js  # Build optimization
│   └── pg_backup*.sh      # Database backup scripts
├── doc/                    # Documentation
├── prisma/                 # Database schema and SQL views
├── public/                 # Static assets
│   ├── defaults/          # Default content (terms, privacy)
│   ├── favicons/          # Favicon assets
│   ├── images/            # Brand and UI images
│   └── install/           # Installation data (countries, currencies, locales)
└── src/                    # Source code
    ├── actions/           # Server actions (organized by domain)
    │   ├── admin/         # Admin actions
    │   ├── storeAdmin/    # Store admin actions
    │   ├── sysAdmin/      # System admin actions
    │   ├── store/         # Store-related actions
    │   ├── user/          # User actions
    │   └── mail/          # Email management
    ├── app/               # Next.js App Router
    │   ├── (root)/        # Public routes
    │   │   ├── account/   # User account pages
    │   │   ├── checkout/  # Checkout flow
    │   │   ├── order/     # Order viewing
    │   │   └── unv/       # Universal landing pages
    │   ├── (store)/       # Store routes
    │   │   └── [storeId]/ # Dynamic store pages
    │   ├── api/           # API routes
    │   ├── storeAdmin/    # Store admin dashboard
    │   └── sysAdmin/      # System admin dashboard
    ├── components/        # Reusable UI components
    │   ├── ui/           # Shadcn UI components
    │   ├── auth/         # Authentication components
    │   └── modals/       # Modal dialogs
    ├── hooks/            # Custom React hooks
    ├── lib/              # Core utilities and integrations
    │   ├── auth.ts       # Authentication logic
    │   ├── prismadb.ts   # Database client
    │   ├── linePay/      # LINE Pay integration
    │   └── stripe/       # Stripe integration
    ├── providers/        # React context providers
    ├── types/            # TypeScript type definitions
    └── utils/            # Helper functions
```

For detailed file organization standards, see [File Organization Standards](./.cursor/rules/file-organization.mdc).

## Architecture

### Route Organization

The application uses Next.js 15 App Router with route groups for logical organization:

- **`(root)/`**: Public-facing pages (home, account, checkout, orders)
- **`(store)/[storeId]/`**: Store-specific pages (menu, products, FAQ, support)
- **`storeAdmin/`**: Store management dashboard (requires store owner role)
- **`sysAdmin/`**: Platform administration (requires admin role)
- **`api/`**: API endpoints for external integrations and webhooks

### Data Flow

1. **Server Components (default)**: Fetch data on the server for optimal performance
2. **Server Actions**: Handle mutations and form submissions with type-safe validation
3. **Client Components**: Used only for interactive UI elements (marked with `'use client'`)
4. **Local State Management**: Client components manage UI state with React hooks
5. **URL State**: Shareable state managed via URL search params with `nuqs`

### Code Patterns

- **CRUD Operations**: Modern client state pattern (see [Cursor Rules](./.cursor/rules/))
- **Form Handling**: React Hook Form + Zod validation on client and server
- **Server Actions**: Safe-action wrapper with `adminActionClient`, `userRequiredActionClient`, or `baseClient`
- **Validation**: Collocated Zod schemas (`*.validation.ts`) for type safety
- **Icons**: Standardized on `@tabler/icons-react` (see [Icon Library Standards](./.cursor/rules/icon-library.mdc))

## Key Features

### Multi-Tenant Architecture

- **Store Management**: Each store has independent settings, menus, and orders
- **Custom Domains**: Support for custom domains per store (future)
- **Store Isolation**: Data isolation between stores with role-based access control

### Customer Experience

- **Menu Browsing**: Browse categories and products with images
- **Product Options**: Customizable product variants and add-ons
- **Cart Management**: Persistent cart with real-time updates
- **Order Tracking**: Real-time order status updates
- **Queue Management**: Virtual queue system with estimated wait times
- **Multi-Language**: Support for English and Traditional Chinese (extensible)

### Store Management

- **Product Catalog**: Manage categories, products, and variants
- **Order Processing**: View, update, and fulfill orders
- **Customer Communication**: Support ticket system
- **Business Hours**: Configurable operating hours and special schedules
- **Payment Settings**: Configure accepted payment methods
- **Analytics**: Order history and sales reports (planned)

### Platform Administration

- **Store Oversight**: Manage all stores and store owners
- **User Management**: User roles and permissions
- **System Messages**: Platform-wide announcements
- **Email Templates**: Customizable transactional email templates
- **Payment/Shipping Methods**: Configure platform-wide options
- **System Logs**: Audit trail and error logs

### Payment Integration

- **Stripe**: Credit card, digital wallets, subscriptions
- **LINE Pay**: Popular payment method in Taiwan and Japan
- **Cash on Delivery**: Support for in-person payment
- **Multiple Currencies**: Support for USD, TWD, JPY, and more

### Authentication & Security

- **Better Auth**: Modern authentication with multiple methods
  - Email/Password with email verification
  - Magic link (passwordless)
  - OAuth (Google, LINE)
  - Passkeys (WebAuthn)
- **Role-Based Access**: User, Store Owner, Admin roles
- **reCAPTCHA v3**: Bot protection on forms
- **HTTPS**: Enforced secure connections
- **Data Privacy**: GDPR-compliant data handling

## Development Workflow

### Code Organization

- **Naming**: Use `kebab-case` for files, `PascalCase` for components
- **Imports**: Use `@/` alias for absolute imports
- **Components**: Keep files under 300 lines when possible
- **Server First**: Default to Server Components, use Client Components only when needed
- **Type Safety**: Define types for all props and use Zod for validation

### Adding New Features

1. **Define Types**: Add TypeScript types in `src/types.d.ts` or `src/types/`
2. **Create Schema**: Define Zod validation schema in `*.validation.ts`
3. **Create Action**: Implement server action in `src/actions/[domain]/`
4. **Create Page**: Add route in appropriate `src/app/` directory
5. **Create Components**: Build UI components in `src/components/` or feature-specific `components/` folder
6. **Test**: Verify functionality and check for linter errors

### Database Changes

```bash
# Update schema in prisma/schema.prisma

# Generate Prisma client
bun run sql:generate

# Push changes to database (development)
bun run sql:dbpush

# Create migration (production)
bunx prisma migrate dev --name descriptive_name
```

### Code Quality

```bash
# Format code with Biome
bun run format

# Check for lint errors
bun run lint

# Fix lint errors automatically (if available)
bun run lint:fix
```

## Scripts Reference

### Development

- `bun run dev` - Start development server on <http://localhost:3000>
- `bun run build` - Create production build
- `bun run start` - Start production server
- `bun run turbo` - Run with Turbo mode enabled

### Database

- `bun run sql:generate` - Generate Prisma client
- `bun run sql:dbpush` - Push schema changes to database (dev)
- `bun run sql:migrate` - Create and apply migrations (prod)
- `bun run sql:studio` - Open Prisma Studio (database GUI)

### Platform Setup

- `bun run install:platform` - Initialize platform data (run once after database setup)
  - Populates countries, currencies, locales
  - Imports payment and shipping methods
  - Creates Stripe products

### Code Quality

- `bun run lint` - Run Biome linter
- `bun run format` - Format code with Biome
- `bun run type-check` - Run TypeScript compiler check

### Utilities

- `bin/optimize-build.js` - Optimize production build
- `bin/upgrade_pkg.sh` - Upgrade dependencies
- `bin/pg_backup.sh` - Backup PostgreSQL database
- `bin/sync_from_production.sh` - Sync data from production
- `bin/sync_to_production.sh` - Deploy to production

## Documentation

### Project Documentation

Additional documentation can be found in the `/doc` directory:

- [Deployment Guide](./doc/DEPLOYMENT.md)
- [PostgreSQL Deployment](./doc/DEPLOYMENT-postgres.md)
- [Environment Variables](./doc/ENVIRONMENT_VARIABLES.md)
- [Google Analytics Setup](./doc/GOOGLE_ANALYTICS_COMPLETE_GUIDE.md)
- [reCAPTCHA Setup](./doc/RECAPTCHA_SETUP.md)
- [Security Guidelines](./doc/SECURITY.md)
- [Contributing Guidelines](./doc/CONTRIBUTING.md)

### Development Rules

Development standards and conventions are documented in `.cursor/rules/`:

- [File Organization Standards](./.cursor/rules/file-organization.mdc)
- [Server Action Guide](./.cursor/rules/server-action.mdc)
- [Icon Library Standards](./.cursor/rules/icon-library.mdc)
- [Package Manager (Bun)](./.cursor/rules/package-manager.mdc)
- [CRUD Operation Pattern](./.cursor/rules/) (see workspace rules)

## Learn More

### Framework Documentation

- [Next.js 15 Documentation](https://nextjs.org/docs) - App Router, Server Components, Server Actions
- [React 19 Documentation](https://react.dev) - Latest React features
- [Bun Documentation](https://bun.sh/docs) - Runtime and package manager
- [TypeScript Documentation](https://www.typescriptlang.org/docs) - Type system

### Libraries & Tools

- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM
- [Better Auth Documentation](https://www.better-auth.com/docs) - Authentication
- [Tailwind CSS v4](https://tailwindcss.com/docs) - Utility-first CSS
- [Shadcn UI](https://ui.shadcn.com) - Component library
- [React Hook Form](https://react-hook-form.com) - Form handling
- [Zod](https://zod.dev) - Schema validation
- [next-safe-action](https://next-safe-action.dev) - Type-safe server actions

### Payment Integrations

- [Stripe Documentation](https://stripe.com/docs) - Payment processing
- [LINE Pay Documentation](https://pay.line.me/tw/developers/apis/onlineApis) - LINE Pay API

## Contributing

Please read [CONTRIBUTING.md](./doc/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is proprietary and confidential.

## Support

For issues, questions, or feature requests, please open an issue in the repository or contact the development team.
