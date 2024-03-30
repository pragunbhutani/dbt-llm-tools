import unittest

from test.test_data.model_examples import (
    INVALID_MODEL,
    MODEL_WITH_ONLY_NAME,
    MODEL_WITH_NAME_AND_DESCRIPTION,
    MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS,
    MODEL_WITH_ONLY_NAME_PROMPT_TEXT,
    MODEL_WITH_NAME_AND_DESCRIPTION_PROMPT_TEXT,
    MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS_PROMPT_TEXT,
)

from ragstar import DbtModel


class DbtModelTestCase(unittest.TestCase):
    """
    Test cases for the DbtModel class.
    """

    def test_model_constructed_with_invalid_model(self):
        """
        Test for the case when the model is constructed with an invalid model.
        """
        with self.assertRaises(Exception):
            DbtModel(INVALID_MODEL)

    def test_model_constructed_with_only_name(self):
        """
        Test for the case when the model is constructed with only a name.
        """
        model = DbtModel(MODEL_WITH_ONLY_NAME)

        self.assertIsInstance(model, DbtModel)
        self.assertEqual(model.as_prompt_text(), MODEL_WITH_ONLY_NAME_PROMPT_TEXT)

    def test_model_constructed_with_name_and_description(self):
        """
        Test for the case when the model is constructed with a name and a description.
        """
        model = DbtModel(MODEL_WITH_NAME_AND_DESCRIPTION)

        self.assertIsInstance(model, DbtModel)
        self.assertEqual(
            model.as_prompt_text(), MODEL_WITH_NAME_AND_DESCRIPTION_PROMPT_TEXT
        )

    def test_model_constructed_with_name_description_and_columns(self):
        """
        Test for the case when the model is constructed with a name, a description, and columns.
        """
        model = DbtModel(MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS)

        self.assertIsInstance(model, DbtModel)
        self.assertEqual(
            model.as_prompt_text(), MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS_PROMPT_TEXT
        )
