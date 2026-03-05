/**
 * Platform integrations barrel export.
 *
 * Due to overlapping function names between platform modules
 * (e.g., generateCodeVerifier, exchangeCodeForTokens), consumers
 * should import from specific modules:
 *   - @/lib/platforms/linkedin
 *   - @/lib/platforms/twitter
 *   - @/lib/platforms/encryption
 *
 * This barrel re-exports types (which don't conflict) and
 * provides namespace imports for platform-specific functions.
 */
export * from "./types";
export * from "./encryption";

// Platform-specific modules re-exported as namespaces to avoid name collisions
export * as linkedin from "./linkedin";
export * as twitter from "./twitter";
