# Project Overview

Mine CRM AI is a multi-tenant CRM/SaaS application for managing companies, customers, prospects, products, services, quotes, invoices, payments, reports, authentication, and an AI assistant/copilot. The active application consists of a FastAPI API and a React SPA. It already contains production-readiness, authentication-hardening, tenant-isolation, AI quota, and deployment work, but the working tree may contain substantial uncommitted development; preserve it.

## Tech Stack

- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2, Uvicorn.
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, CSS in `frontend-react/src/index.css`.
- **Database:** PostgreSQL through psycopg 3; Alembic migrations. Tests commonly use in-memory SQLite.
- **Authentication:** signed HS256 access JWTs, database-backed sessions, rotating opaque refresh cookies, double-submit CSRF, Argon2id password hashes with legacy bcrypt migration, email verification/reset flows, and persistent rate limits/security events.
- **AI:** local deterministic provider or OpenAI Responses provider, with tenant-scoped context, usage records, request quotas, budget limits, and in-process short-term copilot memory.
- **Testing/tooling:** standard-library `unittest`, ESLint, TypeScript build mode, Vite.
- **Deployment:** static frontend plus a separately hosted FastAPI service and managed PostgreSQL. Production starts one API worker because copilot memory is process-local.

## Repository Structure

- `app/api/`: FastAPI routers and HTTP error/status translation.
- `app/core/`: settings and cryptographic/authentication primitives.
- `app/database/`: SQLAlchemy base, engine, sessions, and request dependency.
- `app/models/`: SQLAlchemy models and relationships.
- `app/schemas/`: Pydantic request/response contracts and input validation.
- `app/repositories/`: persistence helpers for the conventional CRUD domains.
- `app/services/`: business logic, authorization checks, authentication, email, AI, and copilot behavior.
- `app/dashboard/`: dashboard/report router, schemas, and query service.
- `alembic/versions/`: ordered database migrations; `alembic/env.py` imports all models and uses the configured application URL.
- `tests/`: backend unit/service/security tests using `unittest` and test doubles or SQLite.
- `frontend-react/`: active React/Vite application. Build and deploy this directory.
- `Front_End/`: older partial frontend without its own package configuration; do not extend it unless explicitly requested.
- `scripts/`: production startup and PostgreSQL backup scripts.
- `.codex/skills/`: project-local Codex skills.

Root files such as `cc.py`, `file.py`, and `index.css` are not part of the documented runtime path. Verify usage before touching them.

## Backend Architecture

Use the established flow for normal CRUD features:

```text
FastAPI route -> service -> repository -> SQLAlchemy model -> PostgreSQL
             ^ Pydantic request/response schemas
```

- Keep routes thin: dependency injection, request/response contracts, status codes, and translation of known service errors into `HTTPException`.
- Put business rules, tenant checks, transaction intent, and model mutation in services.
- Put reusable CRUD/query construction in the existing repository for that domain.
- Dashboard, authentication, AI, and copilot services legitimately contain specialized SQLAlchemy queries; follow their existing pattern instead of creating artificial repositories.
- Reuse existing modules. Historical repository filenames contain spelling errors (`customer_repositori.py`, `product_respositori.py`, `repisotorie_company.py`, `user_respository.py`); import the existing file rather than creating a correctly spelled duplicate. Rename only as an explicit, repository-wide refactor.
- Pass a request-scoped `Session` from `Depends(get_db)`. Roll back failed multi-step operations and commit only at a coherent transaction boundary.
- When changing a persisted entity, keep the SQLAlchemy model, Pydantic schemas, service/repository behavior, tests, and Alembic migration consistent.
- Import new models from `app/models/__init__.py` so SQLAlchemy relationship resolution and Alembic metadata registration remain complete.

## Multi-Tenant Rules

Tenant isolation is a core invariant.

- Derive the tenant from the authenticated user's company; never trust a client-provided `company_id` for authorization.
- Use `app.services.access.get_company_id` or the established equivalent check.
- Scope repository/service queries by `company_id`. For indirect resources such as quotes, invoices, payments, and quote items, join through the owning customer/company.
- Validate every referenced resource (customer, quote, product, service, invoice, prospect) against the same tenant before mutation.
- Hide cross-tenant resource existence with the same not-found behavior used for missing resources.
- Add tenant-isolation tests whenever introducing a resource lookup, relationship, report, or AI context.

## Frontend Architecture

- Work in `frontend-react/`, not `Front_End/`.
- `src/App.tsx` currently orchestrates authentication, onboarding, navigation, page selection, and copilot navigation without an external router or global state library.
- `src/pages/` contains feature screens; `src/components/UI/` contains reusable controls; `src/components/layout/` contains layout components; `src/components/AI/` contains copilot UI.
- `src/Services/auth.ts` owns the in-memory access token, refresh/bootstrap flow, CSRF header, logout, and authenticated request wrapper.
- `src/Services/api.ts` contains CRM API types and calls; `src/Services/ai.ts` contains AI/copilot contracts and calls. Reuse these modules rather than issuing ad hoc authenticated `fetch` calls in components.
- Keep access tokens in memory. Do not move access or refresh tokens to `localStorage` or `sessionStorage`. Local storage is currently used only for non-sensitive preferences.
- Styling is primarily Tailwind utility classes plus shared responsive/global rules in `src/index.css`. Reuse existing UI components and icon infrastructure before adding variants.
- Preserve the current professional blue/slate CRM visual language unless redesign is requested. Prioritize information hierarchy, readability, keyboard access, contrast, responsive behavior, coherent loading/error/empty states, and compact business workflows.
- Existing filenames include casing and spelling inconsistencies such as `Services/`, `input.tsx`, and `selct.tsx`; respect current import paths and avoid opportunistic renames.
- Use the `frontend-design` skill when creating, redesigning, or significantly styling frontend interfaces. For CRM/business interfaces, keep professional SaaS usability primary and avoid decorative effects that interfere with work.

## Database and Migration Rules

- Inspect current models and the full migration chain before changing schema.
- A SQLAlchemy model edit does not alter PostgreSQL. Add an Alembic revision for every required persisted schema change.
- Import all model metadata before using Alembic autogeneration, then review generated operations manually.
- Check both sides of every `ForeignKey`/`relationship`, including `back_populates`, cardinality, nullability, uniqueness, cascade behavior, and `ondelete` semantics.
- Preserve tenant keys and indexes used for isolation and lookup performance.
- Do not edit an already-applied migration to represent a new change; create a follow-up migration.
- Do not drop tables/columns, reset migrations, truncate data, or test restoration against production without explicit authorization.
- For deployment, run `alembic upgrade head` before opening the new backend to traffic. Verify `alembic current` against `alembic heads` in the target environment.

## API Rules

- Define input/output contracts in `app/schemas/` and set `response_model` on routes when a schema exists.
- Use Pydantic bounds, literals, validators, and normalized values for untrusted input.
- Follow existing resource endpoints and HTTP semantics. Prefer `201` for creation, `204` for no-content actions, `400` for invalid business input, `401` for invalid authentication, `403` for forbidden/CSRF, `404` for absent or hidden cross-tenant resources, `409` for conflicts, and `429` for rate limits.
- Keep list bounds explicit. Existing paginated endpoints use `page >= 1`, `1 <= size <= 100`, a schema containing `items`, `total`, `page`, `size`, and `pages`, and allowlisted sort fields/directions.
- Use SQLAlchemy expressions and allowlisted columns; never interpolate raw input into SQL.
- Preserve `/health/live` for process liveness and `/health/ready` for database readiness. `/health/db` is a legacy hidden alias.
- Production disables API docs and enables trusted-host/CORS/security-header controls. Do not weaken these to work around local setup.

## Authentication and Security Rules

- Read `app/core/security.py`, `app/api/auth.py`, `app/api/dependencies.py`, `app/services/auth_service.py`, and the auth models/tests before changing authentication.
- Preserve issuer, audience, expiry, token type, subject, and session ID checks on access JWTs.
- Preserve refresh-token rotation, reuse detection, server-side revocation, CSRF cookie/header comparison, origin validation, and secure production cookie settings.
- Let Uvicorn validate forwarding headers using explicit `UVICORN_FORWARDED_ALLOW_IPS`; never trust arbitrary `X-Forwarded-For` values or use `*` in production.
- Store only digests of refresh, CSRF, verification, and reset tokens. Never log or return production tokens.
- Keep Argon2id as the current password hash and the tested bcrypt upgrade path for legacy hashes.
- Preserve persistent login/reset/verification rate limits and generic responses that avoid account enumeration.
- Never expose secrets, commit `.env`, hardcode credentials/API keys, or include backend secrets in `VITE_*` variables. Use `.env.example` and `.env.production.example` only as name/value-shape templates.
- Never disable authentication, authorization, validation, CSRF, CORS, TLS, or tenant scoping to bypass a bug or test.
- Treat external AI prompts as a data boundary: minimize tenant data, enforce configured size/cost limits, avoid prompt/response logging, and never mix tenant contexts.
- Report significant security problems found during any task. Use the `security-hardener` skill for a dedicated security audit or hardening request.

## AI and Copilot Rules

- Keep local mode deterministic and free of external requests; tests must not contact OpenAI.
- Route provider calls through `app/services/ai_providers.py` and orchestration through `ai_service.py`/`ai_copilot.py`.
- Reserve usage before paid calls, enforce daily and monthly limits, and finalize usage records for success or failure without storing sensitive prompt/response content.
- Scope all AI context and active entities to the authenticated company. Keep returned navigation links tenant-safe.
- Copilot mutation support is proposal-only; confirmation currently does not execute sensitive changes. Do not silently turn proposals into writes.
- Short-term copilot memory is in-process and scoped by authenticated session. Keep a single production worker until memory is moved to shared storage.

## Development Workflow

For meaningful changes:

1. Read this file and relevant project documentation.
2. Inspect the target files, related models/schemas, tests, and current Git status.
3. Search for an existing implementation or convention before adding an abstraction.
4. Identify dependencies, tenant boundaries, security effects, and migration requirements.
5. Make the smallest coherent change; do not refactor unrelated code.
6. Add or update focused tests where behavior changes.
7. Run the strongest relevant validations available.
8. Diagnose and correct failures caused by the change.
9. Inspect the final diff for unrelated edits, secrets, debug code, and broken contracts.
10. Report exact changes, validation results, and remaining limitations.

## Debugging Rules

1. Read the complete error and reproduce it when possible.
2. Identify the responsible layer: UI, API contract, route, service, repository, model, database, provider, or deployment.
3. Inspect the associated code, configuration, and tests.
4. Form one evidence-based hypothesis and verify it.
5. Fix the root cause with a targeted change.
6. Retest the failing path and relevant regressions.

Do not make random edits across multiple layers hoping the error disappears. Distinguish sandbox/tooling failures from application failures before changing code.

## Validation Commands

Run commands from the repository root unless noted. Use the active Python environment for the machine; on this Windows checkout it is `.venv\\Scripts\\python.exe`.

```powershell
# Backend development
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload

# Full backend test suite
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

# A focused test module
.\.venv\Scripts\python.exe -m unittest tests.test_security -v

# Dependency consistency
.\.venv\Scripts\python.exe -m pip check

# Database migrations
.\.venv\Scripts\alembic.exe heads
.\.venv\Scripts\alembic.exe current
.\.venv\Scripts\alembic.exe upgrade head

# Frontend
Set-Location frontend-react
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

On shells where `python`, `alembic`, and `npm` resolve to the intended environment, their portable equivalents are acceptable. There is no configured frontend test script and no repository-level formatter/type-check script separate from `npm run build`; do not claim those checks ran unless a command was actually available and executed.

Production helpers:

```powershell
.\.venv\Scripts\python.exe scripts/start_production.py
.\.venv\Scripts\python.exe scripts/backup_postgres.py
```

The production launcher requires `APP_ENV=production`; backup requires `pg_dump`, `BACKUP_DIRECTORY`, and the configured database. Do not run deployment, backup retention, or migration commands against a real environment without confirming the target.

## Git Rules

- Assume existing modified and untracked files belong to the user. Preserve them and work around unrelated changes.
- Check `git status` before and after editing. Review only the relevant diff, while remaining aware of pre-existing changes.
- Do not use destructive reset/checkout/clean operations or delete unrelated files.
- Do not commit, push, create branches, or rewrite history unless explicitly requested.
- Do not add `.env`, generated frontend `dist/`, virtual environments, caches, or real backup archives.

## Skills

- `frontend-design` (user-level): use for new interfaces, UI redesigns, or significant visual styling; preserve CRM clarity, accessibility, responsiveness, and professional workflow density.
- `.codex/skills/security-hardener`: use for security audits and targeted remediation, including severity, evidence, regression tests, and residual-risk reporting.
- `.codex/skills/skill-builder`: use when creating, improving, or auditing reusable Codex skills and agent workflows.

Read a selected skill's complete `SKILL.md` before following it. Skills supplement these project-wide instructions; they do not override repository safety, tenant isolation, or explicit user constraints.

## Definition of Done

A task is complete only when:

1. The requested behavior is implemented without unrelated scope expansion.
2. Existing architecture, API contracts, tenant isolation, and security invariants are preserved.
3. Models, schemas, repositories/services, migrations, frontend types, and tests are synchronized where applicable.
4. Relevant tests, lint, build, or migration checks were actually run.
5. Failures caused by the change are fixed, and unrun validations are disclosed.
6. The final diff is reviewed and contains no accidental files, debug output, or secrets.
7. Remaining risks, deployment steps, and uncertain assumptions are reported explicitly.
