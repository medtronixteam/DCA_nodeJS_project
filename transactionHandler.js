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

module.exports = saveTransaction;
