# dbt-llm-tools

LLM based tools for dbt projects. Answer data questions, generate documentation and more.
The library comes with a streamlit interface that allows you to interact with your dbt project via a UI.

In addition, you can also access the underlying classes that enable you to:

- Chatbot: ask questions about data and get answers based on your dbt model documentation
- Documentation Generator: generate documentation for dbt models based on model and upstream model definition.

**Here is a quick demo of how the Chatbot works:**

https://www.loom.com/share/abb0612c4e884d4cb8fabc22af964e7e?sid=f5f8c0e6-51f5-4afc-a7bf-51e9e182c2e7

## Get Started

You can install `dbt-llm-tools` with the UI and interact with your project via a streamlit interface.
Alternatively, you can also install without the UI to use the underlying classes only.

### Option 1 - With UI

To install with the UI:

1. Clone the repository on your computer: `gh repo clone pragunbhutani/dbt-llm-tools`
2. `cd` into the repository: `cd dbt-llm-tools`
3. The project uses poetry to install dependencies. If you don't have poetry installed already, run `make poetry`.
   - Remember to add the poetry executable to your $PATH and refresh your terminal.
4. Run `make install` to download and set up all of the dependencies
   - (optional) Download an example dbt project with `make fetch_example_project`.
5. Run the client with `make run_client`

You should then be able to see the client run in your browser at `http://localhost:8501/app`

**Note** - To use the tools, you'll need an OpenAI API Key.

### Option 2 - Without UI

dbt-llm-tools can be installed via pip.

```
pip install dbt-llm-tools
```

## Documentation

The following shows you examples of how to use the two main classes of `dbt-llm-tools`. You can also find full documentation for these and all other classes at https://dbt-llm-tools.readthedocs.io/en/latest/

### Class - Chatbot

How to load your dbt project into the Chatbot and ask questions about your data.

```Python
from dbt_llm_tools import Chatbot

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
```

**Note**: dbt-llm-tools currently only supports OpenAI ChatGPT models for generating embeddings and responses to queries.

#### How it works

The Chatbot is based on the concept of Retrieval Augmented Generation and basically works as follows:

- When you call the `chatbot.load_models()` method, the bot scans all the folders in the locations specified by you for dbt YML files.
- It then converts all the models into a text description, which are stored as embeddings in a vector database. The bot currently only supports [ChromaDB](https://www.trychroma.com/) as a vector db, which is persisted in a file on your local machine.
- When you ask a query, it fetches 3 models whose description is found to be the most relevant for your query.
- These models are then fed into ChatGPT as a prompt, along with some basic instructions and your question.
- The response is returned to you as a string.

### Class - Documentation Generator

How to load your dbt project into the Documentation Generator and have it write documentation for your models.

```Python
from dbt_llm_tools import DocumentationGenerator

# Instantiate a Documentation Generator object
doc_gen = DocumentationGenerator(
	dbt_project_root="YOUR_DBT_PROJECT_PATH",
	openai_api_key="YOUR_OPENAI_API_KEY",
)

# Generate documentation for a model and all its upstream models
doc_gen.generate_documentation(
	model_name='dbt_model_name',
	write_documentation_to_yaml=False
)
```
