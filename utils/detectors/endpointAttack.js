const { redisClient } = require('../../redisClient')
const config = require('../../config.json')
const endpointCounter = new Map();
const { blockIP } = require('../blockIp')

async function detectEndpointAttack(ip, url) {
    const now = Date.now();
    const key = `${ip}-${url}`;
    if (!endpointCounter.has(key)) endpointCounter.set(key, []);
    const requests = endpointCounter.get(key);
    requests.push(now);
    const recent = requests.filter(t => now - t <= config.protectionConfig.endpoint.time);
    endpointCounter.set(key, recent);
    await redisClient.hSet('endpointCounter', key, JSON.stringify(recent));
    if (recent.length >= config.protectionConfig.endpoint.treshold) {
        console.log(` Endpoint attack: IP ${ip} - ${url} (${recent.length} requests)`);
        blockIP(ip, config.protectionConfig.endpoint.blockTime, "endpoint_attack");
        return true;
    }
    return false;
}

module.exports = { detectEndpointAttack };
