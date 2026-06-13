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
    setEditingShapeId: (editingShapeId: string | null) => void;
    setShapeBackup: (shapeBackup: any) => void;
    setEditingSectionId: (editingSectionId: string | null) => void;
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
    };
}
