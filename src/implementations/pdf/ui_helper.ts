import { getToolType } from "../../capabilty_registry/pdf/tool_registry";

export function applyToolUiReset(tool, {
  setCurrentSelection,
  setSectionTarget,
  setEditingSectionId,
  setEditingShapeId,
  setShapeBackup,
}) {
  const toolType = getToolType(tool);

  // Only section mode needs a persistent placeholder selection.
  // Rect / lasso should start from a clean slate so the first click
  // becomes the actual drag origin instead of a stale "empty" shape.
  if (tool === 'section' && toolType.createsSelections) {
    setCurrentSelection(prev =>
      prev?.type === tool ? prev : toolType.createNullSelection()
    );
  } else {
    setCurrentSelection(null);
  }

  if (tool !== 'section') {
    setSectionTarget('start');
    setEditingSectionId(null);
  }

  if (!toolType.isDrawable) {
    setEditingShapeId(null);
    setShapeBackup(null);
  }
}
