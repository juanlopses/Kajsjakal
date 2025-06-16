const socket = io();

let currentUserId = null;
let currentChatId = null;

const searchInput = document.getElementById("searchInput");
const chatList = document.getElementById("chatList");
const messageContainer = document.getElementById("messageContainer");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const chatHeader = document.getElementById("chatHeader");
const typingStatus = document.getElementById("typing-status");
const searchResults = document.getElementById("searchResults");

// Buscar usuarios
searchInput.addEventListener("input", async () => {
  const query = searchInput.value;
  const response = await fetch(`/search/${query}`);
  const users = await response.json();
  searchResults.innerHTML = users.map(user => `
    <div class="chat-item" onclick="startChat(${user.id}, '${user.username}')">
      ${user.username}
    </div>
  `).join('');
});

// Iniciar chat con un usuario
function startChat(userId, username) {
  currentChatId = userId;
  chatHeader.textContent = username;
  messageContainer.innerHTML = '';

  // Mostrar mensajes de chat
  fetch(`/messages/${currentUserId}/${userId}`)
    .then((res) => res.json())
    .then((messages) => {
      messageContainer.innerHTML = messages.map((msg) => `
        <div class="message ${msg.senderId === currentUserId ? 'sent' : 'received'}">
          <div class="bubble">${msg.content}</div>
        </div>
      `).join('');
    });
}

// Enviar mensaje
sendMessageBtn.addEventListener("click", () => {
  const messageContent = messageInput.value;
  if (messageContent.trim()) {
    const message = {
      senderId: currentUserId,
      receiverId: currentChatId,
      content: messageContent,
    };

    socket.emit("sendMessage", message);
    messageInput.value = '';
  }
});

// Actualizar chat cuando llega un nuevo mensaje
socket.on("newMessage", (message) => {
  if (message.receiverId === currentUserId || message.senderId === currentUserId) {
    messageContainer.innerHTML += `
      <div class="message ${message.senderId === currentUserId ? 'sent' : 'received'}">
        <div class="bubble">${message.content}</div>
      </div>
    `;
  }
});

// Notificar que el usuario está escribiendo
messageInput.addEventListener("input", () => {
  if (messageInput.value) {
    typingStatus.textContent = "Escribiendo...";
  } else {
    typingStatus.textContent = "";
  }
});
