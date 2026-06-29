# Guide: Adding a New Mark Type to PDF Board

When adding a new mark type to the PDF board architecture, the following ordered checklist ensures complete type-safety, database persistence, and proper rendering. Following this exact order prevents missing dependencies and foreign key constraint errors.

### 1. Data Models (`src/shared_doman_models_and_dtos/`)
- [ ] **Update `mark_domain_model.ts`**: Define the new domain interface (e.g., `PinMark`) and add it to the exported `Mark` union type.
- [ ] **Update `dtos.ts`**: Define the corresponding DTO interface (e.g., `PinMarkDTO`) and add it to the exported `MarkDTO` union type so the compiler enforces type safety across the API boundary.

### 2. Domain & Capabilities Layer (`src/atma/registry_implementations/` & `src/atma/capabilities_registry/`)
- [ ] **Create `<name>_domain_mark.ts`**: Implement the `MarkDomainType` interface, providing `hasSelectedBorder`, `validate`, and `parseRaw` (for deserialization from the database).
- [ ] **Update `setup.ts`**: Register the new domain mark implementation inside the `setupMarkDomainRegistry` function.

### 3. Persistence Layer (`src/atma/storage/storage_implementations/schema.ts`)
- [ ] **Update `SEED_SQL`**: Add an `INSERT OR IGNORE INTO JODO_MARK_TYPES...` statement to seed the new mark type. **Critical:** Failing to do this will cause silent foreign key constraint failures when attempting to save the mark to SQLite.

### 4. Renderer & Tool Implementation (`src/ui/registry_implementations/pdf/`)
- [ ] **Create `<name>_mark.tsx`**: Build a React component implementing `PDFMarkRendererType` to dictate how the mark visually renders on the PDF canvas.
- [ ] **Create `<name>_tool.ts`**: Build a logic object implementing `PDFToolRendererType` to handle user interactions (pointer down, move, up) and execute state updates via `setMarksWithSectionWidths`.
- [ ] **Update `tool_cursors.ts`**: Add an SVG cursor representation for the new tool.

### 5. UI Registry & Presentation (`src/ui/renderer_registry/` & `src/ui/registry_implementations/`)
- [ ] **Update `setup.ts`**: Import and register both the mark renderer and tool renderer.
- [ ] **Update `pdf_content_renderer.tsx`**: Add the new tool to the visual toolbox overlay (e.g., `Toolbox` component) so the user can select it.
