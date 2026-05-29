import { getToolType } from "../../capabilty_registry/pdf/tool_registry";

export function applyToolUiReset(tool, {
  setCurrentSelection,
  setSectionTarget,
  setEditingSectionId,
  setEditingShapeId,
  setShapeBackup,
}) {
  const toolType = getToolType(tool);

  if (!toolType.createsSelections) return;

  setCurrentSelection(prev =>
    prev?.type === tool ? prev : toolType.createNullSelection()
  );

  if (tool !== 'section') {
    setSectionTarget('start');
    setEditingSectionId(null);
  }

  if (!toolType.isDrawable) {
    setEditingShapeId(null);
    setShapeBackup(null);
  }
}