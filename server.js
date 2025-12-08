const express = require('express');
const config = require('./config');
const dbService = require('./services/dbService');

const app = express();

// Middleware to parse JSON bodies (from Power Automate)
// parsing all types to handle missing Content-Type header from Power Automate
app.use(express.json({ type: '*/*' }));

// Webhook Endpoint
app.post('/webhook', async (req, res) => {
    console.log('Received Webhook Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Received Webhook Body:', JSON.stringify(req.body, null, 2));

    if (!req.body || Object.keys(req.body).length === 0) {
        console.error('req.body is undefined or empty.');
        return res.status(400).send(`req.body is undefined/empty. Headers received: ${JSON.stringify(req.headers, null, 2)}`);
    }

    try {
        let messages = [];

        // Handle "When a new message is added to a chat or channel" (List of messages)
        if (req.body.value && Array.isArray(req.body.value)) {
            messages = req.body.value;
        }
        // Handle single message object (if passed directly)
        else if (req.body.body && req.body.body.content) {
            messages = [req.body];
        }
        // Handle our previous flat format (backward compatibility)
        else if (req.body.messageContent) {
            messages = [{
                body: { content: req.body.messageContent },
                from: { user: { id: req.body.userId, displayName: req.body.userName } },
                userEmail: req.body.userEmail,
                id: req.body.messageId,
                createdDateTime: req.body.timestamp
            }];
        }

        if (messages.length === 0) {
            console.error('No valid messages found in payload.');
            return res.status(400).send(`No valid messages found. Received: ${JSON.stringify(req.body)}`);
        }

        let processedCount = 0;

        for (const msg of messages) {
            // Extract fields safely
            const content = msg.body?.content?.toLowerCase() || '';
            const userId = msg.from?.user?.id || 'unknown';
            const userName = msg.from?.user?.displayName || 'Unknown User';
            const userEmail = msg.userEmail || null; // Expecting this from Power Automate
            const messageId = msg.id || `manual-${Date.now()}`;
            const timestamp = msg.createdDateTime || new Date().toISOString();

            let status = null;
            if (content.includes('wfh') || content.includes('working from home')) {
                status = 'WFH';
            } else if (content.includes('office') || content.includes('in office')) {
                status = 'Office';
            }

            if (status) {
                await dbService.addCheckin(userId, userName, userEmail, status, messageId, timestamp);
                console.log(`Recorded checkin: ${userName} (${userEmail}) is ${status}`);
                processedCount++;
            }
        }

        if (processedCount > 0) {
            res.status(200).send(`Processed ${processedCount} checkins`);
        } else {
            console.log('No relevant status keywords found, or message structure did not match.');
            // Create a summary of what was seen for debugging
            const seenContent = messages.map(m => m.body?.content).join(' | ');
            res.status(200).send(`Request received but no checkins recorded. Server saw content: "${seenContent}". Keywords looked for: wfh, office.`);
        }

    } catch (err) {
        console.error('Error processing webhook:', err);
        res.status(500).send(`Error processing webhook: ${err.message}`);
    }
});

// Simple API to view report
app.get('/', async (req, res) => {
    try {
        const report = await dbService.getTodayReport();
        let html = '<h1>WFH Beacon Report (Today)</h1><ul>';
        report.forEach(row => {
            const emailDisplay = row.useremail ? ` (${row.useremail})` : '';
            html += `<li><strong>${row.username}</strong>${emailDisplay}: ${row.status} (at ${new Date(row.timestamp).toLocaleTimeString()})</li>`;
        });
        html += '</ul>';
        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send(`Error generating report: ${err.message}<br><pre>${err.stack}</pre>`);
    }
});

app.get('/init-db', async (req, res) => {
    try {
        await dbService.initDb();
        res.send('Database initialized successfully');
    } catch (err) {
        res.status(500).send(`Error initializing database: ${err.message}`);
    }
});

app.listen(config.port, () => {
    console.log(`WFH Beacon server running on port ${config.port}`);
});

module.exports = app;

