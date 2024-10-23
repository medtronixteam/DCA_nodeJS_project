
const ccxt = require('ccxt');
require('dotenv').config();

const API_Key = process.env.API_Key;
const API_Secret = process.env.API_Secret;


const binance = new ccxt.binance({
    apiKey: API_Key,
    secret: API_Secret,
    urls: {
        api: {
            public: 'https://testnet.binancefuture.com/fapi/v1',
            private: 'https://testnet.binancefuture.com/fapi/v1',
        },
    },
});

const pair = 'BTC/USDT';
const baseOrderAmount = 20; // USDT for base order
const takeProfitPercent = 1.02; // 2% profit target
const stopLossPercent = 0.99; // 1% stop loss
const fluctuationRangeMin = 0.5; // 0.5% fluctuation
const fluctuationRangeMax = 1.5; // 1.5% fluctuation
const highVolumeThreshold = 1000; // Example threshold

// Step 1: Fetch the latest price data
async function fetchLatestData() {
    await binance.setSandboxMode(true);
    const candles = await binance.fetchOHLCV(pair, '1m', undefined, 5); // Fetch the latest 5 1-minute candlesticks
    const ticker = await binance.fetchTicker(pair); // Fetch the latest ticker info (price, volume)
    console.log('candles :', candles);
    console.log('ticker :', ticker);
    const lastCandle = candles[candles.length - 1];
    console.log('lastCandle :', lastCandle);
    return {
        lastCandle,
        ticker,
    };
}

// Step 2: Apply the CQS Scalping strategy indicators
function checkScalpingOpportunity(data) {
    const { lastCandle, ticker } = data;
    const [time, open, high, low, close, volume] = lastCandle;
    const priceChangePercent = ((close - open) / open) * 100;
    const priceWithinRange = priceChangePercent >= fluctuationRangeMin && priceChangePercent <= fluctuationRangeMax;
    const highVolume = volume >= highVolumeThreshold;
                    console.log('checking Scalping opportunity...'+priceChangePercent);
    return priceWithinRange && highVolume && ticker.last >= predefinedRange();
}

// Define your predefined range logic
function predefinedRange() {
    // Example predefined range logic, adjust as needed
    return 26000; // Adjust this value based on your strategy
}

// Step 3: Trigger the deal if conditions are met
async function placeLongOrder() {
    console.log('Placing long order...');
    const order = await binance.createMarketBuyOrder(pair, baseOrderAmount / await getCurrentPrice());
    console.log('Order placed:', order);
    return order;
}

// Helper function to get current price
async function getCurrentPrice() {
    const ticker = await binance.fetchTicker(pair);
    return ticker.last;
}

// Step 4: Execute the trade with tight take-profit and stop-loss
async function monitorTrade(order) {
    const entryPrice = order.price;
    const takeProfitPrice = entryPrice * takeProfitPercent;
    const stopLossPrice = entryPrice * stopLossPercent;

    console.log(`Monitoring trade: Entry Price: ${entryPrice}, Take Profit: ${takeProfitPrice}, Stop Loss: ${stopLossPrice}`);

    while (true) {
        const currentPrice = await getCurrentPrice();
        console.log(`Current Price: ${currentPrice}`);

        if (currentPrice >= takeProfitPrice) {
            console.log('Take-profit condition met! Closing trade...');
            await binance.createMarketSellOrder(pair, baseOrderAmount / currentPrice);
            console.log('Trade closed at profit.');
            break;
        } else if (currentPrice <= stopLossPrice) {
            console.log('Stop-loss triggered! Closing trade...');
            await binance.createMarketSellOrder(pair, baseOrderAmount / currentPrice);
            console.log('Trade closed with loss.');
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 5 seconds before checking again
    }
}

// Step 5: Close the deal and repeat the process
async function scalp() {
    const latestData = await fetchLatestData();
    
    if (checkScalpingOpportunity(latestData)) {
        const order = await placeLongOrder();
        await monitorTrade(order);
        console.log('Waiting for next scalp opportunity...');
    } else {
        console.log('No scalp opportunity detected, retrying in 1 minute...');
    }
    setTimeout(scalp, 4000); // Retry every minute
}

// Start the scalping bot
scalp().catch(console.error);
