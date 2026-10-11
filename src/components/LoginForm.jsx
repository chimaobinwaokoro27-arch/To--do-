import { useState } from 'react';
import { login } from '../api.js';

function LoginForm({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email is required';
    if (!password) nextErrors.password = 'Password is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // The backend sets the login cookie. We never see the token itself.
      const data = await login({ email: email.trim(), password });
      onAuthenticated(data.user);
    } catch (error) {
      // e.g. "Email or password is incorrect". The form stays open.
      setServerError(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form auth__form" onSubmit={handleSubmit} noValidate>
      <div className="form__group">
        <label className="form__label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="form__input"
          type="email"
          autoComplete="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {errors.email && <p className="form__error">{errors.email}</p>}
      </div>

      <div className="form__group">
        <label className="form__label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className="form__input"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {errors.password && <p className="form__error">{errors.password}</p>}
      </div>

      {serverError && <p className="form__error form__error--server">{serverError}</p>}

      <button
        type="submit"
        className="button button--accent auth__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

export default LoginForm;
