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



Coding implementation architecture is about the organization of the code itself for scalability, ease of understanding - but it doesn't change the functioning of the architecture in the momemt. However, since it determines how easy it is to modify, add, update, replace features, it impacts the trajectory of the project over time indirectly. Also, it is usually the basis for human resource division in larger tech companies, and once teams are allotted those boundaries are usually frozen (especially in hierarchical companies). Pure Software architecture though is more directly about functional decisions.

Code Implementation Architecture Mental Model:

There are categories of patterns / Layers:
    
    Centralizer / EndPoint Patterns:
        Factory - objects
        Repository - domain oriented, for storage utilties 
        Service - multi-step processes
    
    Registry Pattern - managing capabilities of elements that have many types
    
    Adapter Pattern (1 interface, many implementations)
        - easy switching between and adding of different implementations for one common interface

    Mapper / Anti-Corruption Layer

    History Patterns
        Command
    
    Performance Patterns

    Domain Model Layer

    Obfuscation Patterns
        .gitignore + dotenv / pydantic ??

    UI Layer


2 architectural styles:

    1) OOP Classes (keep capabilities and model variables together)
        more intuitve
    2) Interfaces and Instances : Data Models and Capabilities separate
        Better for larger systems
        Becomes intuitive after some learning.

    2>1


How would Roopa function internally:
    - Adapter Pattern on UI


IIFE pattern:

(() => { ... }) is just an anonymous function. By itself, it does nothing. (() => { ... })() means “define the function, then immediately call it.” That pattern is called an IIFE.

In JSX, people use an IIFE when they want to put multiple statements inside an expression position, for example:

    {currentDrag && (() => {
        const { x, y, w, h } = rectFromDrag(currentDrag);
        return (
            <rect x={x * zoom} y={y * zoom} width={w * zoom} height={h * zoom} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" rx={2} style={{ pointerEvents: 'none' }} />
        );
    })()}



Understand CDN, and how to make my app truly local without any CDN connection requests.


Explanation of Platform Adapter vs Storage stuff - both are tauri abstractions:
Here is the cleanest way to split these responsibilities so that your architecture makes perfect sense:

1. src/atma/platform_adapter/ (The Environment Layer)
Keep this folder, but limit it strictly to OS-level environment abstractions that aren't related to reading/writing application data.

What stays here: confirmErrorDialog (Native Dialogs), openFile / saveFile (Native File Picker UI), join / basename / dirname (OS Path utilities), convertFileSrcAKS.
Why: If you move to the Web (Stage 8), the web doesn't have a "File Picker UI" that returns a string path, and it handles paths using URLs instead of \. This folder abstracts the Host Environment.
2. src/atma/storage/storage_implementations/ (The Persistence Layer)
This is where your databases and raw data persistence live.

What goes here: tauri_sqlite.ts (wrapping tauri-plugin-sql) and tauri_fs.ts (wrapping writeTextFile, readTextFile, mkdir, copyFile from @tauri-apps/plugin-fs).
Why: When your PaneRepository or MarkRepository wants to save a file or execute a query, it talks to the Storage Adapters. It shouldn't care about Error Dialogs or Path joining.
The Solution
You don't merge them. You split the current tauri.ts file in two.

Leave the dialogs and path utilities in platform_adapter/tauri.ts.
Move the raw file read/write methods (wrtTextFile, rdTextFile, readDir) into storage/storage_implementations/tauri_fs.ts.
Create storage/storage_implementations/tauri_sqlite.ts for your database.