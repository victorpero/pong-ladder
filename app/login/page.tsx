import { AuthForms } from "@/app/login/AuthForms";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_28rem),linear-gradient(140deg,#f7fbf9_0%,#e8f4ef_52%,#f8faf7_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="max-w-2xl">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-ink text-base font-black text-white">PL</div>
          <p className="label mt-8">Pong Ladder</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-ink sm:text-5xl">
            Sign in before entering the ladder.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
            Player accounts are protected with hashed passwords and signed HTTP-only session cookies. The screen is built
            as an isolated auth surface so the visual style can grow into a richer mobile app experience later.
          </p>
        </section>

        <AuthForms nextPath={nextPath} />
      </div>
    </main>
  );
}
