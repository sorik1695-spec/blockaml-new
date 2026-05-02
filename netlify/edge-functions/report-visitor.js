// netlify/functions/visitor.js

exports.handler = async (event) => {
    // Получаем IP посетителя от Netlify
    const clientIp = event.headers['x-nf-client-connection-ip'];
    const TELEGRAM_TOKEN = '8508345570:AAGJBV9H92ukUQsvsUqnM1uNfm8VdKn9AVk';
    const TELEGRAM_CHAT_ID = '-1003750493145';
    
    if (!clientIp) {
        return { statusCode: 200, body: 'No IP' };
    }
    
    const apiUrl = `https://api.ip2location.io/?ip=${clientIp}&format=json`;
    
    try {
        const response = await fetch(apiUrl);
        const geoData = await response.json();
        
        let message = `🌐 <b>Новый посетитель!</b>\n`;
        message += `📍 IP: <code>${clientIp}</code>\n`;
        message += `🏳️ Страна: ${geoData.country_name || 'не определена'}\n`;
        message += `🏙️ Город: ${geoData.city_name || 'не определён'}\n`;
        message += `📡 Провайдер: ${geoData.as || 'не определён'}\n`;
        
        if (geoData.is_proxy === true || geoData.vpn === true) {
            message += `⚠️ <b>ОБНАРУЖЕН ПРОКСИ / VPN!</b>\n`;
            if (geoData.proxy_type) message += `🔧 Тип: ${geoData.proxy_type}\n`;
        }
        
        message += `⏰ Время: ${new Date().toLocaleString()}`;
        
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
