import json

import chromadb
from chromadb.utils import embedding_functions

from ragstar.types import ParsedSearchResult
from ragstar.dbt_model import DbtModel


class VectorStore:
    """
    A class representing a vector store for dbt models.

    Methods:
        get_client: Returns the client object for the vector store.
        upsert_models: Upsert the models into the vector store.
        reset_collection: Clear the collection of all documents.
    """

    def __init__(
        self,
        openai_api_key: str,
        embedding_model_name: str = "text-embedding-3-large",
        db_persist_path: str = "./chroma.db",
        test_mode: bool = False,
    ) -> None:
        """
        Initializes a vector store for dbt models.

        Args:
            openai_api_key (str): Your OpenAI API key.
            embedding_model_name (str, optional): The name of the OpenAI embedding model to be used.
            db_persist_path (str, optional): The path to the persistent database file. Defaults to "./chroma.db".
            test_mode (bool, optional): Whether the vector store is being used in test mode. Defaults to False.
        """
        if not isinstance(db_persist_path, str) or db_persist_path == "":
            raise Exception("Please provide a valid path for the persistent database.")

        self.__openai_api_key = openai_api_key
        self.__client = chromadb.PersistentClient(db_persist_path)
        self.__collection_name = "dbt_models"

        self.__embedding_fn = self.__get_embedding_fn(
            embedding_model_name, test_mode=test_mode
        )

        self.__collection = self.__create_collection()

    def __get_embedding_fn(
        self, embedding_model_name: str, test_mode: bool = False
    ) -> embedding_functions.OpenAIEmbeddingFunction:
        """
        Get the embedding function for the vector store.

        Args:
            embedding_model_name (str): The name of the OpenAI embedding model to be used.
            test_mode (bool, optional): Whether the vector store is being used in test mode. Defaults to False.

        Returns:
            embedding_functions.OpenAIEmbeddingFunction: The embedding function for the vector store.
        """
        if test_mode:
            return embedding_functions.DefaultEmbeddingFunction()

        return embedding_functions.OpenAIEmbeddingFunction(
            api_key=self.__openai_api_key, model_name=embedding_model_name
        )

    def __create_collection(self, distance_fn: str = "l2") -> chromadb.Collection:
        """
        Create a new collection in the vector store.

        Args:
            distance_fn (str, optional): The distance function to be used for nearest neighbour search.
                Defaults to "l2".

        Returns:
            chromadb.Collection: The newly created collection.
        """
        return self.__client.get_or_create_collection(
            name=self.__collection_name,
            metadata={"hnsw:space": distance_fn},
            embedding_function=self.__embedding_fn,
        )

    def set_embedding_fn(self, embedding_model_name: str) -> None:
        """
        Set the embedding function for the vector store.

        Args:
            embedding_model_name (str): The name of the OpenAI embedding model to be used.
        """
        self.__embedding_fn = self.__get_embedding_fn(embedding_model_name)

    def get_client(self) -> chromadb.PersistentClient:
        """
        Returns the client object for the vector store.

        Returns:
            chromadb.PersistentClient: The client object for the vector store.
        """
        return self.__client

    def upsert_models(
        self,
        models: list[DbtModel],
    ) -> None:
        """
        Upsert the models into the vector store.

        Args:
            models (list[DbtModel]): A list of dbt model objects to be upserted into the vector store.

        Returns:
            None
        """
        documents = []
        metadatas = []
        ids = []

        for model in models:
            if not isinstance(model, DbtModel):
                raise Exception("Please provide a list of valid dbt model objects.")

            model_text = model.as_prompt_text()

            documents.append(model_text)
            metadatas.append(
                {
                    "tags": json.dumps(model.tags),
                }
            )
            ids.append(model.name)

        return self.__collection.upsert(
            documents=documents, metadatas=metadatas, ids=ids
        )

    def get_models(self, model_ids: list[str] = None) -> list[DbtModel]:
        """
        Get the models from the vector store.

        Args:
            model_ids (list[str], optional): A list of model ids to be retrieved from the vector store.

        Returns:
            list[DbtModel]: A list of dbt model objects retrieved from the vector store.
        """
        models = []
        raw_models = self.__collection.get(ids=model_ids)

        for i in range(len(raw_models["ids"])):
            models.append(
                {
                    "id": raw_models["ids"][i],
                    "document": raw_models["documents"][i],
                }
            )

        return models

    def query_collection(
        self, query: str, n_results: int = 3
    ) -> list[ParsedSearchResult]:
        """
        Query the collection for the k nearest neighbours to the query.

        Args:
            query (str): The query to be used for nearest neighbour search.
            n_results (int, optional): The number of nearest neighbours to be returned. Defaults to 3.

        Returns:
            list[ParsedSearchResult]: A list of parsed search results.
        """
        closest_models = []

        if not isinstance(query, str) or query == "":
            raise Exception("Please provide a valid query.")

        search_results = self.__collection.query(
            query_texts=[query],
            n_results=n_results,
            include=["documents", "distances", "metadatas"],
        )

        for i in range(len(search_results["ids"][0])):
            closest_models.append(
                {
                    "id": search_results["ids"][0][i],
                    "metadata": search_results["metadatas"][0][i],
                    "document": search_results["documents"][0][i],
                    "distance": search_results["distances"][0][i],
                }
            )

        return closest_models

    def reset_collection(self) -> None:
        """
        Clear the collection of all documents.

        Returns:
            None
        """
        self.__client.delete_collection(self.__collection_name)
        self.__collection = self.__create_collection()
