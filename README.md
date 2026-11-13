# LinkPulse

Short links with live click analytics: paste a long link, get a short one, and
see who clicks it, when, and from where.

> Work in progress. Built in small steps, each one a pull request.

## Stack

| Part | Tech |
|---|---|
| Web app | React 19, TypeScript, Vite, Tailwind CSS |
| API | Node.js, TypeScript, Express 5, Zod |
| Data | PostgreSQL, Redis |
| Quality | Vitest, Testing Library, Supertest, ESLint, CodeQL, Gitleaks |

## Run it

```bash
npm install
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173
```

Postgres and Redis for development: `docker compose up -d`.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

---

© 2026 Fakhruddien Abbas · All rights reserved.
