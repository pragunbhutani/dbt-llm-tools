import os
import streamlit as st
from tinydb import TinyDB, Query
from tinydb.operations import set

from dbt_llm_tools import DbtProject

from menu import menu
from styles import button_override
from settings import load_session_state_from_db

st.set_page_config(page_title="Configuration", page_icon="🤖", layout="wide")

menu()
button_override()
load_session_state_from_db()

st.title("DBT Project Configuration")

st.divider()

st.subheader("Project Root")
st.text(
    "Enter the path to your DBT project root. This is the folder that contains your dbt_project.yml file."
)

if dbt_project_root := st.text_input(
    label="DBT Project Root",
    help="Path to the folder that contains your dbt_project.yml file.",
    value=st.session_state.get("dbt_project_root", ""),
):
    db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))
    File = Query()

    st.session_state["dbt_project_root"] = dbt_project_root

    db.update(set("dbt_project_root", dbt_project_root), File.type == "settings")


def check_dbt_project(project_root):
    try:
        with open(f"{project_root}/dbt_project.yml", "r") as f:
            return True
    except FileNotFoundError:
        return False


col1, col2 = st.columns([1, 1])

with col1:
    if st.button(
        label="Test",
        disabled="dbt_project_root" not in st.session_state,
        help="Check if the DBT project root is valid.",
    ):
        st.session_state["is_project_root_valid"] = check_dbt_project(dbt_project_root)

with col2:
    if st.button(
        label="Parse Project",
        type="primary",
        help="Parse the DBT project. Project Root must be tested first.",
        disabled=not st.session_state.get("is_project_root_valid", False),
    ):
        dbt_project = DbtProject(
            dbt_project_root=st.session_state["dbt_project_root"],
            database_path=st.session_state["local_db_path"],
        )

        dbt_project.parse()

        st.toast("DBT project parsed!", icon="✅")

if "is_project_root_valid" in st.session_state:
    if st.session_state.get("is_project_root_valid", False):
        st.success("DBT project root is valid!")
    else:
        st.error("DBT project root is invalid!")

st.divider()
