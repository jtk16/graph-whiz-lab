import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calculator, 
  Box, 
  Palette, 
  Zap,
  GraduationCap,
  FlaskConical,
  Lightbulb,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "2D & 3D Graphing",
    description: "Plot explicit functions, implicit relations, parametric curves, and 3D surfaces with professional rendering and adaptive sampling."
  },
  {
    icon: Palette,
    title: "Complex Analysis",
    description: "Visualize complex-valued functions with domain coloring, showing magnitude, phase, and real/imaginary components in stunning detail."
  },
  {
    icon: Zap,
    title: "Circuit Simulation",
    description: "Build and analyze electrical circuits with symbolic nodal analysis. Solve for node voltages and currents symbolically."
  },
  {
    icon: Box,
    title: "Signal Processing",
    description: "FFT/IFFT operations, frequency domain analysis, signal filtering, and spectrum visualization for engineering workflows."
  }
];

const useCases = [
  {
    icon: GraduationCap,
    title: "Students & Educators",
    description: "Replace expensive graphing calculators with a comprehensive web-based platform. Create lesson plans with reusable toolkit definitions."
  },
  {
    icon: FlaskConical,
    title: "Engineers & Researchers",
    description: "Advanced mathematical modeling, circuit analysis, and signal processing tools for professional engineering work and research."
  },
  {
    icon: Lightbulb,
    title: "Math Enthusiasts",
    description: "Explore mathematical concepts visually. From simple polynomials to complex manifolds, see mathematics come to life."
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              ζ
            </div>
            <span className="hidden sm:inline">Zygraph</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
            <Button asChild size="sm">
              <Link to="/app">Launch Calculator</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center space-y-6">
              <Badge variant="secondary" className="w-fit">
                Advanced Mathematical Computing
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Professional Graphing Calculator for Engineers & Students
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl">
                Powerful visualization and computation platform combining 2D/3D graphing, complex analysis, 
                circuit simulation, and signal processing in one unified workspace.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="group">
                  <Link to="/app">
                    Open Calculator
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/docs">View Documentation</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 pt-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Free & Web-based</span> • No installation
                </div>
                <div>
                  <span className="font-medium text-foreground">LaTeX Support</span> • Professional input
                </div>
                <div>
                  <span className="font-medium text-foreground">Open Source</span> • Community driven
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <Card className="flex flex-col justify-center bg-card p-8 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Calculator className="h-4 w-4" />
                  Live Calculator Preview
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="font-mono text-sm">y = sin(x) · e^(-x/5)</div>
                    <div className="mt-1 text-xs text-muted-foreground">Damped sine wave</div>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="font-mono text-sm">x² + y² + z² = 25</div>
                    <div className="mt-1 text-xs text-muted-foreground">3D sphere (implicit)</div>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="font-mono text-sm">f(z) = e^(i·z)</div>
                    <div className="mt-1 text-xs text-muted-foreground">Complex exponential</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Type equations naturally with LaTeX support. See results instantly with interactive 
                  pan, zoom, and rotation controls.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-t bg-muted/50 py-16 sm:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Complete Mathematical Toolkit
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need for advanced mathematical visualization and computation, 
                accessible from any web browser.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="relative overflow-hidden p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for Everyone Who Works with Math
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From classroom instruction to professional research, Zygraph adapts to your needs.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <Card key={useCase.title} className="p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <useCase.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{useCase.title}</h3>
                  <p className="mt-3 text-muted-foreground">{useCase.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="border-t bg-muted/50 py-16 sm:py-24">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why Choose Zygraph?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Comprehensive features without the complexity or cost
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6">
                <h3 className="font-semibold">Free & Accessible</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  No subscriptions, no installations. Works in any modern web browser on desktop or tablet.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold">3D Visualization</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Interactive 3D surface plots and implicit equations. Rotate, zoom, and explore mathematical structures.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold">Engineering Tools</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Circuit simulation and signal processing capabilities not found in basic graphing calculators.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold">LaTeX Input</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Professional mathematical notation with visual math keyboard for easy equation entry.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold">Saved Toolkits</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create reusable function libraries for lesson plans or repeated analyses.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold">Complex Analysis</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Domain coloring visualization for complex functions with magnitude and phase views.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Start Exploring?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Launch the calculator now and experience the power of professional mathematical computing in your browser.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="group">
                <Link to="/app">
                  Launch Calculator
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/docs">Read Documentation</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          <p>Zygraph — Advanced mathematical computing for everyone</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/app" className="hover:text-foreground transition-colors">
              Calculator
            </Link>
            <Link to="/docs" className="hover:text-foreground transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
