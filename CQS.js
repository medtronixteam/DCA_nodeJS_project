const ccxt = require('ccxt');

require('dotenv').config();

const API_Key = process.env.API_Key;
const API_Secret = process.env.API_Secret;


const exchange = new ccxt.binance({
    apiKey: API_Key,
    secret: API_Secret,
    options: {
        defaultType: 'future', // Futures trading
    },
    urls: {
        api: {
            public: 'https://testnet.binancefuture.com/fapi/v1',
            private: 'https://testnet.binancefuture.com/fapi/v1',
        },
    },
});


const symbol = 'BTC/USDT';
const baseOrderSize = 20;   // USDT
const priceCheckInterval = 5000;  // Check price every 5 seconds
const takeProfitPercentage = 0.02; // 2% increase
const stopLossPercentage = 0.01;   // 1% decrease

let entryPrice = 63456; // To store entry price for comparison

// Fetch the current market price
async function getMarketPrice() {
    const ticker = await exchange.fetchTicker(symbol);
    return ticker.last;
}

// Place a market buy order
async function placeMarketOrder() {
    const marketPrice = await getMarketPrice();
    const amount = baseOrderSize / marketPrice;
    
    console.log(`Placing market order to buy ${amount} BTC at ${marketPrice} USDT`);
    
    const order = await exchange.createMarketBuyOrder(symbol, amount);
    entryPrice = marketPrice;  // Set the entry price when order is placed
    console.log('Market order placed successfully:', order);
    
    return order;
}

// Monitor price and trigger a long position if upward momentum is detected
async function monitorMarket() {
    try {
        await exchange.setSandboxMode(true);
        const currentPrice = await getMarketPrice();
        console.log(`Current Market Price: ${currentPrice} USDT`);
    //entryPrice for detection
        if (!entryPrice) {
            console.log('Upward momentum detected, placing buy order...');
            await placeMarketOrder();


            // if (await upwardMomentum(currentPrice)) {
               
            // }
        } else {
            await manageTakeProfitStopLoss(currentPrice);
          
        }
    } catch (error) {
        console.error('Error monitoring the market:', error);
    }
}

// Simple upward momentum detection (e.g., price is rising)
async function upwardMomentum(currentPrice) {
    // Define a condition for upward momentum (e.g., price increased 0.5%)
    const threshold = 0.005;  // 0.5% upward movement as an example
    const previousPrice = await getMarketPrice();
    const priceChange = (currentPrice - previousPrice) / previousPrice;
    console.log(`currentPrice : ${currentPrice} previousPrice : ${previousPrice} priceChange : ${priceChange}`);
    return priceChange >= threshold;  // Return true if upward movement detected
}

// Manage take profit and stop loss for an active position
async function manageTakeProfitStopLoss(currentPrice) {
    const priceIncrease = (currentPrice - entryPrice) / entryPrice;
    const priceDecrease = (entryPrice - currentPrice) / entryPrice;

    console.log(`--------Increase=${priceIncrease}-----Decrease=${priceDecrease}----------`);
    
    // Check if take-profit target is hit
    if (priceIncrease >= takeProfitPercentage) {
        console.log(`Take-profit target reached! Closing position...`);
        await closePosition();
    }
    
    // Check if stop-loss target is hit
    if (priceDecrease >= stopLossPercentage) {
        console.log(`Stop-loss triggered! Closing position...`);
       // await closePosition();
    }
}

// Close position (Sell BTC to USDT)
async function closePosition() {
    try {
        await exchange.setSandboxMode(true);
        const currentPrice = await getMarketPrice();
        const amount = baseOrderSize / currentPrice;
        console.log(`base Order = ${amount}`);
        if(amount>0.001){
            const order = await exchange.createMarketSellOrder(symbol, amount);
            console.log('Position closed successfully:', order);
            entryPrice = null;  // Reset the entry price after closing position
        }else{
            console.log('Binance amount of BTC/USDT:USDT must be greater than minimum amount precision of 0.001');
        }
        
       
    } catch (error) {
        console.error('Error closing position:', error);
    }
}

// Start monitoring the market at intervals
setInterval(monitorMarket, priceCheckInterval);
