import os
import glob
import yaml
import re
import json

from ragstar.dbt_model import DbtModel
from ragstar.instructions import INTERPRET_MODEL_INSTRUCTIONS

SOURCE_SEARCH_EXPRESSION = "source\(['\"]*(.*?)['\"]*?\)"
REF_SEARCH_EXPRESSION = "ref\(['\"]*(.*?)['\"]*\)"


class DbtProject:
    """
    A class representing a DBT project yaml parser.

    Attributes:
        project_root (str): Absolute path to the root of the dbt project being parsed
    """

    def __init__(
        self,
        dbt_project_root: str,
        database_path: str = "./directory.json",
    ) -> None:
        """
        Initializes a dbt project parser object.

        Args:
            project_root (str): Root of the dbt prject
        """
        self.__project_root = dbt_project_root
        self.__directory_path = database_path

        project_file = os.path.join(dbt_project_root, "dbt_project.yml")

        if not os.path.isfile(project_file):
            raise Exception("No dbt project found in the specified folder")

        with open(project_file, encoding="utf-8") as f:
            project_config = yaml.safe_load(f)

            if "model-paths" not in project_config:
                raise Exception("No model-paths defined in the dbt project file")

            self.__model_paths = project_config.get("model-paths", ["models"])

        self.__sql_files = self.__get_all_files("sql")
        self.__yaml_files = self.__get_all_files("yml")

        self.parse()

    # def get_models(
    #     self,
    #     models: list[str] = None,
    #     included_folders: list[str] = None,
    #     excluded_folders: list[str] = None,
    # ) -> list[DbtModel]:
    #     """
    #     Scan all the YMLs in the specified folders and extract all models into a single list.

    #     Args:
    #         models (list[str], optional): A list of model names to include in the search.

    #         included_folders (list[str], optional): A list of paths to all folders that should be included
    #             in model search. Paths are relative to dbt project root.

    #         exclude_folders (list[str], optional): A list of paths to all folders that should be excluded
    #             in model search. Paths are relative to dbt project root.

    #     Returns:
    #         list[DbtModel]: A list of Dbt Model objects for each model found in the included folders
    #     """
    #     parsed_models = []
    #     yaml_files = []

    #     if included_folders is None:
    #         included_folders = self.__model_paths

    #     for folder in included_folders:
    #         if folder[0] == "/":
    #             folder = folder[1:]

    #         yaml_files.extend(
    #             glob.glob(
    #                 os.path.join(self.__project_root, folder, "**", "*.yml"),
    #                 recursive=True,
    #             )
    #         )

    #     if not yaml_files:
    #         raise Exception("No YAML files found in the specified folders")

    #     for file in yaml_files:
    #         should_exclude_file = False

    #         for excluded_folder in excluded_folders or []:
    #             if excluded_folder in file:
    #                 should_exclude_file = True
    #                 continue

    #         if should_exclude_file:
    #             continue

    #         with open(file, encoding="utf-8") as f:
    #             yaml_contents = yaml.safe_load(f)

    #             if yaml_contents is None:
    #                 continue

    #             for model in yaml_contents.get("models", []):
    #                 if (models is not None) and (model.get("name") not in models):
    #                     continue
    #                 parsed_models.append(DbtModel(model))

    #     if not parsed_models:
    #         raise Exception("No model ymls found in the specified folders")

    #     return parsed_models

    def __get_all_files(self, file_type):
        """
        Get all files of a certain type in the dbt project.
        """
        files = []

        for path in self.__model_paths:
            files.extend(
                glob.glob(
                    os.path.join(self.__project_root, path, "**", f"*.{file_type}"),
                    recursive=True,
                )
            )

        return files

    def __find_upstream_references(self, file_path, recursive=False, dependencies=[]):
        with open(file_path, encoding="utf-8") as f:
            file_contents = f.read()

        search_results = re.findall(REF_SEARCH_EXPRESSION, file_contents)
        unique_results = list(set(search_results))

        if recursive:
            for result in unique_results:
                sub_file_path = next(
                    (x for x in self.__sql_files if x.endswith(f"{result}.sql")), None
                )
                dependencies = self.__find_upstream_references(
                    file_path=sub_file_path, recursive=True, dependencies=dependencies
                )

        return dependencies + unique_results

    def __parse_sql_file(self, sql_file: str):
        """
        Parse a SQL file and return a dictionary with the model name and description.
        """
        with open(sql_file, encoding="utf-8") as f:
            sql_contents = f.read()

        sources = []
        source_search = re.findall(SOURCE_SEARCH_EXPRESSION, sql_contents)

        for raw_source in source_search:
            source = raw_source.replace("'", "").replace('"', "").split(",")
            sources.append({"name": source[0], "table": source[1]})

        return {
            "absolute_path": sql_file,
            "relative_path": sql_file.replace(self.__project_root, ""),
            "name": os.path.basename(sql_file).replace(".sql", ""),
            "refs": self.__find_upstream_references(sql_file, False),
            "deps": self.__find_upstream_references(sql_file, True),
            "sources": sources,
            "sql_contents": sql_contents,
        }

    def __parse_yaml_files(self, yaml_files):
        """
        Extract documentation from the parsed yaml files.
        """
        models = {}
        sources = {}

        for yaml_file in yaml_files:
            with open(yaml_file, encoding="utf-8") as f:
                yaml_contents = yaml.safe_load(f)

            for model in yaml_contents.get("models", []):
                model["yaml_file"] = yaml_file

                parsed_columns = {}
                for col in model.get("columns", []):
                    col_name = col.pop("name")
                    parsed_columns[col_name] = col

                model["columns"] = parsed_columns

                models[model["name"]] = model

            for source in yaml_contents.get("sources", []):
                source["yaml_file"] = yaml_file
                sources[source["name"]] = source

        return models, sources

    def __get_directory(self):
        with open(self.__directory_path, encoding="utf-8") as f:
            return json.load(f)

    def __save_directory(self, directory):
        with open(self.__directory_path, "w", encoding="utf-8") as f:
            json.dump(directory, f, ensure_ascii=False, indent=4)

    def parse(self):
        """
        Parse the dbt project and store details in a manifest file.

        Args:
            write_to_directory (bool, optional): Whether to write the parsed manifest to a file.
        """
        # source_sql_models = list(map(self.__parse_sql_file, self.__sql_files))
        source_sql_models = {}

        for sql_file in self.__sql_files:
            parsed_model = self.__parse_sql_file(sql_file)
            source_sql_models[parsed_model["name"]] = parsed_model

        documented_models, documented_sources = self.__parse_yaml_files(
            self.__yaml_files
        )

        for model in source_sql_models.keys():
            source_sql_models[model]["documentation"] = documented_models.get(model)

        directory = {
            "models": source_sql_models,
            "sources": documented_sources,
        }

        self.__save_directory(directory)

        return directory

    def get_single_model(self, model_name):
        if model_name is None:
            raise Exception("No model name provided")

        directory = self.__get_directory()

        return directory["models"].get(model_name)

    def get_models(
        self,
        models: list[str] = None,
        included_folders: list[str] = None,
        excluded_folders: list[str] = None,
    ):
        searched_models = []

        directory = self.__get_directory()

        for model in models or []:
            searched_models.append(directory["models"].get(model))

        for included_folder in included_folders or []:
            for model in directory["models"].values():
                if included_folder in model["absolute_path"]:
                    searched_models.append(model)

        for excluded_folder in excluded_folders or []:
            for model in searched_models:
                if excluded_folder in model["absolute_path"]:
                    searched_models.remove(model)

        models_to_return = []

        for model in searched_models:
            if model["documentation"] is not None:
                models_to_return.append(DbtModel(model["documentation"]))

        return models_to_return

    def update_model(self, model):
        directory = self.__get_directory()

        if model["name"] in directory["models"]:
            directory["models"][model["name"]] = model

        self.__save_directory(directory)
