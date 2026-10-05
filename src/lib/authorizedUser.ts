// Must match the email checked in firestore.rules.
const AUTHORIZED_EMAIL = 'owner@example.com'

export function isAuthorizedEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }

  return email.toLowerCase() === AUTHORIZED_EMAIL
}
