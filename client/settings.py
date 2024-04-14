import streamlit as st
from tinydb import TinyDB, Query


def load_session_state_from_db():
    if "local_db_path" not in st.session_state:
        st.session_state["local_db_path"] = ".local_storage/db.json"

    db = TinyDB(st.session_state.get("local_db_path"))
    File = Query()
    settings = db.get(File.type == "settings")

    if settings is not None:
        for key in settings:
            if key != "type":
                st.session_state[key] = settings[key]

    if "openai_chatbot_model" not in st.session_state:
        st.session_state["openai_chatbot_model"] = "gpt-4-turbo"

    if "openai_embedding_model" not in st.session_state:
        st.session_state["openai_embedding_model"] = "text-embedding-3-large"

    if "vector_store_path" not in st.session_state:
        st.session_state["vector_store_path"] = ".local_storage/chroma.db"

    # st.toast("Settings loaded from file!", icon="📁")


def save_session_to_db():
    db = TinyDB(st.session_state["local_db_path"], sort_keys=True, indent=4)
    File = Query()
    db.upsert(
        {
            "type": "settings",
            "dbt_project_root": st.session_state.get("dbt_project_root", ""),
            "openai_api_key": st.session_state.get("openai_api_key", ""),
            "openai_chatbot_model": st.session_state.get("openai_chatbot_model", ""),
            "openai_embedding_model": st.session_state.get(
                "openai_embedding_model", ""
            ),
            "vector_store_path": st.session_state.get(
                "vector_store_path", ".local_storage/chroma.db"
            ),
            "local_db_path": st.session_state.get(
                "local_db_path", ".local_storage/db.json"
            ),
        },
        File.type == "settings",
    )

    st.toast("Settings saved to file!", icon="📁")
