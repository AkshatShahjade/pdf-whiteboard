import { UIStateStore, ToastState } from './ui_state_store';
import { inputAPI, outputAPI } from '../atma/singletons';

/**
 * UIController - Interface encapsulating all low-frequency UI state mutations.
 */
export interface UIController {
    setZoom: (zoom: number) => void;
    setLeftPct: (pct: number) => void;
    setCurrentPage: (currentPage: number) => void;
    setPageInput: (pageInput: string) => void;
    setTool: (tool: string) => void;
    setSelectedMarkId: (selectedMarkId: string | null) => void;
    setActivePane: (activePane: 'pdf' | 'whiteboard') => void;
    setEditingShapeId: (editingShapeId: string | null) => void;
    setShapeBackup: (shapeBackup: any) => void;
    setEditingSectionId: (editingSectionId: string | null) => void;
    setSectionTarget: (sectionTarget: 'start' | 'end') => void;
    showToast: (msg: string, type?: ToastState['type']) => void;
    clearToast: () => void;
    connect: () => () => void;
}

/**
 * Factory function to create a new UIController instance operating on a UIStateStore.
 */
export function createUIController(store: UIStateStore): UIController {
    return {
        // ─── UI Actions (Write/Command Path Delegates) ────────────────────────────
        setZoom: (zoom) => {
            inputAPI.updateZoom(zoom);
        },
        setLeftPct: (leftPct) => {
            inputAPI.updateSplitter(leftPct);
        },
        setCurrentPage: (currentPage) => {
            if (store.getState().currentPage === currentPage) return;
            store.setState({
                currentPage,
                pageInput: String(currentPage),
            });
        },
        setPageInput: (pageInput) => {
            if (store.getState().pageInput === pageInput) return;
            store.setState({ pageInput });
        },
        setTool: (tool) => {
            inputAPI.updateTool(tool);
        },
        setSelectedMarkId: (selectedMarkId) => {
            inputAPI.selectMark(selectedMarkId);
        },
        setActivePane: (activePane) => {
            store.setState({ activePane });
        },
        setEditingShapeId: (editingShapeId) => {
            store.setState({ editingShapeId });
        },
        setShapeBackup: (shapeBackup) => {
            store.setState({ shapeBackup });
        },
        setEditingSectionId: (editingSectionId) => {
            store.setState({ editingSectionId });
        },
        setSectionTarget: (sectionTarget) => {
            store.setState({ sectionTarget });
        },
        showToast: (msg, type = 'info') => {
            store.setState({
                toast: { msg, type },
            });
        },
        clearToast: () => {
            store.setState({ toast: null });
        },

        // ─── OutputAPI Event Subscriptions (Read/Event Path) ──────────────────────
        connect: () => {
            const subs = [
                outputAPI.subscribe('SESSION_LOADED', (session) => {
                    store.setState({
                        marks: session.marks,
                        pdfPath: session.pdfPath,
                        leftPct: session.leftPct,
                        zoom: session.zoom,
                        tool: session.tool,
                        selectedMarkId: session.selectedMarkId,
                        scrollTop: session.scrollTop
                    });
                }),
                outputAPI.subscribe('APPSTATE_MUTATED', (patch) => {
                    store.setState(patch as Partial<UIState>);
                }),
                outputAPI.subscribe('MARK_ADDED', (mark) => {
                    const { marks } = store.getState();
                    store.setState({ marks: [...marks, mark] });
                }),
                outputAPI.subscribe('MARK_UPDATED', (mark) => {
                    const { marks } = store.getState();
                    store.setState({
                        marks: marks.map(m => m.id === mark.id ? mark : m)
                    });
                }),
                outputAPI.subscribe('MARK_DELETED', (payload) => {
                    const { marks, selectedMarkId } = store.getState();
                    store.setState({
                        marks: marks.filter(m => m.id !== payload.markId),
                        ...(selectedMarkId === payload.markId ? { selectedMarkId: null } : {})
                    });
                })
            ];

            return () => {
                subs.forEach(sub => sub.unsubscribe());
            };
        }
    };
}
