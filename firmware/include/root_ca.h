// firmware/include/root_ca.h
//
// ondolog.paritto.dev の実デプロイ後に取得するRoot CA証明書（PROGMEM）。
// 取得方法: openssl s_client -connect ondolog.paritto.dev:443 -showcerts
// チェーン末尾のルート証明書のPEMをそのまま貼り付けること。
// Cloudflareがルート証明書の発行元を切り替えた場合、TLSハンドシェイクが
// 失敗するようになるため、その際は再取得して更新する（既知の制約）。
#pragma once

static const char ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PLACEHOLDER - replace with the actual root CA certificate obtained
after ondolog.paritto.dev is deployed to Cloudflare.
-----END CERTIFICATE-----
)EOF";
