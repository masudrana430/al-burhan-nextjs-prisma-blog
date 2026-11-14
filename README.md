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
2. Copy `.env.example` to `.env` and add your `DATABASE_URL` and `GEMINI_API_KEY`:
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
