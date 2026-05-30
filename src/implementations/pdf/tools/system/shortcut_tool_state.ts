/**
 * ShortcutToolState — Pure business logic for the Shortcut Tool
 * (formerly "Global Whiteboard Tool").
 *
 * Atma-layer: framework-agnostic, no React/DOM imports.
 * Manages the state of shortcut slots that link to whiteboards.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ViewStackEntry {
    type: 'global' | 'region'
    idx?: number
    id?: string
}

export interface WhiteboardInfo {
    id: string
    name: string
    path: string
}

export interface ShortcutToolSnapshot {
    selectedIdx: number | null
    slotCount: number
    slotLinks: (string | null)[]
    selectPanelIdx: number | null
    activeControlsIdx: number | null
    draftId: string | null
    draftName: string
    newWhiteboardName: string
    viewStack: ViewStackEntry[]
    availableWhiteboards: WhiteboardInfo[]
}

export interface ShortcutToolSessionData {
    selectedShortcutIdx: number | null
    shortcutSlotCount: number
    shortcutSlotLinks: (string | null)[]
}

export interface ShortcutToolExternalActions {
    setTool: (tool: string) => void
    setSelectedMarkId: (id: string | null) => void
}

export interface ShortcutToolConfig {
    maxSlots: number
    initialSelectedIdx?: number | null
    initialSlotCount?: number
    initialSlotLinks?: (string | null)[]
    onChange: () => void
    externalActions: ShortcutToolExternalActions
}

// ─── Manager ───────────────────────────────────────────────────────────────────

export class ShortcutToolManager {
    private _state: ShortcutToolSnapshot
    private _maxSlots: number
    private _onChange: () => void
    private _ext: ShortcutToolExternalActions

    constructor(config: ShortcutToolConfig) {
        this._maxSlots = Math.max(1, config.maxSlots)
        this._onChange = config.onChange
        this._ext = config.externalActions

        const slotCount = Math.max(1, Math.min(config.initialSlotCount ?? 1, this._maxSlots))
        const restoredLinks = Array.isArray(config.initialSlotLinks) ? config.initialSlotLinks : []

        this._state = {
            slotLinks: Array.from({ length: slotCount }, (_, i) => restoredLinks[i] ?? null),
            selectedIdx: config.initialSelectedIdx ?? null,
            slotCount,
            availableWhiteboards: [],
            
            selectPanelIdx: null,
            activeControlsIdx: null,
            draftId: null,
            draftName: '',
            viewStack: [],
            newWhiteboardName: '',
        }
    }

    get state(): Readonly<ShortcutToolSnapshot> {
        return this._state
    }

    private emit(): void {
        this._onChange()
    }

    // ─── UI State Setters ──────────────────────────────────────────────────────

    clearUi(): void {
        this._state.selectedIdx = null
        this._state.activeControlsIdx = null
        this._state.selectPanelIdx = null
        this._state.viewStack = []
        this.emit()
    }

    setSelectedIdx(idx: number | null): void {
        this._state.selectedIdx = idx
        if (idx === null) {
            this._state.activeControlsIdx = null
        }
        this.emit()
    }

    setActiveControlsIdx(idx: number | null): void {
        this._state.activeControlsIdx = idx
        this.emit()
    }

    setSelectPanelIdx(idx: number | null): void {
        this._state.selectPanelIdx = idx
        this.emit()
    }

    setNewWhiteboardName(name: string): void {
        this._state.newWhiteboardName = name
        this.emit()
    }

    setDraftId(id: string | null): void {
        this._state.draftId = id
        this.emit()
    }

    setDraftName(name: string): void {
        this._state.draftName = name
        this.emit()
    }

    setAvailableWhiteboards(whiteboards: WhiteboardInfo[]): void {
        this._state.availableWhiteboards = whiteboards
        this.emit()
    }

    // ─── Slot Management ───────────────────────────────────────────────────────

    addSlot(): void {
        if (this._state.slotCount >= this._maxSlots) return
        this._state.slotCount += 1
        this._state.slotLinks = [...this._state.slotLinks, null]
        this.emit()
    }

    setMaxSlots(max: number): void {
        this._maxSlots = Math.max(1, max)
        if (this._state.slotCount > this._maxSlots) {
            this._state.slotCount = this._maxSlots
            this._state.slotLinks = this._state.slotLinks.slice(0, this._maxSlots)
        }
        this.emit()
    }

    deleteSlot(idx: number): void {
        if (this._state.slotCount <= 1) return
        this._state.slotLinks = this._state.slotLinks.filter((_, i) => i !== idx)
        this._state.slotCount = Math.max(1, this._state.slotCount - 1)
        this._state.activeControlsIdx = null
        this._state.selectPanelIdx = null
        this._state.viewStack = []
        if (this._state.selectedIdx === idx) {
            this._state.selectedIdx = null
        } else if (this._state.selectedIdx !== null && this._state.selectedIdx > idx) {
            this._state.selectedIdx -= 1
        }
        this.emit()
    }

    // ─── View Stack ────────────────────────────────────────────────────────────

    private pushCurrentViewToStack(nextView: ViewStackEntry, selectedRegionId: string | null): void {
        const currentView: ViewStackEntry | null = this._state.selectedIdx !== null
            ? { type: 'global', idx: this._state.selectedIdx }
            : (selectedRegionId ? { type: 'region', id: selectedRegionId } : null)

        if (!currentView) return

        const isSame = currentView.type === nextView.type &&
            (currentView.type === 'global' ? currentView.idx === nextView.idx : currentView.id === nextView.id)

        if (!isSame) {
            const filtered = this._state.viewStack.filter((v) =>
                !(v.type === currentView.type &&
                    (v.type === 'global' ? v.idx === currentView.idx : v.id === currentView.id))
            )
            this._state.viewStack = [...filtered, currentView]
        }
    }

    // ─── Primary Actions ───────────────────────────────────────────────────────

    openSlot(idx: number, selectedRegionId: string | null): void {
        this._ext.setTool('select')
        const linked = this._state.slotLinks[idx]

        if (!linked) {
            this._state.selectPanelIdx = idx
            this._state.activeControlsIdx = null
            this._state.newWhiteboardName = ''
            this._state.draftId = null
            this._state.draftName = ''
            this.emit()
            return
        }

        this.pushCurrentViewToStack({ type: 'global', idx }, selectedRegionId)
        this._state.selectPanelIdx = null
        this._ext.setSelectedMarkId(null)
        this._state.selectedIdx = idx
        this._state.activeControlsIdx = idx
        const found = this._state.availableWhiteboards.find((wb) => wb.id === linked)
        this._state.draftId = linked
        this._state.draftName = found?.name || 'Whiteboard'
        this.emit()
    }

    applySelection(idx: number, wbId: string, wbName: string | null, selectedRegionId: string | null): void {
        if (!wbId) return
        this._state.slotLinks = this._state.slotLinks.map((id, i) => (i === idx ? wbId : id))
        this.pushCurrentViewToStack({ type: 'global', idx }, selectedRegionId)
        this._ext.setSelectedMarkId(null)
        this._state.selectedIdx = idx
        this._state.activeControlsIdx = idx
        this._state.selectPanelIdx = null
        this._state.draftId = wbId
        if (wbName) this._state.draftName = wbName
        this.emit()
    }

    showUpdatePanel(idx: number): void {
        this._state.selectPanelIdx = idx
        this._state.activeControlsIdx = null
        const linkedId = this._state.slotLinks[idx]
        const found = this._state.availableWhiteboards.find((wb) => wb.id === linkedId)
        this._state.draftId = linkedId ?? null
        this._state.draftName = found?.name || 'Whiteboard'
        this.emit()
    }

    closeSlot(): void {
        this._state.selectedIdx = null
        this._ext.setSelectedMarkId(null)
        this._state.activeControlsIdx = null
        this._state.selectPanelIdx = null
        this._state.viewStack = []
        this.emit()
    }

    // ─── Keyboard Handlers ─────────────────────────────────────────────────────

    /**
     * Handle Escape key press. Returns true if the shortcut tool consumed the event.
     * If false, the caller should handle Escape for other UI (e.g. deselecting regions).
     */
    handleEscape(): boolean {
        if (this._state.selectPanelIdx !== null) {
            this._state.selectPanelIdx = null
            this.emit()
            return true
        }

        if (this._state.selectedIdx !== null) {
            const prevView = this._state.viewStack[this._state.viewStack.length - 1]
            if (prevView) {
                this._state.viewStack = this._state.viewStack.slice(0, -1)
                if (prevView.type === 'global') {
                    this._ext.setSelectedMarkId(null)
                    this._state.selectedIdx = prevView.idx!
                    this._state.activeControlsIdx = prevView.idx!
                } else if (prevView.type === 'region') {
                    this._state.selectedIdx = null
                    this._state.activeControlsIdx = null
                    this._ext.setSelectedMarkId(prevView.id!)
                }
            } else {
                this._state.selectedIdx = null
                this._state.activeControlsIdx = null
            }
            this.emit()
            return true
        }

        return false
    }

    // ─── Computed Properties ───────────────────────────────────────────────────

    getLinkedWhiteboardId(): string | null {
        if (this._state.selectedIdx === null) return null
        return this._state.slotLinks[this._state.selectedIdx] ?? null
    }

    // ─── Session Persistence ───────────────────────────────────────────────────

    getSessionData(): ShortcutToolSessionData {
        return {
            selectedShortcutIdx: this._state.selectedIdx,
            shortcutSlotCount: this._state.slotCount,
            shortcutSlotLinks: [...this._state.slotLinks],
        }
    }
}
