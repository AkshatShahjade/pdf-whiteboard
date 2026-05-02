type UUID = string  // branded later if desired, string for now
type ISOTimestamp = string

export interface AppWindow {
  id: UUID
  slots: Slot[]
  coreSlotIndex: number       // which slot index holds the core pane
}

export interface Slot {
  id: UUID
  windowId: UUID
  navigationStack: PaneRef[]  // bottom = core pane, top = currently visible
}

// A PaneRef is a lightweight pointer — not the full pane data
export interface Pane {
  paneId: UUID
  paneKind: 'content' | 'derived' | 'system'
}

export interface SystemPane {
  id: UUID
  kind: 'system'
  systemTypeId: string
  label: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
  isMarkable: boolean
}

export interface ContentPane {
  id: UUID
  kind: 'content'
  contentTypeId: string       // references ContentType registry
  mode: PaneMode
  filePath: string   
  label: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
  isMarkable: boolean
}

export interface DerivedPane {
  id: UUID
  kind: 'derived'
  contentTypeId: string
  mode: PaneMode
  parentPaneId: UUID          // the ContentPane this lives inside
  parentMarkId: UUID          // the mark you click to open this derived pane
  label: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
  isMarkable: boolean
}

export type PaneType = ContentPane | DerivedPane | SystemPane

export type PaneMode = 'standard' | 'link'

// _________________________________________________________

export interface ContentTypeEntry {
  id: string                    // e.g. 'pdf', 'whiteboard', 'blocktext'
  label: string
  fileExtensions: string[]      // extensions this type handles
  supportsAnnotationEngine: boolean
  supportsComponents: boolean
  componentContentTypeId: string | null  // if this type has a component form
}

export interface ToolTypeEntry {
  id: string                    // e.g. 'rectangle-mark', 'link-outgoing'
  label: string
  scope: 'single-pane' | 'multi-pane'
  category: 'marking-pure' | 'marking-selection' | 'system' | 'layer' | 'link' | 'editing'
  applicableContentTypes: string[]  // content type IDs, or ['*'] for all
  configurableParams: ToolParam[]   // empty for now, populated in Stage 4 - to be like a bunch of saved modes we can add and modify
}

export interface ToolParam {
  key: string
  type: 'boolean' | 'number' | 'string' | 'enum'
  defaultValue: unknown
  enumValues?: string[] // only for enum type
}

export interface MarkTypeEntry {
  id: string                    // e.g. 'rectangle', 'highlight', 'pin'
  label: string
  isSelectable: boolean
  applicableContentTypes: string[]
  spatialKind: 'spatial' | 'textual' | 'structural' | 'object' | 'button'
}


// _________________________________________________________________

export interface Mark {
  id: UUID
  paneId: UUID
  markTypeId: string            // references MarkTypeEntry
  attributes: MarkAttribute[]
  spatialData: MarkSpatialData  // the actual location/region data
  label: string | null
  createdAt: ISOTimestamp
}

export type MarkAttribute = 'outgoing' | 'incoming' | 'layer'

// Spatial data varies by mark type — use a discriminated union
export type MarkSpatialData =
  | RectMarkData
  | LassoMarkData
  | SpatialSectionMarkData
  | PinMarkData


export interface RectMarkData {
  kind: 'rect'
  pageRef: string | null        // page number, slide index, null for single-surface
  x: number                     // normalized 0..1
  y: number
  width: number
  height: number
}

export interface LassoMarkData {
  kind: 'lasso'
  pageRef: string | null
  points: Array<{ x: number; y: number }>  // normalized
}

export interface SpatialSectionMarkData {
  kind: 'spatial-section'
  pageRef: string | null
  startY: number                // normalized
  endY: number
}

export interface PinMarkData {
  kind: 'pin'
  pageRef: string | null
  x: number
  y: number
}


export type MarkTextualData =
  | HighlightMarkData
  | TextualSectionMarkData
  | SymbolMarkData

export interface HighlightMarkData {
    kind: 'highlight'
    startWordId: UUID
    endWordId: UUID
}

export interface TextualSectionMarkData {
  kind: 'text-section'
  startWordId: UUID
  endWordId: UUID
}

export interface SymbolMarkData {
  kind: 'symbol'
  blockId: UUID                 // which block it's inline in
  offsetIndex: number           // character offset within block
}



export interface ObjectMarkData {
  kind: 'object'
  objectId: string              // TLDraw shape ID, PDF annotation ID, or block ID
}

export interface PaneLevelMarkData {
  kind: 'pane-level'
  paneId: UUID
}

export interface Link {
  id: UUID
  outgoingMarkId: UUID
  incomingMarkId: UUID
  direction: 'one-way' | 'two-way'
  status: 'active' | 'error'   // error = target was deleted
  createdAt: ISOTimestamp
}