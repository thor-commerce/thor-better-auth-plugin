# Real Integration Testing

This directory contains tests that run against actual Thor Commerce demo environment APIs, not mocks.

## Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your demo environment credentials in `.env`:
   ```env
   THOR_API_ENDPOINT=https://api.thorcommerce.io/your-org/storefront/graphql
   THOR_TEST_EMAIL=your-test-email@example.com
   THOR_TEST_PASSWORD=your-test-password
   ```

3. Make sure `.env` is in your `.gitignore` (it should be by default)

## Running Real Integration Tests

To run only the real integration tests:

```bash
pnpm test:real
```

To run all tests (including mocked unit tests):

```bash
pnpm test
```

## What Gets Tested

The real integration test (`real-integration.test.ts`) performs the following:

1. **Successful Authentication**: 
   - Logs in with valid credentials from `.env`
   - Verifies the complete authentication flow
   - Validates session data structure
   - Confirms access token and refresh token are returned
   - Checks user information (id, email, name)

2. **Invalid Credentials**:
   - Tests authentication with wrong password
   - Verifies proper error handling (401 status)

3. **Non-existent User**:
   - Tests authentication with non-existent email
   - Verifies proper error handling

## Notes

- Real integration tests have a 30-second timeout to account for network latency
- These tests will make actual API calls to your demo environment
- Test results include console output with actual user data (tokens are truncated for security)
- Don't commit your `.env` file with real credentials

## Test Output Example

When successful, you'll see output like:
```
✅ Successfully authenticated with real API
📧 User: test@example.com
👤 Name: John Doe
🆔 User ID: cus_01kbwrygcpfe...
🔑 Access Token: eyJhbGciOiJIUzI1NiIs...
⏰ Session expires: 2024-12-10T15:30:00.000Z
```
