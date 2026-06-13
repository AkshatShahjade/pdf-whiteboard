import { DEFAULT_SECTION_WIDTH } from "../../domain_models/mark_model"
import type { ToolToolbarExtrasContext } from "../../domain_models/tool_models"

function buttonStyle(color: string, active: boolean) {
    return {
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        border: `1px solid ${color}`,
        background: active ? `${color}40` : 'transparent',
        color,
        transition: 'all 0.15s',
    } as const
}

function confirmButtonStyle(canConfirm: boolean) {
    return {
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: canConfirm ? 'pointer' : 'not-allowed',
        border: `1px solid ${canConfirm ? '#3B82F6' : '#4b5563'}`,
        background: canConfirm ? 'rgba(59,130,246,0.2)' : 'transparent',
        color: canConfirm ? '#93C5FD' : '#6b7280',
        transition: 'all 0.15s',
    } as const
}

export function renderSectionToolbarExtras(ctx: ToolToolbarExtrasContext) {
    if (ctx.tool !== 'section' || ctx.toolId !== 'section') return null

    const canConfirm = ctx.sectionSelection.start !== null && ctx.sectionSelection.end !== null

    return (
        <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.85)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignItems: 'center' }}>
            <button
                onClick={() => ctx.actions.setSectionTarget('start')}
                style={buttonStyle(ctx.sectionSelection.start !== null ? '#10B981' : '#F87171', ctx.sectionTarget === 'start')}
            >
                Start
            </button>
            <button
                onClick={() => ctx.actions.setSectionTarget('end')}
                style={buttonStyle(ctx.sectionSelection.end !== null ? '#10B981' : '#F87171', ctx.sectionTarget === 'end')}
            >
                End
            </button>
            <>
                <button
                    disabled={!canConfirm}
                    onClick={() => {
                        const y1 = Math.min(ctx.sectionSelection.start!, ctx.sectionSelection.end!);
                        const y2 = Math.max(ctx.sectionSelection.start!, ctx.sectionSelection.end!);

                        if (ctx.editingSectionId) {
                            ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                                r.id === ctx.editingSectionId ? { ...r, y: y1, h: y2 - y1 } : r
                            )));
                            ctx.actions.setSelectedMarkId(ctx.editingSectionId);
                            ctx.actions.setSelectedShortcutIdx(null);
                            ctx.actions.setEditingSectionId(null);
                        } else {
                            const newId = `reg_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
                            ctx.actions.setMarksWithSectionWidths((prev: any[]) => [
                                ...prev,
                                { id: newId, type: 'section', x: 0, y: y1, w: DEFAULT_SECTION_WIDTH, h: y2 - y1 },
                            ]);
                            ctx.actions.setSelectedMarkId(newId);
                            ctx.actions.setSelectedShortcutIdx(null);
                        }
                        ctx.actions.setTool('select');
                    }}
                    style={confirmButtonStyle(canConfirm)}
                >
                    {ctx.editingSectionId ? 'Update' : 'Confirm'}
                </button>

                <button
                    onClick={() => {
                        ctx.actions.setEditingSectionId(null);
                        ctx.actions.setCurrentSelection(null);
                        ctx.actions.setSectionTarget('start');
                        ctx.actions.setTool('select');
                    }}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: '1px solid #F87171',
                        background: 'transparent',
                        color: '#F87171',
                        transition: 'all 0.15s',
                    }}
                >
                    Cancel
                </button>
            </>
        </div>
    )
}

export function renderDrawableToolbarExtras(ctx: ToolToolbarExtrasContext) {
    if (ctx.tool !== ctx.toolId) return null
    if (ctx.toolId !== 'rect' && ctx.toolId !== 'lasso') return null
    if (!ctx.editingShapeId) return null

    return (
        <div style={{ position: 'absolute', right: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)', background: 'rgba(38,42,51,0.85)', backdropFilter: 'blur(10px)', borderRadius: '8px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', alignItems: 'center' }}>
            <button
                onClick={() => {
                    ctx.actions.setMarksWithSectionWidths((prev: any[]) => prev.map((r) => (
                        r.id === ctx.shapeBackup?.id ? ctx.shapeBackup : r
                    )));
                    ctx.actions.setEditingShapeId(null);
                    ctx.actions.setShapeBackup(null);
                    ctx.actions.setTool('select');
                }}
                style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: '1px solid #F87171',
                    background: 'transparent',
                    color: '#F87171',
                    transition: 'all 0.15s',
                }}
            >
                Cancel
            </button>
            <button
                onClick={() => {
                    ctx.actions.setEditingShapeId(null);
                    ctx.actions.setShapeBackup(null);
                    ctx.actions.setTool('select');
                }}
                style={buttonStyle('#3B82F6', true)}
            >
                Update
            </button>
        </div>
    )
}
