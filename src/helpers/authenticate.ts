import { callIdpLogin } from "./idp-login";
import { getUserInfo } from "./user-info";

export type SessionData = {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
    groups: Array<{ id: string; name: string }>;
  };
  session: {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    token: string;
    expiresAt: Date;
  };
};

export type AuthError = {
  error: string;
  status: number;
};

export async function authenticateAndCreateSession(
  apiEndpoint: string,
  email: string,
  password: string
): Promise<SessionData | AuthError> {
  const idpLogin = await callIdpLogin(apiEndpoint, {
    email,
    password,
  });

  if (!idpLogin) {
    return { error: "Invalid credentials", status: 401 };
  }

  const { accessToken, refreshToken, expiresIn } = idpLogin;
  const now = Date.now();
  const expires = new Date(now + expiresIn * 1000);

  const userInfo = await getUserInfo(apiEndpoint, accessToken);
  if (!userInfo) {
    return { error: "Failed to fetch user info", status: 500 };
  }

  const sessionData: SessionData = {
    user: {
      id: userInfo.id,
      email: userInfo.email,
      name: `${userInfo.firstName} ${userInfo.lastName}`,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      emailVerified: true,
      groups: userInfo.groups
    },
    session: {
      id: refreshToken,
      userId: userInfo.id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      token: accessToken,
      expiresAt: expires,
    },
  };

  return sessionData;
}
