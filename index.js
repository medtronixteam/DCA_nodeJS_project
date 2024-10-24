const ccxt = require("ccxt");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const WebSocket = require("ws");
const dataFilePath = path.join(__dirname, "./json/new.json");
const CQS_Condition = require("./CQS_Condition");
const dataController = require("./controllers/jsonController");
const db = require("./db"); // MySQL Database connection

// Read JSON file
const readJSONFile = () => {
  const data = fs.readFileSync(dataFilePath, "utf-8");
  return JSON.parse(data);
};

// Fetch all bots from the database
const fetchAllBots = async () => {
  try {
    const [rows] = await db.execute("SELECT bot_uid, status,user_id FROM bots ",[]);
    return rows; // Return all bots with their UID and status
  } catch (error) {
    console.error("Error fetching bots:", error);
    return [];
  }
};

// Update bot status in the database
const updateBotStatus = async (bot_uid, status) => {
  try {
    await db.query("UPDATE bots SET status = ? WHERE bot_uid = ?", [
      status,
      bot_uid,
    ]);
    console.log(`Bot with UID: ${bot_uid} status updated to '${status}'.`);
  } catch (error) {
    console.error(`Error updating bot status for UID: ${bot_uid}`, error);
  }
};

// Connect to Binance WebSocket for BTC/USDT ticker updates
const socket = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");

// WebSocket connection event
socket.on("message", async (data) => {
  const tradeData = JSON.parse(data);
  const currentPrice = parseFloat(tradeData.p);
//   console.log(`Current BTC price from WebSocket: $${currentPrice}`);

//  let newTradeData = readJSONFile();

  
});

setInterval(async ()=>{
  const bots = await fetchAllBots(); // Fetch all bots with their UID and status

  // Loop through each bot and check if status is 'starting'
  for (const bot of bots) {
    if (bot.status === "pending") {
      console.log(`Bot with UID: ${bot.bot_name} is now running.`);

      // Call CQS_Condition and pass the bot_uid
      await CQS_Condition(bot.bot_uid,bot.user_id,'binance');

      // Update bot status to 'running' so it won't run again
      await updateBotStatus(bot.bot_uid, "running");
    } else if (bot.status === "running") {
      // console.log(
      //   `Bot with UID: ${bot.bot_uid} is already running and will not be executed again.`
      // );
    }
  }
},1000);

socket.on("error", (error) => {
  console.error("WebSocket error:", error);
});

socket.on("close", () => {
  console.log("WebSocket connection closed");
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Define routes
app.get("/data", dataController.getAllData); // GET route to fetch all data
app.post("/data", dataController.addData); // POST route to add new data

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
