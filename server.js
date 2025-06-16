const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load JSON data
const usersFile = path.join(__dirname, 'data', 'users.json');
const messagesFile = path.join(__dirname, 'data', 'messages.json');

let users = [];
let messages = [];

if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
}
if (fs.existsSync(messagesFile)) {
  messages = JSON.parse(fs.readFileSync(messagesFile));
}

// Save data to JSON files
const saveUsers = () => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
const saveMessages = () => fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Se requieren nombre de usuario y contraseña' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'El nombre de usuario ya existe' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, username, password: hashedPassword };
  users.push(user);
  saveUsers();
  res.status(201).json({ message: 'Usuario registrado con éxito' });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, username: user.username });
});

// Search users
app.get('/search/:query', (req, res) => {
  const { query } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(token, SECRET_KEY);
    const foundUsers = users.filter(u => u.username.toLowerCase().includes(query.toLowerCase())).map(u => ({ id: u.id, username: u.username }));
    res.json(foundUsers);
  } catch (error) {
    res.status(401).json({ message: 'No autorizado' });
  }
});

// Get messages between two users
app.get('/messages/:userId1/:userId2', (req, res) => {
  const { userId1, userId2 } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(token, SECRET_KEY);
    const chatMessages = messages.filter(
      m => (m.senderId == userId1 && m.receiverId == userId2) || (m.senderId == userId2 && m.receiverId == userId1)
    );
    res.json(chatMessages);
  } catch (error) {
    res.status(401).json({ message: 'No autorizado' });
  }
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('sendMessage', ({ senderId, receiverId, content }) => {
    const message = {
      id: messages.length + 1,
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString()
    };
    messages.push(message);
    saveMessages();
    io.to(receiverId).emit('receiveMessage', message);
    io.to(senderId).emit('receiveMessage', message);
  });
});

server.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
