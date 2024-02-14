
# Ragstar

Ragstar (inspired by `RAG & select *`) is a tool that enables you to ask ChatGPT questions about your dbt project.

## Get Started

### Installation

Ragstar can be installed via pip.

```
pip install ragstar
```

### Basic Usage

How to multiply one number by another with this lib:

```Python
from ragstar import Chatbot

# Instantiate a chatbot object
chatbot = Chatbot(
	dbt_project_root='/path/to/dbt/project',
	openai_api_key='YOUR_OPENAI_API_KEY',
)

# Step 1. Load models information from your dbt ymls into a local vector store
chatbot.load_models()

# Step 2. Ask the chatbot a question
response = chatbot.ask_question(
	'How can I obtain the number of customers who upgraded to a paid plan in the last 3 months?'
)
print(response)

# Step 3. Clear your local database (Optional).
# You only need to do this if you would like to load a different project into your db
# or restart from scratch for whatever reason.

# If you make any changes to your existing models and load them again, they get upserted into the database.
chatbot.reset_model_db()
```

**Note**: Ragstar currently only supports OpenAI ChatGPT models for generating embeddings and responses to queries.

## How it works

Ragstar is based on the concept of Retrieval Augmented Generation and basically works as follows:

- When you call the `chatbot.load_models()` method, Ragstar scans all the folders in the locations specified by you for dbt YML files.
- It then converts all the models into a text description, which are stored as embeddings in a vector database. Ragstar currently only supports [ChromaDB](https://www.trychroma.com/) as a vector db, which is persisted in a file on your local machine.
- When you ask a query, it fetches 3 models whose description is found to be the most relevant for your query.
- These models are then fed into ChatGPT as a prompt, along with some basic instructions and your question.
- The response is returned to you as a string.

## Advanced Usage
You can control the behaviour of some of the class member functions in more detail, or inspect the underlying classes for more functionality.

The Chatbot is composed of two classes:
- Vector Store
- DBT Project
  - Composed of DBT Model

Here are the classes and methods they expose:

### Chatbot
A class representing a chatbot that allows users to ask questions about dbt models.

    Attributes:
        project (DbtProject): The dbt project being used by the chatbot.
        store (VectorStore): The vector store being used by the chatbot.

    Methods:
        set_embedding_model: Set the embedding model for the vector store.
        set_chatbot_model: Set the chatbot model for the chatbot.
        get_instructions: Get the instructions for the chatbot.
        set_instructions: Set the instructions for the chatbot.
        load_models: Load the models into the vector store.
        reset_model_db: Reset the model vector store.
        ask_question: Ask the chatbot a question and get a response.

### Methods

#### __init__
Initializes a chatbot object along with a default set of instructions.

        Args:
            dbt_project_root (str): The absolute path to the root of the dbt project.
            openai_api_key (str): Your OpenAI API key.

            embedding_model (str, optional): The name of the OpenAI embedding model to be used.
            Defaults to "text-embedding-3-large".

            chatbot_model (str, optional): The name of the OpenAI chatbot model to be used.
	            Defaults to "gpt-4-turbo-preview".

            db_persist_path (str, optional): The path to the persistent database file. 
	            Defaults to "./chroma.db".

        Returns:
            None

#### load_models
Upsert the set of models that will be available to your chatbot into a vector store. The chatbot will only be able to use these models to answer questions and nothing else.

The default behavior is to load all models in the dbt project, but you can specify a subset of models, included folders or excluded folders to customize the set of models that will be available to the chatbot.

        Args:
            models (list[str], optional): A list of model names to load into the vector store.

            included_folders (list[str], optional): A list of paths to all folders that should be included
            in model search. Paths are relative to dbt project root.

            exclude_folders (list[str], optional): A list of paths to all folders that should be excluded
            in model search. Paths are relative to dbt project root.

        Returns:
            None

#### ask_question

Ask the chatbot a question about your dbt models and get a response. The chatbot looks the dbt models most similar to the user query and uses them to answer the question.

        Args:
            query (str): The question you want to ask the chatbot.

        Returns:
            str: The chatbot's response to your question.

#### reset_model_db

This will reset and remove all the models from the vector store. You'll need to load the models again using the load_models method if you want to use the chatbot.

        Returns:
            None

#### get_instructions
Get the instructions being used to tune the chatbot.

        Returns:
            list[str]: A list of instructions being used to tune the chatbot.

#### set_instructions
Set the instructions for the chatbot.

        Args:
            instructions (list[str]): A list of instructions for the chatbot.

        Returns:
            None
#### set_embedding_model
Set the embedding model for the vector store.

        Args:
            model (str): The name of the OpenAI embedding model to be used.

        Returns:
            None
            
#### set_chatbot_model
Set the chatbot model for the chatbot.

        Args:
            model (str): The name of the OpenAI chatbot model to be used.

        Returns:
            None

## Appendices
These are the underlying classes that are used to compose the functionality of the chatbot.

### Vector Store    

A class representing a vector store for dbt models.

    Methods:
        get_client: Returns the client object for the vector store.
        upsert_models: Upsert the models into the vector store.
        reset_collection: Clear the collection of all documents.

### DBT Project
   A class representing a DBT project yaml parser.

    Attributes:
        project_root (str): Absolute path to the root of the dbt project being parsed

### DBT Model
A class representing a dbt model.

    Attributes:
        name (str): The name of the model.
        description (str, optional): The description of the model.
        columns (list[DbtModelColumn], optional): A list of columns contained in the model.
	        May or may not be exhaustive.
