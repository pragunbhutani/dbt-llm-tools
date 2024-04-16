INVALID_MODEL = {
    "name": None,
}

MODEL_WITH_ONLY_NAME = {
    "name": "model_with_only_name",
}

MODEL_WITH_ONLY_NAME_PROMPT_TEXT = (
    "The table model_with_only_name does not have a description."
)

MODEL_WITH_NAME_AND_DESCRIPTION = {
    "name": "model_with_name_and_description",
    "description": "model_description",
}

MODEL_WITH_NAME_AND_DESCRIPTION_PROMPT_TEXT = "The table model_with_name_and_description is described as follows: model_description"

MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS = {
    "name": "model_with_name_description_and_columns",
    "description": "model_description",
    "columns": [
        {"name": "col_1", "description": "col_1_description"},
        {"name": "col_2", "description": "col_2_description"},
    ],
}

MODEL_WITH_NAME_DESCRIPTION_AND_COLUMNS_PROMPT_TEXT = (
    "The table model_with_name_description_and_columns is described as follows: model_description"
    + "\nThis table contains the following columns:\n"
    + "\n"
    + "- col_1: col_1_description"
    + "\n"
    + "- col_2: col_2_description"
)
