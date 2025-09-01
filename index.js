const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./models/Message'); // Mongoose model for messages

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Public')));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'html', 'index.html'));
});

// Serve signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'html', 'Signup.html'));
});

// Serve signin page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'html', 'Signin.html'));
});

app.get('/rooms', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'html', 'room.html'));
});

// API: Fetch all messages
app.get('/api/messages', async (req, res) => {
  try {
    console.log('Fetching messages from database...');
    const messages = await Message.find().sort({ timestamp: 1 }); // sorted by time asc
    console.log(`Found ${messages.length} messages`);
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Error fetching messages', error: err.message });
  }
});

// API: Send new message
app.post('/api/send', async (req, res) => {
  const { from, to, text, image, isGroup } = req.body;

  if (!from || !to || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newMsg = new Message({
      from,
      to,
      text,
      image: image || '',
      isGroup: isGroup || false,
      timestamp: new Date()
    });

    await newMsg.save();

    // Create chat room ID and emit to specific room
    const chatId = [from, to].sort().join('-');
    io.to(chatId).emit('chat message', newMsg);

    console.log(`Message sent from ${from} to ${to} in room: ${chatId}`);

    res.json({ success: true, message: newMsg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Socket.io connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining a specific room/chat
  socket.on('join chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat: ${chatId}`);
  });

  // Handle leaving a chat
  socket.on('leave chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.id} left chat: ${chatId}`);
  });

  // Handle real-time chat messages
  socket.on('chat message', (msg) => {
    console.log('Message received:', msg);
    
    // Create a unique chat ID for the conversation
    const chatId = [msg.from, msg.to].sort().join('-');
    
    // Emit message only to users in this specific chat room
    io.to(chatId).emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});