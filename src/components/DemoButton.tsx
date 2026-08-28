"use client";

import { useRouter } from "next/navigation";
import { buildDemoSnapshot } from "@/lib/client/demo";
import { saveInventory } from "@/lib/client/store";

export function DemoButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-outline h-12"
      onClick={() => {
        saveInventory(buildDemoSnapshot());
        router.push("/app");
      }}
    >
      Try the demo stash
    </button>
  );
}
