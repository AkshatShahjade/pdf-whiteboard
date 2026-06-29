# Enforce Type Safety for Marks Architecture

The codebase currently connects the frontend Domain models to the backend DTOs using type-safety loopholes (e.g., `any`, `as MarkDTO`). While the runtime data structures perfectly match, TypeScript is bypassed, which led to the recent missing `PinMarkDTO` going unnoticed. This plan systematically removes these loopholes to enforce strict end-to-end type safety.

## Proposed Changes

### UI & Domain Layer
We will replace `any` with the explicit `Mark` domain model in the tool renderer context and all spatial tools.

#### [MODIFY] [tool_renderer_registry.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/renderer_registry/pdf/vertical_pane/tool_renderer_registry.ts)
- Import `Mark` and `React`.
- Update `setMarksWithSectionWidths: (next: any) => void` to `setMarksWithSectionWidths: React.Dispatch<React.SetStateAction<Mark[]>>` across all context interfaces.

#### [MODIFY] [pdf_content_renderer.tsx](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/registry_implementations/pdf/pdf_content_renderer.tsx)
- Type the `setMarksWithSectionWidths` hook parameter as `updater: React.SetStateAction<Mark[]>`.
- Replace `(prev: any)` with `(prev: Mark[])` in all internal state setter calls.

#### [MODIFY] [lasso_mark_tool.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/registry_implementations/pdf/vertical_pane/tools/marking/spatial/lasso_mark_tool.ts)
#### [MODIFY] [pin_mark_tool.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/registry_implementations/pdf/vertical_pane/tools/marking/spatial/pin_mark_tool.ts)
#### [MODIFY] [rectangle_mark_tool.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/registry_implementations/pdf/vertical_pane/tools/marking/spatial/rectangle_mark_tool.ts)
#### [MODIFY] [spatial_section_mark_tool.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/registry_implementations/pdf/vertical_pane/tools/marking/spatial/spatial_section_mark_tool.ts)
#### [MODIFY] [tool_toolbar_extras.tsx](file:///home/akshat/Desktop/recursenotes/pdf-board/src/ui/registry_implementations/pdf/tool_toolbar_extras.tsx)
- Replace `(prev: any[])` or `(prev: any)` with `(prev: Mark[])` inside the `setMarksWithSectionWidths` callbacks.

---

### API & Service Layer
The API layer currently accepts a loosely typed mark that might lack an ID. Since our UI tools already generate the ID natively, we can strictly enforce `MarkDTO`.

#### [MODIFY] [input_api.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/atma/api/input_api.ts)
- Change `addMark(slotId: string, mark: Omit<MarkDTO, 'id'> & { id?: string })` to strictly `addMark(slotId: string, mark: MarkDTO)`.

#### [MODIFY] [mark_service.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/atma/services/mark_service.ts)
- Change the `addMark` signature to strictly accept `MarkDTO`.
- Remove the intermediate `newMark` object generation and the `as MarkDTO` cast, since `mark` is already guaranteed to be a valid `MarkDTO` by the caller.

---

### Storage Layer
The SQLite repository relies on an `any` cast to extract the mark type. Since `PinMarkDTO` is now correctly included in the `MarkDTO` union, we can rely natively on TypeScript's discriminated union support.

#### [MODIFY] [MarkRepository.ts](file:///home/akshat/Desktop/recursenotes/pdf-board/src/atma/storage/repositories/MarkRepository.ts)
- Replace `const markType = (mark as any).type;` with `const markType = mark.type;`.

## Verification Plan
### Automated Tests
- Run `npm run build` after completing the refactor.
- Ensuring the TypeScript compiler passes without errors verifies that the boundaries perfectly map `Mark` to `MarkDTO` without any loose typing.
