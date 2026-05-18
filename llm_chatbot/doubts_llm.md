- What methods are available on the returned Chroma instance to add or query documents
- So FastAPI isn't necessarily for internet, REST API type situations? We can use fastapi locally as well? to expose only certain functionalities that other parts of the codebase could accesss??

# Useful method trees
Chroma(collection_name:, persist_directory, embedding_function = from OllamaEmbeddings, etc.)
    
    .as_retriever(
      search_type="similarity"
                  'mmr' -> more diversity + relevance (first fetches 'fetch_k' num of documents, then chooses 'k' num of diverse docs)
                  'similarity_score_threshold'
      search_kwargs={"k": 5}
                  k: The number of documents to retrieve.
                  fetch_k: (For MMR) The number of documents to initially fetch for the MMR algorithm to consider.
                  lambda_mult: (For MMR) Controls diversity of results; 0 for maximum diversity, 1 for minimum.
                  score_threshold: (For score threshold) The minimum relevance score required.
      )
    
          .invoke(question)


    .add_texts(texts: list..., metadatas: list...)


## ChatService:

1. Get Relevant RAG chunks to build context 

  $retriever$ = $vector_store$.as_retriever(search_kwargs={"k": 5})
  $relevant_rag_chunks$ = $retriever$.invoke(question)

  $context$ = "\n\n".join(
          f"Source: {doc.metadata.get('filename')}, "
          f"Page: {doc.metadata.get('page', 'N/A')}\n"
          f"{doc.page_content}"
          for doc in $relevant_rag_chunks$
      )

2. Building LLM input:

  $prompts$: list[dict] = 
      [
        {role:"system",
      content:("You are a document-grounded assistant. "
                    "Answer only using the provided context. "
                    "If the answer is not in the context, say you don't know.")
        },
        {
          role: "user",
          content: $final_llm_input$
        }
      ]

    $final_llm_input$:
    question + $context$ + "Answer with useful detail and cite filename/page where possible."

3. Get response from LLM
  response = $chat_model$.invoke($prompts$)


## IndexService:

  $chunk$ = {
      "text": chunk_text,
      "metadata": {
          **doc.metadata,
          "source_path": doc.source_path,
          "content_type": doc.content_type,
          "chunk_index": i,
      }
    } 


1. Chunking 
  from langchain_text_splitters import RecursiveCharacterTextSplitter

  splitter = RecursiveCharacterTextSplitter(
          chunk_size=800,
          chunk_overlap=120,
      )
  $split_texts$ = splitter.split_text(doc.text)

  Then format it into chunks.
  

2. LLM Adapters
  1. Ollama
    from langchain_ollama import ChatOllama, OllamaEmbeddings

    $chat_model$ = ChatOllama(model=self.chat_model_name)
    response = $chat_model$.invoke($prompts$)

    $embeddings$ = OllamaEmbeddings(model=self.embedding_model_name)

  2. Openai API
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings

    self.chat_model = ChatOpenAI(
                model=self.chat_model_name,
                api_key=self.api_key,
            )
    response = $chat_model$.invoke($prompts$)

    $embeddings$ = OpenAIEmbeddings(
        model=self.embedding_model_name,
        api_key=self.api_key,
    )

3. setting up VectorStore
  from langchain_chroma import Chroma

  'get_vector_store returns:'
  $vector_store$ = Chroma(
      collection_name=f"lemmamap_knowledge_{provider}",
      persist_directory=f"./storage/chroma_db/{provider}",
      embedding_function=$embeddings$,
  )

4. Adding to VectorStore

  $vector_store$.add_texts(
    texts=[chunk["text"] for chunk in all_chunks],
    metadatas=[chunk["metadata"] for chunk in all_chunks],
  )

  For each chunk the following is stored in persisted_directory:
    - id
    full text
    - meta data
    - embedding vector



Dominance:

Main exposes API.
    index_service.py 
        chunk, vectorstore, content_loaders
    rag_service.py

env Variable Handling:

Stored in .env (gitignore)
converted into a Settings object by config.py - using a SettingsConfigDict provided by pydantic, where if the names of the class variables and .env variables are same (bar capitalization), then it sets everything up properly
That object is used by switch.py, which then calls the appropriate llm.
.env.example is a template that is on git, just so things are understandable from looking only at github




Access by LemmaMap:

await fetch("http://localhost:8000/chat", {
  method: "POST",
  body: JSON.stringify({
    question: "What does this PDF say about LangGraph?",
    provider: "ollama",
  }),
});

CLI running:

uvicorn main:app --reload

time curl -X POST http://127.0.0.1:8000/index-folder \
  -H "Content-Type: application/json" \
  -d '{"folder_path":"/home/akshat/Desktop/recursenotes/ai_folder_test","provider":"ollama"}'

time curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"explain a bit about the pricing policy for the app","provider":"ollama"}'

time curl -X POST http://127.0.0.1:8000/index-folder \
  -H "Content-Type: application/json" \
  -d '{"folder_path":"/home/akshat/Desktop/recursenotes/ai_folder_test","provider":"openai"}'

time curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"explain a bit about the pricing policy for the app","provider":"openai"}'


time curl -X DELETE http://127.0.0.1:8000/delete \
  -H "Content-Type: application/json" \
  -d '{"folder_path":"/home/akshat/Desktop/recursenotes/ai_folder_test/1","provider":"ollama"}'


time curl -X DELETE http://127.0.0.1:8000/delete \
  -H "Content-Type: application/json" \
  -d '{"folder_path":"/home/akshat/Desktop/recursenotes/ai_folder_test/1","provider":"openai"}'


NEED TO TEST REMOVAL SERVICE>>>