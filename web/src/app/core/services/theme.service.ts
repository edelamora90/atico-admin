import { DOCUMENT } from '@angular/common';
import {
  Injectable,
  computed,
  inject,
  signal
} from '@angular/core';

type ThemeName = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'atico-theme';
  private readonly document = inject(DOCUMENT);

  currentTheme = signal<ThemeName>(this.getInitialTheme());
  isDarkTheme = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.applyTheme(this.currentTheme());
  }

  toggleTheme(): void {
    this.setTheme(this.isDarkTheme() ? 'light' : 'dark');
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    this.saveTheme(theme);
  }

  private getInitialTheme(): ThemeName {
    const stored = this.getStoredTheme();

    if (stored) {
      return stored;
    }

    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private getStoredTheme(): ThemeName | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(this.storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  private saveTheme(theme: ThemeName): void {
    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey, theme);
    } catch {
      // Theme persistence is nice to have; UI theme still applies for this session.
    }
  }

  private applyTheme(theme: ThemeName): void {
    const body = this.document.body;
    body.classList.toggle('dark-theme', theme === 'dark');
    body.classList.toggle('light-theme', theme === 'light');
    body.style.colorScheme = theme;
  }
}
