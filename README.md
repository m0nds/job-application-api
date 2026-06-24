# Job Tracker API

A RESTful API for tracking job applications — built with Node.js, Express, and TypeScript. Designed with production patterns from the ground up: typed contracts, runtime validation, centralised error handling, and a persistence layer architected for a future database swap.

---

## Tech Stack

- **Runtime** — Node.js
- **Framework** — Express
- **Language** — TypeScript
- **Persistence** — JSON file (SQLite → PostgreSQL migration planned)
- **ID Generation** — uuid

---

## Project Structure

```
job-tracker/
├── data/
│   └── jobs.json          # Local persistence layer
├── src/
│   ├── types.ts           # Shared data contracts — single source of truth
│   ├── db.ts              # Persistence layer — isolated for database swap
│   ├── validation.ts      # Runtime input validation — discriminated union pattern
│   ├── errorHandler.ts    # Centralised error handling + asyncHandler wrapper
│   ├── routes.ts          # All route handlers
│   └── server.ts          # Express app setup and entry point
├── package.json
└── tsconfig.json
```

---

## Getting Started

**Prerequisites:** Node.js 18+, npm

```bash
# Clone the repo
git clone https://github.com/your-username/job-tracker.git
cd job-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`

---

## API Reference

### Base URL
```
http://localhost:3000/api/jobs
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | Get all jobs (supports filtering + pagination) |
| GET | `/api/jobs/stats` | Get application counts by status |
| GET | `/api/jobs/:id` | Get a single job by ID |
| POST | `/api/jobs` | Create a new job application |
| PATCH | `/api/jobs/:id` | Partially update a job |
| DELETE | `/api/jobs/:id` | Delete a job |

---

### GET `/api/jobs`

Returns all job applications. Supports optional filtering and pagination.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status (exact match) |
| `company` | string | Filter by company name (case-insensitive partial match) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

**Example**
```bash
curl "http://localhost:3000/api/jobs?status=interview&page=1&limit=10"
```

**Response**
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

### GET `/api/jobs/stats`

Returns a count of applications grouped by status.

```bash
curl http://localhost:3000/api/jobs/stats
```

**Response**
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

### GET `/api/jobs/:id`

```bash
curl http://localhost:3000/api/jobs/abc-123
```

**Response** `200`
```json
{
  "id": "abc-123",
  "company": "Stripe",
  "role": "Backend Engineer",
  "status": "interview",
  "appliedDate": "2026-06-01",
  "notes": "Referral from a contact",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-10T14:30:00.000Z"
}
```

---

### POST `/api/jobs`

**Request Body**
```json
{
  "company": "Stripe",
  "role": "Backend Engineer",
  "status": "applied",
  "appliedDate": "2026-06-01",
  "notes": "Applied via referral"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `company` | string | ✓ | Non-empty |
| `role` | string | ✓ | Non-empty |
| `status` | string | ✓ | See valid statuses below |
| `appliedDate` | string | ✓ | Format: YYYY-MM-DD |
| `notes` | string | — | Optional |

**Valid statuses:** `wishlist` `applied` `interview` `offer` `rejected` `withdrawn`

**Response** `201`
```json
{
  "id": "generated-uuid",
  "company": "Stripe",
  "role": "Backend Engineer",
  "status": "applied",
  "appliedDate": "2026-06-01",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-01T10:00:00.000Z"
}
```

---

### PATCH `/api/jobs/:id`

Partially updates a job. Only the fields you send will change.

```bash
curl -X PATCH http://localhost:3000/api/jobs/abc-123 \
  -H "Content-Type: application/json" \
  -d '{"status": "interview"}'
```

**Response** `200` — returns the full updated job object.

---

### DELETE `/api/jobs/:id`

```bash
curl -X DELETE http://localhost:3000/api/jobs/abc-123
```

**Response** `204 No Content`

---

## Error Handling

All errors follow a consistent shape:

```json
{
  "error": "Descriptive error message"
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request |
| `404` | Job not found |
| `422` | Validation failed — invalid or missing fields |
| `500` | Unexpected server error |

---

## Architecture Decisions

**Why the persistence layer is isolated in `db.ts`**
`readJobs` and `writeJobs` are the only functions that know about storage. Routes call them without knowing whether data comes from a file, SQLite, or PostgreSQL. Swapping the database means rewriting `db.ts` only — nothing else changes.

**Why validation is runtime, not just TypeScript**
TypeScript types are compile-time only. By the time your server runs, TypeScript is gone — it's just JavaScript. `validation.ts` guards against malformed, missing, or malicious input at runtime, which TypeScript cannot do.

**Why a centralised error handler**
Without it, every async route needs its own `try/catch` — inconsistent, unscalable, and easy to forget. `asyncHandler` wraps every route and forwards any thrown error to Express's error middleware automatically.

**Why PATCH and not PUT**
PUT replaces the entire resource. PATCH applies partial updates. A user updating only their application status shouldn't need to resend company and role — and shouldn't risk accidentally clearing fields.

---

## Upcoming Features

### Phase 3 — Database Migration
- [ ] Swap `db.ts` JSON persistence for SQLite (`better-sqlite3`)
- [ ] Migrate to PostgreSQL for production readiness
- [ ] Introduce Prisma ORM for type-safe database queries
- [ ] Database migrations with versioned SQL files

### Authentication & Security
- [ ] User registration and login (JWT + bcrypt)
- [ ] Short-lived access tokens (15 min) + httpOnly refresh token rotation
- [ ] Route protection — users see only their own applications
- [ ] Rate limiting on auth endpoints (`express-rate-limit`)
- [ ] Secure HTTP headers (`helmet`)
- [ ] Environment-based config (`dotenv`) — no hardcoded secrets

### API Improvements
- [ ] Sort by `appliedDate`, `createdAt`, `updatedAt` (`?sort=appliedDate&order=desc`)
- [ ] Date range filtering (`?from=2026-01-01&to=2026-06-30`)
- [ ] Role filtering with multiple values (`?status=applied,interview`)
- [ ] Response field selection (`?fields=company,role,status`)

### Observability
- [ ] Structured logging with `pino`
- [ ] Request ID middleware — trace requests across logs
- [ ] Health check endpoint with uptime and DB connectivity status

### Testing
- [ ] Unit tests for validation logic (`Jest`)
- [ ] Integration tests for all endpoints (`Supertest`)
- [ ] Security test cases — verify authorisation boundaries hold

### Deployment
- [ ] Dockerise the application
- [ ] Deploy to Railway with PostgreSQL
- [ ] GitHub Actions CI — run tests on every push

---

## License

MIT