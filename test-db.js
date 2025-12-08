const dbService = require('./services/dbService');

async function test() {
    console.log('Testing Database...');
    try {
        await dbService.addCheckin('user1', 'Alice', 'WFH', 'msg1', new Date().toISOString());
        console.log('Added Alice WFH');

        await dbService.addCheckin('user2', 'Bob', 'Office', 'msg2', new Date().toISOString());
        console.log('Added Bob Office');

        const report = await dbService.getTodayReport();
        console.log('Report:', report);

        if (report.length >= 2) {
            console.log('SUCCESS: Database verification passed.');
        } else {
            console.error('FAILURE: Report missing entries.');
        }
    } catch (err) {
        console.error('FAILURE:', err);
    }
}

// Wait for DB to init
setTimeout(test, 1000);
