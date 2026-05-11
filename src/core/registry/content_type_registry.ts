export type ContentRegistry = Map<string, ContentImplementation>

export interface ContentImplementation {
    
    id: string
    name: string
    
    can_be_source: boolean
    can_be_derived: boolean

    // Stuff not existing in all contents
    capabilities: {
        importFile?: ImportCapability
        exportFile?: ExportCapability
    } 
}

export interface ImportCapability {

}

export interface ExportCapability{}

