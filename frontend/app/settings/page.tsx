"use client";

import socket from "@/socket";
import { useEffect, useState } from "react";
import DetectorEditor from "@/components/DetectorConfig";

export interface Detector {
  treshold: number;
  time: number;
  blockTime: number;
}

interface IProtectionConfig {
  [key: string]: Detector;
}

interface IConfig {
  logPath: string;
  protectionConfig: IProtectionConfig;
}

export default function Page() {
  const [configs, setConfigs] = useState<IConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // --- Підписка на сокет ---
  useEffect(() => {
    // 1. Оголошуємо обробник
    const handler = (config: IConfig) => {
      console.log("Received config:", config);
      setConfigs(config);
    };

    // 2. Підписуємось на подію
    socket.on("getConfig", handler);

    // 3. ПЕРЕВІРКА: Якщо сокет вже підключений, запитуємо дані негайно.
    // Якщо ні - вони прийдуть автоматично при підключенні (бо сервер так налаштований)
    if (socket.connected) {
      socket.emit("requestConfig");
    }

    // 4. Додатково слухаємо подію connect, щоб пересвідчитись, що запит піде
    socket.on("connect", () => {
      socket.emit("requestConfig");
    });

    return () => {
      socket.off("getConfig", handler);
      socket.off("connect");
    };
  }, []);

  // --- Оновлення полів детекторів ---
  const updateDetectorField = (
    detKey: string,
    field: keyof Detector,
    value: number,
  ) => {
    if (!configs) return;
    setConfigs((c) => ({
      ...c!,
      protectionConfig: {
        ...c!.protectionConfig,
        [detKey]: {
          ...c!.protectionConfig[detKey],
          [field]: value,
        },
      },
    }));
  };

  // --- Скидання детектора ---
  const handleResetDetector = (detKey: string) => {
    setConfigs((c) => {
      if (!c) return c;
      return {
        ...c,
        protectionConfig: {
          ...c.protectionConfig,
          [detKey]: { treshold: 0, time: 0, blockTime: 0 },
        },
      };
    });
    setStatus(`Скинуто "${detKey}" до дефолтів.`);
    setTimeout(() => setStatus(null), 2000);
  };

  // --- Збереження конфігу на сервері ---
  const handleSave = () => {
    if (!configs) return;

    // Валідація значень
    for (const detKey in configs.protectionConfig) {
      const det = configs.protectionConfig[detKey];
      if (det.treshold < 0 || det.time < 0 || det.blockTime < 0) {
        setStatus("Помилка: всі числові значення повинні бути >= 0");
        return;
      }
    }

    socket.emit("changeConfig", configs, (response: any) => {
      if (response?.ok) setStatus("Конфіг збережено ✅");
      else
        setStatus(
          "Помилка збереження: " + (response?.error || "невідома помилка"),
        );
      setTimeout(() => setStatus(null), 3000);
    });
  };

  if (!configs) return <div className="p-6 text-white">Loading config…</div>;

  return (
    <main className="p-6 text-white max-w-4xl mx-auto">
      <h2 className="text-center text-4xl mb-6">Config</h2>

      {/* Log path */}
      <section className="mb-6 bg-gray-800 p-4 rounded-lg">
        <label className="block text-sm text-gray-300 mb-2">Log path</label>
        <input
          type="text"
          value={configs.logPath}
          onChange={(e) =>
            setConfigs((c) => (c ? { ...c, logPath: e.target.value } : c))
          }
          className="w-full bg-neutral-900 border border-neutral-700 p-2 rounded text-white"
        />
      </section>

      {/* Dynamic detectors */}
      <section className="mb-6  grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(configs.protectionConfig).map(([detKey, det]) => (
          <DetectorEditor
            key={detKey}
            detKey={detKey}
            detector={det}
            onChange={(field, value) =>
              updateDetectorField(detKey, field, value)
            }
            onReset={() => handleResetDetector(detKey)}
          />
        ))}
      </section>

      {/* Кнопка збереження та статус */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white"
        >
          Save Config
        </button>
        {status && <div className="text-gray-300">{status}</div>}
      </div>

      {/* Відображення JSON конфігу */}
      <pre className="mt-4 p-3 bg-neutral-800 rounded text-xs overflow-auto">
        {JSON.stringify(configs, null, 2)}
      </pre>
    </main>
  );
}
