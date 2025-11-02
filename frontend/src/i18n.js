import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common
      welcome: 'Welcome',
      email: 'Email',
      password: 'Password',
      username: 'Username',
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      language: 'Language',
      
      // Login Page
      loginTitle: 'Login to Your Account',
      loginSubtitle: 'Enter your credentials to access your account',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      signupLink: 'Sign up here',
      
      // Signup Page
      signupTitle: 'Create New Account',
      signupSubtitle: 'Fill in the details to create your account',
      confirmPassword: 'Confirm Password',
      alreadyHaveAccount: 'Already have an account?',
      loginLink: 'Login here',
      
      // Dashboard
      dashboardTitle: 'Dashboard',
      welcomeBack: 'Welcome back',
      
      // Validation Messages
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      usernameRequired: 'Username is required',
      passwordMinLength: 'Password must be at least 6 characters',
      passwordMismatch: 'Passwords do not match',
      
      // Success/Error Messages
      loginSuccess: 'Login successful!',
      signupSuccess: 'Account created successfully!',
      loginError: 'Invalid email or password',
      signupError: 'Failed to create account',
      emailExists: 'Email already registered',
      usernameExists: 'Username already taken',
      
      // Resources
      resources: 'Resources',
      myResources: 'My AWS Resources',
      addResource: 'Add Resource',
      editResource: 'Edit Resource',
      deleteResource: 'Delete Resource',
      resourceName: 'Resource Name',
      resourceType: 'Resource Type',
      region: 'Region',
      dependencies: 'Dependencies',
      description: 'Description',
      createdAt: 'Created At',
      actions: 'Actions',
      noResources: 'No resources found. Create your first resource!',
      confirmDelete: 'Are you sure you want to delete this resource?',
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      resourceCreated: 'Resource created successfully!',
      resourceUpdated: 'Resource updated successfully!',
      resourceDeleted: 'Resource deleted successfully!',
      resourceError: 'Failed to process resource',
      loading: 'Loading...',
      
      // AWS Resource Types
      ec2: 'EC2 Instance',
      s3: 'S3 Bucket',
      rds: 'RDS Database',
      lambda: 'Lambda Function',
      vpc: 'VPC',
      elb: 'Load Balancer',
      cloudfront: 'CloudFront Distribution',
      route53: 'Route 53 Zone',
      dynamodb: 'DynamoDB Table',
      sns: 'SNS Topic',
      sqs: 'SQS Queue',
      
      // AWS Regions
      usEast1: 'US East (N. Virginia)',
      usEast2: 'US East (Ohio)',
      usWest1: 'US West (N. California)',
      usWest2: 'US West (Oregon)',
      euWest1: 'EU (Ireland)',
      euCentral1: 'EU (Frankfurt)',
      apSoutheast1: 'Asia Pacific (Singapore)',
      apNortheast1: 'Asia Pacific (Tokyo)',
      
      // AI Insights
      aiInsights: 'AI Insights',
      autoGenerateSummary: 'Auto-Generate Summary',
      autoSummaryDescription: 'Generate comprehensive architecture analysis with AI',
      generateSummary: 'Generate Summary',
      customPrompt: 'Custom Analysis',
      quickPrompts: 'Quick Prompts',
      promptPlaceholder: 'Ask AI about your architecture... (e.g., "How can I improve security?")',
      analyzeButton: 'Analyze',
      analyzing: 'Analyzing',
      generating: 'Generating',
      analysisResults: 'Analysis Results',
      architectureSummary: 'Architecture Summary',
      costOptimization: 'Cost Optimization',
      securityRecommendations: 'Security Recommendations',
      bestPractices: 'Best Practices',
      totalResources: 'Total Resources',
      downloadPDF: 'Download as PDF',
      explainArchitecture: 'Explain my architecture',
      suggestImprovements: 'Suggest improvements',
      costOptimizationTips: 'Cost optimization tips',
      securityAudit: 'Security audit',
      analysisComplete: 'Analysis completed successfully!',
      summaryGenerated: 'Summary generated successfully!',
      pdfDownloaded: 'PDF downloaded successfully!',
      promptRequired: 'Please enter a prompt',
      analysisError: 'Failed to analyze architecture',
      summaryError: 'Failed to generate summary',
      pdfError: 'Failed to generate PDF',
      noContentToDownload: 'No content to download',
      aiServiceUnavailable: 'AI service is unavailable. Please check API configuration.',
      aiEmptyState: 'No Analysis Yet',
      aiEmptyStateDescription: 'Generate a summary or ask a custom question to get AI-powered insights.',
      customAnalysis: 'Custom Analysis',
    }
  },
  ar: {
    translation: {
      // Common
      welcome: 'مرحباً',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      username: 'اسم المستخدم',
      login: 'تسجيل الدخول',
      signup: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      language: 'اللغة',
      
      // Login Page
      loginTitle: 'تسجيل الدخول إلى حسابك',
      loginSubtitle: 'أدخل بيانات الاعتماد للوصول إلى حسابك',
      rememberMe: 'تذكرني',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب؟',
      signupLink: 'سجل هنا',
      
      // Signup Page
      signupTitle: 'إنشاء حساب جديد',
      signupSubtitle: 'املأ التفاصيل لإنشاء حسابك',
      confirmPassword: 'تأكيد كلمة المرور',
      alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
      loginLink: 'سجل دخولك هنا',
      
      // Dashboard
      dashboardTitle: 'لوحة التحكم',
      welcomeBack: 'مرحباً بعودتك',
      
      // Validation Messages
      emailRequired: 'البريد الإلكتروني مطلوب',
      passwordRequired: 'كلمة المرور مطلوبة',
      usernameRequired: 'اسم المستخدم مطلوب',
      passwordMinLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      
      // Success/Error Messages
      loginSuccess: 'تم تسجيل الدخول بنجاح!',
      signupSuccess: 'تم إنشاء الحساب بنجاح!',
      loginError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      signupError: 'فشل في إنشاء الحساب',
      emailExists: 'البريد الإلكتروني مسجل بالفعل',
      usernameExists: 'اسم المستخدم مستخدم بالفعل',
      
      // Resources
      resources: 'الموارد',
      myResources: 'موارد AWS الخاصة بي',
      addResource: 'إضافة مورد',
      editResource: 'تعديل المورد',
      deleteResource: 'حذف المورد',
      resourceName: 'اسم المورد',
      resourceType: 'نوع المورد',
      region: 'المنطقة',
      dependencies: 'التبعيات',
      description: 'الوصف',
      createdAt: 'تاريخ الإنشاء',
      actions: 'الإجراءات',
      noResources: 'لا توجد موارد. أنشئ أول مورد لك!',
      confirmDelete: 'هل أنت متأكد من حذف هذا المورد؟',
      cancel: 'إلغاء',
      save: 'حفظ',
      edit: 'تعديل',
      delete: 'حذف',
      close: 'إغلاق',
      resourceCreated: 'تم إنشاء المورد بنجاح!',
      resourceUpdated: 'تم تحديث المورد بنجاح!',
      resourceDeleted: 'تم حذف المورد بنجاح!',
      resourceError: 'فشل في معالجة المورد',
      loading: 'جارِ التحميل...',
      
      // AWS Resource Types
      ec2: 'مثيل EC2',
      s3: 'حاوية S3',
      rds: 'قاعدة بيانات RDS',
      lambda: 'دالة Lambda',
      vpc: 'VPC',
      elb: 'موازن التحميل',
      cloudfront: 'توزيع CloudFront',
      route53: 'منطقة Route 53',
      dynamodb: 'جدول DynamoDB',
      sns: 'موضوع SNS',
      sqs: 'قائمة انتظار SQS',
      
      // AWS Regions
      usEast1: 'شرق الولايات المتحدة (فيرجينيا)',
      usEast2: 'شرق الولايات المتحدة (أوهايو)',
      usWest1: 'غرب الولايات المتحدة (كاليفورنيا)',
      usWest2: 'غرب الولايات المتحدة (أوريغون)',
      euWest1: 'أوروبا (أيرلندا)',
      euCentral1: 'أوروبا (فرانكفورت)',
      apSoutheast1: 'آسيا والمحيط الهادئ (سنغافورة)',
      apNortheast1: 'آسيا والمحيط الهادئ (طوكيو)',
      
      // AI Insights
      aiInsights: 'رؤى الذكاء الاصطناعي',
      autoGenerateSummary: 'إنشاء ملخص تلقائي',
      autoSummaryDescription: 'إنشاء تحليل شامل للبنية التحتية باستخدام الذكاء الاصطناعي',
      generateSummary: 'إنشاء ملخص',
      customPrompt: 'تحليل مخصص',
      quickPrompts: 'استفسارات سريعة',
      promptPlaceholder: 'اسأل الذكاء الاصطناعي عن بنيتك التحتية... (مثال: "كيف يمكنني تحسين الأمان؟")',
      analyzeButton: 'تحليل',
      analyzing: 'جاري التحليل',
      generating: 'جاري الإنشاء',
      analysisResults: 'نتائج التحليل',
      architectureSummary: 'ملخص البنية التحتية',
      costOptimization: 'تحسين التكلفة',
      securityRecommendations: 'توصيات الأمان',
      bestPractices: 'أفضل الممارسات',
      totalResources: 'إجمالي الموارد',
      downloadPDF: 'تحميل كملف PDF',
      explainArchitecture: 'اشرح بنيتي التحتية',
      suggestImprovements: 'اقترح تحسينات',
      costOptimizationTips: 'نصائح لتحسين التكلفة',
      securityAudit: 'تدقيق أمني',
      analysisComplete: 'اكتمل التحليل بنجاح!',
      summaryGenerated: 'تم إنشاء الملخص بنجاح!',
      pdfDownloaded: 'تم تحميل ملف PDF بنجاح!',
      promptRequired: 'الرجاء إدخال استفسار',
      analysisError: 'فشل تحليل البنية التحتية',
      summaryError: 'فشل إنشاء الملخص',
      pdfError: 'فشل إنشاء ملف PDF',
      noContentToDownload: 'لا يوجد محتوى للتحميل',
      aiServiceUnavailable: 'خدمة الذكاء الاصطناعي غير متاحة. يرجى التحقق من إعدادات API.',
      aiEmptyState: 'لا يوجد تحليل بعد',
      aiEmptyStateDescription: 'قم بإنشاء ملخص أو اسأل سؤالاً مخصصاً للحصول على رؤى مدعومة بالذكاء الاصطناعي.',
      customAnalysis: 'تحليل مخصص',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
