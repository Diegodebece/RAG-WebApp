// Browser storage can be missing or throw (private windows, blocked site data), so every access is guarded
// and the app works without it: a setting that cannot be read falls back to its default.

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // the setting just lasts until the page is closed
  }
}

// The session lives in sessionStorage: it survives a reload but not closing the tab.

export function readSessionItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSessionItem(key: string, value: string | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
    }
  } catch {
    // the session just lasts until the page is reloaded
  }
}
