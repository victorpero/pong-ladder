export type TeamDisplayUser = {
  team?: {
    name: string;
  } | null;
};

export function getTeamDisplayName(user: TeamDisplayUser) {
  return user.team?.name ?? "No team";
}
