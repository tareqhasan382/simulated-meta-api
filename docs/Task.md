🧩 Task: Resilient Meta API Integration Service
You are building a service that simulates interaction with the Meta Ads API.

We are NOT testing Meta account setup — we are testing how you handle real backend challenges.

1. Simulated Meta API
Create a mock API (or function) that:

Sometimes succeeds

Sometimes fails (randomly)

Sometimes returns “rate limit error”

2. Build Insights Fetch System
Implement a service that:

Fetches “ad insights” data from the mock API

Fields:

campaign_id

impressions

clicks

spend

date

3. Key Requirements
✅ Retry Logic
Handle failures with retry (exponential backoff preferred)

✅ Rate Limit Handling
Detect rate limit errors

Delay and retry properly

✅ Idempotency
Avoid duplicate data in DB

✅ Async Processing
Use queue (BullMQ / Redis / similar)

4. API Endpoints
POST /sync-insights → trigger job

GET /insights → fetch stored data

5. Database
PostgreSQL

Proper schema design

6. What We Care About
Real-world thinking

Handling unreliable APIs

Clean but practical architecture

Not over-engineering

7. Tech Stack
Node.js (NestJS preferred)

PostgreSQL

Queue system

📦 Submission
Please submit:

GitHub repository

README:

Setup steps

Design decisions

Tradeoffs

