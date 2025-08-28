//msggggggg
const fs = require("fs");
const path = "./contacts.json";

const sendmsg = () => {
  const now = new Date();
  const time = now.toLocaleTimeString(); // e.g., "10:12:00 PM"
  // New message to append
  const resever=
  const newMessage = {
    sender: "You",
    message: msg,
    timestamp: time,
  };

  try {
    // Step 1: Read the file
    const rawData = fs.readFileSync(path, "utf-8");
    const chats = JSON.parse(rawData);

    // Step 2: Find the conversation by Username
    const chatIndex = chats.findIndex((chat) => chat.Username === recever);

    if (chatIndex !== -1) {
      // Step 3: Add the new message
      chats[chatIndex].chatMessages.push(newMessage);


      // Step 4: Write it back
      fs.writeFileSync(path, JSON.stringify(chats, null, 2));
      console.log("Chat updated successfully.");
    } else {
      console.log("User not found.");
    }
  } catch (err) {
    console.error("Error updating chat:", err);
  }
};

sendmsg()

