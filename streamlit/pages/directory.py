import streamlit as st
from tinydb import TinyDB, Query

from menu import menu

st.set_page_config(page_title="DBT Project Directory", page_icon="🔍", layout="wide")

menu()

st.title("DBT Project Directory")

db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))
Document = Query()

all_models = db.search(Document.type == "model")
all_sources = db.search(Document.type == "source")

models_tab, sources_tab = st.tabs(["Models", "Sources"])

with models_tab:
    st.subheader("Models")

    models_display = [
        {
            "name": model["name"],
            "has_documentation": "✅" if "documentation" in model else "❌",
            "has_interpretation": "✅" if "interpretation" in model else "❌",
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
