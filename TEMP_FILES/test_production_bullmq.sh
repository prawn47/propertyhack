#!/bin/bash

# Test script for production BullMQ diagnostics
# Tests the /api/cron/process-scheduled-posts endpoint

echo "=== Testing BullMQ on Production ==="
echo ""

echo "1. Testing cron endpoint to manually trigger scheduler..."
curl -s https://api.quord.ai/api/cron/process-scheduled-posts | jq .

echo ""
echo "2. Creating a test user and scheduled post..."

# Register test user
REGISTER_RESPONSE=$(curl -s -X POST https://api.quord.ai/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bullmq-test-'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "name": "BullMQ Test User"
  }')

echo "Registration response:"
echo $REGISTER_RESPONSE | jq .

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get access token"
  exit 1
fi

echo ""
echo "3. Creating a scheduled post (2 minutes in future)..."

# Create a scheduled post for 2 minutes from now
SCHEDULED_TIME=$(date -u -v+2M +"%Y-%m-%dT%H:%M:%S.000Z")

CREATE_RESPONSE=$(curl -s -X POST https://api.quord.ai/api/posts/scheduled \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "BullMQ Test Post",
    "text": "This is a test post to verify BullMQ scheduling works in production",
    "scheduledFor": "'$SCHEDULED_TIME'"
  }')

echo "Scheduled post response:"
echo $CREATE_RESPONSE | jq .

POST_ID=$(echo $CREATE_RESPONSE | jq -r '.id')

echo ""
echo "4. Checking scheduled posts..."
curl -s https://api.quord.ai/api/posts/scheduled \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "===  Test Complete ==="
echo "Post scheduled for: $SCHEDULED_TIME"
echo "Post ID: $POST_ID"
echo ""
echo "To verify BullMQ processes it:"
echo "  - Wait 2 minutes"
echo "  - Check if post appears in published posts"
echo "  - Or manually trigger: curl -X POST https://api.quord.ai/api/cron/process-scheduled-posts"
