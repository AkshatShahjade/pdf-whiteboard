type UUID = string

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

export type PaneType = ContentPane | DerivedPane | SystemPane

export type PaneMode = 'standard' | 'link'

export interface BlobStorage {

  putBlob(id: string, data: ArrayBuffer, mimeType: string): Promise<void>

}