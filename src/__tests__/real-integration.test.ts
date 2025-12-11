import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { authenticateAndCreateSession } from "../helpers/authenticate";

// Load environment variables from .env file
config();

describe("Real Integration Test - Demo Environment", () => {
  const apiEndpoint = process.env.THOR_API_ENDPOINT!;
  const testEmail = process.env.THOR_TEST_EMAIL!;
  const testPassword = process.env.THOR_TEST_PASSWORD!;

  beforeAll(() => {
    // Check if required environment variables are set
    if (!apiEndpoint || !testEmail || !testPassword) {
      throw new Error(
        "Missing required environment variables. Please create a .env file based on .env.example"
      );
    }
  });

  it("should authenticate with real credentials and return session data", async () => {
    const result = await authenticateAndCreateSession(
      apiEndpoint,
      testEmail,
      testPassword
    );

    // Should not be an error
    expect(result).not.toHaveProperty("error");
    
    if ("error" in result) {
      throw new Error(`Authentication failed: ${result.error}`);
    }

    // Verify user data structure
    expect(result.user).toBeDefined();
    expect(result.user.id).toBeTruthy();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBeTruthy();
    expect(result.user.emailVerified).toBe(true);
    expect(result.user.createdAt).toBeInstanceOf(Date);
    expect(result.user.updatedAt).toBeInstanceOf(Date);

    // Verify session data structure
    expect(result.session).toBeDefined();
    expect(result.session.id).toBeTruthy(); // refresh token
    expect(result.session.userId).toBe(result.user.id);
    expect(result.session.token).toBeTruthy(); // access token
    expect(result.session.expiresAt).toBeInstanceOf(Date);
    expect(result.session.createdAt).toBeInstanceOf(Date);
    expect(result.session.updatedAt).toBeInstanceOf(Date);

    // Verify expiration is in the future
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    console.log("✅ Successfully authenticated with real API");
    console.log(`📧 User: ${result.user.email}`);
    console.log(`👤 Name: ${result.user.name}`);
    console.log(`🆔 User ID: ${result.user.id}`);
    console.log(`👥 Groups: ${result.user.groups.map(g => g.name).join(", ")}`);
    console.log(`🔑 Access Token: ${result.session.token.substring(0, 20)}...`);
    console.log(`⏰ Session expires: ${result.session.expiresAt.toISOString()}`);
  }, 30000); // 30 second timeout for real API calls

  it("should fail with invalid credentials", async () => {
    const result = await authenticateAndCreateSession(
      apiEndpoint!,
      testEmail!,
      "wrong-password-123"
    );

    // Should be an error
    expect(result).toHaveProperty("error");
    
    if ("error" in result) {
      expect(result.error).toBe("Invalid credentials");
      expect(result.status).toBe(401);
      console.log("✅ Invalid credentials correctly rejected");
    }
  }, 30000);

  it("should fail with non-existent user", async () => {
    const result = await authenticateAndCreateSession(
      apiEndpoint!,
      "nonexistent-user-" + Date.now() + "@example.com",
      "some-password"
    );

    // Should be an error
    expect(result).toHaveProperty("error");
    
    if ("error" in result) {
      expect(result.error).toBe("Invalid credentials");
      expect(result.status).toBe(401);
      console.log("✅ Non-existent user correctly rejected");
    }
  }, 30000);
});
