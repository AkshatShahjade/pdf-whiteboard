export type content_type = derived_content_type | source_content_type
export type derived_content_type = 'whiteboard' // CodeEditor | BlockText | Image | Video | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type source_content_type = 'whiteboard' | 'pdf' // CodeEditor | BlockText | Image | Video | PPT | Spreadsheet | KeyboardMindMap | ObsidianCanvas

// Data types that store actual contents like .pdf files... instances...
export type SourceContent = PDF | WhiteBoard //| CodeEditor | BlockText | Image | Video | PPT | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type DerivedContent = WhiteBoard //| CodeEditor | BlockText | Image | Video | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type Content = DerivedContent | SourceContent

export type UUID = string // TODO - make UUID proper
export type Path = string

export interface PDF {
    id: UUID
    type: "pdf"
    filePath: Path
}

export interface WhiteBoard{
    id: UUID
    type: "whiteboard"
    filePath: Path
}

// export interface CodeEditor{}

// export interface BlockText{}

// export interface Image{}

// export interface Video{}

// export interface PPT{}

// export interface Spreadsheet{}

// export interface KeyboardMindMap{}

export interface ContentDomainType {
    
    id: content_type
    
    can_be_source: boolean
    can_be_derived: boolean

    // Stuff not existing in all contents
    capabilities: {
        importFile?: ImportCapability
        exportFile?: ExportCapability
        RAGSearch?: RAGCapability
    } 
}

export interface RAGCapability {
    getTextForRAG: () => Promise<string> 
    getMetaDataForRAG: () => Promise<{
        title?: string; // Maybe remove....
        sourcePath?: string; // ? since Derived... -> ALthough in this case the sourcepath should be the 'source of parent pane'/'region_no'.___ though
        page?: number; // Linearized PDF types or Paged text panes
        regionId?: string; // Whiteboards
    }>
}

export interface ImportCapability {
    supported_extensions: string[]
}

export interface ExportCapability{
    supported_extensions: string[]
}

