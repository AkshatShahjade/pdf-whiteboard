import { UIStateStore, ToastState } from './ui_state_store';

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
    setEditingShape: (editingShapeId: string | null, shapeBackup?: any) => void;
    setEditingSection: (editingSectionId: string | null, sectionTarget?: 'start' | 'end') => void;
    setSectionTarget: (sectionTarget: 'start' | 'end') => void;
    showToast: (msg: string, type?: ToastState['type']) => void;
    clearToast: () => void;
}

/**
 * Factory function to create a new UIController instance operating on a UIStateStore.
 */
export function createUIController(store: UIStateStore): UIController {
    return {
        setZoom: (zoom) => {
            store.setState({ zoom });
        },
        setLeftPct: (leftPct) => {
            store.setState({ leftPct });
        },
        setCurrentPage: (currentPage) => {
            store.setState({
                currentPage,
                pageInput: String(currentPage),
            });
        },
        setPageInput: (pageInput) => {
            store.setState({ pageInput });
        },
        setTool: (tool) => {
            store.setState({ tool });
        },
        setSelectedMarkId: (selectedMarkId) => {
            store.setState({ selectedMarkId });
        },
        setActivePane: (activePane) => {
            store.setState({ activePane });
        },
        setEditingShape: (editingShapeId, shapeBackup = null) => {
            store.setState({
                editingShapeId,
                shapeBackup,
            });
        },
        setEditingSection: (editingSectionId, sectionTarget = 'start') => {
            store.setState({
                editingSectionId,
                sectionTarget,
            });
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
    };
}
