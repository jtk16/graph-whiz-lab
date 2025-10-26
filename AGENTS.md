# Repository Guidelines

## Project Structure & Module Organization
- `src/components` hosts the feature modules: `Graph2DTool` (layered canvas + worker), `Graph3DTool` (Three.js plus `useScene3D`), `ComplexPlaneTool` (domain coloring with real/imag surfaces), `CircuitTool` (numeric simulator and symbolic nodal solver), and the docking chrome in `workspace/`. Keep heavy math/expression logic in `src/lib/**` and pass evaluated data into components.
- Shared infrastructure lives in `src/lib` (expression engine, circuits, evaluators, tool registry), routes are in `src/pages`, static assets in `public/`, and Supabase config under `supabase/`. Prefer the `@/` alias to keep import graphs shallow.
- The Visual-Studio-style dock layout defined in `src/lib/workspace/layouts.ts` is the only supported workspace; persist layout plus per-tool state with `workspaceState` helpers so tabs can be added or removed without new plumbing.
- Toolkit flows run through `ToolkitLibraryDialog` -> `ToolkitExpressionSelector` -> `ToolkitDefinitionsPanel`; hook into those instead of re-implementing import UIs.

## Build, Test, and Development Commands
- `npm install` (or `bun install`) synchronizes dependencies; pick one package manager and stick with it. Use `npm run dev` for the Vite dev server, `npm run build` / `npm run build:dev` for production or fast bundles, and `npm run preview` to inspect the latest build output.
- `npm run lint` enforces the shared ESLint + hooks config. `npm run test` (or `npm run audit` for verbose output) executes the Vitest suites covering the tokenizer, expression engine, evaluators, and toolkit registry; keep them green before merging.

## Coding Style & Naming Conventions
- TypeScript everywhere, two-space indentation, double quotes, and semicolons. React files export PascalCase components, hooks/utilities stay camelCase, and tool IDs use kebab-case.
- Default to Tailwind tokens or CSS vars with the `cn()` helper; avoid inline hex constants. Memoize expensive math/render work (`useMemo`, `useCallback`) and reuse buffers/materials (`Surface3D`, `Curve3DBatch`) so rendering stays event-driven. Keep files ASCII unless a math symbol is truly required.

## Testing & Verification
- Minimum bar: `npm run test` plus targeted manual checks for the affected module (Graph2D inputs, Graph3D orbit + meshes, Complex Plane coloring, Circuit node playback/export). Add colocated tests for new evaluators, workers, or symbolic solvers.
- When touching UI/render flows, document the expressions or toolkits you used for validation and capture screenshots or clips, especially for docking or toolkit UX updates.

## Commit & Pull Request Guidelines
- Use the historical `type: Imperative summary` format (`feat: Add circuit dock tab`, `fix: Guard MathLive init`). Keep commits scoped (UI vs evaluator vs infra) and call out schema/env changes explicitly.
- PRs should summarize behavior changes, list verification steps (commands + expressions), mention new config/toggles, and include screenshots for visual tweaks. Reference linked issues or toolkit IDs whenever possible.