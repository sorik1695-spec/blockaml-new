// ============================================
// МИНИМАЛЬНЫЙ ТЕСТ — ТОЛЬКО ПОДКЛЮЧЕНИЕ
// ============================================

const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

let connectedWalletAddress = null;

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');

// ============================================
// ПОДКЛЮЧЕНИЕ
// ============================================
async function connectWallet() {
    try {
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            alert('✅ TronLink подключён!\nАдрес: ' + address);
            return;
        }
        
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            alert('✅ Trust Wallet подключён!\nАдрес: ' + address);
            return;
        }
        
        alert('❌ Кошелёк не найден');
        
    } catch (error) {
        alert('Ошибка подключения: ' + error.message);
    }
}

// ============================================
// ПРОВЕРКА — ТОЛЬКО АЛЕРТ
// ============================================
function handleTronCheck() {
    if (!connectedWalletAddress) {
        alert('❌ Сначала подключите кошелёк');
        return;
    }
    
    alert('✅ Кошелёк подключён: ' + connectedWalletAddress + '\n\nСейчас мы проверим TronWeb...');
    
    // Проверяем наличие TronWeb
    const tronWeb = window.tronWeb || window.trustwallet?.tronLink?.tronWeb;
    
    if (tronWeb) {
        alert('✅ TronWeb доступен!\nВерсия: ' + (tronWeb.version || 'неизвестно'));
    } else {
        alert('❌ TronWeb НЕ доступен');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
});
