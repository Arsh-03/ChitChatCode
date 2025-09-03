// server.js - Complete backend server with MongoDB integration
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchatcode';

mongoose.connect(MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    messageType: { type: String, default: 'text' },
    isGroup: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// Room Schema
const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    creator: { type: String, required: true },
    members: [{ type: String }],
    avatar: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    password: { type: String, default: '' }
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

// Routes

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public','html', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'html', 'Signin.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'html', 'Signup.html'));
});

app.get('/room', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'html', 'room.html'));
});

// Authentication routes
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user: { username, email }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email or username
        const user = await User.findOne({ 
            $or: [{ email }, { username: email }] 
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update user online status
        await User.findByIdAndUpdate(user._id, { 
            isOnline: true, 
            lastSeen: new Date() 
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Server error during signin' });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }).sort({ username: 1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error fetching users' });
    }
});

// Get messages (direct messages)
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find({ isGroup: false })
            .sort({ timestamp: 1 })
            .limit(100);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Server error fetching messages' });
    }
});

// Get messages for specific room
app.get('/api/messages/room/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ room: roomId, isGroup: true })
            .sort({ timestamp: 1 })
            .limit(100);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching room messages:', error);
        res.status(500).json({ error: 'Server error fetching room messages' });
    }
});

// Send direct message
app.post('/api/send', async (req, res) => {
    try {
        const { from, to, text, sender, receiver, message } = req.body;

        const messageData = {
            sender: sender || from,
            receiver: receiver || to,
            message: message || text,
            timestamp: new Date(),
            isGroup: false
        };

        const newMessage = new Message(messageData);
        const savedMessage = await newMessage.save();

        // Broadcast via socket
        io.emit('chat message', {
            ...savedMessage.toObject(),
            from: messageData.sender,
            to: messageData.receiver,
            text: messageData.message
        });

        res.json({ success: true, message: savedMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Server error sending message' });
    }
});

// Send room message
app.post('/api/send/room', async (req, res) => {
    try {
        const { from, text, room, sender, message, roomId } = req.body;

        const messageData = {
            sender: sender || from,
            room: roomId || room,
            message: message || text,
            timestamp: new Date(),
            isGroup: true
        };

        const newMessage = new Message(messageData);
        const savedMessage = await newMessage.save();

        // Broadcast to room via socket
        io.to(roomId || room).emit('chat message', {
            ...savedMessage.toObject(),
            from: messageData.sender,
            text: messageData.message,
            room: messageData.room
        });

        res.json({ success: true, message: savedMessage });
    } catch (error) {
        console.error('Error sending room message:', error);
        res.status(500).json({ error: 'Server error sending room message' });
    }
});

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await Room.find().sort({ createdAt: -1 });
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Server error fetching rooms' });
    }
});

// Create room
app.post('/api/rooms/create', async (req, res) => {
    try {
        const { name, description, creator, members } = req.body;

        if (!name || !creator) {
            return res.status(400).json({ error: 'Room name and creator are required' });
        }

        const newRoom = new Room({
            name,
            description: description || '',
            creator,
            members: members || [creator]
        });

        const savedRoom = await newRoom.save();
        res.json({ success: true, room: savedRoom });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Server error creating room' });
    }
});

// Join room
app.post('/api/rooms/join/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { user } = req.body;

        if (!user) {
            return res.status(400).json({ error: 'User is required' });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Add user to room if not already a member
        if (!room.members.includes(user)) {
            room.members.push(user);
            await room.save();
        }

        res.json({ success: true, room });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ error: 'Server error joining room' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a room
    socket.on('join room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
        
        socket.to(roomId).emit('user joined room', {
            socketId: socket.id,
            roomId: roomId
        });
    });

    // Handle leaving a room
    socket.on('leave room', (roomId) => {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
        
        socket.to(roomId).emit('user left room', {
            socketId: socket.id,
            roomId: roomId
        });
    });

    // Handle joining a private chat
    socket.on('join chat', (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined chat ${chatId}`);
    });

    // Handle leaving a private chat
    socket.on('leave chat', (chatId) => {
        socket.leave(chatId);
        console.log(`Socket ${socket.id} left chat ${chatId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Handle direct message via socket (legacy support)
    socket.on('chat message', (msg) => {
        console.log('Message received via socket:', msg);
        socket.broadcast.emit('chat message', msg);
    });

    // Handle room message via socket (legacy support)
    socket.on('room message', (data) => {
        console.log('Room message received:', data);
        socket.to(data.room).emit('chat message', data);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB connected to: ${MONGODB_URI}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await mongoose.connection.close();
    server.close(() => {
        console.log('Process terminated');
    });
});