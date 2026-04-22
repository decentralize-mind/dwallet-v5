#!/bin/bash

echo "🔓 Unbanning localhost IP (::1)..."

# Connect to PostgreSQL and unban the IP
psql -d dwallet_admin -c "
DELETE FROM banned_ips 
WHERE ip_address = '::1';
"

echo ""
echo "✅ localhost IP unbanned!"
echo "💡 You can now login again."
