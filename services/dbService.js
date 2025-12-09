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

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                city TEXT
            );
        `;
        console.log('Database initialized (Tables checkins, users checked/created).');
    } catch (err) {
        console.log('Error initializing database:', err);
    }
}

async function importUsers(usersList) {
    try {
        let count = 0;
        for (const user of usersList) {
            // Upsert user based on email
            await sql`
                INSERT INTO users (name, email, city)
                VALUES (${user.name}, ${user.email}, ${user.city})
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    city = EXCLUDED.city;
            `;
            count++;
        }
        return count;
    } catch (error) {
        console.error('Error importing users:', error);
        throw error;
    }
}

async function addCheckin(userId, userName, userEmail, status, messageId, timestamp) {
    try {
        // Check if user already checked in today (using the message timestamp)
        // We cast the input timestamp to a date to compare with stored records
        if (userId && userId !== 'unknown') {
            const existing = await sql`
                SELECT id FROM checkins 
                WHERE userId = ${userId} 
                AND timestamp::date = ${timestamp}::timestamp::date
                LIMIT 1;
            `;

            if (existing.rowCount > 0) {
                console.log(`User ${userName} (${userId}) already checked in on ${timestamp}. Ignoring.`);
                return 0;
            }
        }

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
    initDb,
    addCheckin,
    getTodayReport,
    importUsers
};
