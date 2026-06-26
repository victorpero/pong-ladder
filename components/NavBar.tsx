import Link from "next/link";

const links = [
  ["Ladder", "/ladder"],
  ["Matches", "/matches"],
  ["Challenges", "/challenges"],
  ["Players", "/players"],
  ["Rules", "/rules"]
];

export function NavBar() {
  return (
    <header className="border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/ladder" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-sm font-black text-white">PL</span>
          <span>
            <span className="block text-lg font-black leading-tight">Pong Ladder</span>
            <span className="block text-xs font-medium text-stone-500">Season rankings and challenge play</span>
          </span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-court-500 hover:text-court-700"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

