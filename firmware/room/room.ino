#include <WiFi.h>
#include <Adafruit_MQTT.h>
#include <Adafruit_MQTT_Client.h>
#include <DHT11.h>
#include <Adafruit_GFX.h>
#include <SPI.h>


#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ================== 1. WIFI & MQTT ==================
#define WLAN_SSID       "IPC"
#define WLAN_PASS       ""              // WiFi password - fill in locally before flashing, do not commit

#define AIO_SERVER      "70.153.80.10"
#define AIO_SERVERPORT  1883
#define AIO_USERNAME    "dacn"      
#define AIO_KEY         "hcmut"       

// ================== 2. CẤU HÌNH CHÂN  ==================
#define DHTPin          4          // Chân Data DHT11
#define RELAY_PIN       26         // Chân Relay / Quạt

//  GMT147SPI 
#define TFT_CS          5          // CS
#define TFT_DC          16         // DC
#define TFT_RST         17         // RES / RST
#define TFT_MOSI        23         // SDA
#define TFT_SCLK        18         // SCL

//  RGB565
#define COLOR_BLACK     0x0000
#define COLOR_WHITE     0xFFFF
#define COLOR_RED       0xF800
#define COLOR_GREEN     0x07E0
#define COLOR_BLUE      0x001F
#define COLOR_CYAN      0x07FF
#define COLOR_YELLOW    0xFFE0
#define COLOR_DARKGREY  0x4208
#define COLOR_ORANGE    0xFD20
// =============================================================

// ===== DRIVER =====
class DisplayGMT147 : public Adafruit_GFX {
public:
  DisplayGMT147(int8_t cs, int8_t dc, int8_t rst)
    : Adafruit_GFX(320, 172), _cs(cs), _dc(dc), _rst(rst) {}

  void init() {
    pinMode(_cs, OUTPUT);
    pinMode(_dc, OUTPUT);
    pinMode(_rst, OUTPUT);
    digitalWrite(_cs, HIGH);

    SPI.begin(TFT_SCLK, -1, TFT_MOSI, _cs);
    SPI.beginTransaction(SPISettings(10000000, MSBFIRST, SPI_MODE0));

    // 1. Reset 
    digitalWrite(_rst, HIGH); delay(50);
    digitalWrite(_rst, LOW); delay(50);
    digitalWrite(_rst, HIGH); delay(150);

    // 2. Khởi động ST7789 
    writeCmd(0x01); delay(150); 
    writeCmd(0x11); delay(120); 
    writeCmd(0x3A); writeData8(0x55); 
    writeCmd(0x36); writeData8(0x70); 
    writeCmd(0x21); delay(10);  
    writeCmd(0x29); delay(50);  
  }

  void setAddrWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
    uint16_t row_offset = 34; 
    writeCmd(0x2A);
    writeData8(x0 >> 8); writeData8(x0 & 0xFF);
    writeData8(x1 >> 8); writeData8(x1 & 0xFF);

    writeCmd(0x2B);
    writeData8((y0 + row_offset) >> 8); writeData8((y0 + row_offset) & 0xFF);
    writeData8((y1 + row_offset) >> 8); writeData8((y1 + row_offset) & 0xFF);

    writeCmd(0x2C);
  }

  void drawPixel(int16_t x, int16_t y, uint16_t color) override {
    if (x < 0 || x >= _width || y < 0 || y >= _height) return;
    setAddrWindow(x, y, x, y);
    digitalWrite(_dc, HIGH);
    digitalWrite(_cs, LOW);
    SPI.transfer(color >> 8);
    SPI.transfer(color & 0xFF);
    digitalWrite(_cs, HIGH);
  }

  void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) override {
    if (x >= _width || y >= _height || w <= 0 || h <= 0) return;
    if (x + w - 1 >= _width)  w = _width - x;
    if (y + h - 1 >= _height) h = _height - y;

    setAddrWindow(x, y, x + w - 1, y + h - 1);
    digitalWrite(_dc, HIGH);
    digitalWrite(_cs, LOW);
    uint8_t hi = color >> 8, lo = color & 0xFF;
    uint32_t total = (uint32_t)w * h;
    for (uint32_t i = 0; i < total; i++) {
      SPI.transfer(hi);
      SPI.transfer(lo);
    }
    digitalWrite(_cs, HIGH);
  }

  void fillScreen(uint16_t color) override {
    fillRect(0, 0, _width, _height, color);
  }

private:
  int8_t _cs, _dc, _rst;
  void writeCmd(uint8_t cmd) {
    digitalWrite(_dc, LOW);
    digitalWrite(_cs, LOW);
    SPI.transfer(cmd);
    digitalWrite(_cs, HIGH);
  }
  void writeData8(uint8_t data) {
    digitalWrite(_dc, HIGH);
    digitalWrite(_cs, LOW);
    SPI.transfer(data);
    digitalWrite(_cs, HIGH);
  }
};

WiFiClient client;
Adafruit_MQTT_Client mqtt(&client, AIO_SERVER, AIO_SERVERPORT, AIO_USERNAME, AIO_KEY);

// Các Feeds MQTT
Adafruit_MQTT_Publish temperature = Adafruit_MQTT_Publish(&mqtt, AIO_USERNAME "/feeds/temperature");
Adafruit_MQTT_Publish humidity    = Adafruit_MQTT_Publish(&mqtt, AIO_USERNAME "/feeds/humidity");
Adafruit_MQTT_Subscribe fan       = Adafruit_MQTT_Subscribe(&mqtt, AIO_USERNAME "/feeds/fan/cmd");
Adafruit_MQTT_Publish fanState    = Adafruit_MQTT_Publish(&mqtt, AIO_USERNAME "/feeds/fan/state");

DHT11 dht11(DHTPin);
DisplayGMT147 tft(TFT_CS, TFT_DC, TFT_RST);

// Quản lý thời gian Non-blocking
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 2000;    // Đọc cảm biến mỗi 2 giây

unsigned long lastMqttPublish = 0;
const unsigned long PUBLISH_INTERVAL = 15000;  // Gửi MQTT mỗi 15 giây

unsigned long lastMqttRetry = 0;
const unsigned long MQTT_RETRY_INTERVAL = 10000; // Thử lại MQTT mỗi 10 giây

unsigned long lastWifiRetry = 0;
const unsigned long WIFI_RETRY_INTERVAL = 10000; // Thử lại WiFi mỗi 10 giây

bool currentFanState = false;
int currentTemp = 0;
int currentHumi = 0;

bool hasValidReading = false;
int dhtErrorStreak = 0;
bool fanStateDirty = true;

// Khai báo hàm
void drawStaticUI();
void updateSensorDisplay(int t, int h);
void updateSensorUnknown();
void updateFanDisplay(bool state);
void updateStatusFooter(const char* statusMsg, uint16_t color);
void handleNetwork();
bool isValidReading(int t, int h);
void publishFanState();

void setup() {
  // 1. VÔ HIỆU HÓA BROWNOUT DETECTOR (Chống sập nguồn USB)
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== KHOI DONG HE THONG ROOM COMFORT KEEPER ===");

  // Cấu hình Timeout ngắn cho Socket để không làm treo Watchdog
  client.setTimeout(1500);

  // 2. Cấu hình Relay quạt
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // 3. KHỞI TẠO MÀN HÌNH VÀ VẼ GIAO DIỆN CỐ ĐỊNH
  tft.init();
  drawStaticUI();
  updateStatusFooter("Dang ket noi WiFi...", COLOR_ORANGE);

  // 4. Đọc cảm biến DHT11 lần đầu
  int t = dht11.readTemperature();
  int h = dht11.readHumidity();
  if (isValidReading(t, h)) {
    currentTemp = t;
    currentHumi = h;
    hasValidReading = true;
    updateSensorDisplay(t, h);
  } else {

    updateSensorUnknown();
  }

  // 5. Kết nối WiFi (Hạ công suất phát)
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setTxPower(WIFI_POWER_11dBm);
  Serial.print("Dang ket noi WiFi");
  WiFi.begin(WLAN_SSID, WLAN_PASS);
  unsigned long startWiFi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWiFi < 10000) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    updateStatusFooter("WiFi: OK | MQTT: Connecting...", COLOR_ORANGE);
    mqtt.subscribe(&fan);
  } else {
    Serial.println("\nWiFi Disconnected. Se tu dong thu lai!");
    updateStatusFooter("WiFi: Disconnected (Local Mode)", COLOR_RED);
  }
}

void loop() {
  // ===== 1. XỬ LÝ MẠNG VÀ MQTT  =====
  handleNetwork();

  // ===== 2. ĐỌC CẢM BIẾN & CẬP NHẬT MÀN HÌNH MỖI 2 GIÂY =====
  if (millis() - lastSensorRead >= SENSOR_INTERVAL || lastSensorRead == 0) {
    lastSensorRead = millis();

    int t = dht11.readTemperature();
    int h = dht11.readHumidity();

    if (isValidReading(t, h)) {
      currentTemp = t;
      currentHumi = h;
      hasValidReading = true;
      dhtErrorStreak = 0;

      Serial.print("Nhiet do: "); Serial.print(t);
      Serial.print(" *C | Do am: "); Serial.print(h); Serial.println(" %");

      // Cập nhật lên màn hình GMT147
      updateSensorDisplay(t, h);
    } else {
    
      dhtErrorStreak++;

      Serial.print("Doc DHT11 loi (t=");
      Serial.print(t);
      Serial.print(", h=");
      Serial.print(h);
      Serial.print("), bo qua lan doc nay. So lan loi lien tiep: ");
      Serial.println(dhtErrorStreak);

 
      if (dhtErrorStreak == 15) {
        updateStatusFooter("Canh bao: DHT11 khong doc duoc!", COLOR_RED);
      }
    }
  }

  // ===== 3. GỬI DỮ LIỆU LÊN MQTT NẾU ĐÃ KẾT NỐI (MỖI 15 GIÂY) =====
  if (mqtt.connected()) {
    // Trạng thái quạt vừa đổi -> báo lên ngay, không đợi hết 15s
    if (fanStateDirty) {
      publishFanState();
    }

    if (millis() - lastMqttPublish >= PUBLISH_INTERVAL) {
      lastMqttPublish = millis();

     
      if (hasValidReading && dhtErrorStreak == 0) {
        temperature.publish((float)currentTemp);
        humidity.publish((float)currentHumi);
        Serial.println("-> Da publish du lieu len MQTT Broker");
      } else {
        Serial.println("-> Bo qua publish: chua co so do hop le tu DHT11");
      }

      publishFanState();
    }
  }

  delay(10); // Cho CPU thở và nuôi Watchdog Timer
}

// ===== KIỂM TRA SỐ ĐO DHT11 CÓ HỢP LỆ KHÔNG =====

bool isValidReading(int t, int h) {
  if (t == DHT11::ERROR_TIMEOUT || t == DHT11::ERROR_CHECKSUM) return false;
  if (h == DHT11::ERROR_TIMEOUT || h == DHT11::ERROR_CHECKSUM) return false;
  if (t < 0 || h < 0) return false;
  if (t > 50) return false;              // ngoài dải đo -> rác
  if (h < 20 || h > 90) return false;    // ngoài dải đo
  return true;
}

// ===== BÁO TRẠNG THÁI RELAY THẬT LÊN SERVER =====

void publishFanState() {
  if (!mqtt.connected()) return;

  if (fanState.publish(currentFanState ? "1" : "0")) {
    fanStateDirty = false;
    Serial.print("-> Da bao trang thai quat len server: ");
    Serial.println(currentFanState ? "1 (RUNNING)" : "0 (STOPPED)");
  } else {
    // Gửi thất bại thì giữ cờ để lần loop sau thử lại
    fanStateDirty = true;
    Serial.println("-> Bao trang thai quat THAT BAI, se thu lai");
  }
}

// ===== XỬ LÝ KẾT NỐI MẠNG TỰ ĐỘNG =====
void handleNetwork() {
  // 1. Kiểm tra WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiRetry >= WIFI_RETRY_INTERVAL) {
      lastWifiRetry = millis();
      Serial.println("Dang thu ket noi lai WiFi...");
      updateStatusFooter("WiFi: Dang ket noi lai...", COLOR_ORANGE);
      WiFi.reconnect();
    }
    return;
  }

  // 2. Nếu đã có WiFi -> Kiểm tra MQTT
  if (!mqtt.connected()) {
    if (millis() - lastMqttRetry >= MQTT_RETRY_INTERVAL || lastMqttRetry == 0) {
      lastMqttRetry = millis();
      Serial.print("Dang thu ket noi MQTT Broker... ");
      updateStatusFooter("WiFi: OK | MQTT: Connecting...", COLOR_ORANGE);

      int8_t ret = mqtt.connect();
      if (ret == 0) {
        Serial.println("MQTT Connected!");
        updateStatusFooter("WiFi: OK | MQTT: Online", COLOR_GREEN);
        mqtt.subscribe(&fan);

        fanStateDirty = true;
        publishFanState();
      } else {
        Serial.print("MQTT Failed, code: "); Serial.println(ret);
        updateStatusFooter("WiFi: OK | MQTT: Offline", COLOR_RED);
        mqtt.disconnect();
      }
    }
    return;
  }

  // 3. Khi MQTT đã Online -> Lắng nghe lệnh quạt
  Adafruit_MQTT_Subscribe *subscription;
  while ((subscription = mqtt.readSubscription(50))) {
    if (subscription == &fan) {
      char *cmd = (char *)fan.lastread;

      Serial.print("Nhan lenh quat: ");
      Serial.println(cmd);

      bool wantOn;

      if (strcmp(cmd, "1") == 0 ||
          strcmp(cmd, "ON") == 0 ||
          strcmp(cmd, "on") == 0) {
        wantOn = true;
      } else if (strcmp(cmd, "0") == 0 ||
                 strcmp(cmd, "OFF") == 0 ||
                 strcmp(cmd, "off") == 0) {
        wantOn = false;
      } else {

        Serial.println("-> Payload la, bo qua (khong doi trang thai quat)");
        continue;
      }


      if (wantOn == currentFanState) {
        Serial.println("-> Trang thai khong doi, bo qua");
        continue;
      }

      digitalWrite(RELAY_PIN, wantOn ? HIGH : LOW);
      currentFanState = wantOn;
      Serial.println(wantOn ? "-> Bat quat" : "-> Tat quat");

      updateFanDisplay(currentFanState);

      // Relay vừa đổi -> báo ngược lên server ngay
      fanStateDirty = true;
      publishFanState();
    }
  }
}

// ===== KHUNG GIAO DIỆN =====
void drawStaticUI() {
  tft.fillScreen(COLOR_BLACK);
  tft.drawRoundRect(2, 2, 316, 168, 6, COLOR_CYAN);
  tft.setTextSize(2);
  tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
  tft.setCursor(20, 10);
  tft.print("ROOM COMFORT KEEPER");
  tft.drawLine(10, 30, 310, 30, COLOR_WHITE);

  tft.setTextSize(1);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setCursor(18, 38);
  tft.print("NHIET DO (TEMP):");
  tft.setCursor(18, 88);
  tft.print("DO AM (HUMIDITY):");

  tft.setCursor(195, 38);
  tft.print("QUAT (FAN):");
  tft.drawFastVLine(180, 34, 102, COLOR_DARKGREY);


  tft.drawLine(10, 140, 310, 140, COLOR_DARKGREY);

  updateFanDisplay(currentFanState);
}

// ===== CẬP NHẬT NHIỆT ĐỘ & ĐỘ ẨM LÊN MÀN HÌNH =====
void updateSensorDisplay(int t, int h) {
  // 1. Nhiệt độ
  tft.setTextSize(3);
  tft.setTextColor(COLOR_RED, COLOR_BLACK);
  tft.setCursor(18, 54);
  if (t < 10 && t >= 0) tft.print(" ");
  tft.print(t);
  tft.setTextSize(2);
  tft.print(" ");
  tft.print((char)247); 
  tft.print("C  ");

  // 2. Độ ẩm
  tft.setTextSize(3);
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(18, 104);
  if (h < 10 && h >= 0) tft.print(" ");
  tft.print(h);
  tft.setTextSize(2);
  tft.print(" %  ");
}

// ===== HIỆN "--" KHI CHƯA CÓ SỐ ĐO =====
void updateSensorUnknown() {
  tft.setTextSize(3);
  tft.setTextColor(COLOR_DARKGREY, COLOR_BLACK);
  tft.setCursor(18, 54);
  tft.print("--");
  tft.setTextSize(2);
  tft.print(" ");
  tft.print((char)247);
  tft.print("C  ");

  tft.setTextSize(3);
  tft.setTextColor(COLOR_DARKGREY, COLOR_BLACK);
  tft.setCursor(18, 104);
  tft.print("--");
  tft.setTextSize(2);
  tft.print(" %  ");
}

// ===== CẬP NHẬT TRẠNG THÁI QUẠT =====
void updateFanDisplay(bool state) {
  tft.setTextSize(2);
  tft.setCursor(195, 62);
  if (state) {
    tft.setTextColor(COLOR_GREEN, COLOR_BLACK);
    tft.print("RUNNING");
    tft.fillCircle(285, 70, 8, COLOR_GREEN);
  } else {
    tft.setTextColor(COLOR_RED, COLOR_BLACK);
    tft.print("STOPPED");
    tft.fillCircle(285, 70, 8, COLOR_RED);
  }
}

// ===== CẬP NHẬT THANH TRẠNG THÁI DƯỚI CÙNG =====
void updateStatusFooter(const char* statusMsg, uint16_t color) {
  tft.fillRect(12, 146, 296, 18, COLOR_BLACK);
  tft.setTextSize(1);
  tft.setTextColor(color, COLOR_BLACK);
  tft.setCursor(16, 149);
  tft.print(statusMsg);
}