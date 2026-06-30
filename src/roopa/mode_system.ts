import { useUIState } from '../ui/useUIState';
import { UIStateStore } from '../ui/ui_state_store';

export interface RegularRoopaMode {
    type: 'REGULAR';
}

export interface MarkSelectionRoopaMode {
    type: 'MARK_SELECTION';
    selectedMarkId?: string;
}

export type RoopaMode = RegularRoopaMode | MarkSelectionRoopaMode;

export type RoopaElement =
    // Original permissions/actions
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
    | 'CONTENT_SELECTOR_CLICK_CARD'
    
    // Roopa Elements
    | 'BUTTON_SQUARE'
    | 'CENTER_SCREEN_PANEL'
    | 'DROP_ZONE'
    | 'DUAL_SPLIT_PANE'
    | 'FILE_PATH_VIEWER'
    | 'LIBRARY_EXPLORER'
    | 'LIBRARY_SEARCH'
    | 'SCREEN_TOOLBAR'
    | 'SETTINGS_PANE'
    | 'TRIGGER_ZONE'
    | 'VERTICAL_TOOL_BAR'
    | 'WORKSPACE_HEADER'
    
    // Roopa Primitives
    | 'BACKUP_SAVE_INDICATOR'
    | 'BUTTON_FLAT'
    | 'CARD'
    | 'DIVIDER'
    | 'DROPDOWN_SELECT'
    | 'FILE_PATH_INPUT'
    | 'MARQUEE_TEXT_BUTTON'
    | 'MULTI_STATE_TOGGLE'
    | 'PAGE_INDICATOR'
    | 'POPOVER'
    | 'RECENT_CARD'
    | 'SCOPE_SELECTOR'
    | 'SETTINGS_CARD'
    | 'SLIDER'
    | 'TEXT'
    | 'TEXT_INPUT';

/**
 * Single source of truth for which Roopa Elements are active in which Roopa Mode.
 */
export const RoopaElementPermissions: Record<RoopaElement, RoopaMode['type'][]> = {
    // Actions / Features
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
    'CONTENT_SELECTOR_CLICK_CARD': ['REGULAR'],

    // Structural Elements (enabled in both modes by default)
    'BUTTON_SQUARE': ['REGULAR', 'MARK_SELECTION'],
    'CENTER_SCREEN_PANEL': ['REGULAR', 'MARK_SELECTION'],
    'DROP_ZONE': ['REGULAR', 'MARK_SELECTION'],
    'DUAL_SPLIT_PANE': ['REGULAR', 'MARK_SELECTION'],
    'FILE_PATH_VIEWER': ['REGULAR', 'MARK_SELECTION'],
    'LIBRARY_EXPLORER': ['REGULAR', 'MARK_SELECTION'],
    'LIBRARY_SEARCH': ['REGULAR', 'MARK_SELECTION'],
    'SCREEN_TOOLBAR': ['REGULAR', 'MARK_SELECTION'],
    'SETTINGS_PANE': ['REGULAR', 'MARK_SELECTION'],
    'TRIGGER_ZONE': ['REGULAR', 'MARK_SELECTION'],
    'VERTICAL_TOOL_BAR': ['REGULAR', 'MARK_SELECTION'],
    'WORKSPACE_HEADER': ['REGULAR', 'MARK_SELECTION'],

    // Primitives (enabled in both modes by default)
    'BACKUP_SAVE_INDICATOR': ['REGULAR', 'MARK_SELECTION'],
    'BUTTON_FLAT': ['REGULAR', 'MARK_SELECTION'],
    'CARD': ['REGULAR', 'MARK_SELECTION'],
    'DIVIDER': ['REGULAR', 'MARK_SELECTION'],
    'DROPDOWN_SELECT': ['REGULAR', 'MARK_SELECTION'],
    'FILE_PATH_INPUT': ['REGULAR', 'MARK_SELECTION'],
    'MARQUEE_TEXT_BUTTON': ['REGULAR', 'MARK_SELECTION'],
    'MULTI_STATE_TOGGLE': ['REGULAR', 'MARK_SELECTION'],
    'PAGE_INDICATOR': ['REGULAR', 'MARK_SELECTION'],
    'POPOVER': ['REGULAR', 'MARK_SELECTION'],
    'RECENT_CARD': ['REGULAR', 'MARK_SELECTION'],
    'SCOPE_SELECTOR': ['REGULAR', 'MARK_SELECTION'],
    'SETTINGS_CARD': ['REGULAR', 'MARK_SELECTION'],
    'SLIDER': ['REGULAR', 'MARK_SELECTION'],
    'TEXT': ['REGULAR', 'MARK_SELECTION'],
    'TEXT_INPUT': ['REGULAR', 'MARK_SELECTION']
};

/**
 * Helper to determine if a Roopa element is active given the current mode.
 */
export function isRoopaElementActive(element: RoopaElement, mode: RoopaMode): boolean {
    return RoopaElementPermissions[element].includes(mode.type);
}

/**
 * React Hook for components to query if a Roopa element should be active.
 */
export function useRoopaElement(uiStore: UIStateStore, element: RoopaElement): boolean {
    const uiState = useUIState(uiStore);
    const mode = (uiState.uiMode as any) || { type: 'REGULAR' };
    return isRoopaElementActive(element, mode);
}
