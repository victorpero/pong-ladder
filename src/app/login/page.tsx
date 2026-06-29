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
          <h1 className="text-5xl font-black leading-none text-ink sm:text-6xl">Pong Ladder</h1>
        </section>

        <AuthForms nextPath={nextPath} />
      </div>
    </main>
  );
}
