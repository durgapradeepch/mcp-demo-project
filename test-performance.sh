#!/bin/bash

echo "🔍 Testing Frontend Performance..."
echo ""

# Test frontend HTML load time
echo "1️⃣ Testing initial HTML load (http://localhost:5173)..."
time_html=$(curl -w "%{time_total}\n" -o /dev/null -s http://localhost:5173/)
echo "   HTML Load Time: ${time_html}s"
echo ""

# Test API endpoint response time
echo "2️⃣ Testing API endpoint (http://localhost:3001/api/mcp/tools)..."
time_api=$(curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3001/api/mcp/tools)
echo "   API Response Time: ${time_api}s"
echo ""

# Test a full query
echo "3️⃣ Testing AI query endpoint..."
start_time=$(date +%s.%N)
curl -s -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool_name":"get_database_stats","arguments":{}}' > /dev/null
end_time=$(date +%s.%N)
query_time=$(echo "$end_time - $start_time" | bc)
echo "   Query Time: ${query_time}s"
echo ""

# Analyze results
echo "📊 Performance Summary:"
echo "   ✅ HTML Load: ${time_html}s (should be < 0.5s)"
echo "   ✅ API Response: ${time_api}s (should be < 0.5s)"
echo "   ✅ Query Time: ${query_time}s (should be < 2s)"
echo ""

# Check if times are reasonable
if (( $(echo "$time_html > 1.0" | bc -l) )); then
  echo "⚠️  WARNING: HTML load time is slow (${time_html}s)"
  echo "   Possible causes:"
  echo "   - Large bundle size"
  echo "   - Slow network"
  echo "   - Vite dev server issues"
fi

if (( $(echo "$time_api > 1.0" | bc -l) )); then
  echo "⚠️  WARNING: API response time is slow (${time_api}s)"
  echo "   Possible causes:"
  echo "   - Backend server overloaded"
  echo "   - Database connection slow"
  echo "   - Network issues"
fi

echo ""
echo "💡 Tips to improve performance:"
echo "   1. Use production build: npm run build && npm run preview"
echo "   2. Enable browser caching"
echo "   3. Check network conditions"
echo "   4. Monitor backend API performance"
