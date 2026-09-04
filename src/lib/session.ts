const STORAGE_KEY = "amber-board-user-id";

export function readStoredUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearStoredUserId(): void {
  localStorage.removeItem(STORAGE_KEY);
}
