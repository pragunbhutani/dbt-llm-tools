import streamlit as st
from menu import menu

from openai import OpenAI

st.set_page_config(page_title="Chatbot", page_icon="🤖", layout="wide")

menu()

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
    with st.chat_message(message["role"]):
        st.write(message["content"])

if prompt := st.chat_input("What is up?", disabled=CHATBOT_DISABLED):
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        stream = client.chat.completions.create(
            model=st.session_state["openai_model"],
            messages=[
                {"role": m["role"], "content": m["content"]}
                for m in st.session_state.messages
            ],
            stream=True,
        )

        response = st.write_stream(stream)

    st.session_state.messages.append({"role": "assistant", "content": response})
