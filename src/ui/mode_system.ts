import { useUIState } from './useUIState';
import { UIStateStore } from './ui_state_store';

export interface RegularMode {
    type: 'REGULAR';
}

export interface MarkSelectionMode {
    type: 'MARK_SELECTION';
    selectedMarkId?: string;
}

export type UIMode = RegularMode | MarkSelectionMode;

export type UIElement =
    | 'WORKSPACE_HOME_BUTTON'
    | 'WORKSPACE_BACKUP_BUTTON'
    | 'WORKSPACE_PANE_DIVIDER'
    | 'SCREENTOOLBAR_OPEN_CONTENT'
    | 'SCREENTOOLBAR_LINK_TOOL'
    | 'SCREENTOOLBAR_CLOSE_SLOT'
    | 'PDF_PAGE_SCROLL'
    | 'PDF_EXISTING_MARKS'
    | 'PDF_ANNOTATION_TOOLS'
    | 'WHITEBOARD_CANVAS_PAN_ZOOM'
    | 'WHITEBOARD_CREATE_SHAPE'
    | 'WHITEBOARD_EDIT_SHAPE'
    | 'WHITEBOARD_CLICK_SHAPE'
    | 'WHITEBOARD_ERASER'
    | 'CONTENT_SELECTOR_SEARCH'
    | 'CONTENT_SELECTOR_CLICK_CARD';

/**
 * Single source of truth for which UI elements are active in which mode.
 */
export const UIElementPermissions: Record<UIElement, UIMode['type'][]> = {
    'WORKSPACE_HOME_BUTTON': ['REGULAR'],
    'WORKSPACE_BACKUP_BUTTON': ['REGULAR'],
    'WORKSPACE_PANE_DIVIDER': ['REGULAR'],
    'SCREENTOOLBAR_OPEN_CONTENT': ['REGULAR'],
    'SCREENTOOLBAR_LINK_TOOL': ['REGULAR', 'MARK_SELECTION'],
    'SCREENTOOLBAR_CLOSE_SLOT': ['REGULAR'],
    'PDF_PAGE_SCROLL': ['REGULAR', 'MARK_SELECTION'],
    'PDF_EXISTING_MARKS': ['REGULAR', 'MARK_SELECTION'],
    'PDF_ANNOTATION_TOOLS': ['REGULAR'],
    'WHITEBOARD_CANVAS_PAN_ZOOM': ['REGULAR', 'MARK_SELECTION'],
    'WHITEBOARD_CREATE_SHAPE': ['REGULAR'],
    'WHITEBOARD_EDIT_SHAPE': ['REGULAR'],
    'WHITEBOARD_CLICK_SHAPE': ['REGULAR', 'MARK_SELECTION'],
    'WHITEBOARD_ERASER': ['REGULAR'],
    'CONTENT_SELECTOR_SEARCH': ['REGULAR'],
    'CONTENT_SELECTOR_CLICK_CARD': ['REGULAR']
};

/**
 * Helper to determine if an element is active given the current mode.
 */
export function isElementActive(element: UIElement, mode: UIMode): boolean {
    return UIElementPermissions[element].includes(mode.type);
}

/**
 * React Hook for components to query if an element should be active.
 */
export function useUIElement(uiStore: UIStateStore, element: UIElement): boolean {
    const uiState = useUIState(uiStore);
    const mode = uiState.uiMode || { type: 'REGULAR' };
    return isElementActive(element, mode);
}
