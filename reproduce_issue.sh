#!/bin/bash

curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{
        "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#chats('\''19%3A04538cbdd7ef44109b5cde9bae37b82e%40thread.v2'\'')/messages/$entity",
        "id": "1765195149114",
        "replyToId": "1765195149114",
        "etag": "1765195149114",
        "messageType": "message",
        "createdDateTime": "2025-12-08T11:59:09.114Z",
        "lastModifiedDateTime": "2025-12-08T11:59:09.114Z",
        "lastEditedDateTime": null,
        "deletedDateTime": null,
        "subject": null,
        "summary": null,
        "chatId": "19:04538cbdd7ef44109b5cde9bae37b82e@thread.v2",
        "importance": "normal",
        "locale": "en-us",
        "webUrl": null,
        "channelIdentity": null,
        "policyViolation": null,
        "eventDetail": null,
        "from": {
            "application": null,
            "device": null,
            "user": {
                "@odata.type": "#microsoft.graph.teamworkUserIdentity",
                "id": "a247b806-e308-446f-bff4-a3e2963e0410",
                "displayName": "Jarred Cinman",
                "userIdentityType": "aadUser",
                "tenantId": "2b755fa1-23d1-48f3-98fc-6fdc1dc48d69"
            }
        },
        "body": {
            "contentType": "html",
            "content": "<p>Schema test</p>",
            "plainTextContent": "Schema test"
        },
        "attachments": [],
        "mentions": [],
        "reactions": [],
        "messageLink": "https://teams.microsoft.com/l/message/19:04538cbdd7ef44109b5cde9bae37b82e@thread.v2/1765195149114?context=%7B%22contextType%22:%22chat%22%7D",
        "threadType": "chat",
        "conversationId": "19:04538cbdd7ef44109b5cde9bae37b82e@thread.v2"
    }'
