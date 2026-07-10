# Job Application Tracker API

A production-grade REST API for tracking job applications — built with Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, and Docker. Every architectural decision in this project was made deliberately, with security, scalability, and maintainability in mind.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 | Industry standard, non-blocking I/O |
| Framework | Express 5 | Minimal, flexible, widely used in production |
| Language | TypeScript | Type safety at compile time, catches bugs early |
| Database | PostgreSQL 15 | ACID compliant, production standard for relational data |
| ORM | Prisma 6 | Type-safe queries, migration management, schema as code |
| Cache / Blacklist | Redis 7 | In-memory speed for token blacklisting and rate counters |
| Auth | JWT + bcrypt | Stateless identity, secure password hashing |
| Validation | Zod | Runtime type safety, eliminates manual type checking |
| Email | Resend | Reliable transactional email for verification and password reset |
| Logging | Pino | Structured JSON logging, production-grade observability |
| Security Headers | Helmet | 11 HTTP security headers in one line |
| Rate Limiting | express-rate-limit | Brute force and abuse prevention |
| Containerisation | Docker + docker-compose | Reproducible environment across all machines |

---

## Project Structure

```
job-tracker/
├── prisma/
│   ├── schema.prisma          # Database schema — single source of truth
│   └── migrations/            # Versioned SQL migration history
├── src/
│   ├── auth/
│   │   ├── authController.ts  # All auth handlers
│   │   ├── authMiddleware.ts  # JWT verification + Redis blacklist check
│   │   ├── authRoutes.ts      # Auth route definitions
│   │   ├── authSchemas.ts     # Zod validation schemas
│   │   ├── emailService.ts    # Resend email integration
│   │   ├── jwtUtils.ts        # Token generation and verification
│   │   └── passwordUtils.ts   # bcrypt hash and compare
│   ├── middleware/
│   │   ├── rateLimiter.ts     # Per-endpoint rate limits
│   │   └── requestLogger.ts   # Pino request logging middleware
│   ├── types/
│   │   └── express.d.ts       # Extended Request type (user, requestId)
│   ├── db.ts                  # Prisma query functions
│   ├── errorHandler.ts        # AppError class + global error middleware
│   ├── logger.ts              # Pino logger (pretty dev, JSON prod)
│   ├── redis.ts               # Redis client (local + cloud URL support)
│   ├── routes.ts              # Job route handlers
│   ├── server.ts              # Express app setup and entry point
│   ├── types.ts               # Shared TypeScript interfaces
│   └── validation.ts          # Job input validation
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional but recommended)

### Local Setup

```bash
# Clone the repo
git clone https://github.com/m0nds/job-application-api.git
cd job-application-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your values in .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Setup (recommended)

```bash
# Start entire stack — app + PostgreSQL + Redis
docker-compose up --build

# Run migrations against Docker database
docker-compose exec app npx prisma migrate deploy
```

Server runs on `http://localhost:3000`

---

## Environment Variables

```env
DATABASE_URL=postgresql://username@localhost:5432/job_tracker
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

JWT_ACCESS_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=another_long_random_secret

RESEND_API_KEY=re_your_key_here
BASE_URL=http://localhost:3000

REDIS_HOST=localhost
REDIS_PORT=6379
# or for cloud Redis:
# REDIS_URL=redis://...
```

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Reference

### Base URLs
```
Auth:  /api/auth
Jobs:  /api/jobs  (all routes require authentication)
```

---

### Authentication Endpoints

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| POST | `/api/auth/register` | Register new account | 10/hour |
| GET | `/api/auth/verify` | Verify email address | — |
| POST | `/api/auth/login` | Login and receive tokens | 5/15min |
| POST | `/api/auth/refresh` | Rotate refresh token | — |
| POST | `/api/auth/logout` | Invalidate tokens | — |
| POST | `/api/auth/forgot-password` | Request password reset email | 3/hour |
| POST | `/api/auth/reset-password` | Reset password with token | — |

---

#### POST `/api/auth/register`

```json
{
  "name": "Raymond Elegbede",
  "email": "raymond@example.com",
  "password": "SecurePass@123",
  "confirmPassword": "SecurePass@123"
}
```

Password requirements: min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.

Response `201`:
```json
{
  "message": "Account created successfully",
  "user": { "id": "...", "name": "...", "email": "...", "isVerified": false }
}
```

A verification email is sent automatically. Account cannot login until verified.

---

#### GET `/api/auth/verify?token=<token>`

Verifies email address. Token expires after 24 hours.

Response `200`:
```json
{
  "message": "Email verified successfully, you can now login"
}
```

---

#### POST `/api/auth/login`

```json
{
  "email": "raymond@example.com",
  "password": "SecurePass@123"
}
```

Response `200`:
```json
{
  "message": "Login successful",
  "accessToken": "eyJ...",
  "user": { "id": "...", "name": "...", "email": "...", "isVerified": true }
}
```

Refresh token set as `httpOnly` cookie automatically. Access token expires in 15 minutes.

---

#### POST `/api/auth/refresh`

No body required. Reads refresh token from `httpOnly` cookie automatically.

Response `200`:
```json
{
  "accessToken": "eyJ..."
}
```

Issues a new access token and rotates the refresh token.

---

#### POST `/api/auth/logout`

Requires `Authorization: Bearer <token>` header.

Blacklists the access token in Redis instantly. Clears the refresh token cookie.

Response `200`:
```json
{
  "message": "Logged out successfully"
}
```

---

#### POST `/api/auth/forgot-password`

```json
{ "email": "raymond@example.com" }
```

Always returns the same response whether the email exists or not — prevents email enumeration.

Response `200`:
```json
{
  "message": "If an account with that email exists, you will receive a reset link shortly"
}
```

---

#### POST `/api/auth/reset-password`

```json
{
  "token": "token-from-email",
  "newPassword": "NewSecurePass@123",
  "confirmPassword": "NewSecurePass@123"
}
```

Reset token expires after 1 hour.

Response `200`:
```json
{
  "message": "Password reset successful, please login with your new password"
}
```

---

### Job Endpoints

All job endpoints require `Authorization: Bearer <accessToken>` header. Users can only access their own jobs — attempting to access another user's job returns `404`, not `403` (see Architecture Decisions).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | Get all jobs (filtering + pagination) |
| GET | `/api/jobs/stats` | Get counts by status |
| GET | `/api/jobs/:id` | Get a single job |
| POST | `/api/jobs` | Create a job |
| PATCH | `/api/jobs/:id` | Partially update a job |
| DELETE | `/api/jobs/:id` | Delete a job |

---

#### GET `/api/jobs`

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status (exact match) |
| `company` | string | Filter by company name (case-insensitive partial match) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

```bash
curl "http://localhost:3000/api/jobs?status=interview&company=stripe&page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

Response `200`:
```json
{
  "data": [...],
  "page": 1,
  "limit": 10,
  "total": 4,
  "totalPages": 1
}
```

---

#### GET `/api/jobs/stats`

Response `200`:
```json
{
  "total": 12,
  "byStatus": {
    "wishlist": 2,
    "applied": 5,
    "interview": 3,
    "offer": 1,
    "rejected": 1,
    "withdrawn": 0
  }
}
```

---

#### POST `/api/jobs`

```json
{
  "company": "Stripe",
  "role": "Backend Engineer",
  "status": "applied",
  "appliedDate": "2026-06-01",
  "notes": "Referred by a contact",
  "jobUrl": "https://stripe.com/jobs/123"
}
```

Valid statuses: `wishlist` `applied` `interview` `offer` `rejected` `withdrawn`

Response `201` — returns the created job object.

---

#### PATCH `/api/jobs/:id`

Send only the fields you want to update:

```json
{ "status": "interview" }
```

Response `200` — returns the full updated job object.

---

#### DELETE `/api/jobs/:id`

Response `204 No Content`

---

## Architecture Decisions

**Why JWT with short-lived access tokens + httpOnly refresh tokens?**
Access tokens expire in 15 minutes. If stolen, the damage window is limited. Refresh tokens live in `httpOnly` cookies — JavaScript cannot read them, so XSS attacks cannot steal them. This combination gives users persistent sessions without compromising security.

**Why Redis for token blacklisting and not PostgreSQL?**
On logout, access tokens need to be invalidated immediately — even before they expire naturally. Checking a blacklist on every request requires a fast lookup. Redis stores data in memory — microseconds per lookup vs milliseconds for PostgreSQL. Redis TTL also auto-deletes blacklisted tokens when they expire, with zero maintenance.

**Why 404 and not 403 when accessing another user's resource?**
`403 Forbidden` confirms the resource exists — information an attacker can use to enumerate other users' data. `404 Not Found` reveals nothing. A user trying to access a job that belongs to someone else gets the same response as requesting a job that doesn't exist at all.

**Why Zod for validation?**
TypeScript types are compile-time only. By the time your server is running, TypeScript is gone. Zod validates at runtime — the moment untrusted data enters the system. It also infers TypeScript types from schemas automatically, eliminating separate type definitions and validation logic.

**Why bcrypt cost factor 12?**
A modern GPU can compute 8 billion MD5 hashes per second. bcrypt cost factor 12 limits that to around 2,500 attempts per second — making brute-force attacks on a leaked database take thousands of years instead of minutes. Cost factor 12 is the industry standard balance between security and acceptable login latency (~400ms).

**Why email enumeration prevention on register and forgot-password?**
If your API responds differently when an email exists vs doesn't exist, attackers can build a list of valid emails in your system. Every auth endpoint returns the same response regardless of whether an email is registered. Real users get information via email. Attackers learn nothing.

**Why Prisma migrations over manual SQL?**
Migration files are version-controlled SQL — every schema change is tracked in Git alongside the code that requires it. Teams can collaborate on schema changes without conflicts, and the full database history is auditable.

**Why Docker?**
"Works on my machine" is not a deployment strategy. Docker packages the entire runtime into a container that runs identically in development and production. `docker-compose up` starts the entire stack with one command.

---

## Security Features

```
✓  bcrypt password hashing (cost factor 12)
✓  JWT access tokens — 15 minute expiry
✓  Refresh token rotation — old token invalidated on every refresh
✓  Redis token blacklist — instant logout, tokens invalidated before expiry
✓  httpOnly cookies — refresh tokens inaccessible to JavaScript
✓  Email verification — accounts must verify before login
✓  Forgot password with 1-hour expiring tokens
✓  Rate limiting — 5 login/15min, 3 reset/hour, 10 register/hour
✓  Helmet — 11 HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
✓  Email enumeration prevention on all auth endpoints
✓  Resource scoping — users cannot access other users' data
✓  404 not 403 for other users' resources (prevents enumeration)
✓  Zod runtime validation — no untrusted data reaches the database
✓  Parameterised queries via Prisma — SQL injection impossible
✓  No sensitive data in responses (password, tokens always stripped)
✓  Zero hardcoded secrets — all configuration via environment variables
✓  0 npm audit vulnerabilities
```

---

## Error Handling

All errors follow a consistent shape:

```json
{ "error": "Descriptive error message" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing or malformed data |
| `401` | Unauthorized — missing, invalid, or expired token |
| `404` | Not found — resource doesn't exist for this user |
| `422` | Validation failed — invalid field values |
| `429` | Too many requests — rate limit exceeded |
| `500` | Unexpected server error |

---

## Logging

Pino structured logging with two modes:

**Development** — human-readable, colorized output with timestamps.

**Production** — raw JSON, every request logged with: timestamp, request ID, method, URL, status code, response time, and user ID. Machine-readable and searchable by monitoring tools.

---

## What's Next

```
Coming:
Phase 7    Healthcare API
           Multi-role RBAC (patient, doctor, receptionist, admin)
           Field-level encryption for medical records
           Tamper-evident audit logging (HIPAA-style)
           Role-scoped data access

Phase 8    Fintech Wallet API
           Double-entry bookkeeping
           Idempotency keys — prevent duplicate transactions
           Atomic SQL transactions — money moves safely
           Row-level locking — eliminate race conditions
           Append-only transaction ledger
```

---

## License

MIT