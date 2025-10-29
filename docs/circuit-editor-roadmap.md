# Circuit Editor Vision & Roadmap

## What the editor must do to be useful

### Core editing
- Pan, zoom to cursor, zoom-to-fit, minimap.
- Grid with snap, angle snap, port snap, alignment guides.
- Select, multiselect, box select, add/remove from selection.
- Move, rotate, nudge, duplicate, group, lock, hide, layer order.
- Orthogonal wire routing with autowaypoints and avoidance.
- Ports: typed, directional, optional, variadic.
- Context menus, keyboard shortcuts, command palette.
- Undo/redo with deep history and stable IDs.
- Autosave, versioned saves, diff view, restore.

### Node and circuit structure
- Subcircuits (symbols), parameters, default values, exposed ports.
- Library browser with search, tags, favorites, recents.
- Templates and examples.

### Computation for a calculator
- Deterministic evaluation on a DAG with dirty-bit propagation.
- Partial recomputation on edits. Cycle detection with clear errors.
- Data types: scalar, vector, matrix, boolean, string, units.
- Unit checking and auto-convert where safe.
- Numeric modes: float, bigdecimal, integer, complex.
- Probes, watches, breakpoints, time-travel on history.
- Performance counters per node (eval time, cache hit).

### I/O
- Import/export: JSON schema with version + migrations.
- Share links with embedded state. SVG/PNG export of viewport.
- Headless evaluate API for tests and CI.

### Quality
- Low input latency (<50 ms input-to-paint p95).
- Smooth pan/zoom at 60 Hz on 10k+ elements.
- A11y: full keyboard nav, focus rings, ARIA names, color contrast.
- Internationalization of numbers and shortcuts.
- Crash-free autosave and recovery.

## Problems to address

### Performance
- Too many DOM/SVG nodes. Per-wire elements kill layout and GC.
- Work happening on main thread during drag and zoom.
- Re-evaluating the whole graph on small edits.
- Pointer-move handlers fire every event without rAF or throttling.
- Expensive hit-testing (linear scans).

### UX
- Inconsistent pan/zoom. No zoom-to-cursor. Wheel zoom jumps.
- Weak selection model. No box select, poor focus handling.
- No snapping or guides. Wires cross components.
- Few shortcuts. Modal tools unclear. No command palette.
- Property editing scattered. No inspector with type-aware inputs.
- Routing produces jagged or overlapping lines.
- No minimap, no breadcrumbs, weak empty state.

### Functionality gaps
- No subcircuits or parameterized symbols.
- No unit checking or typed ports.
- Limited probes and watches. No perf insight.
- Fragile undo/redo. Autosave clashes with history.
- No import/export guarantees. No schema versioning.

### Reliability
- History and IDs unstable, causing selection jumps.
- Large canvases stutter or crash due to memory churn.

## Fix plan (concrete, ordered)

1. **Rendering architecture**
   - Switch to Canvas/WebGL for scene, keep DOM for chrome.
   - Draw nodes and wires in batches. Avoid per-wire DOM/SVG.
   - Introduce a scene graph + spatial index (quadtree/R-tree).
   - Frame loop with requestAnimationFrame; coalesce pointer moves into one paint per frame.
   - Offload layout, routing, and measurement to a web worker; use OffscreenCanvas when available.
   - Level-of-detail rendering during interaction; restore detail after idle.
   - Virtualize: draw only objects in/near viewport via tiling.
   - **Acceptance:** 10k nodes + 20k wires pan at 60 fps on a 4-year-old laptop; p95 input-to-paint <50 ms while dragging.

2. **Input pipeline**
   - Pointer capture + event delegation with single top-level listeners.
  - Zoom to cursor, trackpad pinch support, configurable invert, exponential zoom smoothing.
  - Snap system: grid, angle, magnetic port snapping with visual hints.
  - Marquee and multi-select with additive/removal modifiers, keyboard nudge (1/10 units).
  - **Acceptance:** Hit accuracy >99% at any zoom. No scroll jumps. Snap preview <16 ms.

3. **Routing and wires**
   - Orthogonal router with obstacle avoidance (A* on coarse grid + Manhattan post-process).
   - Batch geometry: merge wires per layer; compute anchors in worker.
   - Port docking rules with compass directions and hysteresis to avoid flicker.
   - **Acceptance:** Reroute <30 ms for typical drags; zero wire overlap with components at p95.

4. **Graph evaluation**
   - DAG with dirty-bit propagation; recompute only affected nodes.
   - Cycle detection (Tarjan/Kosaraju) with clear error surface.
   - Typed ports and units; auto-convert where unambiguous.
   - Numeric backends: float default, optional big-decimal/complex/matrix modules.
   - **Acceptance:** Editing one constant in 5k-node graph touches <2% nodes p95; unit errors surface <50 ms.

5. **Undo/redo and persistence**
   - Command-pattern diffs with stable IDs.
   - Time-travel-safe autosave (debounced snapshots + rolling diffs) with recovery into exact history.
   - Versioned schema + migrations; validated JSON import/export.
   - **Acceptance:** 1k-step history <50 MB; undo latency <15 ms; crash recovery restores state + history.

6. **UI/UX surfaces**
   - Inspector panel with type-aware editors, unit pickers, validation.
   - Node library with search, categories, drag-to-place, keyboard insert.
   - Command palette; minimap and breadcrumbs for subcircuit navigation.
   - Context menus with shortcuts; on-canvas alignment guides.
   - Rich empty state and templates/examples.
   - **Acceptance:** Place-wire-evaluate flow in ≤3 actions; top 20 tasks accessible via shortcuts.

7. **Subcircuits and reuse**
   - Symbol authoring: group → subcircuit, expose ports, define params/defaults.
   - Instances override params with cache invalidation propagation.
   - Library publishing with version tags.
   - **Acceptance:** Replace 100-node repeated pattern with symbol instance in <20 s.

8. **Diagnostics**
   - Probes/watches on ports with live values/units; watch list with history.
   - Performance overlays (eval-time heatmaps, cache-hit indicators); frame meter.
   - **Acceptance:** Identify top 10 slow nodes within 10 s.

9. **Accessibility & internationalization**
   - Full keyboard parity, visible focus, skip-to-canvas shortcut.
   - ARIA roles/labels, state announcements, high-contrast options.
   - Locale-aware numbers and shortcuts.
 - **Acceptance:** Meets WCAG AA; automated axe audits show zero critical issues.

10. **Delivery and size**
    - Code-split editor vs runtime; lazy-load heavy dependencies.
    - Tree-shake to keep initial bundle <300 KB gz.
    - Asset caching/prefetch for library nodes and examples.
    - **Acceptance:** TTI <2 s on 4G; warm reload <500 ms.

## Latest User Feedback (2025-10-28)
- Duplicate tool instances (e.g., “2D graph #1”) must surface their indices in the toolbar, not only in expression selectors.
- Circuit tool UX remains confusing: improve keyboard shortcuts (e.g., `W` for wire), deletion via Backspace, drag/drop from palette, and overall component manipulation.
- Comprehensive functionality list for circuit editor should drive corresponding unit tests—iterate until all pass.
- Complex plane tool needs clearer axis overlays and ensure real/imaginary plots fit within the viewport.
- Audit signal processing (FFT, Z-transform, Laplace) for real/complex list signals; extend tests.
- Expand interpreter/tokenizer/parser coverage to 100+ expressions with type/accuracy verification—do not drop tests to gain passing status.
- Circuit updates: allow disconnected components with grid-only snapping, add ground as regular component, warn on invalid circuits, permit deleting final node, add time-stepping + symbolic diff eq support, and profile performance.
- Address runtime ReferenceErrors such as `circuitNodes`/`connectedNodes`/`ShortcutLegend` and scan for similar regressions.
- Improve circuit panels: smoother pan/zoom akin to Graph tools, draggable nodes, visible analysis outputs, scrollable component palette, deletable ground, presets for quick testing.
- Continue executing the multi-phase circuit plan until complete; keep iterating and testing after each milestone.

## 2025-10-28 Progress
- Patched circuit runtime to avoid transient `ReferenceError` crashes by reordering memo definitions and normalizing preset strings.
- Added zoom controls (in/out, reset, fit) with status messaging plus improved wheel zoom anchoring across the canvas.
- Refreshed node list with connection counts, editable rows, and destructive delete affordances; ground nodes can now be removed directly.
- Component palette now scrolls within a bounded panel for long libraries; presets remain accessible via dropdown.
- Delete hotkey now removes multi-selection of components or nodes; viewport reset/fit actions surface in the workspace header.
