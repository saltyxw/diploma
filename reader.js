const { createClient } = require('redis');
const { Tail } = require('tail');
const config = require("./config.json");
const { exec } = require("child_process");
const { promisify } = require("util");
const execP = promisify(exec);

const logRegex = /^(\d{1,3}(?:\.\d{1,3}){3}) - - \[([^\]]+)\] "(\w+) ([^ ]+) HTTP\/[0-9.]+" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"(?: rt=([0-9.]+))?/;

const ipCounter = new Map();
const failedLoginCounter = new Map();
const endpointCounter = new Map();
const userAgentCounter = new Map();
const blockedIPs = new Set();

const protectionConfig = {
    general: { treshold: 100, time: 10000, blockTime: 600 },
    bruteForce: { failedAttempts: 10, time: 30000, blockTime: 1800 },
    endpoint: { treshold: 50, time: 15000, blockTime: 1200 },
    userAgent: { treshold: 5, time: 60000, blockTime: 3600 }
};


const client = createClient();

client.on('error', err => console.log('Redis Client Error', err));

async function detectBruteForce(ip, url, status) {
    const now = Date.now();
    if ((url.includes('/login') || url.includes('/auth')) && (status === '401' || status === '403' || status === '429')) {
        if (!failedLoginCounter.has(ip)) failedLoginCounter.set(ip, []);
        const attempts = failedLoginCounter.get(ip);
        attempts.push(now);
        const recent = attempts.filter(t => now - t <= protectionConfig.bruteForce.time);
        failedLoginCounter.set(ip, recent);
        await client.hSet('failedLoginCounter', ip, JSON.stringify(recent));
        console.log(` Brute force detected: IP ${ip} - ${recent.length} failed login attempts (status: ${status})`);
        if (recent.length >= protectionConfig.bruteForce.failedAttempts) {
            console.log(` Brute force attack detected from IP ${ip}!`);
            blockIP(ip, protectionConfig.bruteForce.blockTime, "brute_force_login");
            return true;
        }
    }
    return false;
}

async function detectEndpointAttack(ip, url) {
    const now = Date.now();
    const key = `${ip}-${url}`;
    if (!endpointCounter.has(key)) endpointCounter.set(key, []);
    const requests = endpointCounter.get(key);
    requests.push(now);
    const recent = requests.filter(t => now - t <= protectionConfig.endpoint.time);
    endpointCounter.set(key, recent);
    await client.hSet('endpointCounter', key, JSON.stringify(recent))
    if (recent.length >= protectionConfig.endpoint.treshold) {
        console.log(` Endpoint attack: IP ${ip} - ${url} (${recent.length} requests)`);
        blockIP(ip, protectionConfig.endpoint.blockTime, "endpoint_attack");
        return true;
    }
    return false;
}

async function detectSuspiciousUA(ip, userAgent) {
    const now = Date.now();
    if (!userAgentCounter.has(userAgent)) userAgentCounter.set(userAgent, []);
    const requests = userAgentCounter.get(userAgent);
    requests.push({ ip, time: now });
    const recent = requests.filter(r => now - r.time <= protectionConfig.userAgent.time);
    userAgentCounter.set(userAgent, recent);
    await client.hSet('userAgentCounter', userAgent, JSON.stringify(recent))
    const uniqueIPs = new Set(recent.map(r => r.ip));
    if (uniqueIPs.size >= protectionConfig.userAgent.treshold) {
        console.log(` Suspicious User-Agent: "${userAgent}" used by ${uniqueIPs.size} IPs`);
        uniqueIPs.forEach(suspiciousIP => {
            blockIP(suspiciousIP, protectionConfig.userAgent.blockTime, "suspicious_user_agent");
        });
        return true;
    }
    return false;
}

function detectScanning(ip, url, userAgent) {
    const scanningPatterns = [
        '/admin', '/phpmyadmin', '/wp-admin', '/.env',
        '/config', '/backup', '/sql', '/debug',
        'nikto', 'sqlmap', 'nmap', 'metasploit'
    ];
    const isScanning = scanningPatterns.some(pattern =>
        url.toLowerCase().includes(pattern) ||
        userAgent.toLowerCase().includes(pattern)
    );
    if (isScanning) {
        console.log(` Scanning detected: IP ${ip} - ${url}`);
        blockIP(ip, 3600, "port_scanning");
        return true;
    }
    return false;
}

async function blockIP(ip, timeout = 600, reason = "suspicious_activity") {
    if (blockedIPs.has(ip)) {
        console.log(`ℹIP ${ip} is already blocked`);
        return;
    }
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        console.log(`Skipping local IP: ${ip}`);
        return;
    }
    try {
        console.log(`Blocking IP ${ip} for ${timeout} seconds. Reason: ${reason}`);
        await execP(`sudo iptables -I INPUT -s ${ip} -j DROP`);
        console.log(`Successfully blocked IP ${ip}`);
        blockedIPs.add(ip);
        await client.sAdd('blockedIPs', ip)
        setTimeout(async () => {
            try {
                await execP(`sudo iptables -D INPUT -s ${ip} -j DROP`);
                blockedIPs.delete(ip);
                console.log(` Automatically unblocked IP ${ip}`);
            } catch {
                console.log(` Failed to automatically unblock IP ${ip}`);
            }
        }, timeout * 1000);
    } catch (err) {
        console.error(` Failed to block IP ${ip}:`, err.message);
    }
}

console.log(` ADVANCED PROTECTION ENABLED`);
console.log(`Watching log file: ${config.logPath}`);

const tail = new Tail(config.logPath);

tail.on("line", function (data) {
    const match = data.match(logRegex);
    if (match) {
        const [, ip, date, method, url, status, size, referrer, userAgent, responseTime] = match;
        const logEntry = { ip, date, method, url, status, size, referrer, userAgent, responseTime };
        if (url.includes('/admin') || url.includes('/login') || status === '401' || status === '403') {
            console.log(logEntry);
        }
        const now = Date.now();
        if (detectScanning(ip, url, userAgent)) return;
        if (detectSuspiciousUA(ip, userAgent)) return;
        if (detectBruteForce(ip, url, status)) return;
        if (detectEndpointAttack(ip, url)) return;
        if (!ipCounter.has(ip)) ipCounter.set(ip, []);
        const timestamps = ipCounter.get(ip);
        timestamps.push(now);
        const recent = timestamps.filter(t => now - t <= protectionConfig.general.time);
        ipCounter.set(ip, recent);
        if (recent.length >= protectionConfig.general.treshold) {
            console.log(`⚠️ IP ${ip} exceeded request threshold (${recent.length} > ${protectionConfig.general.treshold})`);
            blockIP(ip, protectionConfig.general.blockTime, "too_many_requests");
        }
    } else {
        console.log("Failed to parse line:", data);
    }
});

function showProtectionStatus() {
    console.log(` Blocked IPs: ${Array.from(blockedIPs).join(', ') || 'none'}`);
    console.log(` Active brute-force attacks: ${Array.from(failedLoginCounter.keys()).length}`);
    console.log(` Monitored endpoints: ${endpointCounter.size}`);
    console.log(` Suspicious User-Agents: ${userAgentCounter.size}`);
}

tail.on("error", function (error) {
    console.error('Error reading log file:', error);
});

process.on('SIGINT', function () {
    showProtectionStatus();
    console.log('\n Stopping monitoring...');
    tail.unwatch();
    process.exit(0);
});





