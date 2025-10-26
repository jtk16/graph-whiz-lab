import { Link } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calculator, 
  Box, 
  Palette, 
  Zap, 
  BookOpen,
  ChevronRight 
} from "lucide-react";

const TableOfContents = ({ activeSection, onNavigate }: { activeSection: string; onNavigate: (section: string) => void }) => {
  const sections = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "getting-started", label: "Getting Started", icon: Calculator },
    { id: "tools", label: "Visualization Tools", icon: Palette },
    { id: "functions", label: "Function Reference", icon: Zap },
    { id: "toolkits", label: "Toolkits", icon: Box },
  ];

  return (
    <nav className="space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onNavigate(section.id)}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            activeSection === section.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <section.icon className="h-4 w-4" />
          <span>{section.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default function Docs() {
  const [activeSection, setActiveSection] = useState("overview");

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
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Button asChild size="sm">
              <Link to="/app">Launch Calculator</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h2 className="mb-4 text-sm font-semibold">Documentation</h2>
              <TableOfContents activeSection={activeSection} onNavigate={setActiveSection} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            <div className="space-y-12">
              {/* Overview */}
              <section id="overview">
                <h1 className="mb-4 text-4xl font-bold">Zygraph Documentation</h1>
                <p className="text-lg text-muted-foreground">
                  Complete reference guide for advanced mathematical computing with Zygraph. 
                  Learn how to visualize functions, analyze circuits, process signals, and explore complex mathematics.
                </p>
                
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <Card className="p-6">
                    <h3 className="font-semibold">What is Zygraph?</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      A comprehensive web-based mathematical computing platform combining graphing, 
                      complex analysis, circuit simulation, and signal processing in one unified workspace.
                    </p>
                  </Card>
                  <Card className="p-6">
                    <h3 className="font-semibold">Key Capabilities</h3>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• 2D/3D function graphing</li>
                      <li>• Complex plane visualization</li>
                      <li>• Circuit analysis</li>
                      <li>• Signal processing (FFT/IFFT)</li>
                    </ul>
                  </Card>
                </div>
              </section>

              {/* Getting Started */}
              <section id="getting-started" className="scroll-mt-24">
                <h2 className="mb-6 text-3xl font-bold">Getting Started</h2>
                
                <Card className="p-6">
                  <h3 className="mb-4 text-xl font-semibold">Quick Start Guide</h3>
                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">1</span>
                      <div>
                        <div className="font-medium">Open the Calculator</div>
                        <div className="text-sm text-muted-foreground">Navigate to <Link to="/app" className="text-primary hover:underline">/app</Link> to access the main calculator interface</div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">2</span>
                      <div>
                        <div className="font-medium">Enter Expressions</div>
                        <div className="text-sm text-muted-foreground">Type equations using LaTeX notation or the visual math keyboard</div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">3</span>
                      <div>
                        <div className="font-medium">Choose Visualization</div>
                        <div className="text-sm text-muted-foreground">Select 2D Graph, 3D Graph, Complex Plane, or Circuit from the workspace</div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">4</span>
                      <div>
                        <div className="font-medium">Interact & Explore</div>
                        <div className="text-sm text-muted-foreground">Pan, zoom, rotate, and adjust parameters to explore your mathematical expressions</div>
                      </div>
                    </li>
                  </ol>
                </Card>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="font-medium">LaTeX Input</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Use standard LaTeX notation: <code className="rounded bg-muted px-1 py-0.5">\pi</code> for π, 
                      <code className="rounded bg-muted px-1 py-0.5">x^2</code> for x², 
                      <code className="rounded bg-muted px-1 py-0.5">\frac&#123;a&#125;&#123;b&#125;</code> for fractions
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-medium">Math Keyboard</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click the keyboard icon to access common functions, Greek letters, operators, and special symbols
                    </p>
                  </Card>
                </div>
              </section>

              {/* Visualization Tools */}
              <section id="tools" className="scroll-mt-24">
                <h2 className="mb-6 text-3xl font-bold">Visualization Tools</h2>
                
                <Tabs defaultValue="2d" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="2d">2D Graph</TabsTrigger>
                    <TabsTrigger value="3d">3D Graph</TabsTrigger>
                    <TabsTrigger value="complex">Complex Plane</TabsTrigger>
                    <TabsTrigger value="circuit">Circuit</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="2d" className="space-y-4">
                    <Card className="p-6">
                      <h3 className="mb-4 text-xl font-semibold">2D Graphing Tool</h3>
                      <p className="text-muted-foreground">Visualize mathematical functions on a Cartesian plane with adaptive sampling and precision rendering.</p>
                      
                      <div className="mt-6 space-y-4">
                        <div>
                          <h4 className="font-medium">Supported Input Types</h4>
                          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                            <li>• <strong>Explicit functions:</strong> <code className="rounded bg-muted px-1">y = f(x)</code> - e.g., <code className="rounded bg-muted px-1">y = x^2</code></li>
                            <li>• <strong>Implicit relations:</strong> <code className="rounded bg-muted px-1">F(x,y) = 0</code> - e.g., <code className="rounded bg-muted px-1">x^2 + y^2 = 25</code></li>
                            <li>• <strong>Parametric curves:</strong> Define x and y as functions of parameter t</li>
                            <li>• <strong>Points and lists:</strong> Plot discrete data points</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Examples</h4>
                          <div className="mt-2 space-y-2">
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">y = sin(x)</code>
                              <div className="mt-1 text-xs text-muted-foreground">Sine wave</div>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">x^2 + y^2 = 25</code>
                              <div className="mt-1 text-xs text-muted-foreground">Circle with radius 5 (implicit)</div>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">y = if(x &gt; 0, x, -x)</code>
                              <div className="mt-1 text-xs text-muted-foreground">Absolute value using conditional</div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Controls</h4>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• <strong>Pan:</strong> Click and drag to move the viewport</li>
                            <li>• <strong>Zoom:</strong> Scroll wheel or pinch to zoom in/out</li>
                            <li>• <strong>Grid:</strong> Toggle grid display and adjust spacing</li>
                            <li>• <strong>Axis ranges:</strong> Set custom min/max values for x and y axes</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="3d" className="space-y-4">
                    <Card className="p-6">
                      <h3 className="mb-4 text-xl font-semibold">3D Graphing Tool</h3>
                      <p className="text-muted-foreground">Render three-dimensional surfaces, curves, and point clouds with interactive 3D controls.</p>
                      
                      <div className="mt-6 space-y-4">
                        <div>
                          <h4 className="font-medium">Supported Input Types</h4>
                          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                            <li>• <strong>Surfaces:</strong> <code className="rounded bg-muted px-1">z = f(x,y)</code> - e.g., <code className="rounded bg-muted px-1">z = x^2 + y^2</code></li>
                            <li>• <strong>Implicit 3D:</strong> <code className="rounded bg-muted px-1">F(x,y,z) = 0</code> - e.g., <code className="rounded bg-muted px-1">x^2 + y^2 + z^2 = 25</code></li>
                            <li>• <strong>Parametric curves:</strong> 3D curves defined by parameter t</li>
                            <li>• <strong>3D points:</strong> Plot points in three-dimensional space</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Examples</h4>
                          <div className="mt-2 space-y-2">
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">z = x^2 + y^2</code>
                              <div className="mt-1 text-xs text-muted-foreground">Paraboloid surface</div>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">x^2 + y^2 + z^2 = 25</code>
                              <div className="mt-1 text-xs text-muted-foreground">Sphere with radius 5 (implicit)</div>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">helix(t) = (cos(t), sin(t), t/5)</code>
                              <div className="mt-1 text-xs text-muted-foreground">Parametric helix (requires 3D Geometry toolkit)</div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Controls</h4>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• <strong>Rotate:</strong> Click and drag to rotate the view</li>
                            <li>• <strong>Zoom:</strong> Scroll wheel to zoom in/out</li>
                            <li>• <strong>Wireframe:</strong> Toggle wireframe rendering mode</li>
                            <li>• <strong>Lighting:</strong> Adjust lighting and shading parameters</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="complex" className="space-y-4">
                    <Card className="p-6">
                      <h3 className="mb-4 text-xl font-semibold">Complex Plane Tool</h3>
                      <p className="text-muted-foreground">Visualize complex-valued functions using domain coloring with multiple color modes and surface views.</p>
                      
                      <div className="mt-6 space-y-4">
                        <div>
                          <h4 className="font-medium">Color Modes</h4>
                          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                            <li>• <strong>Phase:</strong> Displays the argument/angle of the complex output using hue</li>
                            <li>• <strong>Magnitude:</strong> Shows the absolute value using brightness</li>
                            <li>• <strong>Cartesian:</strong> Separates real and imaginary components with different colors</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Examples</h4>
                          <div className="mt-2 space-y-2">
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">f(z) = z^2</code>
                              <div className="mt-1 text-xs text-muted-foreground">Basic polynomial mapping</div>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">f(z) = e^(i*z)</code>
                              <div className="mt-1 text-xs text-muted-foreground">Complex exponential (Euler's formula)</div>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                              <code className="text-sm">f(z) = 1/z</code>
                              <div className="mt-1 text-xs text-muted-foreground">Reciprocal with pole at origin</div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Features</h4>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• <strong>Real/Imaginary surfaces:</strong> View 3D surface plots of real and imaginary components</li>
                            <li>• <strong>Resolution control:</strong> Adjust sampling density for performance vs. quality</li>
                            <li>• <strong>Automatic i insertion:</strong> The complex unit is auto-inserted for common patterns</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="circuit" className="space-y-4">
                    <Card className="p-6">
                      <h3 className="mb-4 text-xl font-semibold">Circuit Tool</h3>
                      <p className="text-muted-foreground">Build and analyze electrical circuits with symbolic nodal analysis to solve for node voltages and branch currents.</p>
                      
                      <div className="mt-6 space-y-4">
                        <div>
                          <h4 className="font-medium">Supported Components</h4>
                          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                            <li>• <strong>Resistors (R):</strong> Define resistance in ohms</li>
                            <li>• <strong>Capacitors (C):</strong> Define capacitance in farads</li>
                            <li>• <strong>Inductors (L):</strong> Define inductance in henries</li>
                            <li>• <strong>Voltage sources:</strong> Independent voltage sources</li>
                            <li>• <strong>Current sources:</strong> Independent current sources</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Usage</h4>
                          <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                            <li>1. Define component values in the expression list (e.g., <code className="rounded bg-muted px-1">R1 = 1000</code>)</li>
                            <li>2. Build your circuit using the drag-and-drop interface</li>
                            <li>3. Run symbolic nodal analysis to solve for voltages and currents</li>
                            <li>4. View results and plot time/frequency responses</li>
                          </ol>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Example Circuits</h4>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• RC low-pass filter</li>
                            <li>• RLC resonant circuit</li>
                            <li>• Voltage divider networks</li>
                            <li>• Op-amp configurations (future)</li>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </section>

              {/* Function Reference */}
              <section id="functions" className="scroll-mt-24">
                <h2 className="mb-6 text-3xl font-bold">Function Reference</h2>
                <p className="mb-6 text-muted-foreground">
                  Complete reference for all built-in operators and functions available in Zygraph.
                </p>
                
                {/* Arithmetic Operators */}
                <Card className="mb-6 p-6">
                  <h3 className="mb-4 text-2xl font-semibold">Arithmetic Operators</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium">Operator</th>
                          <th className="pb-2 text-left font-medium">Syntax</th>
                          <th className="pb-2 text-left font-medium">Description</th>
                          <th className="pb-2 text-left font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">Addition</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">a + b</code></td>
                          <td className="py-2 text-muted-foreground">Adds two numbers or points</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">2 + 3 = 5</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">Subtraction</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">a - b</code></td>
                          <td className="py-2 text-muted-foreground">Subtracts b from a</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">5 - 2 = 3</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">Multiplication</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">a * b</code></td>
                          <td className="py-2 text-muted-foreground">Multiplies two numbers</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">2 * 3 = 6</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">Division</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">a / b</code></td>
                          <td className="py-2 text-muted-foreground">Divides a by b</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">6 / 2 = 3</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">Exponentiation</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">a ^ b</code></td>
                          <td className="py-2 text-muted-foreground">Raises a to power b</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">2 ^ 3 = 8</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">Modulo</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">a % b</code></td>
                          <td className="py-2 text-muted-foreground">Remainder of a÷b</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">7 % 3 = 1</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Trigonometric Functions */}
                <Card className="mb-6 p-6">
                  <h3 className="mb-4 text-2xl font-semibold">Trigonometric Functions</h3>
                  <p className="mb-4 text-sm text-muted-foreground">All angles are in radians.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium">Function</th>
                          <th className="pb-2 text-left font-medium">Syntax</th>
                          <th className="pb-2 text-left font-medium">Description</th>
                          <th className="pb-2 text-left font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">sin</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">sin(x)</code></td>
                          <td className="py-2 text-muted-foreground">Sine function</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">sin(π/2) = 1</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">cos</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">cos(x)</code></td>
                          <td className="py-2 text-muted-foreground">Cosine function</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">cos(0) = 1</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">tan</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">tan(x)</code></td>
                          <td className="py-2 text-muted-foreground">Tangent function</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">tan(π/4) ≈ 1</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">asin</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">asin(x)</code></td>
                          <td className="py-2 text-muted-foreground">Inverse sine (arcsin)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">asin(1) = π/2</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">acos</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">acos(x)</code></td>
                          <td className="py-2 text-muted-foreground">Inverse cosine (arccos)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">acos(0) = π/2</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">atan</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">atan(x)</code></td>
                          <td className="py-2 text-muted-foreground">Inverse tangent (arctan)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">atan(1) = π/4</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Mathematical Functions */}
                <Card className="mb-6 p-6">
                  <h3 className="mb-4 text-2xl font-semibold">Mathematical Functions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium">Function</th>
                          <th className="pb-2 text-left font-medium">Syntax</th>
                          <th className="pb-2 text-left font-medium">Description</th>
                          <th className="pb-2 text-left font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">sqrt</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">sqrt(x)</code></td>
                          <td className="py-2 text-muted-foreground">Square root (x ≥ 0)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">sqrt(16) = 4</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">abs</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">abs(x)</code></td>
                          <td className="py-2 text-muted-foreground">Absolute value</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">abs(-5) = 5</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">exp</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">exp(x)</code></td>
                          <td className="py-2 text-muted-foreground">Exponential (e^x)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">exp(1) ≈ 2.718</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">ln</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">ln(x)</code></td>
                          <td className="py-2 text-muted-foreground">Natural log (x &gt; 0)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">ln(e) = 1</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">log</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">log(x)</code></td>
                          <td className="py-2 text-muted-foreground">Base-10 log (x &gt; 0)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">log(100) = 2</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">floor</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">floor(x)</code></td>
                          <td className="py-2 text-muted-foreground">Round down to integer</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">floor(3.7) = 3</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">ceil</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">ceil(x)</code></td>
                          <td className="py-2 text-muted-foreground">Round up to integer</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">ceil(3.2) = 4</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">round</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">round(x)</code></td>
                          <td className="py-2 text-muted-foreground">Round to nearest integer</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">round(3.5) = 4</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Complex Functions */}
                <Card className="mb-6 p-6">
                  <h3 className="mb-4 text-2xl font-semibold">Complex Number Functions</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Use <code className="rounded bg-muted px-1">i</code> for the imaginary unit.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium">Function</th>
                          <th className="pb-2 text-left font-medium">Syntax</th>
                          <th className="pb-2 text-left font-medium">Description</th>
                          <th className="pb-2 text-left font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">arg</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">arg(z)</code></td>
                          <td className="py-2 text-muted-foreground">Argument (phase angle)</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">arg(1+i) = π/4</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">real</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">real(z)</code></td>
                          <td className="py-2 text-muted-foreground">Real part</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">real(3+4i) = 3</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">imag</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">imag(z)</code></td>
                          <td className="py-2 text-muted-foreground">Imaginary part</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">imag(3+4i) = 4</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">conj</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">conj(z)</code></td>
                          <td className="py-2 text-muted-foreground">Complex conjugate</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">conj(3+4i) = 3-4i</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* List Operations */}
                <Card className="mb-6 p-6">
                  <h3 className="mb-4 text-2xl font-semibold">List Operations</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Use square brackets for lists: <code className="rounded bg-muted px-1">[1, 2, 3, 4, 5]</code></p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium">Function</th>
                          <th className="pb-2 text-left font-medium">Syntax</th>
                          <th className="pb-2 text-left font-medium">Description</th>
                          <th className="pb-2 text-left font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">sum</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">sum(L)</code></td>
                          <td className="py-2 text-muted-foreground">Sum of elements</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">sum([1,2,3]) = 6</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">mean</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">mean(L)</code></td>
                          <td className="py-2 text-muted-foreground">Average of elements</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">mean([1,2,3]) = 2</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">min</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">min(L)</code></td>
                          <td className="py-2 text-muted-foreground">Minimum element</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">min([1,5,3]) = 1</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">max</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">max(L)</code></td>
                          <td className="py-2 text-muted-foreground">Maximum element</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">max([1,5,3]) = 5</code></td>
                        </tr>
                        <tr>
                          <td className="py-2">length</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">length(L)</code></td>
                          <td className="py-2 text-muted-foreground">Number of elements</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">length([1,2,3]) = 3</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Signal Processing */}
                <Card className="p-6">
                  <h3 className="mb-4 text-2xl font-semibold">Signal Processing Functions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="pb-2 text-left font-medium">Function</th>
                          <th className="pb-2 text-left font-medium">Syntax</th>
                          <th className="pb-2 text-left font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">fft</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">fft(L)</code></td>
                          <td className="py-2 text-muted-foreground">Fast Fourier Transform of list</td>
                        </tr>
                        <tr>
                          <td className="py-2">ifft</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">ifft(L)</code></td>
                          <td className="py-2 text-muted-foreground">Inverse FFT</td>
                        </tr>
                        <tr>
                          <td className="py-2">magnitude</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">magnitude(L)</code></td>
                          <td className="py-2 text-muted-foreground">Magnitude spectrum</td>
                        </tr>
                        <tr>
                          <td className="py-2">phase</td>
                          <td className="py-2"><code className="rounded bg-muted px-1">phase(L)</code></td>
                          <td className="py-2 text-muted-foreground">Phase spectrum</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>

              {/* Toolkits */}
              <section id="toolkits" className="scroll-mt-24">
                <h2 className="mb-6 text-3xl font-bold">Toolkits</h2>
                <p className="mb-6 text-muted-foreground">
                  Pre-defined collections of functions for specific domains. Import toolkits to access specialized functions.
                </p>
                
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="mb-4 text-xl font-semibold">Signal Processing Toolkit</h3>
                    <p className="mb-4 text-muted-foreground">
                      Common signal functions for time-domain and frequency-domain analysis.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div><code className="rounded bg-muted px-1">u(t)</code> - Unit step (Heaviside) function</div>
                      <div><code className="rounded bg-muted px-1">delta(t)</code> - Dirac delta (impulse)</div>
                      <div><code className="rounded bg-muted px-1">rect(t)</code> - Rectangular pulse</div>
                      <div><code className="rounded bg-muted px-1">sinc(t)</code> - Sinc function</div>
                      <div><code className="rounded bg-muted px-1">sq(t)</code> - Square wave</div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="mb-4 text-xl font-semibold">3D Geometry Toolkit</h3>
                    <p className="mb-4 text-muted-foreground">
                      Pre-defined 3D curves and surfaces for exploring three-dimensional space.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div><code className="rounded bg-muted px-1">helix(t)</code> - Parametric helix curve</div>
                      <div><code className="rounded bg-muted px-1">lissajous(t)</code> - Lissajous 3D curve</div>
                      <div><code className="rounded bg-muted px-1">trefoil(t)</code> - Trefoil knot</div>
                    </div>
                  </Card>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          <p>Zygraph Documentation — Last updated 2025</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/app" className="hover:text-foreground transition-colors">
              Calculator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
