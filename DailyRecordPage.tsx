import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface DailyRecord {
  id?: string;
  date: string;
  wakeUpTime: string;
  sleepTime: string;
  arrivalTime: string;
  departureTime: string;
  breakfast: boolean;
  breakfastAppetite: number;
  breakfastContent: string;
  lunch: boolean;
  lunchAppetite: number;
  lunchContent: string;
  dinner: boolean;
  dinnerAppetite: number;
  dinnerContent: string;
  mealProvided: boolean;
  exercise: boolean;
  exerciseType: string;
  exerciseDuration: number;
  steps: number;
  bathing: boolean;
  bathingTime: string;
  bathingAssistance: string;
  washing: boolean;
  toothBrushing: boolean;
  morningMedication: boolean;
  morningMedicationList: string;
  morningMedicationTime: string;
  noonMedication: boolean;
  noonMedicationList: string;
  noonMedicationTime: string;
  eveningMedication: boolean;
  eveningMedicationList: string;
  eveningMedicationTime: string;
  bedtimeMedication: boolean;
  bedtimeMedicationList: string;
  bedtimeMedicationTime: string;
  preMedication: boolean;
  preMedicationReason: string;
  preMedicationList: string;
  preMedicationTime: string;
  bodyTemperature: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  pulse: string;
  spo2: string;
  emotionIcon: number;
  moodScore: number;
  moodDetail: string;
  thoughts: string;
  feelings: string;
  worries: string;
  concerns: string;
  consultation: string;
  contact: string;
  report: string;
  chat: string;
  achievements: string;
  improvements: string;
}

const DailyRecordPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [record, setRecord] = useState<DailyRecord>({
    date: new Date().toISOString().split('T')[0],
    wakeUpTime: '',
    sleepTime: '',
    arrivalTime: '',
    departureTime: '',
    breakfast: false,
    breakfastAppetite: 5,
    breakfastContent: '',
    lunch: false,
    lunchAppetite: 5,
    lunchContent: '',
    dinner: false,
    dinnerAppetite: 5,
    dinnerContent: '',
    mealProvided: false,
    exercise: false,
    exerciseType: '',
    exerciseDuration: 0,
    steps: 0,
    bathing: false,
    bathingTime: '',
    bathingAssistance: '',
    washing: false,
    toothBrushing: false,
    morningMedication: false,
    morningMedicationList: '',
    morningMedicationTime: '',
    noonMedication: false,
    noonMedicationList: '',
    noonMedicationTime: '',
    eveningMedication: false,
    eveningMedicationList: '',
    eveningMedicationTime: '',
    bedtimeMedication: false,
    bedtimeMedicationList: '',
    bedtimeMedicationTime: '',
    preMedication: false,
    preMedicationReason: '',
    preMedicationList: '',
    preMedicationTime: '',
    bodyTemperature: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulse: '',
    spo2: '',
    emotionIcon: 5,
    moodScore: 5,
    moodDetail: '',
    thoughts: '',
    feelings: '',
    worries: '',
    concerns: '',
    consultation: '',
    contact: '',
    report: '',
    chat: '',
    achievements: '',
    improvements: ''
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadPreviousRecord();
  }, [record.date]);

  const loadPreviousRecord = async () => {
    try {
      const previousData = localStorage.getItem(`whale_daily_record_${user?.id}_${record.date}`);
      if (previousData) {
        setRecord(JSON.parse(previousData));
      }
    } catch (error) {
      console.error('Failed to load previous record:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setRecord(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setRecord(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setRecord(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSliderChange = (name: string, value: number) => {
    setRecord(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      localStorage.setItem(`whale_daily_record_${user?.id}_${record.date}`, JSON.stringify(record));

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/daily-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('whale_token')}`
        },
        body: JSON.stringify({
          ...record,
          userId: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save record');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert(t('error.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.basicInfo')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.date')}
          </label>
          <input
            type="date"
            name="date"
            value={record.date}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.wakeUpTime')}
          </label>
          <input
            type="time"
            name="wakeUpTime"
            value={record.wakeUpTime}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.sleepTime')}
          </label>
          <input
            type="time"
            name="sleepTime"
            value={record.sleepTime}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.arrivalTime')}
          </label>
          <input
            type="time"
            name="arrivalTime"
            value={record.arrivalTime}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.departureTime')}
          </label>
          <input
            type="time"
            name="departureTime"
            value={record.departureTime}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
    </div>
  );

  const renderMealInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.mealInfo')}</h3>
      
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              name="breakfast"
              checked={record.breakfast}
              onChange={handleInputChange}
              className="w-5 h-5"
            />
            <label className={`text-lg font-medium ${theme.text}`}>
              {t('record.breakfast')}
            </label>
          </div>
          
          {record.breakfast && (
            <div className="space-y-3 ml-8">
              <div>
                <label className={`block text-sm ${theme.text}`}>
                  {t('record.appetite')}: {record.breakfastAppetite}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={record.breakfastAppetite}
                  onChange={(e) => handleSliderChange('breakfastAppetite', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className={`block text-sm ${theme.text}`}>
                  {t('record.content')}
                </label>
                <input
                  type="text"
                  name="breakfastContent"
                  value={record.breakfastContent}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('record.contentPlaceholder')}
                />
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              name="lunch"
              checked={record.lunch}
              onChange={handleInputChange}
              className="w-5 h-5"
            />
            <label className={`text-lg font-medium ${theme.text}`}>
              {t('record.lunch')}
            </label>
          </div>
          
          {record.lunch && (
            <div className="space-y-3 ml-8">
              <div>
                <label className={`block text-sm ${theme.text}`}>
                  {t('record.appetite')}: {record.lunchAppetite}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={record.lunchAppetite}
                  onChange={(e) => handleSliderChange('lunchAppetite', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className={`block text-sm ${theme.text}`}>
                  {t('record.content')}
                </label>
                <input
                  type="text"
                  name="lunchContent"
                  value={record.lunchContent}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('record.contentPlaceholder')}
                />
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              name="dinner"
              checked={record.dinner}
              onChange={handleInputChange}
              className="w-5 h-5"
            />
            <label className={`text-lg font-medium ${theme.text}`}>
              {t('record.dinner')}
            </label>
          </div>
          
          {record.dinner && (
            <div className="space-y-3 ml-8">
              <div>
                <label className={`block text-sm ${theme.text}`}>
                  {t('record.appetite')}: {record.dinnerAppetite}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={record.dinnerAppetite}
                  onChange={(e) => handleSliderChange('dinnerAppetite', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className={`block text-sm ${theme.text}`}>
                  {t('record.content')}
                </label>
                <input
                  type="text"
                  name="dinnerContent"
                  value={record.dinnerContent}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('record.contentPlaceholder')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="mealProvided"
            checked={record.mealProvided}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.mealProvided')}
          </label>
        </div>
      </div>
    </div>
  );

  const renderActivityInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.activityInfo')}</h3>
      
      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="exercise"
            checked={record.exercise}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.exercise')}
          </label>
        </div>
        
        {record.exercise && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.exerciseType')}
              </label>
              <input
                type="text"
                name="exerciseType"
                value={record.exerciseType}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('record.exerciseTypePlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.exerciseDuration')} ({t('common.minutes')})
              </label>
              <input
                type="number"
                name="exerciseDuration"
                value={record.exerciseDuration}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.steps')}
              </label>
              <input
                type="number"
                name="steps"
                value={record.steps}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="bathing"
            checked={record.bathing}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.bathing')}
          </label>
        </div>
        
        {record.bathing && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.bathingTime')}
              </label>
              <input
                type="time"
                name="bathingTime"
                value={record.bathingTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.bathingAssistance')}
              </label>
              <select
                name="bathingAssistance"
                value={record.bathingAssistance}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{t('common.select')}</option>
                <option value="independent">{t('record.independent')}</option>
                <option value="partial">{t('record.partialAssistance')}</option>
                <option value="full">{t('record.fullAssistance')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="washing"
            checked={record.washing}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`font-medium ${theme.text}`}>
            {t('record.washing')}
          </label>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="toothBrushing"
            checked={record.toothBrushing}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`font-medium ${theme.text}`}>
            {t('record.toothBrushing')}
          </label>
        </div>
      </div>
    </div>
  );

  const renderMedicationInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.medicationInfo')}</h3>
      
      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="morningMedication"
            checked={record.morningMedication}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.morningMedication')}
          </label>
        </div>
        
        {record.morningMedication && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationList')}
              </label>
              <textarea
                name="morningMedicationList"
                value={record.morningMedicationList}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={t('record.medicationListPlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationTime')}
              </label>
              <input
                type="time"
                name="morningMedicationTime"
                value={record.morningMedicationTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="noonMedication"
            checked={record.noonMedication}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.noonMedication')}
          </label>
        </div>
        
        {record.noonMedication && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationList')}
              </label>
              <textarea
                name="noonMedicationList"
                value={record.noonMedicationList}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={t('record.medicationListPlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationTime')}
              </label>
              <input
                type="time"
                name="noonMedicationTime"
                value={record.noonMedicationTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="eveningMedication"
            checked={record.eveningMedication}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.eveningMedication')}
          </label>
        </div>
        
        {record.eveningMedication && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationList')}
              </label>
              <textarea
                name="eveningMedicationList"
                value={record.eveningMedicationList}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={t('record.medicationListPlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationTime')}
              </label>
              <input
                type="time"
                name="eveningMedicationTime"
                value={record.eveningMedicationTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="bedtimeMedication"
            checked={record.bedtimeMedication}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.bedtimeMedication')}
          </label>
        </div>
        
        {record.bedtimeMedication && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationList')}
              </label>
              <textarea
                name="bedtimeMedicationList"
                value={record.bedtimeMedicationList}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={t('record.medicationListPlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationTime')}
              </label>
              <input
                type="time"
                name="bedtimeMedicationTime"
                value={record.bedtimeMedicationTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg ${theme.cardAlt}`}>
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            name="preMedication"
            checked={record.preMedication}
            onChange={handleInputChange}
            className="w-5 h-5"
          />
          <label className={`text-lg font-medium ${theme.text}`}>
            {t('record.preMedication')}
          </label>
        </div>
        
        {record.preMedication && (
          <div className="space-y-3 ml-8">
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.preMedicationReason')}
              </label>
              <input
                type="text"
                name="preMedicationReason"
                value={record.preMedicationReason}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('record.preMedicationReasonPlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationList')}
              </label>
              <textarea
                name="preMedicationList"
                value={record.preMedicationList}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder={t('record.medicationListPlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm ${theme.text}`}>
                {t('record.medicationTime')}
              </label>
              <input
                type="time"
                name="preMedicationTime"
                value={record.preMedicationTime}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderVitalInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.vitalInfo')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.bodyTemperature')} (°C)
          </label>
          <input
            type="text"
            name="bodyTemperature"
            value={record.bodyTemperature}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="36.5"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.bloodPressure')} (mmHg)
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              name="bloodPressureSystolic"
              value={record.bloodPressureSystolic}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="120"
            />
            <span className="mt-1 flex items-center">/</span>
            <input
              type="text"
              name="bloodPressureDiastolic"
              value={record.bloodPressureDiastolic}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="80"
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.pulse')} (bpm)
          </label>
          <input
            type="text"
            name="pulse"
            value={record.pulse}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="75"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${theme.text}`}>
            {t('record.spo2')} (%)
          </label>
          <input
            type="text"
            name="spo2"
            value={record.spo2}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="98"
          />
        </div>
      </div>
    </div>
  );

  const renderMoodInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.moodInfo')}</h3>
      
      <div>
        <label className={`block text-sm font-medium ${theme.text} mb-3`}>
          {t('record.emotionIcon')}: {record.emotionIcon}/10
        </label>
        <div className="flex items-center space-x-4">
          <span className="text-2xl">😢</span>
          <input
            type="range"
            min="1"
            max="10"
            value={record.emotionIcon}
            onChange={(e) => handleSliderChange('emotionIcon', parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-2xl">😊</span>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text} mb-3`}>
          {t('record.moodScore')}: {record.moodScore}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={record.moodScore}
          onChange={(e) => handleSliderChange('moodScore', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.moodDetail')}
        </label>
        <textarea
          name="moodDetail"
          value={record.moodDetail}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.moodDetailPlaceholder')}
        />
      </div>
    </div>
  );

  const renderNotesInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.notesInfo')}</h3>
      
      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.thoughts')}
        </label>
        <textarea
          name="thoughts"
          value={record.thoughts}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.thoughtsPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.feelings')}
        </label>
        <textarea
          name="feelings"
          value={record.feelings}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.feelingsPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.worries')}
        </label>
        <textarea
          name="worries"
          value={record.worries}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.worriesPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.concerns')}
        </label>
        <textarea
          name="concerns"
          value={record.concerns}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.concernsPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.consultation')}
        </label>
        <textarea
          name="consultation"
          value={record.consultation}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.consultationPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.contact')}
        </label>
        <textarea
          name="contact"
          value={record.contact}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.contactPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.report')}
        </label>
        <textarea
          name="report"
          value={record.report}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.reportPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.chat')}
        </label>
        <textarea
          name="chat"
          value={record.chat}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder={t('record.chatPlaceholder')}
        />
      </div>
    </div>
  );

  const renderEvaluationInfo = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme.text}`}>{t('record.evaluationInfo')}</h3>
      
      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.achievements')}
        </label>
        <textarea
          name="achievements"
          value={record.achievements}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={4}
          placeholder={t('record.achievementsPlaceholder')}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium ${theme.text}`}>
          {t('record.improvements')}
        </label>
        <textarea
          name="improvements"
          value={record.improvements}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={4}
          placeholder={t('record.improvementsPlaceholder')}
        />
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.background} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme.text}`}>
            {t('record.title')}
          </h1>
          <p className={`mt-2 ${theme.textSecondary}`}>
            {t('record.subtitle')}
          </p>
        </div>

        <div className={`${theme.card} rounded-lg shadow-lg`}>
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'basic'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.basicInfo')}
              </button>
              <button
                onClick={() => setActiveTab('meal')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'meal'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.mealInfo')}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'activity'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.activityInfo')}
              </button>
              <button
                onClick={() => setActiveTab('medication')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'medication'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.medicationInfo')}
              </button>
              <button
                onClick={() => setActiveTab('vital')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'vital'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.vitalInfo')}
              </button>
              <button
                onClick={() => setActiveTab('mood')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'mood'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.moodInfo')}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.notesInfo')}
              </button>
              <button
                onClick={() => setActiveTab('evaluation')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'evaluation'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : theme.textSecondary
                }`}
              >
                {t('record.evaluationInfo')}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'basic' && renderBasicInfo()}
            {activeTab === 'meal' && renderMealInfo()}
            {activeTab === 'activity' && renderActivityInfo()}
            {activeTab === 'medication' && renderMedicationInfo()}
            {activeTab === 'vital' && renderVitalInfo()}
            {activeTab === 'mood' && renderMoodInfo()}
            {activeTab === 'notes' && renderNotesInfo()}
            {activeTab === 'evaluation' && renderEvaluationInfo()}
          </div>

          <div className="border-t border-gray-200 p-6 flex justify-between items-center">
            {saveSuccess && (
              <div className="text-green-600 font-medium">
                {t('record.saveSuccess')}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-hx-post={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/daily-records`}
              data-hx-trigger="click"
              data-hx-swap="none"
            >
              {isSaving ? t('record.saving') : t('record.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRecordPage;