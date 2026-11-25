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
