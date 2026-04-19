import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useSessionStore } from '../stores/sessionStore';
import ProfileDisplay from '../components/ProfileDisplay';
import './HomePage.css';

function HomePage() {
  const { profile } = useProfileStore();
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate('/profile');
  };

  const handleBeginMeditation = () => {
    // Don't allow starting session without a profile (shouldn't happen due to AuthGateway)
    if (!profile?.id) {
      return;
    }
    // Start session before navigating so /session shows active chat, not another begin prompt
    useSessionStore.getState().beginSession();
    navigate('/session');
  };

  return (
    <div className="home-page">
      <main className="home-main">
        <div className="welcome-card">
          <img src="/open-marcus-logo-transparent.png" alt="" className="home-page__logo" />
          <ProfileDisplay profile={profile!} onEdit={handleEdit} />
          <h3>Welcome to OpenMarcus</h3>
          <p>
            Your personal Stoic companion, inspired by the wisdom of Marcus Aurelius.
            Begin your journey of self-reflection and philosophical exploration.
          </p>
          <button
            onClick={handleBeginMeditation}
            className="button button--primary button--lg home-page__begin-btn"
            aria-label="Begin meditation session"
          >
            Begin Meditation
          </button>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
