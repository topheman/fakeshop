import { User } from "lucide-react";
import Link from "next/link";

import { getUserInfos } from "../actions/session";

export default async function UserIcon() {
  const userInfos = await getUserInfos();

  return (
    <Link href="/account" className="hover:text-gray-300">
      <User className={userInfos ? "text-green-300" : ""} />
    </Link>
  );
}
