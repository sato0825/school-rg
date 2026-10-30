export interface SaveStore {
  read(): string | null;
  write(value: string): void;
}

export const RUN_SAVE_KEY = "school-rg-run-v1";
export const PROGRESSION_SAVE_KEY = "school-rg-progression-v1";

/** Progression has its own lifetime and format, independent of an active run. */
export function browserProgressStore(): SaveStore {
  try {
    const storage = window.localStorage;
    return {
      read: () => storage.getItem(PROGRESSION_SAVE_KEY),
      write: (value) => storage.setItem(PROGRESSION_SAVE_KEY, value),
    };
  } catch {
    return { read: () => null, write: () => undefined };
  }
}

/** Browser persistence is an adapter; the domain save format has no DOM dependency. */
export function browserSaveStore(): SaveStore {
  try {
    const storage = window.localStorage;
    return {
      read: () => storage.getItem(RUN_SAVE_KEY),
      write: (value) => storage.setItem(RUN_SAVE_KEY, value),
    };
  } catch {
    return { read: () => null, write: () => undefined };
  }
}
