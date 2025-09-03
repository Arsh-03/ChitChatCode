// room.js with MongoDB integration and mobile responsiveness

// Check if Socket.io is loaded
if (typeof io === 'undefined') {
  console.error('Socket.io not loaded! Make sure to include the socket.io client script.');
  alert('Socket.io not loaded! Please check the console for errors.');
} else {
  console.log('Socket.io loaded successfully');
}

const socket = io(); // connect to socket.io server

const messagesContainer = document.querySelector('.chat-messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

// Get current user from session/localStorage or prompt
let currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || "Anonymous User";
let currentReceiver = null;
let currentRoom = null;

// Mobile navigation state
let isMobileView = window.innerWidth <= 768;
let currentMobileView = 'contacts';

// Update mobile view state on resize
window.addEventListener('resize', () => {
  const wasMobile = isMobileView;
  isMobileView = window.innerWidth <= 768;
  
  if (wasMobile !== isMobileView) {
    if (!isMobileView) {
      // Switching to desktop view
      document.body.classList.remove('mobile-view-contacts', 'mobile-view-chat');
      document.querySelector('.contacts-panel').style.display = 'flex';
      document.querySelector('.chat-panel').style.display = 'flex';
    } else {
      // Switching to mobile view
      showMobileView(currentMobileView);
    }
  }
});

// Mobile navigation functions
function showMobileView(view) {
  if (!isMobileView) return;
  
  currentMobileView = view;
  document.body.classList.remove('mobile-view-contacts', 'mobile-view-chat');
  
  if (view === 'contacts') {
    document.body.classList.add('mobile-view-contacts');
  } else if (view === 'chat') {
    document.body.classList.add('mobile-view-chat');
  }
}

function showContactsList() {
  showMobileView('contacts');
}

function showChatView() {
  showMobileView('chat');
}

// Initialize mobile view
function initializeMobileView() {
  if (isMobileView) {
    // Start with contacts view on mobile
    showMobileView('contacts');
    
    // Add back button to chat header
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader && !chatHeader.querySelector('.mobile-back-btn')) {
      const backBtn = document.createElement('button');
      backBtn.className = 'mobile-back-btn';
      backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
      backBtn.addEventListener('click', showContactsList);
      chatHeader.insertBefore(backBtn, chatHeader.firstChild);
    }
  }
}

// Function to add message to chat container
function addMessage(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');

  // Determine if message is outgoing or incoming
  if (msg.from === currentUser || msg.sender === currentUser) {
    messageDiv.classList.add('outgoing');
  } else {
    messageDiv.classList.add('incoming');
  }

  // Create message content with proper structure
  const senderName = msg.from || msg.sender || 'Unknown';
  const messageText = msg.text || msg.message || '';
  const timestamp = msg.timestamp || msg.createdAt || new Date();

  messageDiv.innerHTML = `
    <div class="message-avatar">
      <img src="https://via.placeholder.com/32/359646/ffffff?text=${senderName.charAt(0)}" alt="${senderName}">
    </div>
    <div class="message-content">
      <div class="sender-name">${senderName}</div>
      <p>${messageText}</p>
      <div class="message-time">${new Date(timestamp).toLocaleTimeString()}</div>
    </div>
  `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll down
}

// Load messages from MongoDB
async function loadMessages() {
  try {
    console.log('Loading messages from MongoDB...');
    
    if (!currentReceiver && !currentRoom) {
      messagesContainer.innerHTML = `
        <div style="text-align: center; color: #666; padding: 40px;">
          <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
          <p>Select a contact to view messages</p>
        </div>`;
      return;
    }

    const endpoint = currentRoom ? `/api/messages/room/${currentRoom}` : `/api/messages`;
    const res = await fetch(endpoint);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const messages = await res.json();
    console.log('Messages fetched from MongoDB:', messages);

    messagesContainer.innerHTML = ''; // Clear old messages

    if (!messages || messages.length === 0) {
      console.log('No messages found');
      messagesContainer.innerHTML = `
        <div style="text-align: center; color: #666; padding: 40px;">
          <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
          <p>No messages yet. Start a conversation!</p>
        </div>`;
      return;
    }

    // Filter messages if not in a room
    let filteredMessages = messages;
    if (!currentRoom && currentReceiver) {
      filteredMessages = messages.filter(
        m => (m.from === currentUser && m.to === currentReceiver) ||
             (m.from === currentReceiver && m.to === currentUser) ||
             (m.sender === currentUser && m.receiver === currentReceiver) ||
             (m.sender === currentReceiver && m.receiver === currentUser)
      );
    }

    filteredMessages.forEach(addMessage);
  } catch (err) {
    console.error('Error loading messages from MongoDB:', err);
    messagesContainer.innerHTML = `
      <div style="text-align: center; color: red; padding: 40px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
        <p>Error loading messages: ${err.message}</p>
        <button onclick="loadMessages()" style="margin-top: 10px; padding: 8px 16px; border: none; background: #359646; color: white; border-radius: 4px; cursor: pointer;">Retry</button>
      </div>`;
  }
}

// Load rooms from MongoDB
async function loadRooms() {
  try {
    const res = await fetch('/api/rooms');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const rooms = await res.json();
    console.log('Rooms loaded from MongoDB:', rooms);
    
    // Add rooms to contacts list
    const contactsList = document.getElementById('contacts-list');
    
    rooms.forEach(room => {
      const roomDiv = document.createElement('div');
      roomDiv.classList.add('contact-item', 'room-item');
      roomDiv.dataset.roomId = room._id || room.id;
      
      roomDiv.innerHTML = `
        <div class="contact-avatar">
          <img src="https://via.placeholder.com/40/bd10e0/ffffff?text=${room.name.charAt(0)}" alt="${room.name}">
        </div>
        <div class="contact-info">
          <h4>${room.name}</h4>
          <div class="last-seen">Room • ${room.members ? room.members.length : 0} members</div>
        </div>
      `;
      
      roomDiv.addEventListener('click', () => {
        selectRoom(room, roomDiv);
      });
      
      contactsList.appendChild(roomDiv);
    });
    
  } catch (err) {
    console.error('Error loading rooms:', err);
  }
}

// Load users/contacts from MongoDB
async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const users = await res.json();
    console.log('Users loaded from MongoDB:', users);
    
    const contactsList = document.getElementById('contacts-list');
    
    users.forEach(user => {
      if (user.username !== currentUser && user.email !== currentUser) {
        const userDiv = document.createElement('div');
        userDiv.classList.add('contact-item', 'user-item');
        
        userDiv.innerHTML = `
          <div class="contact-avatar">
            <img src="https://via.placeholder.com/40/4a90e2/ffffff?text=${(user.username || user.email).charAt(0)}" alt="${user.username || user.email}">
          </div>
          <div class="contact-info">
            <h4>${user.username || user.email}</h4>
            <div class="last-seen">User • Last seen recently</div>
          </div>
        `;
        
        userDiv.addEventListener('click', () => {
          selectUser(user, userDiv);
        });
        
        contactsList.appendChild(userDiv);
      }
    });
    
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

// Listen for new messages via socket.io
socket.on('chat message', (msg) => {
  console.log('New message received via socket:', msg);
  
  // Only show message if it's for the current active chat or room
  const isForCurrentChat = currentReceiver && (
    (msg.from === currentUser && msg.to === currentReceiver) ||
    (msg.from === currentReceiver && msg.to === currentUser) ||
    (msg.sender === currentUser && msg.receiver === currentReceiver) ||
    (msg.sender === currentReceiver && msg.receiver === currentUser)
  );
  
  const isForCurrentRoom = currentRoom && (msg.room === currentRoom || msg.roomId === currentRoom);
  
  if (isForCurrentChat || isForCurrentRoom) {
    addMessage(msg);
  }
});

// Send message function with MongoDB integration
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  // Check if a user or room is selected
  if (!currentReceiver && !currentRoom) {
    alert('Please select a contact or join a room to send messages');
    return;
  }

  const msgData = {
    from: currentUser,
    sender: currentUser,
    text: text,
    message: text,
    timestamp: new Date(),
    isGroup: !!currentRoom
  };

  // Add room/receiver info
  if (currentRoom) {
    msgData.room = currentRoom;
    msgData.roomId = currentRoom;
  } else {
    msgData.to = currentReceiver;
    msgData.receiver = currentReceiver;
  }

  console.log('Sending message to MongoDB:', msgData);

  try {
    // Send to backend to store in MongoDB and broadcast
    const endpoint = currentRoom ? '/api/send/room' : '/api/send';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgData)
    });
    
    const data = await res.json();

    if (data.success || res.ok) {
      msgInput.value = '';
      console.log('Message sent successfully to MongoDB');
      // Message will appear from socket event
    } else {
      alert('Failed to send message: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Send message error:', err);
    alert('Network error: Could not send message');
  }
}

// Handle room selection
function selectRoom(room, roomElement) {
  // Remove active class from all contacts
  document.querySelectorAll('.contact-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to clicked room
  roomElement.classList.add('active');
  
  // Set current room and clear current receiver
  currentRoom = room._id || room.id;
  currentReceiver = null;
  
  // Update chat header
  updateChatHeader({
    name: room.name,
    avatar: `https://via.placeholder.com/40/bd10e0/ffffff?text=${room.name.charAt(0)}`,
    status: `Room • ${room.members ? room.members.length : 0} members`
  });
  
  // Join room via socket
  socket.emit('join room', currentRoom);
  
  // On mobile, switch to chat view
  if (isMobileView) {
    showChatView();
  }
  
  // Load messages for this room
  loadMessages();
}

// Handle user selection
function selectUser(user, userElement) {
  // Remove active class from all contacts
  document.querySelectorAll('.contact-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to clicked user
  userElement.classList.add('active');
  
  // Set current receiver and clear current room
  currentReceiver = user.username || user.email;
  currentRoom = null;
  
  // Update chat header
  updateChatHeader({
    name: user.username || user.email,
    avatar: `https://via.placeholder.com/40/4a90e2/ffffff?text=${(user.username || user.email).charAt(0)}`,
    status: 'Online'
  });
  
  // Leave room if any
  if (currentRoom) {
    socket.emit('leave room', currentRoom);
  }
  
  // On mobile, switch to chat view
  if (isMobileView) {
    showChatView();
  }
  
  // Load messages for this user
  loadMessages();
}

// Update chat header when contact/room is selected
function updateChatHeader(contact) {
  const chatAvatar = document.querySelector('.chat-avatar img');
  const userDetails = document.getElementById('user-details');
  
  chatAvatar.src = contact.avatar;
  chatAvatar.alt = contact.name;
  
  userDetails.innerHTML = `
    <h3>${contact.name}</h3>
    <span class="status online">${contact.status}</span>
  `;
  
  console.log('Chat header updated for:', contact.name);
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

// Send message on Enter key press
msgInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Navigation functionality
document.querySelectorAll('.nav-icon').forEach((icon, index) => {
  icon.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Remove active class from all icons
    document.querySelectorAll('.nav-icon').forEach(nav => nav.classList.remove('active'));
    
    // Add active class to clicked icon
    icon.classList.add('active');
    
    // Handle different navigation items
    switch(index) {
      case 0: // Plus icon - Create new room
        toggleCreateRoom();
        break;
      case 1: // Group icon - Join room
        toggleJoinRoom();
        break;
      case 2: // Settings icon
        console.log('Settings clicked');
        break;
    }
  });
});

// Toggle create room form
function toggleCreateRoom() {
  const newRoom = document.querySelector('.new-room');
  const joinTab = document.querySelector('.join-tab');
  
  if (newRoom.style.display === 'none' || !newRoom.style.display) {
    newRoom.style.display = 'block';
    joinTab.style.display = 'none';
    
    // Generate a random room ID
    const roomId = Math.random().toString(36).substring(2, 15);
    document.querySelector('.roomid').textContent = `Room ID: ${roomId}`;
  } else {
    newRoom.style.display = 'none';
  }
}

// Toggle join room form
function toggleJoinRoom() {
  const joinTab = document.querySelector('.join-tab');
  const newRoom = document.querySelector('.new-room');
  
  if (joinTab.style.display === 'none' || !joinTab.style.display) {
    joinTab.style.display = 'flex';
    newRoom.style.display = 'none';
  } else {
    joinTab.style.display = 'none';
  }
}

// Handle room creation
async function createRoom() {
  const roomNameInput = document.querySelector('input[name="Room-name"]');
  const roomDescInput = document.querySelector('input[name="Room-desc"]');
  const roomImageInput = document.querySelector('input[name="Room-image"]');
  
  if (!roomNameInput.value.trim()) {
    alert('Please enter a room name');
    return;
  }
  
  const roomData = {
    name: roomNameInput.value.trim(),
    description: roomDescInput.value.trim(),
    creator: currentUser,
    members: [currentUser]
  };
  
  try {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomData)
    });
    
    const data = await res.json();
    
    if (data.success || res.ok) {
      alert('Room created successfully!');
      roomNameInput.value = '';
      roomDescInput.value = '';
      roomImageInput.value = '';
      document.querySelector('.new-room').style.display = 'none';
      
      // Reload rooms
      loadRooms();
    } else {
      alert('Failed to create room: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error creating room:', err);
    alert('Network error: Could not create room');
  }
}

// Handle room joining
async function joinRoom() {
  const roomIdInput = document.querySelector('input[name="Join-room"]');
  const roomId = roomIdInput.value.trim();
  
  if (!roomId) {
    alert('Please enter a room ID');
    return;
  }
  
  try {
    const res = await fetch(`/api/rooms/join/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser })
    });
    
    const data = await res.json();
    
    if (data.success || res.ok) {
      alert('Joined room successfully!');
      roomIdInput.value = '';
      document.querySelector('.join-tab').style.display = 'none';
      
      // Reload rooms
      loadRooms();
    } else {
      alert('Failed to join room: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error joining room:', err);
    alert('Network error: Could not join room');
  }
}

// Add event listeners for room functionality
document.addEventListener('DOMContentLoaded', () => {
  // Create room button
  const createBtn = document.querySelector('.create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', createRoom);
  }
  
  // Join room button
  const joinBtn = document.querySelector('.sec-btn');
  if (joinBtn) {
    joinBtn.addEventListener('click', joinRoom);
  }
});

// Search functionality
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
      const contactName = item.querySelector('h4').textContent.toLowerCase();
      if (contactName.includes(searchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

// Initialize the app
async function initializeApp() {
  console.log('Initializing app with MongoDB connection...');
  
  try {
    // Load data from MongoDB
    await Promise.all([
      loadUsers(),
      loadRooms()
    ]);
    
    // Initialize mobile view
    initializeMobileView();
    
    // Load initial messages
    loadMessages();
    
    // If on mobile and no contact selected, ensure we're showing contacts
    if (isMobileView && !currentReceiver && !currentRoom) {
      showContactsList();
    }
    
    console.log('App initialized successfully with MongoDB data');
  } catch (err) {
    console.error('Error initializing app:', err);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Socket connection handlers
socket.on('connect', () => {
  console.log('Connected to server with MongoDB backend');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Handle room events
socket.on('user joined room', (data) => {
  console.log('User joined room:', data);
  if (currentRoom === data.roomId) {
    addMessage({
      from: 'System',
      text: `${data.user} joined the room`,
      timestamp: new Date()
    });
  }
});

socket.on('user left room', (data) => {
  console.log('User left room:', data);
  if (currentRoom === data.roomId) {
    addMessage({
      from: 'System',
      text: `${data.user} left the room`,
      timestamp: new Date()
    });
  }
});

// Handle browser back button on mobile
window.addEventListener('popstate', (e) => {
  if (isMobileView && currentMobileView === 'chat') {
    showContactsList();
  }
});