#!/bin/bash

# Bash script to test the API endpoints

echo ""
echo "🧪 Testing FastAPI JWT Authentication API"
echo ""

BASE_URL="http://localhost:8000"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;37m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Health Endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Health Check: $(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)${NC}"
    echo -e "   ${GRAY}Message: $(echo $HEALTH_RESPONSE | grep -o '"message":"[^"]*"' | cut -d'"' -f4)${NC}"
    echo ""
else
    echo -e "   ${RED}❌ Health check failed. Is the backend running?${NC}"
    echo -e "   ${YELLOW}Run: docker-compose up -d${NC}"
    echo ""
    exit 1
fi

# Test 2: Register a new user
echo -e "${YELLOW}2. Testing User Registration...${NC}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
REGISTER_DATA=$(cat <<EOF
{
    "email": "test${TIMESTAMP}@example.com",
    "username": "testuser${TIMESTAMP}",
    "password": "password123"
}
EOF
)

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_DATA")

if echo "$REGISTER_RESPONSE" | grep -q "email"; then
    echo -e "   ${GREEN}✅ User registered successfully!${NC}"
    EMAIL=$(echo $REGISTER_RESPONSE | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo -e "   ${GRAY}Email: $EMAIL${NC}"
    echo ""
else
    echo -e "   ${RED}❌ Registration failed${NC}"
    echo "$REGISTER_RESPONSE"
    exit 1
fi

# Test 3: Login
echo -e "${YELLOW}3. Testing User Login...${NC}"
LOGIN_DATA=$(cat <<EOF
{
    "email": "$EMAIL",
    "password": "password123"
}
EOF
)

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "   ${GREEN}✅ Login successful!${NC}"
    ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
    echo -e "   ${GRAY}Access Token: ${ACCESS_TOKEN:0:30}...${NC}"
    echo ""
else
    echo -e "   ${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# Test 4: Get Current User
echo -e "${YELLOW}4. Testing Protected Endpoint (Get Current User)...${NC}"
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$USER_RESPONSE" | grep -q "email"; then
    echo -e "   ${GREEN}✅ Protected endpoint accessed successfully!${NC}"
    echo -e "   ${GRAY}Email: $(echo $USER_RESPONSE | grep -o '"email":"[^"]*"' | cut -d'"' -f4)${NC}"
    echo ""
else
    echo -e "   ${RED}❌ Protected endpoint failed${NC}"
    echo "$USER_RESPONSE"
    exit 1
fi

# Test 5: Refresh Token
echo -e "${YELLOW}5. Testing Token Refresh...${NC}"
REFRESH_DATA=$(cat <<EOF
{
    "refresh_token": "$REFRESH_TOKEN"
}
EOF
)

REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "$REFRESH_DATA")

if echo "$REFRESH_RESPONSE" | grep -q "access_token"; then
    echo -e "   ${GREEN}✅ Token refresh successful!${NC}"
    NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo -e "   ${GRAY}New Access Token: ${NEW_ACCESS_TOKEN:0:30}...${NC}"
    echo ""
else
    echo -e "   ${RED}❌ Token refresh failed${NC}"
    echo "$REFRESH_RESPONSE"
    exit 1
fi

# Summary
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN}✅ All API tests passed successfully!${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "${YELLOW}You can now:${NC}"
echo -e "  ${NC}• Open http://localhost:3000 to use the frontend${NC}"
echo -e "  ${NC}• Visit http://localhost:8000/docs for API documentation${NC}"
echo -e "  ${NC}• Check http://localhost:8000/health for health status${NC}"
echo ""
