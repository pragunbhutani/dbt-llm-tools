# dbt-llm-tools Makefile
# ~~~~~~~~~~~~~~~~~
#
# Shortcuts for various tasks.

docs:
	@(poetry export -f requirements.txt -o requirements-docs.txt; cd docs; make html)

test:
	poetry run pytest

doctest:
	@(cd docs/source; sphinx-build -b doctest . _build/doctest)

setup:
	@(poetry install; git config --local core.hooksPath .githooks/)