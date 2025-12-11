import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserInfo } from "../helpers/user-info";

describe("getUserInfo", () => {
  const mockApiEndpoint = "https://api.example.com/graphql";
  const mockAccessToken = "mock-access-token-12345";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully fetch user info with access token", async () => {
    const mockUserData = {
      id: "user-123",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      groups: []
    };

    const mockResponse = {
      data: {
        customer: mockUserData,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getUserInfo(mockApiEndpoint, mockAccessToken);

    expect(result).toEqual(mockUserData);

    expect(fetch).toHaveBeenCalledWith(mockApiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${mockAccessToken}`,
      },
      body: expect.stringContaining("query GetCustomer"),
    });
  });

  it("should include Authorization header with Bearer token", async () => {
    const mockResponse = {
      data: {
        customer: {
          id: "user-123",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getUserInfo(mockApiEndpoint, mockAccessToken);

    const fetchCall = (fetch as any).mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
  });

  it("should return null when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await getUserInfo(mockApiEndpoint, mockAccessToken);

    expect(result).toBeNull();
  });

  it("should return null when customer data is missing", async () => {
    const mockResponse = {
      data: {
        customer: null,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getUserInfo(mockApiEndpoint, mockAccessToken);

    expect(result).toBeNull();
  });

  it("should return null when response structure is invalid", async () => {
    const mockResponse = {
      data: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getUserInfo(mockApiEndpoint, mockAccessToken);

    expect(result).toBeNull();
  });

  it("should send correct GraphQL query", async () => {
    const mockResponse = {
      data: {
        customer: {
          id: "123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getUserInfo(mockApiEndpoint, mockAccessToken);

    const fetchCall = (fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.query).toContain("query GetCustomer");
    expect(requestBody.query).toContain("id");
    expect(requestBody.query).toContain("firstName");
    expect(requestBody.query).toContain("lastName");
    expect(requestBody.query).toContain("email");
  });

  it("should correctly map all customer fields", async () => {
    const mockResponse = {
      data: {
        customer: {
          id: "customer-456",
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice.johnson@test.com",
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getUserInfo(mockApiEndpoint, mockAccessToken);

    expect(result).toEqual({
      id: "customer-456",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.johnson@test.com",
      groups: [],
    });
  });
});
