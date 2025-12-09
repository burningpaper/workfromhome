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
                const result = await dbService.addCheckin(userId, userName, userEmail, status, messageId, timestamp);
                if (result > 0) {
                    console.log(`Recorded checkin: ${userName} (${userEmail}) is ${status}`);
                    processedCount++;
                } else {
                    console.log(`Duplicate checkin ignored for: ${userName}`);
                }
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

// Serve static files from 'public' directory
app.use(express.static('public'));

// Fallback for root if index.html isn't picked up automatically (though express.static usually handles it)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/api/import-users', async (req, res) => {
    try {
        const users = req.body; // Expecting JSON array of {name, email, city}
        if (!Array.isArray(users)) {
            return res.status(400).send('Body must be an array of users');
        }
        const count = await dbService.importUsers(users);
        res.send(`Successfully imported/updated ${count} users`);
    } catch (err) {
        res.status(500).send(`Error importing users: ${err.message}`);
    }
});

app.post('/api/clear-users', async (req, res) => {
    try {
        await dbService.clearUsers();
        res.send('Users table cleared successfully');
    } catch (err) {
        res.status(500).send(`Error clearing users: ${err.message}`);
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const stats = await dbService.getDashboardStats();
        res.json(stats);
    } catch (err) {
        res.status(500).send(`Error getting dashboard stats: ${err.message}`);
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

