import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    facilityName: '',
    facilityPostalCode: '',
    facilityAddress: '',
    facilityPhone: '',
    facilityFoundedDate: '',
    adminName: '',
    adminNameKana: '',
    adminPostalCode: '',
    adminAddress: '',
    adminPhone: '',
    adminBirthdate: '',
    facilityId: '',
    adminId: '',
    adminPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const validateStep1 = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.facilityName.trim()) {
      newErrors.facilityName = t('error.required');
    }

    if (!formData.facilityPostalCode.trim()) {
      newErrors.facilityPostalCode = t('error.required');
    } else if (!/^\d{3}-?\d{4}$/.test(formData.facilityPostalCode)) {
      newErrors.facilityPostalCode = t('error.invalidPostalCode');
    }

    if (!formData.facilityAddress.trim()) {
      newErrors.facilityAddress = t('error.required');
    }

    if (!formData.facilityPhone.trim()) {
      newErrors.facilityPhone = t('error.required');
    } else if (!/^0\d{1,4}-?\d{1,4}-?\d{4}$/.test(formData.facilityPhone)) {
      newErrors.facilityPhone = t('error.invalidPhone');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.adminName.trim()) {
      newErrors.adminName = t('error.required');
    }

    if (!formData.adminNameKana.trim()) {
      newErrors.adminNameKana = t('error.required');
    }

    if (!formData.adminPostalCode.trim()) {
      newErrors.adminPostalCode = t('error.required');
    } else if (!/^\d{3}-?\d{4}$/.test(formData.adminPostalCode)) {
      newErrors.adminPostalCode = t('error.invalidPostalCode');
    }

    if (!formData.adminAddress.trim()) {
      newErrors.adminAddress = t('error.required');
    }

    if (!formData.adminPhone.trim()) {
      newErrors.adminPhone = t('error.required');
    } else if (!/^0\d{1,4}-?\d{1,4}-?\d{4}$/.test(formData.adminPhone)) {
      newErrors.adminPhone = t('error.invalidPhone');
    }

    if (!formData.adminBirthdate) {
      newErrors.adminBirthdate = t('error.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.facilityId.trim()) {
      newErrors.facilityId = t('error.required');
    } else if (formData.facilityId.length < 4) {
      newErrors.facilityId = t('error.facilityIdMinLength');
    }

    if (!formData.adminId.trim()) {
      newErrors.adminId = t('error.required');
    } else if (formData.adminId.length < 4) {
      newErrors.adminId = t('error.adminIdMinLength');
    }

    if (!formData.adminPassword) {
      newErrors.adminPassword = t('error.required');
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = t('error.passwordMinLength');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('error.required');
    } else if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('error.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setRegisterError('');
  };

  const handleNextStep = () => {
    let isValid = false;
    
    if (step === 1) {
      isValid = validateStep1();
    } else if (step === 2) {
      isValid = validateStep2();
    }

    if (isValid) {
      setStep(step + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) {
      return;
    }

    setIsSubmitting(true);
    setRegisterError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('error.registrationFailed'));
      }

      alert(t('register.success'));
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setRegisterError(error instanceof Error ? error.message : t('error.registrationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${theme.background}`}>
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${theme.text}`}>
            {t('register.title')}
          </h2>
          <p className={`mt-2 text-sm ${theme.textSecondary}`}>
            {t('register.subtitle')}
          </p>
        </div>

        <div className={`${theme.card} rounded-lg shadow-xl p-8`}>
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= stepNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-24 h-1 ${
                        step > stepNumber ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs">{t('register.step1Title')}</span>
              <span className="text-xs">{t('register.step2Title')}</span>
              <span className="text-xs">{t('register.step3Title')}</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  {t('register.facilityInformation')}
                </h3>

                <div>
                  <label htmlFor="facilityName" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.facilityName')}
                  </label>
                  <input
                    id="facilityName"
                    name="facilityName"
                    type="text"
                    value={formData.facilityName}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.facilityName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.facilityName && (
                    <p className="mt-1 text-sm text-red-600">{errors.facilityName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="facilityPostalCode" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.facilityPostalCode')}
                  </label>
                  <input
                    id="facilityPostalCode"
                    name="facilityPostalCode"
                    type="text"
                    value={formData.facilityPostalCode}
                    onChange={handleChange}
                    placeholder="123-4567"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.facilityPostalCode ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.facilityPostalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.facilityPostalCode}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="facilityAddress" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.facilityAddress')}
                  </label>
                  <input
                    id="facilityAddress"
                    name="facilityAddress"
                    type="text"
                    value={formData.facilityAddress}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.facilityAddress ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.facilityAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.facilityAddress}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="facilityPhone" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.facilityPhone')}
                  </label>
                  <input
                    id="facilityPhone"
                    name="facilityPhone"
                    type="tel"
                    value={formData.facilityPhone}
                    onChange={handleChange}
                    placeholder="03-1234-5678"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.facilityPhone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.facilityPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.facilityPhone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="facilityFoundedDate" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.facilityFoundedDate')} {t('common.optional')}
                  </label>
                  <input
                    id="facilityFoundedDate"
                    name="facilityFoundedDate"
                    type="date"
                    value={formData.facilityFoundedDate}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  {t('register.adminInformation')}
                </h3>

                <div>
                  <label htmlFor="adminName" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminName')}
                  </label>
                  <input
                    id="adminName"
                    name="adminName"
                    type="text"
                    value={formData.adminName}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminName && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminNameKana" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminNameKana')}
                  </label>
                  <input
                    id="adminNameKana"
                    name="adminNameKana"
                    type="text"
                    value={formData.adminNameKana}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminNameKana ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminNameKana && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminNameKana}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminPostalCode" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminPostalCode')}
                  </label>
                  <input
                    id="adminPostalCode"
                    name="adminPostalCode"
                    type="text"
                    value={formData.adminPostalCode}
                    onChange={handleChange}
                    placeholder="123-4567"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminPostalCode ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminPostalCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminPostalCode}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminAddress" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminAddress')}
                  </label>
                  <input
                    id="adminAddress"
                    name="adminAddress"
                    type="text"
                    value={formData.adminAddress}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminAddress ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminAddress}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminPhone" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminPhone')}
                  </label>
                  <input
                    id="adminPhone"
                    name="adminPhone"
                    type="tel"
                    value={formData.adminPhone}
                    onChange={handleChange}
                    placeholder="090-1234-5678"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminPhone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminPhone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminBirthdate" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminBirthdate')}
                  </label>
                  <input
                    id="adminBirthdate"
                    name="adminBirthdate"
                    type="date"
                    value={formData.adminBirthdate}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminBirthdate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminBirthdate && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminBirthdate}</p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  {t('register.accountInformation')}
                </h3>

                <div>
                  <label htmlFor="facilityId" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.facilityId')}
                  </label>
                  <input
                    id="facilityId"
                    name="facilityId"
                    type="text"
                    value={formData.facilityId}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.facilityId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.facilityId && (
                    <p className="mt-1 text-sm text-red-600">{errors.facilityId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminId" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminId')}
                  </label>
                  <input
                    id="adminId"
                    name="adminId"
                    type="text"
                    value={formData.adminId}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminId && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="adminPassword" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.adminPassword')}
                  </label>
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.adminPassword ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.adminPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={`block text-sm font-medium ${theme.text}`}>
                    {t('register.confirmPassword')}
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}

            {registerError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{registerError}</p>
              </div>
            )}

            <div className="flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.previous')}
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="ml-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.next')}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-hx-post={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/register`}
                  data-hx-trigger="click"
                  data-hx-swap="none"
                >
                  {isSubmitting ? t('register.submitting') : t('register.submit')}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {t('register.loginLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
