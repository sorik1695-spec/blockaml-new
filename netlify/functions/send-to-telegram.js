exports.handler = async (event) => {
    console.log('Функция вызвана! Метод:', event.httpMethod);
    console.log('Тело запроса:', event.body);

    if (event.httpMethod !== 'POST') {
        console.log('Метод не POST');
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { address, risk, sources, totalTransactions, suspiciousTransactions } = JSON.parse(event.body);
        console.log('Получены данные:', { address, risk, sources, totalTransactions, suspiciousTransactions });

        if (!address || risk === undefined || !sources) {
            console.log('Ошибка: не все поля переданы');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing data' }),
            };
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        console.log('Токен загружен:', botToken ? 'Да' : 'Нет');
        console.log('Chat ID загружен:', chatId ? 'Да' : 'Нет');

        if (!botToken || !chatId) {
            console.log('Ошибка: нет токена или chat ID');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram credentials not set' }),
            };
        }

        const message = `
🔍 Новая проверка кошелька
Адрес: ${address}
Риск: ${risk}%
Источники: ${sources.join(', ')}
Всего транзакций: ${totalTransactions || 'N/A'}
Подозрительных: ${suspiciousTransactions || 'N/A'}
Время: ${new Date().toLocaleString('ru-RU')}
        `.trim();

        console.log('Формируем сообщение:', message);

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        console.log('URL для отправки:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
            }),
        });

        console.log('Статус ответа от Telegram:', response.status);

        const data = await response.json();
        console.log('Ответ от Telegram:', data);

        if (data.ok) {
            console.log('Успешно отправлено!');
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true }),
            };
        } else {
            console.log('Ошибка Telegram API:', data);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram API error', details: data }),
            };
        }
    } catch (error) {
        console.log('Критическая ошибка:', error.message);
        console.log('Стек ошибки:', error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error', details: error.message }),
        };
    }
};
