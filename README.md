# dbt RAG Tools

A set of tools to facilitate LLM RAG for dbt projects.

### Installation

```
pip install dbt-rag-tools
```

### Get started

How to multiply one number by another with this lib:

```Python
from ragstar import DbtProject

# Instantiate a DBT Project object
project = DbtProject('/path/to/dbt/project')

# Get a parsed list of all the models
models = project.get_models()

for model in models:
    print(model.as_prompt_text())
```
