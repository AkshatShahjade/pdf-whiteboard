# The meta process of App creation

Step 1: Create a single workflow MVP (v0.1.1). Vibecode, doesn't have to be scalable or anything, but it should be refined and work well. Simultaneously maintain a features.txt file where you store any ideas you get as you are building. Once the MVP is built, you put the MVP files and the features.txt into ai, and ideate branstorm. Refine your ideas. Then create clarity.
Once clarity is created, divide the features into 2 types of features:
Functional Features: different types of tools, different types of marking, new contents...., different ways to export import
Abstraction Features: making the app cross platform, making the app have web sync (memory storage system upheaval), creating the window->slot->pane->Content->Component architecture and levels of abstraction

First add the abstraction features to your current MVP without messing up functionality (v0.1.x). Then add the functionality features (v0.2.x), so this way when any new functionality feature will be added you / ai will have to consider how to implement it across all platforms, while allowing sync, while abiding by the code's architecture, etc. Once all the functional features have been implemented. That is your 2nd MVP (v0.2.x). Now repeat the cycle.
For ex- adding a cross platform layer of abstraction in typescript early on so that anything the ai builds will now be built for scalable.
For ex- converting the current 0.1.1 version to web and mobile before adding more features, so the ai builds every new feature in all 3 modes simultaneously and factors in cross platform when choosing libraries and making decisions.
- re organizing memory structure so that it is using supabase adjacent structure and a format that will be used in the final product eventhough it will still be local. Then when we want to make the shift to online sync, it will be trivially easy.

Some common abstraction features to add into the v0.2.x builds:
Cross Platform
Web sync (authorization, account creation, storage changes)

Abstraction Features to add:

- Cross Platform (Windows, Mac, Linux, Android, iOS, Web, PWA)
- Web Sync (Obsidian style set it up in dropbox or onedrive folder - and manual sync button like the one found in Anki)
    - Deciding on proper storage solutions accordingly
- Healthy Scaling of each Content: excess text or handwriting shapes in tldraw whiteboard. Excess text in pdfs… Excess lines of code in the code editor….
- Modular framework, makes it possible to add more Content Types, More Marking Types, More Tool Types, More Media Types, etc. and similarly for UI/UX, can add new views, more tools to the toolbar, etc…

Current State: I have created the MVP. v0.1.1.
Now I want to add support for all these abstraction features in the backend by completely upheavaling the architecture - but not adding any of the functional features yet (ownly minimal). 
The Goal: The app shouldn’t behave any differently, however, in the backend it is totally different, and all I have to do now is add the functional features one by one.