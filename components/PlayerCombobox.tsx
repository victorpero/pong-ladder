"use client";

import { useId, useMemo, useState } from "react";

export type PlayerOption = {
  id: string;
  label: string;
  detail?: string;
};

export function PlayerCombobox({
  name,
  label,
  players,
  disabled
}: {
  name: string;
  label: string;
  players: PlayerOption[];
  disabled?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const selected = useMemo(
    () => players.find((player) => player.label.toLowerCase() === query.trim().toLowerCase()),
    [players, query]
  );

  return (
    <label className="grid gap-1">
      <span className="label">{label}</span>
      <input
        className="field"
        list={listId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Start typing a player name"
        autoComplete="off"
        disabled={disabled}
        required
      />
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <datalist id={listId}>
        {players.map((player) => (
          <option key={player.id} value={player.label}>
            {player.detail}
          </option>
        ))}
      </datalist>
      <span className="text-xs text-stone-500">Choose a player from the suggestions.</span>
    </label>
  );
}

