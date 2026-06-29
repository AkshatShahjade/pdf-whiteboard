3 ways to store things

1) core domain entities: marks, links, roopa workspaces, etc. -> have their own sql tables
    But they also have associated state variables like activeWorkspaceId or marks or links. 
    Should these variables be stored via state variable path, or they are separate.
2) documents and files -> in the local file storage
3) state variables -> 4 layer system