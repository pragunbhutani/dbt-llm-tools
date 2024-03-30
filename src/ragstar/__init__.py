import sys

from ragstar.types import (
    PromptMessage,
    ParsedSearchResult,
    DbtModelDict,
    DbtModelDirectoryEntry,
)

from ragstar.instructions import (
    INTERPRET_MODEL_INSTRUCTIONS,
    ANSWER_QUESTION_INSTRUCTIONS,
)

from ragstar.dbt_model import DbtModel
from ragstar.dbt_project import DbtProject
from ragstar.vector_store import VectorStore
from ragstar.chatbot import Chatbot
from ragstar.documentation_generator import DocumentationGenerator

if sys.version_info[:2] >= (3, 8):
    # TODO: Import directly (no need for conditional) when `python_requires = >= 3.8`
    from importlib.metadata import PackageNotFoundError, version  # pragma: no cover
else:
    from importlib_metadata import PackageNotFoundError, version  # pragma: no cover

try:
    # Change here if project is renamed and does not equal the package name
    dist_name = __name__
    __version__ = version(dist_name)
except PackageNotFoundError:  # pragma: no cover
    __version__ = "unknown"
finally:
    del version, PackageNotFoundError
