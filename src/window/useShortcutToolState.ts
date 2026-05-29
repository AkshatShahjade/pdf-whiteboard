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
} from '../implementations/pdf/tools/system/shortcut_tool_state'
import { pruneWhiteboards } from '../storage.js'
import { jjoin, rdTextFile, readDirAKS } from '../platform_adapter/switch.ts'

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

    // Refresh available whiteboards from filesystem
    const refreshAvailableWhiteboards = useCallback(async () => {
        const libraryPath = localStorage.getItem('lemmamap:library')
        if (!libraryPath) {
            manager.setAvailableWhiteboards([])
            return
        }

        const collected: WhiteboardInfo[] = []
        const walk = async (dir: string) => {
            const items = await readDirAKS(dir)
            for (const item of items) {
                const fullPath = await jjoin(dir, item.name)
                if (item.isDirectory) {
                    await walk(fullPath)
                    continue
                }
                if (!item.isFile || !item.name.toLowerCase().endsWith('.whiteboard.json')) continue
                try {
                    const raw = await rdTextFile(fullPath)
                    const meta = JSON.parse(raw)
                    if (meta?.id && meta?.name) collected.push({ id: meta.id, name: meta.name, path: fullPath })
                } catch {
                    // Ignore malformed whiteboard files.
                }
            }
        }

        try {
            await walk(libraryPath)
            const byId = new Map<string, WhiteboardInfo>()
            for (const wb of collected) if (!byId.has(wb.id)) byId.set(wb.id, wb)
            const deduped = [...byId.values()]
            pruneWhiteboards(deduped.map((wb) => wb.id))
            manager.setAvailableWhiteboards(deduped)
        } catch (err) {
            console.warn('Failed to scan whiteboard files:', err)
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
