/**
 * Profile store using Zustand
 * Manages profile state, loading, error, and onboarding status
 */

import { create } from 'zustand';
import { profileAPI } from '../lib/api';
import type { ProfileDTO, ProfileFormData, ProfileStatus } from '../shared/types';
import { useToastStore } from './toastStore';

interface ProfileState {
  profile: ProfileDTO | null;
  status: ProfileStatus;
  error: string | null;
  isEditing: boolean;

  // Actions
  loadProfile: () => Promise<void>;
  saveProfile: (data: ProfileFormData) => Promise<void>;
  startEditing: () => void;
  cancelEditing: () => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  status: 'loading',
  error: null,
  isEditing: false,

  loadProfile: async () => {
    set({ status: 'loading', error: null });
    try {
      const profile = await profileAPI.fetchProfile();
      if (profile) {
        set({ profile, status: 'loaded' });
      } else {
        set({ profile: null, status: 'not_found' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      set({ error: message, status: 'error' });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Profile Load Failed',
        message,
      });
    }
  },

  saveProfile: async (data: ProfileFormData) => {
    set({ status: 'loading', error: null });
    try {
      const { profile: existingProfile } = get();

      let savedProfile: ProfileDTO;
      if (existingProfile) {
        savedProfile = await profileAPI.updateProfile(existingProfile.id, data.name, data.bio || undefined);
      } else {
        savedProfile = await profileAPI.createProfile(data.name, data.bio || undefined);
      }

      set({ profile: savedProfile, status: 'loaded', isEditing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      set({ error: message, status: 'error', isEditing: false });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Profile Save Failed',
        message,
      });
    }
  },

  startEditing: () => {
    set({ isEditing: true, error: null });
  },

  cancelEditing: () => {
    set({ isEditing: false, error: null });
  },

  clearProfile: async () => {
    const { profile } = get();
    if (profile?.id) {
      try {
        await profileAPI.deleteProfile(profile.id);
      } catch {
        // Ignore errors - profile may already be deleted or not found
      }
    }
    set({ profile: null, status: 'not_found', error: null, isEditing: false });
  },
}));
