/**
 * Prefixed localStorage wrapper with optional legacy unprefixed reads (Full).
 */

export interface PrefixedStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Logical key without prefix (for debugging / migration). */
  key(name: string): string;
}

export interface PrefixedStorageOptions {
  prefix: string;
  /**
   * When true, getItem falls back to the unprefixed key if the prefixed one
   * is missing (Full migration from pre-monorepo keys).
   */
  alsoReadLegacyUnprefixed?: boolean;
  /**
   * When true, first successful legacy read migrates the value to the
   * prefixed key and removes the legacy key.
   */
  migrateLegacyOnRead?: boolean;
}

export function createPrefixedStorage(
  options: PrefixedStorageOptions
): PrefixedStorage {
  const {
    prefix,
    alsoReadLegacyUnprefixed = false,
    migrateLegacyOnRead = true,
  } = options;

  const key = (name: string) => `${prefix}${name}`;

  return {
    key,
    getItem(name: string) {
      const prefixed = key(name);
      const value = localStorage.getItem(prefixed);
      if (value !== null) return value;

      if (!alsoReadLegacyUnprefixed) return null;

      const legacy = localStorage.getItem(name);
      if (legacy === null) return null;

      if (migrateLegacyOnRead) {
        try {
          localStorage.setItem(prefixed, legacy);
          localStorage.removeItem(name);
        } catch {
          // Quota / private mode — still return legacy value
        }
      }
      return legacy;
    },
    setItem(name: string, value: string) {
      localStorage.setItem(key(name), value);
    },
    removeItem(name: string) {
      localStorage.removeItem(key(name));
      if (alsoReadLegacyUnprefixed) {
        localStorage.removeItem(name);
      }
    },
  };
}
