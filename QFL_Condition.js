const ccxt = require('ccxt');
require('dotenv').config();

const exchange = new ccxt.binance({
    apiKey: process.env.API_Key,
    secret: process.env.API_Secret,
    options: {
        defaultType: 'spot', // Switching to spot trading
    },
    urls: {
        api: {
            public: 'https://testnet.binance.vision/api/v3', // Binance Spot Testnet API
            private: 'https://testnet.binance.vision/api/v3',
        },
    },
});

const fs = require('fs');

// JSON file for transaction history
const transactionFile = 'transactions.json';

// Load transaction history if the file exists
let transactionHistory = [];
if (fs.existsSync(transactionFile)) {
  transactionHistory = JSON.parse(fs.readFileSync(transactionFile, 'utf8'));
}

// User balance
let userBalance = {
  usd: 300,
  btc: 0,
  btcPurchasePrice: 0 
};

// Save transactions to JSON file
function saveTransaction(type, amount, price, profit = 0) {
  const transaction = {
    type, // buy or sell
    amount,
    price,
    profit,
    timestamp: new Date().toISOString(),
  };
  transactionHistory.push(transaction);
  fs.writeFileSync(transactionFile, JSON.stringify(transactionHistory, null, 2), 'utf8');
  console.log(`Transaction recorded: ${type} ${amount} BTC at $${price}`);
}

// Function to fetch current BTC/USDT price from Binance Spot
async function getCurrentBtcPrice() {
  try {
    const ticker = await exchange.fetchTicker('BTC/USDT');
    return ticker.last; // Returns the last traded price of BTC
  } catch (error) {
    console.error("Error fetching BTC price: ", error);
  }
}

// Function to buy BTC
async function buyBtc() {
  const btcPrice = await getCurrentBtcPrice();
  let amountToBuy = userBalance.usd / btcPrice;

  const minNotional = 10; // Binance minimum order value in USDT for spot trading

  const notionalValue = amountToBuy * btcPrice;
  if (notionalValue < minNotional) {
    console.error(`Order notional value is too small. You need to buy at least $${minNotional / btcPrice} BTC.`);
    return; 
  }

  try {
    // Place a market buy order
    console.log(`Buying ${amountToBuy} BTC at $${btcPrice}...`);
    const order = await exchange.createMarketBuyOrder('BTC/USDT', amountToBuy);
    console.log(`Bought ${amountToBuy} BTC at $${btcPrice}. Order details: `, order);

    // Update balance
    userBalance.usd -= amountToBuy * btcPrice;
    userBalance.btc += amountToBuy;
    userBalance.btcPurchasePrice = btcPrice;

    // Save transaction
    saveTransaction('buy', amountToBuy, btcPrice);

  } catch (error) {
    console.error("Error placing buy order: ", error);
  }
}

// Function to sell BTC if profit conditions are met
async function sellBtcIfProfitable() {
  const currentPrice = await getCurrentBtcPrice();
  const purchasePrice = userBalance.btcPurchasePrice;

  if (purchasePrice > 0) {
    const profitPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;

    if (profitPercent >= 2 && profitPercent <= 5) {
      try {
        // Place a market sell order
        const order = await exchange.createMarketSellOrder('BTC/USDT', userBalance.btc);
        console.log(`Sold ${userBalance.btc} BTC at $${currentPrice}. Order details: `, order);

        // Calculate profit
        const profit = (currentPrice - purchasePrice) * userBalance.btc;

        // Update balance after sale
        userBalance.usd += currentPrice * userBalance.btc;
        userBalance.btc = 0;

        // Save transaction
        saveTransaction('sell', userBalance.btc, currentPrice, profit);

        // Keep 50% profit and reinvest 50%
        const profitToReinvest = profit * 0.5;
        userBalance.usd -= profitToReinvest;
        await buyBtc(); // Re-buy BTC with 50% of the profit

      } catch (error) {
        console.error("Error placing sell order: ", error);
      }
    } else {
      console.log(`Profit/Loss: ${profitPercent.toFixed(2)}%. Waiting for 2%-5% profit before selling.`);
    }
  } else {
    console.log("No BTC to sell.");
  }
}

// Main function to initiate the bot
(async () => {
    await exchange.setSandboxMode(true); // Enable sandbox for testing
    console.log("--------------------Checking----------------------");

    await getCurrentBtcPrice();
    await buyBtc();

    // Regularly check if BTC can be sold
    setInterval(async () => {
      await sellBtcIfProfitable();
    }, 60000); // Check every minute
})();
