import os
import unittest

from ragstar import DbtProject, DbtModel

HERE = os.path.abspath(os.path.dirname(__file__))
VALID_PROJECT_PATH = os.path.join(HERE, "test_data/valid_dbt_project")
DATABASE_PATH = os.path.join(HERE, "test_data/directory.json")


class DbtProjectTestCase(unittest.TestCase):
    """
    Test cases for the DbtProject class.
    """

    def test_project_root_is_not_dbt_project(self):
        """
        Test for the case when the project root is not a dbt project.
        """
        with self.assertRaises(Exception):
            DbtProject("invalid_path")

    def test_class_constructed_with_valid_project_root(self):
        """
        Test for the case when the class is constructed with a valid project root.
        """
        project = DbtProject(
            VALID_PROJECT_PATH,
            database_path=DATABASE_PATH,
        )

        self.assertIsInstance(project, DbtProject)

    def test_get_models_all_folders(self):
        """
        Test for the case when we want to get all the models in the project.
        """
        project = DbtProject(
            VALID_PROJECT_PATH,
            database_path=DATABASE_PATH,
        )
        models = project.get_models()

        self.assertEqual(len(models), 5)

    def test_get_models_with_included_folders(self):
        """
        Test for the case when we want to get all the models in one/many specific folder(s).
        """
        project = DbtProject(
            VALID_PROJECT_PATH,
            database_path=DATABASE_PATH,
        )
        models = project.get_models(
            included_folders=["models/staging", "models/intermediate"]
        )

        self.assertEqual(len(models), 3)

        for _, model in enumerate(models):
            self.assertIsInstance(model, DbtModel)

        self.assertEqual(models[0].name, "staging_1")
        self.assertEqual(models[1].name, "staging_2")
        self.assertEqual(models[2].name, "intermediate_1")

    def test_get_models_with_excluded_folders(self):
        """
        Test for the case when we want to get all the models in the project,
        except for those in one/many specific folder(s).
        """
        project = DbtProject(
            VALID_PROJECT_PATH,
            database_path=DATABASE_PATH,
        )
        models = project.get_models(excluded_folders=["models/intermediate"])

        self.assertEqual(len(models), 4)
        for _, model in enumerate(models):
            self.assertIsInstance(model, DbtModel)

    def test_get_models_by_name(self):
        """
        Test for the case when we want to get only specific models by name.
        """
        project = DbtProject(
            VALID_PROJECT_PATH,
            database_path=DATABASE_PATH,
        )
        models = project.get_models(models=["staging_1", "staging_2"])

        self.assertEqual(len(models), 2)
        self.assertEqual(models[0].name, "staging_1")
        self.assertEqual(models[1].name, "staging_2")


if __name__ == "__main__":
    unittest.main()
