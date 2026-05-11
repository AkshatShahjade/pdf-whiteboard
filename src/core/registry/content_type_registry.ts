import {Slot} from '../models.ts'

// You have one instance of a content type per blob file of that type. So if I have 3 images, when I load each, a new ImageContentImplementation instance would be created, 3 in total. The instance is linked to the file blob.
export interface ContentTypeImplementation {
    // Id of slot the content will be loaded into
    slot_id : Slot 

    // Location of the storage of the blob associated with the content instance
    blob_storage : string

    
}