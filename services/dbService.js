const { sql } = require('@vercel/postgres');

async function initDb() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                userId TEXT,
                userName TEXT,
                userEmail TEXT,
                status TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                messageId TEXT UNIQUE
            );
            
            -- Add column if it doesn't exist (for existing deployments)
            ALTER TABLE checkins ADD COLUMN IF NOT EXISTS userEmail TEXT;
        `;
        console.log('Database initialized (Table checkins checked/created).');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

async function addCheckin(userId, userName, userEmail, status, messageId, timestamp) {
    try {
        // Postgres doesn't have INSERT OR IGNORE, using ON CONFLICT DO NOTHING
        const result = await sql`
            INSERT INTO checkins (userId, userName, userEmail, status, messageId, timestamp)
            VALUES (${userId}, ${userName}, ${userEmail}, ${status}, ${messageId}, ${timestamp})
            ON CONFLICT (messageId) DO UPDATE SET
                userId = EXCLUDED.userId,
                userName = EXCLUDED.userName,
                userEmail = EXCLUDED.userEmail,
                status = EXCLUDED.status,
                timestamp = EXCLUDED.timestamp;
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
