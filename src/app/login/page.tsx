import { AuthForms } from "@/app/login/AuthForms";
import { LogoMark } from "@/components/LogoMark";

function getSafeNextPath(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;

  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/ladder";
}

export default function LoginPage({ searchParams }: { searchParams: { next?: string | string[] } }) {
  const nextPath = getSafeNextPath(searchParams.next);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="flex min-h-[20rem] flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
          <LogoMark size="large" />
          <div>
            <h1 className="text-5xl font-black leading-none text-ink sm:text-6xl">Pong Ladder</h1>
            <a
              href="https://github.com/victorpero/pong-ladder"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>
        </section>

        <AuthForms nextPath={nextPath} />
      </div>
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.2a6.9 6.9 0 0 0-2.2 13.5c.3.1.5-.1.5-.3v-1.2c-1.8.4-2.2-.8-2.2-.8-.3-.7-.7-.9-.7-.9-.6-.4.1-.4.1-.4.6 0 1 .7 1 .7.6 1 1.5.7 1.8.5.1-.4.2-.7.4-.9-1.5-.2-3-.7-3-3.4 0-.8.3-1.4.7-1.9-.1-.2-.3-1 .1-1.9 0 0 .6-.2 1.9.7.5-.2 1.1-.2 1.7-.2.6 0 1.2.1 1.7.2 1.3-.9 1.9-.7 1.9-.7.4.9.2 1.7.1 1.9.5.5.7 1.1.7 1.9 0 2.7-1.6 3.2-3 3.4.2.2.4.6.4 1.2v1.8c0 .2.2.4.5.3A6.9 6.9 0 0 0 8 1.2Z" />
    </svg>
  );
}
