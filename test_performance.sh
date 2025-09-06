#!/bin/bash

# Performance Testing Script for Harfai LMS
# Run this from your local machine or CI/CD pipeline

echo "🚀 Harfai LMS Performance Testing Suite"

# Configuration
API_BASE_URL=""
read -p "Enter your API base URL (e.g., https://your-gcp-server.com/api/v2): " API_BASE_URL

if [ -z "$API_BASE_URL" ]; then
    echo "❌ API URL is required"
    exit 1
fi

# Test credentials
read -p "Enter test user ID: " TEST_USER_ID
read -p "Enter test course ID: " TEST_COURSE_ID

echo "🔧 Starting performance tests..."

# Create results directory
RESULTS_DIR="performance_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p $RESULTS_DIR

# Test 1: Dashboard Load Time
echo "📊 Testing dashboard load time..."
curl -s -w "@curl-format.txt" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Method": "get_user_dashboard",
    "data": "{\"user_id\": \"'$TEST_USER_ID'\"}"
  }' \
  "$API_BASE_URL/optimized.php" > $RESULTS_DIR/dashboard_test.json

# Test 2: Courses Load Time
echo "📚 Testing courses load time..."
curl -s -w "@curl-format.txt" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Method": "get_courses_optimized",
    "data": "{\"user_id\": \"'$TEST_USER_ID'\", \"limit\": 20, \"offset\": 0}"
  }' \
  "$API_BASE_URL/optimized.php" > $RESULTS_DIR/courses_test.json

# Test 3: Lessons Load Time
echo "📖 Testing lessons load time..."
curl -s -w "@curl-format.txt" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Method": "get_lessons_optimized",
    "data": "{\"user_id\": \"'$TEST_USER_ID'\", \"course_id\": \"'$TEST_COURSE_ID'\"}"
  }' \
  "$API_BASE_URL/optimized.php" > $RESULTS_DIR/lessons_test.json

# Test 4: Batch Request
echo "📦 Testing batch requests..."
curl -s -w "@curl-format.txt" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Method": "batch_requests",
    "data": "{
      \"requests\": [
        {
          \"method\": \"get_user_dashboard\",
          \"data\": {\"user_id\": \"'$TEST_USER_ID'\"}
        },
        {
          \"method\": \"get_courses_optimized\",
          \"data\": {\"user_id\": \"'$TEST_USER_ID'\", \"limit\": 10}
        }
      ]
    }"
  }' \
  "$API_BASE_URL/optimized.php" > $RESULTS_DIR/batch_test.json

# Test 5: Cache Performance (second request)
echo "⚡ Testing cache performance..."
curl -s -w "@curl-format.txt" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Method": "get_courses_optimized",
    "data": "{\"user_id\": \"'$TEST_USER_ID'\", \"limit\": 20, \"offset\": 0}"
  }' \
  "$API_BASE_URL/optimized.php" > $RESULTS_DIR/cache_test.json

# Test 6: Load Testing (10 concurrent requests)
echo "🔥 Running load test (10 concurrent requests)..."
for i in {1..10}; do
  curl -s -w "@curl-format.txt" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
      "Method": "get_user_dashboard",
      "data": "{\"user_id\": \"'$TEST_USER_ID'\"}"
    }' \
    "$API_BASE_URL/optimized.php" > $RESULTS_DIR/load_test_$i.json &
done
wait

# Create curl format file
cat > curl-format.txt << 'EOF'
{
  "time_namelookup": %{time_namelookup},
  "time_connect": %{time_connect},
  "time_appconnect": %{time_appconnect},
  "time_pretransfer": %{time_pretransfer},
  "time_redirect": %{time_redirect},
  "time_starttransfer": %{time_starttransfer},
  "time_total": %{time_total},
  "speed_download": %{speed_download},
  "speed_upload": %{speed_upload}
}
EOF

# Analyze results
echo "📈 Analyzing results..."

python3 << EOF
import json
import glob
import os

results_dir = "$RESULTS_DIR"

def analyze_test(test_name, file_pattern):
    files = glob.glob(f"{results_dir}/{file_pattern}")
    if not files:
        return
    
    times = []
    cache_hits = []
    execution_times = []
    
    for file in files:
        try:
            with open(file, 'r') as f:
                content = f.read()
                # Split JSON responses (curl timing + API response)
                parts = content.split('\n')
                if len(parts) >= 2:
                    # API response
                    api_response = json.loads(parts[0])
                    execution_times.append(api_response.get('execution_time', 0))
                    cache_hits.append(api_response.get('cache_hit', False))
                    
                    # Curl timing
                    curl_response = json.loads(parts[1])
                    times.append(curl_response['time_total'] * 1000)  # Convert to ms
        except:
            continue
    
    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        avg_exec = sum(execution_times) / len(execution_times) if execution_times else 0
        cache_rate = sum(cache_hits) / len(cache_hits) * 100 if cache_hits else 0
        
        print(f"\\n{test_name}:")
        print(f"  Average Total Time: {avg_time:.2f}ms")
        print(f"  Min Time: {min_time:.2f}ms")
        print(f"  Max Time: {max_time:.2f}ms")
        print(f"  Average Execution Time: {avg_exec:.2f}ms")
        print(f"  Cache Hit Rate: {cache_rate:.1f}%")

# Analyze each test
analyze_test("Dashboard Load", "dashboard_test.json")
analyze_test("Courses Load", "courses_test.json")
analyze_test("Lessons Load", "lessons_test.json")
analyze_test("Batch Request", "batch_test.json")
analyze_test("Cache Performance", "cache_test.json")
analyze_test("Load Test", "load_test_*.json")

print(f"\\n📊 Detailed results saved in: {results_dir}/")
EOF

# Generate performance report
cat > $RESULTS_DIR/performance_report.md << EOF
# Harfai LMS Performance Test Report

**Test Date:** $(date)
**API Endpoint:** $API_BASE_URL

## Test Results Summary

### Dashboard Load Test
- **Purpose:** Measure time to load user dashboard data
- **Expected:** < 500ms
- **Result:** See dashboard_test.json

### Courses Load Test
- **Purpose:** Measure time to load course list
- **Expected:** < 800ms
- **Result:** See courses_test.json

### Lessons Load Test
- **Purpose:** Measure time to load lessons for a course
- **Expected:** < 600ms
- **Result:** See lessons_test.json

### Batch Request Test
- **Purpose:** Test efficiency of batched API calls
- **Expected:** < 1000ms for multiple requests
- **Result:** See batch_test.json

### Cache Performance Test
- **Purpose:** Verify caching is working
- **Expected:** Significant improvement on second request
- **Result:** See cache_test.json

### Load Test
- **Purpose:** Test system under concurrent load
- **Expected:** Consistent response times under load
- **Result:** See load_test_*.json files

## Recommendations

### If response times > 1 second:
1. Check database indexes are created
2. Verify network connectivity between servers
3. Monitor database server resources
4. Enable PHP OpCache

### If cache hit rate < 50%:
1. Increase cache duration
2. Check cache directory permissions
3. Verify cache is not being cleared too frequently

### If load test shows degradation:
1. Increase PHP-FPM workers
2. Optimize database connection pooling
3. Add database read replicas
4. Implement CDN for static assets

## Performance Targets

- **Dashboard:** < 500ms
- **Course List:** < 800ms
- **Lesson List:** < 600ms
- **Cache Hit Rate:** > 70%
- **Concurrent Users:** 50+ without degradation
EOF

echo ""
echo "✅ Performance testing completed!"
echo "📊 Results saved in: $RESULTS_DIR/"
echo "📋 Performance report: $RESULTS_DIR/performance_report.md"
echo ""
echo "🎯 Performance Targets:"
echo "   - Dashboard load: < 500ms"
echo "   - Course list: < 800ms" 
echo "   - Lesson list: < 600ms"
echo "   - Cache hit rate: > 70%"

# Cleanup
rm -f curl-format.txt
