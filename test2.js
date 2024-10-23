const ccxt = require('ccxt');

require('dotenv').config();


const exchange = new ccxt.binance({
    apiKey: process.env.API_Key,
    secret: process.env.API_Secret,
    options: {
        defaultType: 'future', 
    },
    urls: {
        api: {
            public: 'https://testnet.binancefuture.com/fapi/v1',
            private: 'https://testnet.binancefuture.com/fapi/v1',
        },
    },
});
const fs = require('fs');

//json file
const transactionFile = 'transactions.json';

// Load transaction history if the file exists
let transactionHistory = [];
if (fs.existsSync(transactionFile)) {
  transactionHistory = JSON.parse(fs.readFileSync(transactionFile, 'utf8'));
}

// User Balance
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

// Function to fetch current BTC/USDT price from Binance Futures
async function getCurrentBtcPrice() {
  try {
    const ticker = await exchange.fetchTicker('BTC/USDT');
    return ticker.last; // Returns the last traded price of BTC
  } catch (error) {
    console.error("Error fetching BTC price: ", error);
  }
}


async function buyBtc() {
    const btcPrice = await getCurrentBtcPrice();
    let amountToBuy = userBalance.usd / btcPrice; //100/65000
  
    const minNotional = 100; // Minimum order value in USDT

    // Ensure the notional value is no smaller than the minimum required by Binance
    const notionalValue = amountToBuy * btcPrice;
  
    if (notionalValue < minNotional) {
      console.error(`Order notional value is too small. You need to buy at least $${minNotional / btcPrice} BTC.`);
      return; // Exit the function if the order is too small
    }
  
    
      try {
        // Place a real market buy order
        console.log(`Buying ${amountToBuy} BTC at $${btcPrice}...`);
        const order = await exchange.createMarketBuyOrder('BTC/USDT', amountToBuy);
        console.log(`Bought ${amountToBuy} BTC at $${btcPrice}. Order details: `, order);
  
        // Update the balance
        userBalance.usd -= amountToBuy * btcPrice; // Deduct USD based on the exact amount bought
        userBalance.btc += amountToBuy;
        userBalance.btcPurchasePrice = btcPrice;
  
        // save transaction
        saveTransaction('buy', amountToBuy, btcPrice);
  
      } catch (error) {
        console.error("Error placing buy order: ", error);
      }
   
  }
  

// Function to place a market sell order for BTC if profit conditions are met
async function sellBtcIfProfitable() {
  const currentPrice = await getCurrentBtcPrice();
  const purchasePrice = userBalance.btcPurchasePrice;

  if (purchasePrice > 0) {
    const profitPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;
    //115-110=5/110 = 0.045*100 = 4.5%

    if (profitPercent >= 2 && profitPercent <= 5) {
      try {
        // Place a real market sell order
        const order = await exchange.createMarketSellOrder('BTC/USDT', userBalance.btc);
        console.log(`Sold ${userBalance.btc} BTC at $${currentPrice}. Order details: `, order);

        // Calculate profit 
        const profit = (currentPrice - purchasePrice) * userBalance.btc;
        //115-110=5*9.09 = 4.5
        // Update balance after sale
        userBalance.usd += currentPrice * userBalance.btc;
        userBalance.btc = 0; // Sold all BTC

        // Record the sell transaction
        saveTransaction('sell', userBalance.btc, currentPrice, profit);

        // Keep 50% profit and reinvest 50%
        const profitToReinvest = profit * 0.5;
        userBalance.usd -= profitToReinvest; // Use 50% of the profit to buy BTC again
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
    await exchange.setSandboxMode(true);
  // Start by buying BTC with the initial USD balance
  console.log("--------------------Checking----------------------");

// const balance = await exchange.fetchBalance();
//console.log(balance); 


  await getCurrentBtcPrice();
  await buyBtc();

  // Regularly check if the BTC can be sold
  setInterval(async () => {
    await sellBtcIfProfitable();
  }, 60000); // Check every minute
})();
async function getCurrentBtcPrice() {
    try {
      const ticker = await exchange.fetchTicker('BTC/USDT');
      console.log("Price-------------", ticker.last);
      return ticker.last; // Returns the last traded price of BTC
    } catch (error) {
      console.error("Error fetching BTC price: ", error);
    }
  }