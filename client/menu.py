import streamlit as st


def menu():
    with st.sidebar:
        st.title("dbt-llm-tools")

        st.subheader("Menu")
        st.page_link("app.py", label="Homepage", icon="🏠")
        # st.page_link("pages/settings.py", label="Settings", icon="⚙️")
        # st.page_link("pages/links.py", label="Useful Links", icon="🔗")

        st.caption("DBT Settings")
        st.page_link("pages/directory.py", label="Model Explorer", icon="📁")
        st.page_link("pages/vector.py", label="Vector Store for Chatbot", icon="📦")

        st.caption("LLM Tools")
        st.page_link("pages/chat.py", label="Chatbot", icon="💬")
