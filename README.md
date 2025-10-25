# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7e659c4f-3de1-4e92-bfe6-461197190920

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7e659c4f-3de1-4e92-bfe6-461197190920) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- MathLive (LaTeX editor)
- Unified Operations System (mathematical operations)

## Mathematical Operations System

This calculator uses a **Unified Operations System** where all mathematical operations (functions, operators, special constructs) are defined in a single source of truth. Each operation is defined once in `src/lib/operations/definitions/` with:

## Expression Engine

All parsing, normalization, and evaluation now flow through `src/lib/expression/engine.ts`. Importing `@/lib/expression` boots the operation registry, visualization tools, and toolkits so every feature module shares the same environment. The engine exposes:

- `normalize()` middleware pipeline (LaTeX → parser-friendly)
- `buildContext()` with pluggable augmenters for shared definitions
- Cached `parse()`/`evaluate()` helpers plus `inspect()` for token-level debugging
- A lightweight module API (`registerExpressionModule`) for future extensions

Use the engine instead of direct `parseExpression`/`buildDefinitionContext` calls to ensure new modules scale with the registry.

## Testing & Audits

The deep clean added Vitest coverage for the expression engine, tokenizer, toolkits, and viewport math. Run:

```sh
npm run test   # Executes vitest suite
npm run audit  # Same suite with verbose reporter
```

Keep these tests green before shipping major parser/runtime changes.

- Syntax (LaTeX and normalized forms)
- Type signatures
- Runtime execution logic
- UI metadata for keyboard display

The system automatically distributes this information to:
- **Parser**: Recognizes valid function names and syntax
- **Normalizer**: Converts LaTeX to normalized form
- **Type System**: Infers expression types
- **Evaluator**: Executes operations
- **Keyboard UI**: Displays operations to users

**Benefits:**
- Single source of truth - no duplicate definitions
- Type-safe with TypeScript
- Easy to extend with new operations
- Impossible for subsystems to desynchronize

See `src/lib/operations/README.md` for detailed documentation.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7e659c4f-3de1-4e92-bfe6-461197190920) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

