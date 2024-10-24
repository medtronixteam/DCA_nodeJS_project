const db = require("./db"); // Import MySQL connection
const fs = require("fs");

// Path to save JSON transactions
const transactionFile = "transactions.json";

// Load transaction history if the file exists
let transactionHistory = [];
if (fs.existsSync(transactionFile)) {
  transactionHistory = JSON.parse(fs.readFileSync(transactionFile, "utf8"));
}

// Save transactions to JSON and MySQL database based on bot_uid
async function saveTransaction(
  bot_uid,
  type,
  credit,
  debit,
  buying_price,
  selling_price = 0,
  profit = 0,
  status
) {
  const transaction = {
    bot_uid,
    credit,
    debit,
    buying_price,
    selling_price,
    profit,
    status,
    timestamp: new Date().toISOString(),
  };

  // Save transaction to JSON file
  transactionHistory.push(transaction);
  fs.writeFileSync(
    transactionFile,
    JSON.stringify(transactionHistory, null, 2),
    "utf8"
  );
  console.log(
    `Transaction recorded in JSON for bot ${bot_uid}: ${type} ${credit} BTC at $${buying_price}`
  );

  // Save transaction to MySQL database
  try {
    const query = `
      INSERT INTO transactions (bot_uid, credit, debit, buying_price, selling_price, profit, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await db.execute(query, [
      bot_uid,
      credit,
      debit,
      buying_price,
      selling_price,
      profit,
      status,
    ]);
    console.log(
      `Transaction recorded in DB for bot ${bot_uid}: ${type} ${credit} BTC at $${buying_price}`
    );
  } catch (error) {
    console.error("Error saving transaction to DB:", error);
  }
}

async function saveBalance(exchange,currency,balance,user_id){

  try {
    const query = `
      INSERT INTO balances (exchange, currency, balance,user_id,created_at,updated_at)
      VALUES (?, ?, ?,?,NOW(),NOW())
      ON DUPLICATE KEY UPDATE balance = VALUES(balance);
    `;

    await db.execute(query, [exchange, currency, balance,user_id]);
    console.log('Balance  Updated');
  } catch (error) {
    console.error('Mysql Error in balance Query----->:', error);
  }
}
async function getExchangeKey(userId,exchangeName){
  try {

    const query = `
      SELECT exchange_api_key, exchange_api_secret 
      FROM exchanges 
      WHERE user_id = ? AND exchange_name = ?
      LIMIT 1;
    `;

    const [rows] = await db.execute(query, [userId, exchangeName]);

    if (rows.length > 0) {
      const API_Key = rows[0].exchange_api_key;
      const API_Secret = rows[0].exchange_api_secret;
      return { API_Key, API_Secret };
    } else {
      console.log(`No API credentials found for user_id: ${userId}, exchange_name: ${exchangeName}`);
      return null;
    }
  } catch (error) {
    console.log(`No API credentials found for user_id: ${userId}, exchange_name: ${exchangeName} ${error}`);
   
    return null;
  }

}


module.exports = {
  saveTransaction,
  saveBalance,
  getExchangeKey
};
