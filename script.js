downloadPdfBtn.addEventListener('click', function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Получаем данные
        const address = document.getElementById('checkedAddress').textContent;
        const risk = document.getElementById('riskPercent').textContent;
        const total = document.getElementById('totalTx').textContent;
        const suspicious = document.getElementById('suspiciousTx').textContent;
        const age = document.getElementById('walletAge').textContent;
        const last = document.getElementById('lastActive').textContent;
        
        // Получаем источники риска и удаляем эмодзи
        const sourceElements = document.querySelectorAll('#sourcesList p');
        let sourcesText = '';
        sourceElements.forEach(el => {
            // Убираем эмодзи и лишние символы
            let cleanText = el.textContent
                .replace(/[🔞🛑🚫⚖️🏦🎰🛠️🌀💰🌍🎭🔪💣🏧⚠️💧🤝❓⚠️]/g, '') // удаляем эмодзи
                .replace('⚠️', '')
                .trim();
            if (cleanText) {
                sourcesText += '• ' + cleanText + '\n';
            }
        });

        // Очищаем адрес от возможных эмодзи
        const cleanAddress = address.replace(/[🔍🛡️🔬]/g, '').trim();

        // Настраиваем поддержку кириллицы (используем стандартный шрифт)
        doc.setFont('helvetica', 'normal');
        
        // Заголовок
        doc.setFontSize(20);
        doc.setTextColor(0, 150, 136); // тёмно-зелёный
        doc.text('Отчет AML-проверки', 20, 20);
        
        // Основная информация
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
        
        // Источники риска (если есть)
        if (sourcesText) {
            doc.text('Источники риска:', 20, y);
            y += 7;
            const lines = doc.splitTextToSize(sourcesText, 170);
            doc.text(lines, 25, y);
        }
        
        // Сохраняем PDF с правильным именем
        const fileName = `AML-report-${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
        console.log('PDF успешно создан');
        
    } catch (error) {
        console.error('Ошибка при создании PDF:', error);
        alert('Ошибка создания PDF. Проверьте консоль (F12) для деталей.');
    }
});
