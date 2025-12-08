const express = require('express');
const config = require('./config');
const dbService = require('./services/dbService');

const app = express();

// Middleware to parse JSON bodies (from Power Automate)
app.use(express.json());

// Webhook Endpoint
app.post('/webhook', async (req, res) => {
    console.log('Received Webhook:', req.body);

    const { userId, userName, messageContent, messageId, timestamp } = req.body;

    if (!messageContent) {
        return res.status(400).send('Missing messageContent');
    }

    const content = messageContent.toLowerCase();
    let status = null;

    if (content.includes('wfh') || content.includes('working from home')) {
        status = 'WFH';
    } else if (content.includes('office') || content.includes('in office')) {
        status = 'Office';
    }

    if (status) {
        try {
            // Use current time if timestamp not provided
            const ts = timestamp || new Date().toISOString();

            await dbService.addCheckin(
                userId || 'unknown',
                userName || 'Unknown User',
                status,
                messageId || `manual-${Date.now()}`,
                ts
            );
            console.log(`Recorded checkin: ${userName} is ${status}`);
            res.status(200).send('Checkin recorded');
        } catch (err) {
            console.error('Error saving checkin:', err);
            res.status(500).send('Database error');
        }
    } else {
        console.log('Message did not contain status keywords.');
        res.status(200).send('No status detected');
    }
});

// Simple API to view report
app.get('/', async (req, res) => {
    try {
        const report = await dbService.getTodayReport();
        let html = '<h1>WFH Beacon Report (Today)</h1><ul>';
        report.forEach(row => {
            html += `<li><strong>${row.userName}</strong>: ${row.status} (at ${new Date(row.timestamp).toLocaleTimeString()})</li>`;
        });
        html += '</ul>';
        res.send(html);
    } catch (err) {
        res.status(500).send('Error generating report');
    }
});

app.listen(config.port, () => {
    console.log(`WFH Beacon server running on port ${config.port}`);
});

module.exports = app;

