import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LanguageCode = 'ja' | 'en' | 'zh' | 'ko' | 'es' | 'hi' | 'ar' | 'bn' | 'fr' | 'ru' | 'pt' | 'id' | 'de' | 'tr' | 'vi' | 'it' | 'pl' | 'th' | 'uk' | 'my' | 'ne';

interface Translations {
  [key: string]: string | Translations;
}

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const translations: Record<LanguageCode, Translations> = {
  ja: {
    app: {
      title: 'WHALE',
      subtitle: '福祉・医療・行政・介護・教育統合管理システム',
      copyright: '© 2025 Hirotoshi Uchida. All rights reserved.'
    },
    common: {
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      add: '追加',
      search: '検索',
      filter: 'フィルター',
      export: 'エクスポート',
      import: 'インポート',
      next: '次へ',
      previous: '前へ',
      submit: '送信',
      close: '閉じる',
      select: '選択してください',
      optional: '(任意)',
      required: '(必須)',
      loading: '読み込み中...',
      minutes: '分'
    },
    role: {
      admin: '管理者',
      staff: '職員',
      user: '利用者'
    },
    login: {
      title: 'ログイン',
      userType: 'ユーザータイプ',
      facilityId: '施設機関ID',
      facilityIdPlaceholder: '施設機関IDを入力',
      userId: 'ユーザーID',
      userIdPlaceholder: 'ユーザーIDを入力',
      password: 'パスワード',
      passwordPlaceholder: 'パスワードを入力',
      submit: 'ログイン',
      submitting: 'ログイン中...',
      registerLink: '新規登録はこちら'
    },
    register: {
      title: '新規登録',
      subtitle: '施設・管理者情報を登録してください',
      step1Title: '施設情報',
      step2Title: '管理者情報',
      step3Title: 'アカウント情報',
      facilityInformation: '施設情報',
      facilityName: '施設名',
      facilityPostalCode: '施設郵便番号',
      facilityAddress: '施設住所',
      facilityPhone: '施設電話番号',
      facilityFoundedDate: '施設創設年月日',
      adminInformation: '管理者情報',
      adminName: '管理者名',
      adminNameKana: '管理者名（フリガナ）',
      adminPostalCode: '管理者郵便番号',
      adminAddress: '管理者住所',
      adminPhone: '管理者電話番号',
      adminBirthdate: '管理者誕生日',
      accountInformation: 'アカウント情報',
      facilityId: '施設機関ID',
      adminId: '管理者ID',
      adminPassword: '管理者パスワード',
      confirmPassword: 'パスワード確認',
      submit: '登録',
      submitting: '登録中...',
      loginLink: 'ログインはこちら',
      success: '登録が完了しました。ログインしてください。'
    },
    record: {
      title: '日常記録',
      subtitle: '日々の生活情報を記録します',
      basicInfo: '基本情報',
      mealInfo: '食事情報',
      activityInfo: '活動情報',
      medicationInfo: '服薬情報',
      vitalInfo: 'バイタル情報',
      moodInfo: '気分情報',
      notesInfo: '気付き・連絡',
      evaluationInfo: '評価',
      date: '日付',
      wakeUpTime: '起床時間',
      sleepTime: '就寝時間',
      arrivalTime: '通所時間',
      departureTime: '退所時間',
      breakfast: '朝食',
      lunch: '昼食',
      dinner: '夕食',
      appetite: '食欲レベル',
      content: '内容',
      contentPlaceholder: '食事内容を入力',
      mealProvided: '施設での食事提供',
      exercise: '運動',
      exerciseType: '運動種類',
      exerciseTypePlaceholder: 'ウォーキング、ストレッチなど',
      exerciseDuration: '運動時間',
      steps: '歩数',
      bathing: '入浴',
      bathingTime: '入浴時間',
      bathingAssistance: '介助レベル',
      independent: '自立',
      partialAssistance: '一部介助',
      fullAssistance: '全介助',
      washing: '洗面',
      toothBrushing: '歯磨き',
      morningMedication: '朝の服薬',
      noonMedication: '昼の服薬',
      eveningMedication: '夜の服薬',
      bedtimeMedication: '就寝前服薬',
      preMedication: '頓服',
      medicationList: '薬剤リスト',
      medicationListPlaceholder: '服薬した薬剤を入力',
      medicationTime: '服薬時刻',
      preMedicationReason: '頓服理由',
      preMedicationReasonPlaceholder: '頓服が必要だった理由を入力',
      bodyTemperature: '体温',
      bloodPressure: '血圧',
      pulse: '脈拍',
      spo2: 'SpO2',
      emotionIcon: '感情アイコン',
      moodScore: '気分スコア',
      moodDetail: '気分詳細',
      moodDetailPlaceholder: '今日の気分について詳しく記入',
      thoughts: '思った事',
      thoughtsPlaceholder: '今日思った事を記入',
      feelings: '感じた事',
      feelingsPlaceholder: '今日感じた事を記入',
      worries: '心配事',
      worriesPlaceholder: '心配な事があれば記入',
      concerns: '悩み事',
      concernsPlaceholder: '悩んでいる事があれば記入',
      consultation: '相談したい事',
      consultationPlaceholder: '相談したい事があれば記入',
      contact: '連絡したい事',
      contactPlaceholder: '連絡したい事があれば記入',
      report: '報告したい事',
      reportPlaceholder: '報告したい事があれば記入',
      chat: '雑談したい事',
      chatPlaceholder: '雑談したい事があれば記入',
      achievements: 'できた事',
      achievementsPlaceholder: '今日できた事を記入',
      improvements: 'より良くしたい事',
      improvementsPlaceholder: '改善したい事があれば記入',
      save: '保存',
      saving: '保存中...',
      saveSuccess: '保存しました'
    },
    error: {
      required: 'この項目は必須です',
      invalidEmail: 'メールアドレスの形式が正しくありません',
      invalidPhone: '電話番号の形式が正しくありません',
      invalidPostalCode: '郵便番号の形式が正しくありません',
      passwordMinLength: 'パスワードは8文字以上で入力してください',
      passwordMismatch: 'パスワードが一致しません',
      facilityIdMinLength: '施設機関IDは4文字以上で入力してください',
      adminIdMinLength: '管理者IDは4文字以上で入力してください',
      loginFailed: 'ログインに失敗しました',
      registrationFailed: '登録に失敗しました',
      saveFailed: '保存に失敗しました'
    }
  },
  en: {
    app: {
      title: 'WHALE',
      subtitle: 'Welfare, Healthcare, Administration, Long-term care, and Education',
      copyright: '© 2025 Hirotoshi Uchida. All rights reserved.'
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      close: 'Close',
      select: 'Please select',
      optional: '(Optional)',
      required: '(Required)',
      loading: 'Loading...',
      minutes: 'minutes'
    },
    role: {
      admin: 'Administrator',
      staff: 'Staff',
      user: 'User'
    },
    login: {
      title: 'Login',
      userType: 'User Type',
      facilityId: 'Facility ID',
      facilityIdPlaceholder: 'Enter facility ID',
      userId: 'User ID',
      userIdPlaceholder: 'Enter user ID',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      submit: 'Login',
      submitting: 'Logging in...',
      registerLink: 'Register here'
    },
    register: {
      title: 'Registration',
      subtitle: 'Register facility and administrator information',
      step1Title: 'Facility Info',
      step2Title: 'Admin Info',
      step3Title: 'Account Info',
      facilityInformation: 'Facility Information',
      facilityName: 'Facility Name',
      facilityPostalCode: 'Facility Postal Code',
      facilityAddress: 'Facility Address',
      facilityPhone: 'Facility Phone',
      facilityFoundedDate: 'Facility Founded Date',
      adminInformation: 'Administrator Information',
      adminName: 'Administrator Name',
      adminNameKana: 'Administrator Name (Kana)',
      adminPostalCode: 'Administrator Postal Code',
      adminAddress: 'Administrator Address',
      adminPhone: 'Administrator Phone',
      adminBirthdate: 'Administrator Birthdate',
      accountInformation: 'Account Information',
      facilityId: 'Facility ID',
      adminId: 'Administrator ID',
      adminPassword: 'Administrator Password',
      confirmPassword: 'Confirm Password',
      submit: 'Register',
      submitting: 'Registering...',
      loginLink: 'Login here',
      success: 'Registration completed. Please login.'
    },
    record: {
      title: 'Daily Record',
      subtitle: 'Record daily life information',
      basicInfo: 'Basic Info',
      mealInfo: 'Meal Info',
      activityInfo: 'Activity Info',
      medicationInfo: 'Medication Info',
      vitalInfo: 'Vital Info',
      moodInfo: 'Mood Info',
      notesInfo: 'Notes & Contact',
      evaluationInfo: 'Evaluation',
      date: 'Date',
      wakeUpTime: 'Wake Up Time',
      sleepTime: 'Sleep Time',
      arrivalTime: 'Arrival Time',
      departureTime: 'Departure Time',
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      appetite: 'Appetite Level',
      content: 'Content',
      contentPlaceholder: 'Enter meal content',
      mealProvided: 'Meal Provided at Facility',
      exercise: 'Exercise',
      exerciseType: 'Exercise Type',
      exerciseTypePlaceholder: 'Walking, stretching, etc.',
      exerciseDuration: 'Exercise Duration',
      steps: 'Steps',
      bathing: 'Bathing',
      bathingTime: 'Bathing Time',
      bathingAssistance: 'Assistance Level',
      independent: 'Independent',
      partialAssistance: 'Partial Assistance',
      fullAssistance: 'Full Assistance',
      washing: 'Washing',
      toothBrushing: 'Tooth Brushing',
      morningMedication: 'Morning Medication',
      noonMedication: 'Noon Medication',
      eveningMedication: 'Evening Medication',
      bedtimeMedication: 'Bedtime Medication',
      preMedication: 'PRN Medication',
      medicationList: 'Medication List',
      medicationListPlaceholder: 'Enter medications taken',
      medicationTime: 'Medication Time',
      preMedicationReason: 'PRN Reason',
      preMedicationReasonPlaceholder: 'Enter reason for PRN',
      bodyTemperature: 'Body Temperature',
      bloodPressure: 'Blood Pressure',
      pulse: 'Pulse',
      spo2: 'SpO2',
      emotionIcon: 'Emotion Icon',
      moodScore: 'Mood Score',
      moodDetail: 'Mood Details',
      moodDetailPlaceholder: 'Describe your mood today',
      thoughts: 'Thoughts',
      thoughtsPlaceholder: 'What you thought today',
      feelings: 'Feelings',
      feelingsPlaceholder: 'What you felt today',
      worries: 'Worries',
      worriesPlaceholder: 'Any worries',
      concerns: 'Concerns',
      concernsPlaceholder: 'Any concerns',
      consultation: 'Consultation',
      consultationPlaceholder: 'Things to consult',
      contact: 'Contact',
      contactPlaceholder: 'Things to contact',
      report: 'Report',
      reportPlaceholder: 'Things to report',
      chat: 'Chat',
      chatPlaceholder: 'Things to chat about',
      achievements: 'Achievements',
      achievementsPlaceholder: 'What you achieved today',
      improvements: 'Improvements',
      improvementsPlaceholder: 'Things to improve',
      save: 'Save',
      saving: 'Saving...',
      saveSuccess: 'Saved successfully'
    },
    error: {
      required: 'This field is required',
      invalidEmail: 'Invalid email format',
      invalidPhone: 'Invalid phone format',
      invalidPostalCode: 'Invalid postal code format',
      passwordMinLength: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      facilityIdMinLength: 'Facility ID must be at least 4 characters',
      adminIdMinLength: 'Admin ID must be at least 4 characters',
      loginFailed: 'Login failed',
      registrationFailed: 'Registration failed',
      saveFailed: 'Save failed'
    }
  },
  zh: {
    app: {
      title: 'WHALE',
      subtitle: '福利、医疗、行政、长期护理和教育',
      copyright: '© 2025 Hirotoshi Uchida. 版权所有。'
    },
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      add: '添加',
      search: '搜索',
      filter: '筛选',
      export: '导出',
      import: '导入',
      next: '下一步',
      previous: '上一步',
      submit: '提交',
      close: '关闭',
      select: '请选择',
      optional: '(可选)',
      required: '(必填)',
      loading: '加载中...',
      minutes: '分钟'
    },
    role: {
      admin: '管理员',
      staff: '职员',
      user: '用户'
    },
    login: {
      title: '登录',
      userType: '用户类型',
      facilityId: '设施ID',
      facilityIdPlaceholder: '输入设施ID',
      userId: '用户ID',
      userIdPlaceholder: '输入用户ID',
      password: '密码',
      passwordPlaceholder: '输入密码',
      submit: '登录',
      submitting: '登录中...',
      registerLink: '注册'
    },
    register: {
      title: '注册',
      subtitle: '注册设施和管理员信息',
      step1Title: '设施信息',
      step2Title: '管理员信息',
      step3Title: '账户信息',
      facilityInformation: '设施信息',
      facilityName: '设施名称',
      facilityPostalCode: '设施邮编',
      facilityAddress: '设施地址',
      facilityPhone: '设施电话',
      facilityFoundedDate: '设施成立日期',
      adminInformation: '管理员信息',
      adminName: '管理员姓名',
      adminNameKana: '管理员姓名（假名）',
      adminPostalCode: '管理员邮编',
      adminAddress: '管理员地址',
      adminPhone: '管理员电话',
      adminBirthdate: '管理员生日',
      accountInformation: '账户信息',
      facilityId: '设施ID',
      adminId: '管理员ID',
      adminPassword: '管理员密码',
      confirmPassword: '确认密码',
      submit: '注册',
      submitting: '注册中...',
      loginLink: '登录',
      success: '注册完成。请登录。'
    },
    record: {
      title: '日常记录',
      subtitle: '记录日常生活信息',
      basicInfo: '基本信息',
      mealInfo: '饮食信息',
      activityInfo: '活动信息',
      medicationInfo: '用药信息',
      vitalInfo: '生命体征',
      moodInfo: '情绪信息',
      notesInfo: '备注与联系',
      evaluationInfo: '评估',
      date: '日期',
      wakeUpTime: '起床时间',
      sleepTime: '睡觉时间',
      arrivalTime: '到达时间',
      departureTime: '离开时间',
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      appetite: '食欲水平',
      content: '内容',
      contentPlaceholder: '输入餐食内容',
      mealProvided: '设施提供的餐食',
      exercise: '运动',
      exerciseType: '运动类型',
      exerciseTypePlaceholder: '步行、伸展等',
      exerciseDuration: '运动时长',
      steps: '步数',
      bathing: '洗澡',
      bathingTime: '洗澡时间',
      bathingAssistance: '辅助级别',
      independent: '独立',
      partialAssistance: '部分辅助',
      fullAssistance: '完全辅助',
      washing: '洗脸',
      toothBrushing: '刷牙',
      morningMedication: '早晨用药',
      noonMedication: '中午用药',
      eveningMedication: '晚上用药',
      bedtimeMedication: '睡前用药',
      preMedication: 'PRN用药',
      medicationList: '药物列表',
      medicationListPlaceholder: '输入所服药物',
      medicationTime: '用药时间',
      preMedicationReason: 'PRN原因',
      preMedicationReasonPlaceholder: '输入PRN原因',
      bodyTemperature: '体温',
      bloodPressure: '血压',
      pulse: '脉搏',
      spo2: '血氧饱和度',
      emotionIcon: '情绪图标',
      moodScore: '情绪评分',
      moodDetail: '情绪详情',
      moodDetailPlaceholder: '描述您今天的情绪',
      thoughts: '想法',
      thoughtsPlaceholder: '您今天的想法',
      feelings: '感受',
      feelingsPlaceholder: '您今天的感受',
      worries: '担忧',
      worriesPlaceholder: '任何担忧',
      concerns: '顾虑',
      concernsPlaceholder: '任何顾虑',
      consultation: '咨询',
      consultationPlaceholder: '需要咨询的事项',
      contact: '联系',
      contactPlaceholder: '需要联系的事项',
      report: '报告',
      reportPlaceholder: '需要报告的事项',
      chat: '聊天',
      chatPlaceholder: '想聊的事情',
      achievements: '成就',
      achievementsPlaceholder: '您今天完成的事情',
      improvements: '改进',
      improvementsPlaceholder: '需要改进的事情',
      save: '保存',
      saving: '保存中...',
      saveSuccess: '保存成功'
    },
    error: {
      required: '此字段必填',
      invalidEmail: '电子邮件格式无效',
      invalidPhone: '电话格式无效',
      invalidPostalCode: '邮编格式无效',
      passwordMinLength: '密码至少8个字符',
      passwordMismatch: '密码不匹配',
      facilityIdMinLength: '设施ID至少4个字符',
      adminIdMinLength: '管理员ID至少4个字符',
      loginFailed: '登录失败',
      registrationFailed: '注册失败',
      saveFailed: '保存失败'
    }
  },
  ko: {
    app: {
      title: 'WHALE',
      subtitle: '복지, 의료, 행정, 장기요양 및 교육',
      copyright: '© 2025 Hirotoshi Uchida. 판권 소유.'
    },
    common: {
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '편집',
      add: '추가',
      search: '검색',
      filter: '필터',
      export: '내보내기',
      import: '가져오기',
      next: '다음',
      previous: '이전',
      submit: '제출',
      close: '닫기',
      select: '선택하세요',
      optional: '(선택)',
      required: '(필수)',
      loading: '로딩 중...',
      minutes: '분'
    },
    role: {
      admin: '관리자',
      staff: '직원',
      user: '사용자'
    },
    login: {
      title: '로그인',
      userType: '사용자 유형',
      facilityId: '시설 ID',
      facilityIdPlaceholder: '시설 ID 입력',
      userId: '사용자 ID',
      userIdPlaceholder: '사용자 ID 입력',
      password: '비밀번호',
      passwordPlaceholder: '비밀번호 입력',
      submit: '로그인',
      submitting: '로그인 중...',
      registerLink: '등록'
    },
    error: {
      required: '이 필드는 필수입니다',
      loginFailed: '로그인 실패',
      saveFailed: '저장 실패'
    }
  },
  es: { app: { title: 'WHALE' }, common: { save: 'Guardar' }, error: { required: 'Campo requerido' } },
  hi: { app: { title: 'WHALE' }, common: { save: 'सहेजें' }, error: { required: 'आवश्यक क्षेत्र' } },
  ar: { app: { title: 'WHALE' }, common: { save: 'حفظ' }, error: { required: 'حقل مطلوب' } },
  bn: { app: { title: 'WHALE' }, common: { save: 'সংরক্ষণ' }, error: { required: 'প্রয়োজনীয় ক্ষেত্র' } },
  fr: { app: { title: 'WHALE' }, common: { save: 'Enregistrer' }, error: { required: 'Champ requis' } },
  ru: { app: { title: 'WHALE' }, common: { save: 'Сохранить' }, error: { required: 'Обязательное поле' } },
  pt: { app: { title: 'WHALE' }, common: { save: 'Salvar' }, error: { required: 'Campo obrigatório' } },
  id: { app: { title: 'WHALE' }, common: { save: 'Simpan' }, error: { required: 'Bidang wajib' } },
  de: { app: { title: 'WHALE' }, common: { save: 'Speichern' }, error: { required: 'Pflichtfeld' } },
  tr: { app: { title: 'WHALE' }, common: { save: 'Kaydet' }, error: { required: 'Gerekli alan' } },
  vi: { app: { title: 'WHALE' }, common: { save: 'Lưu' }, error: { required: 'Trường bắt buộc' } },
  it: { app: { title: 'WHALE' }, common: { save: 'Salva' }, error: { required: 'Campo obbligatorio' } },
  pl: { app: { title: 'WHALE' }, common: { save: 'Zapisz' }, error: { required: 'Pole wymagane' } },
  th: { app: { title: 'WHALE' }, common: { save: 'บันทึก' }, error: { required: 'ช่องที่จำเป็น' } },
  uk: { app: { title: 'WHALE' }, common: { save: 'Зберегти' }, error: { required: "Обов'язкове поле" } },
  my: { app: { title: 'WHALE' }, common: { save: 'သိမ်းဆည်းပါ' }, error: { required: 'လိုအပ်သောနေရာ' } },
  ne: { app: { title: 'WHALE' }, common: { save: 'बचत गर्नुहोस्' }, error: { required: 'आवश्यक क्षेत्र' } }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('ja');

  useEffect(() => {
    const storedLanguage = localStorage.getItem('whale_language') as LanguageCode;
    if (storedLanguage && translations[storedLanguage]) {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('whale_language', lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};