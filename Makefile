# dbt-llm-tools Makefile
# ~~~~~~~~~~~~~~~~~
#
# Shortcuts for various tasks.

documentation:
	@(poetry export --with docs -f requirements.txt -o requirements-docs.txt; cd docs; make html)

test:
	poetry run pytest tests

doctest:
	@(cd docs/source; sphinx-build -b doctest . _build/doctest)

make poetry:
	@(curl -sSL https://install.python-poetry.org | python3 -)

make lint:
	@(poetry run pylint dbt_llm_tools tests streamlit; poetry run flake8 dbt_llm_tools tests streamlit)

# install poetry and dependencies
install:
	@(poetry install; git config --local core.hooksPath .githooks/; mkdir -p .local_storage)

# Fetch the open source project from GitLab as an example to play with.
fetch_example_project:
	@( \
		git clone https://github.com/stacktonic-com/stacktonic-dbt-example-project.git example_dbt_project; \
		echo "Example project fetched to ./example_dbt_project/" \
	)

# Run the streamlit client
run_streamlit:
	@(mkdir -p .local_storage; poetry run streamlit run streamlit/app.py)

# Clean the local storage
clean_local_storage:
	@(rm -rf .local_storage)