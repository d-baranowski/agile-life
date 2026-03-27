/**
 * Types for ticket template groups and individual ticket templates.
 *
 * Templates support mustache-style placeholders that are resolved at
 * card-generation time:
 *   {{week}}       – zero-padded ISO week number (01–53)
 *   {{year}}       – 4-digit year
 *   {{month}}      – zero-padded month number (01–12)
 *   {{month_name}} – full month name (e.g. "March")
 *   {{date}}       – ISO date string (YYYY-MM-DD)
 */
export {};
