#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <ArduinoJson.h>

#include "secrets.h"
#include "root_ca.h"

static const unsigned long MEASUREMENT_INTERVAL_MS = 600000UL; // 10分
static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 30000UL;
static const unsigned long WIFI_RECONNECT_TIMEOUT_MS = 10000UL;

static Adafruit_SHT4x sht4;
static WiFiClientSecure tlsClient;
static unsigned long lastCycleMillis = 0;

static void connectWiFi() {
  Serial.printf("WiFi: connecting to %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi: connected, IP=%s\n", WiFi.localIP().toString().c_str());
  } else {
    // 起動時に接続できなくてもここでは再起動しない。loop側の再接続リトライに任せる
    Serial.println("WiFi: connect timed out, will retry in loop()");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin();
  if (!sht4.begin()) {
    // センサー未検出のまま動作を続けても無意味なため再起動する
    Serial.println("SHT4x: sensor not found, restarting in 5s");
    delay(5000);
    ESP.restart();
  }
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  Serial.println("SHT4x: sensor initialized");

  connectWiFi();
  tlsClient.setCACert(ROOT_CA);
}

static bool measureSensor(float &temperature, float &humidity) {
  sensors_event_t humidityEvent, tempEvent;
  if (!sht4.getEvent(&humidityEvent, &tempEvent)) {
    Serial.println("SHT4x: measurement failed");
    return false;
  }
  temperature = tempEvent.temperature;
  humidity = humidityEvent.relative_humidity;
  Serial.printf("Measured: temperature=%.2f humidity=%.2f\n", temperature, humidity);
  return true;
}

static bool ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.println("WiFi: not connected, reconnecting...");
  WiFi.reconnect();

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_RECONNECT_TIMEOUT_MS) {
    delay(500);
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi: reconnect failed");
    return false;
  }
  Serial.println("WiFi: reconnected");
  return true;
}

static void sendMeasurement(float temperature, float humidity) {
  JsonDocument doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  String payload;
  serializeJson(doc, payload);

  String url = String("https://") + API_HOST + "/api/devices/" + DEVICE_ID + "/measurements";

  HTTPClient http;
  http.begin(tlsClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  int statusCode = http.POST(payload);

  switch (statusCode) {
    case 201:
      Serial.println("POST: success (201)");
      break;
    case 400:
      Serial.println("POST: validation error (400), check sensor values");
      break;
    case 401:
      Serial.println("POST: auth error (401), check API key / device id");
      break;
    default:
      // タイムアウト時、HTTPClientは負のエラーコードを返す
      Serial.printf("POST: failed (code=%d)\n", statusCode);
      break;
  }

  http.end();
}

void loop() {
  if (millis() - lastCycleMillis < MEASUREMENT_INTERVAL_MS) {
    return;
  }
  // 成否によらず次サイクルは常に10分後（失敗時のリトライは行わない）
  lastCycleMillis = millis();

  float temperature, humidity;
  if (!measureSensor(temperature, humidity)) {
    return;
  }

  if (!ensureWiFiConnected()) {
    return;
  }

  sendMeasurement(temperature, humidity);
}
