// app.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');

    // Prompt for a username (simple sign-in free approach)
    // const username = prompt("Enter your username:");

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value) {
            // Send the message with the username
            socket.emit('chat message', `${username}: ${input.value}`);
            input.value = '';
        }
    });

    // Listen for new messages from the server
    socket.on('chat message', (msg) => {
        const item = document.createElement('li');
        item.textContent = msg;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });
});

// Logic to toggle show password under sign-in form
const togglepass = () => {
     const passwordinput = document.getElementById('password')
    if (passwordinput.type === "password") { passwordinput.type = "text" }
    else { passwordinput.type = "password"}
}

//Z-index 
function signup() {
    document.getElementById(signup).style.zIndex="1"
    
}