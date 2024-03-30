import unittest

from test.test_data.model_examples import (
    INVALID_MODEL,
    MODEL_WITH_ONLY_NAME,
    MODEL_WITH_NAME_AND_DESCRIPTION,
    MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS,
)

from ragstar import DbtModel
from ragstar import VectorStore


class VectorStoreTestCase(unittest.TestCase):
    """
    Test cases for the VectorStore class.
    """

    def test_vector_store_initialized_without_openai_api_key(self):
        """
        Test for the case when the vector store is initialized without an OpenAI API key.
        """
        with self.assertRaises(Exception):
            VectorStore()  # pylint: disable=no-value-for-parameter

    def test_vector_store_initialized_with_openai_api_key(self):
        """
        Test for the case when the vector store is initialized with an OpenAI API key.
        """
        vector_store = VectorStore("api_key")
        self.assertIsInstance(vector_store, VectorStore)

    def test_vector_store_initialized_with_embedding_model_name(self):
        """
        Test for the case when the vector store is initialized with an embedding model name.
        """
        vector_store = VectorStore("api_key", "text-embedding-3-large")
        self.assertIsInstance(vector_store, VectorStore)

    def test_vector_store_initialized_with_invalid_db_persist_path(self):
        """
        Test for the case when the vector store is initialized with an invalid database persist path.
        """
        with self.assertRaises(Exception):
            VectorStore("api_key", db_persist_path="")

    def test_invalid_models_upserted_into_vector_store(self):
        """
        Test for the case when invalid models are upserted into the vector store.
        """
        vector_store = VectorStore(
            "api_key", db_persist_path="./test_chroma.db", test_mode=True
        )

        with self.assertRaises(Exception):
            vector_store.upsert_models([INVALID_MODEL])

    def test_valid_models_upserted_into_vector_store(self):
        """
        Test for the case when valid models are upserted into the vector store.
        """
        list_of_valid_models = [
            DbtModel(MODEL_WITH_ONLY_NAME),
            DbtModel(MODEL_WITH_NAME_AND_DESCRIPTION),
            DbtModel(MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS),
        ]

        vector_store = VectorStore("api_key", test_mode=True)
        vector_store.upsert_models(list_of_valid_models)

        self.assertEqual(len(vector_store.get_models()), 3)

    def test_vector_store_queried_without_query_string(self):
        """
        Test for the case when the vector store is queried without a query string.
        """
        list_of_valid_models = [
            DbtModel(MODEL_WITH_ONLY_NAME),
            DbtModel(MODEL_WITH_NAME_AND_DESCRIPTION),
            DbtModel(MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS),
        ]

        vector_store = VectorStore("api_key", test_mode=True)
        vector_store.upsert_models(list_of_valid_models)

        with self.assertRaises(Exception):
            vector_store.query_collection("")

    def test_vector_store_collection_reset(self):
        """
        Test for the case when the vector store collection is reset.
        """
        list_of_valid_models = [
            DbtModel(MODEL_WITH_ONLY_NAME),
            DbtModel(MODEL_WITH_NAME_AND_DESCRIPTION),
            DbtModel(MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS),
        ]

        vector_store = VectorStore("api_key", test_mode=True)

        vector_store.upsert_models(list_of_valid_models)
        self.assertEqual(len(vector_store.get_models()), 3)

        vector_store.reset_collection()
        self.assertEqual(len(vector_store.get_models()), 0)
