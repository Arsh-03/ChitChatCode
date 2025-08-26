// server.js
const express = require('express'); 
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { error } = require('console');
const dummyData = require('./contacts.json');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//cors config middleware
app.use(cors());

// Serve static files (your HTML, CSS, JS)
app.use(express.static("Public"));

// Route to serve the main HTML file
app.get('/', (req, res) =>{
  res.sendFile(path.join(__dirname, '/Public/html/index.html'));
})

// Route to serve the Signup HTML file
app.get('/signup', (req, res) =>{
  res.sendFile(path.join(__dirname, '/Public/html/Signup.html'));
})

// Route to serve the Signin HTML file
app.get('/login', (req, res) =>{
  res.sendFile(path.join(__dirname, '/Public/html/Signin.html'));
})

// Temp Route to serve the room HTML file
app.get('/rooms', (req, res) =>{
  res.sendFile(path.join(__dirname, '/Public/html/room.html'));
})

// Handle new WebSocket connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle incoming messages
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
    // Broadcast the message to everyone else
    io.emit('chat message', msg);
  });

  // Handle user disconnections
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Use the imported JSON data to serve the API endpoint
app.get('/api/dummy-data-contacts', (req, res) => {
  try {
    res.json(dummyData); 
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});