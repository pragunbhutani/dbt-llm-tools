from typing import TypedDict, Union
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
    columns: NotRequired[list[DbtModelColumn]]
    tests: NotRequired[list[Union[dict, str]]]
    config: NotRequired[dict]
    yaml_path: NotRequired[str]


class DbtModelDirectoryEntry(TypedDict):
    """
    Type for a dictionary representing an entry in a dbt model directory
    """

    absolute_path: str
    relative_path: str
    name: str
    refs: list[str]
    deps: list[str]
    sources: list[str]
    sql_contents: str
    documentation: DbtModelDict
    interpretation: DbtModelDict


class DbtProjectDirectory(TypedDict):
    """
    Type for a dictionary representing a dbt project directory
    """

    models: dict[str, DbtModelDirectoryEntry]
    sources: NotRequired[dict[str, dict]]


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
