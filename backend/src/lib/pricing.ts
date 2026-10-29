import prisma from './prisma';

export type PricingPackageId = 'starter' | 'growth' | 'pro' | 'enterprise';

export type PricingPackage = {
  id: PricingPackageId;
  name: string;
  monthlyFee: number | null;
  revenueSharePct: number | null;
  videoQuotaGb: number | null;
  note: string;
  highlighted?: boolean;
};

export type PricingPromo = {
  enabled: boolean;
  freeMonths: number;
  label: string;
  note: string;
};

export type CommerceDurationValue = '1' | '3' | '6' | '12' | '18' | '24' | '30' | '36' | 'lifetime';

export type CommercePriceOption = {
  durationMonths: CommerceDurationValue;
  price: string;
  compareAt: string;
  enabled: boolean;
};

export type CommercePromotionOption = {
  id: string;
  label: string;
  durationMonths: CommerceDurationValue;
  discountPercent: string;
  note: string;
  enabled: boolean;
};

export type CommerceCouponOption = {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'free_months';
  value: string;
  durationMonths: CommerceDurationValue;
  note: string;
  enabled: boolean;
};

export type CommerceConfig = {
  currency: string;
  priceOptions: CommercePriceOption[];
  showPublic: boolean;
  allowPromotions: boolean;
  promotionOptions: CommercePromotionOption[];
  couponOptions: CommerceCouponOption[];
};

export type TutorPricingOverride = {
  tenantSlug: string;
  tenantName: string;
  packageId: PricingPackageId;
  monthlyFee: number | null;
  revenueSharePct: number | null;
  videoQuotaGb: number | null;
  promoFreeMonths: number;
  note: string;
  updatedAt: string;
  updatedBy: string;
};

export type PricingConfig = {
  updatedAt: string;
  defaults: {
    promo: PricingPromo;
    packages: PricingPackage[];
    commerce: CommerceConfig;
  };
  overrides: TutorPricingOverride[];
};

export type EffectiveTutorPricing = {
  packageId: PricingPackageId;
  package: PricingPackage;
  promoFreeMonths: number;
  promoEnabled: boolean;
  renewalIntervalMonths: number;
};

const PRICING_KEY = 'default';

const DEFAULT_COMMERCE_DURATIONS: CommerceDurationValue[] = ['1', '3', '6', '12', '18', '24', '30', '36', 'lifetime'];

export const DEFAULT_COMMERCE_CONFIG: CommerceConfig = {
  currency: 'THB',
  priceOptions: DEFAULT_COMMERCE_DURATIONS.map((durationMonths, index) => ({
    durationMonths,
    price: '',
    compareAt: '',
    enabled: index === 0,
  })),
  showPublic: true,
  allowPromotions: true,
  promotionOptions: [
    {
      id: 'launch',
      label: 'โปรโมชันเปิดตัว',
      durationMonths: '3',
      discountPercent: '10',
      note: 'ใช้กับแคมเปญเปิดขายรอบแรก',
      enabled: true,
    },
    {
      id: 'midyear',
      label: 'Mid-year sale',
      durationMonths: '6',
      discountPercent: '15',
      note: 'ใช้กับรอบกลางปี',
      enabled: false,
    },
    {
      id: 'annual',
      label: 'Annual push',
      durationMonths: '12',
      discountPercent: '20',
      note: 'ใช้กับแพ็กยาวที่ต้องการเร่งปิดการขาย',
      enabled: false,
    },
  ],
  couponOptions: [
    {
      id: 'welcome10',
      code: 'WELCOME10',
      type: 'percent',
      value: '10',
      durationMonths: '3',
      note: 'คูปองส่วนลด % สำหรับลูกค้าใหม่',
      enabled: true,
    },
    {
      id: 'save500',
      code: 'SAVE500',
      type: 'fixed',
      value: '500',
      durationMonths: '12',
      note: 'คูปองลดเป็นจำนวนเงินบาท',
      enabled: false,
    },
    {
      id: 'bonusmonth',
      code: 'BONUS1M',
      type: 'free_months',
      value: '1',
      durationMonths: '6',
      note: 'แถมเดือนเรียนเพิ่ม',
      enabled: false,
    },
  ],
};

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  updatedAt: new Date(0).toISOString(),
  defaults: {
    promo: {
      enabled: true,
      freeMonths: 3,
      label: 'ฟรีค่าบริการ 3 เดือนแรก',
      note: 'Owner สามารถปรับโปรโมชันนี้ได้จาก Growth',
    },
    commerce: { ...DEFAULT_COMMERCE_CONFIG, priceOptions: DEFAULT_COMMERCE_CONFIG.priceOptions.map((item) => ({ ...item })), promotionOptions: DEFAULT_COMMERCE_CONFIG.promotionOptions.map((item) => ({ ...item })), couponOptions: DEFAULT_COMMERCE_CONFIG.couponOptions.map((item) => ({ ...item })) },
    packages: [
      {
        id: 'starter',
        name: 'Starter',
        monthlyFee: 490,
        revenueSharePct: 18,
        videoQuotaGb: 30,
        note: 'เหมาะกับ tutor ที่เพิ่งเริ่มขายคอร์ส',
      },
      {
        id: 'growth',
        name: 'Growth',
        monthlyFee: 990,
        revenueSharePct: 15,
        videoQuotaGb: 100,
        note: 'เหมาะกับ tutor ที่เริ่มมีนักเรียนประจำ',
        highlighted: true,
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyFee: 1900,
        revenueSharePct: 12,
        videoQuotaGb: 200,
        note: 'เหมาะกับ tutor ที่มี catalog และ revenue สม่ำเสมอ',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyFee: null,
        revenueSharePct: null,
        videoQuotaGb: null,
        note: 'คุยเองตามข้อตกลงรายองค์กร',
      },
    ],
  },
  overrides: [],
};

function cloneDefaultConfig(): PricingConfig {
  return {
    updatedAt: DEFAULT_PRICING_CONFIG.updatedAt,
    defaults: {
      promo: { ...DEFAULT_PRICING_CONFIG.defaults.promo },
      commerce: {
        ...DEFAULT_COMMERCE_CONFIG,
        priceOptions: DEFAULT_COMMERCE_CONFIG.priceOptions.map((item) => ({ ...item })),
        promotionOptions: DEFAULT_COMMERCE_CONFIG.promotionOptions.map((item) => ({ ...item })),
        couponOptions: DEFAULT_COMMERCE_CONFIG.couponOptions.map((item) => ({ ...item })),
      },
      packages: DEFAULT_PRICING_CONFIG.defaults.packages.map((item) => ({ ...item })),
    },
    overrides: [],
  };
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function normalizeDurationValue(value: unknown, fallback: CommerceDurationValue = '1'): CommerceDurationValue {
  const normalized = String(value || '').trim() as CommerceDurationValue;
  return DEFAULT_COMMERCE_DURATIONS.includes(normalized) ? normalized : fallback;
}

function normalizeCommerceConfig(input: Partial<CommerceConfig> | undefined): CommerceConfig {
  const fallback = DEFAULT_COMMERCE_CONFIG;
  return {
    currency: String(input?.currency || fallback.currency).trim().toUpperCase() || fallback.currency,
    showPublic: Boolean(input?.showPublic ?? fallback.showPublic),
    allowPromotions: Boolean(input?.allowPromotions ?? fallback.allowPromotions),
    priceOptions: (input?.priceOptions?.length ? input.priceOptions : fallback.priceOptions).map((item, index) => ({
      durationMonths: normalizeDurationValue(item.durationMonths, fallback.priceOptions[index]?.durationMonths || '1'),
      price: String(item.price || ''),
      compareAt: String(item.compareAt || ''),
      enabled: Boolean(item.enabled),
    })),
    promotionOptions: (input?.promotionOptions?.length ? input.promotionOptions : fallback.promotionOptions).map((item, index) => ({
      id: String(item.id || fallback.promotionOptions[index]?.id || `promo-${index + 1}`),
      label: String(item.label || fallback.promotionOptions[index]?.label || ''),
      durationMonths: normalizeDurationValue(item.durationMonths, fallback.promotionOptions[index]?.durationMonths || '3'),
      discountPercent: String(item.discountPercent || ''),
      note: String(item.note || ''),
      enabled: Boolean(item.enabled),
    })),
    couponOptions: (input?.couponOptions?.length ? input.couponOptions : fallback.couponOptions).map((item, index) => ({
      id: String(item.id || fallback.couponOptions[index]?.id || `coupon-${index + 1}`),
      code: String(item.code || '').trim().toUpperCase(),
      type: item.type === 'fixed' || item.type === 'free_months' ? item.type : 'percent',
      value: String(item.value || ''),
      durationMonths: normalizeDurationValue(item.durationMonths, fallback.couponOptions[index]?.durationMonths || '3'),
      note: String(item.note || ''),
      enabled: Boolean(item.enabled),
    })),
  };
}

function normalizePackage(input: Partial<PricingPackage> & { id: PricingPackageId }): PricingPackage {
  const fallback = DEFAULT_PRICING_CONFIG.defaults.packages.find((item) => item.id === input.id) || DEFAULT_PRICING_CONFIG.defaults.packages[0];
  return {
    id: input.id,
    name: String(input.name || fallback.name),
    monthlyFee: toNullableNumber(input.monthlyFee) ?? fallback.monthlyFee,
    revenueSharePct: toNullableNumber(input.revenueSharePct) ?? fallback.revenueSharePct,
    videoQuotaGb: toNullableNumber(input.videoQuotaGb) ?? fallback.videoQuotaGb,
    note: String(input.note || fallback.note),
    highlighted: Boolean(input.highlighted ?? fallback.highlighted),
  };
}

function normalizeConfig(input: Partial<PricingConfig>): PricingConfig {
  const fallback = cloneDefaultConfig();
  const packages = (input.defaults?.packages || fallback.defaults.packages).map((item) => normalizePackage(item as Partial<PricingPackage> & { id: PricingPackageId }));
  const packageById = new Map(packages.map((item) => [item.id, item] as const));
  const overrides = (input.overrides || [])
    .map((item) => {
      const packageId = item.packageId || 'starter';
      const base = packageById.get(packageId) || packageById.get('starter') || fallback.defaults.packages[0];
      return {
        tenantSlug: String(item.tenantSlug || '').trim().toLowerCase(),
        tenantName: String(item.tenantName || '').trim(),
        packageId,
        monthlyFee: toNullableNumber(item.monthlyFee) ?? base.monthlyFee,
        revenueSharePct: toNullableNumber(item.revenueSharePct) ?? base.revenueSharePct,
        videoQuotaGb: toNullableNumber(item.videoQuotaGb) ?? base.videoQuotaGb,
        promoFreeMonths: toPositiveInteger(item.promoFreeMonths, fallback.defaults.promo.freeMonths),
        note: String(item.note || '').trim(),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
        updatedBy: String(item.updatedBy || 'owner'),
      };
    })
    .filter((item) => item.tenantSlug.length > 0);

  const promo = {
    enabled: Boolean(input.defaults?.promo?.enabled ?? fallback.defaults.promo.enabled),
    freeMonths: toPositiveInteger(input.defaults?.promo?.freeMonths, fallback.defaults.promo.freeMonths),
    label: String(input.defaults?.promo?.label || fallback.defaults.promo.label),
    note: String(input.defaults?.promo?.note || fallback.defaults.promo.note),
  };
  const commerce = normalizeCommerceConfig(input.defaults?.commerce);

  return {
    updatedAt: String(input.updatedAt || new Date().toISOString()),
    defaults: {
      promo,
      commerce,
      packages,
    },
    overrides,
  };
}

export function normalizeCommercePayload(payload: unknown): CommerceConfig {
  if (!payload || typeof payload !== 'object') {
    return normalizeCommerceConfig(undefined);
  }
  return normalizeCommerceConfig(payload as Partial<CommerceConfig>);
}

function normalizeConfigPayload(payload: unknown): PricingConfig {
  if (!payload || typeof payload !== 'object') {
    return cloneDefaultConfig();
  }
  return normalizeConfig(payload as Partial<PricingConfig>);
}

export async function loadPricingConfig(): Promise<PricingConfig> {
  try {
    const row = await prisma.platformPricingConfig.findUnique({ where: { key: PRICING_KEY } });
    if (!row) {
      const defaultConfig = cloneDefaultConfig();
      await prisma.platformPricingConfig.create({
        data: {
          key: PRICING_KEY,
          payload: defaultConfig,
        },
      });
      return defaultConfig;
    }
    return normalizeConfigPayload(row.payload);
  } catch {
    return cloneDefaultConfig();
  }
}

export async function savePricingConfig(input: Partial<PricingConfig>): Promise<PricingConfig> {
  const normalized = normalizeConfig({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  await prisma.platformPricingConfig.upsert({
    where: { key: PRICING_KEY },
    create: {
      key: PRICING_KEY,
      payload: normalized,
    },
    update: {
      payload: normalized,
    },
  });
  return normalized;
}

export function getPricingPackage(config: PricingConfig, packageId?: PricingPackageId | string | null) {
  const resolvedId = (packageId || 'starter') as PricingPackageId;
  return config.defaults.packages.find((item) => item.id === resolvedId) || config.defaults.packages.find((item) => item.id === 'starter') || config.defaults.packages[0];
}

export function getEffectiveTutorPricing(
  config: PricingConfig,
  tenantSlug?: string | null,
  packageId?: PricingPackageId | string | null,
): EffectiveTutorPricing {
  const normalizedSlug = String(tenantSlug || '').trim().toLowerCase();
  const override = normalizedSlug ? config.overrides.find((item) => item.tenantSlug === normalizedSlug) : null;
  const resolvedPackageId = (override?.packageId || packageId || 'starter') as PricingPackageId;
  const resolvedPackage = override
    ? {
        ...getPricingPackage(config, resolvedPackageId),
        monthlyFee: override.monthlyFee,
        revenueSharePct: override.revenueSharePct,
        videoQuotaGb: override.videoQuotaGb,
      }
    : getPricingPackage(config, resolvedPackageId);
  const promoEnabled = config.defaults.promo.enabled;
  const promoFreeMonths = override?.promoFreeMonths ?? config.defaults.promo.freeMonths;
  return {
    packageId: resolvedPackage.id,
    package: resolvedPackage,
    promoFreeMonths,
    promoEnabled,
    renewalIntervalMonths: promoEnabled ? Math.max(1, promoFreeMonths) : 1,
  };
}
