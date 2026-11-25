import type { Lang } from '../i18n'

// Copy for the management screens, one block per module.
export type ManageCopy = {
  hubTitle: string
  hubSubtitle: string
  back: string
  save: string
  cancel: string
  delete: string
  confirmDelete: string
  edit: string
  loading: string
  loadError: string
  retry: string
  saveError: string
  noAccess: string
  saved: string
  deleted: string
  branches: {
    title: string
    subtitle: string
    add: string
    edit: string
    empty: string
    statuses: { Open: string; TemporarilyClosed: string }
    primary: string
    inactive: string
    nameAr: string
    nameEn: string
    address: string
    phone: string
    latitude: string
    longitude: string
    status: string
    active: string
    makePrimary: string
    sortOrder: string
    hours: string
    closed: string
    opens: string
    closes: string
    nextDay: string
    days: Record<string, string>
    invalid: string
    delivery: string
    deliverySub: string
    baseFee: string
    feePerKm: string
    maxRadius: string
    maxRadiusHint: string
    saveDelivery: string
  }
  payments: {
    title: string
    subtitle: string
    methods: Record<string, string>
    enabled: string
    needsProof: string
    proofLocked: string
    cashLocked: string
    nameAr: string
    nameEn: string
    account: string
    instructionsAr: string
    instructionsEn: string
    invalid: string
    save: string
  }
  staff: {
    title: string
    subtitle: string
    invite: string
    empty: string
    fullName: string
    email: string
    phone: string
    role: string
    branches: string
    statuses: Record<string, string>
    resend: string
    resent: string
    invited: string
    changeRole: string
    invalid: string
    owner: string
  }
  categories: {
    title: string
    subtitle: string
    add: string
    addSub: string
    edit: string
    empty: string
    nameAr: string
    nameEn: string
    items: string
    subcategories: string
    noSubs: string
    moveUp: string
    moveDown: string
    inactive: string
    invalid: string
    hasChildren: string
  }
  items: {
    title: string
    subtitle: string
    add: string
    edit: string
    empty: string
    noCategories: string
    category: string
    nameAr: string
    nameEn: string
    descAr: string
    descEn: string
    price: string
    visible: string
    image: string
    removeImage: string
    sizes: string
    addSize: string
    sizeNameAr: string
    sizeNameEn: string
    sizeDefault: string
    sizesNote: string
    descNote: string
    invalid: string
    uploadError: string
    hidden: string
  }
  roles: {
    title: string
    subtitle: string
    add: string
    edit: string
    empty: string
    kinds: Record<string, string>
    staffCount: string
    permissionsCount: string
    name: string
    description: string
    permissions: string
    invalid: string
    protectedNote: string
  }
  offers: {
    title: string
    subtitle: string
    add: string
    edit: string
    empty: string
    all: string
    kinds: { SingleItem: string; Combo: string }
    statuses: { Active: string; Scheduled: string; Expired: string; Inactive: string }
    kind: string
    status: string
    titleAr: string
    titleEn: string
    descriptionAr: string
    descriptionEn: string
    image: string
    imageHint: string
    imageRequired: string
    uploadError: string
    items: string
    addItem: string
    quantity: string
    price: string
    starts: string
    ends: string
    active: string
    notify: string
    invalid: string
    saves: string
    original: string
    toggled: string
  }
}

const ar: ManageCopy = {
  hubTitle: 'الإدارة',
  hubSubtitle: 'أدوات إدارة المطعم',
  back: 'رجوع',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  confirmDelete: 'تأكيد الحذف',
  edit: 'تعديل',
  loading: 'جارٍ التحميل…',
  loadError: 'تعذر تحميل البيانات.',
  retry: 'إعادة المحاولة',
  saveError: 'تعذر الحفظ. راجع البيانات وحاول مرة أخرى.',
  noAccess: 'ليس لديك صلاحية لهذه الصفحة.',
  saved: 'تم الحفظ',
  deleted: 'تم الحذف',
  branches: {
    title: 'الفروع',
    subtitle: 'الفروع وساعات العمل ورسوم التوصيل',
    add: 'إضافة فرع',
    edit: 'تعديل الفرع',
    empty: 'لا توجد فروع بعد.',
    statuses: { Open: 'مفتوح', TemporarilyClosed: 'مغلق مؤقتاً' },
    primary: 'الفرع الرئيسي',
    inactive: 'غير مفعل',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    address: 'العنوان',
    phone: 'الهاتف',
    latitude: 'خط العرض',
    longitude: 'خط الطول',
    status: 'الحالة',
    active: 'الفرع مفعل',
    makePrimary: 'جعله الفرع الرئيسي',
    sortOrder: 'الترتيب',
    hours: 'ساعات العمل',
    closed: 'مغلق',
    opens: 'يفتح',
    closes: 'يغلق',
    nextDay: 'اليوم التالي',
    days: { Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت' },
    invalid: 'تحقق من الحقول: الأسماء والعنوان وساعات العمل.',
    delivery: 'رسوم التوصيل',
    deliverySub: 'تنطبق على كل الفروع',
    baseFee: 'رسوم التوصيل الأساسية',
    feePerKm: 'رسوم لكل كيلومتر',
    maxRadius: 'أقصى نطاق توصيل (كم)',
    maxRadiusHint: 'اتركه فارغاً لعدم وضع حد',
    saveDelivery: 'حفظ رسوم التوصيل',
  },
  payments: {
    title: 'وسائل الدفع',
    subtitle: 'فعّل وسائل الدفع واضبط الحساب والتعليمات للعميل',
    methods: { Cash: 'الدفع عند الاستلام', InstaPay: 'إنستا باي', MobileWallet: 'المحفظة الإلكترونية' },
    enabled: 'مفعلة',
    needsProof: 'تتطلب إثبات الدفع',
    proofLocked: 'الدفع الإلكتروني يتطلب إثباتاً دائماً',
    cashLocked: 'الدفع النقدي مفعل دائماً ولا يتطلب حساباً',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    account: 'رقم الحساب أو المحفظة',
    instructionsAr: 'تعليمات العميل بالعربية',
    instructionsEn: 'تعليمات العميل بالإنجليزية',
    invalid: 'تحقق من الحقول: الأسماء مطلوبة والتعليمات حتى 500 حرف.',
    save: 'حفظ الوسيلة',
  },
  staff: {
    title: 'الموظفون',
    subtitle: 'ادعُ الموظفين وغيّر أدوارهم',
    invite: 'دعوة موظف',
    empty: 'لا يوجد موظفون بعد.',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    role: 'الدور',
    branches: 'الفروع',
    statuses: { Active: 'نشط', Inactive: 'غير نشط', PendingInvitation: 'في انتظار التفعيل' },
    resend: 'إعادة إرسال الدعوة',
    resent: 'تمت إعادة إرسال الدعوة',
    invited: 'تم إرسال الدعوة',
    changeRole: 'تغيير الدور',
    invalid: 'تحقق من الحقول: الاسم والبريد صحيحان واختر الدور وفرعاً واحداً على الأقل.',
    owner: 'المالك',
  },
  categories: {
    title: 'أقسام القائمة',
    subtitle: 'أنشئ أقسام القائمة وأقسامها الفرعية ورتّبها',
    add: 'إضافة قسم',
    addSub: 'إضافة قسم فرعي',
    edit: 'تعديل القسم',
    empty: 'لا توجد أقسام بعد. أضف أول قسم.',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    items: 'صنف',
    subcategories: 'الأقسام الفرعية',
    noSubs: 'لا توجد أقسام فرعية',
    moveUp: 'تحريك لأعلى',
    moveDown: 'تحريك لأسفل',
    inactive: 'غير نشط',
    invalid: 'الاسم بالعربية والإنجليزية مطلوب (حتى 200 حرف).',
    hasChildren: 'احذف الأقسام الفرعية أولاً.',
  },
  items: {
    title: 'أصناف القائمة',
    subtitle: 'أضف أصناف القائمة وعدّل بياناتها وأسعارها',
    add: 'إضافة صنف',
    edit: 'تعديل الصنف',
    empty: 'لا توجد أصناف بعد.',
    noCategories: 'أضف قسماً أولاً من شاشة أقسام القائمة.',
    category: 'القسم',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    descAr: 'الوصف بالعربية',
    descEn: 'الوصف بالإنجليزية',
    price: 'السعر الأساسي',
    visible: 'ظاهر للعملاء',
    image: 'صورة الصنف',
    removeImage: 'حذف الصورة',
    sizes: 'الأحجام',
    addSize: 'إضافة حجم',
    sizeNameAr: 'اسم الحجم بالعربية',
    sizeNameEn: 'اسم الحجم بالإنجليزية',
    sizeDefault: 'افتراضي',
    sizesNote: 'الأحجام الحالية تبقى كما هي عند التعديل.',
    descNote: 'الخادم لا يرسل الوصف مع القائمة، لذلك الحفظ يستبدل الوصف بما تكتبه هنا.',
    invalid: 'اختر القسم، واكتب الاسمين بالعربية والإنجليزية وسعراً صحيحاً، وأحجاماً صحيحة بدون تكرار.',
    uploadError: 'تعذّر رفع الصورة. استخدم JPEG أو PNG أو WebP.',
    hidden: 'مخفي',
  },
  roles: {
    title: 'الأدوار والصلاحيات',
    subtitle: 'أنشئ أدواراً مخصصة وحدد صلاحيات كل دور (للمالك فقط)',
    add: 'إضافة دور',
    edit: 'تعديل الدور',
    empty: 'لا توجد أدوار.',
    kinds: { Owner: 'المالك', Seeded: 'أساسي', Custom: 'مخصص' },
    staffCount: 'موظفون',
    permissionsCount: 'صلاحية',
    name: 'اسم الدور',
    description: 'الوصف',
    permissions: 'الصلاحيات',
    invalid: 'اسم الدور مطلوب (حتى 100 حرف) والوصف حتى 500 حرف.',
    protectedNote: 'هذا دور محمي ولا يمكن تعديله.',
  },
  offers: {
    title: 'العروض',
    subtitle: 'عروض الأصناف والكومبو',
    add: 'إضافة عرض',
    edit: 'تعديل العرض',
    empty: 'لا توجد عروض بعد.',
    all: 'الكل',
    kinds: { SingleItem: 'صنف واحد', Combo: 'كومبو' },
    statuses: { Active: 'نشط', Scheduled: 'مجدول', Expired: 'منتهي', Inactive: 'متوقف' },
    kind: 'النوع',
    status: 'الحالة',
    titleAr: 'العنوان بالعربية',
    titleEn: 'العنوان بالإنجليزية',
    descriptionAr: 'الوصف بالعربية',
    descriptionEn: 'الوصف بالإنجليزية',
    image: 'صورة العرض',
    imageHint: 'JPEG أو PNG أو WebP حتى 5 ميجابايت',
    imageRequired: 'اختر صورة للعرض.',
    uploadError: 'تعذر رفع الصورة.',
    items: 'الأصناف',
    addItem: 'إضافة صنف',
    quantity: 'الكمية',
    price: 'سعر العرض',
    starts: 'يبدأ في',
    ends: 'ينتهي في',
    active: 'العرض مفعل',
    notify: 'إشعار العملاء',
    invalid: 'تحقق من الحقول: السعر وتواريخ العرض والأصناف.',
    saves: 'توفير',
    original: 'السعر الأصلي',
    toggled: 'تم تحديث حالة العرض',
  },
}

const en: ManageCopy = {
  hubTitle: 'Management',
  hubSubtitle: 'Tools to run the restaurant',
  back: 'Back',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  confirmDelete: 'Confirm delete',
  edit: 'Edit',
  loading: 'Loading…',
  loadError: 'Could not load the data.',
  retry: 'Retry',
  saveError: 'Could not save. Check the fields and try again.',
  noAccess: 'You do not have access to this page.',
  saved: 'Saved',
  deleted: 'Deleted',
  branches: {
    title: 'Branches',
    subtitle: 'Branches, working hours and delivery fees',
    add: 'Add branch',
    edit: 'Edit branch',
    empty: 'No branches yet.',
    statuses: { Open: 'Open', TemporarilyClosed: 'Temporarily closed' },
    primary: 'Primary branch',
    inactive: 'Inactive',
    nameAr: 'Name (Arabic)',
    nameEn: 'Name (English)',
    address: 'Address',
    phone: 'Phone',
    latitude: 'Latitude',
    longitude: 'Longitude',
    status: 'Status',
    active: 'Branch is active',
    makePrimary: 'Make primary branch',
    sortOrder: 'Sort order',
    hours: 'Working hours',
    closed: 'Closed',
    opens: 'Opens',
    closes: 'Closes',
    nextDay: 'Next day',
    days: { Sunday: 'Sunday', Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday', Thursday: 'Thursday', Friday: 'Friday', Saturday: 'Saturday' },
    invalid: 'Check the fields: names, address and working hours.',
    delivery: 'Delivery fees',
    deliverySub: 'Applies to all branches',
    baseFee: 'Base delivery fee',
    feePerKm: 'Fee per km',
    maxRadius: 'Max delivery radius (km)',
    maxRadiusHint: 'Leave empty for no limit',
    saveDelivery: 'Save delivery fees',
  },
  payments: {
    title: 'Payment methods',
    subtitle: 'Turn payment methods on and set the account and customer instructions',
    methods: { Cash: 'Cash on delivery', InstaPay: 'InstaPay', MobileWallet: 'Mobile wallet' },
    enabled: 'Enabled',
    needsProof: 'Requires payment proof',
    proofLocked: 'Electronic payments always require proof',
    cashLocked: 'Cash is always on and needs no account',
    nameAr: 'Name (Arabic)',
    nameEn: 'Name (English)',
    account: 'Account or wallet number',
    instructionsAr: 'Customer instructions (Arabic)',
    instructionsEn: 'Customer instructions (English)',
    invalid: 'Check the fields: names are required and instructions are up to 500 characters.',
    save: 'Save method',
  },
  staff: {
    title: 'Staff',
    subtitle: 'Invite staff and change their roles',
    invite: 'Invite staff',
    empty: 'No staff yet.',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
    branches: 'Branches',
    statuses: { Active: 'Active', Inactive: 'Inactive', PendingInvitation: 'Pending activation' },
    resend: 'Resend invitation',
    resent: 'Invitation resent',
    invited: 'Invitation sent',
    changeRole: 'Change role',
    invalid: 'Check the fields: valid name and email, pick a role and at least one branch.',
    owner: 'Owner',
  },
  categories: {
    title: 'Menu categories',
    subtitle: 'Create menu categories and subcategories and put them in order',
    add: 'Add category',
    addSub: 'Add subcategory',
    edit: 'Edit category',
    empty: 'No categories yet. Add the first one.',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    items: 'items',
    subcategories: 'Subcategories',
    noSubs: 'No subcategories',
    moveUp: 'Move up',
    moveDown: 'Move down',
    inactive: 'Inactive',
    invalid: 'Arabic and English names are required (up to 200 characters).',
    hasChildren: 'Delete its subcategories first.',
  },
  items: {
    title: 'Menu items',
    subtitle: 'Add menu items and edit their details and prices',
    add: 'Add item',
    edit: 'Edit item',
    empty: 'No items yet.',
    noCategories: 'Add a category first from the Menu categories screen.',
    category: 'Category',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    descAr: 'Arabic description',
    descEn: 'English description',
    price: 'Base price',
    visible: 'Visible to customers',
    image: 'Item image',
    removeImage: 'Remove image',
    sizes: 'Sizes',
    addSize: 'Add size',
    sizeNameAr: 'Size name (Arabic)',
    sizeNameEn: 'Size name (English)',
    sizeDefault: 'Default',
    sizesNote: 'Existing sizes stay as they are when you edit.',
    descNote: 'The server does not send descriptions with the menu list, so saving replaces them with what you type here.',
    invalid: 'Pick a category, write both names and a valid price, and use valid sizes without duplicates.',
    uploadError: 'Could not upload the image. Use JPEG, PNG or WebP.',
    hidden: 'Hidden',
  },
  roles: {
    title: 'Roles and permissions',
    subtitle: 'Create custom roles and choose what each role can do (Owner only)',
    add: 'Add role',
    edit: 'Edit role',
    empty: 'No roles.',
    kinds: { Owner: 'Owner', Seeded: 'Built in', Custom: 'Custom' },
    staffCount: 'staff',
    permissionsCount: 'permissions',
    name: 'Role name',
    description: 'Description',
    permissions: 'Permissions',
    invalid: 'Role name is required (up to 100 characters) and the description up to 500.',
    protectedNote: 'This is a protected role and cannot be changed.',
  },
  offers: {
    title: 'Offers',
    subtitle: 'Single-item offers and combos',
    add: 'Add offer',
    edit: 'Edit offer',
    empty: 'No offers yet.',
    all: 'All',
    kinds: { SingleItem: 'Single item', Combo: 'Combo' },
    statuses: { Active: 'Active', Scheduled: 'Scheduled', Expired: 'Expired', Inactive: 'Inactive' },
    kind: 'Type',
    status: 'Status',
    titleAr: 'Title (Arabic)',
    titleEn: 'Title (English)',
    descriptionAr: 'Description (Arabic)',
    descriptionEn: 'Description (English)',
    image: 'Offer image',
    imageHint: 'JPEG, PNG or WebP up to 5 MB',
    imageRequired: 'Choose an image for the offer.',
    uploadError: 'Could not upload the image.',
    items: 'Items',
    addItem: 'Add item',
    quantity: 'Qty',
    price: 'Offer price',
    starts: 'Starts',
    ends: 'Ends',
    active: 'Offer is active',
    notify: 'Notify customers',
    invalid: 'Check the fields: price, offer dates and items.',
    saves: 'Save',
    original: 'Original price',
    toggled: 'Offer status updated',
  },
}

export const manageCopy: Record<Lang, ManageCopy> = { ar, en }
