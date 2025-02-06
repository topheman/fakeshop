import { cookies } from "next/headers";
import { faker } from "@faker-js/faker";

export interface UserSession {
  infos: {
    firstName: string;
    lastName: string;
    address: string;
    country: string;
    phoneNumber: string;
    email: string;
  };
  cart: {
    items: Array<{
      id: number;
      quantity: number;
    }>;
  };
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  if (sessionCookie) {
    try {
      return JSON.parse(sessionCookie.value);
    } catch {
      return null;
    }
  }
  return null;
}

export function createUserSession(): UserSession {
  const session: UserSession = {
    infos: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      address: faker.location.streetAddress(),
      country: faker.location.country(),
      phoneNumber: faker.phone.number(),
      email: faker.internet.email(),
    },
    cart: {
      items: [],
    },
  };

  return session;
}

export async function setUserSessionCookie(
  session: UserSession,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "user_session",
    value: JSON.stringify(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}
