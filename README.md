# AL-BURHAN — Next.js + TypeScript + PostgreSQL + Prisma Blog Platform

An intellectual apologetics, scientific verification, and counter-critique blog platform featuring:
- **AI Semantic Auto-Search** (instant concept & synonym matching + PostgreSQL `pgvector` embeddings)
- **AI Refutation Chatbot (RAG)** (auto-searches stored blog posts and cites primary sources)
- **Smart Multi-Facet Filtering & Pagination** (by Category, Difficulty, Tags, Relevance, Views, Read Time)
- **Blog Publishing Studio** (create, edit, bookmark, and export refutation articles with an AI structure generator)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and add `DATABASE_URL` plus at least one AI provider key (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, or `GROQ_API_KEY`):
   ```bash
   cp .env.example .env
   ```
3. Push the Prisma schema to PostgreSQL:
   ```bash
   npx prisma db push
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## AI provider configuration

The authenticated AI assistant uses a free-first provider chain. By default it tries OpenRouter, then Gemini, then Groq, skipping any provider whose API key is not configured.

- **OpenRouter:** set `OPENROUTER_API_KEY`. The default `OPENROUTER_MODEL=openrouter/free` asks OpenRouter to select an available free chat model. OpenRouter's free models have strict shared quotas (currently up to 50 requests/day on its free plan), and availability can vary.
- **Gemini:** set `GEMINI_API_KEY`. The primary model defaults to `gemini-3.8-flash`; `gemini-3.5-flash-lite` is tried as its model-level fallback before moving to the next provider.
- **Groq:** set `GROQ_API_KEY` to add Groq as another fallback. In `AI_FREE_MODE=true` it is deliberately skipped until you set `AI_GROQ_FREE_TIER_CONFIRMED=true`. Only set that flag after confirming your Groq account is still on its Free tier. Groq Developer-tier model usage is billed by tokens.

Keep `AI_FREE_MODE=true` for the free-first setup. API keys must remain server-side and must never use a `NEXT_PUBLIC_` prefix. Add the same variables in Vercel under **Project Settings → Environment Variables**, then redeploy.

Transient network/server failures are retried once with a short backoff. HTTP 429 rate-limit responses move directly to the next provider so retries do not unnecessarily consume free quota. Provider, model, status, latency, and request IDs are logged without recording the user's prompt or API keys. Gemini vector-search failures fall back to PostgreSQL keyword retrieval; the AI can still answer without library context if the retrieval query fails.

Free tiers have changing quotas and availability. This fallback chain improves resilience but cannot guarantee uninterrupted service when all configured providers are rate-limited or unavailable.

