#!/bin/bash

# Monitoring System Verification Script
# Tests all enhancements without breaking existing functionality

set -e

echo "🔍 LMS Portal Monitoring System Verification"
echo "============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Helper functions
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $response)"
        ((FAIL++))
    fi
}

test_container() {
    local container=$1
    
    echo -n "Checking container $container... "
    
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo -e "${GREEN}✓ RUNNING${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ NOT RUNNING${NC}"
        ((FAIL++))
    fi
}

test_metrics_endpoint() {
    local name=$1
    local url=$2
    local metric_pattern=$3
    
    echo -n "Checking $name metrics format... "
    
    response=$(curl -s "$url" || echo "")
    
    if echo "$response" | grep -q "$metric_pattern"; then
        echo -e "${GREEN}✓ VALID${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ INVALID${NC}"
        ((FAIL++))
    fi
}

echo "📦 Step 1: Verify Containers"
echo "------------------------------"
test_container "lms-backend"
test_container "lms-ml"
test_container "lms-mongo"
test_container "lms-node-exporter"
test_container "lms-prometheus"
test_container "lms-grafana"
echo ""

echo "🌐 Step 2: Test API Endpoints"
echo "------------------------------"
test_endpoint "Backend Health" "http://localhost:5000/api/health" "200"
test_endpoint "Backend Metrics" "http://localhost:5000/metrics" "200"
test_endpoint "ML Service Health" "http://localhost:8000/health" "200"
test_endpoint "ML Service Metrics" "http://localhost:8000/metrics" "200"
test_endpoint "Node Exporter Metrics" "http://localhost:9100/metrics" "200"
test_endpoint "Prometheus UI" "http://localhost:9090" "200"
test_endpoint "Grafana UI" "http://localhost:3001" "200"
echo ""

echo "📊 Step 3: Verify Metrics Format"
echo "--------------------------------"
test_metrics_endpoint "Backend" "http://localhost:5000/metrics" "http_requests_total"
test_metrics_endpoint "Backend (new)" "http://localhost:5000/metrics" "http_client_errors_total"
test_metrics_endpoint "Backend (new)" "http://localhost:5000/metrics" "http_server_errors_total"
test_metrics_endpoint "Backend (new)" "http://localhost:5000/metrics" "http_active_requests"
test_metrics_endpoint "ML Service" "http://localhost:8000/metrics" "fastapi"
test_metrics_endpoint "Node Exporter" "http://localhost:9100/metrics" "node_cpu_seconds_total"
echo ""

echo "🔧 Step 4: Verify Prometheus Configuration"
echo "-------------------------------------------"
echo -n "Checking Prometheus scrape targets (backend)... "
if curl -s http://localhost:9090/api/scrape_configs | grep -q "lms-backend"; then
    echo -e "${GREEN}✓ FOUND${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAIL++))
fi

echo -n "Checking Prometheus scrape targets (ml-service)... "
if curl -s http://localhost:9090/api/scrape_configs | grep -q "lms-ml"; then
    echo -e "${GREEN}✓ FOUND${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAIL++))
fi

echo -n "Checking Prometheus scrape targets (node-exporter)... "
if curl -s http://localhost:9090/api/scrape_configs | grep -q "lms-node-exporter"; then
    echo -e "${GREEN}✓ FOUND${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAIL++))
fi
echo ""

echo "📈 Step 5: Verify Existing Functionality"
echo "----------------------------------------"

echo -n "Testing Backend API - Get Courses... "
response=$(curl -s http://localhost:5000/api/courses)
if echo "$response" | grep -q "Docker\|CI/CD"; then
    echo -e "${GREEN}✓ WORKING${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAIL++))
fi

echo -n "Testing Backend API - Health Check... "
response=$(curl -s http://localhost:5000/api/health)
if echo "$response" | grep -q "lms-backend"; then
    echo -e "${GREEN}✓ WORKING${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAIL++))
fi

echo -n "Testing ML Service - Predictions endpoint... "
response=$(curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"hours_watched": 10, "quizzes_passed": 5, "assignments_done": 3}')
if echo "$response" | grep -q "predicted_level"; then
    echo -e "${GREEN}✓ WORKING${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAIL++))
fi

echo ""

# Summary
echo "📋 Summary"
echo "=========="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed! Monitoring system is operational.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ $FAIL test(s) failed. Please check the system.${NC}"
    exit 1
fi
