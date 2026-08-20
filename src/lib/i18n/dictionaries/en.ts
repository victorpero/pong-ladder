/**
 * The English dictionary is the source of the `Dictionary` shape. Every other locale is typed
 * against it, so a missing or renamed key fails the type check and the build.
 *
 * Product and organization names are never stored here: they are interpolated unchanged.
 */
export const en = {
  metadata: {
    title: "Pong Ladder",
    description: "A table tennis ladder tournament app for seasons, challenges, matches, and rankings.",
    ladderTitle: "Ladder",
    matchesTitle: "Matches",
    challengesTitle: "Challenges",
    teamsTitle: "Teams",
    playersTitle: "Players",
    rulesTitle: "Rules",
    accountTitle: "My account",
    adminTitle: "Administration",
    inviteTitle: "Invite",
    organizationsTitle: "Organizations",
    newOrganizationTitle: "Create organization",
    loginTitle: "Log in",
    verifyEmailTitle: "Verify email",
    forgotPasswordTitle: "Forgot password",
    resetPasswordTitle: "Reset password",
    invitationTitle: "Organization invitation",
    changelogTitle: "What's new"
  },

  common: {
    back: "Back",
    cancel: "Cancel",
    delete: "Delete",
    remove: "Remove",
    copy: "Copy",
    copied: "Copied",
    saving: "Saving...",
    updating: "Updating...",
    creating: "Creating...",
    adding: "Adding...",
    sending: "Sending...",
    checking: "Checking...",
    loading: "Loading...",
    tryAgain: "Try again",
    backToOrganizations: "Back to organizations",
    points: "Points",
    played: "Played",
    wins: "Wins",
    losses: "Losses",
    rank: "Rank",
    record: "Record",
    notAvailable: "N/A"
  },

  language: {
    label: "Language",
    selectorLabel: "Change language",
    currentLabel: "Current language: {language}",
    optionLabel: "Show Pong Ladder in {language}"
  },

  changelog: {
    label: "What's new",
    intro: "Everything that changed in Pong Ladder, newest first.",
    released: "Released {date}",
    backToOrganizations: "Back to organizations",
    backToLadder: "Back to the ladder",
    groups: {
      new: "New",
      improved: "Improved",
      fixed: "Fixed"
    }
  },
  footer: {
    whatsNew: "What's new",
    newBadge: "New",
    developmentBuild: "dev"
  },
  nav: {
    primary: "Primary navigation",
    account: "Account navigation",
    ladder: "Ladder",
    matches: "Matches",
    challenges: "Challenges",
    teams: "Teams",
    rules: "Rules",
    invite: "Invite",
    admin: "Admin",
    myAccount: "My account",
    logout: "Log out",
    switchOrganization: "Switch organization"
  },

  notifications: {
    heading: "Notifications",
    empty: "No notifications",
    pending: {
      one: "{count} pending challenge",
      other: "{count} pending challenges"
    },
    challengesYou: "challenges",
    you: "you"
  },

  ladder: {
    activeSeasonLabel: "Active season",
    seasonHeading: "Season {season}",
    seasonRange: "{start} to {end}",
    intro: "Challenge players above you, register best-of-five results, and climb the season points ladder.",
    players: "Players",
    teams: "Teams",
    daysLeft: "Days left",
    dayCount: {
      one: "{count} day",
      other: "{count} days"
    },
    label: "Ladder",
    standingsHeading: "Current standings",
    challengePlayer: "Challenge player",
    playerDirectory: "Player directory",
    emptyTitle: "The ladder is empty",
    emptyBody: "Add players and join them to the active season.",
    rivalBadge: "Rival",
    teamLadderLabel: "Team ladder",
    teamStandingsHeading: "Season {season} team standings",
    manageTeams: "Manage teams",
    teamEmptyTitle: "No team standings yet",
    teamEmptyBody: "Join a team to appear on the season team ladder.",
    teamPlayerCount: {
      one: "{count} player",
      other: "{count} players"
    },
    noSeasonTitle: "No active season",
    noSeasonBody: "The current fixed season could not be loaded.",
    challengeControl: {
      challenge: "Challenge",
      challenging: "Sending...",
      challengeAria: "Challenge {player}",
      pending: "Pending",
      pendingWaiting: " — waiting for {player} to respond",
      accept: "Accept",
      accepting: "Accepting...",
      acceptAria: "Accept the challenge from {player}",
      active: "Active",
      activeAria: "Register the match against {player}"
    }
  },

  activeChallenges: {
    label: "Your active challenges",
    heading: "Matches to report",
    acceptedOn: "Accepted {date}",
    staleBadge: "No longer open",
    enterResult: "Enter result",
    closeResult: "Close result entry",
    refreshLadder: "Refresh ladder",
    viewerWon: "I won",
    opponentWon: "{opponent} won",
    savingResult: "Saving result..."
  },

  seasonJoin: {
    heading: "Join current season",
    joining: "Joining the active season...",
    help: "Check this to join the active season and become available for matches and challenges."
  },

  challenges: {
    label: "Challenges",
    heading: "Challenge board",
    emptyTitle: "No challenges yet",
    emptyBody: "Create a challenge against a player within 3 positions above or below you.",
    needsResponse: "Needs your response",
    challengesVerb: "challenges",
    declines: "declines: {count}",
    accept: "Accept",
    decline: "Decline",
    createHeading: "Create challenge",
    loginFirst: "Log in before creating challenges.",
    joinSeasonFirst: "Join the active season before creating challenges.",
    challengerLabel: "Challenger",
    challengedLabel: "Challenged player",
    createButton: "Create challenge",
    blockedTargets: "You already have an active challenge with {players}. Finish it before starting another.",
    status: {
      Pending: "Pending",
      Accepted: "Accepted",
      Declined: "Declined",
      Completed: "Completed",
      Forfeit: "Forfeit"
    }
  },

  matches: {
    label: "Matches",
    heading: "Recent results",
    emptyTitle: "No match results",
    emptyBody: "Register a best-of-five result to update points and rankings.",
    winnerPoints: "Winner: {before} -> {after}",
    loserPoints: "Loser: {before} -> {after}",
    registerHeading: "Register match",
    noAcceptedChallenges: "Challenge another player to register a match",
    challengePlayer: "Challenge player",
    challengeLabel: "Challenge",
    versus: "vs",
    acceptedChallenge: "Accepted challenge",
    playerRankDetail: "#{rank} · {points} points",
    winnerLabel: "Winner",
    loserLabel: "Loser",
    resultLabel: "Result",
    dateLabel: "Date",
    saveResult: "Save result"
  },

  players: {
    label: "Players",
    heading: "Player directory",
    emptyTitle: "No players yet",
    emptyBody: "Players will appear here after accounts are created.",
    notJoined: "Not joined"
  },

  player: {
    label: "Player",
    matchHistoryHeading: "Match history",
    emptyMatchesTitle: "No matches yet",
    emptyMatchesBody: "Register a match to build this player's history.",
    headToHeadEmptyBody: "Head-to-head records appear once this player has played a match.",
    beatSummary: "{winner} beat {loser} {winnerSets}-{loserSets}",
    challengeActionsHeading: "Challenge actions",
    challengeLabel: "Challenge",
    challengeHistoryHeading: "Challenge history",
    noChallengeHistory: "No challenge history yet."
  },

  playerStats: {
    seasonHeading: "Season {season}",
    allTimeHeading: "All time",
    rivalLabel: "Rival",
    rivalDetail: {
      one: "Most played opponent · {count} match · {wins}-{losses}",
      other: "Most played opponent · {count} matches · {wins}-{losses}"
    },
    headToHeadHeading: "Head to head",
    noOpponentsTitle: "No opponents yet",
    opponent: "Opponent",
    played: "Played",
    winsShort: "W",
    lossesShort: "L",
    winRate: "Win rate",
    rivalBadge: "Rival"
  },

  teams: {
    label: "Teams",
    heading: "Team directory",
    emptyTitle: "No teams yet",
    emptyBody: "Create the first team and invite players to join it.",
    memberCount: {
      one: "{count} member",
      other: "{count} members"
    },
    yourTeamBadge: "Your team",
    switchTeam: "Switch team",
    joinTeam: "Join team",
    noMembers: "No members yet",
    yourTeamHeading: "Your team",
    leaveTeam: "Leave team",
    noTeam: "You are not on a team yet.",
    createHeading: "Create team",
    nameLabel: "Team name",
    createButton: "Create and join"
  },

  rules: {
    label: "Rules",
    heading: "Pong Ladder rules",
    challengeHeading: "Challenge rules",
    challengeItems: {
      window: "A player may challenge anyone within 3 ladder positions, whether above or below them.",
      tiedPositions:
        "Players on the same number of points share one ladder position, so they all have the same challenge options and may also challenge each other.",
      declineOnce: "A player may only decline a challenge once.",
      secondDecline: "If the same player declines a second challenge, the match is counted as a 3-0 loss for that player."
    },
    formatHeading: "Match format",
    formatBestOfFive: "Matches are played as best of five sets, meaning the first player to win three sets wins the match.",
    formatValidResults: "Valid match results are 3-0, 3-1, and 3-2. The app does not allow invalid best-of-five results.",
    scoringHeading: "Scoring logic",
    scoringSetValue: "Each set is worth one point, so every match is played for a total of five points.",
    scoringHigherRanked:
      "If the winner of a match is the higher-ranked player, meaning the player with the most points before the match, they receive 5 points minus the number of sets won by the loser. The loser receives 1 point for each set they win. These points are added to each player's current score.",
    scoringLowerRanked:
      "If the winner is the lower-ranked player, meaning the player with fewer points before the match, the winner's current score is replaced by the opponent's score before the match, plus 5 points minus the number of sets won by the loser. The loser keeps their current score and receives 1 point for each set they win.",
    scoringExamples: {
      threeZero: "A 3-0 match gives 5 points to the winner and 0 points to the loser.",
      threeOne: "A 3-1 match gives 4 points to the winner and 1 point to the loser.",
      threeTwo: "A 3-2 match gives 3 points to the winner and 2 points to the loser."
    },
    exampleOneHeading: "Example 1",
    exampleOneBody: "Anders has 41 points, Peter has 28 points. Anders beats Peter 3-2.",
    exampleOneWinner: "Anders: 41 + (5 - 2) = 44 points",
    exampleOneLoser: "Peter: 28 + 2 = 30 points",
    exampleTwoHeading: "Example 2",
    exampleTwoBody: "Kalle has 22 points, Pelle has 32 points. Kalle beats Pelle 3-1.",
    exampleTwoWinner: "Kalle: 32 + (5 - 1) = 36 points",
    exampleTwoLoser: "Pelle: 32 + 1 = 33 points",
    whyPlayHeading: "Why play often?",
    whyPlayBody: "It is beneficial to play many matches and to win by a large margin."
  },

  account: {
    label: "My account",
    fullName: "Full name: {name}",
    createdAt: "Account created {date}",
    statisticsLabel: "Statistics",
    headToHeadEmptyBody: "Head-to-head records appear once your first match is registered.",
    securityLabel: "Security",
    changePasswordHeading: "Change password",
    externalProviderOnly: "This account signs in through a linked identity provider.",
    identityLabel: "Identity",
    changeEmailHeading: "Change email",
    signInMethodsLabel: "Sign-in methods",
    linkedAccountsHeading: "Linked accounts",
    recentMatchesLabel: "Recent matches",
    matchHistoryHeading: "Your match history",
    emptyMatchesTitle: "No matches yet",
    emptyMatchesBody: "Your match results will appear here once they are registered.",
    challengesLabel: "Challenges",
    challengeActivityHeading: "Your challenge activity",
    emptyChallengesTitle: "No challenges yet",
    emptyChallengesBody: "Challenges involving your account will show up here.",
    win: "Win",
    loss: "Loss",
    versus: "vs",
    matchSummary: "{winner} won {winnerSets}-{loserSets}",
    changePasswordForm: {
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      submit: "Update password"
    },
    changeEmailForm: {
      newEmail: "New email",
      help: "Changing your email signs you out of organization features until the new address is verified.",
      submit: "Change email"
    },
    linkedAccountsPanel: {
      google: "Google",
      linked: "Linked",
      notLinked: "Not linked",
      unlink: "Unlink",
      link: "Link Google",
      linkError: "Google could not be linked. Use the same verified email as this account.",
      unlinkError: "Google cannot be removed when it is your only sign-in method."
    }
  },

  admin: {
    label: "Admin",
    heading: "Root controls",
    seasonLine: "Season {season}",
    seasonPlayers: "Season players",
    organizationMembers: "Organization members",
    matches: "Matches",
    approvalsLabel: "Approvals",
    pendingAccountsHeading: "Pending accounts",
    pendingEmptyTitle: "No pending accounts",
    pendingEmptyBody: "New account requests will appear here for approval.",
    requestedAt: "{username} · requested {date}",
    approve: "Approve",
    declinePending: "Decline",
    declinePendingConfirmation: "This will reject the pending organization membership.",
    organizationMembershipLabel: "Organization membership",
    addExistingHeading: "Add an existing account",
    addExistingBody:
      "Add a verified Pong Ladder account to this organization. Season membership remains a separate step.",
    noAccountsTitle: "No accounts available",
    noAccountsBody: "Every verified account is already linked to this organization.",
    verifiedAccountLabel: "Verified account",
    addMemberButton: "Add organization member",
    seasonMembershipLabel: "Season membership",
    addSeasonPlayerHeading: "Add player to season",
    addSeasonPlayerBody: "Add an approved player to season {season}. They start at the bottom of the ladder with 0 points.",
    everyoneJoinedTitle: "Everyone has joined",
    everyoneJoinedBody: "Every approved player is already in the active season.",
    playerLabel: "Player",
    addToSeasonButton: "Add to season",
    removeSeasonPlayersHeading: "Remove players from season",
    noSeasonPlayersTitle: "No season players",
    noSeasonPlayersBody: "No players have joined the active season.",
    seasonPlayerDetail: "{points} pts · {team}",
    removeSeasonPlayerConfirmation:
      "This will remove the player from this season and delete their season matches and challenges.",
    memberAdministrationHeading: "Member administration",
    memberAdministrationBody:
      "Membership access is independent of season participation. Suspending or removing access cancels open challenges but preserves completed matches and historical standings.",
    joinedVia: "{email} · joined via {method}",
    memberDetail: "{username} · {team} · {challenges}",
    openChallengeCount: {
      one: "{count} open challenge",
      other: "{count} open challenges"
    },
    cancelOpenChallenges: "Cancel open challenges",
    cancelOpenChallengesConfirmation: "This will remove all pending or accepted challenges involving this player.",
    suspend: "Suspend",
    suspendConfirmation:
      "This suspends organization access and cancels open challenges. Completed matches and season history are preserved.",
    removeMember: "Remove",
    removeMemberConfirmation:
      "This removes organization access and cancels open challenges. Completed matches and season history are preserved.",
    reactivate: "Reactivate",
    reactivateConfirmation:
      "This restores active organization access. It does not add the player to the current season.",
    makePlayer: "Make player",
    makeAdmin: "Make admin",
    revokeAdminConfirmation: "This revokes organization administrator access.",
    grantAdminConfirmation: "This grants organization administrator access.",
    transferOwnership: "Transfer ownership",
    transferOwnershipConfirmation:
      "This member becomes the organization owner and your role changes to administrator.",
    auditLabel: "Audit",
    auditHeading: "Membership activity",
    auditEmptyTitle: "No membership changes",
    auditEmptyBody: "Administrative membership changes will appear here.",
    auditActor: "by {actor} · {date}",
    auditSystemActor: "system",
    matchesLabel: "Matches",
    deleteMatchesHeading: "Delete match results",
    noMatchesTitle: "No matches",
    noMatchesBody: "There are no active-season matches to remove.",
    linkedChallenge: "linked challenge",
    deleteMatchConfirmation: "This will delete this match result.",
    challengesLabel: "Challenges",
    deleteChallengesHeading: "Delete challenges",
    noChallengesTitle: "No challenges",
    noChallengesBody: "There are no active-season challenges to remove.",
    deleteChallengeConfirmation:
      "This will delete this challenge. If it has a linked match, that match result will also be deleted.",
    membershipStatus: {
      ACTIVE: "Active",
      PENDING: "Pending",
      SUSPENDED: "Suspended",
      REJECTED: "Rejected",
      REMOVED: "Removed"
    },
    membershipRole: {
      OWNER: "owner",
      ADMIN: "admin",
      PLAYER: "player"
    },
    joinMethod: {
      LEGACY: "legacy data",
      ADMIN_CREATED: "administrator",
      OPEN_JOIN: "open join",
      ADMIN_REQUEST: "approval request",
      INVITATION: "invitation",
      EMAIL_DOMAIN: "email domain",
      ACCESS_CODE: "organization code"
    },
    auditAction: {
      APPROVED: "approved",
      REJECTED: "rejected",
      SUSPENDED: "suspended",
      REACTIVATED: "reactivated",
      REMOVED: "removed",
      MEMBER_ADDED: "member added",
      ROLE_CHANGED: "role changed",
      OWNERSHIP_TRANSFERRED: "ownership transferred"
    },
    settings: {
      label: "Organization settings",
      generalHeading: "General",
      nameLabel: "Name",
      slugLabel: "URL slug",
      slugHelp: "URL slugs are fixed after creation so saved links and invitations cannot silently break.",
      typeLabel: "Type",
      visibilityLabel: "Visibility",
      visibilityHelp: "Code and invitation-only organizations remain hidden even when discoverability is selected.",
      defaultLocaleLabel: "Default language",
      defaultLocaleHelp:
        "New visitors without a saved language preference open this organization in its default language.",
      saveGeneral: "Save general settings",
      membershipEntryLabel: "Membership entry",
      joinPolicyHeading: "Join policy",
      joinPolicyBody: "Choose how verified accounts may become members of this organization.",
      policyLabel: "Policy",
      allowedDomainsLabel: "Allowed email domains",
      allowedDomainsHelp: "Domains are matched exactly after normalization. Separate multiple domains with commas.",
      savePolicy: "Save policy"
    }
  },

  organizationTypes: {
    WORKPLACE: "Workplace",
    SPORTS_CLUB: "Sports club",
    SCHOOL: "School",
    FRIENDS: "Friends",
    OTHER: "Other"
  },

  organizationVisibility: {
    PRIVATE: "Private",
    DISCOVERABLE: "Discoverable"
  },

  joinPolicies: {
    OPEN: "Open",
    ADMIN_APPROVAL: "Administrator approval",
    INVITE_ONLY: "Invitation only",
    EMAIL_DOMAIN: "Verified email domain",
    ACCESS_CODE: "Organization code"
  },

  invite: {
    label: "Invite",
    heading: "Invite people to {organization}",
    intro: "Share the organization code, copy the invitation link, or let someone scan the QR code.",
    shareHeading: "Share access",
    shareBody: "The code and link grant active organization membership to a verified account.",
    organizationCodeLabel: "Organization code",
    copyCode: "Copy code",
    invitationLinkLabel: "Invitation link",
    copyLink: "Copy link",
    scanHeading: "Scan to join",
    qrCodeAlt: "QR code for the organization invitation link",
    scanHelp: "Open the camera app and scan this code.",
    noCodeHeading: "No organization code is available",
    unavailableCodeHeading: "The current code cannot be displayed",
    legacyCodeBody:
      "This organization has an older hash-only code. An administrator must rotate it once before members can share it.",
    unavailableCodeBody:
      "The encrypted credential is unavailable. An administrator must verify the encryption configuration and rotate the code.",
    missingCodeBody: "An administrator must generate a code before members can share it.",
    adminHeading: "Administrator controls",
    adminBody: "Rotation immediately invalidates the previous code, invitation link, and QR code.",
    rotateCode: "Rotate code",
    generateCode: "Generate new code",
    generating: "Generating...",
    manager: {
      expiresLabel: "Expires after",
      expires24Hours: "24 hours",
      expires3Days: "3 days",
      expires7Days: "7 days",
      expires30Days: "30 days",
      maxUsesLabel: "Maximum uses",
      maxUsesPlaceholder: "Unlimited",
      help: "Leave maximum uses empty for an unlimited link. A verified account becomes an active member immediately.",
      submit: "Create invitation",
      linkLabel: "Invitation link",
      newLinkLabel: "New invitation link",
      copyLink: "Copy invitation link"
    }
  },

  organizations: {
    label: "Organizations",
    heading: "Where are you playing?",
    intro:
      "Choose an organization to open its ladder. Your matches, teams, challenges, and rankings stay inside that organization.",
    createOrganization: "Create organization",
    invitationAcceptedTitle: "Invitation accepted",
    invitationAcceptedBody: "{organization} is now one of your organizations. Open its ladder below.",
    organizationCreatedTitle: "Organization created",
    organizationCreatedBody: "You are now the owner of {organization}. Open it below to configure membership.",
    codeHeading: "Join with an organization code",
    codeBody: "Enter the code shared by your organization. Valid codes add your verified account immediately.",
    yourOrganizations: "Your organizations",
    activeBadge: "Active",
    openLadder: "Open ladder →",
    noActiveTitle: "You have no active organizations",
    noActiveBody: "Use an invitation, organization code, or join option below.",
    pendingHeading: "Pending access",
    unavailableHeading: "Unavailable access",
    accessSuspended: "Access suspended",
    requestRejected: "Join request rejected",
    discoverLabel: "Discover",
    availableHeading: "Available organizations",
    pendingMessage: {
      open: "This organization is now open; activate your access below",
      emailDomain: "Verify your email domain again to activate access",
      approval: "Waiting for organization approval"
    },
    joinOption: {
      openDescription: "Open to any player with a verified email.",
      openButton: "Join now",
      approvalDescription: "An administrator reviews new membership requests.",
      approvalButton: "Request access",
      emailDomainDescription: "Your verified email must match an allowed organization domain.",
      emailDomainButton: "Verify domain",
      unavailableDescription: "Joining is not currently available."
    },
    activateAccess: "Activate access",
    verifyDomain: "Verify domain",
    accessCodeForm: {
      label: "Organization code",
      placeholder: "XXXX-XXXX-XXXX",
      submit: "Join organization"
    },
    joining: "Joining..."
  },

  createOrganization: {
    label: "New tenant",
    heading: "Create an organization",
    intro:
      "The creator becomes the active owner. Organization membership and data remain isolated from every other tenant.",
    disabledTitle: "Creation is not enabled for this account",
    disabledBody: "Organization creation is currently limited by feature flag or creator allowlist.",
    nameLabel: "Organization name",
    slugLabel: "URL slug",
    slugPlaceholder: "stockholm-table-tennis",
    slugHelp: "The slug is normalized and cannot be changed later because it is part of every organization URL.",
    typeLabel: "Organization type",
    joinPolicyLabel: "Initial join policy",
    allowedDomainsLabel: "Allowed email domains",
    allowedDomainsPlaceholder: "example.com, subsidiary.example.com",
    allowedDomainsHelp: "Separate multiple domains with commas.",
    visibilityLabel: "Visibility",
    visibilityHelp: "Invitation-only and organization-code entry remain private regardless of this setting.",
    defaultLocaleLabel: "Default language",
    defaultLocaleHelp: "Members without a saved language preference open this organization in this language.",
    submit: "Create organization"
  },

  login: {
    logInTab: "Log in",
    createAccountTab: "Create account",
    orUsePassword: "or use a password",
    googleError:
      "Google sign-in could not be completed. If this email already has an account, log in with your password and link Google from Account.",
    identifierLabel: "Email or username",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    logIn: "Log in",
    loggingIn: "Checking...",
    usernameLabel: "Username",
    displayNameLabel: "Display name",
    displayNamePlaceholder: "Victor Olofsson",
    emailLabel: "Email",
    createAccountHelp:
      "Verify your email, then join an organization using its code, invitation, or configured join policy.",
    createAccount: "Create account",
    creatingAccount: "Creating...",
    googleButton: "Continue with Google",
    googleOpening: "Opening Google...",
    googleStartError: "Google sign-in could not be started. Please try again."
  },

  verifyEmail: {
    label: "Verified identity",
    verifiedHeading: "Email verified",
    verifiedBody: "Your email address is confirmed. You can continue to Pong Ladder.",
    continue: "Continue",
    checkHeading: "Check your email",
    checkBody: "Open the verification link we sent before entering an organization or using ladder features.",
    invalidLink: "That verification link is invalid, expired, or has already been used.",
    deliveryFailed: "Your account was created, but the first email could not be delivered. Try resending it below.",
    backToMainScreen: "Back to main screen",
    logInToResend: "Log in to resend",
    currentEmail: "Current email: {email}",
    resend: "Resend verification email",
    resending: "Sending...",
    differentEmailLabel: "Use a different email",
    changeEmail: "Change email and send link"
  },

  forgotPassword: {
    label: "Account access",
    heading: "Forgot your password?",
    body:
      "Enter the email address on your account and we will send a link for choosing a new password. The link works once and expires shortly after it is sent.",
    emailLabel: "Email",
    submit: "Send reset link",
    backToLogin: "Back to log in"
  },

  resetPassword: {
    label: "Account access",
    heading: "Choose a new password",
    body:
      "Set the password you will use to log in. Finishing here signs out every device that is currently using your account.",
    invalidHeading: "Reset link not recognized",
    invalidBody:
      "This password reset link is incomplete or no longer valid. Request a new one and use the most recent email.",
    requestNewLink: "Request a new link",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    minLengthHelp: "Use at least {count} characters.",
    submit: "Update password",
    goToLogin: "Go to log in"
  },

  invitation: {
    label: "Organization invitation",
    joinHeading: "Join {organization}",
    verifiedNote: "Verified accounts receive active membership",
    expires: "Expires {date}",
    loginPrompt: "Log in or create an account to accept this invitation. The link remains active through authentication.",
    continueToLogin: "Continue to login",
    verifyPrompt: "Verify {email} before accepting this invitation.",
    verifyEmail: "Verify email",
    unavailableTitle: "Invitation unavailable",
    invalidBody: "This invitation link is invalid.",
    stateTitle: {
      expired: "Invitation expired",
      revoked: "Invitation revoked",
      exhausted: "Invitation exhausted"
    },
    unusableBody: "This invitation to {organization} can no longer be used.",
    finishingHeading: "Finishing your invitation",
    handoffProblem: {
      expired: "The invitation you opened expired before your account was ready. Ask for a new invitation link.",
      revoked: "The invitation you opened was revoked before your account was ready. Ask for a new invitation link.",
      exhausted:
        "The invitation you opened reached its use limit before your account was ready. Ask for a new invitation link.",
      pending: "Your membership request for that organization is still waiting for review.",
      rejected: "Your membership request for that organization was rejected.",
      suspended: "Your membership in that organization is suspended.",
      removed: "Your membership in that organization was removed.",
      invalid: "That invitation is no longer valid. Ask for a new invitation link."
    },
    accepting: "Accepting invitation...",
    preparing: "Preparing invitation...",
    opening: "Opening invitation...",
    automaticActivation: "Your membership will be activated automatically.",
    failedTitle: "Invitation could not be accepted",
    codeLoginPrompt:
      "Log in or create an account to join this organization. The invitation remains active through authentication.",
    codeVerifyPrompt: "Verify {email} before joining this organization.",
    codeInvalidHeading: "Invitation unavailable",
    codeInvalidBody: "This organization invitation is invalid.",
    codeUnavailable: "This invitation is unavailable."
  },

  organizationNotFound: {
    label: "Organization unavailable",
    heading: "This organization cannot be opened",
    body: "The address may be incorrect, or your account may not have active access."
  },

  notFound: {
    label: "Page unavailable",
    heading: "This page could not be found",
    body: "The address may be incorrect or the page may have been moved."
  },

  errorBoundary: {
    label: "Something went wrong.",
    heading: "The rally clipped the net.",
    body: "The page could not be completed. Try again, and contact an administrator if it keeps happening."
  },

  playerCombobox: {
    placeholder: "Start typing a player name",
    help: "Choose a player from the suggestions."
  },

  actions: {
    rateLimited: "Too many attempts. Please wait a bit and try again.",
    genericError: "Something went wrong. Please try again.",
    checkForm: "Check the form and try again.",
    challenge: {
      window: "A player may only challenge someone within 3 ladder positions, above or below them. Players level on points share the same position.",
      duplicate: "You already have an active challenge with this player. Finish it before starting another.",
      self: "Players cannot challenge themselves.",
      seasonMissing: "That season does not exist.",
      notInSeason: "Both players must be joined to the season.",
      stale: "That challenge is no longer waiting for you. Reload the ladder for the current state.",
      failed: "That challenge could not be created. Reload the ladder and try again."
    },
    auth: {
      identifierRequired: "Enter your email or username.",
      passwordLength: "Password must be at least 8 characters.",
      usernameLength: "Username must be at least 2 characters.",
      fullNameRequired: "Enter your full name.",
      emailInvalid: "Enter a valid email address.",
      currentPasswordLength: "Current password must be at least 8 characters.",
      newPasswordLength: "New password must be at least 8 characters.",
      confirmPasswordLength: "Confirm password must be at least 8 characters.",
      passwordsDoNotMatch: "New passwords do not match.",
      invalidCredentials: "Invalid email, username, or password.",
      accountExists: "A player with that username or email already exists.",
      samePassword: "New password must be different from your current password.",
      currentPasswordIncorrect: "Current password is incorrect.",
      passwordUpdated: "Password updated."
    },
    verification: {
      emailInvalid: "Enter a valid email address.",
      emailInUse: "That email address is already in use.",
      loginAgain: "Log in again before requesting a verification email.",
      sendFailed: "The email could not be sent. Please try again.",
      alreadyVerified: "Your email is already verified.",
      linkSent: "A fresh verification link has been sent.",
      differentEmail: "Enter a different email address.",
      sentTo: "Verification email sent to {email}."
    },
    passwordReset: {
      requestConfirmation:
        "If that address belongs to a Pong Ladder account, password reset instructions are on their way. Check your inbox and spam folder.",
      resetConfirmation:
        "Your password has been updated and every signed-in device was logged out. Log in with your new password.",
      invalidLink: "That password reset link is invalid, expired, or already used. Request a new link and try again.",
      emailInvalid: "Enter a valid email address.",
      minLength: "Password must be at least {count} characters.",
      maxLength: "Password must be at most {count} characters.",
      passwordsDoNotMatch: "The passwords do not match.",
      updateFailed: "The password could not be updated. Please try again."
    },
    join: {
      organizationUnavailable: "That organization is not available.",
      alreadyMember: "You already belong to {organization}.",
      ready: "{organization} is ready to open.",
      pending: "Your request to join {organization} is awaiting approval.",
      rejected: "Your request to join {organization} was rejected.",
      suspended: "Your access to {organization} is suspended.",
      removed: "Your membership in {organization} was removed.",
      invitationRequired: "A valid invitation is required to join this organization.",
      domainNotAllowed: "Your verified email domain is not eligible for this organization.",
      accessCodeRequired: "Enter the organization's access code to join.",
      invalidCode: "That organization code is invalid or unavailable."
    },
    invitationRedemption: {
      expired: "This invitation to {organization} has expired.",
      revoked: "This invitation to {organization} was revoked.",
      exhausted: "This invitation to {organization} has reached its use limit.",
      verificationRequired: "Verify your email before accepting this invitation.",
      pending: "Your existing membership request for {organization} is still pending.",
      rejected: "Your existing membership request for {organization} was rejected.",
      suspended: "Your membership in {organization} is suspended.",
      removed: "Your membership in {organization} was removed.",
      authenticationRequired: "Log in before accepting this invitation.",
      rateLimited: "Too many attempts. Wait a moment and try again.",
      invalid: "This invitation is invalid or can no longer be used."
    },
    organizationCreation: {
      notEnabled: "Organization creation is not enabled for this account.",
      checkDetails: "Check the organization details.",
      chooseAnotherSlug: "Choose a different URL slug.",
      domainRequired: "Add at least one allowed email domain for this join policy.",
      slugInUse: "That URL slug is already in use."
    },
    organizationInvitation: {
      checkSettings: "Check the invitation settings.",
      created: "Invitation created. Copy this link now; it will not be shown again.",
      failed: "The invitation could not be created. Try again."
    },
    organizationPolicy: {
      domainRequired: "Add at least one valid email domain, such as example.com.",
      domainInvalid: "One or more email domains are invalid or duplicated.",
      policyUpdated: "Join policy updated.",
      detailsInvalid: "Check the organization name, type, and visibility.",
      settingsUpdated: "Organization settings updated.",
      codeGenerated: "A new organization code was generated. The previous code no longer works.",
      codeDisabled: "The organization code was disabled."
    },
    membershipAdmin: {
      selectAccount: "Select a verified account to add.",
      memberAdded: "{username} was added to {organization}.",
      alreadyMember: "That account is already a member."
    },
    seasonAdmin: {
      selectPlayer: "Select a player to add to the season.",
      playerAdded: "{username} was added to the season.",
      alreadyInSeason: "That player is already in this season."
    },
    languagePreferenceSaved: "Language preference saved."
  }
};

export type Dictionary = typeof en;
