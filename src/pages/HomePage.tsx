function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>OpenMarcus</h1>
        <p className="tagline">Your Stoic Mental Health Companion</p>
      </header>
      <main className="home-main">
        <div className="welcome-card">
          <h2>Welcome to OpenMarcus</h2>
          <p>
            Your personal Stoic companion, inspired by the wisdom of Marcus Aurelius.
            Begin your journey of self-reflection and philosophical exploration.
          </p>
          <div className="disclaimer">
            <strong>Note:</strong> OpenMarcus is not therapy or medical advice.
            It is a reflection tool based on Stoic philosophy.
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
