export const USERNAME_DOMAIN = "lab.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  return email.replace(`@${USERNAME_DOMAIN}`, "");
}
