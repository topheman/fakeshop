import { login, logout } from "../actions/auth";
import { getUserInfos } from "../actions/session";

import { Button } from "./ui/button";

export default async function FakeLogin() {
  const session = await getUserInfos();

  if (session) {
    return (
      <>
        <p className="mb-4 font-semibold text-green-600">
          You are logged in as {session.firstName} {session.lastName}
        </p>
        <form action={logout}>
          <Button
            type="submit"
            className="bg-primary px-6 py-3 text-lg text-white hover:bg-primary/90"
          >
            Logout
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <p className="mb-4 text-gray-600">
        Click the button below to simulate a user login. This will create a fake
        user session for demonstration purposes.
      </p>
      <form action={login}>
        <Button
          type="submit"
          className="bg-primary px-6 py-3 text-lg text-white hover:bg-primary/90"
        >
          Fake Login
        </Button>
      </form>
    </>
  );
}
