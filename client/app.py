import streamlit as st
from tinydb import TinyDB, Query
from tinydb.operations import set
from dotenv import load_dotenv
import psycopg2
import os

from menu import menu
from styles import button_override
from settings import load_session_state_from_db, save_session_to_db, load_session_state_from_pg

from dbt_llm_tools import DbtProject

load_dotenv()

st.set_page_config(page_title="dbt-llm-tools", page_icon="🤖", layout="wide")

db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))

db_params = {
    'dbname': os.environ['DBNAME'],
    'user': os.environ['DB_USER'],
    'password': os.environ['PSWD'],
    'host': os.environ['HOST'],
    'port': os.environ['PORT']
    }
conn = psycopg2.connect(**db_params)
cur = conn.cursor()

st.title("Welcome to dbt-llm-tools 👋")

st.caption(
    "dbt-llm-tools is brought to you by [Pragun Bhutani](https://pragunbhutani.com/)."
)

st.subheader("Get started")
st.text(
    "To get started, choose where you would like to save your project settings and click on 'Get Started'."
)

menu()
button_override()
load_session_state_from_pg()

if openai_api_key := st.text_input(
    label="OpenAI API Key",
    type="password",
    help="Enter your OpenAI API key",
    value=st.session_state.get("openai_api_key", ""),
):
    st.session_state["openai_api_key"] = openai_api_key
    db.update(set("openai_api_key", openai_api_key), Query().type == "settings")

    cur.execute("UPDATE settings SET openai_api_key=(%s);", (openai_api_key,))
    conn.commit()
    if conn:
        conn.rollback()


if dbt_project_root := st.text_input(
    label="DBT Project Root",
    help="Path to the folder that contains your dbt_project.yml file.",
    value=st.session_state.get("dbt_project_root", ""),
):
    st.session_state["dbt_project_root"] = dbt_project_root
    db.update(set("dbt_project_root", dbt_project_root), Query().type == "settings")

    cur.execute("UPDATE settings SET dbt_project_root=(%s);", (dbt_project_root,))
    conn.commit()
    if conn:
        conn.rollback()


st.caption("")

if st.button(
    label="Parse Project",
    type="primary",
    help="Parse the DBT project. Project Root must be tested first.",
    disabled=not st.session_state.get("dbt_project_root", False),
):
    dbt_project = DbtProject(
        dbt_project_root=st.session_state["dbt_project_root"],
        database_path=st.session_state["local_db_path"],
    )

    dbt_project.parse()
    save_session_to_db()
    st.success("Project Parsed Succesfully!")


st.divider()

st.subheader("Additional Settings")
st.text("Select your OpenAI language model and embedding model.")

if openai_chatbot_model := st.selectbox(
    "Chatbot Model",
    ("gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"),
    help="The model you select will be used to generate responses for your chatbot.",
):
    st.session_state["openai_chatbot_model"] = openai_chatbot_model
    db.update(
        set("openai_chatbot_model", openai_chatbot_model), Query().type == "settings"
    )
    cur.execute("UPDATE settings SET openai_chatbot_model=(%s);", (openai_chatbot_model,))
    conn.commit()
    if conn:
        conn.rollback()

if openai_embedding_model := st.selectbox(
    "Embedding Model",
    ("text-embedding-3-large", "text-embedding-3-small", "text-embedding-ada-002"),
    help="The model you select will be used to generate embeddings for your chatbot.",
):
    st.session_state["openai_embedding_model"] = openai_embedding_model
    db.update(
        set("openai_embedding_model", openai_embedding_model),
        Query().type == "settings",
    )
    cur.execute("UPDATE settings SET openai_embedding_model=(%s);", (openai_embedding_model,))
    conn.commit()
    if conn:
        conn.rollback()

st.caption("")

st.divider()

st.subheader("Dangerous actions")
st.text("Choose where you would like to store your project data.")

st.caption("")

if st.button(
    "Reset storage",
    disabled="local_db_path" not in st.session_state,
    type="primary",
):
    db = TinyDB(st.session_state["local_db_path"])
    File = Query()
    db.remove(File.type == "settings")
    db.remove(File.type == "model")
    db.remove(File.type == "source")

    cur.execute("DELETE FROM settings;")
    cur.execute("DELETE FROM dbt_models;")

    conn.commit()
    if conn:
        conn.rollback()
    st.toast("Settings cleared from file!", icon="📁")

st.divider()
cur.close()
conn.close()
