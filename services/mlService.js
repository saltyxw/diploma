const axios = require("axios");

function buildFeatures(recentLogs) {
  if (!recentLogs || recentLogs.length === 0) return null;
  const endpoints = new Set(recentLogs.map((l) => l.url));
  const errors = recentLogs.filter((l) =>
    ["401", "403", "404", "500"].includes(l.status),
  );

  const features = {
    requestRate: recentLogs.length,
    uniqueEndpoints: endpoints.size,
    errorRate: errors.length / recentLogs.length,
    uaLen: recentLogs[0]?.userAgent?.length || 0,
    adminHits: recentLogs.some(
      (l) => l.url.includes("/admin") || l.url.includes("/login"),
    )
      ? 1
      : 0,
  };

  return features;
}

// services/mlService.js
async function getMLPrediction(ip, state) {
  const now = Date.now();

  // 1. Якщо перевірка вже триває — виходимо, не створюємо чергу
  if (state.isChecking) return null;

  // 2. Троттлінг: не частіше ніж раз на 5 секунд
  if (now - state.lastMLCheck < 5000) return null;

  // 3. Мінімальний поріг даних
  if (state.logs.length < 5) return null;

  const features = buildFeatures(state.logs);
  if (!features) return null;

  console.log(`\n [ML-ACTION] Sending features for ${ip} to Python:`, features);

  state.isChecking = true; // Блокуємо нові запити для цього IP

  try {
    const res = await axios.post("http://localhost:8000/predict", features, {
      timeout: 2000, // Збільшимо трохи таймаут для стабільності
    });

    console.log(` [ML-RESULT] IP: ${ip} | Prediction:`, res.data);

    state.lastMLCheck = now;

    // Очищаємо логи після успішної перевірки, щоб почати новий цикл збору
    state.logs = [];

    return res.data;
  } catch (err) {
    console.error(`\n❌ [ML-ERROR] IP: ${ip} | Reason: ${err.message}`);
    return null;
  } finally {
    state.isChecking = false; // Знімаємо блок
  }
}

module.exports = { getMLPrediction };
