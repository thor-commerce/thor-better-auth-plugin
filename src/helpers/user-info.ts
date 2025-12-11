type UserInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  groups: Array<{ id: string; name: string }>;
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
            customerGroups {
              nodes {
                id
                name
              }
            }
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
    groups: customer.customerGroups?.nodes?.map((group: any) => ({
      id: group.id,
      name: group.name,
    })) ?? [],
  };
}

export { getUserInfo };
export type { UserInfo };
