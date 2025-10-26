# Repository Guidelines

## Project Structure & Module Organization
- `src/components` hosts visualization modules: `Graph2DTool` (layered canvases + worker), `Graph3DTool` (Three.js scene consumers), `ComplexPlaneTool` (domain coloring + Re/Im surfaces), and the dockable workspace (`DockWorkspace`, `ModuleSelector`). Keep math/expression logic in `src/lib/**` so components stay dumb.
- Hooks (`useScene3D`) and heavy evaluators/workers (`src/workers/implicitCurve.worker.ts`) power render-on-demand scenes; shared utilities live under `src/lib`, routes in `src/pages`, assets in `public/`, and Supabase config in `supabase/config.toml`.
- The app now ships with the Visual-Studio-style dock layout only; tool tabs persist via `workspaceState` (layout ID + dock tree) in `localStorage`.
- Prefer the `@/` alias for local imports to keep module graphs shallow and tooling happy.

## Build, Test, and Development Commands
- `npm install` (or `bun install`) syncs deps; stick to one package manager to avoid lock churn.
- `npm run dev` starts the Vite server (default `5173`) for interactive testing; `npm run build` / `build:dev` create production or fast bundles, and `npm run preview` serves the latest build artifact.
- `npm run lint` enforces the shared ESLint + hook rules. `npm run test` (or `npm run audit` for verbose output) runs Vitest suites that cover the parser, expression engine, evaluators, and toolkit registry—keep them green before merging.

## Coding Style & Naming Conventions
- Use function components with TypeScript, PascalCase filenames for React pieces, camelCase hooks/utilities, and kebab-case tool IDs. Default to Tailwind tokens or CSS variables instead of inline hex codes.
- Follow the repo’s two-space indentation, double quotes, and semicolons. Keep side effects in hooks/custom hooks, and memoize expensive math/render work (`useMemo`, `useCallback`) so the render loop stays predictable.
- When touching renderers, reuse buffers/materials (see `Curve3DBatch`, `Surface3D`) and rely on event-driven invalidation (`requestRender`) rather than perpetual loops.

## Testing & Verification
- Minimum bar: `npm run test` + targeted manual validation for affected tools (e.g., graph inputs for 2D implicit curves, 3D orbit/mesh updates, toolkit imports). Add colocated tests for new evaluators or workers.
- For render/UI shifts, capture the math expressions or screenshots you exercised so reviewers can replay issues. Document any new worker messages or tool config knobs in PRs.

## Commit & Pull Request Guidelines
- Follow the historical format `type: Imperative summary` (`fix: Reduce 2D render latency`, `feat: Add worker-backed implicit curves`). Keep commits scoped (UI vs evaluator vs infra) and note env/schema changes explicitly.
- PRs should summarize behavior changes, list verification steps (commands + expressions), and attach screenshots or recordings for UX shifts. Reference linked issues/toolkits when applicable.
