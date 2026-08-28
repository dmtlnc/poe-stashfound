import { DemoButton } from "@/components/DemoButton";
import { ImportPanel } from "@/components/ImportPanel";
import { ContactLine } from "@/components/ContactLine";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <p className="brand shrink-0 text-lg">Stashfound</p>
          <ContactLine className="hidden min-w-0 flex-1 text-center text-xs leading-5 text-muted lg:block" />
          <p className="ml-auto shrink-0 label-caps">PoE1 SSF unique matcher</p>
        </div>
        <ContactLine className="mx-auto mt-3 max-w-5xl text-center text-xs leading-5 text-muted lg:hidden" />
        <div className="rule mt-4" />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-2xl space-y-4">
          <p className="label-caps text-gold">Current challenge · unique names</p>
          <h1 className="text-gold-title text-4xl font-semibold tracking-wide sm:text-5xl">
            What can you build with the uniques you already found?
          </h1>
          <p className="text-lg leading-8 text-muted">
            Import unique names from PoE Ladder (account tag or URL), then rank
            Standard / Allflame poe.ninja builds by unique-name overlap.
            Missing pieces come with farm notes — this is SSF, so nobody is selling
            them to you.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <ImportPanel />
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-muted">
              Your unique list stays in this browser. Live PoE Ladder lookup goes through
              a small Cloudflare Worker; CSV and pasted names never leave the page.
            </p>
            <DemoButton />
          </div>
        </div>
        <ul className="grid gap-4 text-sm text-muted sm:grid-cols-3">
          <li className="panel p-4">
            Unique names only in v1. Watcher&apos;s Eye and similar jewels warn
            that the roll still matters.
          </li>
          <li className="panel p-4">
            Default match is 70% weighted overlap — missing a T0 hurts more
            than a T4. The rest is a farm list, not a trade whisper.
          </li>
          <li className="panel p-4">
            poe.ninja builds for Standard, Allflame, and Allflame HC
            ship as static JSON and refresh when the site is rebuilt — not fetched
            from your browser.
          </li>
        </ul>
      </main>
    </div>
  );
}
