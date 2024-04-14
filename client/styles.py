import streamlit as st


def button_override():
    st.markdown(
        """
    <style>
        div[data-testid="column"] {
            width: fit-content !important;
            flex: unset;
        }
        div[data-testid="column"] * {
            width: fit-content !important;
        }
    </style>
    """,
        unsafe_allow_html=True,
    )
