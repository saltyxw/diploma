const { redisClient } = require('../../redisClient')
const config = require('../../config.json')
const { blockIP } = require('../blockIp')

const failedLoginCounter = new Map();


async function detectBruteForce(ip, url, status) {
    const now = Date.now();
    if ((url.includes('/login') || url.includes('/auth')) && ['401', '403', '429'].includes(status)) {
        if (!failedLoginCounter.has(ip)) failedLoginCounter.set(ip, []);
        const attempts = failedLoginCounter.get(ip);
        attempts.push(now);
        const recent = attempts.filter(t => now - t <= config.protectionConfig.bruteForce.time);
        failedLoginCounter.set(ip, recent);
        await redisClient.hSet('failedLoginCounter', ip, JSON.stringify(recent));
        if (recent.length >= config.protectionConfig.bruteForce.treshold) {
            console.log(`Brute force attack detected from IP ${ip}!`);
            blockIP(ip, config.protectionConfig.bruteForce.blockTime, "brute_force_login");
            return true;
        }
    }
    return false;
}

module.exports = { detectBruteForce, failedLoginCounter };
