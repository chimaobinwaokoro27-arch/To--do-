import { useState } from 'react';
import { register } from '../api.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function RegisterForm({ onAuthenticated }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const nextErrors = {};
    const email = form.email.trim();

    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required';
    } else if (form.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // The backend hashes the password, creates the account and logs us in
      // by setting the HTTP-only cookie.
      const data = await register({
        email: form.email.trim(),
        password: form.password,
      });
      onAuthenticated(data.user);
    } catch (error) {
      // e.g. "An account with that email already exists"
      setServerError(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form auth__form" onSubmit={handleSubmit} noValidate>
      <div className="form__group">
        <label className="form__label" htmlFor="register-email">
          Email
        </label>
        <input
          id="register-email"
          className="form__input"
          type="email"
          autoComplete="email"
          placeholder="you@gmail.com"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
        />
        {errors.email && <p className="form__error">{errors.email}</p>}
      </div>

      <div className="form__group">
        <label className="form__label" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          className="form__input"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
        />
        {errors.password && <p className="form__error">{errors.password}</p>}
      </div>

      <div className="form__group">
        <label className="form__label" htmlFor="register-confirm">
          Confirm password
        </label>
        <input
          id="register-confirm"
          className="form__input"
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={form.confirmPassword}
          onChange={(event) => updateField('confirmPassword', event.target.value)}
        />
        {errors.confirmPassword && <p className="form__error">{errors.confirmPassword}</p>}
      </div>

      {serverError && <p className="form__error form__error--server">{serverError}</p>}

      <button
        type="submit"
        className="button button--accent auth__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}

export default RegisterForm;
