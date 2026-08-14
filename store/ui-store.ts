'use client';

import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

interface UiState {
  mobileMenuOpen: boolean;
  theme: ThemeMode;
  /** Hero explore mode — the 3D scene accepts pointer input while true. */
  exploreMode: boolean;
  /** Bumped to re-run a named decorative animation on demand. */
  animationTick: Record<string, number>;

  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setExploreMode: (active: boolean) => void;
  bumpAnimation: (name: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  theme: 'light',
  exploreMode: false,
  animationTick: {},

  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setExploreMode: (active) => set({ exploreMode: active }),
  bumpAnimation: (name) =>
    set((s) => ({ animationTick: { ...s.animationTick, [name]: (s.animationTick[name] ?? 0) + 1 } })),
}));
