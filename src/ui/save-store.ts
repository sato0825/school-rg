export interface SaveStore {
  read(): string | null;
  write(value: string): void;
}

export const RUN_SAVE_KEY = "school-rg-run-v1";
export const PROGRESSION_SAVE_KEY = "school-rg-progression-v1";
export const PLAYTEST_SAVE_KEY = "school-rg-playtest-v1";
export const HISTORY_SAVE_KEY = "school-rg-history-v1";

/** Completed run summaries have a separate lifetime from the active save. */
export function browserHistoryStore(): SaveStore {
  try {
    const storage = window.localStorage;
    return {
      read: () => storage.getItem(HISTORY_SAVE_KEY),
      write: (value) => storage.setItem(HISTORY_SAVE_KEY, value),
    };
  } catch {
    return { read: () => null, write: () => undefined };
  }
}

/** Opt-in playtest measurements stay on this device until explicitly exported. */
export function browserPlaytestStore(): SaveStore {
  try {
    const storage = window.localStorage;
    return {
      read: () => storage.getItem(PLAYTEST_SAVE_KEY),
      write: (value) => storage.setItem(PLAYTEST_SAVE_KEY, value),
    };
  } catch {
    return { read: () => null, write: () => undefined };
  }
}

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
