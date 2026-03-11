import { query, getDbConnection } from './db';
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from 'next-auth/adapters';

/**
 * Custom NextAuth adapter cho SQL Server 2019
 * Ghi/doc truc tiep vao bang Users, Accounts, Sessions da tao o Day 2
 */
export function MssqlAdapter(): Adapter {
  return {
    async createUser(user) {
      const id = crypto.randomUUID();
      await query(
        `INSERT INTO Users (id, name, email, emailVerified, image)
         VALUES (@id, @name, @email, @emailVerified, @image)`,
        {
          id,
          name: user.name ?? null,
          email: user.email,
          emailVerified: user.emailVerified ?? null,
          image: user.image ?? null,
        },
      );
      return { ...user, id } as AdapterUser;
    },

    async getUser(id) {
      const rows = await query<AdapterUser>(
        'SELECT id, name, email, emailVerified, image FROM Users WHERE id = @id',
        { id },
      );
      return rows[0] ?? null;
    },

    async getUserByEmail(email) {
      const rows = await query<AdapterUser>(
        'SELECT id, name, email, emailVerified, image FROM Users WHERE email = @email',
        { email },
      );
      return rows[0] ?? null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const rows = await query<AdapterUser>(
        `SELECT u.id, u.name, u.email, u.emailVerified, u.image
         FROM Users u
         INNER JOIN Accounts a ON u.id = a.userId
         WHERE a.provider = @provider AND a.providerAccountId = @providerAccountId`,
        { provider, providerAccountId },
      );
      return rows[0] ?? null;
    },

    async updateUser(user) {
      await query(
        `UPDATE Users SET name = @name, email = @email, emailVerified = @emailVerified, image = @image
         WHERE id = @id`,
        {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          emailVerified: user.emailVerified ?? null,
          image: user.image ?? null,
        },
      );
      const rows = await query<AdapterUser>(
        'SELECT id, name, email, emailVerified, image FROM Users WHERE id = @id',
        { id: user.id },
      );
      return rows[0] as AdapterUser;
    },

    async deleteUser(userId) {
      await query('DELETE FROM Users WHERE id = @id', { id: userId });
    },

    async linkAccount(account) {
      const id = crypto.randomUUID();
      await query(
        `INSERT INTO Accounts (id, userId, type, provider, providerAccountId,
         refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES (@id, @userId, @type, @provider, @providerAccountId,
         @refresh_token, @access_token, @expires_at, @token_type, @scope, @id_token, @session_state)`,
        {
          id,
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state: (account as any).session_state ?? null,
        },
      );
      return account as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await query(
        'DELETE FROM Accounts WHERE provider = @provider AND providerAccountId = @providerAccountId',
        { provider, providerAccountId },
      );
    },

    async createSession(session) {
      const id = crypto.randomUUID();
      await query(
        `INSERT INTO Sessions (id, sessionToken, userId, expires)
         VALUES (@id, @sessionToken, @userId, @expires)`,
        {
          id,
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
      );
      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const rows = await query<AdapterSession & AdapterUser>(
        `SELECT s.sessionToken, s.userId, s.expires,
                u.id, u.name, u.email, u.emailVerified, u.image
         FROM Sessions s
         INNER JOIN Users u ON s.userId = u.id
         WHERE s.sessionToken = @sessionToken`,
        { sessionToken },
      );
      if (!rows[0]) return null;
      const row = rows[0];
      return {
        session: {
          sessionToken: row.sessionToken,
          userId: row.userId,
          expires: row.expires,
        },
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          emailVerified: row.emailVerified,
          image: row.image,
        } as AdapterUser,
      };
    },

    async updateSession(session) {
      await query(
        'UPDATE Sessions SET expires = @expires WHERE sessionToken = @sessionToken',
        { sessionToken: session.sessionToken, expires: session.expires },
      );
      const rows = await query<AdapterSession>(
        'SELECT id, sessionToken, userId, expires FROM Sessions WHERE sessionToken = @sessionToken',
        { sessionToken: session.sessionToken },
      );
      return rows[0] ?? null;
    },

    async deleteSession(sessionToken) {
      await query('DELETE FROM Sessions WHERE sessionToken = @sessionToken', {
        sessionToken,
      });
    },
  };
}
