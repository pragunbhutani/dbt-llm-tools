import os

import streamlit as st
from tinydb import TinyDB, Query

from menu import menu
from styles import button_override

st.set_page_config(page_title="dbt-llm-tools", page_icon="🤖", layout="wide")

st.title("Welcome to dbt-llm-tools 👋")

st.caption(
    "dbt-llm-tools is brought to you by the team at [Bottom Line Data Co.](https://bottomlinedata.co/)."
)

st.subheader("Get started")
st.text(
    "To get started, choose where you would like to save your project settings and click on 'Get Started'."
)

menu()
button_override()

if "local_db_path" not in st.session_state:
    st.session_state["local_db_path"] = ".local_storage/db.json"

if "vector_store_path" not in st.session_state:
    st.session_state["vector_store_path"] = ".local_storage/db.json"

if db_folder_root := st.text_input(
    label="Local Database Path",
    help="Where would you like to store your database files?",
    value=st.session_state.get("db_folder_root", ".local_storage/"),
):
    os.makedirs(db_folder_root, exist_ok=True)

    st.session_state["local_db_path"] = db_folder_root + "db.json"
    st.session_state["vector_store_path"] = db_folder_root + "chroma.db"

st.caption("")
col4, col5 = st.columns([1, 1])

with col4:
    if st.button(
        "Initialize project",
        type="primary",
        disabled="local_db_path" not in st.session_state,
    ):
        db = TinyDB(st.session_state["local_db_path"])
        File = Query()
        settings = db.get(File.type == "settings")

        if settings is not None:
            for key in settings:
                if key != "type":
                    st.session_state[key] = settings[key]

        st.toast("Settings loaded from file!", icon="📁")

with col5:
    if st.button(
        "Reset local storage",
        disabled="local_db_path" not in st.session_state,
    ):
        db = TinyDB(st.session_state["local_db_path"])
        File = Query()
        db.remove(File.type == "settings")
        db.remove(File.type == "model")
        db.remove(File.type == "source")

        st.toast("Settings cleared from file!", icon="📁")

st.divider()

st.subheader("OpenAI Settings")
st.text("Enter your OpenAI API key and select your preferred models.")

if openai_api_key := st.text_input(
    label="OpenAI API Key",
    type="password",
    help="Enter your OpenAI API key",
    value=st.session_state.get("openai_api_key", ""),
):
    st.session_state["openai_api_key"] = openai_api_key

if openai_chatbot_model := st.selectbox(
    "Chatbot Model",
    ("gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"),
    help="The model you select will be used to generate responses for your chatbot.",
):
    st.session_state["openai_chatbot_model"] = openai_chatbot_model

if openai_embedding_model := st.selectbox(
    "Embedding Model",
    ("text-embedding-3-large", "text-embedding-3-small", "text-embedding-ada-002"),
    help="The model you select will be used to generate embeddings for your chatbot.",
):
    st.session_state["openai_embedding_model"] = openai_embedding_model

st.caption("")

if st.button("Save settings to file", disabled="local_db_path" not in st.session_state):
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

st.divider()
