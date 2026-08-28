"use client";

import Link from "next/link";
import { clearInventory } from "@/lib/client/store";

export function AppHeader({
  accountName,
  mock,
}: {
  accountName: string;
  mock: boolean;
}) {
  function logout() {
    clearInventory();
    window.location.href = process.env.NEXT_PUBLIC_BASE_PATH
      ? `${process.env.NEXT_PUBLIC_BASE_PATH}/`
      : "/";
  }

  return (
    <header className="relative px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/app" className="brand text-lg">
          Stashfound
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="label-caps">
            {accountName}
            {mock ? " · demo" : ""}
          </span>
          <button type="button" onClick={logout} className="btn-outline h-9 px-3 text-[0.7rem]">
            Clear stash
          </button>
        </div>
      </div>
      <div className="rule mt-4" />
    </header>
  );
}
