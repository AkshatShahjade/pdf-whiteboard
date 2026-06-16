/**
 * useShortcutToolState — React hook bridge for ShortcutToolManager.
 *
 * Roopa adapter: thin React wrapper that instantiates the Atma-layer
 * ShortcutToolManager and bridges it into React rendering.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
    ShortcutToolManager,
    ShortcutToolExternalActions,
    WhiteboardInfo,
} from '../registry_implementations/pdf/vertical_pane/tools/system/shortcut_tool_state.ts'
import { ContentRepository } from '../../atma/storage/repositories/ContentRepository.ts'

export interface UseShortcutToolStateOptions {
    settings: any
    restoredSession: any
    externalActions: ShortcutToolExternalActions
}

export function useShortcutToolState(options: UseShortcutToolStateOptions) {
    const { settings, restoredSession, externalActions } = options
    const [, setRenderKey] = useState(0)

    const managerRef = useRef<ShortcutToolManager | null>(null)
    if (!managerRef.current) {
        managerRef.current = new ShortcutToolManager({
            maxSlots: settings?.maxGlobalPdfTools ?? 8,
            initialSelectedIdx: restoredSession?.selectedShortcutIdx ?? restoredSession?.selectedGlobalToolIdx ?? null,
            initialSlotCount: restoredSession?.shortcutSlotCount ?? restoredSession?.globalToolCount ?? 1,
            initialSlotLinks: restoredSession?.shortcutSlotLinks ?? restoredSession?.globalToolLinks ?? [],
            onChange: () => setRenderKey((c) => c + 1),
            externalActions,
        })
    }

    const manager = managerRef.current

    // Clamp slot count when settings change
    useEffect(() => {
        manager.setMaxSlots(settings?.maxGlobalPdfTools ?? 8)
    }, [settings?.maxGlobalPdfTools])

    // Refresh available whiteboards from ContentRepository
    const refreshAvailableWhiteboards = useCallback(async () => {
        try {
            const results = await ContentRepository.getAllWhiteboards()
            // Map file_path to name for now, in future we can add a 'name' column or parse it.
            const deduped: WhiteboardInfo[] = results.map(row => ({
                id: row.id,
                name: row.file_path.split(/[\\/]/).pop() || row.id,
                path: row.file_path
            }))
            manager.setAvailableWhiteboards(deduped)
        } catch (err) {
            console.warn('Failed to load whiteboards:', err)
            manager.setAvailableWhiteboards([])
        }
    }, [])

    useEffect(() => {
        refreshAvailableWhiteboards()
    }, [refreshAvailableWhiteboards])

    return {
        manager,
        state: manager.state,
        refreshAvailableWhiteboards,
    }
}
