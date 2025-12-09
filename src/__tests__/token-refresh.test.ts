import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccessToken } from "../helpers/token-refresh";
import type { SessionData } from "../helpers/authenticate";

describe("getAccessToken", () => {
  const mockApiEndpoint = "https://api.example.com/graphql";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return existing token when it's not expiring soon", async () => {
    const futureExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "access-token-123",
      expiresAt: futureExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getAccessToken(mockApiEndpoint, mockSession);

    expect(result.refreshed).toBe(false);
    expect(result.accessToken).toBe("access-token-123");
    expect(result.session).toBeUndefined();
  });

  it("should refresh token when expiring within threshold (5 minutes)", async () => {
    const soonExpiry = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "old-access-token",
      expiresAt: soonExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRefreshResponse = {
      data: {
        customerAccessTokenRefresh: {
          customerAccessToken: {
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            expiresIn: 3600,
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    });

    const result = await getAccessToken(mockApiEndpoint, mockSession);

    expect(result.refreshed).toBe(true);
    expect(result.accessToken).toBe("new-access-token");
    expect(result.session).toBeDefined();
    expect(result.session?.token).toBe("new-access-token");
    expect(result.session?.id).toBe("new-refresh-token");
    expect(fetch).toHaveBeenCalledWith(mockApiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: expect.stringContaining("CustomerAccessTokenRefresh"),
    });
  });

  it("should use custom refresh threshold", async () => {
    const expiry = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes from now
    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "access-token-123",
      expiresAt: expiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // With default 5 min threshold, should NOT refresh
    const resultDefault = await getAccessToken(mockApiEndpoint, mockSession);
    expect(resultDefault.refreshed).toBe(false);

    // With 10 min threshold, SHOULD refresh
    const mockRefreshResponse = {
      data: {
        customerAccessTokenRefresh: {
          customerAccessToken: {
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            expiresIn: 3600,
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    });

    const resultCustom = await getAccessToken(mockApiEndpoint, mockSession, 10);
    expect(resultCustom.refreshed).toBe(true);
  });

  it("should return old token if refresh fails", async () => {
    const soonExpiry = new Date(Date.now() + 3 * 60 * 1000);
    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "old-access-token",
      expiresAt: soonExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await getAccessToken(mockApiEndpoint, mockSession);

    expect(result.refreshed).toBe(false);
    expect(result.accessToken).toBe("old-access-token");
    expect(result.session).toBeUndefined();
  });

  it("should refresh when token is already expired", async () => {
    const pastExpiry = new Date(Date.now() - 1000); // Already expired
    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "expired-token",
      expiresAt: pastExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRefreshResponse = {
      data: {
        customerAccessTokenRefresh: {
          customerAccessToken: {
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            expiresIn: 3600,
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    });

    const result = await getAccessToken(mockApiEndpoint, mockSession);

    expect(result.refreshed).toBe(true);
    expect(result.accessToken).toBe("new-access-token");
  });

  it("should send correct GraphQL mutation for refresh", async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000);
    const mockSession: SessionData["session"] = {
      id: "refresh-token-abc",
      userId: "user-123",
      token: "old-token",
      expiresAt: soonExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRefreshResponse = {
      data: {
        customerAccessTokenRefresh: {
          customerAccessToken: {
            accessToken: "new-token",
            refreshToken: "new-refresh",
            expiresIn: 7200,
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    });

    await getAccessToken(mockApiEndpoint, mockSession);

    const fetchCall = (fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.query).toContain("mutation CustomerAccessTokenRefresh");
    expect(requestBody.variables.input.refreshToken).toBe("refresh-token-abc");
  });

  it("should return old token when refresh response is invalid", async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000);
    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "old-token",
      expiresAt: soonExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockInvalidResponse = {
      data: {
        customerAccessTokenRefresh: {
          customerAccessToken: null,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockInvalidResponse,
    });

    const result = await getAccessToken(mockApiEndpoint, mockSession);

    expect(result.refreshed).toBe(false);
    expect(result.accessToken).toBe("old-token");
  });

  it("should update session timestamps when refreshing", async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000);
    const oldCreatedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldUpdatedAt = new Date(Date.now() - 60 * 60 * 1000);

    const mockSession: SessionData["session"] = {
      id: "refresh-token-123",
      userId: "user-123",
      token: "old-token",
      expiresAt: soonExpiry,
      createdAt: oldCreatedAt,
      updatedAt: oldUpdatedAt,
    };

    const mockRefreshResponse = {
      data: {
        customerAccessTokenRefresh: {
          customerAccessToken: {
            accessToken: "new-token",
            refreshToken: "new-refresh",
            expiresIn: 3600,
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshResponse,
    });

    const beforeRefresh = Date.now();
    const result = await getAccessToken(mockApiEndpoint, mockSession);
    const afterRefresh = Date.now();

    expect(result.session?.createdAt).toEqual(oldCreatedAt); // Should keep original
    expect(result.session?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeRefresh);
    expect(result.session?.updatedAt.getTime()).toBeLessThanOrEqual(afterRefresh);
  });
});
