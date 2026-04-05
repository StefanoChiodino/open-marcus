import type { ProfileFormData } from '../shared/types';
import ProfileForm from './ProfileForm';
import './OnboardingScreen.css';

interface OnboardingScreenProps {
  onSubmit: (data: ProfileFormData) => void;
  isSubmitting: boolean;
  serverError: string | null;
}

function OnboardingScreen({ onSubmit, isSubmitting, serverError }: OnboardingScreenProps) {
  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <div className="onboarding-branding">
          <h1 className="onboarding-title">OpenMarcus</h1>
          <p className="onboarding-tagline">Your Stoic Mental Health Companion</p>
          <div className="onboarding-divider" />
        </div>

        <p className="onboarding-intro">
          Begin your journey of self-reflection and philosophical exploration,
          guided by the wisdom of Marcus Aurelius.
        </p>

        <div className="onboarding-form-card">
          <ProfileForm
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        </div>

        <div className="disclaimer" role="note">
          <strong>Note:</strong> OpenMarcus is not therapy or medical advice.
          It is a reflection tool based on Stoic philosophy.
        </div>
      </div>
    </div>
  );
}

export default OnboardingScreen;
