import sql from 'mssql';

// Cau hinh connection string, uu tien doc tu ENV
const sqlConfig: sql.config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword',
    database: process.env.DB_NAME || 'SixDegreesWiki',
    server: process.env.DB_SERVER || 'localhost',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: true, // For Azure
        trustServerCertificate: true, // For localhost development
    },
};

// Next.js hot-reloading de tranh tao qua nhieu connection pools
declare global {
    // eslint-disable-next-line no-var
    var sqlGlobalPool: sql.ConnectionPool | undefined;
}

/**
 * Singleton instance connection pool cho SQL Server
 */
export async function getDbConnection() {
    try {
        if (global.sqlGlobalPool) return global.sqlGlobalPool;

        const pool = new sql.ConnectionPool(sqlConfig);
        const connection = await pool.connect();

        if (process.env.NODE_ENV !== 'production') {
            global.sqlGlobalPool = connection;
        }

        return connection;
    } catch (err) {
        console.error('Loi ket noi den SQL Server:', err);
        throw err;
    }
}

// Helper func thuc thi query ngan gon
export async function query<T = any>(queryString: string, args: Record<string, any> = {}): Promise<sql.IRecordSet<T>> {
    const pool = await getDbConnection();
    const request = pool.request();

    // Set parameters neu co
    Object.entries(args).forEach(([key, value]) => {
        request.input(key, value);
    });

    const result = await request.query<T>(queryString);
    return result.recordset;
}
