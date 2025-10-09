const { Tail } = require('tail');
const { Server } = require('socket.io');
const fs = require('fs').promises

let config = require("./config.json");

const { connectRedis, redisClient } = require('./redisClient')
const { detectBruteForce } = require('./utils/detectors/bruteForce')
const { detectEndpointAttack } = require('./utils/detectors/endpointAttack')
const { detectScanning } = require('./utils/detectors/scanning')
const { detectSuspiciousUA } = require('./utils/detectors/suspiciousUserAgent')
const { blockIP } = require('./utils/blockIp')

const logRegex = /^(\d{1,3}(?:\.\d{1,3}){3}) - - \[([^\]]+)\] "(\w+) ([^ ]+) HTTP\/[0-9.]+" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"(?: rt=([0-9.]+))?/;

const ipCounter = new Map();

connectRedis();

const io = new Server(3001, {
    cors: {
        origin: ['http://localhost:3000', 'http://192.168.0.104:3000'],
        methods: ['GET', 'POST']
    },
    host: '0.0.0.0'
});

io.on('connection', async (socket) => {
    console.log("Client connected");
    setInterval(async () => {
        try {
            const failedLogin = await redisClient.hGetAll('failedLoginCounter');
            const endpoints = await redisClient.hGetAll('endpointCounter');
            const userAgents = await redisClient.hGetAll('userAgentCounter');
            const blockedIPs = await redisClient.sMembers('blockedIPs');
            socket.emit("statsUpdate", {
                blockedIPs,
                failedLoginCounter: failedLogin,
                endpointCounter: endpoints,
                userAgentCounter: userAgents
            });
        } catch (err) {
            console.error('Error sending stats to socket:', err.message);
        }
    }, 5000);
    let config;
    try {
        const raw = await fs.readFile('./config.json', 'utf8');
        config = JSON.parse(raw);
    } catch (err) {
        console.error("Error reading config.json:", err);
        config = { logPath: '', protectionConfig: {} };
    }

    socket.emit('getConfig', config);

    socket.on('changeConfig', async (newConfig, ack) => {
        try {
            config = { ...config, ...newConfig };
            await fs.writeFile('./config.json', JSON.stringify(config), 'utf8');
            ack && ack({ ok: true, config });
            io.emit('getConfig', config);
            console.log('Config updated and broadcasted');
        } catch (err) {
            console.error('Error saving config:', err);
            ack && ack({ ok: false, error: err.message });
        }
    });
});

console.log(`Watching log file: ${config.logPath}`);

const tail = new Tail(config.logPath);

tail.on("line", async function (data) {
    console.log(data)
    const match = data.match(logRegex);
    if (!match) return console.log("Failed to parse line:", data);

    const [, ip, date, method, url, status, size, referrer, userAgent] = match;
    const logEntry = { ip, date, method, url, status, size, referrer, userAgent };
    if (url.includes('/admin') || url.includes('/login') || ['401', '403'].includes(status)) {
        console.log(logEntry);
    }


    const now = Date.now();
    if (detectScanning(ip, url, userAgent)) return;
    if (await detectSuspiciousUA(ip, userAgent)) return;
    if (await detectBruteForce(ip, url, status)) return;
    if (await detectEndpointAttack(ip, url)) return;

    if (!ipCounter.has(ip)) ipCounter.set(ip, []);
    const timestamps = ipCounter.get(ip);
    timestamps.push(now);
    const recent = timestamps.filter(t => now - t <= config.protectionConfig.general.time);
    ipCounter.set(ip, recent);
    if (recent.length >= config.protectionConfig.general.treshold) {
        console.log(` IP ${ip} exceeded request threshold (${recent.length})`);
        blockIP(ip, config.protectionConfig.general.blockTime, "too_many_requests");
    }


});

tail.on("error", (err) => {
    console.error('Error reading log file:', err);
});

process.on('SIGINT', () => {
    console.log('\n Stopping monitoring...');
    tail.unwatch();
    process.exit(0);
});
