we need one json file that encodes both roopa elements and actions.
then a parsing system in which the first pass creates the layout shell. None of the actions are configured yet, only the names and properties of the shell are stored. then a second pass links up all the elements via actions.
so the first pass creates the react components but partially. the second pass creates the functionsl. reason 2 passes needed is that a function may link one element to another that hasn't been parsed yet. 
Note, the functions links instances of elements to each toher. So a button element may have 3 instances in the screen that onClick do different things. So because of the first pass creates the instances, gives them unique ids. The second pass links the ids and stuff via precreated functions.
these functions are the kram actions. Like roopa elements that I precreate that users can use, I precreate kram action functions that users can use. 
the roopa kram screen builder would have 2 viewing modes. first is roopa mode in which we can see the roopa elements and everything and can arrange visually. The second is kram mode, in which all the elements that we placed in roopa get displayed as nodes in a mind map type area. And depending on the properties and actions that an element supports, those would be represented by input ports and output ports respectively on those nodes. then kram actions could be like connecting an onClick output port of a button to the screen_id input port of Workspace node and changing the id.
keeping this vision in mind, can't we at least create a hardocoded JSON that represents the current app state and a parser that parses it.
and create the necessary Kram Action functions that JSON uses and the parser understands.
Right now creating the builder is very low priority. All I want is a JSON file that the future could've been used to build and a parser that understands it. 
For that we have to define some kram actions - but only the bare minimum to represent the app in its current state.
suggest kram actions.
and then propose a JSON file that represents the whole app in its current state only in terms of roopa elements and kram actions.