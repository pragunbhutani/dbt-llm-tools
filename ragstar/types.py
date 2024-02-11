from typing import TypedDict
from typing_extensions import NotRequired


class DbtModelColumn(TypedDict):
    """
    Type for a dictionary representing a column in a dbt model
    """

    name: str
    description: NotRequired[str]


class DbtModelDict(TypedDict):
    """
    Type for a dictionary representing a dbt model
    """

    name: str
    description: NotRequired[str]
    columns: list[DbtModelColumn]


class PromptMessage(TypedDict):
    """
    Type for a dictionary representing a prompt message for ChatGPT
    """

    role: str
    content: str


class ParsedSearchResult(TypedDict):
    """
    Type for a dictionary representing a parsed search result from the vector store
    """

    id: str
    document: str
    metadata: dict
    distance: float
