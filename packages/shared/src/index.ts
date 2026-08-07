/**
 * @skillgrid/shared public surface.
 *
 * Phase PR2a: types, constants, utils.
 * Store, services, and components land in later PRs.
 *
 * Note: domain `SkillLevel` (union) and constants `SkillLevel` (interface)
 * both exist — only the domain type is re-exported as `SkillLevel` here.
 * Import the constants interface from `@skillgrid/shared/constants` if needed.
 */

export const SHARED_SPIKE = "skillgrid-shared-ok" as const;

export const SHARED_SPIKE_META = {
  package: "@skillgrid/shared",
  phase: "pr2a-types-constants-utils",
} as const;

export type * from "./types";
export { LEVELS, MATRIX_LAYOUT } from "./constants";
export * from "./utils";
