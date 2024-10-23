const ccxt = require('ccxt');
require('dotenv').config();

const API_Key = process.env.API_Key;
const API_Secret = process.env.API_Secret;

const config = {
    apiKey: API_Key,
    apiSecret: API_Secret,
    tradingPair: 'BTC/USDT',  // User-selected trading pair
    baseOrderSize: 20,        // USDT
    orderType: 'market',      // 'market' or 'limit'
    limitOrderTargetPercentage: 0.98 // E.g., 2% below current price for limit orders
};

console.log(config);

// Initialize the exchange (Binance in this case)
const exchange = new ccxt.binance({
    apiKey: API_Key,
    secret: API_Secret,
    enableRateLimit: true,
    options: {
        defaultType: "future",
        urls: {
            api: "https://testnet.binancefuture.com",
            test: "https://testnet.binancefuture.com",
        },
    },
});

// Main function to execute the base order
async function executeBaseOrder(ComongPrice) {
    try {
        console.log(`======baseOrder=====================${ComongPrice}======================================`);
        // Fetch the current market price of the trading pair
        const tradingPair = config.tradingPair;
        await exchange.setSandboxMode(true);
        const ticker = await exchange.fetchTicker(tradingPair);
        const currentPrice = ticker.last;
        console.log(`Current market price for ${tradingPair}: ${currentPrice} USDT`);

   
        if (config.orderType === 'market') {
            console.log(`Placing a market order... ${ComongPrice}`);

            // Place a buy order for 20 USDT worth of BTC at the current market price
            // const order = await exchange.createMarketBuyOrder(
            //     tradingPair, 
            //     config.baseOrderSize / currentPrice
            // );

            // Verify if the order is executed and log details
            //console.log('Market order placed successfully:', order);
          //  console.log(`Bought ${order.amount} BTC at ${order.price} USDT. Fees: ${order.fee.cost} ${order.fee.currency}`);
        }

       
        else if (config.orderType === 'limit') {
            console.log('Placing a limit order...');

            // Set the target price for the limit order
            const targetPrice = currentPrice * config.limitOrderTargetPercentage;
            console.log(`Target price for limit order: ${targetPrice} USDT`);

            // Place a limit buy order
            // const order = await exchange.createLimitBuyOrder(
            //     tradingPair, 
            //     config.baseOrderSize / targetPrice,
            //     targetPrice
            // );

            // Verify if the order is executed and log details
          //  console.log('Limit order placed successfully:', order);
            //console.log(`Bought ${order.amount} BTC at ${order.price} USDT. Fees: ${order.fee.cost} ${order.fee.currency}`);
        }

        // After the base order is executed
        console.log('Base order executed. Monitoring the position for further actions...');
        // Add logic here for monitoring and safety orders based on price movement

    } catch (error) {
        console.error('Error executing base order:', error);
    }
}


module.exports = executeBaseOrder;
