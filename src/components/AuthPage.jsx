import { useState } from 'react';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import BrandLogo from './BrandLogo.jsx';

// Shown to anybody who is not logged in. Only the login and register forms
// live here, so the task list is never on the screen for a signed-out visitor.
function AuthPage({ onAuthenticated, notice = '' }) {
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__logo" aria-hidden="true">
            <BrandLogo decorative />
          </span>
          <h1 className="auth__title">TaskFlow</h1>
        </div>

        {/* Explains why the user landed back here, e.g. an expired session. */}
        {notice && (
          <p className="auth__notice" role="alert">
            {notice}
          </p>
        )}

        <p className="auth__tagline">
          {isRegistering
            ? 'Create an account to start getting email reminders before your deadlines.'
            : 'Log in to see your tasks and your email reminders.'}
        </p>

        {/* Switching unmounts the other form, which clears its input and errors. */}
        {isRegistering ? (
          <RegisterForm onAuthenticated={onAuthenticated} />
        ) : (
          <LoginForm onAuthenticated={onAuthenticated} />
        )}

        <p className="auth__switch">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            className="auth__link"
            onClick={() => setIsRegistering((current) => !current)}
          >
            {isRegistering ? 'Log in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
