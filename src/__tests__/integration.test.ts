import { describe, it, expect, vi, beforeEach } from "vitest";
import { callIdpLogin } from "../helpers/idp-login";
import { getUserInfo } from "../helpers/user-info";

describe("Integration: Login and Fetch User Info", () => {
  const mockApiEndpoint = "https://api.example.com/graphql";
  const mockCredentials = {
    email: "integration@test.com",
    password: "securePassword123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full authentication flow: login and fetch user info", async () => {
    // Mock login response
    const mockLoginResponse = {
      data: {
        customerAccessTokenCreate: {
          customerAccessToken: {
            accessToken: "integration-access-token",
            refreshToken: "integration-refresh-token",
            expiresIn: 7200,
          },
        },
      },
    };

    // Mock user info response
    const mockUserInfoResponse = {
      data: {
        customer: {
          id: "user-integration-123",
          firstName: "Integration",
          lastName: "Test",
          email: "integration@test.com",
        },
      },
    };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      callCount++;
      const body = JSON.parse(options.body as string);
      
      // First call: login
      if (body.query.includes("CustomerAccessTokenCreate")) {
        return {
          ok: true,
          json: async () => mockLoginResponse,
        };
      }
      
      // Second call: get user info
      if (body.query.includes("GetCustomer")) {
        // Verify Authorization header is present
        expect(options.headers.Authorization).toBe("Bearer integration-access-token");
        return {
          ok: true,
          json: async () => mockUserInfoResponse,
        };
      }
    });

    // Step 1: Login
    const loginResult = await callIdpLogin(mockApiEndpoint, mockCredentials);
    
    expect(loginResult).not.toBeNull();
    expect(loginResult?.accessToken).toBe("integration-access-token");
    expect(loginResult?.refreshToken).toBe("integration-refresh-token");
    expect(loginResult?.expiresIn).toBe(7200);

    // Step 2: Fetch user info using access token
    const userInfo = await getUserInfo(mockApiEndpoint, loginResult!.accessToken);

    expect(userInfo).not.toBeNull();
    expect(userInfo).toEqual({
      id: "user-integration-123",
      firstName: "Integration",
      lastName: "Test",
      email: "integration@test.com",
    });

    // Verify both API calls were made
    expect(callCount).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should handle login failure gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const loginResult = await callIdpLogin(mockApiEndpoint, mockCredentials);
    
    expect(loginResult).toBeNull();
    
    // Should not attempt to fetch user info without a token
    // (this would be handled in the calling code)
  });

  it("should handle user info fetch failure after successful login", async () => {
    const mockLoginResponse = {
      data: {
        customerAccessTokenCreate: {
          customerAccessToken: {
            accessToken: "valid-token",
            refreshToken: "valid-refresh",
            expiresIn: 3600,
          },
        },
      },
    };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      callCount++;
      const body = JSON.parse(options.body as string);
      
      if (body.query.includes("CustomerAccessTokenCreate")) {
        return {
          ok: true,
          json: async () => mockLoginResponse,
        };
      }
      
      if (body.query.includes("GetCustomer")) {
        return {
          ok: false,
          status: 500,
        };
      }
    });

    const loginResult = await callIdpLogin(mockApiEndpoint, mockCredentials);
    expect(loginResult).not.toBeNull();

    const userInfo = await getUserInfo(mockApiEndpoint, loginResult!.accessToken);
    expect(userInfo).toBeNull();

    expect(callCount).toBe(2);
  });

  it("should use correct email from login in user info", async () => {
    const mockLoginResponse = {
      data: {
        customerAccessTokenCreate: {
          customerAccessToken: {
            accessToken: "token-abc123",
            refreshToken: "refresh-abc123",
            expiresIn: 3600,
          },
        },
      },
    };

    const mockUserInfoResponse = {
      data: {
        customer: {
          id: "user-999",
          firstName: "John",
          lastName: "Smith",
          email: mockCredentials.email, // Same email as used in login
        },
      },
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfoResponse,
      });

    const loginResult = await callIdpLogin(mockApiEndpoint, mockCredentials);
    const userInfo = await getUserInfo(mockApiEndpoint, loginResult!.accessToken);

    expect(userInfo?.email).toBe(mockCredentials.email);
  });
});
