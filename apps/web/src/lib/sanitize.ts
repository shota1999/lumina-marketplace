/**
 * Strip HTML tags from user input to prevent stored XSS.
 * React already escapes on render, but this provides defense-in-depth
 * for any future non-React consumers of the data.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}
