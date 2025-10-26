import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToolProps } from "@/lib/tools/types";
import { expressionEngine } from "@/lib/expression";
import { SurfaceData } from "@/lib/computation/evaluators/SurfaceEvaluator";
import { createSurfaceFromHeightField } from "@/lib/geometry/heightfield";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Surface3D } from "@/components/3d/Surface3D";
import { useScene3D } from "@/hooks/useScene3D";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

const COMPLEX_RE_VAR = "__complex_re_value";
const COMPLEX_IM_VAR = "__complex_im_value";

type ColorMode = "phase" | "magnitude" | "cartesian";

type ComplexPlaneConfig = {
  extent: number;
  resolution: number;
  colorMode: ColorMode;
  showRealSurface: boolean;
  showImagSurface: boolean;
  logMagnitude: boolean;
};

const DEFAULT_CONFIG: ComplexPlaneConfig = {
  extent: 2.5,
  resolution: 180,
  colorMode: "phase",
  showRealSurface: true,
  showImagSurface: true,
  logMagnitude: true,
};

interface ComplexRenderable {
  id: string;
  color: string;
  latex?: string;
  normalized: string;
  resolution: number;
  domainImage: ImageData | null;
  realSurface?: SurfaceData | null;
  imagSurface?: SurfaceData | null;
  stats: ComplexStats;
  error?: string;
}

interface ComplexStats {
  minReal: number;
  maxReal: number;
  minImag: number;
  maxImag: number;
  minMagnitude: number;
  maxMagnitude: number;
  validPoints: number;
  invalidPoints: number;
}

export function ComplexPlaneTool({
  expressions,
  toolkitDefinitions,
  isActive,
  toolConfig,
  onConfigChange,
}: ToolProps) {
  const [localConfig, setLocalConfig] = useState<ComplexPlaneConfig>(DEFAULT_CONFIG);
  const mergedConfig = useMemo<ComplexPlaneConfig>(
    () => ({
      ...DEFAULT_CONFIG,
      ...localConfig,
      ...(toolConfig as ComplexPlaneConfig | undefined),
    }),
    [localConfig, toolConfig]
  );

  const handleConfigChange = (next: ComplexPlaneConfig) => {
    if (onConfigChange) {
      onConfigChange(next);
    } else {
      setLocalConfig(next);
    }
  };

  const definitionSources = useMemo(
    () =>
      [...expressions, ...toolkitDefinitions]
        .filter(expr => expr.normalized.trim().includes("="))
        .map(expr => ({
          normalized: expressionEngine.normalize(expr.latex || expr.normalized),
        })),
    [expressions, toolkitDefinitions]
  );

  const baseContext = useMemo(
    () => expressionEngine.buildContext(definitionSources),
    [definitionSources]
  );

  const zAst = useMemo(
    () =>
      expressionEngine.parseNormalized(
        `${COMPLEX_RE_VAR} + (${COMPLEX_IM_VAR} * i)`,
        baseContext
      ),
    [baseContext]
  );

  const contextWithZ = useMemo(() => {
    return {
      ...baseContext,
      variables: {
        ...baseContext.variables,
        z: zAst,
      },
    };
  }, [baseContext, zAst]);

  const evaluableExpressions = useMemo(
    () =>
      expressions.filter(expr => {
        const normalized = expr.normalized.trim();
        return normalized && !normalized.includes("=");
      }),
    [expressions]
  );

  const renderables = useMemo<ComplexRenderable[]>(() => {
    if (!isActive) return [];
    return evaluableExpressions.map(expr =>
      buildComplexRenderable(expr, contextWithZ, mergedConfig)
    );
  }, [evaluableExpressions, contextWithZ, mergedConfig, isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="flex h-full w-full gap-4 bg-canvas-bg p-4 overflow-hidden">
      <div className="w-72 shrink-0 overflow-auto">
        <ComplexPlaneControls config={mergedConfig} onChange={handleConfigChange} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-6 pr-1">
        {renderables.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Add an expression (e.g., <code>e^&#123;iz&#125;</code> or <code>z^2 + 1 / z</code>) to explore its
            domain coloring and component surfaces.
          </Card>
        ) : (
          renderables.map(renderable => (
            <ComplexExpressionCard key={renderable.id} data={renderable} config={mergedConfig} />
          ))
        )}
      </div>
    </div>
  );
}

function buildComplexRenderable(
  expr: ToolProps["expressions"][number],
  context: ReturnType<typeof expressionEngine.buildContext>,
  config: ComplexPlaneConfig
): ComplexRenderable {
  const normalizedExpr = expressionEngine.normalize(expr.latex || expr.normalized);

  let ast;
  try {
    ast = expressionEngine.parseNormalized(normalizedExpr, context);
  } catch (error) {
    console.error("[ComplexPlane] Failed to parse expression", {
      id: expr.id,
      latex: expr.latex,
      previousNormalized: expr.normalized,
      normalizedExpr,
    }, error);
    return {
      id: expr.id,
      color: expr.color,
      latex: expr.latex,
      normalized: normalizedExpr,
      resolution: Math.max(32, Math.min(256, Math.floor(config.resolution))),
      domainImage: null,
      realSurface: null,
      imagSurface: null,
      stats: {
        minReal: 0,
        maxReal: 0,
        minImag: 0,
        maxImag: 0,
        minMagnitude: 0,
        maxMagnitude: 0,
        validPoints: 0,
        invalidPoints: 0,
      },
      error: error instanceof Error ? error.message : "Failed to parse expression",
    };
  }
  const resolution = Math.max(32, Math.min(256, Math.floor(config.resolution)));
  const count = resolution * resolution;

  const realValues = new Float32Array(count);
  const imagValues = new Float32Array(count);
  const magnitudeValues = new Float32Array(count);
  const phaseValues = new Float32Array(count);
  const mask = new Uint8Array(count);

  const stats: ComplexStats = {
    minReal: Number.POSITIVE_INFINITY,
    maxReal: Number.NEGATIVE_INFINITY,
    minImag: Number.POSITIVE_INFINITY,
    maxImag: Number.NEGATIVE_INFINITY,
    minMagnitude: Number.POSITIVE_INFINITY,
    maxMagnitude: Number.NEGATIVE_INFINITY,
    validPoints: 0,
    invalidPoints: 0,
  };

  const { extent } = config;
  const reMin = -extent;
  const reMax = extent;
  const imMin = -extent;
  const imMax = extent;
  const reStep = resolution > 1 ? (reMax - reMin) / (resolution - 1) : 1;
  const imStep = resolution > 1 ? (imMax - imMin) / (resolution - 1) : 1;

  let lastError: string | undefined;

  for (let row = 0; row < resolution; row++) {
    const imValue = imMax - row * imStep;
    for (let col = 0; col < resolution; col++) {
      const reValue = reMin + col * reStep;
      const idx = row * resolution + col;

      try {
        const runtimeValue = expressionEngine.evaluate(
          ast,
          {
            [COMPLEX_RE_VAR]: reValue,
            [COMPLEX_IM_VAR]: imValue,
            x: reValue,
            y: imValue,
            re: reValue,
            im: imValue,
          },
          context
        );

        let real = NaN;
        let imag = NaN;

        if (runtimeValue.kind === "complex") {
          real = runtimeValue.real;
          imag = runtimeValue.imag;
        } else if (runtimeValue.kind === "number") {
          real = runtimeValue.value;
          imag = 0;
        } else if (runtimeValue.kind === "boolean") {
          real = runtimeValue.value ? 1 : 0;
          imag = 0;
        }

        realValues[idx] = real;
        imagValues[idx] = imag;

        if (Number.isFinite(real) && Number.isFinite(imag)) {
          const magnitude = Math.hypot(real, imag);
          const phase = Math.atan2(imag, real);
          magnitudeValues[idx] = magnitude;
          phaseValues[idx] = phase;
          mask[idx] = 1;

          stats.validPoints += 1;
          stats.minReal = Math.min(stats.minReal, real);
          stats.maxReal = Math.max(stats.maxReal, real);
          stats.minImag = Math.min(stats.minImag, imag);
          stats.maxImag = Math.max(stats.maxImag, imag);
          stats.minMagnitude = Math.min(stats.minMagnitude, magnitude);
          stats.maxMagnitude = Math.max(stats.maxMagnitude, magnitude);
        } else {
          magnitudeValues[idx] = NaN;
          phaseValues[idx] = 0;
          mask[idx] = 0;
          stats.invalidPoints += 1;
        }
      } catch (error) {
        realValues[idx] = NaN;
        imagValues[idx] = NaN;
        magnitudeValues[idx] = NaN;
        phaseValues[idx] = 0;
        mask[idx] = 0;
        stats.invalidPoints += 1;
        if (!lastError) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
    }
  }

  stats.minReal = Number.isFinite(stats.minReal) ? stats.minReal : 0;
  stats.maxReal = Number.isFinite(stats.maxReal) ? stats.maxReal : 0;
  stats.minImag = Number.isFinite(stats.minImag) ? stats.minImag : 0;
  stats.maxImag = Number.isFinite(stats.maxImag) ? stats.maxImag : 0;
  stats.minMagnitude = Number.isFinite(stats.minMagnitude) ? stats.minMagnitude : 0;
  stats.maxMagnitude = Number.isFinite(stats.maxMagnitude) ? stats.maxMagnitude : 0;

  const domainImage = buildDomainImage({
    resolution,
    colorMode: config.colorMode,
    phase: phaseValues,
    magnitude: magnitudeValues,
    real: realValues,
    imag: imagValues,
    mask,
    stats,
    logMagnitude: config.logMagnitude,
  });

  const realSurface =
    config.showRealSurface && stats.validPoints > 0
      ? createSurfaceFromHeightField({
          resolution,
          xRange: { min: reMin, max: reMax },
          yRange: { min: imMin, max: imMax },
          values: realValues,
          mask,
        })
      : null;

  const imagSurface =
    config.showImagSurface && stats.validPoints > 0
      ? createSurfaceFromHeightField({
          resolution,
          xRange: { min: reMin, max: reMax },
          yRange: { min: imMin, max: imMax },
          values: imagValues,
          mask,
        })
      : null;

  return {
    id: expr.id,
    color: expr.color,
    latex: expr.latex,
    normalized: normalizedExpr,
    resolution,
    domainImage,
    realSurface,
    imagSurface,
    stats,
    error: lastError,
  };
}

interface DomainImageOptions {
  resolution: number;
  colorMode: ColorMode;
  phase: Float32Array;
  magnitude: Float32Array;
  real: Float32Array;
  imag: Float32Array;
  mask: Uint8Array;
  stats: ComplexStats;
  logMagnitude: boolean;
}

function buildDomainImage({
  resolution,
  colorMode,
  phase,
  magnitude,
  real,
  imag,
  mask,
  stats,
  logMagnitude,
}: DomainImageOptions): ImageData {
  const image = new ImageData(resolution, resolution);
  const data = image.data;
  const maxMag = stats.maxMagnitude || 1;
  const realRange = stats.maxReal - stats.minReal || 1;
  const imagRange = stats.maxImag - stats.minImag || 1;

  for (let idx = 0; idx < resolution * resolution; idx++) {
    const offset = idx * 4;
    if (!mask[idx]) {
      data[offset] = 20;
      data[offset + 1] = 20;
      data[offset + 2] = 25;
      data[offset + 3] = 255;
      continue;
    }

    const mag = magnitude[idx];
    const ph = phase[idx];
    const re = real[idx];
    const im = imag[idx];

    let r = 0;
    let g = 0;
    let b = 0;

    if (colorMode === "phase") {
      const hue = ((ph / (2 * Math.PI)) + 1) % 1;
      const brightness = logMagnitude
        ? 1 - Math.exp(-Math.max(0, mag))
        : Math.min(1, mag / maxMag);
      const { red, green, blue } = hsvToRgb(hue, 0.9, brightness || 0.1);
      r = red;
      g = green;
      b = blue;
    } else if (colorMode === "magnitude") {
      const intensity = Math.min(1, mag / maxMag);
      r = Math.round(255 * intensity);
      g = Math.round(255 * Math.pow(intensity, 0.75));
      b = Math.round(255 * Math.pow(intensity, 0.5));
    } else {
      const realRatio = (re - stats.minReal) / realRange;
      const imagRatio = (im - stats.minImag) / imagRange;
      r = Math.round(255 * clamp(realRatio, 0, 1));
      b = Math.round(255 * clamp(imagRatio, 0, 1));
      g = Math.round(255 * clamp((realRatio + imagRatio) / 2, 0, 1));
    }

    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  }

  return image;
}

function hsvToRgb(h: number, s: number, v: number) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    red: Math.round(r * 255),
    green: Math.round(g * 255),
    blue: Math.round(b * 255),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const ComplexExpressionCard = ({
  data,
  config,
}: {
  data: ComplexRenderable;
  config: ComplexPlaneConfig;
}) => {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Badge style={{ backgroundColor: data.color }} className="text-xs">
              Expression
            </Badge>
            <span className="text-sm text-muted-foreground">
              Sampling {config.resolution}^2 points in [-{config.extent}, {config.extent}]
            </span>
          </div>
          <p className="mt-2 font-mono text-sm text-foreground break-all">
            {data.latex || data.normalized}
          </p>
        </div>
        {data.error && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <Info className="h-3.5 w-3.5" />
            {data.error}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DomainCanvas imageData={data.domainImage} label="Domain coloring" />
        <StatsPanel stats={data.stats} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {config.showRealSurface && (
          <ComplexSurfaceMini data={data.realSurface} label="Re(f(z))" />
        )}
        {config.showImagSurface && (
          <ComplexSurfaceMini data={data.imagSurface} label="Im(f(z))" />
        )}
      </div>
    </Card>
  );
};

const DomainCanvas = ({ imageData, label }: { imageData: ImageData | null; label: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = imageData.width;
    canvasRef.current.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <div className="rounded-lg border bg-background/60 p-2">
      <div className="text-xs font-semibold text-muted-foreground mb-2">{label}</div>
      <div className="aspect-square w-full overflow-hidden rounded-md bg-black/80">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
};

const StatsPanel = ({ stats }: { stats: ComplexStats }) => (
  <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
      Field stats
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
      <span className="text-muted-foreground">Re min</span>
      <span>{stats.minReal.toFixed(4)}</span>
      <span className="text-muted-foreground">Re max</span>
      <span>{stats.maxReal.toFixed(4)}</span>
      <span className="text-muted-foreground">Im min</span>
      <span>{stats.minImag.toFixed(4)}</span>
      <span className="text-muted-foreground">Im max</span>
      <span>{stats.maxImag.toFixed(4)}</span>
      <span className="text-muted-foreground">|f| min</span>
      <span>{stats.minMagnitude.toFixed(4)}</span>
      <span className="text-muted-foreground">|f| max</span>
      <span>{stats.maxMagnitude.toFixed(4)}</span>
      <span className="text-muted-foreground">Valid</span>
      <span>{stats.validPoints}</span>
      <span className="text-muted-foreground">Undefined</span>
      <span>{stats.invalidPoints}</span>
    </div>
  </div>
);

const ComplexSurfaceMini = ({ data, label }: { data?: SurfaceData | null; label: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { scene, sceneVersion, isReady, requestRender } = useScene3D(canvasRef, Boolean(data));

  useEffect(() => {
    if (!scene) return;
    scene.background = new THREE.Color("#0c0c12");
  }, [scene]);

  return (
    <div className="rounded-lg border bg-background/60 p-2">
      <div className="text-xs font-semibold text-muted-foreground mb-2">{label}</div>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/80">
        <canvas ref={canvasRef} className="h-full w-full" />
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            No valid samples
          </div>
        )}
        {isReady && scene && data && (
          <Surface3D
            scene={scene}
            sceneVersion={sceneVersion}
            data={data}
            color="#9b87f5"
            wireframe={false}
            opacity={0.9}
            requestRender={requestRender}
          />
        )}
      </div>
    </div>
  );
};

const ComplexPlaneControls = ({
  config,
  onChange,
}: {
  config: ComplexPlaneConfig;
  onChange: (next: ComplexPlaneConfig) => void;
}) => {
  const [open, setOpen] = useState(true);

  return (
    <Card className="w-full space-y-4 bg-background/95 p-4 backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">Complex plane</p>
          <p className="text-xs text-muted-foreground">Domain coloring & component surfaces</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setOpen(prev => !prev)}
          aria-label={open ? "Collapse controls" : "Expand controls"}
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {open && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Extent: +/-{config.extent.toFixed(1)}</Label>
            <Slider
              value={[config.extent]}
              min={1}
              max={6}
              step={0.5}
              onValueChange={([value]) => onChange({ ...config, extent: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Resolution: {config.resolution}px</Label>
            <Slider
              value={[config.resolution]}
              min={64}
              max={256}
              step={16}
              onValueChange={([value]) => onChange({ ...config, resolution: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Color mode</Label>
            <Select
              value={config.colorMode}
              onValueChange={value => onChange({ ...config, colorMode: value as ColorMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phase">Phase (domain coloring)</SelectItem>
                <SelectItem value="magnitude">Magnitude heatmap</SelectItem>
                <SelectItem value="cartesian">Cartesian blend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Log brightness</Label>
            <Switch
              checked={config.logMagnitude}
              onCheckedChange={checked => onChange({ ...config, logMagnitude: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Re surface</Label>
            <Switch
              checked={config.showRealSurface}
              onCheckedChange={checked => onChange({ ...config, showRealSurface: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Im surface</Label>
            <Switch
              checked={config.showImagSurface}
              onCheckedChange={checked => onChange({ ...config, showImagSurface: checked })}
            />
          </div>
        </div>
      )}
    </Card>
  );
};





