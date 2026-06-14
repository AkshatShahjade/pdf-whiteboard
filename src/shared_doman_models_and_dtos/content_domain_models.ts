export type content_id = derived_content_id | source_content_id
export type derived_content_id = 'whiteboard' // CodeEditor | BlockText | Image | Video | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type source_content_id = 'whiteboard' | 'pdf' // CodeEditor | BlockText | Image | Video | PPT | Spreadsheet | KeyboardMindMap | ObsidianCanvas

// Data types that store actual contents like .pdf files... instances...
export type SourceContent = PDF | WhiteBoard //| CodeEditor | BlockText | Image | Video | PPT | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type DerivedContent = WhiteBoard //| CodeEditor | BlockText | Image | Video | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type Content = DerivedContent | SourceContent

export interface PDF {}

export interface WhiteBoard{}

// export interface CodeEditor{}

// export interface BlockText{}

// export interface Image{}

// export interface Video{}

// export interface PPT{}

// export interface Spreadsheet{}

// export interface KeyboardMindMap{}

export interface ContentDomainType {
    
    id: content_id
    
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

