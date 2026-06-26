/**
 * Base interfaces for mark and tool renderers.
 *
 * These define the minimum contract that any content type's mark/tool system
 * must satisfy. Content-specific implementations (e.g. PDFMarkRendererType)
 * extend these with their own lifecycle hooks.
 *
 * ContentRendererType references these base types so that the registry is
 * content-agnostic at the top level.
 */

/** Base contract for any mark renderer, regardless of content type. */
export interface MarkRendererType {
    id: string
    render: (mark: any, ctx: any) => any
    renderSelectionPreview: (selection: any, ctx: any) => any
}

/** Base contract for any tool renderer, regardless of content type. */
export interface ToolRendererType {
    id: any           // concrete type is content-specific (e.g. ToolDomainType for PDF)
    hotkey?: string
}
