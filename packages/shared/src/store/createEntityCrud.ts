/**
 * Generic optimistic CRUD for domain entities in the Zustand store.
 * Covers: create → set state → history; update with rollback; delete with optional cascade.
 */

import type { DbService } from "../services/indexeddb";
import type { EntityType } from "../types";
import type { AppCapabilities, CapabilityFlag } from "../types/capabilities";
import { checkCapability } from "./capabilities";
import { recordChange, failAndMaybeReload } from "./recordChange";
import type { AppState } from "./types";

type Get = () => AppState;
type Set = (
  partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)
) => void;

/** Array-list keys that hold entity collections on AppState. */
export type EntityListKey =
  | "employees"
  | "categories"
  | "subcategories"
  | "skills"
  | "departments"
  | "roles"
  | "qualificationPlans"
  | "qualificationMeasures"
  | "savedViews";

export interface EntityCrudConfig<
  T extends { id?: string },
  TCreate = Omit<T, "id" | "updatedAt">,
  TUpdate = TCreate,
> {
  entityType: EntityType;
  listKey: EntityListKey;
  getLabel: (item: Partial<T> | TCreate | TUpdate, fallbackId?: string) => string;
  dbAdd: (data: TCreate) => Promise<string>;
  dbUpdate: (id: string, data: TUpdate) => Promise<void>;
  dbDelete: (id: string) => Promise<void>;
  /** Default: `{ ...data, id, updatedAt: Date.now() }` */
  buildNew?: (data: TCreate, id: string) => T;
  /** Default: `{ ...existing, ...data, id, updatedAt: Date.now() }` */
  buildUpdated?: (existing: T | undefined, data: TUpdate, id: string) => T;
  /**
   * Custom delete: provide optimistic state patch + history payload.
   * If omitted, only removes the entity from its list.
   */
  prepareDelete?: (
    get: Get,
    id: string,
    existing: T | undefined
  ) => {
    partial: Partial<AppState> | ((state: AppState) => Partial<AppState>);
    previousData: unknown;
  };
  /** Shown when err is not an Error instance */
  errorMessage?: string;
  /** After create: optionally transform list (e.g. sort views) */
  afterAddList?: (list: T[], entity: T) => T[];
  /**
   * When set, create/update/delete are blocked unless the capability is true.
   * Required for catalog listKeys (categories, subcategories, skills, roles).
   */
  capabilityKey?: CapabilityFlag;
}

/** Catalog CRUD must declare catalogAuthoring (design §6.4 / K18). */
export type CatalogCrudConfig<
  T extends { id?: string },
  TCreate = Omit<T, "id" | "updatedAt">,
  TUpdate = TCreate,
> = EntityCrudConfig<T, TCreate, TUpdate> & {
  capabilityKey: "catalogAuthoring";
};

export interface EntityCrudHandlers<TCreate, TUpdate> {
  add: (data: TCreate) => Promise<string>;
  update: (id: string, data: TUpdate) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function defaultBuildNew<T, TCreate>(data: TCreate, id: string): T {
  return { ...(data as object), id, updatedAt: Date.now() } as T;
}

function defaultBuildUpdated<T, TUpdate>(
  existing: T | undefined,
  data: TUpdate,
  id: string
): T {
  return { ...(existing as object), ...(data as object), id, updatedAt: Date.now() } as T;
}

export function createEntityCrudHandlers<
  T extends { id?: string },
  TCreate = Omit<T, "id" | "updatedAt">,
  TUpdate = TCreate,
>(
  db: DbService,
  caps: AppCapabilities,
  set: Set,
  get: Get,
  config: EntityCrudConfig<T, TCreate, TUpdate>
): EntityCrudHandlers<TCreate, TUpdate> {
  const getList = (): T[] => get()[config.listKey] as T[];

  const setList = (next: T[]) => {
    set({ [config.listKey]: next } as Partial<AppState>);
  };

  const fail = (err: unknown, reload: boolean): Promise<never> =>
    failAndMaybeReload(set, get, err, config.errorMessage || "Failed", reload);

  /** Returns denial reason or null if allowed. */
  const denyReason = (action: string): string | null => {
    if (!config.capabilityKey) return null;
    const result = checkCapability(caps, config.capabilityKey, action);
    if (result.ok) return null;
    if (import.meta.env.DEV) {
      console.error(result.reason);
    }
    set({ error: result.reason });
    return result.reason;
  };

  return {
    add: async (data) => {
      const denied = denyReason(`create ${config.entityType}`);
      if (denied) {
        throw new Error(denied);
      }
      try {
        const id = await config.dbAdd(data);
        const entity = config.buildNew
          ? config.buildNew(data, id)
          : defaultBuildNew<T, TCreate>(data, id);
        const list = [...getList(), entity];
        setList(config.afterAddList ? config.afterAddList(list, entity) : list);
        await recordChange(
          db,
          get,
          config.entityType,
          id,
          config.getLabel(entity, id),
          "create",
          null,
          entity
        );
        return id;
      } catch (err) {
        return fail(err, false);
      }
    },

    update: async (id, data) => {
      if (denyReason(`update ${config.entityType}`)) {
        return;
      }
      try {
        const existing = getList().find((e) => e.id === id);
        const updated = config.buildUpdated
          ? config.buildUpdated(existing, data, id)
          : defaultBuildUpdated<T, TUpdate>(existing, data, id);
        setList(getList().map((e) => (e.id === id ? updated : e)));
        await config.dbUpdate(id, data);
        await recordChange(
          db,
          get,
          config.entityType,
          id,
          config.getLabel(updated, id),
          "update",
          existing,
          updated
        );
      } catch (err) {
        await fail(err, true);
      }
    },

    remove: async (id) => {
      if (denyReason(`delete ${config.entityType}`)) {
        return;
      }
      try {
        const existing = getList().find((e) => e.id === id);
        let previousData: unknown = existing;

        if (config.prepareDelete) {
          const prepared = config.prepareDelete(get, id, existing);
          set(prepared.partial);
          previousData = prepared.previousData;
        } else {
          setList(getList().filter((e) => e.id !== id));
        }

        await config.dbDelete(id);
        await recordChange(
          db,
          get,
          config.entityType,
          id,
          config.getLabel((existing || {}) as Partial<T>, id),
          "delete",
          previousData,
          null
        );
      } catch (err) {
        await fail(err, true);
      }
    },
  };
}

/** Label helper for entities with a `name` field. */
export const nameLabel =
  <T extends { name?: string }>() =>
  (item: Partial<T> | { name?: string }, fallbackId = ""): string =>
    (item as { name?: string }).name || fallbackId;
