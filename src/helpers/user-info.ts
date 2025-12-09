type UserInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

async function getUserInfo(
  apiEndpoint: string,
  accessToken: string
): Promise<UserInfo | null> {
  const res = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: `
        query GetCustomer {
          customer {
            id
            firstName
            lastName
            email
          }
        }
      `,
    }),
  });

  if (!res.ok) return null;

  const json: any = await res.json();
  const customer = json?.data?.customer;

  if (!customer) return null;

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
  };
}

export { getUserInfo };
export type { UserInfo };
