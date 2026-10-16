#!/usr/bin/env bash
# Probe RLS / phân quyền bằng anon key (đọc từ .env). Chỉ gọi API Supabase bình thường
# trên project của chính bạn — không tấn công hạ tầng. Kỳ vọng: bảng riêng trả [] , ghi bị 401.
# Chạy: bash scripts/security/rls-probe.sh
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/.env"
[ -f "$ENV_FILE" ] || { echo "Không thấy $ENV_FILE"; exit 1; }
URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"' \r'); URL=${URL%/}
KEY=$(grep -E '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"' \r')
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"; exit 1; }
echo "Target: $(echo "$URL" | sed -E 's#https?://([^/]+).*#\1#')  (anon key ${#KEY} ký tự)"
probe () { # name method path [curl extra...]
  local name="$1" method="$2" path="$3"; shift 3
  local http; http=$(curl -sS -m 20 -o /tmp/rls.out -w '%{http_code}' -X "$method" \
    "$URL/rest/v1/$path" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" "$@" 2>/dev/null)
  echo "[$name] http=$http  resp=$(head -c 140 /tmp/rls.out | tr '\n' ' ')"
}
echo "--- đọc bảng riêng (phải [] ) ---"
probe "messages (PII)"          GET  "messages?select=id,email&limit=3"
probe "admins"                  GET  "admins?select=*&limit=3"
probe "push_subscriptions"      GET  "push_subscriptions?select=*&limit=3"
echo "--- ghi bằng anon (phải 401 RLS) ---"
probe "insert posts"            POST "posts"    -H "Content-Type: application/json" --data '{"title":"__rls_probe__"}'
probe "insert messages"         POST "messages" -H "Content-Type: application/json" --data '{"name":"x","email":"x@x.co","message":"__rls_probe__"}'
echo "--- bài ẩn + filter lạ (không được rò) ---"
probe "visible=false"           GET  "posts?select=id,title,visible&visible=eq.false&limit=5"
probe "filter OR 1=1"           GET  "posts?select=id&id=eq.1%20OR%201=1"
echo "--- RPC đặc quyền (phải 401) ---"
probe "rpc restore_backup"      POST "rpc/restore_backup" -H "Content-Type: application/json" --data '{"tbl":"settings","rows":[],"overwrite":false}'
