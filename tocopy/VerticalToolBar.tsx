import React from 'react';
import { confirmDialog } from '../../atma/platform_adapter/switch';
import { toRoman } from '../../ui/helper';

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
    openContent?: (slotId: string, contentId: string, contentType: string) => void;
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
    if (tool.activationMode === 'stateless' && tool.onActivate) {
      tool.onActivate({
          state: { slotId: slotState?.contentId ? 'left' : 'right' }, // mock state if needed
          actions: {
             openContent: actions.openContent,
             setTool: actions.setTool
          }
      });
      return;
    }
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
              <button
                onClick={() => activateTool(tool)}
                title={key ? `${label} [${key}]` : label}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${activeTool === id ? '#3B82F6' : 'transparent'}`, background: activeTool === id ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTool === id ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '18px', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (activeTool !== id) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; } }}
                onMouseLeave={e => { if (activeTool !== id) { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent'; } }}
              >
                {icon}
              </button>
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
                <button
                  onClick={() => shortcutManager.openSlot(idx, slotState?.selectedMarkId)}
                  title={`Shortcut Tool ${idx + 1}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${isActive ? '#3B82F6' : 'transparent'}`, background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent', color: isActive ? '#93C5FD' : '#d1d5db', cursor: 'pointer', fontSize: '16px' }}
                >
                  {toRoman(idx + 1)}
                </button>
                {showControls && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <button onClick={() => shortcutManager.showUpdatePanel(idx)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer' }}>Update</button>
                    <button onClick={() => shortcutManager.closeSlot()} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}>Close</button>
                    {shortcutState.slotCount > 1 && (
                      <button onClick={() => deleteShortcutTool(idx)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete Tool</button>
                    )}
                  </div>
                )}

                {showSelectPanel && (
                  <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', zIndex: 80, width: '320px', background: 'rgba(28,31,38,0.96)', border: '1px solid #374151', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session Tool {toRoman(idx + 1)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={handleCreateFromPanel} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.2)', color: '#93C5FD', cursor: 'pointer', fontSize: '11px' }}>Create</button>
                        <button onClick={cancelShortcutSelection} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                        {shortcutState.slotCount > 1 && (
                          <button
                            onClick={() => deleteShortcutTool(idx)}
                            style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #F87171', background: 'transparent', color: '#F87171', cursor: 'pointer', fontSize: '11px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ maxHeight: '182px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {shortcutState.availableWhiteboards.map((wb: any) => (
                        <button
                          key={wb.id}
                          onClick={() => shortcutManager.applySelection(idx, wb.id, wb.name, slotState?.selectedMarkId)}
                          style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${shortcutState.draftId === wb.id ? '#3B82F6' : '#374151'}`, background: shortcutState.draftId === wb.id ? 'rgba(59,130,246,0.18)' : '#262a33', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px', minHeight: '30px' }}
                        >
                          {wb.name}
                        </button>
                      ))}
                      {shortcutState.availableWhiteboards.length === 0 && <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>No whiteboards yet.</span>}
                    </div>
                    <input value={shortcutState.newWhiteboardName} onChange={(e) => shortcutManager.setNewWhiteboardName(e.target.value)} placeholder="New whiteboard name..." style={{ width: '100%', background: '#1c1f26', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', outline: 'none' }} />
                  </div>
                )}
              </div>
            );
          })}
          {shortcutState.slotCount < (settings?.maxGlobalPdfTools ?? 8) && (
            <button onClick={() => shortcutManager.addSlot()} title="Add shortcut tool" style={{ width: '36px', height: '32px', borderRadius: '6px', border: '1px dashed #4b5563', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: '16px' }}>+</button>
          )}
        </div>
      )}

      <div style={{ background: 'rgba(38,42,51,0.65)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <button onClick={zoomIn} title="Zoom In" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>+</button>
        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', margin: '2px 0' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={zoomOut} title="Zoom Out" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '18px', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</button>
      </div>
    </div>
  );
}
