import streamlit as st
from tinydb import TinyDB, Query
from dotenv import load_dotenv
import os
import psycopg2
from psycopg2 import sql

load_dotenv()
db_params = {
    "dbname": os.environ["DBNAME"],
    "user": os.environ["DB_USER"],
    "password": os.environ["PSWD"],
    "host": os.environ["HOST"],
    "port": os.environ["PORT"],
}


def load_session_state_from_pg():

    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()

    cur.execute("SELECT * FROM settings")
    settings = cur.fetchone()

    if settings:
        columns = [desc[0] for desc in cur.description]
        settings_dict = dict(zip(columns, settings))
        for key, value in settings_dict.items():
            st.session_state[key] = value

    cur.close()
    conn.close()

    if "openai_chatbot_model" not in st.session_state:
        st.session_state["openai_chatbot_model"] = "gpt-4o"

    if "openai_embedding_model" not in st.session_state:
        st.session_state["openai_embedding_model"] = "text-embedding-3-large"

    if "vector_store_path" not in st.session_state:
        st.session_state["vector_store_path"] = ".local_storage/chroma.db"


def load_session_state_from_db():
    if "local_db_path" not in st.session_state:
        st.session_state["local_db_path"] = ".local_storage/db.json"

    db = TinyDB(st.session_state.get("local_db_path"))
    settings = db.get(Query().type == "settings")

    if settings is not None:
        for key in settings:
            if key != "type":
                st.session_state[key] = settings[key]

    if "openai_chatbot_model" not in st.session_state:
        st.session_state["openai_chatbot_model"] = "gpt-4o"

    if "openai_embedding_model" not in st.session_state:
        st.session_state["openai_embedding_model"] = "text-embedding-3-large"

    if "vector_store_path" not in st.session_state:
        st.session_state["vector_store_path"] = ".local_storage/chroma.db"


def save_session_to_db():
    db = TinyDB(
        st.session_state.get("local_db_path", ".local_storage/db.json"),
        sort_keys=True,
        indent=4,
    )
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
                "vector_store_path", ".local_storage"
            ),
            "local_db_path": st.session_state.get(
                "local_db_path", ".local_storage/db.json"
            ),
        },
        Query().type == "settings",
    )

    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()
    cur.execute("DELETE FROM settings;")
    cur.execute(
        """
                INSERT INTO settings (
                    dbt_project_root,
                    openai_api_key,
                    openai_chatbot_model,
                    openai_embedding_model,
                    vector_store_path,
                    local_db_path
                )
                VALUES (%s, %s, %s, %s, %s, %s);
         """,
        (
            st.session_state.get("dbt_project_root", ""),
            st.session_state.get("openai_api_key", ""),
            st.session_state.get("openai_chatbot_model", ""),
            st.session_state.get("openai_embedding_model", ""),
            st.session_state.get("vector_store_path", ".local_storage"),
            st.session_state.get("local_db_path", ".local_storage/db.json"),
        )
    )

    st.toast("Settings saved to database!", icon="📁")
