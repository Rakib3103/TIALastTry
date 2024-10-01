from flask import Flask, request, jsonify, render_template
import os
import json
from werkzeug.utils import secure_filename
from langchain.embeddings import OpenAIEmbeddings
from langchain.indexes.vectorstore import VectorStoreIndexWrapper
from langchain.vectorstores import Chroma
from langchain.chains import ConversationalRetrievalChain
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.chat_models import ChatOpenAI
from langchain.chat_models import ChatOpenAI
import openai
from io import BytesIO
import pytesseract
from PIL import Image
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Access environment variables
APIKEY = os.getenv("APIKEY")
ASSISTANT_ID = os.getenv("ASSISTANT_ID")
app = Flask(__name__)
os.environ["OPENAI_API_KEY"] = APIKEY

# Initialize model and vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma(embedding_function=embeddings)
index = VectorStoreIndexWrapper(vectorstore=vectorstore)
chain = ConversationalRetrievalChain.from_llm(
    llm=ChatOpenAI(model="gpt-3.5-turbo"),
    retriever=index.vectorstore.as_retriever(search_kwargs={"k": 1}),
)

# Cache to store responses
response_cache = {}

# Route for frontend
@app.route('/')
def index():
    return render_template('Frontend.html')

# Query route
@app.route('/query', methods=['POST'])
def query():
    data = request.json
    question = data.get('question')
    chat_history = data.get('chat_history', [])

    if not question:
        return jsonify({"message": "No question provided"}), 400

    try:
        # Construct messages from chat history and current question
        messages = [{"role": "system", "content": "You are a helpful assistant."}]
        for msg in chat_history:
            messages.append({"role": msg['role'], "content": msg['content']})
        messages.append({"role": "user", "content": question})

        # Make a request to the OpenAI Chat API
        response = openai.ChatCompletion.create(
            model="gpt-4",  # Specify the model, e.g., gpt-4 or gpt-3.5-turbo
            messages=messages,
            max_tokens=4000  # Reduced max tokens to avoid errors
        )

        # Extract the response content
        answer = response.choices[0].message.content
        return jsonify({"answer": answer}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"message": "An unexpected error occurred", "error": str(e)}), 500

# Step 1: Create Assistant (for demonstration)
@app.route('/create_assistant', methods=['POST'])
def create_assistant():
    data = request.json
    name = data.get("name")
    instructions = data.get("instructions")
    temperature = data.get("temperature", 0.7)  # default temperature
    top_p = data.get("top_p", 1.0)  # default top_p
    tools = data.get("tools", [])  # default empty tools

    try:
        assistant = openai.Assistant.create(
            name=name,
            instructions=instructions,
            model="gpt-3.5-turbo",
            temperature=temperature,
            top_p=top_p,
            tools=tools
        )
        assistant_id = assistant['id']
        return jsonify({"assistant_id": assistant_id}), 200
    except Exception as e:
        print(f"Error creating assistant: {e}")
        return jsonify({"message": "Failed to create assistant", "error": str(e)}), 500

# Step 2: Create a Thread
@app.route('/create_thread', methods=['POST'])
def create_thread():
    try:
        thread = openai.Thread.create()
        thread_id = thread['id']
        return jsonify({"thread_id": thread_id}), 200
    except Exception as e:
        print(f"Error creating thread: {e}")
        return jsonify({"message": "Failed to create thread", "error": str(e)}), 500

# Step 3: Add a message to a thread
@app.route('/add_message', methods=['POST'])
def add_message():
    data = request.json
    thread_id = data.get('thread_id')
    message_content = data.get('message', "hi!")

    try:
        message = openai.ThreadMessage.create(
            thread_id=thread_id,
            role="user",
            content=message_content
        )
        return jsonify({"message_id": message['id'], "content": message['content']}), 200
    except Exception as e:
        print(f"Error adding message to thread: {e}")
        return jsonify({"message": "Failed to add message", "error": str(e)}), 500

# Step 4: Process the message and tools in the thread (without streaming)
@app.route('/process_message', methods=['POST'])
def process_message():
    data = request.json
    thread_id = data.get('thread_id')
    assistant_id = ASSISTANT_ID  # Retrieve this from env or pass it dynamically

    try:
        run = openai.ThreadRun.create_and_poll(thread_id=thread_id, assistant_id=assistant_id)

        tool_outputs = []
        if run['status'] == "requires_action":
            try:
                for tool in run['required_action']['submit_tool_outputs']['tool_calls']:
                    args = json.loads(tool['function']['arguments'])
                    function_name = tool['function']['name']
                    
                    # Here you should call your tools and capture output
                    op = "Tool executed successfully"  # Placeholder for actual tool output
                    
                    tool_outputs.append({
                        "tool_call_id": tool['id'],
                        "output": json.dumps(op),
                    })

                if tool_outputs:
                    run = openai.ThreadRun.submit_tool_outputs_and_poll(
                        thread_id=thread_id,
                        run_id=run['id'],
                        tool_outputs=tool_outputs
                    )

            except Exception as e:
                print(f"Error processing tool outputs: {e}")
                return jsonify({"message": "Error processing tool outputs", "error": str(e)}), 500

        if run['status'] == "completed":
            messages = openai.ThreadMessage.list(thread_id=thread_id)
            return jsonify({"assistant_message": messages['data'][0]['content']}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"message": "An unexpected error occurred", "error": str(e)}), 500

