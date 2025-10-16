import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    facilityId: '',
    userId: '',
    password: '',
    userType: 'user'
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const userData = JSON.parse(localStorage.getItem('whale_user') || '{}');
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'staff') {
        navigate('/staff');
      } else {
        navigate('/user');
      }
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.facilityId.trim()) {
      newErrors.facilityId = t('error.required');
    }

    if (!formData.userId.trim()) {
      newErrors.userId = t('error.required');
    }

    if (!formData.password) {
      newErrors.password = t('error.required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('error.passwordMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setLoginError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('error.loginFailed'));
      }

      await login(data.user, data.token);

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'staff') {
        navigate('/staff');
      } else {
        navigate('/user');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error instanceof Error ? error.message : t('error.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${theme.background}`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 11a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z"/>
              </svg>
            </div>
          </div>
          <h2 className={`text-4xl font-bold ${theme.text}`}>WHALE</h2>
          <p className={`mt-2 text-sm ${theme.textSecondary}`}>
            {t('app.subtitle')}
          </p>
        </div>

        <div className={`${theme.card} rounded-lg shadow-xl p-8`}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="userType" className={`block text-sm font-medium ${theme.text}`}>
                {t('login.userType')}
              </label>
              <select
                id="userType"
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${errors.userType ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="user">{t('role.user')}</option>
                <option value="staff">{t('role.staff')}</option>
                <option value="admin">{t('role.admin')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="facilityId" className={`block text-sm font-medium ${theme.text}`}>
                {t('login.facilityId')}
              </label>
              <input
                id="facilityId"
                name="facilityId"
                type="text"
                autoComplete="organization"
                value={formData.facilityId}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${errors.facilityId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('login.facilityIdPlaceholder')}
              />
              {errors.facilityId && (
                <p className="mt-1 text-sm text-red-600">{errors.facilityId}</p>
              )}
            </div>

            <div>
              <label htmlFor="userId" className={`block text-sm font-medium ${theme.text}`}>
                {t('login.userId')}
              </label>
              <input
                id="userId"
                name="userId"
                type="text"
                autoComplete="username"
                value={formData.userId}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${errors.userId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('login.userIdPlaceholder')}
              />
              {errors.userId && (
                <p className="mt-1 text-sm text-red-600">{errors.userId}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${theme.text}`}>
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder={t('login.passwordPlaceholder')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {loginError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{loginError}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-hx-post={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/login`}
                data-hx-trigger="click"
                data-hx-swap="none"
              >
                {isSubmitting ? t('login.submitting') : t('login.submit')}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/register"
                className={`text-sm font-medium text-blue-600 hover:text-blue-500`}
              >
                {t('login.registerLink')}
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className={`text-xs ${theme.textSecondary}`}>
            {t('app.copyright')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
