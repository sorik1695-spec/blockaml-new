exports.handler = async (event) => {
    // Разрешаем только POST-запросы
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Парсим данные, присланные с сайта
        const { address, risk, sources } = JSON.parse(event.body);

        // Проверяем, что все данные на месте
        if (!address || risk === undefined || !sources) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing data' }),
            };
        }

        // Читаем переменные окружения (токен бота и ID группы)
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram credentials not set' }),
            };
        }

        // Формируем текст сообщения
        const message = `
🔍 Новая проверка кошелька
Адрес: ${address}
Риск: ${risk}%
Источники: ${sources.join(', ')}
Время: ${new Date().toLocaleString('ru-RU')}
        `.trim();

        // Отправляем запрос к Telegram API
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true }),
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram API error', details: data }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error', details: error.message }),
        };
    }
};