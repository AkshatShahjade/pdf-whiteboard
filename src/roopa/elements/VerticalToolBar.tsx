import React from 'react';
import { confirmDialog } from '../../atma/platform_adapter/switch';
import { toRoman } from '../../ui/helper';
import { ButtonFlat } from '../primitives/ButtonFlat';
import { ButtonSquare } from './ButtonSquare';
import { TextInput } from '../primitives/TextInput';

interface VerticalToolBarProps {
  settings: any;
  slotState: any;
  toolRenderers: any[];
  shortcutState: any;
  shortcutManager: any;
  sectionSelection: any;
  setCurrentSelection: (selection: any) => void;
  setMarksWithSectionWidths: (updater: any) => void;
  handleCreateFromPanel: () => void;
  actions: {
    setTool: (tool: string) => void;
    setSectionTarget: (target: any) => void;
    setEditingSectionId: (id: any) => void;
    setSelectedMarkId: (markId: any) => void;
    setShapeBackup: (backup: any) => void;
    setEditingShapeId: (shapeId: any) => void;
    setZoom: (zoom: number) => void;
  };
}

// --- Capability Hook ---
export function useVerticalToolBar({
  slotState,
  shortcutManager,
  setCurrentSelection,
  setMarksWithSectionWidths,
  actions,
}: Pick<VerticalToolBarProps, 'slotState' | 'shortcutManager' | 'setCurrentSelection' | 'setMarksWithSectionWidths' | 'actions'>) {
  const activeTool = slotState?.tool;
  const zoom = slotState?.zoom || 1.0;

  const activateTool = (tool: any) => {
    const id = tool.id.id;
    shortcutManager?.clearUi();
    const nextTool = tool.activationMode === 'toggle' && activeTool === id ? 'select' : id;
    actions.setTool(nextTool);
  };

  const deleteShortcutTool = async (idx: number) => {
    const yes = await confirmDialog('Delete this shortcut tool?', 'Delete Tool');
    if (!yes) return;
    shortcutManager.deleteSlot(idx);
  };

  const cancelShortcutSelection = () => {
    shortcutManager.setSelectPanelIdx(null);
    shortcutManager.setNewWhiteboardName('');
  };

  const zoomIn = () => actions.setZoom(Math.min(zoom + 0.25, 3.0));
  const zoomOut = () => actions.setZoom(Math.max(zoom - 0.25, 0.5));

  const toolbarExtrasActions = {
    setTool: actions.setTool,
    setSectionTarget: actions.setSectionTarget,
    setEditingSectionId: actions.setEditingSectionId,
    setCurrentSelection,
    setMarksWithSectionWidths,
    setSelectedMarkId: actions.setSelectedMarkId,
    setSelectedShortcutIdx: (idx: any) => shortcutManager?.setSelectedIdx(idx),
    setShapeBackup: actions.setShapeBackup,
    setEditingShapeId: actions.setEditingShapeId,
    setSelectPanelIdx: (idx: any) => shortcutManager?.setSelectPanelIdx(idx),
  };

  return {
    activeTool,
    zoom,
    activateTool,
    deleteShortcutTool,
    cancelShortcutSelection,
    zoomIn,
    zoomOut,
    toolbarExtrasActions,
  };
}

export function VerticalToolBar({
  settings,
  slotState,
  toolRenderers,
  shortcutState,
  shortcutManager,
  sectionSelection,
  setCurrentSelection,
  setMarksWithSectionWidths,
  handleCreateFromPanel,
  actions,
}: VerticalToolBarProps) {
  const {
    activeTool,
    zoom,
    activateTool,
    deleteShortcutTool,
    cancelShortcutSelection,
    zoomIn,
    zoomOut,
    toolbarExtrasActions,
  } = useVerticalToolBar({
    slotState,
    shortcutManager,
    setCurrentSelection,
    setMarksWithSectionWidths,
    actions,
  });

  return (
    <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
      <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        {toolRenderers.map((tool) => {
          const id = tool.id.id;
          const label = tool.label || id;
          const key = tool.hotkey ? tool.hotkey.toUpperCase() : '';
          const icon = tool.icon || '?';
          return (
            <div key={id} style={{ position: 'relative' }}>
              <ButtonSquare
                icon={icon}
                tooltip={key ? `${label} [${key}]` : label}
                isActive={activeTool === id}
                onClick={() => activateTool(tool)}
              />
              {tool.renderToolbarExtras?.({
                toolId: id,
                tool: activeTool,
                sectionTarget: slotState?.sectionTarget,
                sectionSelection,
                editingShapeId: slotState?.editingShapeId,
                editingSectionId: slotState?.editingSectionId,
                shapeBackup: slotState?.shapeBackup,
                actions: toolbarExtrasActions,
              })}
            </div>
          );
        })}
      </div>

      {shortcutState && shortcutManager && (
        <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {Array.from({ length: shortcutState.slotCount }, (_, idx) => {
            const linkedId = shortcutState.slotLinks[idx];
            const isActive = shortcutState.selectedIdx === idx;
            const showControls = shortcutState.activeControlsIdx === idx && !!linkedId;
            const showSelectPanel = shortcutState.selectPanelIdx === idx;
            return (
              <div key={`gtool-${idx}`} style={{ position: 'relative' }}>
                <ButtonSquare
                  icon={toRoman(idx + 1)}
                  tooltip={`Shortcut Tool ${idx + 1}`}
                  isActive={isActive}
                  onClick={() => shortcutManager.openSlot(idx, slotState?.selectedMarkId)}
                />
                {showControls && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <ButtonFlat label="Update" onClick={() => shortcutManager.showUpdatePanel(idx)} active />
                    <ButtonFlat label="Close" onClick={() => shortcutManager.closeSlot()} />
                    {shortcutState.slotCount > 1 && (
                      <ButtonFlat label="Delete Tool" onClick={() => deleteShortcutTool(idx)} />
                    )}
                  </div>
                )}

                {showSelectPanel && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', zIndex: 80, width: '320px', background: 'rgba(28,31,38,0.96)', border: '1px solid #374151', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session Tool {toRoman(idx + 1)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ButtonFlat label="Create" onClick={handleCreateFromPanel} active />
                        <ButtonFlat label="Cancel" onClick={cancelShortcutSelection} />
                        {shortcutState.slotCount > 1 && (
                          <ButtonFlat label="Delete" onClick={() => deleteShortcutTool(idx)} />
                        )}
                      </div>
                    </div>
                    <div style={{ maxHeight: '182px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {shortcutState.availableWhiteboards.map((wb: any) => (
                        <ButtonFlat
                          key={wb.id}
                          label={wb.name}
                          active={shortcutState.draftId === wb.id}
                          onClick={() => shortcutManager.applySelection(idx, wb.id, wb.name, slotState?.selectedMarkId)}
                        />
                      ))}
                      {shortcutState.availableWhiteboards.length === 0 && <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>No whiteboards yet.</span>}
                    </div>
                    <TextInput
                      value={shortcutState.newWhiteboardName}
                      onChange={shortcutManager.setNewWhiteboardName}
                      placeholder="New whiteboard name..."
                    />
                  </div>
                )}
              </div>
            );
          })}
          {shortcutState.slotCount < (settings?.maxGlobalPdfTools ?? 8) && (
            <ButtonSquare icon="+" tooltip="Add shortcut tool" onClick={() => shortcutManager.addSlot()} />
          )}
        </div>
      )}

      <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <ButtonSquare icon="+" tooltip="Zoom In" onClick={zoomIn} />
        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', margin: '2px 0' }}>{Math.round(zoom * 100)}%</span>
        <ButtonSquare icon="-" tooltip="Zoom Out" onClick={zoomOut} />
      </div>
    </div>
  );
}
