require('dotenv').config();
const ccxt = require('ccxt');
const API_Key = process.env.API_Key;
const API_Secret = process.env.API_Secret;


const futureExchange = new ccxt.binance({
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
const spotExchange = new ccxt.binance({
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
module.exports = {
    futureExchange,
    spotExchange
};