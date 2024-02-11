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
	# Optional:
	# embedding_model="text-embedding-3-large",
	# chatbot_model="gpt-4-turbo-preview",
	# db_persist_path"./chroma.db",
)

# Step 1. Load models information from your dbt ymls into a local vector store
chatbot.load_models(
    # Optional:
	# models=['list', 'of', 'models', 'to', 'select'],
	# included_folders=[
	# 	'folder/to/scan/for/ymls',
	#	'another/folder/here'
	# ],
	#excluded_folders=['ignore/any/yamls/found/here']
)

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
