"use client";

import Link from "next/link";
import { ContactLine } from "./ContactLine";
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
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Link href="/app" className="brand shrink-0 text-lg">
          Stashfound
        </Link>
        <ContactLine className="hidden min-w-0 flex-1 text-center text-xs leading-5 text-muted lg:block" />
        <div className="ml-auto flex shrink-0 items-center gap-4 text-sm text-muted">
          <span className="label-caps">
            {accountName}
            {mock ? " · demo" : ""}
          </span>
          <button type="button" onClick={logout} className="btn-outline h-9 px-3 text-[0.7rem]">
            Clear stash
          </button>
        </div>
      </div>
      <ContactLine className="mx-auto mt-3 max-w-6xl text-center text-xs leading-5 text-muted lg:hidden" />
      <div className="rule mt-4" />
    </header>
  );
}
