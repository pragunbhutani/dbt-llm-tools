import streamlit as st

from dbt_llm_tools import DbtProject, VectorStore, DbtModel

from menu import menu
from styles import button_override
from settings import load_session_state_from_db

st.set_page_config(page_title="Configuration", page_icon="🤖", layout="wide")

menu()
button_override()
load_session_state_from_db()

st.title("Vector Store")
st.caption(
    f"Your vector store is located at {st.session_state.get('vector_store_path')}."
)

vector_store = VectorStore(
    db_persist_path=st.session_state.get(
        "vector_store_path", ".local_storage/chroma.db"
    ),
    embedding_model_name=st.session_state.get(
        "openai_embedding_model", "text-embedding-3-large"
    ),
    openai_api_key=st.session_state.get("openai_api_key", ""),
)

setting_tab, view_tab = st.tabs(["Settings", "View Vector Store"])


def convert_text_input_to_list(text_input):
    return text_input.strip().split("\n") if text_input else None


with setting_tab:
    st.subheader("Models for Chatbot Context")

    st.markdown(
        """
        Select the models that you'd like to make available to the chatbot. 
        If the models have documentation, it will be loaded into the vector store and used to generate 
        chatbot responses.
        
        You can choose to leave all the fields blank to include all the models in your DBT project.
        """
    )

    # db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))
    # Document = Query()

    # all_models = db.search(Document.type == "model")

    models = []

    if "dbt_project_root" in st.session_state:
        dbt_project = DbtProject(
            dbt_project_root=st.session_state.get("dbt_project_root", ""),
            database_path=st.session_state.get(
                "local_db_path", ".local_storage/db.json"
            ),
        )

        models_to_include = st.text_area(
            "Models to include",
            help="Enter the names of the models to include, one per line.",
        )

        folders_to_include = st.text_area(
            "Folder paths to include",
            help="Enter the folder paths to include, one per line.",
        )

        folders_to_exclude = st.text_area(
            "Folder paths to exclude",
            help="Enter the folder paths to exclude, one per line.",
        )

        st.caption("")

        st.write("Models to include:")
        st.write(convert_text_input_to_list(models_to_include))

        st.write("Folders to include:")
        st.write(convert_text_input_to_list(folders_to_include))

        st.write("Folders to exclude:")
        st.write(convert_text_input_to_list(folders_to_exclude))

        col1, col2, col3 = st.columns([1, 1, 1])

        with col1:
            if st.button(
                "Preview Models",
                help="Preview the models that will be loaded into the vector store.",
            ):
                models = dbt_project.get_models(
                    models=convert_text_input_to_list(models_to_include),
                    included_folders=convert_text_input_to_list(folders_to_include),
                    excluded_folders=convert_text_input_to_list(folders_to_exclude),
                )

        with col2:
            if st.button(
                "Load to Vector Store", help="Load the models into the vector store."
            ):
                models = dbt_project.get_models(
                    models=convert_text_input_to_list(models_to_include),
                    included_folders=convert_text_input_to_list(folders_to_include),
                    excluded_folders=convert_text_input_to_list(folders_to_exclude),
                )

                models_to_store = [
                    DbtModel(model["documentation"])
                    for model in models
                    if "documentation" in model
                ]

                # st.write(models_to_store)
                vector_store.upsert_models(models_to_store)

                st.toast("Models loaded into the vector store!", icon="✅")

        with col3:
            if st.button(
                "Clear Vector Store",
                help="Delete all models from the vector store.",
                type="primary",
            ):
                vector_store.reset_collection()
                st.toast("Vector store cleared!", icon="🗑️")

    else:
        st.warning("Please set the DBT project root in the Project Configuration page.")

    st.divider()

    st.subheader("Preview")
    st.caption(
        "The following models were found. Only the models with documentation will be loaded into the vector store."
    )

    if models != []:
        models_display = [
            {
                "name": model["name"],
                "has_documentation": "✅" if "documentation" in model else "❌",
                "has_interpretation": "✅" if "interpretation" in model else "❌",
                "path": model["relative_path"],
            }
            for model in models
        ]

        models_with_documentation = [
            model["name"] for model in models if "documentation" in model
        ]

        st.write(
            f"Found {len(models)} models out of which {len(models_with_documentation)} have documentation."
        )

        st.dataframe(
            models_display,
            use_container_width=True,
            column_config={"has_documentation": st.column_config.Column(width="small")},
        )
    else:
        st.info("No models to preview.")


with view_tab:
    st.subheader("Explore Vector Store")

    stored_models = vector_store.get_models()

    if stored_models != []:
        st.dataframe([model["id"] for model in stored_models], use_container_width=True)

    if searched_model_name := st.selectbox(
        "Select Model", [model["id"] for model in stored_models]
    ):
        searched_model = next(
            (x for x in stored_models if x["id"] == searched_model_name), None
        )

        if searched_model is not None:
            st.markdown(searched_model["document"])

            st.divider()
