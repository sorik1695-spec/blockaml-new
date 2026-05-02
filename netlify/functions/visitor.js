// netlify/functions/visitor.js

exports.handler = async (event) => {
    const clientIp = event.headers['x-nf-client-connection-ip'];
    const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
    const TELEGRAM_CHAT_ID = '-1003750493145';
    
    if (!clientIp) {
        return { statusCode: 200, body: 'No IP' };
    }
    
    // Используем ключ (замени на свой, если зарегистрируешься)
    // Без ключа — 500 запросов/день, без определения VPN
    const apiKey = ''; // оставь пустым для keyless режима
    const apiUrl = `https://api.ip2location.io/?ip=${clientIp}&format=json${apiKey ? `&key=${apiKey}` : ''}`;
    
    try {
        const response = await fetch(apiUrl);
        const geoData = await response.json();
        
        let message = `📍 <b>Новый посетитель!</b>\n\n`;
        
        // IP-адрес
        message += `🔹 IP: <code>${clientIp}</code>\n`;
        
        // Страна, регион, город
        if (geoData.country_name) message += `🔹 Страна: ${geoData.country_name}\n`;
        if (geoData.region_name) message += `🔹 Регион: ${geoData.region_name}\n`;
        if (geoData.city_name) message += `🔹 Город: ${geoData.city_name}\n`;
        
        // Координаты (точное местоположение)
        if (geoData.latitude && geoData.longitude) {
            message += `🔹 Координаты: ${geoData.latitude}, ${geoData.longitude}\n`;
            message += `🔹 Карта: https://www.google.com/maps?q=${geoData.latitude},${geoData.longitude}\n`;
        }
        
        // Провайдер
        if (geoData.as) message += `🔹 Провайдер: ${geoData.as}\n`;
        
        // VPN / Прокси (только с API-ключом)
        if (apiKey) {
            const isProxy = geoData.is_proxy === true || geoData.is_vpn === true;
            if (isProxy) {
                message += `⚠️ <b>ОБНАРУЖЕН ПРОКСИ / VPN!</b>\n`;
                if (geoData.proxy_type) message += `🔹 Тип: ${geoData.proxy_type}\n`;
            }
        } else {
            message += `ℹ️ Для определения VPN зарегистрируйся на ip2location.io\n`;
        }
        
        // Время
        message += `\n⏰ ${new Date().toLocaleString()}`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_notification: true
            })
        });
        
    } catch (error) {
        console.error('Ошибка геолокации:', error);
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' })
    };
};
