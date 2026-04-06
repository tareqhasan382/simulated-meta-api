# Resilient Meta Ads Insights Sync Service

A production-grade NestJS service designed to simulate a robust integration with the Meta Ads API. This system handles high-volume asynchronous data synchronization with a focus on resilience, rate-limit handling, and data idempotency.

---

## 🏗️ Architecture Overview

The system follows a modular architecture using **NestJS**, **BullMQ** for task queuing, and **Prisma** for database interactions.

```text
[ Client ] 
    |
    | (POST /insights/sync)
    v
[ Insights Controller ] --- (Accepts Job) ---> [ HTTP 202 ]
    |
    | (Enqueues Task)
    v
[ BullMQ (Redis) ] <--- (Idempotent Job ID: campaign_id + date)
    |
    | (Processes Task)
    v
[ Insights Processor ] 
    |
    | (Calls Mock Meta API)
    +---> [ Success (60%) ] ----> [ Prisma Upsert (PostgreSQL) ]
    |
    +---> [ Rate Limit (20%) ] --> [ Exponential Backoff Retry ]
    |
    +---> [ Server Error (20%) ] -> [ Standard Retry Strategy ]
```

---

## 🚀 Key Strategies

### 1. Asynchronous Processing (BullMQ)
We use BullMQ to decouple the ingestion request from the heavy lifting of API calling and data persistence. This ensures the user receives an immediate response (`202 Accepted`) while the system handles the work in the background.

### 2. Resilience & Retry Strategy
The system implements a robust **Exponential Backoff** strategy for failures:
- **Normal Failures (500)**: Retried up to 5 times with increasing delays (1s, 2s, 4s, 8s, 16s).
- **Rate Limits (429)**: Specifically detected and logged. While the backoff is automatic via BullMQ, the structured logs allow for easy monitoring of API throttling.

### 3. Data Idempotency
- **Job Level**: We prevent duplicate processing by generating a deterministic `jobId` (`campaign_id_date`). BullMQ will not allow two active jobs with the same ID to exist simultaneously.
- **Database Level**: We use a composite unique constraint on `(campaign_id, date)` in PostgreSQL. Prisma's `upsert` ensures that even if a job runs twice, the data is updated rather than duplicated.

### 4. Observability
Structured logs in the [InsightsProcessor](src/modules/insights/insights.processor.ts) provide real-time insights into:
- Job start and completion
- Attempt numbers
- Specific error reasons (Rate Limit vs. Server Error)
- Progress updates (0% to 100%)

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **Docker** & **Docker Compose**

### 2. Infrastructure
Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

### 3. Environment
Ensure your `.env` file is configured:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/zipto_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
PORT=4000
```

### 4. Database Setup
```bash
# Install dependencies
npm install

# Run migrations and seed initial data (SeederService runs on bootstrap)
npx prisma migrate dev --name init
npm run start:dev
```

---

## 📖 API Documentation

Access the interactive Swagger UI at:
👉 **[http://localhost:4000/api/docs](http://localhost:4000/api/docs)**

### Examples

**Trigger Sync**
```bash
curl -X POST http://localhost:4000/insights/sync \
  -H "Content-Type: application/json" \
  -d '{"campaign_id": "camp_999", "date": "2024-03-25"}'
```

**Fetch with Filters**
```bash
curl "http://localhost:4000/insights?campaign_id=camp_999&from=2024-03-01&to=2024-03-31&limit=5"
```

---

## ⚖️ Tradeoffs & Future Improvements

- **In-Memory Rate Limiting**: The current mock API uses random distribution. In a real scenario, we would implement a **Redis-backed Global Rate Limiter** to pause the queue entirely when a 429 is received.
- **Batching**: Currently, sync is per-campaign/date. For massive datasets, **batch syncing** would be more efficient to reduce API calls.
- **Job Status API**: Future iterations could include a `GET /insights/sync/:jobId` endpoint to track the status of specific background tasks.
