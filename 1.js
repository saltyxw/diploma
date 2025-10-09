// quick-block-test.js
const http = require('http');

console.log('⚡ ШВИДКИЙ ТЕСТ БЛОКУВАННЯ ЗОВНІШНІХ IP');
console.log('IP: 93.184.216.200 - 110 запитів\n');

const testIP = '93.184.216.200';
let count = 0;

function sendRequest() {
    const req = http.request({
        hostname: 'localhost',
        port: 80,
        path: '/',
        method: 'GET',
        headers: {
            'User-Agent': 'Quick-Block-Test',
            'X-Forwarded-For': testIP
        }
    }, (res) => {
        res.on('data', () => { });
        res.on('end', () => {
            count++;
            process.stdout.write(`\r📨 Запит ${count}/110`);
            if (count >= 110) {
                console.log('\n\n🎯 ТЕСТ ЗАВЕРШЕНО!');
                console.log(`📊 IP ${testIP} відправив ${count} запитів`);
                console.log('🔍 Через 10 секунд перевірте:');
                console.log('   - Консоль reader.js (має бути сповіщення про блокування)');
                console.log('   - Веб-інтерфейс (blockedIPs має містити цей IP)');
            }
        });
    });

    req.on('error', () => {
        count++;
        process.stdout.write(`\r📨 Запит ${count}/110 (error)`);
    });
    req.end();
}

// Інтенсивна атака
const interval = setInterval(() => {
    sendRequest();
    if (count >= 11000) {
        clearInterval(interval);
    }
}, 80);