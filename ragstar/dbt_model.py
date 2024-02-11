from typing import Callable
from ragstar.types import DbtModelDict


class DbtModel:
    """
    A class representing a dbt model.

    Attributes:
        name (str): The name of the model.
        description (str, optional): The description of the model.
        columns (list[DbtModelColumn], optional): A list of columns contained in the model.
        May or may not be exhaustive.
    """

    def __init__(self, model_dict: DbtModelDict) -> None:
        """
        Initializes a dbt model object.

        Args:
            model_dict (dict): A dictionary containing the model name, description and columns.
        """
        self.name = model_dict.get("name")

        if self.name is None:
            raise Exception("Cannot create a model without a valid name.")

        config = model_dict.get("config", {})
        self.tags = config.get("tags", [])

        self.description = model_dict.get("description", "")

        raw_columns = filter(lambda x: "name" in x, model_dict.get("columns", []))
        self.columns = map(
            lambda x: {"name": x.get("name"), "description": x.get("description")},
            raw_columns,
        )

    def __print_model_doc(self) -> str:
        """
        Template function that takes a model name, description and a list of columns as arguments
        and returns a text description of the model. This description can be used as a part of a prompt
        for an LLM.

        Args:
            model (DbtModelDict): A dictionary representation of the dbt model.

        Returns:
            str: A text description of the model, including the list of columns with their descriptions.
        """
        model = self.as_dict()

        model_text = f"The table { model['name'] } is described as follows: { model['description'] }"
        model_text += "\nThis table contains the following columns:\n"

        for col in model["columns"]:
            model_text += "\n"
            model_text += f"- { col['name'] }: { col['description'] }"

        return model_text

    def as_dict(self) -> DbtModelDict:
        """
        Returns the dbt model as a dictionary.

        Returns:
            DbtModelDict: A dictionary representation of the dbt model.
        """

        return {
            "name": self.name,
            "description": self.description,
            "columns": self.columns,
        }

    def as_prompt_text(
        self,
        template_function: Callable[[DbtModelDict], str] = None,
    ) -> str:
        """
        Returns pre-formatted description of the model containing it's name, description
        and names and decriptions of all the columns.

        Args:
            template_function (fn, optional): A function that takes a model name, description and a list
            of columns as arguments and returns a text description of the model.

        Returns:
            str: A pre-formatted string that documents the column
        """
        if template_function is None:
            return self.__print_model_doc()

        return template_function(self.as_dict())
