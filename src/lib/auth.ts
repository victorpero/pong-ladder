import { prismaAdapter } from "@better-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { findAvailableUsername } from "@/lib/username";

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const configuredBaseUrl = process.env.APP_BASE_URL?.trim();

export const googleAuthEnabled = Boolean(googleClientId && googleClientSecret);

const socialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          disableDefaultScope: true,
          scope: ["openid", "email", "profile"],
          mapProfileToUser: async (profile: { email: string; email_verified: boolean; name?: string }) => ({
            username: await findAvailableUsername(prisma, profile.email.split("@")[0] || profile.name || "player"),
            emailVerifiedAt: profile.email_verified ? new Date() : null
          })
        }
      }
    : {};

export const auth = betterAuth({
  appName: "Pong Ladder",
  baseURL: configuredBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true
  }),
  user: {
    modelName: "User",
    fields: { name: "fullName" },
    additionalFields: {
      username: { type: "string", required: true, input: true },
      emailVerifiedAt: { type: "date", required: false, input: false }
    }
  },
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  account: {
    modelName: "Account",
    updateAccountOnSignIn: false,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      updateUserInfoOnLink: false
    }
  },
  verification: {
    modelName: "Verification",
    storeIdentifier: "hashed",
    storeInDatabase: true
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash)
    }
  },
  socialProviders,
  trustedOrigins: configuredBaseUrl ? [new URL(configuredBaseUrl).origin] : [],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/sign-in/social": { window: 300, max: 20 }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const username =
            typeof user.username === "string" && user.username
              ? user.username
              : await findAvailableUsername(prisma, user.email.split("@")[0]);

          return {
            data: {
              ...user,
              username,
              emailVerifiedAt: user.emailVerified ? new Date() : null
            }
          };
        }
      },
      update: {
        before: async (user) => {
          if (user.emailVerified === true && !user.emailVerifiedAt) {
            return { data: { ...user, emailVerifiedAt: new Date() } };
          }

          if (user.emailVerified === false || user.email) {
            return { data: { ...user, emailVerified: false, emailVerifiedAt: null } };
          }
        }
      }
    },
    account: {
      create: {
        before: async (account) => ({
          data: {
            ...account,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null
          }
        })
      },
      update: {
        before: async (account) => ({
          data: {
            ...account,
            accessToken: null,
            refreshToken: null,
            idToken: null,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null
          }
        })
      }
    }
  },
  plugins: [nextCookies()]
});
