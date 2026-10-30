export interface SaveStore {
  read(): string | null;
  write(value: string): void;
}

export const RUN_SAVE_KEY = "school-rg-run-v1";

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
