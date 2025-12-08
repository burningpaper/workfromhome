const { sql } = require('@vercel/postgres');

async function initDb() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                userId TEXT,
                userName TEXT,
                status TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                messageId TEXT UNIQUE
            );
        `;
        console.log('Database initialized (Table checkins checked/created).');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

async function addCheckin(userId, userName, status, messageId, timestamp) {
    try {
        // Postgres doesn't have INSERT OR IGNORE, using ON CONFLICT DO NOTHING
        const result = await sql`
            INSERT INTO checkins (userId, userName, status, messageId, timestamp)
            VALUES (${userId}, ${userName}, ${status}, ${messageId}, ${timestamp})
            ON CONFLICT (messageId) DO NOTHING;
        `;
        return result.rowCount;
    } catch (error) {
        console.error('Error adding checkin:', error);
        throw error;
    }
}

async function getTodayReport() {
    try {
        // Postgres date comparison
        const { rows } = await sql`
            SELECT * FROM checkins 
            WHERE timestamp::date = CURRENT_DATE 
            ORDER BY timestamp DESC;
        `;
        return rows;
    } catch (error) {
        console.error('Error getting report:', error);
        throw error;
    }
}

// Initialize on require (or could be explicit)
initDb();

module.exports = {
    addCheckin,
    getTodayReport,
    initDb
};
