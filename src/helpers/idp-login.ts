type AccessTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

async function callIdpLogin(
  apiEndpoint: string,
  input: { email: string; password: string }
): Promise<AccessTokenResponse | null> {
  const res = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
          customerAccessTokenCreate(input: $input) {
            customerAccessToken {
              accessToken
              refreshToken
              expiresIn
            }
            errors {
              __typename
            }
          }
        }
      `,
      variables: {
        input: {
          email: input.email,
          password: input.password,
        },
      },
    }),
  });

  if (!res.ok) return null;

  const json: any = await res.json();
  const tokenNode = json?.data?.customerAccessTokenCreate?.customerAccessToken;

  if (!tokenNode) return null;

  return {
    accessToken: tokenNode.accessToken,
    refreshToken: tokenNode.refreshToken,
    expiresIn: tokenNode.expiresIn,
  };
}

export { callIdpLogin };
export type { AccessTokenResponse };