import streamlit as st
from tinydb import TinyDB, Query

from menu import menu

st.set_page_config(page_title="DBT Project Directory", page_icon="🔍", layout="wide")

menu()

st.title("DBT Project Directory")

db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))
Document = Query()

all_models = db.search(Document.type == "model")
models_to_display = all_models

all_sources = db.search(Document.type == "source")
sources_to_display = all_sources

models_tab, sources_tab = st.tabs(["Models", "Sources"])

with models_tab:
    st.subheader("Models")
    if model_search_key := st.text_input("Search", key="model_search"):
        models_to_display = [
            model
            for model in all_models
            if model_search_key.lower() in model["name"].lower()
        ]

    st.divider()

    for model in models_to_display:
        st.write(model["name"])
        st.caption(model["relative_path"])

        with st.expander("Model Details"):
            st.json(model)

        st.divider()

with sources_tab:
    st.text_input("Search", key="source_search")
    st.divider()

    st.header("Sources")

    for source in all_sources:
        st.write(source["name"])
        st.caption(source.get("description", ""))

        with st.expander("Source Details"):
            st.json(source)

        st.divider()
