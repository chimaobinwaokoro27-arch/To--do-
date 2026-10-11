import { useEffect, useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import TodoApp from './components/TodoApp.jsx';
import BackgroundLayer from './components/BackgroundLayer.jsx';
import { useAppearance } from './theme/useAppearance.js';
import { getCurrentUser, logout } from './api.js';

function App() {
  // Owns the theme, appearance mode and background preferences, and shares them
  // with the background layer, the sidebar and the appearance panel.
  const appearance = useAppearance();

  // null means "nobody is logged in". We only find out for sure after asking
  // the backend, so the dashboard waits for isCheckingSession to be false.
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // A message the login page shows, e.g. when a session expired mid-use.
  const [notice, setNotice] = useState('');

  // Ask the backend who we are on every page load. The browser sends the
  // login cookie by itself, so a refresh keeps the user logged in.
  useEffect(() => {
    async function checkSession() {
      try {
        const data = await getCurrentUser();
        setUser(data.user);
      } catch {
        // No cookie, expired cookie, or the backend is not reachable.
        setUser(null);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  // Logging out on purpose clears the task list too: clearing the user removes
  // TodoApp from the screen.
  async function handleLogout(message = '') {
    try {
      await logout();
    } catch {
      // Even when the request fails we still log out on this side.
    }

    setNotice(message);
    setUser(null);
  }

  // Logging in again makes any old message pointless.
  function handleAuthenticated(data) {
    setNotice('');
    setUser(data);
  }

  let content;

  if (isCheckingSession) {
    content = (
      <div className="boot">
        <p className="state" role="status">
          <span className="spinner" aria-hidden="true" />
          Checking your session...
        </p>
      </div>
    );
  } else if (!user) {
    content = <AuthPage onAuthenticated={handleAuthenticated} notice={notice} />;
  } else {
    content = <TodoApp user={user} onLogout={handleLogout} appearance={appearance} />;
  }

  // The photographic background is painted behind every screen, including the
  // login page, so a refresh keeps the same atmosphere everywhere.
  return (
    <>
      <BackgroundLayer
        background={appearance.background}
        onRetire={appearance.releaseBlobUrl}
      />
      {content}
    </>
  );
}

export default App;
