import streamlit as st
from openai import OpenAI

from dbt_llm_tools import VectorStore
from dbt_llm_tools.instructions import ANSWER_QUESTION_INSTRUCTIONS

from menu import menu
from settings import load_session_state_from_db

st.set_page_config(page_title="Chatbot", page_icon="🤖", layout="wide")

menu()
load_session_state_from_db()

is_new_question = len(st.session_state.get("messages", [])) == 0

vector_store = VectorStore(
    db_persist_path=st.session_state.get(
        "vector_store_path", ".local_storage/chroma.db"
    ),
    embedding_model_name=st.session_state.get(
        "openai_embedding_model", "text-embedding-3-large"
    ),
    openai_api_key=st.session_state.get("openai_api_key", ""),
)


def get_matching_models(query):
    return vector_store.query_collection(query=query, n_results=4)


st.title("Question Answerer")
st.text("Ask a chatbot questions about your data!")

if "openai_api_key" not in st.session_state or not st.session_state[
    "openai_api_key"
].startswith("sk-"):
    st.warning("Please enter your OpenAI API key!", icon="⚠")
    CHATBOT_DISABLED = True
else:
    CHATBOT_DISABLED = False
    client = OpenAI(api_key=st.session_state["openai_api_key"])

# Set a default model
if "openai_model" not in st.session_state:
    st.session_state["openai_model"] = "gpt-4-turbo"

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat messages from history on app rerun
for message in st.session_state.messages:
    if message["role"] != "system":
        with st.chat_message(message["role"]):
            st.write(message["content"])

if prompt := st.chat_input("What is up?", disabled=CHATBOT_DISABLED):
    if is_new_question:
        st.session_state.messages += [
            {"role": "system", "content": ANSWER_QUESTION_INSTRUCTIONS},
            {"role": "system", "content": "The user would like to know:"},
        ]

    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    if is_new_question:
        with st.chat_message("system"):
            st.write("I'm looking for the closest models to the question.")

        closest_models = get_matching_models(prompt)

        if closest_models:
            st.session_state.messages.append(
                {
                    "role": "system",
                    "content": "The following information may be used to answer the users question:",
                }
            )

            model_names = ", ".join([model["id"] for model in closest_models])

            with st.chat_message("system"):
                st.write(f"Here are the closest models to the question: {model_names}")

            for model in closest_models:
                st.session_state.messages.append(
                    {"role": "system", "content": model["document"]}
                )

        is_new_question = False

    with st.chat_message("assistant"):
        stream = client.chat.completions.create(
            model=st.session_state["openai_chatbot_model"],
            messages=[
                {"role": m["role"], "content": m["content"]}
                for m in st.session_state.messages
            ],
            stream=True,
        )

        response = st.write_stream(stream)

    st.session_state.messages.append({"role": "assistant", "content": response})


def clear_chat():
    is_new_question = True
    st.session_state.messages = []
    st.toast("Starting over!")


if is_new_question is False:
    st.button("Start over", on_click=clear_chat)
