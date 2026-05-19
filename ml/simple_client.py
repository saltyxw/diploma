import requests
import json
import time
from datetime import datetime

class MLClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def health_check(self):
        """Перевірка стану сервісу"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"status": "unreachable", "error": str(e)}
    
    def predict(self, log_entry):
        """Прогнозування аномалії"""
        try:
            response = requests.post(
                f"{self.base_url}/predict",
                json={"log_entry": log_entry, "train_if_normal": True},
                timeout=10
            )
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "anomaly": False, "confidence": 0}
    
    def batch_predict(self, logs):
        """Пакетне прогнозування"""
        try:
            response = requests.post(
                f"{self.base_url}/batch_predict",
                json={"logs": logs, "return_predictions": True},
                timeout=30
            )
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}
    
    def train(self, logs, labels=None):
        """Навчання моделі"""
        try:
            data = {"logs": logs}
            if labels:
                data["labels"] = labels
            
            response = requests.post(
                f"{self.base_url}/train",
                json=data,
                timeout=60
            )
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}
    
    def get_stats(self):
        """Отримання статистики"""
        try:
            response = requests.get(f"{self.base_url}/stats", timeout=5)
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}

# Приклад використання
if __name__ == "__main__":
    client = MLClient()
    
    # Перевірка здоров'я
    print("Health check:", client.health_check())
    
    # Тестовий лог
    test_log = {
        "ip": "192.168.1.100",
        "method": "GET",
        "url": "/index.html",
        "status": "200",
        "size": 1234,
        "userAgent": "Mozilla/5.0",
        "timestamp": time.time()
    }
    
    # Прогнозування
    print("\nPredicting anomaly:")
    result = client.predict(test_log)
    print(json.dumps(result, indent=2))
    
    # Статистика
    print("\nModel stats:")
    stats = client.get_stats()
    print(json.dumps(stats, indent=2))