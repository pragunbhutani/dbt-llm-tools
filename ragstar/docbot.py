import json

from ragstar.instructions import INTERPRET_MODEL_INSTRUCTIONS
from ragstar.dbt_project import DbtProject

from openai import OpenAI


class Docbot:
    def __init__(
        self,
        dbt_project_root: str,
        openai_api_key: str,
        language_model: str = "gpt-4-turbo-preview",
        database_path: str = "./directory.json",
    ):
        self.dbt_project = DbtProject(
            dbt_project_root=dbt_project_root, database_path=database_path
        )

        self.__language_model = language_model
        self.__client = OpenAI(api_key=openai_api_key)

    def __get_system_prompt(self, message):
        return {
            "role": "system",
            "content": message,
        }

    def interpret_model(self, model):
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

        print("\nResponse received: \n")
        print(response)
        print("\n")

        return json.loads(response)

    def generate_documentation(self, model_name):
        model = self.dbt_project.get_single_model(model_name)

        for dep in model.get("deps", []):
            dep_model = self.dbt_project.get_single_model(dep)

            if dep_model.get("interpretation") is None:
                dep_model["interpretation"] = self.interpret_model(dep_model)
                self.dbt_project.update_model(dep_model)

        model["interpretation"] = self.interpret_model(model)
        self.dbt_project.update_model(model)
