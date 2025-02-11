import { faker } from "@faker-js/faker";
import type { UserSession } from "./types";

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
