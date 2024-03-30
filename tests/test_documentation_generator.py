import os
import unittest

from ragstar import DocumentationGenerator

HERE = os.path.abspath(os.path.dirname(__file__))
VALID_PROJECT_PATH = os.path.join(HERE, "test_data/valid_dbt_project")


class DocumentationGeneratorTestCase(unittest.TestCase):
    """
    Test cases for the DocumentationGenerator class.
    """

    def test_project_root_is_not_dbt_project(self):
        """
        Test for the case when the project root is not a dbt project.
        """
        with self.assertRaises(Exception):
            DocumentationGenerator("invalid_path", "api_key")

    def test_class_constructed_with_valid_project_root(self):
        """
        Test for the case when the class is constructed with a valid project root.
        """
        generator = DocumentationGenerator(VALID_PROJECT_PATH, "api_key")

        self.assertIsInstance(generator, DocumentationGenerator)

    def test_class_constructed_without_api_key(self):
        """
        Test for the case when the class is constructed without an api key.
        """
        with self.assertRaises(Exception):
            DocumentationGenerator(VALID_PROJECT_PATH, None)
