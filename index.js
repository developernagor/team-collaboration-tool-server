const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require("express");
const cors = require("cors");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://chatwitharu.netlify.app",
      
      
    ],
    credentials: true,
}));
app.use(express.json());


const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.7oyvz.mongodb.net:27017,cluster0-shard-00-01.7oyvz.mongodb.net:27017,cluster0-shard-00-02.7oyvz.mongodb.net:27017/?ssl=true&replicaSet=atlas-1fj2mc-shard-0&authSource=admin&appName=Cluster0`;

// MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // ✅ connect once
    await client.connect();
    // console.log("✅ Connected to MongoDB");

    const db = client.db("chatDB");
    const messageCollection = db.collection("messages");
const userCollection = db.collection("users");



// Save user
app.post("/users", async (req, res) => {
  try {
    const user = req.body;

    console.log("📥 Received user:", user);

    // validation
    if (!user.email || !user.name) {
      return res.status(400).send({
        success: false,
        message: "Name or Email missing",
      });
    }

    // check existing user
    const exists = await userCollection.findOne({
      email: user.email,
    });

    if (exists) {
      console.log("⚠️ User already exists");
      return res.send({
        success: false,
        message: "User already exists",
      });
    }

    // insert user
    const result = await userCollection.insertOne(user);

    console.log("✅ Inserted:", result.insertedId);

    return res.send({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log("❌ Error saving user:", error);
    res.status(500).send({
      success: false,
      message: "Failed to save user",
    });
  }
});

// Get all users
app.get("/users", async (req, res) => {
  const users = await userCollection.find().toArray();
  res.send(users);
});


// ============================
// 🕒 UPDATE LAST SEEN
// ============================
app.patch("/users/last-seen", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await userCollection.updateOne(
      { email },
      {
        $set: {
          lastSeen: new Date(),
        },
      },
      { upsert: true }
    );

    res.send({
      success: true,
      result,
    });
  } catch (error) {
    console.log("last seen error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update last seen",
    });
  }
});


// ✅ Get single user
// ============================
// 👤 Get single user (FIXED - IMPORTANT)
// ============================
app.get("/users/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const user = await userCollection.findOne({ email });

    res.send(user);
  } catch (err) {
    res.status(500).send({ message: "User not found" });
  }
});


 // ============================
// 📩 POST: Send Message
// ============================
app.post("/messages", async (req, res) => {
  try {
    const { text, senderName, senderEmail } = req.body;

    // ✅ validation
    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    const messageData = {
      text,
      senderName,
      senderEmail,
      createdAt: new Date(),
    };

    const result = await messageCollection.insertOne(messageData);

   res.status(201).json({
  success: true,
  insertedId: result.insertedId,
  data: {
    _id: result.insertedId,
    ...messageData,
  },
});

  } catch (error) {
    console.error("POST /messages error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

app.get("/messages", async (req, res) => {
  try {
    const messages = await messageCollection
      .find()
      .sort({ createdAt: 1 })
      .toArray();

    res.json(messages);

  } catch (error) {
    console.error("GET /messages error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

    // ============================
    // 🏠 Root Route
    // ============================
    app.get("/", (req, res) => {
      res.send("🚀 Chat Server is Running...");
    });

    // start express
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});


  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

// run server
run();

