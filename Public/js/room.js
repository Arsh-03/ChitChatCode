const contact_list = document.getElementById('contacts-list');
const chatUserName = document.querySelector('.chat-panel .chat-header .user-details h3');
const chatUserPfp = document.querySelector('.chat-panel .chat-header .chat-user-info .chat-avatar img');
const chatMessagesContainer = document.querySelector('.chat-panel .chat-messages');

let activeContact = null;
let allContactsData = []; 

const ActiveContact = (contact_item) => {
    contact_item.addEventListener('click', (e) => {
        if (activeContact) {
            activeContact.classList.remove('active');
        }
        e.currentTarget.classList.add('active');
        activeContact = e.currentTarget;

        const newUserName = activeContact.dataset.username;
        const newUserPfp = activeContact.dataset.image;

        if (chatUserName) {
            chatUserName.textContent = newUserName;
        }
        if (chatUserPfp) {
            chatUserPfp.src = newUserPfp;
            chatUserPfp.alt = newUserName;
        }

        const selectedContactData = allContactsData.find(c => c.Username === newUserName);

        if (selectedContactData && selectedContactData.chatMessages) {
            displayChatMessages(selectedContactData.chatMessages, selectedContactData.image, selectedContactData.Username);
        }
    });
};

const UpdateContact = (contact) => {
    const contact_item = document.createElement('div');
    contact_item.className = 'contact-item';
    contact_item.id = `contact-${contact.Username}`;
    contact_item.dataset.username = contact.Username;
    contact_item.dataset.image = contact.image;
    contact_item.innerHTML = `<div class="contact-avatar">
                        <img src="${contact.image}" alt="${contact.Username}">
                    </div>
                    <div class="contact-info">
                        <h4>${contact.Username}</h4>
                        <span class="last-seen">${contact.Timestamp}</span>
                    </div>`;

    console.log('Created contact with name:', contact.Username);
    contact_list.appendChild(contact_item);
    ActiveContact(contact_item);
};

const FetchContactsinfo = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/dummy-data-contacts');
        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`);
        }
        allContactsData = await response.json(); 
        console.log(allContactsData);
        allContactsData.forEach(contact => {
            UpdateContact(contact);
        });
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
};

const displayChatMessages = (messages, otherContactImage, otherContactName) => {
    chatMessagesContainer.innerHTML = '';
    messages.forEach(message => {
        const message_div = document.createElement('div');
        const isOutgoing = message.sender === "You";
        message_div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        const message_content = `<div class="message-content">
                                <p>${message.message}</p>
                                <span class="message-time">${message.timestamp}</span>
                             </div>`;
        const message_avatar = `<div class="message-avatar">
                                <img src="${isOutgoing ? '' : otherContactImage}" alt="${isOutgoing ? '' : otherContactName}">
                             </div>`;

        if (isOutgoing) {
            message_div.innerHTML = `${message_content}`;
        } else {
            message_div.innerHTML = `${message_avatar}${message_content}`;
        }
        chatMessagesContainer.appendChild(message_div);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

document.addEventListener('DOMContentLoaded', FetchContactsinfo);