/**
 * Test data factories for creating test fixtures.
 * Add factory functions here as features are built.
 */

// Example factory stub - expand as needed
export function createUser(overrides?: Partial<{ id: string; name: string; email: string }>) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    ...overrides,
  };
}
