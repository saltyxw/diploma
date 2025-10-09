const { exec } = require("child_process");
const { promisify } = require("util");
const execP = promisify(exec);
const { redisClient } = require('../redisClient')

const blockedIPs = new Set();

async function blockIP(ip, timeout = 600, reason = "suspicious_activity") {
    if (blockedIPs.has(ip)) return;
    if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) return;

    try {
        console.log(` Blocking IP ${ip} for ${timeout}s. Reason: ${reason}`);
        await execP(`sudo iptables -I INPUT -s ${ip} -j DROP`);
        blockedIPs.add(ip);
        await redisClient.sAdd('blockedIPs', ip);

        setTimeout(async () => {
            try {
                await execP(`sudo iptables -D INPUT -s ${ip} -j DROP`);
                blockedIPs.delete(ip);
                console.log(` Unblocked IP ${ip}`);
            } catch {
                console.log(` Failed to unblock IP ${ip}`);
            }
        }, timeout * 1000);
    } catch (err) {
        console.error(` Failed to block IP ${ip}:`, err.message);
    }
}

module.exports = { blockIP, blockedIPs };
