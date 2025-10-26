import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    title: "Graphing-grade visuals",
    description:
      "Render 2D plots, implicit relations, parametric sketches, and layered toolkits with the precision you expect from professional math software.",
  },
  {
    title: "Higher-level math & engineering",
    description:
      "Explore complex analysis, symbolic circuit solvers, signal processing, and numeric simulations inside one consistent workspace.",
  },
  {
    title: "Built for learning and teaching",
    description:
      "Jump from intuitive visualizations to documented tutorials so students, hobbyists, and engineers can ramp up quickly.",
  },
];

const tutorials = [
  {
    title: "Graphing like Desmos, with super powers",
    blurb:
      "Plot explicit, implicit, and parametric expressions and save reusable toolkits for classroom or lab use.",
    path: "/docs#graphing",
  },
  {
    title: "Complex plane domain coloring 101",
    blurb:
      "Learn how the complex tool visualizes magnitude, phase, and real/imag surfaces for any expression in your notebook.",
    path: "/docs#complex-plane",
  },
  {
    title: "From circuits to signals",
    blurb:
      "Step through symbolic nodal analysis, signal processing primitives, and FFT-backed workflows.",
    path: "/docs#engineering",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      <header className="border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              ζ
            </span>
            Zygraph
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link to="/docs" className="hover:text-foreground">
              Documentation
            </Link>
            <Link to="/app" className="hover:text-foreground">
              Calculator
            </Link>
            <Button asChild size="sm">
              <Link to="/app">Launch Zygraph</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12 md:py-16">
        <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-6">
            <Badge className="bg-primary/15 text-primary">Graphing + Learning Suite</Badge>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
              A modern graphing calculator for advanced math, engineering, and teaching.
            </h1>
            <p className="text-lg text-muted-foreground">
              Zygraph blends the instant feedback of tools like Desmos with the depth of a full
              symbolic + numeric workbench. Visualize functions, explore the complex plane, solve
              circuits, and document every step in one browser tab.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/app">Open the Calculator</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/docs">Read the Documentation</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">Graphing Suite · </strong>2D + 3D + Complex
              </div>
              <div>
                <strong className="text-foreground">STEM-ready · </strong>Circuit + Signal toolkits
              </div>
              <div>
                <strong className="text-foreground">SEO-optimized docs · </strong>Tutorial-driven
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <div className="rounded-xl border bg-muted/40 p-6 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-wide text-primary">Live Preview</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                Drag, zoom, and evaluate everything from polynomials to complex exponentials.
              </p>
              <ul className="mt-4 space-y-2">
                <li>• Explicit & implicit graphing</li>
                <li>• Domain coloring and surface plots</li>
                <li>• Circuit + FFT toolkits</li>
              </ul>
              <div className="mt-6 rounded-lg bg-background px-4 py-3 font-mono text-sm text-foreground shadow-inner">
                {"f(z) = e^{i z} + 1/z\u00a0\u00a0u(t) = FFT(signal)"}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                No install. No data loss. Just sign in and start sketching.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Why teams choose Zygraph</h2>
            <p className="mt-2 text-muted-foreground">
              Built for students, researchers, and engineers who need calculator speed with
              documentation-ready output.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map(feature => (
              <div key={feature.title} className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-foreground">Learn fast with guided docs</h2>
            <p className="text-muted-foreground">
              Every major workflow ships with tutorials and reference guides so you can support
              classrooms and lab notebooks without juggling tabs.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {tutorials.map(tutorial => (
              <article key={tutorial.title} className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground">{tutorial.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{tutorial.blurb}</p>
                <Button variant="link" className="mt-2 px-0" asChild>
                  <Link to={tutorial.path}>Read tutorial</Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-background py-6 text-center text-sm text-muted-foreground">
        Built for curious minds. Ready when you are. <Link to="/app" className="text-primary">Open the calculator →</Link>
      </footer>
    </div>
  );
}
