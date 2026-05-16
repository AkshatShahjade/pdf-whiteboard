domain models: decides on object shape (compile-time validation and blueprinting)
factory pattern: actually creates & updates objects in centralized manner
registry pattern: managing capabilities of something with many types (like tools, or contents) in efficent and centralized manner

Object :

domain (models.ts): object shape description
factory: object Creation & Updation
repository: object storage
object updating = 
    A) create new object from factory getting passed into repo update function
    B) add a specialized update function in factory itself (instead of creating whole new object from scratch) . Technically doesn't belong in standard factory pattern - but it does in my factories.
runtime validation: zod / schema
persistance validation: database schema


We group common behaviours together, splitting the components.
    Mark object in domain model, creation in object factory, storage in repo, etc. so for RectangleMark, it is split and managed in different places - however those places are intentional and not random in the codebase.

firstly, this is coding implementation architecture, not the actual software architecture which is about functional decisions. This is about the organization of the code itself for scalability.


Storage Structure:

Repository (domain focused): Makes easy to call endpoints for rest of the codebase, built from the adapter endpoints.
Storage Adapter (Storage focused): Makes easy to switch and add new implementations by hiding individual implementation details behind 1 unified interface
Various Implementations of Storage: Lowest level

Note: Since storage adapter unifies all the implementations, the repository doesn't need an interface-implementation pattern as there won't be multiple repo implementatiosn to choose from - only one that uses storage adapter.


Untangling Spaghetti code:

Start with the small things and update the spaghetti with the new architecture version of those small things. Then move onto larger things.
Instead of:
    Window->Slot->Pane->Content->Tool->Mark-> etc...
    Mark->Tool->....
And somethings are disconnected, so are easier to do:
    Platform Adapter