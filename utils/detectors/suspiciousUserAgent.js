const { redisClient } = require('../../redisClient')
const config = require('../../config.json')
const { blockIP } = require('../blockIP')

const userAgentCounter = new Map();

async function detectSuspiciousUA(ip, userAgent) {
    const now = Date.now();
    if (!userAgentCounter.has(userAgent)) userAgentCounter.set(userAgent, []);
    const requests = userAgentCounter.get(userAgent);
    requests.push({ ip, time: now });
    const recent = requests.filter(r => now - r.time <= config.protectionConfig.userAgent.time);
    userAgentCounter.set(userAgent, recent);
    await redisClient.hSet('userAgentCounter', userAgent, JSON.stringify(recent));
    const uniqueIPs = new Set(recent.map(r => r.ip));
    if (uniqueIPs.size >= config.protectionConfig.userAgent.treshold) {
        console.log(` Suspicious User-Agent: "${userAgent}" used by ${uniqueIPs.size} IPs`);
        for (const suspiciousIP of uniqueIPs) {
            blockIP(suspiciousIP, config.protectionConfig.userAgent.blockTime, "suspicious_user_agent");
        }
        return true;
    }
    return false;
}

module.exports = { detectSuspiciousUA, userAgentCounter };
