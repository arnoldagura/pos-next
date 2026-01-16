# Enterprise Multi-Tenant POS System

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A production-ready point-of-sale and inventory management system with subdomain-based multi-tenancy, comprehensive RBAC, and advanced manufacturing workflows.**

[Features](#-features) • [Demo](#-demo) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Testing](#-testing)

</div>

---

## 📋 Overview

This enterprise-grade POS system enables multiple organizations to operate independently on a single deployment through subdomain-based multi-tenancy. Built with Next.js 16 and TypeScript, it features comprehensive inventory management, production workflows, role-based access control, and real-time analytics.

### Key Highlights

- **🏢 Multi-Tenant Architecture**: Subdomain-based organization isolation with super admin capabilities
- **🔐 Advanced RBAC**: Hierarchical roles with granular permissions (6 predefined roles, unlimited custom roles)
- **🏭 Manufacturing Support**: Recipe-based production with automated costing and batch tracking
- **📦 Smart Inventory**: Multi-location tracking, expiry management, and automated low-stock alerts
- **📊 Analytics & Reporting**: Comprehensive sales reports with CSV/Excel/JSON export
- **🧾 Professional Receipts**: Thermal printer support with ESC/POS commands
- **⚡ Performance Optimized**: Request caching, virtual scrolling, debounced search
- **🎯 Type-Safe**: End-to-end TypeScript with zero `any` types

---

## ✨ Features

### Point of Sale
- **Intuitive POS Interface**: Product grid with cart management, discounts, and tax calculations
- **Multiple Payment Methods**: Cash, card, digital wallets with detailed tracking
- **Order Management**: Complete order lifecycle (pending → processing → completed/cancelled)
- **Receipt System**: Print, download, or share professional receipts
- **Table Service**: Restaurant-style table ordering and management

### Inventory Management
- **Product Inventory**:
  - Multi-location stock tracking with location-specific quantities
  - SKU and barcode support with variant management
  - Cost and pricing management with markup calculations
  - Alert thresholds for automated low-stock notifications

- **Material Inventory**:
  - Raw material tracking with batch management
  - Expiry date management at batch level
  - Supplier management with default supplier assignments
  - Material categories for organization

### Production & Manufacturing
- **Production Orders**: Recipe-based production with status tracking
- **Production Recipes**: Configure recipes with:
  - Material ingredients with precise quantities
  - Output specifications (product or material)
  - Multi-step production workflows
- **Automated Costing**: Calculate material, labor, and overhead costs with unit cost breakdown

### Multi-Tenant Organization Management
- **Subdomain-Based Routing**: Each organization gets unique subdomain (e.g., `acme.yourdomain.com`)
- **Tenant Isolation**: Complete data separation with organization-scoped queries
- **Super Admin Dashboard**: Cross-organization management and analytics
- **Subscription Tiers**: Starter, Professional, Enterprise with feature gating
- **Audit Logging**: Track tenant switches and critical operations with IP logging

### Role-Based Access Control
- **Hierarchical Roles**:
  - `super_admin`: Global access to all organizations
  - `admin`: Organization administrator
  - `manager`: Management with limited admin capabilities
  - `cashier`: POS operations
  - `kitchen`: Production and kitchen management
  - `inventory`: Inventory management

- **Granular Permissions**: Resource-action pairs (e.g., `products:create`, `orders:read`)
- **Permission Caching**: Request-scoped caching to minimize database queries
- **Custom Roles**: Create unlimited custom roles with specific permission sets

### Analytics & Reporting
- **Sales Reports**:
  - Summary, detailed, and daily breakdowns
  - Category performance analysis
  - Payment method analytics
  - Top products by quantity and revenue
  - Date range filtering with custom periods

- **Export Capabilities**: CSV, Excel, JSON with auto-generated filenames
- **Real-time Dashboard**: Live sales metrics, trending products, inventory alerts
- **Customer Analytics**: Purchase history, loyalty points, customer segmentation

### Additional Features
- **Customer Management**: Full CRUD with contact info, loyalty points, payment preferences
- **Location Management**: Support for multiple physical locations per organization
- **Category System**: Product and material categorization with hierarchical structure
- **Low Stock Alerts**: Automated notifications when inventory falls below thresholds
- **Expiring Materials**: Track and alert for materials approaching expiry dates
- **Dark Mode**: System-wide dark theme support with user preference persistence

---

## 🎬 Demo

> **Note**: Add demo screenshots, GIF, or video link here

### Live Demo
[Coming Soon] - Live demo deployment

### Quick Preview
```bash
# Clone and run locally (see Getting Started section)
npm run dev
# Visit http://localhost:3000
```

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js 16.0](https://nextjs.org) with App Router
- **UI Library**: [React 19.2](https://react.dev) with Server Components
- **Language**: [TypeScript 5](https://www.typescriptlang.org) with strict mode
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) with utility-first approach
- **Components**: [Radix UI](https://radix-ui.com) for accessible, unstyled primitives
- **Icons**: [Lucide React](https://lucide.dev) (555+ modern icons)

### State Management
- **Server State**: [TanStack React Query](https://tanstack.com/query) v5 with request deduplication
- **Client State**: [Zustand](https://zustand-demo.pmnd.rs) v5 for lightweight store management
- **Form State**: [React Hook Form](https://react-hook-form.com) v7 with Zod validation

### Backend & Database
- **API**: Next.js API Routes with middleware protection
- **Database**: [PostgreSQL](https://postgresql.org) with connection pooling
- **ORM**: [Drizzle ORM](https://orm.drizzle.team) v0.45 with TypeScript inference
- **Migrations**: Drizzle Kit for schema management
- **Authentication**: [Better Auth](https://better-auth.com) v1.4 with session management

### Developer Tools
- **Testing**:
  - Unit: [Vitest](https://vitest.dev) v4 with UI
  - Components: [React Testing Library](https://testing-library.com) v16
  - E2E: [Playwright](https://playwright.dev) v1.57
- **Linting**: ESLint 9 with Next.js config
- **Git Hooks**: [Husky](https://typicode.github.io/husky) v9 with [Commitlint](https://commitlint.js.org)
- **Type Checking**: TypeScript with strict mode enabled

### Key Libraries
- **Validation**: [Zod](https://zod.dev) v4 for runtime schema validation
- **Date Utilities**: [date-fns](https://date-fns.org) v4 for date manipulation
- **Drag & Drop**: [@dnd-kit](https://dndkit.com) for accessible drag-and-drop
- **Excel Export**: [XLSX](https://sheetjs.com) v0.18 for spreadsheet generation
- **Notifications**: [Sonner](https://sonner.emilkowal.ski) v2 for toast notifications

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **PostgreSQL**: 14.x or higher
- **npm/yarn/pnpm**: Latest version

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pos-next.git
   cd pos-next
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**

   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/pos_db

   # Better Auth
   BETTER_AUTH_SECRET=your-secret-key-here
   BETTER_AUTH_URL=http://localhost:3000

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. **Database Setup**

   ```bash
   # Generate migration files
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed database with sample data
   npm run db:seed

   # Create a super admin user (optional)
   npm run db:seed:super-admin
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Credentials (After Seeding)

```
Super Admin:
Email: superadmin@example.com
Password: SuperAdmin123!

Admin (Organization):
Email: admin@example.com
Password: Admin123!
```

---

## 🏗 Architecture

### Multi-Tenant Architecture

```mermaid
graph TB
    A[User Request] --> B{Subdomain Router}
    B -->|tenant1.domain.com| C[Tenant Context 1]
    B -->|tenant2.domain.com| D[Tenant Context 2]
    B -->|admin.domain.com| E[Super Admin]

    C --> F[RBAC Middleware]
    D --> F
    E --> F

    F --> G{Permission Check}
    G -->|Authorized| H[API Routes]
    G -->|Denied| I[403 Forbidden]

    H --> J[Drizzle ORM]
    J --> K[(PostgreSQL)]

    K --> L[Organization 1 Data]
    K --> M[Organization 2 Data]
    K --> N[Global Data]
```

### Tenant Resolution Strategy

1. **Subdomain** (Primary): Extract from `subdomain.yourdomain.com`
2. **Header Fallback**: Check `X-Tenant-ID` header
3. **Cookie Fallback**: Read from `tenant_id` cookie
4. **User Default**: Use user's default organization
5. **Super Admin**: Access all organizations

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant M as Middleware
    participant RBAC as RBAC Layer
    participant API as API Route
    participant DB as Database

    U->>M: Request (subdomain.app.com/api/products)
    M->>M: Extract tenant from subdomain
    M->>RBAC: Verify permissions
    RBAC->>DB: Check user roles & permissions
    DB-->>RBAC: Return permissions
    RBAC->>RBAC: Cache permissions (request-scoped)
    RBAC-->>API: Authorized with tenant context
    API->>DB: Query with organization_id filter
    DB-->>API: Return scoped data
    API-->>U: JSON Response
```

### Key Design Patterns

- **AsyncLocalStorage**: Request-scoped tenant context without prop drilling
- **Permission Caching**: Request-level cache to reduce DB queries
- **Route Protection**: Higher-order function for API middleware
- **Optimistic Updates**: React Query mutations with instant UI feedback
- **Virtual Scrolling**: Handle large datasets efficiently
- **Debounced Search**: Reduce API calls during user input

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── products/             # Product CRUD
│   │   ├── orders/               # Order management
│   │   ├── inventory/            # Inventory operations
│   │   ├── organizations/        # Multi-tenant management
│   │   └── [other-resources]/   # Additional API routes
│   ├── pos/                      # POS interface
│   ├── dashboard/                # Analytics dashboard
│   ├── admin/                    # Admin panel
│   └── [feature-pages]/         # Feature-specific pages
│
├── components/                   # React components
│   ├── ui/                       # Base UI components (Radix UI)
│   ├── pos/                      # POS-specific components
│   ├── dashboard/                # Dashboard widgets
│   ├── forms/                    # Form components
│   └── [feature]/               # Feature-specific components
│
├── drizzle/schema/              # Database schema
│   ├── user.ts                  # User & authentication
│   ├── organization.ts          # Multi-tenant schema
│   ├── product.ts               # Product & inventory
│   ├── order.ts                 # Orders & payments
│   ├── production.ts            # Manufacturing
│   └── rbac.ts                  # Roles & permissions
│
├── db/                          # Database utilities
│   ├── index.ts                 # Database connection
│   ├── seed.ts                  # Database seeding
│   └── migrations/              # Migration files
│
├── lib/                         # Business logic & utilities
│   ├── auth.ts                  # Authentication setup
│   ├── rbac.ts                  # Authorization logic
│   ├── tenant-context.ts        # Multi-tenant resolution
│   ├── session.ts               # Session management
│   ├── types/                   # TypeScript definitions
│   └── utils.ts                 # Helper functions
│
├── middleware/                  # API middleware
│   ├── rbac.ts                  # RBAC protection
│   └── rate-limiter.ts          # Rate limiting
│
├── stores/                      # Zustand stores
│   ├── cart-store.ts            # Shopping cart state
│   └── table-store.ts           # Table management state
│
├── hooks/                       # Custom React hooks
│   ├── use-product-inventory.ts # Inventory management
│   ├── use-debounced-value.ts   # Debounce utility
│   └── use-optimized-search.ts  # Search optimization
│
└── providers/                   # Provider components
    └── query-provider.tsx       # React Query setup
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests with Vitest
npm run test

# Unit tests with UI
npm run test:ui

# Test coverage report
npm run test:coverage

# E2E tests with Playwright
npm run test:e2e

# E2E tests with mocked backend
npm run test:e2e:mocked

# E2E tests in headed mode
npm run test:e2e:headed

# E2E tests with Playwright UI
npm run test:e2e:ui
```

### Test Coverage

- **Unit Tests**: Business logic, utilities, and hooks
- **Component Tests**: React components with Testing Library
- **E2E Tests**: Complete user workflows with Playwright
- **Mocked E2E**: Frontend testing without backend dependency

---

## 🗄 Database Management

### Drizzle Kit Commands

```bash
# Generate migration files from schema changes
npm run db:generate

# Run pending migrations
npm run db:migrate

# Push schema directly to database (dev only)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed

# Create a super admin user
npm run db:seed:super-admin

# Make existing user a super admin
npm run db:make-super-admin
```

---

## 🔐 Security Features

- **Authentication**: Session-based auth with Better Auth (24-hour expiry)
- **Authorization**: Request-level RBAC with permission caching
- **SQL Injection**: Protected via Drizzle ORM parameterized queries
- **XSS Protection**: React's built-in escaping + Content Security Policy
- **CSRF**: Same-origin policy + token validation
- **Rate Limiting**: Configurable rate limits on tenant switching and API endpoints
- **Audit Logging**: Track critical operations with IP and user agent
- **Data Isolation**: Organization-scoped queries prevent cross-tenant data leaks
- **Password Hashing**: Bcrypt with salt rounds
- **Session Security**: HTTP-only cookies with secure flag in production

---

## 📊 Performance Optimizations

- **Request Caching**: React Query with 5-10 minute stale times
- **Permission Caching**: Request-scoped permission checks
- **Virtual Scrolling**: Handle 1000+ items without performance degradation
- **Debounced Search**: 300ms debounce on search inputs
- **Code Splitting**: Dynamic imports with React Suspense
- **Image Optimization**: Next.js Image component with lazy loading
- **Database Indexing**: Optimized indexes on frequently queried columns
- **Connection Pooling**: PostgreSQL connection pool management

---

## 🌐 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/pos-next)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t pos-next .

# Run container
docker run -p 3000:3000 --env-file .env.local pos-next
```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) for the amazing framework
- [Radix UI](https://radix-ui.com) for accessible component primitives
- [Drizzle ORM](https://orm.drizzle.team) for the type-safe ORM
- [shadcn/ui](https://ui.shadcn.com) for component inspiration
- [TanStack Query](https://tanstack.com/query) for server state management

---

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter) - your.email@example.com

Project Link: [https://github.com/yourusername/pos-next](https://github.com/yourusername/pos-next)

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and PostgreSQL**

⭐ Star this repo if you find it helpful!

</div>
