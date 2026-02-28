/**
 * Broadcast module barrel export.
 */

export type {
  BroadcastRequest,
  BroadcastResult,
  PlatformTarget,
  BroadcastEventData,
} from "./types";

export { deriveBroadcastStatus } from "./types";

export {
  createBroadcast,
  generateBroadcastId,
  validateBroadcastRequest,
  createDefaultDeps,
} from "./orchestrator";
export type { BroadcastDeps, BroadcastValidationError } from "./orchestrator";
