const socket = io();
let token, currentUser, currentChatUser;

const authDiv = document.getElementById('auth');
const chatDiv = document.getElementById('chat');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const toggleAuth = document.getElementById('toggle-auth');
const searchInput = document.getElementById('search');
const userList = document.getElementById('user-list');
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatWith = document.getElementById('chat-with');

let isLogin = true;

toggleAuth.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'Iniciar Sesión' : 'Registrarse';
  toggleAuth.textContent = isLogin ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia sesión';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const endpoint = isLogin ? '/login' : '/register';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    if (isLogin) {
      token = data.token;
      currentUser = { id: jwt_decode(token).id, username: data.username };
      authDiv.style.display = 'none';
      chatDiv.style.display = 'flex';
      socket.emit('join', currentUser.id.toString());
    }
    alert(data.message);
  } catch (error) {
    alert(error.message);
  }
});

searchInput.addEventListener('input', async () => {
  const query = searchInput.value;
  if (!query) {
    userList.innerHTML = '';
    return;
  }
  try {
    const response = await fetch(`/search/${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await response.json();
    userList.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user.username;
      li.onclick = () => startChat(user);
      userList.appendChild(li);
    });
  } catch (error) {
    console.error(error);
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentChatUser) return;
  const content = messageInput.value;
  if (!content) return;
  const message = {
    senderId: currentUser.id,
    receiverId: currentChatUser.id,
    content
  };
  socket.emit('sendMessage', message);
  messageInput.value = '';
});

socket.on('receiveMessage', (message) => {
  if (
    (message.senderId === currentUser.id && message.receiverId === currentChatUser?.id) ||
    (message.senderId === currentChatUser?.id && message.receiverId === currentUser.id)
  ) {
    displayMessage(message);
  }
});

async function startChat(user) {
  currentChatUser = user;
  chatWith.textContent = `Chateando con ${user.username}`;
  messagesDiv.innerHTML = '';
  try {
    const response = await fetch(`/messages/${currentUser.id}/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const messages = await response.json();
    messages.forEach(displayMessage);
  } catch (error) {
    console.error(error);
  }
}

function displayMessage(message) {
  const div = document.createElement('div');
  div.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
  div.textContent = message.content;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Simple JWT decode function
function jwt_decode(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}
