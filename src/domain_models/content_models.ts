export interface ContentType {
    
    id: string
    name: string
    
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

}

export interface ExportCapability{}

