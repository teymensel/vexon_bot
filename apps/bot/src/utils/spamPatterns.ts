/**
 * Shared Spam Patterns for Anti-Spam and Scan-Spam systems.
 */
export const SPAM_PATTERNS = {
    // Detects long vertical bars used to create "walls" or corrupt UI
    // Matching 5 or more consecutive pipes
    VERTICAL_BARS: /\|{5,}/,

    // Detects unauthorized mass mentions
    MASS_MENTION: /(@everyone|@here)/,

    // Detects excessive Zalgo characters (optional, good for "glitch" text)
    ZALGO: /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{10,}/,
};
