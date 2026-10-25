![Openfront Rental](https://openship.org/og/openfront-rental.png)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenshiporg%2Fopenfront-rental&env=DATABASE_URL%2CSESSION_SECRET%2CNEXT_PUBLIC_APP_URL%2CS3_BUCKET_NAME%2CS3_REGION%2CS3_ENDPOINT%2CS3_ACCESS_KEY_ID%2CS3_SECRET_ACCESS_KEY)

Openfront Rental is a self-hostable platform for professional short-term accommodation managers. Guests can search stays, request quotes, reserve accommodation, sign agreements, and review private trip information. Hosts use the dashboard for properties, listings, calendars, pricing, reservations, guest messages, property tasks, payments, and owner statements.

## Demo

<a href="https://rental.openship.org"><img src="public/images/stays/juniper-house-01.jpg" alt="Accommodation image included in the Rental storefront" width="600"></a>

Housekind

| | |
|---|---|
| **Storefront** | [rental.openship.org](https://rental.openship.org) |
| **Dashboard** | [rental.openship.org/dashboard](https://rental.openship.org/dashboard) |
| **User** | `housekind@openship.org` |
| **Password** | `TwgDfZxLLDmyK7PGgTYu` |

[Learn more →](https://openship.org/products/openfront-rental)

[Documentation →](https://docs.openship.org/docs/openfront/rental/)

## The Openfront Ecosystem

Openfront is part of an ecosystem of open-source commerce tools:

- **[Openfront E-commerce](https://github.com/openshiporg/openfront)**: Headless e-commerce for retail.
- **[Openfront Restaurant](https://github.com/openshiporg/openfront-restaurant)**: Restaurant ordering, point of sale, and kitchen operations.
- **[Openship](https://github.com/openshiporg/openship)**: Order routing for multi-channel fulfillment.
- **Openfront Rental**: (This repository) Short-term accommodation booking and host operations.

## Core Features

### Admin Dashboard
Manage properties, accommodation units, listings, calendar blocks, pricing, reservations, guests, and agreements. Host workspaces also cover messages, property tasks, reviews, channels, payment records, payouts, owner statements, and reports.

### Storefront
Guests can search published stays, view listing details, browse collections, compare properties, and request a quote for dates and guest counts. Quote checkout leads to reservations; private trip, agreement, and message links support the guest journey.

### Reservations, Pricing & Agreements
Rates, seasonal rates, fees, taxes, cancellation policies, and house rules define stay terms. Quotes and reservation lines preserve accepted stay details. Host commands support reservation transitions, amendments, unit reassignment, cancellation requests, and agreement signing.

### Host Operations & Owner Accounting
Properties, units, calendar blocks, and property tasks support accommodation operations. Hosts can manage inbox conversations and review moderation. Owner assignments, statements, statement lines, payout records, security deposits, and damage claims keep financial and ownership records linked to stays; these records are not an external payout or deposit-custody service.

### Payments & Calendar Exchange
Manual payments are recorded by authorized hosts. The Stripe card adapter is explicitly test-mode only and rejects live-mode payments. Refund review and provider-attempt reconciliation are separate host workflows. Direct and iCalendar adapters support calendar exchange; no native OTA adapter is registered.

## Architecture

### Technology Stack
- **Frontend**: Next.js 16 with App Router and React 19.
- **Backend**: KeystoneJS 6 with a GraphQL API.
- **Database**: PostgreSQL with Prisma ORM.
- **Styling**: Tailwind CSS 4 with shared shadcn/ui components.
- **Authentication**: Session-based with role-based permissions.

### Application Structure
```text
openfront-rental/
├── app/                    # Search, listing, checkout, trip, and host routes
│   ├── dashboard/          # Host workspaces and first-admin setup
│   └── api/                # Health, payment webhooks, and assistant endpoints
├── features/
│   ├── keystone/           # Models, host access, stay commands, and workers
│   ├── platform/           # Host workspaces and onboarding
│   ├── storefront/         # Guest components and screens
│   └── integrations/       # Manual/test-card payments and calendar adapters
└── components/             # Shared UI components
```

### Data Models
The [Keystone model registry](features/keystone/models/index.ts) and [Prisma schema](schema.prisma) cover:

- Users, roles, host organizations, and host memberships.
- Properties, addresses, owners, owner assignments, units, bedrooms, beds, and amenities.
- Listings, media, collections, house rules, and calendar blocks.
- Rate plans, seasonal rates, fees, taxes, cancellation policies, and stay quotes.
- Guests, reservations, amendments, line items, and stay agreements.
- Payments, refunds, security deposits, damage claims, payouts, and owner statements.
- Conversations, messages, reviews, property tasks, channel records, and outbox events.

## Getting Started

### Prerequisites
- Node.js 20.9 or later, compatible with Next.js 16.
- A PostgreSQL database you can migrate.
- npm.

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/openshiporg/openfront-rental.git
   cd openfront-rental
   npm install
   ```

2. **Configure environment variables:**
   Create `.env` in the repository root with your database and a newly generated session secret:
   ```env
   DATABASE_URL=postgresql://user:password@host/database
   SESSION_SECRET=replace-with-a-new-random-value-of-at-least-32-characters
   PUBLIC_SIGNUPS_ALLOWED=false
   ```

   Generate each secret separately, for example with `openssl rand -hex 32`. Do not use the placeholder text as a secret.

   This repository has no environment example file; create `.env` directly. Set `NEXT_PUBLIC_APP_URL` to your application origin for production server-side requests, or use `NEXT_PUBLIC_BACKEND_URL` as an explicit backend origin. Production also requires `S3_BUCKET_NAME`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_STORE_LINK` for password-reset mail. The [runtime configuration](features/keystone/index.ts) and [origin resolver](features/keystone/lib/internal-origin.ts) define these settings.

   Replace URL examples and internal routing overrides with your actual application origin, or remove optional overrides you do not need. Never commit your `.env` file.

3. **Start development server:**
   ```bash
   npm run dev
   ```

   This builds Keystone, applies checked-in database migrations, and starts Next.js.

4. **Access the application:**
   Open the URL `npm run dev` prints, then use these paths:

   - **Storefront**: `/`
   - **Host dashboard**: `/dashboard`
   - **Guest trip entry**: `/trips`
   - **GraphQL API**: `/api/graphql`

5. **Create your first admin user:**
   Visit `/dashboard/init` on that application URL to create the initial administrator.

6. **Run host onboarding:**
   Use dashboard onboarding to configure the host organization and initial accommodation data. Review properties, units, listings, rates, and booking policies before publishing stays.

## Development Commands

- `npm run dev` - Build Keystone, apply migrations, and start Next.js development.
- `npm run build` - Build Keystone and Next.js for production; does not apply migrations.
- `npm start` - Start the production Next.js server.
- `npm run migrate:gen` - Build Keystone, generate view ordering, and generate/apply development migrations.
- `npm run migrate` - Apply checked-in Prisma migrations.
- `npm run release:migrate` - Apply the same checked-in migrations as a release step.
- `npm run lint` - Run ESLint.
- `npm run outbox:deliver` - Run the outbox delivery entry point.

Use a development database for `migrate:gen`; it generates and applies schema changes.

### Payment Integration
[Payment adapters](features/integrations/payment/index.ts) include manual recording and an explicitly test-only Stripe card path. The Stripe adapter requires `STRIPE_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` with test-mode keys. It does not accept live card payments. Callback handling lives at `/api/payment-webhooks/[providerCode]`.

### Calendar Integration
The registered [channel adapters](features/integrations/channels/index.ts) are direct and iCalendar. iCalendar exchange handles availability holds; its capability declaration does not provide rate, reservation, message, or remote-transport synchronization.

## Documentation

See the [Openfront Rental documentation](https://docs.openship.org/docs/openfront/rental/) for the vertical's application guide, data model, access boundaries, and integration notes. The [source models](features/keystone/models) and [business commands](features/keystone/mutations) describe the implementation in this repository.

## Security & Permissions

### Role-Based Access Control
- `canAccessDashboard` - Host dashboard access.
- `canReadProperties` / `canManageProperties` - Property records.
- `canReadListings` / `canManageListings` - Listing records.
- `canReadCalendar` / `canManageCalendar` - Calendar availability.
- `canReadPricing` / `canManagePricing` - Stay pricing.
- `canReadReservations` / `canManageReservations` - Reservations.
- `canReadPayments` / `canManagePayments` - Payment operations.
- `canReadPayouts` / `canManagePayouts` - Payout and owner-statement records.

### Security Features
- Session-based authentication and active-account checks.
- Host organization membership filters, with explicit platform-administrator privileges.
- Separate read and manage permissions for operational areas.
- Token-bound public trip, quote, agreement, and message access.
- Controlled reservation, payment, and refund commands rather than unrestricted lifecycle edits.
- Signed payment webhooks and bounded GraphQL request handling.

## Platform Components

### Admin Platform (`/dashboard`)
- **Properties & listings**: Accommodation units, media, amenities, and publication.
- **Calendar & pricing**: Blocks, rates, seasonal prices, fees, and taxes.
- **Reservations & agreements**: Stay lifecycle, amendments, assignment, and agreements.
- **Guests & inbox**: Guest profiles, conversations, and messages.
- **Tasks & reviews**: Property work and review moderation.
- **Payments & owners**: Manual records, test-card attempts, refunds, statements, payouts, and reports.

### Storefront Experience
- **Stay discovery**: Search, listing detail, collections, and comparison.
- **Quote & reservation**: Dates, guest counts, pricing, and quote checkout.
- **Guest trips**: Private stay information, agreements, and cancellation requests.
- **Guest communication**: Token-bound message pages and account access.

## Deployment

### Production Deployment
The Vercel button imports this repository. Provision PostgreSQL and configure the environment, storage, and any enabled integrations separately.

Build the application, apply migrations as a release step, and start the production server:

```bash
npm run build
npm run migrate
npm start
```

Back up an existing database before applying migrations. The included [`railway.toml`](railway.toml) builds without migrations and applies them when the application starts.

### Scaling Considerations
Keep host membership, reservation allocation, and calendar state in the shared PostgreSQL database. Run continuous outbox delivery with `npm run outbox:deliver -- --watch` under a supervisor when needed, and use shared object storage. iCalendar exchange is not an automatically supervised OTA synchronization service.

## Contributing

Use the development commands above when preparing changes. Keep model changes and their migrations together, and describe any workflow or permission changes in your pull request.

## License

No top-level license file or package license declaration is included in this repository.

## Support

- **Documentation**: [Openfront Rental guide](https://docs.openship.org/docs/openfront/rental/).
- **Issues**: [Report bugs and feature requests](https://github.com/openshiporg/openfront-rental/issues).
- **Product**: [Learn more about Openfront Rental](https://openship.org/products/openfront-rental).

---

Built with [Next.js](https://nextjs.org) and [KeystoneJS](https://keystonejs.com).
