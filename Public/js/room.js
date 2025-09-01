// room.js

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

const currentUser = "You"; // Ideally this should be set dynamically from login
let currentReceiver = null; // Will be set when user clicks on a contact

// Function to add message to chat container
function addMessage(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');

  // Determine if message is outgoing or incoming
  if (msg.from === currentUser) {
    messageDiv.classList.add('outgoing');
  } else {
    messageDiv.classList.add('incoming');
  }

  // Create message content with proper structure
  messageDiv.innerHTML = `
    <div class="message-avatar">
      <img src="https://via.placeholder.com/32" alt="${msg.from}">
    </div>
    <div class="message-content">
      <div class="sender-name">${msg.from}</div>
      <p>${msg.text}</p>
      <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
    </div>
  `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll down
}

// Load existing messages on page load
async function loadMessages() {
  try {
    console.log('Loading messages...');
    const res = await fetch('/api/messages');
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const messages = await res.json();
    console.log('Messages fetched:', messages);

    messagesContainer.innerHTML = ''; // Clear old messages

    // Only show messages for the currently selected chat
    if (!currentReceiver) {
      const noUserDiv = document.createElement('div');
      noUserDiv.innerHTML = '<p style="text-align: center; color: #666;">Select a contact to view messages</p>';
      messagesContainer.appendChild(noUserDiv);
      return;
    }

    // Filter messages for current chat
    const filtered = messages.filter(
      m => (m.from === currentUser && m.to === currentReceiver) ||
           (m.from === currentReceiver && m.to === currentUser)
    );

    if (filtered.length === 0) {
      console.log('No messages found for this chat');
      const noMsgDiv = document.createElement('div');
      noMsgDiv.innerHTML = '<p style="text-align: center; color: #666;">No messages yet. Start a conversation!</p>';
      messagesContainer.appendChild(noMsgDiv);
      return;
    }

    filtered.forEach(addMessage);
  } catch (err) {
    console.error('Error loading messages:', err);
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `<p style="text-align: center; color: red;">Error loading messages: ${err.message}</p>`;
    messagesContainer.appendChild(errorDiv);
  }
}

loadMessages();

// Listen for new messages via socket.io
socket.on('chat message', (msg) => {
  console.log('New message received via socket:', msg);
  
  // Only show message if it's for the current active chat
  if (currentReceiver && (
    (msg.from === currentUser && msg.to === currentReceiver) ||
    (msg.from === currentReceiver && msg.to === currentUser)
  )) {
    addMessage(msg);
  }
});

// Send message function
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  // Check if a user is selected
  if (!currentReceiver) {
    alert('Please select a contact to send message to');
    return;
  }

  const msgData = {
    from: currentUser,
    to: currentReceiver,
    text,
    isGroup: false,
    image: ''
  };

  console.log('Sending message:', msgData);

  // Send to backend to store and broadcast
  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgData)
    });
    const data = await res.json();

    if (data.success) {
      msgInput.value = '';
      console.log('Message sent successfully');
      // Message will appear from socket event
    } else {
      alert('Failed to send message: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Send message error:', err);
    alert('Network error: Could not send message');
  }
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

// Sample contacts data (you should load this from your backend)
const contacts = [
  {
    name: "John Doe",
    lastSeen: "2 min ago",
    avatar: "https://via.placeholder.com/40"
  },
  {
    name: "Jane Smith", 
    lastSeen: "5 min ago",
    avatar: "https://via.placeholder.com/40"
  },
  {
    name: "Mike Johnson",
    lastSeen: "1 hour ago", 
    avatar: "https://via.placeholder.com/40"
  }
];

// Load contacts into the contacts list
function loadContacts() {
  const contactsList = document.getElementById('contacts-list');
  
  contacts.forEach(contact => {
    const contactDiv = document.createElement('div');
    contactDiv.classList.add('contact-item');
    
    contactDiv.innerHTML = `
      <div class="contact-avatar">
        <img src="${contact.avatar}" alt="${contact.name}">
      </div>
      <div class="contact-info">
        <h4>${contact.name}</h4>
        <div class="last-seen">${contact.lastSeen}</div>
      </div>
    `;
    
    contactDiv.addEventListener('click', () => {
      // Remove active class from all contacts
      document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Add active class to clicked contact
      contactDiv.classList.add('active');
      
      // Update chat header
      updateChatHeader(contact);
    });
    
    contactsList.appendChild(contactDiv);
  });
}

// Update chat header when contact is selected
function updateChatHeader(contact) {
  const chatAvatar = document.querySelector('.chat-avatar img');
  const userDetails = document.getElementById('user-details');
  
  chatAvatar.src = contact.avatar;
  chatAvatar.alt = contact.name;
  
  userDetails.innerHTML = `
    <h3>${contact.name}</h3>
    <span class="status online">Online</span>
  `;
  
  // Leave previous chat room if any
  if (currentReceiver) {
    const oldChatId = [currentUser, currentReceiver].sort().join('-');
    socket.emit('leave chat', oldChatId);
  }
  
  // Set the current receiver for messaging
  currentReceiver = contact.name;
  console.log('Current receiver set to:', currentReceiver);
  
  // Join the new chat room
  const newChatId = [currentUser, currentReceiver].sort().join('-');
  socket.emit('join chat', newChatId);
  
  // Reload messages for this contact
  loadMessages();
}

// Initialize contacts on page load
loadContacts();

// Add connection status logging
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});