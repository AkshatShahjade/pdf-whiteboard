import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Tldraw, DefaultToolbar, DefaultToolbarContent, TldrawUiMenuItem, useTools, useIsToolSelected } from 'tldraw'
import 'tldraw/tldraw.css'
import { debounce } from '../../../atma/services/state_sync_service.js'
import { queryAPI } from '../../../atma/singletons.js'
import { ContentRendererType, ContentRendererProps } from '../../renderer_registry/content_renderer_registry.js'
import { UIController } from '../../ui_controller.js'
import { whiteboardToolRendererRegistry } from '../../renderer_registry/whiteboard/tool_renderer_registry.js'
import { setupWhiteboardSync } from './whiteboard_sync_listener.js'

// Import Handwriting tool since it was previously hardcoded
import { HandwritingShapeUtil, HandwritingTool, handwritingToolUiOverrides } from './tools/editing/handwriting_whiteboard_editing_tool.jsx'

const handwritingAssetUrls = {
  icons: {
    'tool-handwriting': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDEyYzMtMyAzIDMgNiAwczMtMyA2IDAgMyAzIDYgMCIvPjwvc3ZnPg==',
  },
}

function WhiteboardPane({ 
  slotId, 
  markId, 
  settings, 
  uiController 
}: { 
  slotId: string; 
  markId: string; 
  settings?: any; 
  uiController?: UIController; 
}) {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    queryAPI.getWhiteboardSnapshot(slotId, markId).then((snap: any) => {
      if (!cancelled) {
        setSnapshot(snap ?? undefined)
        setLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [slotId, markId])

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1c1f26', color: '#9ca3af', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
        loading workspace…
      </div>
    )
  }

  return <TldrawWithPersistence slotId={slotId} markId={markId} initialSnapshot={snapshot} settings={settings} uiController={uiController} />
}

function TldrawWithPersistence({ 
  slotId, 
  markId, 
  initialSnapshot, 
  settings, 
  uiController 
}: { 
  slotId: string; 
  markId: string; 
  initialSnapshot?: any; 
  settings?: any; 
  uiController?: UIController; 
}) {
  const debouncedSave = useMemo(() => debounce((snap: any) => {
    uiController?.saveWhiteboardSnapshot(markId, snap, slotId)
  }, 800), [slotId, markId, uiController])

  const handleMount = useCallback((editor: any) => {
    if (initialSnapshot) {
      try { editor.loadSnapshot(initialSnapshot) } catch (err) { console.warn(err) }
    }
    editor.setCurrentTool(settings?.defaultTool || 'draw')
    editor.updateInstanceState({ exportBackground: false })

    const unsubSave = editor.store.listen(
      () => { debouncedSave(editor.getSnapshot()) },
      { source: 'user', scope: 'document' }
    )

    // Setup Kram bridging listener for marks
    let unsubSync = () => {}
    if (uiController) {
      unsubSync = setupWhiteboardSync(editor, slotId, markId, uiController)
    }

    return () => { 
      unsubSave(); 
      unsubSync();
      debouncedSave.flush(editor.getSnapshot()) 
    }
  }, [initialSnapshot, debouncedSave, markId, slotId])

  // Aggregate Tools, ShapeUtils, and UiOverrides from the registry
  const customTools: any[] = [HandwritingTool]
  const customShapeUtils: any[] = [HandwritingShapeUtil]
  
  let mergedOverrides: any = {
      tools: (editor: any, tools: any) => {
          let t = handwritingToolUiOverrides.tools(editor, tools)
          for (const tool of Array.from(whiteboardToolRendererRegistry.values())) {
              if (tool.tldrawUiOverrides?.tools) {
                  t = tool.tldrawUiOverrides.tools(editor, t)
              }
          }
          return t
      },
      toolbar: (editor: any, toolbarItems: any, helpers: any) => {
          let t = handwritingToolUiOverrides.toolbar(editor, toolbarItems, helpers)
          for (const tool of Array.from(whiteboardToolRendererRegistry.values())) {
              if (tool.tldrawUiOverrides?.toolbar) {
                  t = tool.tldrawUiOverrides.toolbar(editor, t, helpers)
              }
          }
          return t
      },
      translations: {
          en: { ...handwritingToolUiOverrides.translations.en }
      }
  }

  for (const tool of Array.from(whiteboardToolRendererRegistry.values())) {
      if (tool.tldrawTool) customTools.push(tool.tldrawTool)
      if (tool.tldrawShapeUtil) customShapeUtils.push(tool.tldrawShapeUtil)
      if (tool.tldrawUiOverrides?.translations?.en) {
          mergedOverrides.translations.en = {
              ...mergedOverrides.translations.en,
              ...tool.tldrawUiOverrides.translations.en
          }
      }
  }

  // Inject a wrapper for the toolbar to include custom tools if needed
  // Note: Since we are using `overrides.toolbar`, we don't necessarily need the custom `components.Toolbar`
  // unless we want absolute control. The user's handwriting tool used both `components` and `overrides`.
  // We'll keep the handwriting components for now to not break it.
  const RegistryToolMenuItem = ({ toolId }: { toolId: string }) => {
    const tools = useTools()
    const isSelected = useIsToolSelected(tools[toolId])
    if (!tools[toolId]) return null
    return <TldrawUiMenuItem {...tools[toolId]} isSelected={isSelected} />
  }

  const customComponents = {
    Toolbar: (props: any) => {
      return (
        <DefaultToolbar {...props}>
          <RegistryToolMenuItem toolId="handwriting" />
          {Array.from(whiteboardToolRendererRegistry.values()).map(tool => {
            if (tool.tldrawTool && tool.tldrawTool.id !== 'handwriting') {
              return <RegistryToolMenuItem key={tool.tldrawTool.id} toolId={tool.tldrawTool.id} />
            }
            return null
          })}
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
        tools={customTools}
        shapeUtils={customShapeUtils}
        overrides={mergedOverrides}
        assetUrls={handwritingAssetUrls}
        components={customComponents}
      />
    </>
  )
}

function WhiteboardContentComponent({ slotId, contentId, settings, uiController }: ContentRendererProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <WhiteboardPane 
        slotId={slotId} 
        markId={contentId} 
        settings={settings} 
        uiController={uiController as UIController | undefined} 
      />
    </div>
  )
}

export const whiteboardContentRenderer: ContentRendererType = {
  id: 'whiteboard',
  Component: WhiteboardContentComponent,
}

export { WhiteboardPane }
