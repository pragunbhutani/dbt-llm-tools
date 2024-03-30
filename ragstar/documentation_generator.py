import os
import json
import yaml

from openai import OpenAI

from ragstar.types import DbtModelDict, DbtModelDirectoryEntry, PromptMessage
from ragstar.instructions import INTERPRET_MODEL_INSTRUCTIONS
from ragstar.dbt_project import DbtProject


class MyDumper(yaml.Dumper):  # pylint: disable=too-many-ancestors
    """
    A custom yaml dumper that indents the yaml output like dbt does.
    """

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


class DocumentationGenerator:
    """
    A class that generates documentation for dbt models using large language models.
    """

    def __init__(
        self,
        dbt_project_root: str,
        openai_api_key: str,
        language_model: str = "gpt-4-turbo-preview",
        database_path: str = "./directory.json",
    ) -> None:
        """
        Initializes a Documentation Generator object.

        Args:
            dbt_project_root (str): Root of the dbt project
            openai_api_key (str): OpenAI API key
            language_model (str, optional): The language model to use for generating documentation.
            Defaults to "gpt-4-turbo-preview".
            database_path (str, optional): Path to the directory file that stores the parsed dbt project.
            Defaults to "./directory.json".

        Attributes:
            dbt_project (DbtProject): A DbtProject object representing the dbt project.

        Methods:
            interpret_model: Interpret a dbt model using the language model.
            generate_documentation: Generate documentation for a dbt model.
        """
        self.dbt_project = DbtProject(
            dbt_project_root=dbt_project_root, database_path=database_path
        )

        self.__language_model = language_model
        self.__client = OpenAI(api_key=openai_api_key)

    def __get_system_prompt(self, message: str) -> PromptMessage:
        """
        Get the system prompt for the language model.

        Args:
            message (str): The message to include in the system prompt.

        Returns:
            dict: The system prompt for the language model.
        """
        return {
            "role": "system",
            "content": message,
        }

    def __save_interpretation_to_yaml(
        self, model: DbtModelDict, overwrite_existing: bool = False
    ) -> None:
        """
        Save the interpretation of a model to a yaml file.

        Args:
            model (dict): The model to save the interpretation for.
            overwrite_existing (bool, optional): Whether to overwrite the existing model
            yaml documentation if it exists. Defaults to False.
        """
        yaml_path = model.get("yaml_path")

        if yaml_path is not None:
            if not overwrite_existing:
                raise Exception(
                    f"Model already has documentation at {model['yaml_path']}"
                )

            with open(model["yaml_path"], "r", encoding="utf-8") as infile:
                existing_yaml = yaml.load(infile, Loader=yaml.FullLoader)
                existing_models = existing_yaml.get("models", [])

                search_idx = -1
                for idx, m in enumerate(existing_models):
                    if m["name"] == model["name"]:
                        search_idx = idx

                if search_idx != -1:
                    existing_models[search_idx] = model["interpretation"]
                else:
                    existing_models.append(model["interpretation"])

                existing_yaml["models"] = existing_models
                yaml_content = existing_yaml
        else:
            model_path = model["absolute_path"]
            head, tail = os.path.split(model_path)
            yaml_path = os.path.join(head, "_" + tail.replace(".sql", ".yml"))

            yaml_content = {"version": 2, "models": [model["interpretation"]]}

        with open(yaml_path, "w", encoding="utf-8") as outfile:
            yaml.dump(
                yaml_content,
                outfile,
                Dumper=MyDumper,
                default_flow_style=False,
                sort_keys=False,
            )

    def interpret_model(self, model: DbtModelDirectoryEntry) -> DbtModelDict:
        """
        Interpret a dbt model using the large language model.

        Args:
            model (dict): The dbt model to interpret.

        Returns:
            dict: The interpretation of the model.
        """
        print(f"Interpreting model: {model['name']}")

        prompt = []
        refs = model.get("refs", [])

        prompt.append(self.__get_system_prompt(INTERPRET_MODEL_INSTRUCTIONS))

        prompt.append(
            self.__get_system_prompt(
                f"""
                The model you are interpreting is called {model["name"]}  following is the Jinja SQL code for the model:

                {model.get("sql_contents")}
                """
            )
        )

        if len(refs) > 0:
            prompt.append(
                self.__get_system_prompt(
                    f"""

                    The model {model["name"]} references the following models: {", ".join(refs)}.               
                    The interpretation for each of these models is as follows:
                    """
                )
            )

            for ref in refs:
                ref_model = self.dbt_project.get_single_model(ref)

                prompt.append(
                    self.__get_system_prompt(
                        f"""

                        The model {ref} is interpreted as follows:
                        {json.dumps(ref_model.get("interpretation"), indent=4)}
                        """
                    )
                )

        completion = self.__client.chat.completions.create(
            model=self.__language_model,
            messages=prompt,
        )

        response = (
            completion.choices[0]
            .message.content.replace("```json", "")
            .replace("```", "")
        )

        return json.loads(response)

    def generate_documentation(
        self, model_name: str, write_documentation_to_yaml: bool = False
    ) -> DbtModelDict:
        """
        Generate documentation for a dbt model.

        Args:
            model_name (str): The name of the model to generate documentation for.
            write_documentation_to_yaml (bool, optional): Whether to save the documentation to a yaml file.
            Defaults to False.
        """
        model = self.dbt_project.get_single_model(model_name)

        for dep in model.get("deps", []):
            dep_model = self.dbt_project.get_single_model(dep)

            if dep_model.get("interpretation") is None:
                dep_model["interpretation"] = self.interpret_model(dep_model)
                self.dbt_project.update_model_directory(dep_model)

        interpretation = self.interpret_model(model)

        model["interpretation"] = interpretation

        if write_documentation_to_yaml:
            self.__save_interpretation_to_yaml(model)

        self.dbt_project.update_model_directory(model)

        return interpretation
