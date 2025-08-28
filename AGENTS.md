# Repository Guidelines

## Project Structure & Module Organization
- Frontend: React + TypeScript in `src/` (`main.tsx`, `App.tsx`, `lib/`). Entry HTML at `index.html`. Styles via Tailwind in `src/index.css`.
- Backend: Convex functions in `convex/` (`schema.ts`, `presentations.ts`, `auth.ts`, `router.ts`). Generated code lives in `convex/_generated/`.
- Config: `vite.config.ts`, `tailwind.config.js`, `eslint.config.js`, `tsconfig*.json`, `postcss.config.cjs`.
- Aliases: `@` resolves to `src/` (see `vite.config.ts`).

## Build, Test, and Development Commands
- `npm run dev`: Runs frontend (`vite --open`) and backend (`convex dev`) in parallel.
- `npm run build`: Builds the frontend for production using Vite.
- `npm run lint`: Type‑checks both app and Convex (`tsc`), performs a one‑time Convex auth setup (`convex dev --once`), and builds the app. Use this as a CI sanity check.

## Coding Style & Naming Conventions
- Language: TypeScript for both React and Convex. 2‑space indent, semicolons, and Prettier defaults.
- Linting: ESLint with TypeScript rules and React Hooks. Some TS strictness is relaxed (e.g., `no-explicit-any` allowed).
- Filenames: React components `PascalCase.tsx` (e.g., `SignInForm.tsx`); utilities `camelCase.ts` under `src/lib/` (e.g., `utils.ts`); Convex modules `lowerCamelCase.ts` (e.g., `presentations.ts`).
- Imports: Prefer `@/...` for app code (e.g., `import { cn } from '@/lib/utils'`).

## Testing Guidelines
- No test runner is configured yet. Recommended: Vitest for unit tests and Playwright for E2E.
- Naming (when added): `*.test.ts` and `*.test.tsx`; colocate near source or under `tests/`.
- For now, verify changes by running `npm run dev` and exercising flows in the UI.

## Commit & Pull Request Guidelines
- Convention: No existing history to infer from; use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`, `docs:`).
- PRs: Include purpose, linked issues, screenshots of UI changes, and note any Convex schema or API impacts. Ensure `npm run lint` passes.

## Security & Configuration Tips
- Env: Create `.env.local` for secrets (e.g., `CONVEX_SITE_URL`). `setup.mjs` can help bootstrap Convex Auth vars.
- Do not commit secrets or generated files (e.g., `.env.local`, `convex/_generated/`).
- HTTP routes: User routes are defined in `convex/router.ts` (see README for context).
