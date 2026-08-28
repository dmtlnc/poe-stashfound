import { GITHUB_ISSUES_URL, POE_WHISPER } from "@/lib/config";

export function ContactLine({ className }: { className?: string }) {
  return (
    <p className={className}>
      Issues or ideas: whisper{" "}
      <span className="text-foreground">{POE_WHISPER}</span> in PoE, or{" "}
      <a
        className="link"
        href={GITHUB_ISSUES_URL}
        target="_blank"
        rel="noreferrer"
      >
        open a GitHub issue
      </a>
      .
    </p>
  );
}
