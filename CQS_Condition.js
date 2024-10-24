require("dotenv").config();
const ccxt = require("ccxt");

const { saveTransaction, saveBalance,getExchangeKey }=require("./transactionHandler");
let API_Key = '';
let API_Secret = '';



// User Balance
let userBalance = {
  usd: 300,
  btc: 0,
  btcPurchasePrice: 0,
};

// Control flags to prevent multiple transaction saves
let buyTransactionSaved = false;
let sellTransactionSaved = false;

// Fetch current BTC/USDT price from Binance Futures
async function getCurrentBtcPrice() {
  try {
    const ticker = await futureExchange.fetchTicker("BTC/USDT");
    console.log(`Current BTC price: ${ticker.last}`);
    return ticker.last; // Returns the last traded price of BTC
  } catch (error) {
    console.error("Error fetching BTC price:", error);
  }
}

// Function to buy BTC
async function buyBtc(bot_uid) {
  const btcPrice = await getCurrentBtcPrice();
  if (!btcPrice) {
    console.error("Unable to fetch BTC price, cannot proceed with buying.");
    return;
  }

  let amountToBuy = userBalance.usd / btcPrice;
  const minNotional = 100; // Minimum order value in USDT
  const notionalValue = amountToBuy * btcPrice;

  if (notionalValue < minNotional) {
    console.error(
      `Order notional value is too small. You need to buy at least $${
        minNotional / btcPrice
      } BTC.`
    );
    return;
  }

  try {
    // Place market buy order
    console.log(
      `Placing buy order for ${amountToBuy} BTC at $${btcPrice} for bot_uid: ${bot_uid}...`
    );
    const order = await futureExchange.createMarketBuyOrder(
      "BTC/USDT",
      amountToBuy
    );
    console.log(
      `Bought ${amountToBuy} BTC at $${btcPrice} for bot_uid: ${bot_uid}. Order details: `,
      order
    );

    // Update user balance
    userBalance.usd -= amountToBuy * btcPrice;
    userBalance.btc += amountToBuy;
    userBalance.btcPurchasePrice = btcPrice;

    // Ensure buy transaction is saved only once
    if (!buyTransactionSaved) {
      // Save buy transaction with debit (USD spent) and bot_uid
      await saveTransaction(
        bot_uid,
        "buy",
        0,
        amountToBuy * btcPrice,
        btcPrice,
        0,
        0,
        "buy"
      );

      // Save transaction to show BTC amount bought as credit and bot_uid
      await saveTransaction(
        bot_uid,
        "buy",
        amountToBuy,
        0,
        btcPrice,
        0,
        0,
        "buy"
      );

      buyTransactionSaved = true; // Mark transaction as saved
      console.log("Buy transaction saved.");
    }
  } catch (error) {
    console.error(`Error placing buy order for bot_uid: ${bot_uid}`, error);
  }
}

// Function to sell BTC if profit conditions are met
async function sellBtcIfProfitable(bot_uid) {
  const currentPrice = await getCurrentBtcPrice();
  const purchasePrice = userBalance.btcPurchasePrice;

  if (purchasePrice > 0) {
    const profitPercent =
      ((currentPrice - purchasePrice) / purchasePrice) * 100;
    console.log(`Profit percent for bot_uid: ${bot_uid}: ${profitPercent}%`);

    // Sell if profit between 1% and 2%
    if (profitPercent >= 1 && profitPercent <= 2) {
      try {
        // Place market sell order
        console.log(
          `Placing sell order for ${userBalance.btc} BTC at $${currentPrice} for bot_uid: ${bot_uid}...`
        );
        const order = await futureExchange.createMarketSellOrder(
          "BTC/USDT",
          userBalance.btc
        );
        console.log(
          `Sold ${userBalance.btc} BTC at $${currentPrice} for bot_uid: ${bot_uid}. Order details: `,
          order
        );

        // Calculate profit and update balance
        const profit = (currentPrice - purchasePrice) * userBalance.btc;
        const soldAmount = userBalance.btc;

        // Update balances
        userBalance.usd += currentPrice * userBalance.btc;
        userBalance.btc = 0; // Sold all BTC

        // Ensure sell transaction is saved only once
        if (!sellTransactionSaved) {
          // Save sell transaction with profit, credit BTC sold, and bot_uid
          await saveTransaction(
            bot_uid,
            "sell",
            soldAmount,
            0,
            purchasePrice,
            currentPrice,
            profit,
            "sell"
          );

          // Calculate remaining balance and profit after sale
          const remainingBalance = userBalance.usd - soldAmount * purchasePrice;
          console.log(`Profit: ${remainingBalance}`);

          sellTransactionSaved = true; // Mark transaction as saved
          console.log("Sell transaction saved.");
        }
      } catch (error) {
        console.error(
          `Error placing sell order for bot_uid: ${bot_uid}`,
          error
        );
      }
    } else {
      console.log(
        `Profit/Loss for bot_uid: ${bot_uid}: ${profitPercent.toFixed(
          2
        )}%. Waiting for better profit before selling.`
      );
    }
  } else {
    console.log(`No BTC to sell for bot_uid: ${bot_uid}.`);
  }
}

// Main CQS Condition function to handle buy-sell cycle
async function CQS_Condition(bot_uid,user_id,exchange) {
  // get user exchange keys
const credentials = await getExchangeKey(user_id, exchange); 
if (credentials) {
   API_Key = credentials.API_Key;
   API_Secret = credentials.API_Secret;
  console.log('Using API Key:', API_Key);
  console.log('Using API Secret:', API_Secret);
}
const futureExchange = new ccxt.binance({
apiKey: API_Key,
secret: API_Secret,
options: {
  defaultType: "future", // Futures trading
},
urls: {
  api: {
    public: "https://testnet.binancefuture.com/fapi/v1",
    private: "https://testnet.binancefuture.com/fapi/v1",
  },
},
});
  await futureExchange.setSandboxMode(true); // Enable sandbox mode for testing

  // Fetch and display user balance (for logging)
  const balance = await futureExchange.fetchBalance();
  console.log(
    "Available balance for bot_uid: ",
    bot_uid,
    balance.info.availableBalance
  );
  saveBalance(exchange,'USDT',balance.USDT.free,user_id);
  console.log("Free USDT for bot_uid: ", bot_uid, balance.USDT.free);

  // Start by buying BTC with the initial balance
  if (userBalance.usd > 0) {
   // await buyBtc(bot_uid); // Start by buying BTC if USD is available
  }

  // Regularly check if BTC can be sold
  // setInterval(async () => {
  //   if (userBalance.btc > 0) {
  //     await sellBtcIfProfitable(bot_uid); // Check if it's time to sell BTC
  //   } else {
  //     console.log(
  //       `No BTC to sell for bot_uid: ${bot_uid}, waiting for the next buy opportunity.`
  //     );
  //   }
  // }, 60000); // Check every minute
}

module.exports = CQS_Condition;
