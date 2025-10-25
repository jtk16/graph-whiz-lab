# Repository Guidelines

## Project Structure & Module Organization
- `src/main.tsx` mounts the React app and pulls in the runtime/tool registries; new platform features extend `src/lib/expression` rather than touching components.
- Views belong in `src/pages`, UI primitives in `src/components`, and hooks/form logic in `src/hooks`.
- Math behavior lives in `src/lib/operations/{descriptor,registry,definitions}` and flows through `src/lib/expression/engine.ts`; register new operations or expression modules there so parsing, normalization, typing, and keyboards stay in sync.
- Toolkit metadata is managed by `src/lib/toolkits/store.ts`, and viewport math lives in `src/lib/viewports/viewport.ts`. Keep shared utilities under `src/lib`, integrations in `src/integrations`, static assets in `public/`, and Supabase config in `supabase/config.toml`.

## Build, Test, and Development Commands
- `npm install` (or `bun install`) syncs dependencies; stay on one tool to avoid lockfile churn.
- `npm run dev` boots the Vite dev server at `http://localhost:5173`.
- `npm run build` outputs the optimized bundle; use `npm run build:dev` for fast smoke checks.
- `npm run preview` serves the last build artifact for final QA.
- `npm run lint` enforces the shared ESLint config.
- `npm run test` executes the Vitest suite (expression engine, tokenizer, viewports, toolkits) and must be green before merging.
- `npm run audit` runs the same suite with verbose reporting for deeper local investigations.

## Coding Style & Naming Conventions
- Use function components with TypeScript, PascalCase component/filename pairs, camelCase hooks/utilities, and lowercase operation IDs.
- Import local code through the `@/` alias from `tsconfig.json`; avoid deep relative paths.
- Match the repo's 2-space indentation, double quotes, and semicolons, and lean on Tailwind tokens from `tailwind.config.ts` instead of ad-hoc styling.
- Follow ESLint hook rules and keep side effects inside `useEffect` or custom hooks rather than render paths.

## Testing Guidelines
- Run `npm run test` after any changes to the parser, expression engine, registries, or viewports; add colocated `*.test.ts` coverage for new modules and keep existing suites passing.
- Use `npm run dev` for manual validation whenever you touch rendering, evaluator flows, or Supabase I/O.
- Document the math expressions you exercised (or screenshots for UI) in your PR so reviewers can replay them; include Vitest output when relevant.

## Commit & Pull Request Guidelines
- History shows `Type: Imperative summary` (e.g., `Fix: Resolve sphere visibility issues`, `feat: Add scene and mesh debugging`); keep subjects short and use matching type labels.
- Separate commits for UI, registry, and infrastructure work, and ensure PRs describe impact, mention env/schema touches, and include screenshots or reproduction steps for UI changes.

## Security & Configuration Tips
- Store secrets only in `.env` (never commit real values) and describe required variables in docs or PRs instead.
- Coordinate updates to `supabase/config.toml` with backend owners, and vet licenses for new math/tooling dependencies.
