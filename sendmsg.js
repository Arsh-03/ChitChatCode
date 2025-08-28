const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "contacts.json");

function sendMessage(receiver, messageText) {
  const now = new Date();
  const time = now.toLocaleTimeString();

  const newMessage = {
    sender: "You",
    message: messageText,
    timestamp: time,
  };

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const chats = JSON.parse(rawData);

    const chatIndex = chats.findIndex(chat => chat.Username.toLowerCase() === receiver.toLowerCase());

    if (chatIndex !== -1) {
      chats[chatIndex].chatMessages.push(newMessage);
      fs.writeFileSync(filePath, JSON.stringify(chats, null, 2));
      console.log("Chat updated successfully.");
    } else {
      throw new Error("User not found");
    }
  } catch (err) {
    console.error("Error updating chat:", err);
    throw err; // rethrow error to be caught in express route
  }
}

module.exports = sendMessage;
