import { Link } from "react-router-dom";

const computationSections = [
  {
    id: "graphing",
    title: "Graphing & Visualization",
    items: [
      "Explicit functions y = f(x) with adaptive sampling",
      "Implicit relations F(x, y) = 0 (marching squares)",
      "Parametric curves and piecewise definitions",
      "Domain coloring + surface plots for complex inputs",
    ],
  },
  {
    id: "engineering",
    title: "Engineering Toolkits",
    items: [
      "Symbolic nodal circuit solver with reusable blocks",
      "FFT / IFFT pipelines, filters, and spectrum views",
      "Signal processing helpers (windowing, envelopes, convolution)",
    ],
  },
  {
    id: "learning",
    title: "Learning Aids",
    items: [
      "LaTeX-first expression editing with immediate normalization",
      "Workspace state + toolkit definitions for lesson plans",
      "Hoverable stats, legends, and saved color palettes",
    ],
  },
];

const tutorials = [
  {
    heading: "Plotting like Desmos, documenting like a research notebook",
    steps: [
      "Open the calculator at /app and start with the expression list.",
      "Use y = ... for explicit graphs, or type an implicit relation such as x^2 + y^2 = 4.",
      "Pin the Type Info panel to group expressions by source and track toolkit imports.",
      "Save frequently used functions as toolkits so students can import a full lesson in one click.",
    ],
  },
  {
    heading: "Complex Plane domain coloring tutorial",
    steps: [
      "Launch the Complex Plane tool from the workspace sidebar.",
      "Enter expressions like e^{iz} or z^2 + 1/z; Zygraph auto-inserts the imaginary unit.",
      "Toggle between phase, magnitude, and cartesian color modes to highlight different features.",
      "Enable the real/imaginary surface mini-views to correlate 3D structure with the coloring.",
    ],
  },
  {
    heading: "Circuit + signal workflows",
    steps: [
      "Add the Circuit tool from the workspace dock layout.",
      "Define reusable components (R, L, C, sources) via toolkit definitions and drag them into the schematic.",
      "Switch to the Signal Processing toolkit to run FFTs on recorded data and visualize magnitude/phase.",
      "Document results in the Docs section (you are here) so teammates can reproduce experiments.",
    ],
  },
];

const seoStrategy = [
  "Landing page hero and section headings target blended keywords such as “graphing calculator”, “complex plane”, and “engineering math tool”.",
  "Documentation pages enumerate supported computations using semantic headings (<h2>, <h3>) so search engines understand coverage.",
  "Tutorials use step-by-step ordered lists with descriptive anchor IDs (e.g., #graphing, #complex-plane) to support deep-linking and featured snippets.",
  "Every CTA links to /app (calculator) or /docs (this page) ensuring crawlable navigation without relying solely on client-side state.",
];

export default function Docs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        <header className="space-y-3 text-center">
          <p className="text-sm font-medium text-primary uppercase tracking-wide">Documentation</p>
          <h1 className="text-4xl font-bold text-foreground">Supported computations & learning path</h1>
          <p className="text-base text-muted-foreground">
            Everything you can build inside Zygraph—from entry-level graphing to advanced math and engineering workflows.
          </p>
          <div className="flex justify-center gap-3 text-sm">
            <Link to="/app" className="text-primary hover:underline">
              Launch calculator
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/" className="text-primary hover:underline">
              Back to landing
            </Link>
          </div>
        </header>

        <section className="space-y-8">
          {computationSections.map(section => (
            <article key={section.id} id={section.id} className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {section.items.map(item => (
                  <li key={item} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Guided tutorials</h2>
          <div className="space-y-4">
            {tutorials.map(tutorial => (
              <article key={tutorial.heading} className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-foreground">{tutorial.heading}</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  {tutorial.steps.map(step => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4" id="seo">
          <h2 className="text-2xl font-semibold text-foreground">SEO & content approach</h2>
          <p className="text-sm text-muted-foreground">
            Zygraph’s marketing + documentation stack is optimized for discoverability:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {seoStrategy.map(point => (
              <li key={point} className="flex gap-2">
                <span className="text-primary">★</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
