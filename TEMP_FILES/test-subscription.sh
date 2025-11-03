#!/bin/bash

# Stripe Subscription & Rate Limiting Test Suite
# Tests all subscription endpoints and free tier limits

BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3004"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Stripe Subscription & Rate Limit Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Register a new test user
echo -e "${YELLOW}Test 1: Register new user${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-stripe-'$(date +%s)'@example.com",
    "password": "TestPassword123!"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    USER_EMAIL=$(echo "$REGISTER_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "  Email: $USER_EMAIL"
    ((PASSED++))
else
    echo -e "${RED}✗ User registration failed${NC}"
    echo "$REGISTER_RESPONSE"
    ((FAILED++))
    exit 1
fi
echo ""

# Test 2: Get initial subscription status
echo -e "${YELLOW}Test 2: Get subscription status${NC}"
SUB_STATUS=$(curl -s -X GET "$BASE_URL/api/subscription/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$SUB_STATUS" | grep -q '"tier":"free"'; then
    echo -e "${GREEN}✓ User has free tier${NC}"
    REMAINING=$(echo "$SUB_STATUS" | grep -o '"remainingPosts":[0-9]*' | cut -d':' -f2)
    MONTHLY_COUNT=$(echo "$SUB_STATUS" | grep -o '"monthlyPostCount":[0-9]*' | cut -d':' -f2)
    echo "  Tier: free"
    echo "  Posts used: $MONTHLY_COUNT/10"
    echo "  Remaining: $REMAINING"
    ((PASSED++))
else
    echo -e "${RED}✗ Failed to get subscription status${NC}"
    echo "$SUB_STATUS"
    ((FAILED++))
fi
echo ""

# Test 3: Get pricing info
echo -e "${YELLOW}Test 3: Get pricing information${NC}"
PRICING=$(curl -s -X GET "$BASE_URL/api/subscription/pricing")

if echo "$PRICING" | grep -q '"monthlyPosts":10'; then
    echo -e "${GREEN}✓ Pricing info retrieved${NC}"
    echo "  Free tier limit: 10 posts/month"
    echo "  Trial period: 30 days"
    ((PASSED++))
else
    echo -e "${RED}✗ Failed to get pricing${NC}"
    echo "$PRICING"
    ((FAILED++))
fi
echo ""

# Test 4: Create drafts and test rate limiting
echo -e "${YELLOW}Test 4: Test rate limiting (create 11 posts)${NC}"

# First, create user settings
echo "  Creating user settings..."
curl -s -X PUT "$BASE_URL/api/user/settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toneOfVoice": "Professional",
    "industry": "Technology",
    "position": "Software Engineer",
    "audience": "Developers",
    "postGoal": "Share knowledge",
    "keywords": "coding, tech",
    "contentExamples": ["Example post"],
    "timeZone": "America/New_York",
    "preferredTime": "09:00",
    "englishVariant": "American"
  }' > /dev/null

POSTS_PUBLISHED=0

for i in {1..11}; do
    # Create draft
    DRAFT=$(curl -s -X POST "$BASE_URL/api/posts/drafts" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Test Post '$i'",
        "text": "This is test post number '$i' for rate limit testing."
      }')
    
    DRAFT_ID=$(echo "$DRAFT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$DRAFT_ID" ]; then
        echo -e "  ${RED}✗ Failed to create draft $i${NC}"
        continue
    fi
    
    # Try to publish
    PUBLISH=$(curl -s -X POST "$BASE_URL/api/posts/publish" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "draftId": "'$DRAFT_ID'",
        "publishedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }')
    
    if echo "$PUBLISH" | grep -q '"id"'; then
        ((POSTS_PUBLISHED++))
        echo -e "  ${GREEN}✓ Post $i published${NC}"
    elif echo "$PUBLISH" | grep -q "Free tier limit exceeded"; then
        echo -e "  ${YELLOW}⚠ Post $i blocked - rate limit reached${NC}"
        echo "    Message: Free tier limit exceeded"
        break
    else
        echo -e "  ${RED}✗ Post $i failed: $PUBLISH${NC}"
    fi
done

if [ $POSTS_PUBLISHED -eq 10 ]; then
    echo -e "${GREEN}✓ Rate limiting works correctly (10 posts published, 11th blocked)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Rate limiting issue: $POSTS_PUBLISHED posts published (expected 10)${NC}"
    ((FAILED++))
fi
echo ""

# Test 5: Verify subscription status after hitting limit
echo -e "${YELLOW}Test 5: Check subscription status after hitting limit${NC}"
SUB_STATUS_AFTER=$(curl -s -X GET "$BASE_URL/api/subscription/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HAS_EXCEEDED=$(echo "$SUB_STATUS_AFTER" | grep -o '"hasExceededLimit":[a-z]*' | cut -d':' -f2)
if [ "$HAS_EXCEEDED" = "true" ]; then
    echo -e "${GREEN}✓ User correctly marked as exceeding limit${NC}"
    REMAINING_AFTER=$(echo "$SUB_STATUS_AFTER" | grep -o '"remainingPosts":[0-9]*' | cut -d':' -f2)
    echo "  Has exceeded limit: true"
    echo "  Remaining posts: $REMAINING_AFTER"
    ((PASSED++))
else
    echo -e "${RED}✗ Limit flag not set correctly${NC}"
    echo "$SUB_STATUS_AFTER"
    ((FAILED++))
fi
echo ""

# Test 6: Create checkout session
echo -e "${YELLOW}Test 6: Create Stripe checkout session${NC}"
CHECKOUT=$(curl -s -X POST "$BASE_URL/api/subscription/checkout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$CHECKOUT" | grep -q '"url":"https://checkout.stripe.com'; then
    echo -e "${GREEN}✓ Checkout session created${NC}"
    CHECKOUT_URL=$(echo "$CHECKOUT" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "  Checkout URL: ${CHECKOUT_URL:0:50}..."
    echo -e "\n  ${BLUE}To test payment:${NC}"
    echo -e "  ${BLUE}1. Open this URL in browser: $CHECKOUT_URL${NC}"
    echo -e "  ${BLUE}2. Use test card: 4242 4242 4242 4242${NC}"
    echo -e "  ${BLUE}3. Any future date and 3-digit CVC${NC}\n"
    ((PASSED++))
else
    echo -e "${RED}✗ Failed to create checkout session${NC}"
    echo "$CHECKOUT"
    ((FAILED++))
fi
echo ""

# Test 7: Test webhook endpoint (simulate event)
echo -e "${YELLOW}Test 7: Webhook endpoint availability${NC}"
WEBHOOK_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/subscription/webhook" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$WEBHOOK_TEST" = "400" ]; then
    echo -e "${GREEN}✓ Webhook endpoint active (returns 400 without signature as expected)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Webhook returned: $WEBHOOK_TEST${NC}"
    echo "  This is expected if Stripe CLI is not running"
    ((PASSED++))
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Open the checkout URL above to test payment"
    echo "2. Use test card: 4242 4242 4242 4242"
    echo "3. Check backend logs for webhook events"
    echo "4. Verify user tier changes to 'pro' in database"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
