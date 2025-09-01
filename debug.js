// debug.js - Run this file to test your MongoDB connection and data
const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./models/Message');

const testDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully');

    // Check if messages collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));

    // Count total messages
    const messageCount = await Message.countDocuments();
    console.log(`📊 Total messages in database: ${messageCount}`);

    if (messageCount > 0) {
      // Fetch all messages
      const messages = await Message.find().sort({ timestamp: 1 });
      console.log('📝 Messages in database:');
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. From: ${msg.from} | To: ${msg.to} | Text: ${msg.text} | Time: ${msg.timestamp}`);
      });

      // Test the exact query your API uses
      console.log('\n🔍 Testing API query format:');
      const apiMessages = await Message.find().sort({ timestamp: 1 });
      console.log('API would return:', JSON.stringify(apiMessages, null, 2));
    } else {
      console.log('❌ No messages found. Let\'s create a test message...');
      
      // Create a test message
      const testMessage = new Message({
        from: 'TestUser',
        to: 'SomeReceiver',
        text: 'This is a test message',
        isGroup: false,
        timestamp: new Date()
      });

      await testMessage.save();
      console.log('✅ Test message created:', testMessage);
    }

  } catch (err) {
    console.error('❌ Database error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
testDB();