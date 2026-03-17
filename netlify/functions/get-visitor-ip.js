exports.handler = async function(event) {
  try {
    const clientIP = event.headers['x-nf-client-connection-ip'] ||
                     event.headers['x-forwarded-for'] ||
                     event.headers['client-ip'] ||
                     'Не удалось определить';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: clientIP,
        userAgent: event.headers['user-agent'] || 'неизвестно',
        timestamp: Date.now()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ошибка при получении IP' })
    };
  }
};