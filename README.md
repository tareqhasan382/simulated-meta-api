# Resilient Meta API Integration Service

A production-ready NestJS backend service simulating a resilient Meta Ads Insights integration system.

## 🚀 Features

- **Simulated Meta API**: Mock service with 60% success, 20% 500 error, and 20% 429 rate limit distribution.
- **Async Processing**: BullMQ for background job processing.
- **Resilience**: Exponential backoff retry strategy (1s, 2s, 4s, 8s, 16s).
- **Idempotency**: Prisma upsert with composite unique keys (`campaign_id` + `date`).
- **Swagger Documentation**: Interactive API docs.
- **Pagination**: Support for limit/offset in results.
- **Global Response Interceptor**: Consistent API response format.

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ + Redis
- **Validation**: class-validator & class-transformer
- **API Docs**: Swagger

## 📋 Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### 2. Infrastructure (Postgres & Redis)
Run the following command to start the required services:
```bash
docker-compose up -d
```

### 3. Environment Variables
Ensure you have a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/zipto_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
PORT=3000
```

### 4. Database Setup
Run migrations and seed the database:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start Application
```bash
npm run start:dev
```

## 📖 API Documentation

Once the application is running, access Swagger UI at:
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

### Key Endpoints

- **POST `/insights/sync`**: Trigger a background sync job.
  - Body: `{ "campaign_id": "string", "date": "ISO-DATE" }`
- **GET `/insights`**: Retrieve stored insights.
  - Query: `?limit=10&offset=0`

## 🏗️ Architecture Decisions

### 1. BullMQ for Resiliency
We use BullMQ to decouple the API request from the actual sync process. This allows us to handle failures (like Meta API 500s or 429s) without impacting the user experience.

### 2. Exponential Backoff
The queue is configured with an exponential backoff strategy. If a job fails (e.g., due to a 429 Rate Limit), BullMQ will wait increasingly longer before retrying (1s, 2s, 4s, 8s, 16s).

### 3. Idempotency with Prisma
By using a composite unique constraint on `(campaign_id, date)` in the database, we ensure that even if a job is retried or triggered multiple times, we never store duplicate data. Prisma's `upsert` handles this atomically.

### 4. Global Interceptor
A `TransformInterceptor` ensures that all API responses follow a consistent structure:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [...],
  "meta": { "total": 100, "limit": 10, "offset": 0 }
}
```

## 🚧 Tradeoffs

- **Memory Blocking**: The Mock API uses `Math.random()` for error simulation. In a real production system, rate limiting would be tracked via Redis across all worker instances.
- **Sync Granularity**: Currently, sync is triggered per campaign/date. For massive accounts, batch syncing might be more efficient.
