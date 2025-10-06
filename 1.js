const http = require('http');

const TEST_IPS = [
    '93.184.216.188',
    '93.184.216.189',
    '93.184.216.190',
    '93.184.216.191'
];

console.log('🧪 ТЕСТ IPSet ФУНКЦІОНАЛЬНОСТІ');
console.log('==============================');

let requestCount = 0;

function sendTestRequest(ip, index) {
    return new Promise((resolve) => {
        requestCount++;

        const req = http.request({
            hostname: 'localhost',
            port: 80,
            path: '/api/tasks',
            method: 'GET',
            headers: {
                'X-Real-IP': ip,
                'User-Agent': `IPSet-Test-${index}`
            }
        }, (res) => {
            console.log(`📨 Запит ${requestCount}: IP ${ip} - статус ${res.statusCode}`);
            resolve();
        });

        req.on('error', (err) => {
            console.log(`📨 Запит ${requestCount}: IP ${ip} - помилка ${err.code}`);
            resolve();
        });

        req.end();
    });
}

async function runIPSetTest() {
    console.log('🚀 Запуск тесту IPSet...\n');

    // Перша хвиля запитів
    for (let i = 0; i < 25; i++) {
        const ip = TEST_IPS[i % TEST_IPS.length];
        await sendTestRequest(ip, i);
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n⏳ Чекаємо 5 секунд...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Друга хвиля - має спрацювати блокування
    console.log('\n🔁 Друга хвиля запитів (має спрацювати блокування)...');
    for (let i = 25; i < 35; i++) {
        const ip = TEST_IPS[i % TEST_IPS.length];
        await sendTestRequest(ip, i);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎯 ТЕСТ ЗАВЕРШЕНО!');
    console.log('==================');
    console.log('Перевірте:');
    console.log('   - Чи IPSet спрацював');
    console.log('   - Статус IPSet в консолі блокувальника');
    console.log('\n💡 Команди для перевірки:');
    console.log('   sudo ipset list nginx_blocked_ips');
    console.log('   sudo iptables -L INPUT -n | grep nginx_blocked_ips');
}

runIPSetTest();