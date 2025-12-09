import { describe, it, expect, vi, beforeEach } from "vitest";
import { callIdpLogin } from "../helpers/idp-login";

describe("callIdpLogin", () => {
  const mockApiEndpoint = "https://api.example.com/graphql";
  const mockCredentials = {
    email: "test@example.com",
    password: "password123",
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it("should successfully login and return access token response", async () => {
    const mockResponse = {
      data: {
        customerAccessTokenCreate: {
          customerAccessToken: {
            accessToken: "mock-access-token",
            refreshToken: "mock-refresh-token",
            expiresIn: 3600,
          },
          errors: null,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await callIdpLogin(mockApiEndpoint, mockCredentials);

    expect(result).toEqual({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresIn: 3600,
    });

    expect(fetch).toHaveBeenCalledWith(mockApiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: expect.stringContaining("CustomerAccessTokenCreate"),
    });
  });

  it("should return null when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    const result = await callIdpLogin(mockApiEndpoint, mockCredentials);

    expect(result).toBeNull();
  });

  it("should return null when customerAccessToken is missing", async () => {
    const mockResponse = {
      data: {
        customerAccessTokenCreate: {
          customerAccessToken: null,
          errors: [{ __typename: "CustomerAccessTokenCreateError" }],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await callIdpLogin(mockApiEndpoint, mockCredentials);

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

    const result = await callIdpLogin(mockApiEndpoint, mockCredentials);

    expect(result).toBeNull();
  });

  it("should send correct GraphQL mutation with variables", async () => {
    const mockResponse = {
      data: {
        customerAccessTokenCreate: {
          customerAccessToken: {
            accessToken: "token",
            refreshToken: "refresh",
            expiresIn: 3600,
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await callIdpLogin(mockApiEndpoint, mockCredentials);

    const fetchCall = (fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.variables.input).toEqual({
      email: mockCredentials.email,
      password: mockCredentials.password,
    });
    expect(requestBody.query).toContain("mutation CustomerAccessTokenCreate");
  });
});
