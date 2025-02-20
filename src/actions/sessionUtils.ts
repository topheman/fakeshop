import { faker } from "@faker-js/faker";

import type { UserInfos } from "./types";

export function createUserInfos(): UserInfos {
  const session: UserInfos = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address: faker.location.streetAddress(),
    country: faker.location.country(),
    phoneNumber: faker.phone.number("+## # ## ## ## ##"),
    email: faker.internet.email(),
  };

  return session;
}
