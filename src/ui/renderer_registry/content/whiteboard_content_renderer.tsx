import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Tldraw, DefaultToolbar, DefaultToolbarContent, TldrawUiMenuItem, useTools, useIsToolSelected } from 'tldraw'
import 'tldraw/tldraw.css'
import { debounce } from '../../../atma/services/state_sync_service'
import { inputAPI, queryAPI } from '../../../atma/singletons'
import { HandwritingShapeUtil, HandwritingTool, handwritingToolUiOverrides } from '../../registry_implementations/whiteboard/tools/editing/handwriting_whiteboard_editing_tool.jsx'
import { ContentRendererType, ContentRendererProps } from '../content_renderer_registry'

const handwritingAssetUrls = {
  icons: {
    'tool-handwriting': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDEyYzMtMyAzIDMgNiAwczMtMyA2IDAgMyAzIDYgMCIvPjwvc3ZnPg==',
  },
}

function WhiteboardPane({ markId, settings }: { markId: string; settings?: any }) {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    queryAPI.getWhiteboardSnapshot(markId).then((snap: any) => {
      if (!cancelled) {
        setSnapshot(snap ?? undefined)
        setLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [markId])

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1c1f26', color: '#9ca3af', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
        loading workspace…
      </div>
    )
  }

  return <TldrawWithPersistence markId={markId} initialSnapshot={snapshot} settings={settings} />
}

function TldrawWithPersistence({ markId, initialSnapshot, settings }: { markId: string; initialSnapshot?: any; settings?: any }) {
  const debouncedSave = useMemo(() => debounce((snap: any) => inputAPI.saveWhiteboardSnapshot(markId, snap), 800), [markId])

  const handleMount = useCallback((editor: any) => {
    if (initialSnapshot) {
      try { editor.loadSnapshot(initialSnapshot) } catch (err) { console.warn(err) }
    }
    editor.setCurrentTool(settings?.defaultTool || 'draw')
    editor.updateInstanceState({ exportBackground: false })

    const unsub = editor.store.listen(
      () => { debouncedSave(editor.getSnapshot()) },
      { source: 'user', scope: 'document' }
    )
    return () => { unsub(); debouncedSave.flush(editor.getSnapshot()) }
  }, [initialSnapshot, debouncedSave, markId])

  const handwritingComponents = {
    Toolbar: (props: any) => {
      const tools = useTools()
      const isSelected = useIsToolSelected(tools['handwriting'])
      return (
        <DefaultToolbar {...props}>
          <TldrawUiMenuItem {...tools['handwriting']} isSelected={isSelected} />
          <DefaultToolbarContent />
        </DefaultToolbar>
      )
    },
  }

  return (
    <>
      <style>{`
        .tl-container {
          --tl-font-draw: 'Helvetica', Arial, sans-serif;
          --tl-font-sans: 'Helvetica', Arial, sans-serif;
          --tl-font-serif: 'Helvetica', Arial, sans-serif;
          --tl-font-mono: 'Helvetica', Arial, sans-serif;
        }
      `}</style>
      <Tldraw
        onMount={handleMount}
        tools={[HandwritingTool]}
        shapeUtils={[HandwritingShapeUtil]}
        overrides={handwritingToolUiOverrides}
        assetUrls={handwritingAssetUrls}
        components={handwritingComponents}
      />
    </>
  )
}

function WhiteboardContentComponent({ contentId, settings }: ContentRendererProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <WhiteboardPane markId={contentId} settings={settings} />
    </div>
  )
}

export const whiteboardContentRenderer: ContentRendererType = {
  id: 'whiteboard',
  Component: WhiteboardContentComponent,
  slotRendererRegistry: new Map(),
}

// Re-export WhiteboardPane for use in the split-pane PDF view
export { WhiteboardPane }
