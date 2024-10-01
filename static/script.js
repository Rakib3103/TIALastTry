const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const deleteButton = document.querySelector("#delete-btn");
const uploadButton = document.querySelector("#upload-btn");
const uploadInput = document.querySelector("#upload-input"); // Corrected ID reference

// Load previous chats from localStorage
const loadDataFromLocalStorage = () => {
    const savedChats = localStorage.getItem("all-chats");

    if (savedChats) {
        chatContainer.innerHTML = savedChats;
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    } else {
        showDefaultText();
    }
};

// Show default text if no chat history is found
const showDefaultText = () => {
    const defaultText = `<div class="default-text">
                            <h1>টিয়া আপা</h1>
                            <p>আপাকে জিজ্ঞেস করুন।<br> আপনার চ্যাট এখানে প্রদর্শিত হবে।</p>
                        </div>`;
    chatContainer.innerHTML = defaultText;
};

// Create a chat element (for both user and assistant messages)
const createChatElement = (content, className) => {
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv;
};

// Function to send the message to the Flask backend and display the response
const sendMessage = async () => {
    const userText = chatInput.value.trim();
    if (!userText) return;

    // Display user message in the chat
    const userChat = createChatElement(`<div class="chat-content">
                                            <div class="chat-details">
                                                <img src="/static/images/user.jpg" alt="user-img">
                                                <p>${userText}</p>
                                            </div>
                                        </div>`, "outgoing");
    chatContainer.appendChild(userChat);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);

    // Clear the input field
    chatInput.value = "";

    try {
        // Send the user query to the Flask backend (which communicates with the TIAAPA assistant)
        const response = await fetch("/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: userText,
                chat_history: []  // You can manage chat history here if needed
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Get the assistant's response from the Flask API
        const data = await response.json();
        const botResponse = data.answer;

        // Display assistant message in the chat
        const botChat = createChatElement(`<div class="chat-content">
                                                <div class="chat-details">
                                                    <img src="/static/images/Fixed Pink Pinwheel.png" alt="Fixed Pink Pinwheel.png">
                                                    <p>${botResponse}</p>
                                                </div>
                                            </div>`, "incoming");
        chatContainer.appendChild(botChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);

        // Store the conversation in localStorage
        localStorage.setItem("all-chats", chatContainer.innerHTML);
    } catch (error) {
        console.error("Error while sending message:", error);
        const errorChat = createChatElement(`<div class="chat-content">
                                                 <div class="chat-details">
                                                     <img src="/static/images/Fixed Pink Pinwheel.png" alt="Fixed Pink Pinwheel.png">
                                                     <p class="error">Error: Unable to fetch response.</p>
                                                 </div>
                                             </div>`, "incoming");
        chatContainer.appendChild(errorChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
};

// Handle file upload functionality (for documents or images)
const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Display the file upload message in the chat
    const userChat = createChatElement(`<div class="chat-content">
                                            <div class="chat-details">
                                                <img src="/static/images/user.jpg" alt="user-img">
                                                <p>File uploaded: ${file.name}</p>
                                            </div>
                                        </div>`, "outgoing");
    chatContainer.appendChild(userChat);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.message;

        const botChat = createChatElement(`<div class="chat-content">
                                                <div class="chat-details">
                                                    <img src="/static/images/Fixed Pink Pinwheel.png" alt="Fixed Pink Pinwheel.png">
                                                    <p>${botResponse}</p>
                                                </div>
                                            </div>`, "incoming");
        chatContainer.appendChild(botChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);

        localStorage.setItem("all-chats", chatContainer.innerHTML);
    } catch (error) {
        console.error("Error while uploading file:", error);
        const errorChat = createChatElement(`<div class="chat-content">
                                                 <div class="chat-details">
                                                     <img src="/static/images/Fixed Pink Pinwheel.png" alt="Fixed Pink Pinwheel.png">
                                                     <p class="error">Error: Unable to upload file.</p>
                                                 </div>
                                             </div>`, "incoming");
        chatContainer.appendChild(errorChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
};

// Handle image uploads
const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const imgElement = document.createElement('img');
        imgElement.src = e.target.result;
        imgElement.alt = 'Uploaded Image';
        imgElement.classList.add('chat-image');

        const userChat = createChatElement(`<div class="chat-content">
                                                <div class="chat-details">
                                                    <img src="/static/images/user.jpg" alt="user-img">
                                                </div>
                                            </div>`, "outgoing");
        userChat.querySelector('.chat-details').appendChild(imgElement);
        chatContainer.appendChild(userChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    };
    reader.readAsDataURL(file);
};

// Delete chat history
const deleteChats = () => {
    if (confirm("Are you sure you want to delete all the chats?")) {
        localStorage.removeItem("all-chats");
        showDefaultText();
    }
};

// Event listeners for sending messages, file uploads, and handling chat actions
const handleSendClick = () => {
    sendMessage();
};

const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        sendMessage();
    }
};

loadDataFromLocalStorage();
sendButton.addEventListener("click", handleSendClick);
deleteButton.addEventListener("click", deleteChats);
chatInput.addEventListener("keydown", handleKeyDown);

// Handling the upload button click to trigger the file input
uploadButton.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", handleFileUpload);

// Image upload button behavior
document.querySelector("#add-btn").addEventListener("click", () => {
    document.querySelector("#image-input").click();
});

document.querySelector("#image-input").addEventListener("change", handleImageUpload);
