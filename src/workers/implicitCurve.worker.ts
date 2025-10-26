/// <reference lib="webworker" />

import { parseExpression } from "@/lib/parser";
import { buildDefinitionContext } from "@/lib/definitionContext";
import { ImplicitCurve2DEvaluator } from "@/lib/computation/evaluators/ImplicitCurve2DEvaluator";

interface WorkerRequest {
  jobId: string;
  expressionId: string;
  expression: string;
  definitions: Array<{ normalized: string }>;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  resolution: number;
}

interface WorkerResponse {
  jobId: string;
  expressionId: string;
  segments: Array<{ points: Array<{ x: number; y: number }> }>;
}

type SegmentBatch = Array<{ points: Array<{ x: number; y: number }> }>;

const tileCache = new Map<string, SegmentBatch>();
const cacheOrder: string[] = [];
const MAX_CACHE_ENTRIES = 400;

const postResult = (message: WorkerResponse) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

const addToCache = (key: string, segments: SegmentBatch) => {
  tileCache.set(key, segments);
  cacheOrder.push(key);
  if (cacheOrder.length > MAX_CACHE_ENTRIES) {
    const oldest = cacheOrder.shift();
    if (oldest) {
      tileCache.delete(oldest);
    }
  }
};

const buildTileSegments = (
  evaluator: ImplicitCurve2DEvaluator,
  baseKey: string,
  tileBounds: WorkerRequest["bounds"],
  tileResolution: number
) => {
  const cacheKey = `${baseKey}|${tileBounds.xMin}|${tileBounds.xMax}|${tileBounds.yMin}|${tileBounds.yMax}|${tileResolution}`;
  const cached = tileCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const result = evaluator.evaluateCurve({
    bounds: tileBounds,
    resolution: tileResolution,
  });
  addToCache(cacheKey, result.segments);
  return result.segments;
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;
  try {
    const context = buildDefinitionContext(payload.definitions);
    const ast = parseExpression(payload.expression, context);
    const evaluator = new ImplicitCurve2DEvaluator(ast, context);

    const bounds = payload.bounds;
    const definitionKey = payload.definitions.map((d) => d.normalized).sort().join("|");
    const baseKey = `${payload.expression}|${definitionKey}`;

    const spanX = bounds.xMax - bounds.xMin;
    const spanY = bounds.yMax - bounds.yMin;
    const tileSize = Math.max(0.5, Math.min(4, Math.max(spanX, spanY) / 8));
    const xStart = Math.floor(bounds.xMin / tileSize);
    const xEnd = Math.ceil(bounds.xMax / tileSize);
    const yStart = Math.floor(bounds.yMin / tileSize);
    const yEnd = Math.ceil(bounds.yMax / tileSize);
    const tilesAcross = Math.max(1, xEnd - xStart);
    const tilesDown = Math.max(1, yEnd - yStart);
    const tileResolution = Math.max(12, Math.floor(payload.resolution / Math.max(tilesAcross, tilesDown)));

    const aggregated: SegmentBatch = [];
    const margin = tileSize * 0.05;

    for (let ix = xStart; ix <= xEnd; ix++) {
      for (let iy = yStart; iy <= yEnd; iy++) {
        const tileBounds = {
          xMin: ix * tileSize,
          xMax: (ix + 1) * tileSize,
          yMin: iy * tileSize,
          yMax: (iy + 1) * tileSize,
        };
        const segments = buildTileSegments(evaluator, baseKey, tileBounds, tileResolution);
        segments.forEach((segment) => {
          const clippedPoints = segment.points.filter(
            (point) =>
              point.x >= bounds.xMin - margin &&
              point.x <= bounds.xMax + margin &&
              point.y >= bounds.yMin - margin &&
              point.y <= bounds.yMax + margin
          );
          if (clippedPoints.length >= 2) {
            aggregated.push({ points: clippedPoints });
          }
        });
      }
    }

    postResult({
      jobId: payload.jobId,
      expressionId: payload.expressionId,
      segments: aggregated,
    });
  } catch (error) {
    console.error("[implicitCurve.worker] Failed to evaluate implicit curve", error);
    postResult({
      jobId: payload.jobId,
      expressionId: payload.expressionId,
      segments: [],
    });
  }
});
