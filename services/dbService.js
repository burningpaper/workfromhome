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
        `;

        try {
            await sql`ALTER TABLE checkins ADD COLUMN IF NOT EXISTS userEmail TEXT;`;
        } catch (e) {
            // Ignore if column exists or other non-critical error
            console.log('Alter table error (might be benign):', e);
        }

        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                city TEXT,
                jobTitle TEXT,
                companyName TEXT
            );
        `;

        // Add new columns if they don't exist
        try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS jobTitle TEXT;`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS companyName TEXT;`;
        } catch (e) {
            console.log('Alter table users error:', e);
        }

        console.log('Database initialized.');
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err; // Propagate error to server.js
    }
}

async function importUsers(usersList) {
    try {
        let count = 0;
        for (const user of usersList) {
            // Map fields from various possible input names
            const name = user.name || user.Name;
            const email = user.email || user.Email; // Critical field
            const city = user.city || user.City;
            const jobTitle = user.jobTitle || user['job title'] || user['Job Title'];
            const companyName = user.companyName || user.company || user.Company;

            if (!email) {
                console.warn(`Skipping user ${name} due to missing email.`);
                continue;
            }

            // Upsert user based on email
            await sql`
                INSERT INTO users (name, email, city, jobTitle, companyName)
                VALUES (${name}, ${email}, ${city}, ${jobTitle}, ${companyName})
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    city = EXCLUDED.city,
                    jobTitle = EXCLUDED.jobTitle,
                    companyName = EXCLUDED.companyName;
            `;
            count++;
        }
        return count;
    } catch (error) {
        console.error('Error importing users:', error);
        throw error;
    }
}

async function clearUsers() {
    try {
        await sql`TRUNCATE TABLE users;`;
        console.log('Users table cleared.');
    } catch (error) {
        console.error('Error clearing users:', error);
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

async function getDashboardStats() {
    try {
        // 1. Total WFH Today
        const wfhResult = await sql`
            SELECT COUNT(DISTINCT userId) as count 
            FROM checkins 
            WHERE timestamp::date = CURRENT_DATE 
            AND status = 'WFH';
        `;
        const totalWFH = parseInt(wfhResult.rows[0].count);

        // 2. Total Staff (for percentage)
        const staffResult = await sql`SELECT COUNT(*) as count FROM users;`;
        const totalStaff = parseInt(staffResult.rows[0].count);
        const wfhPercentage = totalStaff > 0 ? Math.round((totalWFH / totalStaff) * 100) : 0;

        // 3. WFH by Job Title (Join checkins with users)
        // We join on email. If user not in DB, job title is 'Unknown'
        const jobResult = await sql`
            SELECT COALESCE(u.jobTitle, 'Unknown') as job_title, COUNT(DISTINCT c.userId) as count
            FROM checkins c
            LEFT JOIN users u ON c.userEmail = u.email
            WHERE c.timestamp::date = CURRENT_DATE
            AND c.status = 'WFH'
            GROUP BY COALESCE(u.jobTitle, 'Unknown');
        `;
        const byJobTitle = jobResult.rows;

        // 4. Check-ins by Time (15m buckets)
        // Postgres: date_trunc('hour', timestamp) + interval '15 min' * floor(date_part('minute', timestamp) / 15)
        const timeResult = await sql`
            SELECT 
                to_char(
                    date_trunc('hour', timestamp) + 
                    interval '15 min' * floor(date_part('minute', timestamp) / 15), 
                    'HH24:MI'
                ) as time_slot,
                COUNT(*) as count
            FROM checkins
            WHERE timestamp::date = CURRENT_DATE
            GROUP BY time_slot
            ORDER BY time_slot;
        `;
        const byTime = timeResult.rows;

        return {
            totalWFH,
            totalStaff,
            wfhPercentage,
            byJobTitle,
            byTime
        };

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw error;
    }
}

// Initialize on require (or could be explicit)
initDb();

module.exports = {
    initDb,
    addCheckin,
    getTodayReport,
    importUsers,
    getDashboardStats,
    clearUsers
};
