const os = require("os");
const { redisClient } = require("../redisClient");
const { getConfig } = require("./configService");

function getServerMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return {
    cpuLoad: os.loadavg()[0].toFixed(2),
    ramUsage: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
    uptime: Math.floor(os.uptime()),
    freeMemGB: (freeMem / 1024 ** 3).toFixed(2),
    totalMemGB: (totalMem / 1024 ** 3).toFixed(2),
  };
}

async function getAllStats() {
  const config = getConfig();
  const [failedLogin, endpoints, userAgents, blockedIPs] = await Promise.all([
    redisClient.hGetAll("failedLoginCounter"),
    redisClient.hGetAll("endpointCounter"),
    redisClient.hGetAll("userAgentCounter"),
    redisClient.sMembers("blockedIPs"),
  ]);

  return {
    blockedIPs,
    whitelist: config.whitelist || [],
    failedLoginCounter: failedLogin,
    endpointCounter: endpoints,
    userAgentCounter: userAgents,
    systemMetrics: getServerMetrics(),
  };
}

module.exports = { getAllStats };
