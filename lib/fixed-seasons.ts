import type { Prisma, Season } from "@prisma/client";

const MONTHS_PER_SEASON = 3;

export function getSeasonNumber(date = new Date()) {
  return Math.floor(date.getMonth() / MONTHS_PER_SEASON) + 1;
}

export function getSeasonWindow(date = new Date()) {
  const year = date.getFullYear();
  const seasonNumber = getSeasonNumber(date);

  return getSeasonWindowForNumber(year, seasonNumber);
}

export function getSeasonWindowForNumber(year: number, seasonNumber: number) {
  const startMonth = (seasonNumber - 1) * MONTHS_PER_SEASON;
  return {
    year,
    seasonNumber,
    startsAt: new Date(Date.UTC(year, startMonth, 1)),
    endsAt: new Date(Date.UTC(year, startMonth + MONTHS_PER_SEASON, 1))
  };
}

export function getSeasonName(year: number, seasonNumber: number) {
  return `${year} Season ${seasonNumber}`;
}

export async function ensureCurrentSeason(tx: Prisma.TransactionClient, date = new Date()) {
  const window = getSeasonWindow(date);
  let currentSeason: Season | null = null;

  for (const seasonNumber of [1, 2, 3, 4]) {
    const fixedWindow = getSeasonWindowForNumber(window.year, seasonNumber);
    const name = getSeasonName(fixedWindow.year, fixedWindow.seasonNumber);
    const existing = await tx.season.findFirst({
      where: {
        year: fixedWindow.year,
        seasonNumber: fixedWindow.seasonNumber
      },
      orderBy: { startsAt: "desc" }
    });

    const season = existing
      ? await tx.season.update({
          where: { id: existing.id },
          data: {
            name,
            startsAt: fixedWindow.startsAt,
            endsAt: fixedWindow.endsAt,
            isActive: seasonNumber === window.seasonNumber
          }
        })
      : await tx.season.create({
          data: {
            ...fixedWindow,
            name,
            isActive: seasonNumber === window.seasonNumber
          }
        });

    if (seasonNumber === window.seasonNumber) {
      currentSeason = season;
    }
  }

  if (!currentSeason) {
    throw new Error("Current season could not be created.");
  }

  await tx.season.updateMany({
    where: {
      isActive: true,
      NOT: { id: currentSeason.id }
    },
    data: { isActive: false }
  });

  return currentSeason;
}
