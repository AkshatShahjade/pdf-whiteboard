 graph TB

    subgraph JODO["JODO API"]
        J1["Plugins Loaded"]
    end

    subgraph STORE["Platform & Storage"]
            I1["Data Repositories"]
            I2["Storage Adapter"]
            I3["Platform Utilities Adapter"]
            I9["State Repository"]
            I8["4-layer System"]
            subgraph FILES["Files Library"]
                I4["Data File System"]
                I6["JODO Plugin Files"]
            end
            subgraph SQL["SQL Database"]
                I5["Data SQL Tables"]
                I10["StateInitialValues SQL Tables"]
                I7["Roopa, Kram SQL"]
            end

        end

    subgraph ROOPAKRAM["Roopa & Kram"]

    end

    subgraph ATMA["Atma"]
        direction TB
        subgraph UI["UI Layer"]
            direction TB
            
            N1["UI State"]
            N2["UI Controller"]
            N3["UI"]
            N5["Component Pool"]
            N4['Signal???']
        end
        subgraph BACK["Backend"]
            subgraph "Orchestration"
                SERV["Services (multi-step workflows)"]
                COMM["Command Processor (undo/redo)"]  
            end
            S3["AppStateStore"]
            
            subgraph API["Backend Boundary"]
                direction TB
                APIIN["Input Processor"]
                APIOUT["Output Processor & Event Stream"]
                QUERY["Query Processor"]
            end
        end
    end
    subgraph DOM["Shared Domain Models and DTOs"]
        D1["Domain Models"]
        D2["Factories"]
        D3["Capability Registries"]
        D4["State Machines??"]
        D5["Renderer Registries"]
        DTO["DTOs"]
    end

    I9 --> I8
    I8 --> I10
    N2 -->|"App State Mutations"| APIIN
    N2 --> |"Queries and their Responses"| QUERY
    QUERY --> SERV
    QUERY --> STORE
    N3 --> |"Query/Write Command"| N2
    N2 --> |"UI State Mutations"| N1
    N1 --> |"Reactive Stream"|N3
    S3 -->|"Write Path Reactive Stream"| APIOUT
    APIOUT --> |"listener"|N2
    APIIN --> SERV
    APIIN --> |"Undoable actions"|COMM
    ATMA --> DOM
    UI --> DOM
    API <--> DTO
    JODO --> I6
    COMM --> SERV
    SERV --> I1
    SERV --> I3
    I1 --> I2
    I2 --> I4
    I2 --> I5
    SERV <--> S3
    DOM --> JODO
    ROOPAKRAM --> |"Maybe?"| I7
    ROOPAKRAM --> |"Maybe?"| I10
    DOM --> ROOPAKRAM
