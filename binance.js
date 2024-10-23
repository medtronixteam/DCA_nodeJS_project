const ccxt = require('ccxt');
require('dotenv').config();
const API_Key = process.env.API_Key;
const API_Secret =  process.env.API_Secret;

async function performSelling (action,currentPrice) {
    const exchange = new ccxt.binance({
        apiKey: API_Key,
        secret:API_Secret,
    });

        if (action=="buy") {
            console.log('Buying Bitcoin...');
          //  const buyOrder = await exchange.createMarketBuyOrder('BTC/USDT', 0.001); // Adjust order amount
            console.log('Buy order placed:', currentPrice);
        }

        if (action=="sell") {
            console.log('Selling Bitcoin...');
            //const sellOrder = await exchange.createMarketSellOrder('BTC/USDT', 0.001); // Adjust order amount
            console.log('Sell order placed:', currentPrice);
        }
  
}


module.exports = performSelling;
