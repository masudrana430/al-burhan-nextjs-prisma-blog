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
2. Copy `.env.example` to `.env` and add `DATABASE_URL` plus at least one AI provider key (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, or `CLOUDFLARE_API_TOKEN`):
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

The authenticated AI assistant uses a free-first provider chain. By default it tries OpenRouter, then Gemini, Groq, and Cloudflare Workers AI, skipping providers without the required credentials.

- **OpenRouter:** set `OPENROUTER_API_KEY`. The default `OPENROUTER_MODEL=openrouter/free` asks OpenRouter to select an available free chat model. OpenRouter's free models have strict shared quotas (currently up to 50 requests/day on its free plan), and availability can vary.
- **Gemini:** set `GEMINI_API_KEY`. The primary model defaults to `gemini-3.8-flash`; `gemini-3.5-flash-lite` is tried as its model-level fallback before moving to the next provider.
- **Groq:** set `GROQ_API_KEY` to add Groq as another fallback. In `AI_FREE_MODE=true` it is deliberately skipped until you set `AI_GROQ_FREE_TIER_CONFIRMED=true`. Only set that flag after confirming your Groq account is still on its Free tier. Groq Developer-tier model usage is billed by tokens.

- **Cloudflare Workers AI:** set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; the default model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. In free mode it is skipped until `AI_CLOUDFLARE_FREE_TIER_CONFIRMED=true`. Cloudflare advertises a daily free allocation (10,000 Neurons/day), but exact remaining Neurons are account-specific and must be checked in the Cloudflare dashboard. Create a token with permission to use Workers AI; keep it server-side.

Keep `AI_FREE_MODE=true` for the free-first setup. API keys must remain server-side and must never use a `NEXT_PUBLIC_` prefix. Add the same variables in Vercel under **Project Settings → Environment Variables**, then redeploy.

Transient network/server failures are retried once with a short backoff. HTTP 429 rate-limit responses move directly to the next provider so retries do not unnecessarily consume free quota. Provider, model, status, latency, and request IDs are logged without recording the user's prompt or API keys. Gemini vector-search failures fall back to PostgreSQL keyword retrieval; the AI can still answer without library context if the retrieval query fails.

Free tiers have changing quotas and availability. This fallback chain improves resilience but cannot guarantee uninterrupted service when all configured providers are rate-limited or unavailable.

## Qur'anic reference data

Al-Burhan's Qur'anic reference workflow is designed around three distinct sources:

- **Primary Tafsir:** QUL (Tarteel) resource #33, *Tafsir Abu Bakr Zakaria*. QUL provides downloadable datasets rather than a hosted public API. Import its JSON export (or a gzip-compressed JSON export) from the admin page at /admin/quran-tafsir. The importer preserves shared multi-ayah passage groups in PostgreSQL.
- **Translation cross-check:** QuranEnc's bengali_zakaria API response supplies Dr. Abu Bakar Muhammad Zakaria's Bengali verse translation and explanatory footnotes. The website should reproduce the translation text faithfully, identify the translator/source/version, and keep those footnotes distinct from the full Tafsir.
- **External verification:** Quran.com links are provided for the referenced Surah and Ayah. The application does not claim to query or verify Quran.com content through its API.

Before importing or displaying the QUL resource, review the licence terms that apply to resource #33 and confirm that the planned storage and display are authorised. QUL notes that licensing can vary by resource; the import confirmation records an administrator's attestation and does not grant rights.

The QUL importer is restricted to administrators. Upload JSON files up to 3.8 MB, or gzip larger JSON exports and upload the resulting .json.gz file (up to the same upload-size limit). No additional environment variables are required; the existing PostgreSQL DATABASE_URL is used.

## Aqeedah fatwa source policy

For important creed-related fatwa questions, Al-Burhan AI is instructed to provide a topic-relevant direct fatwa URL when one is verifiably available. If only an archive or subject page is available, it must label that link as an archive rather than claim it is the exact fatwa. It must not invent page URLs, fatwa numbers, quotations, or attributions.

Source directory:
- Al-Albani fatwa archive: https://al-fatawa.com/en/scholar/albani
- Ibn Baz official fatwa collection: https://binbaz.org.sa/fatwas; secondary index: https://al-fatawa.com/en/scholar/ibn-baz
- Ibn Uthaymeen library: https://binothaimeen.net/content; secondary index: https://al-fatawa.com/en/scholar/ibn-uthaymeen
- Al-Fawzan fatwa archive: https://al-fatawa.com/en/scholar/fawzan; Aqeedah materials: https://dralfawzann.com/section/21/
- Imam Ahmad's transmitted responsa: https://sites.dlib.nyu.edu/viewer/books/nyu_aco000734/display?lang=en (library record/digital edition of *Kitab Masāʼil al-Imām Aḥmad*, not a modern fatwa website).

The Al-Fatawa site is a third-party archive, and some translations may be machine-generated. The old alfawzan.af.org.sa site was reported closed in April 2026; alfawzan.live describes itself as a research archive, not an official site. For Imam Ahmad, distinguish reports in classical *Masāʼil* collections from modern fatwas and verify attribution/edition before quoting.
