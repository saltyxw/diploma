const { Tail } = require("tail");
const { Server } = require("socket.io");
const { exec } = require("child_process");

const { connectRedis, redisClient } = require("./redisClient");
const {
  loadConfig,
  saveConfig,
  getConfig,
} = require("./services/configService");
const { getAllStats } = require("./services/metricsService");
const { getMLPrediction } = require("./services/mlService");
const { blockIP } = require("./utils/blockIP");

const { detectBruteForce } = require("./utils/detectors/bruteForce");
const { detectEndpointAttack } = require("./utils/detectors/endpointAttack");
const { detectScanning } = require("./utils/detectors/scanning");
const { detectSuspiciousUA } = require("./utils/detectors/suspiciousUserAgent");

const logRegex =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\w+) ([^ ]+) HTTP\/[0-9.]+" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/;
const mlState = new Map();

const io = new Server(3001, {
  pingTimeout: 5000,
  pingInterval: 10000,
  cors: {
    origin: ["http://localhost:3000", "http://192.168.0.104:3000"],
    methods: ["GET", "POST"],
  },
});

connectRedis();

io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("getConfig", getConfig());
  const initialStats = await getAllStats();
  socket.emit("statsUpdate", initialStats);

  socket.on("requestConfig", () => socket.emit("getConfig", getConfig()));
  socket.on("requestStats", async () =>
    socket.emit("statsUpdate", await getAllStats()),
  );

  socket.on("changeConfig", async (newConfig, callback) => {
    try {
      await saveConfig(newConfig, io);
      if (callback) callback({ ok: true });
    } catch (err) {
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  socket.on("unblockIP", async (ip) => {
    await redisClient.sRem("blockedIPs", ip);
    exec(`sudo iptables -D INPUT -s ${ip} -j DROP`);
    io.emit("statsUpdate", await getAllStats());
  });

  socket.on("addToWhitelist", async (ip) => {
    const config = getConfig();
    if (!config.whitelist.includes(ip)) {
      await saveConfig({ whitelist: [...config.whitelist, ip] }, io);
      await redisClient.sRem("blockedIPs", ip);
      exec(`sudo iptables -D INPUT -s ${ip} -j DROP`);
      io.emit("statsUpdate", await getAllStats());
    }
  });
});

setInterval(async () => {
  const stats = await getAllStats();
  io.emit("statsUpdate", stats);
}, 1000);

async function startTail() {
  const config = await loadConfig();
  const tail = new Tail(config.logPath, { useWatchFile: true });

  tail.on("line", async (data) => {
    console.log("NEW LOG:", data);
    io.emit("newLogLine", data);
    const match = data.match(logRegex);
    if (!match) return;

    const [, ip, , , url, status, , , userAgent] = match;
    const currentConfig = getConfig();
    if (currentConfig.whitelist.includes(ip)) return;

    if (detectScanning(ip, url, userAgent)) return;
    if (await detectSuspiciousUA(ip, userAgent)) return;
    if (await detectBruteForce(ip, url, status)) return;
    if (await detectEndpointAttack(ip, url)) return;

    if (!mlState.has(ip))
      mlState.set(ip, {
        logs: [],
        lastMLCheck: 0,
        suspicionCount: 0,
        isChecking: false,
      });
    const state = mlState.get(ip);
    state.logs.push({ timestamp: Date.now(), url, status, userAgent });

    const mlResult = await getMLPrediction(ip, state);
    if (mlResult && mlResult.probability >= 0.85) {
      await blockIP(ip, 3600, "ml_critical_anomaly");
      return mlState.delete(ip);
    }

    if (
      state.logs.length >=
      (currentConfig.protectionConfig.general.treshold || 50)
    ) {
      await blockIP(ip, 3600, "too_many_requests");
      mlState.delete(ip);
    }
  });
}

startTail();
