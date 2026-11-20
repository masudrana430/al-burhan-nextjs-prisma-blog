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


## AI provider failover and reliability

The AI route prioritises Gemini, then tries OpenRouter and the optional Groq/Cloudflare providers. Each upstream call has a short timeout so a stalled provider does not consume the full request window. OpenRouter receives one quick retry; the other providers are given a chance immediately, and Gemini's configured secondary model is attempted if its primary model fails. Groq GPT-OSS uses the current `max_completion_tokens` parameter with low reasoning effort to reduce empty completions.

Cloudflare Workers AI remains skipped in free mode unless `AI_CLOUDFLARE_FREE_TIER_CONFIRMED=true` is explicitly set after checking the account's allowance. This prevents accidentally moving to billable usage.


## Qur'an Bengali translation source policy

For every explicit Bengali Qur'an translation request, the AI route resolves the surah/ayah reference and retrieves the published translation from QuranEnc using the fixed `bengali_zakaria` key. The translation response is returned directly from that source instead of asking a generative model to translate it. The credited translator is Dr. Abu Bakar Muhammad Zakaria; source/version attribution and the Arabic transcript/footnotes supplied by QuranEnc are retained. The system must not substitute another Bengali translator or generate its own Bengali translation. If the reference cannot be identified or QuranEnc is unavailable, it asks for a clearer reference or reports the source failure rather than falling back to another translation.

QuranEnc API reference: https://quranenc.com/en/home/api. Browse the selected Bengali translation: https://quranenc.com/en/browse/bengali_zakaria/.


## Salafi methodology policy for Al-Burhan AI

Al-Burhan AI's normative Islamic answers are governed by a consistent Salafi methodology: the Qur'an and authentic Sunnah understood through the Companions and the early generations (Salaf al-Salih). The route's system instructions require careful hadith grading, contextual use of evidence, distinguishing clear texts and established consensus from ijtihadi disagreement, and presenting the strongest evidence-based Salafi position without misrepresenting other recognised views. Serious personal rulings (especially takfir and individual cases) are referred to qualified living scholars. Empirical scientific facts are reported accurately and are not distorted to force a religious conclusion; religious discussion is not injected into unrelated practical questions.


## Istiwā terminology and Aqeedah guardrails

For questions about Allah's istiwā over the Throne, the AI must affirm the attribute as established in revelation without asking how, assigning a modality, or comparing it to created beings. It must not translate or explain istiwā as “সমাসীন”, “বসে আছেন”, “উপবিষ্ট”, “আসীন”, or “অধিষ্ঠিত”, and must not describe Allah as sitting on the Throne. When quoting Qur'an 20:5 in Bengali, reproduce Dr. Abu Bakar Muhammad Zakaria's QuranEnc translation exactly: “দয়াময় (আল্লাহ্) আরশের উপর উঠেছেন [১]।” Keep its explanatory footnote separate and verbatim. Avoid the ambiguous claim that Allah is “everywhere”; explain, when relevant, that Allah is above His creation and over His Throne while His knowledge encompasses all things.
