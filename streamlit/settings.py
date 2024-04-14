import streamlit as st

from tinydb import TinyDB, Query

db = TinyDB(st.session_state.get("local_db_path", ".local_storage/db.json"))


def load_session_state_from_db():
    File = Query()
    settings = db.get(File.type == "settings")

    if settings is not None:
        for key in settings:
            if key != "type":
                st.session_state[key] = settings[key]

    # st.toast("Settings loaded from file!", icon="📁")
