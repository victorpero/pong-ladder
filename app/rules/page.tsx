export default function RulesPage() {
  return (
    <main className="page-shell">
      <article className="section-band prose prose-stone max-w-none">
        <p className="label">Rules</p>
        <h1 className="mt-1 text-3xl font-black">Pong Ladder rules</h1>

        <section className="mt-8 space-y-4 text-stone-700">
          <h2 className="text-2xl font-black text-ink">Challenge rules</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>A player may only challenge someone who is up to 3 ladder positions above them.</li>
            <li>A player may only decline a challenge once.</li>
            <li>If the same player declines a second challenge, the match is counted as a 3-0 loss for that player.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-stone-700">
          <h2 className="text-2xl font-black text-ink">Match format</h2>
          <p>Matches are played as best of five sets, meaning the first player to win three sets wins the match.</p>
          <p>Valid match results are 3-0, 3-1, and 3-2. The app does not allow invalid best-of-five results.</p>
        </section>

        <section className="mt-8 space-y-4 text-stone-700">
          <h2 className="text-2xl font-black text-ink">Scoring logic</h2>
          <p>Each set is worth one point, so every match is played for a total of five points.</p>
          <p>
            If the winner of a match is the higher-ranked player, meaning the player with the most points before the
            match, they receive 5 points minus the number of sets won by the loser. The loser receives 1 point for each
            set they win. These points are added to each player's current score.
          </p>
          <p>
            If the winner is the lower-ranked player, meaning the player with fewer points before the match, the
            winner's current score is replaced by the opponent's score before the match, plus 5 points minus the number
            of sets won by the loser. The loser keeps their current score and receives 1 point for each set they win.
          </p>
          <div className="rounded-lg border border-line bg-white p-4">
            <ul className="list-disc space-y-2 pl-5">
              <li>A 3-0 match gives 5 points to the winner and 0 points to the loser.</li>
              <li>A 3-1 match gives 4 points to the winner and 1 point to the loser.</li>
              <li>A 3-2 match gives 3 points to the winner and 2 points to the loser.</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="text-lg font-black">Example 1</h3>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              Anders has 41 points, Peter has 28 points. Anders beats Peter 3-2.
            </p>
            <p className="mt-3 text-sm font-semibold text-stone-800">Anders: 41 + (5 - 2) = 44 points</p>
            <p className="text-sm font-semibold text-stone-800">Peter: 28 + 2 = 30 points</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="text-lg font-black">Example 2</h3>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              Kalle has 22 points, Pelle has 32 points. Kalle beats Pelle 3-1.
            </p>
            <p className="mt-3 text-sm font-semibold text-stone-800">Kalle: 32 + (5 - 1) = 36 points</p>
            <p className="text-sm font-semibold text-stone-800">Pelle: 32 + 1 = 33 points</p>
          </div>
        </section>

        <section className="mt-8 space-y-4 text-stone-700">
          <h2 className="text-2xl font-black text-ink">Why play often?</h2>
          <p>It is beneficial to play many matches and to win by a large margin.</p>
        </section>
      </article>
    </main>
  );
}

