# Room Comfort Keeper — Backend

Hệ thống giám sát và điều khiển nhiệt độ phòng theo thời gian thực, sử dụng **ESP32 + DHT11** làm phần cứng và **NestJS** làm backend API.

## Tổng quan kiến trúc

```
ESP32 (DHT11 + Relay)
    │
    │  MQTT (publish: temperature, humidity)
    │  MQTT (subscribe: fan command)
    ▼
MQTT Broker
    │
    ▼
NestJS Backend ◄── REST API ──► Frontend (React)
    │
    ▼
PostgreSQL
```

**Modules chính:**

| Module | Chức năng |
|---|---|
| `MqttModule` | Kết nối MQTT broker, nhận dữ liệu cảm biến, gửi lệnh quạt |
| `MonitoringModule` | Lưu lịch sử sensor readings, SSE stream real-time |
| `ThresholdModule` | Quản lý ngưỡng nhiệt độ (min/max) để tự động bật/tắt quạt |
| `AlertsModule` | Ghi nhận cảnh báo khi nhiệt độ vượt ngưỡng |
| `DevicesModule` | REST API quản lý thiết bị |
| `AuthModule` | Xác thực JWT |

---

## Yêu cầu hệ thống

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** >= 14
- **MQTT Broker** (ví dụ: Adafruit IO, Mosquitto, HiveMQ)

---

## Cài đặt & Khởi chạy

### 1. Clone project

```bash
git clone https://github.com/HaiAlison/room-comfort-be.git
cd room-comfort-be
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Sau đó cập nhật các giá trị trong `.env`:

```env
# Server
PORT=3001
BASE_URL=http://localhost:
NODE_ENV=development
SERVICE_NAME=room-comfort-be
WHITE_LIST=http://localhost:8080,http://localhost:5173

# PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASS=postgres
DATABASE_NAME=room-comfort
SSL_MODE=false

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1d
API_KEY_SERVICE=your_api_key_service_here

# Tài khoản mặc định (seed lần đầu)
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=your_password

# MQTT Broker
MQTT_URL=mqtt://your-broker-url:1883
MQTT_USERNAME=your_mqtt_user
MQTT_PASSWORD=your_mqtt_password
MQTT_TEMPERATURE_TOPIC=dadn/feeds/temperature
MQTT_HUMIDITY_TOPIC=dadn/feeds/humidity
MQTT_FAN_TOPIC=dadn/feeds/fan
MQTT_FAN_ON_PAYLOAD=1
MQTT_FAN_OFF_PAYLOAD=0

# Ngưỡng nhiệt độ mặc định
DEFAULT_MIN_TEMPERATURE=20
DEFAULT_MAX_TEMPERATURE=30
```

### 4. Tạo database

```bash
# Tạo database PostgreSQL
createdb room-comfort

# Hoặc dùng psql
psql -U postgres -c "CREATE DATABASE \"room-comfort\";"
```

### 5. Chạy migration

```bash
# Build project trước
npm run build

# Chạy migrations
npm run migration:run
```

### 6. Khởi chạy server

```bash
# Development (hot-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server sẽ chạy tại `http://localhost:3001`.

Swagger API docs: `http://localhost:3001/swagger`.

---

## Scripts có sẵn

| Script | Lệnh | Mô tả |
|---|---|---|
| Dev server | `npm run start:dev` | Chạy dev với hot-reload |
| Build | `npm run build` | Build production |
| Production | `npm run start:prod` | Chạy bản build |
| Tạo migration | `npm run migration:generate --name=MigrationName` | Tạo migration mới từ entity changes |
| Chạy migration | `npm run migration:run` | Áp dụng migrations |
| Revert migration | `npm run migration:revert` | Rollback migration gần nhất |
| Lint | `npm run lint` | Kiểm tra và fix linting |
| Test | `npm run test` | Chạy unit tests |

---

## API Endpoints chính

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/monitoring/current` | Lấy nhiệt độ & độ ẩm hiện tại |
| `GET` | `/monitoring/history` | Lấy lịch sử readings (hỗ trợ filter, pagination) |
| `SSE` | `/monitoring/events` | Stream real-time sensor readings |
| `GET` | `/monitoring/threshold` | Lấy ngưỡng nhiệt độ hiện tại |
| `PUT` | `/monitoring/threshold` | Cập nhật ngưỡng nhiệt độ |
| `GET` | `/devices/fan` | Lấy trạng thái quạt |
| `SSE` | `/devices/fan/events` | Stream real-time trạng thái quạt |
| `PUT` | `/devices/fan` | Bật/tắt quạt (manual) |
| `PUT` | `/devices/fan/mode` | Chuyển chế độ auto/manual |

Xem chi tiết tất cả API tại **Swagger**: `http://localhost:<PORT>/swagger`

---

## Firmware ESP32 (`firmware/room/room.ino`)

Thư mục `firmware/room/` chứa file `room.ino` — firmware Arduino dành cho **ESP32**, đảm nhận vai trò phần cứng của hệ thống.

### Chức năng

- **Đọc cảm biến DHT11** — đo nhiệt độ và độ ẩm mỗi 2 giây
- **Gửi dữ liệu lên MQTT Broker** — publish temperature & humidity mỗi 15 giây
- **Nhận lệnh điều khiển quạt** — subscribe topic `fan`, bật/tắt relay theo lệnh từ backend
- **Hiển thị trên màn hình TFT** — driver custom cho module GMT147 (ST7789, 320×172), hiển thị nhiệt độ, độ ẩm, trạng thái quạt và kết nối mạng
- **Tự động reconnect** — WiFi và MQTT tự kết nối lại khi mất mạng

### Phần cứng cần có

| Linh kiện | Chân kết nối |
|---|---|
| ESP32 DevKit | — |
| DHT11 (cảm biến nhiệt độ & độ ẩm) | GPIO 4 |
| Relay module (điều khiển quạt) | GPIO 26 |
| Màn hình GMT147 SPI (ST7789) | CS=5, DC=16, RST=17, MOSI=23, SCLK=18 |

### Thư viện Arduino cần cài

Cài qua **Arduino Library Manager** hoặc PlatformIO:

- `WiFi` (built-in ESP32)
- `Adafruit MQTT Library`
- `DHT11`
- `Adafruit GFX Library`
- `SPI` (built-in)

### Cấu hình trước khi nạp

Mở file `room.ino` và cập nhật các thông số ở đầu file:

```cpp
// WiFi
#define WLAN_SSID       "your_wifi_ssid"
#define WLAN_PASS       "your_wifi_password"

// MQTT Broker
#define AIO_SERVER      "your_broker_ip"
#define AIO_SERVERPORT  1883
#define AIO_USERNAME    "your_mqtt_user"
#define AIO_KEY         "your_mqtt_password"
```

### Nạp firmware

1. Mở `firmware/room/room.ino` bằng **Arduino IDE** (hoặc PlatformIO)
2. Chọn Board: **ESP32 Dev Module**
3. Chọn Port COM tương ứng
4. Nhấn **Upload**

> **Lưu ý:** Firmware đã tắt Brownout Detector (`WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0)`) để tránh ESP32 bị reset liên tục khi cấp nguồn qua USB yếu. Nên dùng nguồn 5V ổn định cho môi trường production.

---

## Cấu trúc thư mục

```
room-comfort-be/
├── firmware/
│   └── room/
│       └── room.ino          # Firmware ESP32 (Arduino)
├── src/
│   ├── alerts/               # Module cảnh báo
│   ├── activity-logs/        # Module ghi nhật ký hoạt động
│   ├── auth/                 # Module xác thực (JWT)
│   ├── devices/              # Module quản lý thiết bị
│   ├── entity/               # TypeORM entities
│   ├── migrations/           # Database migrations
│   ├── monitoring/           # Module giám sát (history, SSE)
│   ├── mqtt/                 # Module MQTT (sensor data, fan control)
│   ├── threshold/            # Module ngưỡng nhiệt độ
│   ├── users/                # Module người dùng
│   ├── utils/                # Tiện ích (config, i18n, types)
│   ├── app.module.ts         # Root module
│   └── main.ts               # Entry point
├── .env.example              # Mẫu biến môi trường
├── package.json
└── tsconfig.json
```
