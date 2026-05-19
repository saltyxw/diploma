const fs = require("fs").promises;
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../config.json");
let config = {};

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    config = JSON.parse(raw);
    if (!config.whitelist) config.whitelist = [];
    return config;
  } catch (err) {
    console.error("Error loading config:", err);
    return { whitelist: [], protectionConfig: {} };
  }
}

async function saveConfig(newConfig, io) {
  config = { ...config, ...newConfig };
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    if (io) io.emit("getConfig", config);
    return config;
  } catch (err) {
    console.error("Error saving config:", err);
    throw err;
  }
}

function getConfig() {
  return config;
}

module.exports = { loadConfig, saveConfig, getConfig };
