import { User } from "lucide-react";

import { getUserInfos } from "../actions/session";

export default async function UserIcon() {
  const userInfos = await getUserInfos();

  return (
    <span className="hover:text-gray-300">
      <User className={userInfos ? "text-green-300" : ""} />
    </span>
  );
}
