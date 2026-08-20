import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * Swedish dictionary. Typed against the English source so a missing or misspelled key is a
 * compile error rather than an English string leaking into a Swedish page.
 */
export const sv: Dictionary = {
  metadata: {
    title: "Pong Ladder",
    description: "En bordtennisapp med stege för säsonger, utmaningar, matcher och rankning.",
    ladderTitle: "Stege",
    matchesTitle: "Matcher",
    challengesTitle: "Utmaningar",
    teamsTitle: "Lag",
    playersTitle: "Spelare",
    rulesTitle: "Regler",
    accountTitle: "Mitt konto",
    adminTitle: "Administration",
    inviteTitle: "Bjud in",
    organizationsTitle: "Organisationer",
    newOrganizationTitle: "Skapa organisation",
    loginTitle: "Logga in",
    verifyEmailTitle: "Verifiera e-post",
    forgotPasswordTitle: "Glömt lösenord",
    resetPasswordTitle: "Återställ lösenord",
    invitationTitle: "Inbjudan till organisation"
  },

  common: {
    back: "Tillbaka",
    cancel: "Avbryt",
    delete: "Radera",
    remove: "Ta bort",
    copy: "Kopiera",
    copied: "Kopierat",
    saving: "Sparar ...",
    updating: "Uppdaterar ...",
    creating: "Skapar ...",
    adding: "Lägger till ...",
    sending: "Skickar ...",
    checking: "Kontrollerar ...",
    loading: "Laddar ...",
    tryAgain: "Försök igen",
    backToOrganizations: "Tillbaka till organisationer",
    points: "Poäng",
    played: "Spelade",
    wins: "Vinster",
    losses: "Förluster",
    rank: "Placering",
    record: "Facit",
    notAvailable: "–"
  },

  language: {
    label: "Språk",
    selectorLabel: "Byt språk",
    currentLabel: "Nuvarande språk: {language}",
    optionLabel: "Visa Pong Ladder på {language}"
  },

  nav: {
    primary: "Huvudnavigering",
    account: "Kontonavigering",
    ladder: "Stege",
    matches: "Matcher",
    challenges: "Utmaningar",
    teams: "Lag",
    players: "Spelare",
    rules: "Regler",
    invite: "Bjud in",
    admin: "Administration",
    myAccount: "Mitt konto",
    logout: "Logga ut",
    switchOrganization: "Byt organisation"
  },

  notifications: {
    heading: "Aviseringar",
    empty: "Inga aviseringar",
    pending: {
      one: "{count} obesvarad utmaning",
      other: "{count} obesvarade utmaningar"
    },
    challengesYou: "utmanar",
    you: "dig"
  },

  ladder: {
    activeSeasonLabel: "Aktiv säsong",
    seasonHeading: "Säsong {season}",
    seasonRange: "{start} till {end}",
    intro: "Utmana spelare ovanför dig, registrera resultat i bäst av fem och klättra på säsongens poängstege.",
    players: "Spelare",
    teams: "Lag",
    daysLeft: "Dagar kvar",
    dayCount: {
      one: "{count} dag",
      other: "{count} dagar"
    },
    label: "Stege",
    standingsHeading: "Aktuell ställning",
    challengePlayer: "Utmana spelare",
    emptyTitle: "Stegen är tom",
    emptyBody: "Lägg till spelare och anslut dem till den aktiva säsongen.",
    rivalBadge: "Rival",
    teamLadderLabel: "Lagstege",
    teamStandingsHeading: "Lagställning säsong {season}",
    manageTeams: "Hantera lag",
    teamEmptyTitle: "Ingen lagställning ännu",
    teamEmptyBody: "Gå med i ett lag för att synas i säsongens lagstege.",
    teamPlayerCount: {
      one: "{count} spelare",
      other: "{count} spelare"
    },
    noSeasonTitle: "Ingen aktiv säsong",
    noSeasonBody: "Den aktuella fasta säsongen kunde inte läsas in."
  },

  activeChallenges: {
    label: "Dina aktiva utmaningar",
    heading: "Matcher att rapportera",
    acceptedOn: "Accepterad {date}",
    staleBadge: "Inte längre öppen",
    enterResult: "Registrera resultat",
    closeResult: "Stäng resultatinmatningen",
    refreshLadder: "Uppdatera stegen",
    viewerWon: "Jag vann",
    opponentWon: "{opponent} vann",
    savingResult: "Sparar resultat..."
  },

  seasonJoin: {
    heading: "Gå med i aktuell säsong",
    joining: "Ansluter till den aktiva säsongen ...",
    help: "Kryssa i för att gå med i den aktiva säsongen och bli tillgänglig för matcher och utmaningar."
  },

  challenges: {
    label: "Utmaningar",
    heading: "Utmaningstavla",
    emptyTitle: "Inga utmaningar ännu",
    emptyBody: "Skapa en utmaning mot en spelare inom 3 placeringar ovanför eller under dig.",
    needsResponse: "Väntar på ditt svar",
    challengesVerb: "utmanar",
    declines: "avböjda: {count}",
    accept: "Acceptera",
    decline: "Avböj",
    createHeading: "Skapa utmaning",
    loginFirst: "Logga in innan du skapar utmaningar.",
    joinSeasonFirst: "Gå med i den aktiva säsongen innan du skapar utmaningar.",
    challengerLabel: "Utmanare",
    challengedLabel: "Utmanad spelare",
    createButton: "Skapa utmaning",
    blockedTargets: "Du har redan en aktiv utmaning med {players}. Avsluta den innan du startar en ny.",
    status: {
      Pending: "Väntar",
      Accepted: "Accepterad",
      Declined: "Avböjd",
      Completed: "Avgjord",
      Forfeit: "Walkover"
    }
  },

  matches: {
    label: "Matcher",
    heading: "Senaste resultaten",
    emptyTitle: "Inga matchresultat",
    emptyBody: "Registrera ett resultat i bäst av fem för att uppdatera poäng och rankning.",
    winnerPoints: "Vinnare: {before} -> {after}",
    loserPoints: "Förlorare: {before} -> {after}",
    registerHeading: "Registrera match",
    noAcceptedChallenges: "Utmana en annan spelare för att kunna registrera en match",
    challengePlayer: "Utmana spelare",
    challengeLabel: "Utmaning",
    versus: "mot",
    acceptedChallenge: "Accepterad utmaning",
    playerRankDetail: "#{rank} · {points} poäng",
    winnerLabel: "Vinnare",
    loserLabel: "Förlorare",
    resultLabel: "Resultat",
    dateLabel: "Datum",
    saveResult: "Spara resultat"
  },

  players: {
    label: "Spelare",
    heading: "Spelarregister",
    emptyTitle: "Inga spelare ännu",
    emptyBody: "Spelare visas här när konton har skapats.",
    notJoined: "Ej ansluten"
  },

  player: {
    label: "Spelare",
    matchHistoryHeading: "Matchhistorik",
    emptyMatchesTitle: "Inga matcher ännu",
    emptyMatchesBody: "Registrera en match för att bygga spelarens historik.",
    headToHeadEmptyBody: "Inbördes möten visas när spelaren har spelat en match.",
    beatSummary: "{winner} slog {loser} {winnerSets}-{loserSets}",
    challengeActionsHeading: "Utmaningar",
    challengeLabel: "Utmana",
    challengeHistoryHeading: "Utmaningshistorik",
    noChallengeHistory: "Ingen utmaningshistorik ännu."
  },

  playerStats: {
    seasonHeading: "Säsong {season}",
    allTimeHeading: "Genom tiderna",
    rivalLabel: "Rival",
    rivalDetail: {
      one: "Mest spelade motståndare · {count} match · {wins}-{losses}",
      other: "Mest spelade motståndare · {count} matcher · {wins}-{losses}"
    },
    headToHeadHeading: "Inbördes möten",
    noOpponentsTitle: "Inga motståndare ännu",
    opponent: "Motståndare",
    played: "Spelade",
    winsShort: "V",
    lossesShort: "F",
    winRate: "Vinstprocent",
    rivalBadge: "Rival"
  },

  teams: {
    label: "Lag",
    heading: "Lagregister",
    emptyTitle: "Inga lag ännu",
    emptyBody: "Skapa det första laget och bjud in spelare till det.",
    memberCount: {
      one: "{count} medlem",
      other: "{count} medlemmar"
    },
    yourTeamBadge: "Ditt lag",
    switchTeam: "Byt lag",
    joinTeam: "Gå med i lag",
    noMembers: "Inga medlemmar ännu",
    yourTeamHeading: "Ditt lag",
    leaveTeam: "Lämna laget",
    noTeam: "Du är inte med i något lag ännu.",
    createHeading: "Skapa lag",
    nameLabel: "Lagnamn",
    createButton: "Skapa och gå med"
  },

  rules: {
    label: "Regler",
    heading: "Regler för Pong Ladder",
    challengeHeading: "Utmaningsregler",
    challengeItems: {
      window: "En spelare får utmana vem som helst inom 3 placeringar på stegen, ovanför eller under sig.",
      tiedPositions:
        "Spelare med lika många poäng delar samma placering på stegen, så de har samma utmaningsalternativ och får även utmana varandra.",
      declineOnce: "En spelare får bara avböja en utmaning en gång.",
      secondDecline:
        "Om samma spelare avböjer en andra utmaning räknas matchen som en förlust med 3-0 för den spelaren."
    },
    formatHeading: "Matchformat",
    formatBestOfFive:
      "Matcher spelas i bäst av fem set, vilket innebär att den som först vinner tre set vinner matchen.",
    formatValidResults: "Giltiga matchresultat är 3-0, 3-1 och 3-2. Appen tillåter inte ogiltiga resultat i bäst av fem.",
    scoringHeading: "Poängberäkning",
    scoringSetValue: "Varje set är värt en poäng, så varje match spelas om totalt fem poäng.",
    scoringHigherRanked:
      "Om vinnaren är den högre rankade spelaren, alltså den med flest poäng före matchen, får spelaren 5 poäng minus antalet set som förloraren vann. Förloraren får 1 poäng för varje vunnet set. Poängen läggs till varje spelares nuvarande poäng.",
    scoringLowerRanked:
      "Om vinnaren är den lägre rankade spelaren, alltså den med färre poäng före matchen, ersätts vinnarens poäng av motståndarens poäng före matchen plus 5 poäng minus antalet set som förloraren vann. Förloraren behåller sina poäng och får 1 poäng för varje vunnet set.",
    scoringExamples: {
      threeZero: "En match som slutar 3-0 ger 5 poäng till vinnaren och 0 poäng till förloraren.",
      threeOne: "En match som slutar 3-1 ger 4 poäng till vinnaren och 1 poäng till förloraren.",
      threeTwo: "En match som slutar 3-2 ger 3 poäng till vinnaren och 2 poäng till förloraren."
    },
    exampleOneHeading: "Exempel 1",
    exampleOneBody: "Anders har 41 poäng, Peter har 28 poäng. Anders slår Peter med 3-2.",
    exampleOneWinner: "Anders: 41 + (5 - 2) = 44 poäng",
    exampleOneLoser: "Peter: 28 + 2 = 30 poäng",
    exampleTwoHeading: "Exempel 2",
    exampleTwoBody: "Kalle har 22 poäng, Pelle har 32 poäng. Kalle slår Pelle med 3-1.",
    exampleTwoWinner: "Kalle: 32 + (5 - 1) = 36 poäng",
    exampleTwoLoser: "Pelle: 32 + 1 = 33 poäng",
    whyPlayHeading: "Varför spela ofta?",
    whyPlayBody: "Det lönar sig att spela många matcher och att vinna med stor marginal."
  },

  account: {
    label: "Mitt konto",
    fullName: "Fullständigt namn: {name}",
    createdAt: "Kontot skapades {date}",
    statisticsLabel: "Statistik",
    headToHeadEmptyBody: "Inbördes möten visas när din första match har registrerats.",
    securityLabel: "Säkerhet",
    changePasswordHeading: "Byt lösenord",
    externalProviderOnly: "Det här kontot loggar in via en länkad identitetsleverantör.",
    identityLabel: "Identitet",
    changeEmailHeading: "Byt e-postadress",
    signInMethodsLabel: "Inloggningssätt",
    linkedAccountsHeading: "Länkade konton",
    recentMatchesLabel: "Senaste matcherna",
    matchHistoryHeading: "Din matchhistorik",
    emptyMatchesTitle: "Inga matcher ännu",
    emptyMatchesBody: "Dina matchresultat visas här när de har registrerats.",
    challengesLabel: "Utmaningar",
    challengeActivityHeading: "Dina utmaningar",
    emptyChallengesTitle: "Inga utmaningar ännu",
    emptyChallengesBody: "Utmaningar som rör ditt konto visas här.",
    win: "Vinst",
    loss: "Förlust",
    versus: "mot",
    matchSummary: "{winner} vann med {winnerSets}-{loserSets}",
    changePasswordForm: {
      currentPassword: "Nuvarande lösenord",
      newPassword: "Nytt lösenord",
      confirmPassword: "Bekräfta nytt lösenord",
      submit: "Uppdatera lösenord"
    },
    changeEmailForm: {
      newEmail: "Ny e-postadress",
      help: "När du byter e-postadress stängs organisationsfunktionerna av tills den nya adressen är verifierad.",
      submit: "Byt e-postadress"
    },
    linkedAccountsPanel: {
      google: "Google",
      linked: "Länkat",
      notLinked: "Inte länkat",
      unlink: "Ta bort länkning",
      link: "Länka Google",
      linkError: "Google kunde inte länkas. Använd samma verifierade e-postadress som det här kontot.",
      unlinkError: "Google kan inte tas bort när det är ditt enda inloggningssätt."
    }
  },

  admin: {
    label: "Administration",
    heading: "Administratörsverktyg",
    seasonLine: "Säsong {season}",
    seasonPlayers: "Spelare i säsongen",
    organizationMembers: "Medlemmar i organisationen",
    matches: "Matcher",
    approvalsLabel: "Godkännanden",
    pendingAccountsHeading: "Väntande konton",
    pendingEmptyTitle: "Inga väntande konton",
    pendingEmptyBody: "Nya medlemskapsförfrågningar visas här för godkännande.",
    requestedAt: "{username} · begärde {date}",
    approve: "Godkänn",
    declinePending: "Avslå",
    declinePendingConfirmation: "Detta avslår det väntande medlemskapet i organisationen.",
    organizationMembershipLabel: "Medlemskap i organisationen",
    addExistingHeading: "Lägg till ett befintligt konto",
    addExistingBody:
      "Lägg till ett verifierat Pong Ladder-konto i den här organisationen. Att ansluta till säsongen är ett separat steg.",
    noAccountsTitle: "Inga konton tillgängliga",
    noAccountsBody: "Alla verifierade konton är redan kopplade till den här organisationen.",
    verifiedAccountLabel: "Verifierat konto",
    addMemberButton: "Lägg till medlem",
    seasonMembershipLabel: "Säsongsdeltagande",
    addSeasonPlayerHeading: "Lägg till spelare i säsongen",
    addSeasonPlayerBody:
      "Lägg till en godkänd spelare i säsong {season}. Spelaren börjar längst ned på stegen med 0 poäng.",
    everyoneJoinedTitle: "Alla har anslutit",
    everyoneJoinedBody: "Alla godkända spelare är redan med i den aktiva säsongen.",
    playerLabel: "Spelare",
    addToSeasonButton: "Lägg till i säsongen",
    removeSeasonPlayersHeading: "Ta bort spelare från säsongen",
    noSeasonPlayersTitle: "Inga spelare i säsongen",
    noSeasonPlayersBody: "Inga spelare har anslutit till den aktiva säsongen.",
    seasonPlayerDetail: "{points} p · {team}",
    removeSeasonPlayerConfirmation:
      "Detta tar bort spelaren från säsongen och raderar spelarens matcher och utmaningar i säsongen.",
    memberAdministrationHeading: "Medlemshantering",
    memberAdministrationBody:
      "Medlemskap är oberoende av deltagande i säsongen. Att stänga av eller ta bort åtkomst avbryter pågående utmaningar men bevarar spelade matcher och historisk ställning.",
    joinedVia: "{email} · anslöt via {method}",
    memberDetail: "{username} · {team} · {challenges}",
    openChallengeCount: {
      one: "{count} pågående utmaning",
      other: "{count} pågående utmaningar"
    },
    cancelOpenChallenges: "Avbryt pågående utmaningar",
    cancelOpenChallengesConfirmation:
      "Detta tar bort alla väntande och accepterade utmaningar som rör den här spelaren.",
    suspend: "Stäng av",
    suspendConfirmation:
      "Detta stänger av åtkomsten till organisationen och avbryter pågående utmaningar. Spelade matcher och säsongshistorik bevaras.",
    removeMember: "Ta bort",
    removeMemberConfirmation:
      "Detta tar bort åtkomsten till organisationen och avbryter pågående utmaningar. Spelade matcher och säsongshistorik bevaras.",
    reactivate: "Återaktivera",
    reactivateConfirmation:
      "Detta återställer aktiv åtkomst till organisationen. Spelaren läggs inte till i den aktuella säsongen.",
    makePlayer: "Gör till spelare",
    makeAdmin: "Gör till administratör",
    revokeAdminConfirmation: "Detta tar bort administratörsbehörigheten i organisationen.",
    grantAdminConfirmation: "Detta ger administratörsbehörighet i organisationen.",
    transferOwnership: "Överlåt ägarskap",
    transferOwnershipConfirmation:
      "Medlemmen blir ägare av organisationen och din roll ändras till administratör.",
    auditLabel: "Logg",
    auditHeading: "Medlemshändelser",
    auditEmptyTitle: "Inga ändringar av medlemskap",
    auditEmptyBody: "Administrativa ändringar av medlemskap visas här.",
    auditActor: "av {actor} · {date}",
    auditSystemActor: "systemet",
    matchesLabel: "Matcher",
    deleteMatchesHeading: "Radera matchresultat",
    noMatchesTitle: "Inga matcher",
    noMatchesBody: "Det finns inga matcher i den aktiva säsongen att ta bort.",
    linkedChallenge: "kopplad utmaning",
    deleteMatchConfirmation: "Detta raderar matchresultatet.",
    challengesLabel: "Utmaningar",
    deleteChallengesHeading: "Radera utmaningar",
    noChallengesTitle: "Inga utmaningar",
    noChallengesBody: "Det finns inga utmaningar i den aktiva säsongen att ta bort.",
    deleteChallengeConfirmation:
      "Detta raderar utmaningen. Om den har en kopplad match raderas även det matchresultatet.",
    membershipStatus: {
      ACTIVE: "Aktiv",
      PENDING: "Väntar",
      SUSPENDED: "Avstängd",
      REJECTED: "Avslagen",
      REMOVED: "Borttagen"
    },
    membershipRole: {
      OWNER: "ägare",
      ADMIN: "administratör",
      PLAYER: "spelare"
    },
    joinMethod: {
      LEGACY: "äldre data",
      ADMIN_CREATED: "administratör",
      OPEN_JOIN: "öppen anslutning",
      ADMIN_REQUEST: "godkänd ansökan",
      INVITATION: "inbjudan",
      EMAIL_DOMAIN: "e-postdomän",
      ACCESS_CODE: "organisationskod"
    },
    auditAction: {
      APPROVED: "godkänd",
      REJECTED: "avslagen",
      SUSPENDED: "avstängd",
      REACTIVATED: "återaktiverad",
      REMOVED: "borttagen",
      MEMBER_ADDED: "medlem tillagd",
      ROLE_CHANGED: "roll ändrad",
      OWNERSHIP_TRANSFERRED: "ägarskap överlåtet"
    },
    settings: {
      label: "Organisationsinställningar",
      generalHeading: "Allmänt",
      nameLabel: "Namn",
      slugLabel: "URL-namn",
      slugHelp:
        "URL-namnet är låst efter att organisationen har skapats, så att sparade länkar och inbjudningar inte slutar fungera.",
      typeLabel: "Typ",
      visibilityLabel: "Synlighet",
      visibilityHelp:
        "Organisationer med kod eller enbart inbjudan förblir dolda även när de är markerade som upptäckbara.",
      defaultLocaleLabel: "Standardspråk",
      defaultLocaleHelp:
        "Nya besökare utan sparat språkval öppnar den här organisationen på standardspråket.",
      saveGeneral: "Spara allmänna inställningar",
      membershipEntryLabel: "Så blir man medlem",
      joinPolicyHeading: "Anslutningspolicy",
      joinPolicyBody: "Välj hur verifierade konton kan bli medlemmar i den här organisationen.",
      policyLabel: "Policy",
      allowedDomainsLabel: "Tillåtna e-postdomäner",
      allowedDomainsHelp:
        "Domäner matchas exakt efter normalisering. Separera flera domäner med kommatecken.",
      savePolicy: "Spara policy"
    }
  },

  organizationTypes: {
    WORKPLACE: "Arbetsplats",
    SPORTS_CLUB: "Idrottsförening",
    SCHOOL: "Skola",
    FRIENDS: "Vänner",
    OTHER: "Annan"
  },

  organizationVisibility: {
    PRIVATE: "Privat",
    DISCOVERABLE: "Upptäckbar"
  },

  joinPolicies: {
    OPEN: "Öppen",
    ADMIN_APPROVAL: "Godkännande av administratör",
    INVITE_ONLY: "Endast inbjudan",
    EMAIL_DOMAIN: "Verifierad e-postdomän",
    ACCESS_CODE: "Organisationskod"
  },

  invite: {
    label: "Bjud in",
    heading: "Bjud in personer till {organization}",
    intro: "Dela organisationskoden, kopiera inbjudningslänken eller låt någon skanna QR-koden.",
    shareHeading: "Dela åtkomst",
    shareBody: "Koden och länken ger ett verifierat konto aktivt medlemskap i organisationen.",
    organizationCodeLabel: "Organisationskod",
    copyCode: "Kopiera kod",
    invitationLinkLabel: "Inbjudningslänk",
    copyLink: "Kopiera länk",
    scanHeading: "Skanna för att gå med",
    qrCodeAlt: "QR-kod för organisationens inbjudningslänk",
    scanHelp: "Öppna kameraappen och skanna koden.",
    noCodeHeading: "Ingen organisationskod är tillgänglig",
    unavailableCodeHeading: "Den nuvarande koden kan inte visas",
    legacyCodeBody:
      "Organisationen har en äldre kod som bara finns som hash. En administratör måste byta ut den en gång innan medlemmar kan dela den.",
    unavailableCodeBody:
      "Den krypterade uppgiften är inte tillgänglig. En administratör måste kontrollera krypteringsinställningarna och byta ut koden.",
    missingCodeBody: "En administratör måste skapa en kod innan medlemmar kan dela den.",
    adminHeading: "Administratörsverktyg",
    adminBody: "Ett byte gör den tidigare koden, inbjudningslänken och QR-koden ogiltiga direkt.",
    rotateCode: "Byt kod",
    generateCode: "Skapa ny kod",
    generating: "Skapar ...",
    manager: {
      expiresLabel: "Upphör efter",
      expires24Hours: "24 timmar",
      expires3Days: "3 dagar",
      expires7Days: "7 dagar",
      expires30Days: "30 dagar",
      maxUsesLabel: "Högsta antal användningar",
      maxUsesPlaceholder: "Obegränsat",
      help:
        "Lämna högsta antal användningar tomt för en obegränsad länk. Ett verifierat konto blir aktiv medlem direkt.",
      submit: "Skapa inbjudan",
      linkLabel: "Inbjudningslänk",
      newLinkLabel: "Ny inbjudningslänk",
      copyLink: "Kopiera inbjudningslänk"
    }
  },

  organizations: {
    label: "Organisationer",
    heading: "Var spelar du?",
    intro:
      "Välj en organisation för att öppna dess stege. Dina matcher, lag, utmaningar och placeringar stannar inom organisationen.",
    createOrganization: "Skapa organisation",
    invitationAcceptedTitle: "Inbjudan accepterad",
    invitationAcceptedBody: "{organization} är nu en av dina organisationer. Öppna dess stege nedan.",
    organizationCreatedTitle: "Organisationen har skapats",
    organizationCreatedBody: "Du är nu ägare av {organization}. Öppna den nedan för att ställa in medlemskap.",
    codeHeading: "Gå med via organisationskod",
    codeBody: "Ange koden du fått av din organisation. Giltiga koder lägger till ditt verifierade konto direkt.",
    yourOrganizations: "Dina organisationer",
    activeBadge: "Aktiv",
    openLadder: "Öppna stegen →",
    noActiveTitle: "Du har inga aktiva organisationer",
    noActiveBody: "Använd en inbjudan, en organisationskod eller ett anslutningsalternativ nedan.",
    pendingHeading: "Väntande åtkomst",
    unavailableHeading: "Otillgänglig åtkomst",
    accessSuspended: "Åtkomsten är avstängd",
    requestRejected: "Ansökan avslogs",
    discoverLabel: "Upptäck",
    availableHeading: "Tillgängliga organisationer",
    pendingMessage: {
      open: "Organisationen är nu öppen – aktivera din åtkomst nedan",
      emailDomain: "Verifiera din e-postdomän igen för att aktivera åtkomsten",
      approval: "Väntar på godkännande från organisationen"
    },
    joinOption: {
      openDescription: "Öppen för alla spelare med verifierad e-postadress.",
      openButton: "Gå med nu",
      approvalDescription: "En administratör granskar nya medlemskapsförfrågningar.",
      approvalButton: "Ansök om åtkomst",
      emailDomainDescription: "Din verifierade e-postadress måste matcha en tillåten domän i organisationen.",
      emailDomainButton: "Verifiera domän",
      unavailableDescription: "Det går för närvarande inte att gå med."
    },
    activateAccess: "Aktivera åtkomst",
    verifyDomain: "Verifiera domän",
    accessCodeForm: {
      label: "Organisationskod",
      placeholder: "XXXX-XXXX-XXXX",
      submit: "Gå med i organisationen"
    },
    joining: "Ansluter ..."
  },

  createOrganization: {
    label: "Ny organisation",
    heading: "Skapa en organisation",
    intro:
      "Den som skapar organisationen blir aktiv ägare. Medlemskap och data hålls åtskilda från alla andra organisationer.",
    disabledTitle: "Det här kontot får inte skapa organisationer",
    disabledBody: "Att skapa organisationer är just nu begränsat av en funktionsflagga eller en lista över tillåtna konton.",
    nameLabel: "Organisationens namn",
    slugLabel: "URL-namn",
    slugPlaceholder: "stockholm-bordtennis",
    slugHelp: "URL-namnet normaliseras och kan inte ändras senare eftersom det ingår i varje adress till organisationen.",
    typeLabel: "Typ av organisation",
    joinPolicyLabel: "Inledande anslutningspolicy",
    allowedDomainsLabel: "Tillåtna e-postdomäner",
    allowedDomainsPlaceholder: "exempel.se, dotterbolag.exempel.se",
    allowedDomainsHelp: "Separera flera domäner med kommatecken.",
    visibilityLabel: "Synlighet",
    visibilityHelp: "Inbjudningar och organisationskoder förblir privata oavsett den här inställningen.",
    defaultLocaleLabel: "Standardspråk",
    defaultLocaleHelp: "Medlemmar utan sparat språkval öppnar organisationen på det här språket.",
    submit: "Skapa organisation"
  },

  login: {
    logInTab: "Logga in",
    createAccountTab: "Skapa konto",
    orUsePassword: "eller använd lösenord",
    googleError:
      "Inloggningen med Google kunde inte slutföras. Om e-postadressen redan har ett konto: logga in med lösenord och länka Google från Mitt konto.",
    identifierLabel: "E-post eller användarnamn",
    passwordLabel: "Lösenord",
    forgotPassword: "Glömt lösenordet?",
    logIn: "Logga in",
    loggingIn: "Kontrollerar ...",
    usernameLabel: "Användarnamn",
    displayNameLabel: "Visningsnamn",
    displayNamePlaceholder: "Victor Olofsson",
    emailLabel: "E-post",
    createAccountHelp:
      "Verifiera din e-postadress och gå sedan med i en organisation med dess kod, en inbjudan eller organisationens anslutningspolicy.",
    createAccount: "Skapa konto",
    creatingAccount: "Skapar ...",
    googleButton: "Fortsätt med Google",
    googleOpening: "Öppnar Google ...",
    googleStartError: "Inloggningen med Google kunde inte startas. Försök igen."
  },

  verifyEmail: {
    label: "Verifierad identitet",
    verifiedHeading: "E-postadressen är verifierad",
    verifiedBody: "Din e-postadress är bekräftad. Du kan fortsätta till Pong Ladder.",
    continue: "Fortsätt",
    checkHeading: "Kolla din e-post",
    checkBody:
      "Öppna verifieringslänken vi skickade innan du går in i en organisation eller använder stegens funktioner.",
    invalidLink: "Verifieringslänken är ogiltig, har gått ut eller har redan använts.",
    deliveryFailed:
      "Ditt konto skapades, men det första e-postmeddelandet kunde inte levereras. Försök skicka det igen nedan.",
    backToMainScreen: "Tillbaka till startsidan",
    logInToResend: "Logga in för att skicka igen",
    currentEmail: "Nuvarande e-postadress: {email}",
    resend: "Skicka verifieringsmejlet igen",
    resending: "Skickar ...",
    differentEmailLabel: "Använd en annan e-postadress",
    changeEmail: "Byt e-postadress och skicka länk"
  },

  forgotPassword: {
    label: "Kontoåtkomst",
    heading: "Har du glömt lösenordet?",
    body:
      "Ange e-postadressen som hör till ditt konto så skickar vi en länk för att välja ett nytt lösenord. Länken fungerar en gång och går ut kort efter att den skickats.",
    emailLabel: "E-post",
    submit: "Skicka återställningslänk",
    backToLogin: "Tillbaka till inloggningen"
  },

  resetPassword: {
    label: "Kontoåtkomst",
    heading: "Välj ett nytt lösenord",
    body:
      "Ange lösenordet du vill logga in med. När du är klar loggas alla enheter som just nu använder ditt konto ut.",
    invalidHeading: "Länken känns inte igen",
    invalidBody:
      "Länken för att återställa lösenordet är ofullständig eller inte längre giltig. Begär en ny och använd det senaste mejlet.",
    requestNewLink: "Begär en ny länk",
    newPasswordLabel: "Nytt lösenord",
    confirmPasswordLabel: "Bekräfta nytt lösenord",
    minLengthHelp: "Använd minst {count} tecken.",
    submit: "Uppdatera lösenord",
    goToLogin: "Gå till inloggningen"
  },

  invitation: {
    label: "Inbjudan till organisation",
    joinHeading: "Gå med i {organization}",
    verifiedNote: "Verifierade konton får aktivt medlemskap",
    expires: "Går ut {date}",
    loginPrompt:
      "Logga in eller skapa ett konto för att acceptera inbjudan. Länken fortsätter att gälla genom inloggningen.",
    continueToLogin: "Fortsätt till inloggningen",
    verifyPrompt: "Verifiera {email} innan du accepterar inbjudan.",
    verifyEmail: "Verifiera e-postadress",
    unavailableTitle: "Inbjudan är inte tillgänglig",
    invalidBody: "Den här inbjudningslänken är ogiltig.",
    stateTitle: {
      expired: "Inbjudan har gått ut",
      revoked: "Inbjudan är återkallad",
      exhausted: "Inbjudan är förbrukad"
    },
    unusableBody: "Den här inbjudan till {organization} kan inte längre användas.",
    finishingHeading: "Slutför din inbjudan",
    handoffProblem: {
      expired: "Inbjudan du öppnade gick ut innan ditt konto var klart. Be om en ny inbjudningslänk.",
      revoked: "Inbjudan du öppnade återkallades innan ditt konto var klart. Be om en ny inbjudningslänk.",
      exhausted:
        "Inbjudan du öppnade nådde sitt maxantal användningar innan ditt konto var klart. Be om en ny inbjudningslänk.",
      pending: "Din ansökan om medlemskap i organisationen väntar fortfarande på granskning.",
      rejected: "Din ansökan om medlemskap i organisationen avslogs.",
      suspended: "Ditt medlemskap i organisationen är avstängt.",
      removed: "Ditt medlemskap i organisationen har tagits bort.",
      invalid: "Inbjudan är inte längre giltig. Be om en ny inbjudningslänk."
    },
    accepting: "Accepterar inbjudan ...",
    preparing: "Förbereder inbjudan ...",
    opening: "Öppnar inbjudan ...",
    automaticActivation: "Ditt medlemskap aktiveras automatiskt.",
    failedTitle: "Inbjudan kunde inte accepteras",
    codeLoginPrompt:
      "Logga in eller skapa ett konto för att gå med i organisationen. Inbjudan fortsätter att gälla genom inloggningen.",
    codeVerifyPrompt: "Verifiera {email} innan du går med i organisationen.",
    codeInvalidHeading: "Inbjudan är inte tillgänglig",
    codeInvalidBody: "Den här inbjudan till organisationen är ogiltig.",
    codeUnavailable: "Den här inbjudan är inte tillgänglig."
  },

  organizationNotFound: {
    label: "Organisationen är inte tillgänglig",
    heading: "Den här organisationen kan inte öppnas",
    body: "Adressen kan vara felaktig, eller så saknar ditt konto aktiv åtkomst."
  },

  notFound: {
    label: "Sidan är inte tillgänglig",
    heading: "Sidan kunde inte hittas",
    body: "Adressen kan vara felaktig eller så har sidan flyttats."
  },

  errorBoundary: {
    label: "Något gick fel.",
    heading: "Bollen tog i nätkanten.",
    body: "Sidan kunde inte slutföras. Försök igen och kontakta en administratör om det fortsätter."
  },

  playerCombobox: {
    placeholder: "Börja skriva ett spelarnamn",
    help: "Välj en spelare bland förslagen."
  },

  actions: {
    rateLimited: "För många försök. Vänta en stund och försök igen.",
    genericError: "Något gick fel. Försök igen.",
    checkForm: "Kontrollera formuläret och försök igen.",
    auth: {
      identifierRequired: "Ange din e-postadress eller ditt användarnamn.",
      passwordLength: "Lösenordet måste vara minst 8 tecken.",
      usernameLength: "Användarnamnet måste vara minst 2 tecken.",
      fullNameRequired: "Ange ditt fullständiga namn.",
      emailInvalid: "Ange en giltig e-postadress.",
      currentPasswordLength: "Nuvarande lösenord måste vara minst 8 tecken.",
      newPasswordLength: "Det nya lösenordet måste vara minst 8 tecken.",
      confirmPasswordLength: "Bekräftelselösenordet måste vara minst 8 tecken.",
      passwordsDoNotMatch: "De nya lösenorden stämmer inte överens.",
      invalidCredentials: "Fel e-postadress, användarnamn eller lösenord.",
      accountExists: "Det finns redan en spelare med det användarnamnet eller den e-postadressen.",
      samePassword: "Det nya lösenordet måste skilja sig från det nuvarande.",
      currentPasswordIncorrect: "Nuvarande lösenord är felaktigt.",
      passwordUpdated: "Lösenordet har uppdaterats."
    },
    verification: {
      emailInvalid: "Ange en giltig e-postadress.",
      emailInUse: "Den e-postadressen används redan.",
      loginAgain: "Logga in igen innan du begär ett verifieringsmejl.",
      sendFailed: "Mejlet kunde inte skickas. Försök igen.",
      alreadyVerified: "Din e-postadress är redan verifierad.",
      linkSent: "En ny verifieringslänk har skickats.",
      differentEmail: "Ange en annan e-postadress.",
      sentTo: "Verifieringsmejl skickat till {email}."
    },
    passwordReset: {
      requestConfirmation:
        "Om adressen hör till ett Pong Ladder-konto är instruktioner för att återställa lösenordet på väg. Kolla inkorgen och skräpposten.",
      resetConfirmation:
        "Ditt lösenord har uppdaterats och alla inloggade enheter har loggats ut. Logga in med det nya lösenordet.",
      invalidLink:
        "Länken för att återställa lösenordet är ogiltig, har gått ut eller har redan använts. Begär en ny länk och försök igen.",
      emailInvalid: "Ange en giltig e-postadress.",
      minLength: "Lösenordet måste vara minst {count} tecken.",
      maxLength: "Lösenordet får vara högst {count} tecken.",
      passwordsDoNotMatch: "Lösenorden stämmer inte överens.",
      updateFailed: "Lösenordet kunde inte uppdateras. Försök igen."
    },
    join: {
      organizationUnavailable: "Den organisationen är inte tillgänglig.",
      alreadyMember: "Du tillhör redan {organization}.",
      ready: "{organization} är redo att öppnas.",
      pending: "Din ansökan om att gå med i {organization} väntar på godkännande.",
      rejected: "Din ansökan om att gå med i {organization} avslogs.",
      suspended: "Din åtkomst till {organization} är avstängd.",
      removed: "Ditt medlemskap i {organization} har tagits bort.",
      invitationRequired: "Det krävs en giltig inbjudan för att gå med i den här organisationen.",
      domainNotAllowed: "Din verifierade e-postdomän ger inte behörighet till den här organisationen.",
      accessCodeRequired: "Ange organisationens kod för att gå med.",
      invalidCode: "Organisationskoden är ogiltig eller inte tillgänglig."
    },
    invitationRedemption: {
      expired: "Den här inbjudan till {organization} har gått ut.",
      revoked: "Den här inbjudan till {organization} har återkallats.",
      exhausted: "Den här inbjudan till {organization} har nått sitt maxantal användningar.",
      verificationRequired: "Verifiera din e-postadress innan du accepterar inbjudan.",
      pending: "Din befintliga ansökan om medlemskap i {organization} väntar fortfarande.",
      rejected: "Din befintliga ansökan om medlemskap i {organization} avslogs.",
      suspended: "Ditt medlemskap i {organization} är avstängt.",
      removed: "Ditt medlemskap i {organization} har tagits bort.",
      authenticationRequired: "Logga in innan du accepterar inbjudan.",
      rateLimited: "För många försök. Vänta en stund och försök igen.",
      invalid: "Inbjudan är ogiltig eller kan inte längre användas."
    },
    organizationCreation: {
      notEnabled: "Det här kontot får inte skapa organisationer.",
      checkDetails: "Kontrollera uppgifterna om organisationen.",
      chooseAnotherSlug: "Välj ett annat URL-namn.",
      domainRequired: "Lägg till minst en tillåten e-postdomän för den här anslutningspolicyn.",
      slugInUse: "Det URL-namnet används redan."
    },
    organizationInvitation: {
      checkSettings: "Kontrollera inställningarna för inbjudan.",
      created: "Inbjudan har skapats. Kopiera länken nu – den visas inte igen.",
      failed: "Inbjudan kunde inte skapas. Försök igen."
    },
    organizationPolicy: {
      domainRequired: "Lägg till minst en giltig e-postdomän, till exempel exempel.se.",
      domainInvalid: "En eller flera e-postdomäner är ogiltiga eller dubblerade.",
      policyUpdated: "Anslutningspolicyn har uppdaterats.",
      detailsInvalid: "Kontrollera organisationens namn, typ och synlighet.",
      settingsUpdated: "Organisationens inställningar har uppdaterats.",
      codeGenerated: "En ny organisationskod har skapats. Den tidigare koden fungerar inte längre.",
      codeDisabled: "Organisationskoden har inaktiverats."
    },
    membershipAdmin: {
      selectAccount: "Välj ett verifierat konto att lägga till.",
      memberAdded: "{username} lades till i {organization}.",
      alreadyMember: "Kontot är redan medlem."
    },
    seasonAdmin: {
      selectPlayer: "Välj en spelare att lägga till i säsongen.",
      playerAdded: "{username} lades till i säsongen.",
      alreadyInSeason: "Spelaren är redan med i den här säsongen."
    },
    languagePreferenceSaved: "Språkvalet har sparats."
  }
};
