import { ReviewStatus, VerificationState } from '../../shared/types/enums';
import { containsControlOrFormatCharacter } from '../../pages/card/services/profile-label-safety';

type ViewerMode = 'SELF' | 'FRIEND' | 'STRANGER';
type CardTheme = 'ivory' | 'ink' | 'champagne' | 'stone';

interface LocalizedLabelInput {
  readonly zh?: unknown;
  readonly en?: unknown;
}

interface VerificationClaimInput {
  readonly claimId?: unknown;
  readonly labelText?: LocalizedLabelInput;
  readonly reviewStatus?: unknown;
  readonly verificationState?: unknown;
  readonly publicVisible?: unknown;
  readonly validFrom?: unknown;
  readonly validUntil?: unknown;
}

interface PublicCardInput {
  readonly displayName?: unknown;
  readonly headline?: unknown;
  readonly cityId?: unknown;
  readonly avatarUrl?: unknown;
  readonly biography?: unknown;
  readonly claims?: unknown;
}

interface FieldInput {
  readonly key?: unknown;
  readonly label?: unknown;
  readonly value?: unknown;
}

interface RenderClaim {
  readonly key: string;
  readonly label: string;
  readonly reviewStatus: typeof ReviewStatus.APPROVED;
  readonly verificationState: typeof VerificationState.HUMAN_REVIEWED;
}

interface RenderField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

interface RenderGalleryItem {
  readonly key: string;
  readonly url: string;
  readonly failed: boolean;
}

interface RenderCard {
  readonly displayName: string;
  readonly headline: string;
  readonly cityId: string;
  readonly avatarUrl: string;
  readonly biography: string;
}

const VIEWER_LABELS: Readonly<Record<ViewerMode, string>> = {
  SELF: '本人视角',
  FRIEND: '好友视角',
  STRANGER: '访客视角',
};

const CARD_THEMES = new Set<CardTheme>(['ivory', 'ink', 'champagne', 'stone']);

const FIELD_LABELS: Readonly<Record<string, string>> = {
  education: '教育',
  profession: '职业',
  industry: '行业',
  company: '公司',
  position: '职位',
  experience: '经历',
  interests: '兴趣',
  phone: '电话',
  email: '邮箱',
};

const ALLOWED_CARD_FIELD_KEYS = new Set(Object.keys(FIELD_LABELS));
const PUBLIC_CONTACT_FIELD_KEYS = new Set(['phone', 'email']);

const EMPTY_CARD: RenderCard = {
  displayName: '',
  headline: '',
  cityId: '',
  avatarUrl: '',
  biography: '',
};

function safeText(value: unknown, maximumLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';
}

function safeMediaUrl(value: unknown, allowLocalTemporary: boolean = false): string {
  const candidate = safeText(value, 2048);
  if (/^(?:https:\/\/|cloud:\/\/)/i.test(candidate)) return candidate;
  if (allowLocalTemporary && /^(?:wxfile:\/\/|http:\/\/tmp\/)/i.test(candidate)) return candidate;
  return '';
}

function normalizeTheme(value: unknown): CardTheme {
  const candidate = safeText(value, 16).toLowerCase() as CardTheme;
  return CARD_THEMES.has(candidate) ? candidate : 'ivory';
}

function displayInitial(displayName: string): string {
  return Array.from(displayName)[0] ?? 'AB';
}

function claimIsCurrentlyValid(claim: VerificationClaimInput, now: number): boolean {
  if (
    claim.reviewStatus !== ReviewStatus.APPROVED ||
    claim.verificationState !== VerificationState.HUMAN_REVIEWED ||
    claim.publicVisible !== true
  ) {
    return false;
  }

  const validFrom = typeof claim.validFrom === 'string' ? Date.parse(claim.validFrom) : Number.NaN;
  if (!Number.isFinite(validFrom) || validFrom > now) return false;

  if (claim.validUntil !== undefined) {
    const validUntil = typeof claim.validUntil === 'string' ? Date.parse(claim.validUntil) : Number.NaN;
    if (!Number.isFinite(validUntil) || validUntil <= now) return false;
  }

  return true;
}

function normalizeClaims(value: unknown): RenderClaim[] {
  if (!Array.isArray(value)) return [];
  const now = Date.now();

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const claim = entry as VerificationClaimInput;
    if (!claimIsCurrentlyValid(claim, now)) return [];

    const label = safeText(claim.labelText?.zh, 48) || safeText(claim.labelText?.en, 64);
    if (!label) return [];

    return [{
      key: safeText(claim.claimId, 96) || `claim-${index}`,
      label,
      reviewStatus: ReviewStatus.APPROVED,
      verificationState: VerificationState.HUMAN_REVIEWED,
    }];
  });
}

function normalizeFieldValue(value: unknown): string {
  if (typeof value === 'string') return safeText(value, 400);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => safeText(item, 60))
      .filter(Boolean)
      .slice(0, 8)
      .join(' · ');
  }
  return '';
}

function normalizeFields(value: unknown, allowPublicContacts: boolean = false): RenderField[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const field = entry as FieldInput;
    const key = safeText(field.key, 48);
    if (!ALLOWED_CARD_FIELD_KEYS.has(key)) return [];
    if (PUBLIC_CONTACT_FIELD_KEYS.has(key) && !allowPublicContacts) return [];

    const displayValue = normalizeFieldValue(field.value);
    if (!displayValue) return [];

    return [{
      key,
      label: safeText(field.label, 32) || FIELD_LABELS[key] || key,
      value: displayValue,
    }];
  });
}

function normalizeOwnerLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return safeText(entry, 48);
      if (!entry || typeof entry !== 'object') return '';
      const label = entry as { readonly label?: unknown; readonly labelText?: LocalizedLabelInput };
      return (
        safeText(label.label, 48) ||
        safeText(label.labelText?.zh, 48) ||
        safeText(label.labelText?.en, 64)
      );
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeSelectedLabels(value: unknown): string[] {
  const seen = new Set<string>();
  return normalizeOwnerLabels(value).filter((label) => {
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

function normalizePublicLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const label = entry.trim();
    if (!label || containsControlOrFormatCharacter(label) || Array.from(label).length > 10) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length === 5) break;
  }
  return labels;
}

function normalizeGallery(value: unknown, viewerMode: ViewerMode): RenderGalleryItem[] {
  if (viewerMode !== 'SELF' || !Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: RenderGalleryItem[] = [];

  for (const entry of value) {
    const url = safeMediaUrl(entry, true);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({ key: `gallery-${result.length}`, url, failed: false });
    if (result.length === 4) break;
  }

  return result;
}

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared',
  },
  properties: {
    card: { type: Object, value: null },
    viewerMode: { type: String, value: 'STRANGER' },
    cityLabel: { type: String, value: '' },
    fields: { type: Array, value: [] },
    allowPublicContacts: { type: Boolean, value: false },
    pendingLabels: { type: Array, value: [] },
    rejectedLabels: { type: Array, value: [] },
    selectedLabels: { type: Array, value: [] },
    publicLabels: { type: Array, value: [] },
    galleryUrls: { type: Array, value: [] },
    theme: { type: String, value: 'ivory' },
    maxVisibleClaims: { type: Number, value: 4 },
    showDefaultActions: { type: Boolean, value: true },
  },
  data: {
    safeCard: EMPTY_CARD,
    hasCard: false,
    avatarInitial: 'AB',
    avatarFailed: false,
    brandFailed: false,
    safeFields: [] as RenderField[],
    safeClaims: [] as RenderClaim[],
    safePendingLabels: [] as string[],
    safeRejectedLabels: [] as string[],
    safeSelectedLabels: [] as string[],
    safePublicLabels: [] as string[],
    safeGallery: [] as RenderGalleryItem[],
    safeTheme: 'ivory' as CardTheme,
    claimsExpanded: false,
    claimWindow: 4,
    safeViewerMode: 'STRANGER' as ViewerMode,
    viewerLabel: VIEWER_LABELS.STRANGER,
    isSelf: false,
  },
  observers: {
    card() {
      this.syncCard();
    },
    'fields, allowPublicContacts'(value: unknown, allowPublicContacts: boolean) {
      this.setData({ safeFields: normalizeFields(value, allowPublicContacts === true) });
    },
    'pendingLabels, rejectedLabels'(pendingLabels: unknown, rejectedLabels: unknown) {
      this.setData({
        safePendingLabels: normalizeOwnerLabels(pendingLabels),
        safeRejectedLabels: normalizeOwnerLabels(rejectedLabels),
      });
    },
    'selectedLabels, galleryUrls'(selectedLabels: unknown, galleryUrls: unknown) {
      this.syncCustomization(this.data.safeViewerMode, selectedLabels, galleryUrls);
    },
    publicLabels(value: unknown) {
      this.setData({ safePublicLabels: normalizePublicLabels(value) });
    },
    theme(value: unknown) {
      this.setData({ safeTheme: normalizeTheme(value) });
    },
    viewerMode(value: string) {
      this.syncViewer(value);
    },
    maxVisibleClaims(value: number) {
      const numeric = Number.isFinite(value) ? Math.floor(value) : 4;
      this.setData({ claimWindow: Math.max(1, Math.min(12, numeric)) });
    },
  },
  lifetimes: {
    attached() {
      this.syncViewer(this.properties.viewerMode);
      this.setData({
        safeTheme: normalizeTheme(this.properties.theme),
        safeFields: normalizeFields(this.properties.fields, this.properties.allowPublicContacts === true),
        safePublicLabels: normalizePublicLabels(this.properties.publicLabels),
      });
    },
  },
  methods: {
    syncCard(forcedViewerMode?: ViewerMode) {
      const input = (this.properties.card ?? {}) as PublicCardInput;
      const displayName = safeText(input.displayName, 120);
      const viewerMode = forcedViewerMode ?? this.data.safeViewerMode;
      const nextCard: RenderCard = {
        displayName,
        headline: safeText(input.headline, 160),
        cityId: safeText(input.cityId, 96),
        avatarUrl: safeMediaUrl(input.avatarUrl, viewerMode === 'SELF'),
        biography: safeText(input.biography, 1200),
      };
      const avatarChanged = nextCard.avatarUrl !== this.data.safeCard.avatarUrl;

      this.setData({
        safeCard: nextCard,
        hasCard: Boolean(displayName),
        avatarInitial: displayInitial(displayName),
        safeClaims: normalizeClaims(input.claims),
        claimsExpanded: false,
        ...(avatarChanged ? { avatarFailed: false } : {}),
      });
    },
    syncCustomization(
      forcedViewerMode?: ViewerMode,
      selectedLabels?: unknown,
      galleryUrls?: unknown,
    ) {
      const viewerMode = forcedViewerMode ?? this.data.safeViewerMode;
      const rawSelectedLabels = selectedLabels === undefined ? this.properties.selectedLabels : selectedLabels;
      const rawGalleryUrls = galleryUrls === undefined ? this.properties.galleryUrls : galleryUrls;
      this.setData({
        safeSelectedLabels: viewerMode === 'SELF' ? normalizeSelectedLabels(rawSelectedLabels) : [],
        safeGallery: normalizeGallery(rawGalleryUrls, viewerMode),
      });
    },
    syncViewer(value: string) {
      const viewerMode: ViewerMode = value === 'SELF' || value === 'FRIEND' ? value : 'STRANGER';
      this.setData({
        safeViewerMode: viewerMode,
        viewerLabel: VIEWER_LABELS[viewerMode],
        isSelf: viewerMode === 'SELF',
      });
      this.syncCard(viewerMode);
      this.syncCustomization(viewerMode);
    },
    handleAvatarError() {
      if (this.data.avatarFailed) return;
      this.setData({ avatarFailed: true });
      this.triggerEvent('avatarerror');
    },
    handleBrandError() {
      if (this.data.brandFailed) return;
      this.setData({ brandFailed: true });
    },
    handleGalleryError(event: WechatMiniprogram.BaseEvent) {
      const index = Number(event.currentTarget.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= this.data.safeGallery.length) return;
      if (this.data.safeGallery[index]?.failed) return;
      this.setData({ [`safeGallery[${index}].failed`]: true });
      this.triggerEvent('galleryerror', { index });
    },
    handleClaimsToggle() {
      const expanded = !this.data.claimsExpanded;
      this.setData({ claimsExpanded: expanded });
      this.triggerEvent('claimstoggle', {
        expanded,
        visibleCount: expanded ? this.data.safeClaims.length : this.data.claimWindow,
        totalCount: this.data.safeClaims.length,
      });
    },
    handleEdit() {
      if (!this.data.isSelf) return;
      this.triggerEvent('edit');
    },
    handleShare() {
      if (!this.data.isSelf) return;
      this.triggerEvent('share');
    },
    handleRetry() {
      this.triggerEvent('retry');
    },
  },
});
