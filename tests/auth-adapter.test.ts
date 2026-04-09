import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing the adapter
const mockExecute = vi.fn();
vi.mock("@/lib/db", () => ({
  getDb: () => ({ execute: mockExecute }),
}));

import { TursoAdapter } from "@/lib/auth-adapter";

describe("TursoAdapter", () => {
  const adapter = TursoAdapter();

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("createUser", () => {
    it("inserts a user and returns it with generated id", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const user = await adapter.createUser!({
        id: "ignored",
        name: "Test User",
        email: "test@example.com",
        emailVerified: null,
        image: null,
      });

      expect(mockExecute).toHaveBeenCalledOnce();
      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("INSERT INTO users");
      expect(call.args[1]).toBe("Test User");
      expect(call.args[2]).toBe("test@example.com");
      expect(call.args[3]).toBeNull(); // emailVerified
      expect(call.args[4]).toBeNull(); // image
      expect(user.email).toBe("test@example.com");
      expect(user.id).toBeTruthy();
      expect(user.id).not.toBe("ignored"); // adapter generates its own id
    });

    it("passes emailVerified as ISO string when provided", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const date = new Date("2026-01-15T00:00:00Z");

      await adapter.createUser!({
        id: "",
        name: "Verified",
        email: "v@example.com",
        emailVerified: date,
        image: null,
      });

      const call = mockExecute.mock.calls[0][0];
      expect(call.args[3]).toBe("2026-01-15T00:00:00.000Z");
    });
  });

  describe("getUser", () => {
    it("returns user when found", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            name: "Found",
            email: "found@example.com",
            email_verified: null,
            image: null,
          },
        ],
      });

      const user = await adapter.getUser!("user-1");
      expect(user).not.toBeNull();
      expect(user!.id).toBe("user-1");
      expect(user!.email).toBe("found@example.com");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const user = await adapter.getUser!("nonexistent");
      expect(user).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("returns user when found", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-2",
            name: "Email User",
            email: "email@example.com",
            email_verified: "2026-01-01T00:00:00.000Z",
            image: "https://example.com/avatar.png",
          },
        ],
      });

      const user = await adapter.getUserByEmail!("email@example.com");
      expect(user).not.toBeNull();
      expect(user!.email).toBe("email@example.com");
      expect(user!.emailVerified).toEqual(new Date("2026-01-01T00:00:00.000Z"));
      expect(user!.image).toBe("https://example.com/avatar.png");
    });

    it("returns null when not found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const user = await adapter.getUserByEmail!("nobody@example.com");
      expect(user).toBeNull();
    });
  });

  describe("getUserByAccount", () => {
    it("returns user via JOIN on accounts table", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-3",
            name: "Account User",
            email: "acct@example.com",
            email_verified: null,
            image: null,
          },
        ],
      });

      const user = await adapter.getUserByAccount!({
        provider: "github",
        providerAccountId: "gh-123",
      });

      expect(user).not.toBeNull();
      expect(user!.id).toBe("user-3");
      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("JOIN accounts");
      expect(call.args).toEqual(["github", "gh-123"]);
    });

    it("returns null when account not found", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });
      const user = await adapter.getUserByAccount!({
        provider: "google",
        providerAccountId: "unknown",
      });
      expect(user).toBeNull();
    });
  });

  describe("linkAccount", () => {
    it("inserts into accounts table with all fields", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await adapter.linkAccount!({
        userId: "user-1",
        type: "oauth",
        provider: "google",
        providerAccountId: "goog-456",
        refresh_token: "refresh",
        access_token: "access",
        expires_at: 1700000000,
        token_type: "bearer",
        scope: "openid email",
        id_token: "id-tok",
      });

      const call = mockExecute.mock.calls[0][0];
      expect(call.sql).toContain("INSERT INTO accounts");
      expect(call.args[1]).toBe("user-1"); // user_id
      expect(call.args[2]).toBe("oauth"); // type
      expect(call.args[3]).toBe("google"); // provider
      expect(call.args[4]).toBe("goog-456"); // provider_account_id
    });

    it("handles nullable fields by passing null", async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      await adapter.linkAccount!({
        userId: "user-1",
        type: "oauth",
        provider: "github",
        providerAccountId: "gh-789",
      });

      const call = mockExecute.mock.calls[0][0];
      expect(call.args[5]).toBeNull(); // refresh_token
      expect(call.args[6]).toBeNull(); // access_token
      expect(call.args[7]).toBeNull(); // expires_at
    });
  });

  describe("updateUser", () => {
    it("updates only provided fields", async () => {
      // First call: UPDATE, second call: SELECT
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "user-1",
              name: "New Name",
              email: "test@example.com",
              email_verified: null,
              image: null,
            },
          ],
        });

      const result = await adapter.updateUser!({
        id: "user-1",
        name: "New Name",
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      const updateCall = mockExecute.mock.calls[0][0];
      expect(updateCall.sql).toContain("UPDATE users SET name = ?");
      expect(updateCall.args).toEqual(["New Name", "user-1"]);
      expect(result.name).toBe("New Name");
    });

    it("skips UPDATE when no fields changed", async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [
          {
            id: "user-1",
            name: "Same",
            email: "same@example.com",
            email_verified: null,
            image: null,
          },
        ],
      });

      const result = await adapter.updateUser!({ id: "user-1" });

      // Only the SELECT, no UPDATE
      expect(mockExecute).toHaveBeenCalledOnce();
      expect(result.id).toBe("user-1");
    });
  });
});
