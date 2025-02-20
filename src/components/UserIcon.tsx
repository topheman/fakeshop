import { User } from "lucide-react";
import Link from "next/link";

import { getUserInfos } from "@/actions/session";

export default async function UserIcon() {
  const userInfos = await getUserInfos();

  return (
    <Link
      href="/account"
      className="hover:text-gray-300"
      title={
        userInfos
          ? `Logged in as ${userInfos.firstName} ${userInfos.lastName}`
          : "Not logged in"
      }
    >
      <User className={userInfos ? "text-green-300" : ""} />
    </Link>
  );
}
