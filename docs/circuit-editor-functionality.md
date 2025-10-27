# Circuit Editor Functional Requirements

The interactive circuit workspace must support the following behaviors so users can confidently build, inspect, and maintain schematics without leaving the tool.

## Component Library & Staging
- Provide palette entries for wire, resistor, capacitor, inductor, voltage source, and current source with glyph previews.
- Allow staging a component by clicking a palette tile.
- Support keyboard shortcuts for staging: `w` wire, `r` resistor, `c` capacitor, `l` inductor, `v` voltage source, `i` current source.
- Preserve component-specific defaults (e.g. excitation waveform parameters) when staging switches kinds.

## Node Management
- Maintain a canonical list of nodes that always includes `gnd`.
- Allow adding a new node with an auto-generated unique identifier.
- Allow renaming nodes with identifier sanitization and conflict detection.
- Allow removing extra nodes only when they are not referenced by any component and are not ground.
- Track node positions with optional grid snappiupdng.
- Permit dragging nodes to reposition them, respecting the snap-to-grid option.

## Connection Staging
- Store staged `from` and `to` terminals for the component being placed.
- Let users pick terminals by clicking nodes or toggling dedicated "Pick start" / "Pick end" actions.
- Prevent placement when both terminals are the same or undefined.
- When picking a node while both terminals are defined, rotate the pair so the most recent pick becomes the end node.

## Component Placement & Selection
- Placing a staged component appends it to the netlist with a generated id and inherits staged terminals.
- Selecting a component highlights it in the netlist and canvas and focuses a representative node.
- Hovering a component previews the highlight without changing persistent selection.
- Deleting a component removes it from the circuit, updates selection, and clears hover state when necessary.

## Keyboard Interaction
- `Backspace` / `Delete` removes the currently selected component if one exists.
- `Escape` clears the staged pick mode and component selection.
- Holding `Shift` while dragging a node temporarily disables snapping.
- Pressing `Ctrl+Enter` (or `Cmd+Enter` on macOS) places the staged component when terminals are valid.

## Drag & Drop
- Dragging a palette item onto the canvas stages that component kind and prepares for placement.
- Dragging a component glyph from the netlist onto a different node retargets its `to` terminal.

## Simulation & Export Hooks
- Running a simulation uses the current netlist and configuration values.
- Export actions dispatch `circuit:add-expression` events with normalized expressions for numeric and symbolic data.

These requirements are encoded in unit tests to regress the interaction model as the UI evolves.
