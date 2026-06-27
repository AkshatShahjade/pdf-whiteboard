export type KramTrigger = 'onCloseSlot' | 'onMarkActivate' | 'onContentChange' | 'onToolSelected';

export interface SlotHistoryEntry {
    contentId: string;
    contentType: string;
    slotType: string;
    zoom?: number;
    tool?: string;
    scrollTop?: number;
    selectedMarkId?: string | null;
}

export interface KramEvent {
    trigger: KramTrigger;
    slotId: string;
    args: any[];
}

export type KramAction =
    | { type: 'openContentInSlot'; payload: { slotId: string; contentType: string; contentId: string; suppressHistory?: boolean } }
    | { type: 'clearSelection'; payload: { slotId: string } }
    | { type: 'clearContent'; payload: { slotId: string } }
    | { type: 'showHomescreen' }
    | { type: 'setTool'; payload: { slotId: string; tool: string } }
    | { type: 'truncateHistory'; payload: { slotId: string; toIndex: number } };
