const express = require("express");
const socketIo = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const SECRET_KEY = 'your-secret-key'; // En un entorno real usa una variable de entorno
const usersFile = path.join(__dirname, "data", "users.json");
const messagesFile = path.join(__dirname, "data", "messages.json");

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Funciones auxiliares para leer y escribir en archivos JSON
function readJsonFile(filePath) {
  const rawData = fs.readFileSync(filePath);
  return JSON.parse(rawData);
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Rutas de autenticación y mensajes
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = readJsonFile(usersFile);

  // Verificar si el nombre de usuario ya está registrado
  if (users.some((user) => user.username === username)) {
    return res.status(400).json({ error: "Usuario ya existe" });
  }

  // Cifrar la contraseña
  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = {
    id: Date.now(),
    username,
    password: hashedPassword,
  };

  users.push(newUser);
  writeJsonFile(usersFile, users);

  // Crear y enviar token JWT
  const token = jwt.sign({ id: newUser.id, username: newUser.username }, SECRET_KEY, {
    expiresIn: "1h",
  });

  res.status(201).json({ token });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readJsonFile(usersFile);

  const user = users.find((user) => user.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
    expiresIn: "1h",
  });

  res.json({ token });
});

app.get("/search/:query", (req, res) => {
  const { query } = req.params;
  const users = readJsonFile(usersFile);

  const results = users.filter((user) => user.username.toLowerCase().includes(query.toLowerCase()));
  res.json(results);
});

app.get("/messages/:userId1/:userId2", (req, res) => {
  const { userId1, userId2 } = req.params;
  const messages = readJsonFile(messagesFile);
  
  const userMessages = messages.filter(
    (msg) =>
      (msg.senderId === parseInt(userId1) && msg.receiverId === parseInt(userId2)) ||
      (msg.senderId === parseInt(userId2) && msg.receiverId === parseInt(userId1))
  );

  res.json(userMessages);
});

// Conexión de Socket.io para chat en tiempo real
io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  socket.on("join", (userId) => {
    socket.join(userId);
  });

  socket.on("sendMessage", (message) => {
    const { senderId, receiverId, content } = message;
    const newMessage = {
      id: Date.now(),
      senderId,
      receiverId,
      content,
      timestamp: new Date(),
    };

    const messages = readJsonFile(messagesFile);
    messages.push(newMessage);
    writeJsonFile(messagesFile, messages);

    io.to(receiverId).emit("newMessage", newMessage);
    socket.emit("newMessage", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se desconectó");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
