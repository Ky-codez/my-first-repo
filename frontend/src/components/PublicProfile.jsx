import { useState, useEffect } from 'react';
import { Wine } from '@phosphor-icons/react';
import WineCard from './WineCard';
import LoginToEngageModal from './LoginToEngageModal';
import WinePassport from './WinePassport';

const ViewLoader = () => <div className="view-loading">Loading…</div>;

export default function PublicProfile({ username, currentUser, onLogin, onJoin }) {
  const [user, setUser] = useState(null);
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/profile/${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error('User not found');
        const userData = await res.json();
        setUser(userData);

        // Fetch user's wines
        const winesRes = await fetch(`/api/wines?userId=${userData.id}&paginate=false`);
        if (winesRes.ok) {
          const winesData = await winesRes.json();
          setWines(winesData);
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username]);

  const handleInteractionAttempt = () => {
    if (!currentUser) {
      setShowLoginModal(true);
    }
  };

  if (loading) return <ViewLoader />;
  if (error) {
    return (
      <div className="profile-page">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!user) return <ViewLoader />;

  return (
    <div className="profile-page">
      {/* Header with avatar and follow button */}
      <div className="profile-header">
        <div className="profile-avatar-section">
          {user.avatar && (
            <img src={user.avatar} alt={user.username} className="profile-avatar" />
          )}
        </div>
        <div className="profile-header-content">
          <h1 className="profile-name">{user.display_name || user.username}</h1>
          <p className="profile-username">@{user.username}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <div className="profile-stats">
            {user.total_reviews && (
              <div className="stat">
                <Wine size={16} weight="fill" />
                <span>{user.total_reviews} wines</span>
              </div>
            )}
            {user.followers_count !== undefined && (
              <div className="stat">
                <span>{user.followers_count} followers</span>
              </div>
            )}
            {user.following_count !== undefined && (
              <div className="stat">
                <span>{user.following_count} following</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wine Passport (3D globe) — shared feature */}
      {user.id && (
        <div className="profile-passport-section">
          <h3 className="section-title">Wine Passport</h3>
          <WinePassport userId={user.id} />
        </div>
      )}

      {/* Wine reviews list */}
      <div className="profile-wines-section">
        <h3 className="section-title">
          {wines.length === 0 ? 'No wines yet' : `${wines.length} Wine${wines.length !== 1 ? 's' : ''}`}
        </h3>
        <div className="wines-grid">
          {wines.map((wine) => (
            <div
              key={wine.id}
              className="public-wine-card-wrapper"
              onClick={!currentUser ? handleInteractionAttempt : undefined}
            >
              <WineCard wine={wine} currentUser={currentUser} />
              {!currentUser && (
                <div className="login-prompt-overlay">
                  <p>Login to rate & review</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showLoginModal && (
        <LoginToEngageModal
          onClose={() => setShowLoginModal(false)}
          onLogin={() => {
            setShowLoginModal(false);
            onLogin();
          }}
        />
      )}
    </div>
  );
}
