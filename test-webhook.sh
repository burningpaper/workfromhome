#!/bin/bash

echo "Testing Webhook with 'WFH' message..."
curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{
           "userId": "test-user-1",
           "userName": "Test User",
           "messageContent": "I am WFH today",
           "messageId": "msg-123",
           "timestamp": "2025-12-08T09:00:00Z"
         }'

echo -e "\n\nTesting Webhook with 'Office' message..."
curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{
           "userId": "test-user-2",
           "userName": "Another User",
           "messageContent": "In the Office",
           "messageId": "msg-456"
         }'

echo -e "\n\nChecking Report..."
curl http://localhost:3000/
