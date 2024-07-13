import streamlit as st
from tinydb import TinyDB, Query
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from pprint import pprint
from menu import menu

load_dotenv("../.env")
st.set_page_config(page_title="DBT Project Directory", page_icon="🔍", layout="wide")

menu()

st.title("DBT Project Directory")

db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))
Document = Query()

db_params = {
    "dbname": os.environ["DBNAME"],
    "user": os.environ["DB_USER"],
    "password": os.environ["PSWD"],
    "host": os.environ["HOST"],
    "port": os.environ["PORT"],
}
conn = psycopg2.connect(**db_params)
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("SELECT * FROM dbt_models")
all_models = cur.fetchall()
# pprint(all_models)

# all_models = db.search(Document.type == "model")
all_sources = db.search(Document.type == "source")

cur.close()
conn.close()

models_tab, sources_tab = st.tabs(["Models", "Sources"])

with models_tab:
    st.subheader("Models")

    models_display = [
        {
            "name": model["name"],
            "has_documentation": "✅" if model.get("documentation") is not None else "❌",
            "has_interpretation": "✅" if model.get("interpretation") is not None else "❌",
            "path": model.get("relative_path", ""),
        }
        for model in all_models
    ]

    st.dataframe(
        models_display,
        use_container_width=True,
        column_config={"has_documentation": st.column_config.Column(width="small")},
    )

    st.divider()

    st.subheader("Model Details")
    st.caption("Select a model to view its details")

    if selected_model := st.selectbox(
        "Select a model", [model["name"] for model in all_models]
    ):
        model = db.get(Document.name == selected_model)

        if model is not None:
            st.text(model["name"])
            st.caption(model.get("relative_path", ""))
            st.json(model)
            st.divider()

with sources_tab:
    st.subheader("Sources")

    sources_display = [
        {
            "name": source["name"],
            "path": source["yaml_path"],
        }
        for source in all_sources
    ]

    st.dataframe(sources_display, use_container_width=True)
    st.divider()

    if selected_source := st.selectbox(
        "Select a source", [source["name"] for source in all_sources]
    ):
        source = db.get(Document.name == selected_source)

        if source is not None:
            st.text(source["name"])
            st.caption(source.get("yaml_path", ""))
            st.json(source)
            st.divider()
