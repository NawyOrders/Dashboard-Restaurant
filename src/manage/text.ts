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
