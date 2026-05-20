# Інтелектуальна система виявлення та блокування мережевих атак на веб-ресурси

Гібридна система захисту веб-ресурсів, що поєднує сигнатурний аналіз та машинне навчання (Random Forest) для виявлення аномального трафіку в реальному часі.

### Автор

- ПІБ: Стельмащук Андрій Васильович
- Група: ФеІ-42
- Спеціальність: 122 - Комп'ютерні науки
- Науковий керівник: Стахіра Р. Й.
- Рік виконання: 2026

### Загальна інформація

- Тип проєкту: Система виявлення вторгнень (IDS/IPS)
- Мови програмування: JavaScript (Node.js), Python, TypeScript
- Фреймворки / Бібліотеки:
  - Backend: Node.js, Express, Socket.IO, Redis
  - ML: Python, Scikit-learn (Random Forest), Pandas, FastAPI
  - Frontend: Next.js, React, TailwindCSS, Socket.IO client

### Опис функціоналу

- Моніторинг HTTP-трафіку в реальному часі шляхом читання логів Nginx (access.log)
- Сигнатурний аналіз атак: SQL-ін'єкції, XSS, Path Traversal, сканування вразливостей
- Інтелектуальна класифікація трафіку на основі алгоритму Random Forest
- Автоматичне блокування зловмисних IP-адрес через системний фаєрвол (iptables)
- Веб-дашборд для моніторингу стану системи в реальному часі
- Керування білими та чорними списками IP-адрес
- Агрегація ознак через механізм ковзного часового вікна (Sliding Window)
- API для взаємодії між модулями Node.js та Python

### Опис основних файлів та модулів

| Файл / Модуль | Призначення |
| :--- | :--- |
| reader.js | Головний модуль збору даних на Node.js, Tail-читання логів |
| mlService.js | Взаємодія з Python ML сервісом через HTTP |
| blockIP.js | Виконання команд блокування через iptables |
| ml/app.py | FastAPI сервер для ML-передбачень |
| ml/train.py | Навчання моделі Random Forest з SMOTE та GroupKFold |
| ml/model.pkl | Серіалізована навчена модель |
| services/configService.js | Читання та збереження конфігурації |
| services/metricsService.js | Збір статистики з Redis |
| utils/detectors/ | Детектори сигнатурного аналізу (bruteForce, scanning, suspiciousUA) |
| frontend/ | Next.js веб-інтерфейс (дашборд, логи, конфігурація) |
| config.json | Конфігураційний файл системи |
| docker-compose.yml | Орикестрація Docker контейнерів (Redis, Nginx, ML) |
| nginx.conf | Конфігураційний файл Nginx (зразок для проекту) |

### Налаштування Nginx (обов'язково)

Для коректної роботи системи необхідно налаштувати Nginx на запис логів у відповідному форматі. Нижче наведено зразок конфігурації, який потрібно адаптувати під ваш сервер.

Приклад конфігурації Nginx (nginx.conf)
```nginx
http {
    # Формат логу, який розуміє система (парситься регулярним виразом)
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';

    # Альтернативний формат з JSON (простіше для парсингу)
    log_format json escape=json '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"request":"$request",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"http_referer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
    '}';

    # Шлях до файлу логів (має співпадати з logPath у config.json)
    access_log /var/log/nginx/access.log main;

    server {
        listen 80;
        server_name localhost;
        root /var/www/html;

        location / {
            try_files $uri $uri/ =404;
        }
    }
}
```
### Важливі зауваження щодо Nginx

- Наведений вище nginx.conf є прикладом. Для іншого середовища шлях до логів може відрізнятися (наприклад, /usr/local/var/log/nginx/access.log на macOS).
- Система читає файл логів, вказаний у параметрі logPath файлу config.json. Він має співпадати з реальним шляхом, куди Nginx записує логи.
- Формат логу (log_format) має бути сумісним з регулярним виразом у reader.js. Якщо використовувати кастомний формат, відповідно треба змінити logRegex.

### Docker для Windows (Redis та Nginx)

Оскільки на операційній системі Windows нативно запустити Redis складно (немає прямої підтримки), а Nginx потребує налаштування середовища, у проекті передбачено використання Docker для запуску цих сервісів.

Роль Docker у проекті

| Сервіс | Призначення у проекті |
| :--- | :--- |
| Redis | In-memory сховище для зберігання стану IP-адрес (заблоковані, кількість запитів, статистика). Без Redis система не працює. |
| Nginx | Веб-сервер, який генерує логи доступу (access.log). Система читає цей файл. |

### Запуск Redis та Nginx через Docker (Windows)

- Встановіть [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
- У корені проекту виконайте:

``` bash

docker-compose up -d
```
- **Перевірте, що контейнери запущено:**

```bash**

docker ps
```
**Ви маєте побачити:**

- **redis:alpine - працює на порту 6379**
- **nginx:alpine - працює на порту 80**

- Nginx всередині контейнера генерує логи за шляхом /var/log/nginx/access.log. Ваш reader.js читатиме їх звідти.

**Файл docker-compose.yml (приклад)**

```yaml

version: '3.8'

services:
  redis:
    image: redis:alpine
    container_name: redis-security
    ports:
      - "6379:6379"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: nginx-security
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./logs:/var/log/nginx
    restart: unless-stopped
```
**Альтернатива для Linux (без Docker)**

Якщо ви працюєте на Linux (Ubuntu/Debian), Redis та Nginx можна встановити нативно:

```bash**

# Redis
sudo apt install redis-server
sudo systemctl start redis-server

# Nginx
sudo apt install nginx
sudo systemctl start nginx
```
У цьому випадку Docker не потрібен.

**Як запустити проєкт з нуля**

**1\. Встановлення інструментів**

**Загальні вимоги:**

- Node.js 20.x або вище
- Python 3.10+
- Git

**Для Windows:**

- Docker Desktop (для Redis та Nginx)
- Або WSL2 з Ubuntu

**Для Linux (Ubuntu/Debian):**

- Redis: sudo apt install redis-server
- Nginx: sudo apt install nginx

**2\. Клонування репозиторію**

```bash**

git clone <https://github.com/saltyxw/intelligent-web-security.git>

cd app
```
**3\. Налаштування Nginx**

Якщо використовуєте Docker (Windows):

```bash**

docker-compose up -d
```
**Якщо використовуєте нативний Nginx (Linux):**

Скопіюйте приклад конфігурації:

```bash**

sudo cp nginx.conf /etc/nginx/nginx.conf

sudo nginx -t # перевірка синтаксису**

sudo systemctl restart nginx
```
**4\. Backend (Node.js)**

```bash**

npm install
```
**Відредагуйте config.json (вкажіть правильний шлях до логів):**

```json**

{
  "logPath": "/var/log/nginx/access.log",
  "whitelist": ["127.0.0.1"],
  "protectionConfig": {
    "general": { "threshold": 150, "time": 10000, "blockTime": 600 },
    "bruteForce": { "threshold": 10, "time": 30000, "blockTime": 1800 },
    "endpoint": { "threshold": 50, "time": 10000, "blockTime": 600 },
    "userAgent": { "threshold": 100, "time": 60000, "blockTime": 3600 }
  }
}
```
**Запустіть Redis (через Docker або нативно):**

```bash**

\# Docker (Windows)

docker-compose up -d redis

**\# Linux нативно**

sudo systemctl start redis-server
```
**Запустіть модуль збору даних:**

```bash**

node reader.js
```
**5\. Frontend (Next.js)**

```bash**

cd frontend

npm install

npm run dev
```
**Фронтенд буде доступний на <http://localhost:3000>.**

**Приклад конфігурації (config.json)**

```json**

{
  "logPath": "/var/log/nginx/access.log",
  "whitelist": ["127.0.0.1", "192.168.1.100"],
  "protectionConfig": {
    "general": {
      "threshold": 150,
      "time": 10000,
      "blockTime": 600
    },
    "bruteForce": {
      "threshold": 10,
      "time": 30000,
      "blockTime": 1800
    },
    "endpoint": {
      "threshold": 50,
      "time": 10000,
      "blockTime": 600
    },
    "userAgent": {
      "threshold": 100,
      "time": 60000,
      "blockTime": 3600
    }
  }
}
```
**Параметри:**

- threshold - максимальна кількість запитів за проміжок часу
- time (мс) - часове вікно для аналізу
- blockTime (с) - тривалість блокування IP

### API приклади

**ML Service (FastAPI)**

POST /predict

**Тіло запиту (JSON):**

```json**
{
  "requestRate": 45.0,
  "uniqueEndpoints": 12.0,
  "errorRate": 0.35,
  "ualLen": 85.0,
  "adminHits": 3.0
}
Відповідь (JSON)
{
  "prediction": 1,
  "probability": 0.92,
  "threshold": 0.75
}
```
### Socket.IO події (для фронтенду)

| Подія | Напрямок | Опис |
| :--- | :--- | :--- |
| newLogLine | Сервер → Клієнт | Новий рядок з access.log |
| statsUpdate | Сервер → Клієнт | Оновлення статистики |
| getConfig | Сервер → Клієнт | Поточна конфігурація |
| changeConfig | Клієнт → Сервер | Зміна конфігурації |
| unblockIP | Клієнт → Сервер | Розблокування IP |
| addToWhitelist | Клієнт → Сервер | Додавання IP в білий список |

### Інструкція для користувача (адміністратора)

#### Дашборд (головна сторінка)

- Відображає ключові метрики: кількість заблокованих IP, активних ендпоінтів, невдалих логінів, унікальних User-Agent
- Графік розподілу атак за типами
- Список топ IP-адрес за активністю
- Інформація про стан хоста (CPU, RAM, Uptime)

#### Журнал подій (Live Log View)

- Відображення потоку запитів у реальному часі
- Кольорове маркування: зелений (безпечний), червоний (атака)
- Пошук записів
- Автоматичне прокручування

#### Конфігурація

- Налаштування порогів спрацювання для General, BruteForce, Endpoint, UserAgent
- Збереження конфігурації без перезапуску системи

#### Керування IP

- Перегляд білого списку
- Ручне додавання/видалення IP з білого списку
- Розблокування раніше заблокованих адрес

### Алгоритми та методи

#### Збір даних

- Неблокуюче читання логів через Tail (Node.js)
- Парсинг рядків регулярним виразом
- Первинна фільтрація статичних запитів

#### Сигнатурний аналіз

- detectScanning - виявлення спроб доступу до службових шляхів (.env, /admin, /wp-admin)
- detectBruteForce - аналіз частоти помилок авторизації (HTTP 401/403)
- detectSuspiciousUA - перевірка User-Agent на відповідність відомим хакерським інструментам
- detectEndpointAttack - захист конкретних ендпоінтів

#### Машинне навчання

- Алгоритм: Random Forest (ансамбль дерев рішень)
- Ознаки: requestRate, uniqueEndpoints, errorRate, ualLen, adminHits
- Балансування даних: SMOTE (Synthetic Minority Over-sampling Technique)
- Валідація: GroupKFold (групування за IP-адресами)
- Гіперпараметри: оптимізація через Grid Search

#### Механізм реагування

- Автоматичне блокування через iptables -A INPUT -s {IP} -j DROP
- Зберігання стану в Redis з TTL
- Трансляція подій на фронтенд через Socket.IO

### Проблеми і рішення

| Проблема | Рішення |
| :--- | :--- |
| Node.js не може читати файл логів | Перевірити права: sudo chmod 644 /var/log/nginx/access.log |
| Python ML сервер не відповідає | Переконатися, що FastAPI запущений на порту 8000 |
| Redis підключення помилка (Windows) | Використати Docker: docker-compose up -d redis |
| Redis підключення помилка (Linux) | sudo systemctl start redis-server |
| iptables: Permission denied | Запускати Node.js з sudo або налаштувати sudoers |
| Модель не виявляє нові атаки | Донавчити модель на новому датасеті (ml/train.py) |
| Високе навантаження на CPU | Збільшити часове вікно або пороги спрацювання |
| Логи не з'являються в real-time | Перевірити, що Nginx дійсно пише логи (sudo tail -f /var/log/nginx/access.log) |

### Використані джерела та література

- Офіційна документація Node.js
- Scikit-learn документація (Random Forest, SMOTE)
- FastAPI документація
- Next.js документація
- Redis документація
- Docker документація
- OWASP Top 10 (2021/2025)
- Документація Nginx
- "Anomaly Detection in Web Traffic using Machine Learning" - IEEE Xplore
- SMOTE: Synthetic Minority Over-sampling Technique (JAIR 2002)

**Посилання на код**

- GitHub репозиторій: <https://github.com/saltyxw/diploma>

У виробничому середовищі **не потрібно використовувати саме цей файл**. Потрібно лише:

- Додати реальний Nginx конфіг необхідний log_format (щоб система правильно парсила логи)
- Вказати у config.json одного з проектів проекту реальний шлях до логів (наприклад, /var/log/nginx/access.log)
- Якщо проксуються запити через Nginx до ML сервісу - додати проксі-заголовки для передачі реальних IP
