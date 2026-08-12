export function getAppBaseUrl() {
  const configured = process.env.APP_BASE_URL?.trim();

  if (configured) {
    const url = new URL(configured);

    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("APP_BASE_URL must use HTTPS outside local development.");
    }

    return url.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_BASE_URL must be configured in production.");
  }

  return "http://localhost:3000";
}
