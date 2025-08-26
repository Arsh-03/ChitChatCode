const contact_list = document.getElementById('contacts-list');
const chatUserName = document.querySelector('.chat-panel .chat-header .user-details h3');
const chatUserPfp = document.querySelector('.chat-panel .chat-header .chat-user-info .chat-avatar img');
const chatMessagesContainer = document.querySelector('.chat-panel .chat-messages');
const searchInput = document.querySelector('.search-container input');

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
            let members;
            if (selectedContactData.isGroup) {
                members = selectedContactData.members;
            } else {
                members = [{ name: "You", image: "" },
                { name: selectedContactData.Username, image: selectedContactData.image }]
            }
            displayChatMessages(selectedContactData.chatMessages, members);
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

    // console.log('Created contact with name:', contact.Username);
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

const filterContacts = (searchTerm) => {
    // Clear the existing contact list
    contact_list.innerHTML = '';
    
    // Filter the global contacts array based on the search term
    const filteredContacts = allContactsData.filter(contact => {
        return contact.Username.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    // Re-render only the filtered contacts
    filteredContacts.forEach(contact => {
        UpdateContact(contact);
    });
};


const displayChatMessages = (messages, members) => {
    chatMessagesContainer.innerHTML = '';
    messages.forEach(message => {
        const message_div = document.createElement('div');
        const isOutgoing = message.sender === "You";
        message_div.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        let message_avatar_html = '';
        let sender_name_html = '';

        // For incoming messages, find the sender and create the avatar and name
        if (!isOutgoing) {
            const senderData = members.find(member => member.name === message.sender);
            if (senderData) {
                message_avatar_html = `<div class="message-avatar">
                                        <img src="${senderData.image}" alt="${senderData.name}">
                                     </div>`;
            }
            // For group chats (more than 2 members), show the sender's name
            if (members.length > 2) {
                sender_name_html = `<p class="sender-name">${message.sender}</p>`;
            }
        }

        const message_content = `<div class="message-content">
                                <p>${message.message}</p>
                                <span class="message-time">${message.timestamp}</span>
                             </div>`;

        if (isOutgoing) {
            message_div.innerHTML = `${message_content}`;
        } else {
             message_div.innerHTML = `${message_avatar_html}${sender_name_html}${message_content}`;
        }
        chatMessagesContainer.appendChild(message_div);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

document.addEventListener('DOMContentLoaded', () => { 
    FetchContactsinfo();

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            filterContacts(e.target.value);
        });
    }
 });