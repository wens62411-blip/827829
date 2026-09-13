import { CITY_DIRECTORY, type CityId } from '../../../shared/constants/geography';
import type { ProfileUpdateInput } from '../../../shared/contracts';
import type { MediaAssetId, UtcInstant } from '../../../shared/types/primitives';
import type { ProfilePrivateDto } from '../../../shared/types/projections';
import {
  bootstrapIdentity,
  createCardShare,
  getMyPublicCard,
  getMyProfile,
  getRuntimeEvidence,
  refreshMyCard,
  updateMyProfile,
} from '../../../pages/card/services/identity-client';
import { cityDisplayName, isSafeShareBearer, safeShareTitle, shareExpiry } from '../../../pages/card/services/card-presenter';
import { OFFLINE_DEMO_PROFILE, isOfflineDemo } from '../../../pages/card/services/offline-demo';
import {
  readCardThemePreference,
  writeCardThemePreference,
  type CardTheme,
} from '../../../pages/card/services/card-theme-preference';
import {
  MAX_PROFILE_LABELS,
  addProfileLabel,
  normalizeProfileLabels,
  readOfflineDemoDraft,
  writeOfflineDemoDraft,
} from '../../../pages/card/services/offline-demo-draft';
import {
  buildLocalIdentitySharePath,
  buildOfflineDemoSharePath,
  createLocalIdentityShareSnapshot,
  createOfflineDemoShareSnapshot,
} from '../../../pages/card/services/offline-demo-share-snapshot';
import { prepareNativeShareCardCover } from '../../../pages/card/services/native-share-card';
import { isSafeShareTokenId, rememberShareForRevocation, wasShareRevokedForSession } from '../../../pages/card/services/share-revocation-pointer';
import {
  LOCAL_IDENTITY_CONTRACT_VERSION,
  hasLocalIdentity,
  readLocalIdentity,
  saveLocalIdentity,
  type LocalIdentity,
} from '../../../pages/card/services/local-identity';

type EditorMode = 'PREVIEW' | 'EDIT';

interface DraftInput {
  readonly displayName: string;
  readonly biography: string;
  readonly cityIndex: number;
  readonly profession: string;
  readonly selectedLabels: readonly string[];
  readonly phone: string;
  readonly email: string;
  readonly showPhone: boolean;
  readonly showEmail: boolean;
  readonly avatarUrl: string;
}

const CITY_NAMES = CITY_DIRECTORY.map((city) => `${city.name.zh} · ${city.name.en}`);
const CITY_IDS = CITY_DIRECTORY.map((city) => city.id);
const LOCAL_DISPLAY_NAME_LIMIT = 24;
const LOCAL_PROFESSION_LIMIT = 32;
const LOCAL_BIOGRAPHY_LIMIT = 72;
const BRAND_SHARE_COVER = '/assets/brand/ab-club-brand-share.jpg';
const UNAVAILABLE_SHARE = { title: 'AB Club 数字名片', path: '/pages/card-share/index?invalid=1', imageUrl: BRAND_SHARE_COVER };
type NativeShareResult = { title: string; path: string; imageUrl: string };

const IDENTITY_LABELS = [
  '海归',
  '985/211',
  'MBA',
  '创始人',
  '企业家',
  '接班二代',
  '投资人',
  '知名博主',
] as const;

const INTEREST_LABELS = [
  '艺术家',
  '收藏家',
  '艺术爱好者',
  '古董爱好者',
  '珍珠爱好者',
  '红酒品鉴',
  '高尔夫',
  '旅行爱好者',
  '读书爱好者',
  '电影爱好者',
  '美食爱好者',
  '音乐爱好者',
] as const;

const PROFILE_LABEL_SET = new Set<string>([...IDENTITY_LABELS, ...INTEREST_LABELS]);

const THEMES: ReadonlyArray<{ readonly value: CardTheme; readonly label: string }> = [
  { value: 'ivory', label: '象牙白' },
  { value: 'ink', label: '墨黑' },
  { value: 'champagne', label: '香槟金' },
  { value: 'stone', label: '石灰灰' },
];

function compactDraftText(value: string, maximumLength: number): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maximumLength);
}

function normalizeDraftPhone(value: string): string {
  const candidate = compactDraftText(value, 24);
  return candidate.length >= 6 && /^\+?[0-9](?:[0-9 ()-]*[0-9])$/.test(candidate)
    ? candidate
    : '';
}

function normalizeDraftEmail(value: string): string {
  const candidate = compactDraftText(value, 72);
  if (!candidate || /\s/.test(candidate)) return '';
  const parts = candidate.split('@');
  return parts.length === 2
    && Boolean(parts[0])
    && /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(parts[1] ?? '')
    ? candidate
    : '';
}

function uniqueLabels(values: readonly string[]): string[] {
  return normalizeProfileLabels(values);
}

function showShareToast(title: string): void {
  if (typeof wx.showToast !== 'function') return;
  wx.showToast({
    title,
    icon: 'none',
    duration: 2400,
  });
}

function makeTagOptions(values: readonly string[], selectedLabels: readonly string[]) {
  const selected = new Set(selectedLabels);
  return values.map((label) => ({ label, selected: selected.has(label) }));
}

function makeThemeOptions(theme: CardTheme) {
  return THEMES.map((item) => ({ ...item, selected: item.value === theme }));
}

function displayInitial(displayName: string): string {
  return Array.from(compactDraftText(displayName, 60))[0] ?? 'AB';
}

function makePreview(draft: DraftInput) {
  const cityId = draft.cityIndex >= 0 ? CITY_IDS[draft.cityIndex] : undefined;
  const profession = compactDraftText(draft.profession, 80);
  const phone = normalizeDraftPhone(draft.phone);
  const email = normalizeDraftEmail(draft.email);
  return {
    previewCard: {
      displayName: compactDraftText(draft.displayName, 60) || '你的名字',
      headline: profession || '你的一句话身份',
      cityId: cityId ?? '',
      biography: draft.biography.trim() || '写下你的经历、关注方向，或希望认识怎样的人。',
      avatarUrl: draft.avatarUrl,
      claims: [],
    },
    previewCityLabel: cityDisplayName(cityId),
    previewFields: [
      ...(draft.showPhone && phone ? [{ key: 'phone', label: '电话', value: phone }] : []),
      ...(draft.showEmail && email ? [{ key: 'email', label: '邮箱', value: email }] : []),
    ],
    previewInitial: displayInitial(draft.displayName),
    identityTagOptions: makeTagOptions(IDENTITY_LABELS, draft.selectedLabels),
    interestTagOptions: makeTagOptions(INTEREST_LABELS, draft.selectedLabels),
  };
}

const EMPTY_DRAFT: DraftInput = {
  displayName: '',
  biography: '',
  cityIndex: -1,
  profession: '',
  selectedLabels: [],
  phone: '',
  email: '',
  showPhone: false,
  showEmail: false,
  avatarUrl: '',
};

Page({
  openedForRegistration: false,
  editorPageUnloaded: true,
  saveOperationGeneration: 0,
  pendingNativeShare: undefined as Promise<NativeShareResult> | undefined,
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    localIdentityReady: false,
    registerMode: false,
    profile: null as ProfilePrivateDto | null,
    creatingProfile: false,
    saveAndShareBusy: false,
    shareDraftValid: false,
    brandLogoFailed: false,
    status: 'LOADING' as 'LOADING' | 'READY' | 'SAVING' | 'ERROR' | 'SAVED' | 'PROJECTION_PENDING',
    message: '',
    editorMode: 'PREVIEW' as EditorMode,
    cardTheme: 'ivory' as CardTheme,
    themeOptions: makeThemeOptions('ivory'),
    displayName: '',
    biography: '',
    biographyLength: 0,
    profession: '',
    selectedLabels: [] as string[],
    phone: '',
    email: '',
    showPhone: false,
    showEmail: false,
    contactMessage: '',
    galleryImages: [] as string[],
    showTags: true,
    showGallery: true,
    previewSelectedLabels: [] as string[],
    previewPublicLabels: [] as string[],
    previewGalleryImages: [] as string[],
    customLabelInput: '',
    tagMessage: '',
    galleryNote: '',
    ...makePreview(EMPTY_DRAFT),
    cityNames: CITY_NAMES,
    cityIndex: -1,
    localAvatarPath: '',
    localAvatarUsable: false,
    avatarDraftPending: false,
  },

  syncPreview(overrides: Partial<DraftInput>) {
    if (this.data.status === 'SAVING' || this.data.saveAndShareBusy) return;
    const selectedLabels = uniqueLabels(overrides.selectedLabels ?? this.data.selectedLabels);
    const avatarUrl = overrides.avatarUrl ?? (this.data.localAvatarUsable ? this.data.localAvatarPath : '');
    const draft: DraftInput = {
      displayName: overrides.displayName ?? this.data.displayName,
      biography: overrides.biography ?? this.data.biography,
      cityIndex: overrides.cityIndex ?? this.data.cityIndex,
      profession: overrides.profession ?? this.data.profession,
      selectedLabels,
      phone: overrides.phone ?? this.data.phone,
      email: overrides.email ?? this.data.email,
      showPhone: overrides.showPhone ?? this.data.showPhone,
      showEmail: overrides.showEmail ?? this.data.showEmail,
      avatarUrl,
    };
    this.setData({
      ...overrides,
      selectedLabels,
      ...makePreview(draft),
      previewSelectedLabels: [],
      previewPublicLabels: this.data.showTags ? selectedLabels : [],
    });
    this.refreshNativeShareAvailability();
  },

  refreshNativeShareAvailability() {
    const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
    const phone = normalizeDraftPhone(this.data.phone);
    const email = normalizeDraftEmail(this.data.email);
    let valid = Boolean(this.data.displayName.trim() && cityId)
      && (!this.data.phone.trim() || Boolean(phone))
      && (!this.data.email.trim() || Boolean(email));
    if (valid && (this.data.localIdentityReady || this.data.registerMode)) {
      valid = Array.from(this.data.biography.trim()).length <= LOCAL_BIOGRAPHY_LIMIT
        && buildLocalIdentitySharePath({
          contractVersion: LOCAL_IDENTITY_CONTRACT_VERSION,
          displayName: compactDraftText(this.data.displayName, LOCAL_DISPLAY_NAME_LIMIT),
          profession: compactDraftText(this.data.profession, LOCAL_PROFESSION_LIMIT),
          biography: this.data.biography.trim(),
          cityId: cityId as CityId,
          selectedLabels: this.data.selectedLabels,
          showTags: this.data.showTags,
          phone, email,
          showPhone: this.data.showPhone,
          showEmail: this.data.showEmail,
          registeredAt: readLocalIdentity()?.registeredAt ?? new Date().toISOString(),
        }, this.data.cardTheme).ok;
    } else if (valid && this.data.demoMode) {
      valid = buildOfflineDemoSharePath({
        ...readOfflineDemoDraft(),
        displayName: this.data.displayName,
        profession: this.data.profession,
        biography: this.data.biography,
        cityId,
        selectedLabels: this.data.selectedLabels,
        showTags: this.data.showTags,
        phone, email,
        showPhone: this.data.showPhone,
        showEmail: this.data.showEmail,
      }, this.data.cardTheme).ok;
    } else if (valid) {
      valid = Boolean(this.data.biography.trim()) && this.data.biography.length <= 240;
    }
    this.setData({ shareDraftValid: valid });
    if (valid && typeof wx.showShareMenu === 'function') wx.showShareMenu({ menus: ['shareAppMessage'] });
    if (!valid && typeof wx.hideShareMenu === 'function') wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  setEditorMode(event: WechatMiniprogram.TouchEvent) {
    const mode = String(event.currentTarget.dataset.mode ?? '');
    if (mode !== 'PREVIEW' && mode !== 'EDIT') return;
    this.setData({ editorMode: mode as EditorMode });
  },

  selectCardTheme(event: WechatMiniprogram.TouchEvent) {
    if (this.data.status === 'SAVING' || this.data.saveAndShareBusy) return;
    const theme = String(event.currentTarget.dataset.theme ?? '');
    if (!THEMES.some((item) => item.value === theme)) return;
    this.setData({
      cardTheme: theme as CardTheme,
      themeOptions: makeThemeOptions(theme as CardTheme),
    });
    writeCardThemePreference(theme as CardTheme);
    this.refreshNativeShareAvailability();
  },

  onLoad(query: Record<string, string | undefined> = {}) {
    this.editorPageUnloaded = false;
    this.saveOperationGeneration += 1;
    this.pendingNativeShare = undefined;
    if (typeof wx.hideShareMenu === 'function') wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    const cardTheme = readCardThemePreference();
    const runtime = getRuntimeEvidence();
    const demoMode = isOfflineDemo(runtime);
    const localReady = hasLocalIdentity();
    const registerMode = query.register === '1';
    this.openedForRegistration = registerMode && !localReady;
    if (localReady || registerMode) {
      const identity = localReady ? readLocalIdentity() : null;
      const displayName = identity?.displayName ?? '';
      const biography = identity?.biography ?? '';
      const profession = identity?.profession ?? '';
      const cityIndex = identity ? CITY_IDS.indexOf(identity.cityId) : -1;
      const selectedLabels = identity ? [...identity.selectedLabels] : [];
      const phone = identity?.phone ?? '';
      const email = identity?.email ?? '';
      const showPhone = identity?.showPhone ?? false;
      const showEmail = identity?.showEmail ?? false;
      const showTags = identity?.showTags ?? true;
      const myDraft: DraftInput = {
        displayName,
        biography,
        cityIndex,
        profession,
        selectedLabels,
        phone,
        email,
        showPhone,
        showEmail,
        avatarUrl: '',
      };
      this.setData({
        runtimeMode: runtime.runtimeMode,
        demoMode: true,
        localIdentityReady: localReady,
        creatingProfile: !localReady,
        registerMode: Boolean(registerMode) && !localReady,
        cardTheme,
        themeOptions: makeThemeOptions(cardTheme),
        status: 'READY',
        editorMode: localReady ? 'PREVIEW' : 'EDIT',
        displayName,
        biography,
        biographyLength: biography.length,
        cityIndex,
        profession,
        selectedLabels,
        phone,
        email,
        showPhone,
        showEmail,
        contactMessage: '',
        showTags,
        previewSelectedLabels: [],
        previewPublicLabels: showTags ? selectedLabels : [],
        ...makePreview(myDraft),
        message: '',
      });
      this.refreshNativeShareAvailability();
      return;
    }
    if (demoMode) {
      const storedDraft = readOfflineDemoDraft();
      const cityIndex = CITY_IDS.indexOf(storedDraft.cityId);
      const selectedLabels = [...storedDraft.selectedLabels];
      const demoDraft: DraftInput = {
        displayName: storedDraft.displayName,
        biography: storedDraft.biography,
        cityIndex,
        profession: storedDraft.profession,
        selectedLabels,
        phone: storedDraft.phone,
        email: storedDraft.email,
        showPhone: storedDraft.showPhone,
        showEmail: storedDraft.showEmail,
        avatarUrl: '',
      };
      this.setData({
        runtimeMode: runtime.runtimeMode,
        demoMode: true,
        cardTheme,
        themeOptions: makeThemeOptions(cardTheme),
        profile: OFFLINE_DEMO_PROFILE,
        status: 'READY',
        editorMode: 'PREVIEW',
        displayName: demoDraft.displayName,
        biography: demoDraft.biography,
        biographyLength: demoDraft.biography.length,
        cityIndex,
        profession: demoDraft.profession,
        selectedLabels,
        phone: demoDraft.phone,
        email: demoDraft.email,
        showPhone: demoDraft.showPhone,
        showEmail: demoDraft.showEmail,
        contactMessage: '',
        showTags: storedDraft.showTags,
        previewSelectedLabels: [],
        previewPublicLabels: storedDraft.showTags ? selectedLabels : [],
        ...makePreview(demoDraft),
        message: '',
      });
      this.refreshNativeShareAvailability();
      return;
    }
    this.setData({
      runtimeMode: runtime.runtimeMode,
      demoMode: false,
      cardTheme,
      themeOptions: makeThemeOptions(cardTheme),
    });
    void this.loadProfile();
  },

  onUnload() {
    this.editorPageUnloaded = true;
    this.saveOperationGeneration += 1;
    this.pendingNativeShare = undefined;
  },

  isEditorOperationActive(generation: number): boolean {
    return !this.editorPageUnloaded && this.saveOperationGeneration === generation;
  },

  async loadProfile() {
    if (this.data.status === 'SAVING' || this.data.demoMode) return;
    this.setData({ status: 'LOADING', message: '' });
    let result = await getMyProfile();
    if (!result.ok && (result.code === 'AUTH_REQUIRED' || result.code === 'SESSION_EXPIRED')) {
      this.setData({ message: '正在为你准备名片空间…' });
      const bootstrap = await bootstrapIdentity();
      if (!bootstrap.ok) {
        this.setData({
          status: 'ERROR',
          message: bootstrap.code === 'RATE_LIMITED'
            ? '操作较频繁，请稍后再试。'
            : '暂时无法建立微信身份，请检查网络后重试。',
        });
        return;
      }
      result = await getMyProfile();
    }
    if (!result.ok) {
      if (result.code === 'NOT_FOUND') {
        this.setData({
          profile: null,
          creatingProfile: true,
          status: 'READY',
          editorMode: 'EDIT',
          displayName: '',
          biography: '',
          biographyLength: 0,
          cityIndex: -1,
          profession: '',
          selectedLabels: [],
          phone: '',
          email: '',
          showPhone: false,
          showEmail: false,
          contactMessage: '',
          galleryImages: [],
          previewSelectedLabels: [],
          previewPublicLabels: [],
          previewGalleryImages: [],
          ...makePreview(EMPTY_DRAFT),
          message: '',
        });
        return;
      }
      this.setData({ status: 'ERROR', message: result.message });
      return;
    }

    const profile = result.data.profile;
    const cityIndex = profile.cityId ? CITY_IDS.indexOf(profile.cityId) : -1;
    const loadedDraft: DraftInput = {
      displayName: profile.displayName,
      biography: profile.biography ?? '',
      cityIndex,
      profession: '',
      selectedLabels: [],
      phone: '',
      email: '',
      showPhone: false,
      showEmail: false,
      avatarUrl: '',
    };
    this.setData({
      profile,
      creatingProfile: false,
      status: 'READY',
      editorMode: 'PREVIEW',
      displayName: loadedDraft.displayName,
      biography: loadedDraft.biography,
      biographyLength: loadedDraft.biography.length,
      cityIndex,
      profession: '',
      selectedLabels: [],
      phone: '',
      email: '',
      showPhone: false,
      showEmail: false,
      contactMessage: '',
      galleryImages: [],
      previewSelectedLabels: [],
      previewPublicLabels: [],
      previewGalleryImages: [],
      ...makePreview(loadedDraft),
      message: '',
      avatarDraftPending: false,
      localAvatarPath: '',
      localAvatarUsable: false,
    });
    this.refreshNativeShareAvailability();
  },

  onDisplayNameInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ displayName: event.detail.value });
  },

  onBiographyInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ biography: event.detail.value });
    this.setData({ biographyLength: event.detail.value.length });
  },

  onProfessionInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ profession: event.detail.value });
  },

  onPhoneInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ phone: event.detail.value });
    this.setData({ contactMessage: '' });
  },

  onEmailInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ email: event.detail.value });
    this.setData({ contactMessage: '' });
  },

  toggleProfileTag(event: WechatMiniprogram.TouchEvent) {
    const value = String(event.currentTarget.dataset.tag ?? '').trim();
    if (!value || !PROFILE_LABEL_SET.has(value)) return;
    const current = uniqueLabels(this.data.selectedLabels);
    if (current.includes(value)) {
      this.syncPreview({ selectedLabels: current.filter((item) => item !== value) });
      this.setData({ tagMessage: '' });
      return;
    }
    const result = addProfileLabel(current, value);
    if (!result.ok) {
      this.setData({ tagMessage: result.code === 'MAX_COUNT' ? `最多添加 ${MAX_PROFILE_LABELS} 个标签。` : '这个标签暂时无法添加。' });
      return;
    }
    this.syncPreview({ selectedLabels: result.labels });
    this.setData({ tagMessage: '' });
  },

  onCustomLabelInput(event: WechatMiniprogram.Input) {
    this.setData({ customLabelInput: event.detail.value, tagMessage: '' });
  },

  addCustomProfileTag() {
    const result = addProfileLabel(this.data.selectedLabels, this.data.customLabelInput);
    if (!result.ok) {
      const messages = {
        EMPTY: '请先输入标签内容。',
        CONTROL_CHARACTER: '标签不能包含换行或不可见控制字符。',
        TOO_LONG: '每个标签最多 10 个字。',
        DUPLICATE: '这个标签已经添加过了。',
        MAX_COUNT: `最多添加 ${MAX_PROFILE_LABELS} 个标签。`,
      } as const;
      this.setData({ tagMessage: messages[result.code] });
      return;
    }
    this.syncPreview({ selectedLabels: result.labels });
    this.setData({ customLabelInput: '', tagMessage: '' });
  },

  removeProfileTag(event: WechatMiniprogram.TouchEvent) {
    const value = String(event.currentTarget.dataset.tag ?? '').trim();
    if (!value) return;
    this.syncPreview({ selectedLabels: this.data.selectedLabels.filter((label) => label !== value) });
    this.setData({ tagMessage: '' });
  },

  onModuleToggle(event: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    if (this.data.status === 'SAVING' || this.data.saveAndShareBusy) return;
    const moduleName = String(event.currentTarget.dataset.module ?? '');
    const enabled = Boolean(event.detail.value);
    if (moduleName === 'tags') {
      this.setData({
        showTags: enabled,
        previewSelectedLabels: [],
        previewPublicLabels: enabled ? this.data.selectedLabels : [],
      });
    }
    if (moduleName === 'gallery') {
      this.setData({ showGallery: enabled, previewGalleryImages: enabled ? this.data.galleryImages : [] });
    }
    if (moduleName === 'phone') {
      this.syncPreview({ showPhone: enabled });
      this.setData({ contactMessage: '' });
    }
    if (moduleName === 'email') {
      this.syncPreview({ showEmail: enabled });
      this.setData({ contactMessage: '' });
    }
    this.refreshNativeShareAvailability();
  },

  onCityChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value);
    if (Number.isInteger(index) && index >= 0 && index < CITY_IDS.length) {
      this.syncPreview({ cityIndex: index });
    }
  },

  onChooseAvatar(event: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>) {
    const avatarUrl = event.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({
      localAvatarPath: avatarUrl,
      localAvatarUsable: true,
      avatarDraftPending: true,
    });
    this.syncPreview({ avatarUrl });
  },

  onAvatarImageError() {
    this.setData({ localAvatarUsable: false });
    this.syncPreview({ avatarUrl: '' });
  },

  onBrandLogoError() {
    if (!this.data.brandLogoFailed) this.setData({ brandLogoFailed: true });
  },

  chooseGalleryImages() {
    const remaining = Math.max(0, 4 - this.data.galleryImages.length);
    if (!remaining) {
      this.setData({ galleryNote: '最多展示 4 张图片。' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (result) => {
        const selected = result.tempFiles.map((file) => file.tempFilePath).filter(Boolean);
        const galleryImages = [...this.data.galleryImages, ...selected].slice(0, 4);
        this.setData({
          galleryImages,
          previewGalleryImages: this.data.showGallery ? galleryImages : [],
          galleryNote: '仅自己可见',
        });
      },
    });
  },

  removeGalleryImage(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.data.galleryImages.length) return;
    const galleryImages = this.data.galleryImages.filter((_, itemIndex) => itemIndex !== index);
    this.setData({
      galleryImages,
      previewGalleryImages: this.data.showGallery ? galleryImages : [],
      galleryNote: '',
    });
  },

  async saveProfile(): Promise<boolean> {
    const saveGeneration = this.saveOperationGeneration;
    if (!this.isEditorOperationActive(saveGeneration) || this.data.status === 'SAVING') return false;
    if (this.data.localIdentityReady || this.data.registerMode) {
      const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
      const phone = normalizeDraftPhone(this.data.phone);
      const email = normalizeDraftEmail(this.data.email);
      const displayName = compactDraftText(this.data.displayName, LOCAL_DISPLAY_NAME_LIMIT);
      const biography = this.data.biography.trim();
      if (!displayName) {
        this.setData({ status: 'ERROR', message: '请填写公开称呼。' });
        return false;
      }
      if (!cityId) {
        this.setData({ status: 'ERROR', message: '请选择所在城市。' });
        return false;
      }
      if (Array.from(biography).length > LOCAL_BIOGRAPHY_LIMIT) {
        this.setData({ status: 'ERROR', message: `自我介绍最多 ${LOCAL_BIOGRAPHY_LIMIT} 字。` });
        return false;
      }
      if (this.data.phone.trim() && !phone) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效电话号码，或留空。', message: '电话格式需要检查。' });
        return false;
      }
      if (this.data.email.trim() && !email) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效邮箱地址，或留空。', message: '邮箱格式需要检查。' });
        return false;
      }
      const identity: LocalIdentity = {
        contractVersion: LOCAL_IDENTITY_CONTRACT_VERSION,
        displayName,
        biography,
        profession: compactDraftText(this.data.profession, LOCAL_PROFESSION_LIMIT),
        cityId: cityId as CityId,
        selectedLabels: this.data.selectedLabels,
        showTags: this.data.showTags,
        phone,
        email,
        showPhone: this.data.showPhone,
        showEmail: this.data.showEmail,
        registeredAt: readLocalIdentity()?.registeredAt ?? new Date().toISOString(),
      };
      const sharePreflight = buildLocalIdentitySharePath(identity, this.data.cardTheme);
      if (!sharePreflight.ok) {
        this.setData({
          status: 'ERROR',
          message: '名片内容过长，请精简个人简介后重试。',
        });
        return false;
      }
      if (!saveLocalIdentity(identity)) {
        this.setData({ status: 'ERROR', message: '保存失败，请检查存储空间后重试。' });
        return false;
      }
      this.setData({
        status: 'SAVED',
        editorMode: 'PREVIEW',
        localIdentityReady: true,
        creatingProfile: false,
        registerMode: false,
        phone,
        email,
        contactMessage: '',
        message: '已保存',
      });
      return true;
    }
    if (this.data.demoMode) {
      const current = readOfflineDemoDraft();
      const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
      const phone = normalizeDraftPhone(this.data.phone);
      const email = normalizeDraftEmail(this.data.email);
      if (this.data.phone.trim() && !phone) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效电话号码，或留空。', message: '电话格式需要检查。' });
        return false;
      }
      if (this.data.email.trim() && !email) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效邮箱地址，或留空。', message: '邮箱格式需要检查。' });
        return false;
      }
      const draft = {
        ...current,
        displayName: this.data.displayName,
        biography: this.data.biography,
        profession: this.data.profession,
        cityId,
        selectedLabels: this.data.selectedLabels,
        showTags: this.data.showTags,
        phone,
        email,
        showPhone: this.data.showPhone,
        showEmail: this.data.showEmail,
      };
      const sharePreflight = buildOfflineDemoSharePath(draft, this.data.cardTheme);
      if (!sharePreflight.ok) {
        this.setData({
          status: 'ERROR',
          message: '名片内容过长，请精简个人简介后重试。',
        });
        return false;
      }
      if (!writeOfflineDemoDraft(draft)) {
        this.setData({ status: 'ERROR', message: '保存失败，请检查存储空间后重试。' });
        return false;
      }
      this.setData({
        status: 'SAVED',
        editorMode: 'PREVIEW',
        phone,
        email,
        contactMessage: '',
        message: '已保存',
      });
      return true;
    }

    const profile = this.data.profile;
    if (!profile && !this.data.creatingProfile) {
      this.setData({ status: 'ERROR', message: '资料版本尚未加载，请重新进入后再保存。' });
      return false;
    }
    const displayName = compactDraftText(this.data.displayName, 60);
    const biography = this.data.biography.trim();
    if (!displayName) {
      this.setData({ status: 'ERROR', message: '请填写公开称呼。' });
      return false;
    }
    if (biography.length > 240) {
      this.setData({ status: 'ERROR', message: '自由介绍不能超过 240 个字符。' });
      return false;
    }
    const selectedCityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
    if (!selectedCityId) {
      this.setData({ status: 'ERROR', message: '请选择所在城市。' });
      return false;
    }
    if (!biography) {
      this.setData({ status: 'ERROR', message: '请填写个人简介。' });
      return false;
    }

    const update: ProfileUpdateInput = {
      displayName,
      cityId: selectedCityId as CityId,
      biography,
      ...(profile?.avatarAssetId === undefined
        ? {}
        : { avatarAssetId: profile.avatarAssetId as MediaAssetId }),
    };
    this.setData({ status: 'SAVING', message: '正在保存名片…' });
    const result = await updateMyProfile(update, profile?.version);
    if (!this.isEditorOperationActive(saveGeneration)) return false;
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'VERSION_CONFLICT'
          ? '名片已在其他页面更新，请重新加载后再保存。'
          : result.message,
      });
      return false;
    }

    const cityIndex = result.data.profile.cityId ? CITY_IDS.indexOf(result.data.profile.cityId) : -1;
    const savedDraft: DraftInput = {
      displayName: result.data.profile.displayName,
      biography: result.data.profile.biography ?? '',
      cityIndex,
      profession: this.data.profession,
      selectedLabels: this.data.selectedLabels,
      phone: '',
      email: '',
      showPhone: false,
      showEmail: false,
      avatarUrl: this.data.localAvatarUsable ? this.data.localAvatarPath : '',
    };
    this.setData({
      profile: result.data.profile,
      creatingProfile: false,
      displayName: savedDraft.displayName,
      biography: savedDraft.biography,
      biographyLength: savedDraft.biography.length,
      cityIndex,
      ...makePreview(savedDraft),
    });

    const refresh = await refreshMyCard(result.data.profile.version);
    if (!this.isEditorOperationActive(saveGeneration)) return false;
    if (!refresh.ok) {
      this.setData({
        status: 'PROJECTION_PENDING',
        message: '名片资料已保存，但公开展示尚未刷新完成，请稍后重试。',
      });
      return false;
    }
    this.setData({
      status: 'SAVED',
      editorMode: 'PREVIEW',
      message: this.data.avatarDraftPending || this.data.selectedLabels.length || this.data.galleryImages.length
        ? '基本信息已保存；标签与图片仅自己可见。'
        : '已保存',
    });
    return true;
  },

  async saveAndOpenShare(deadline = Date.now() + 2500): Promise<NativeShareResult> {
    if (this.data.status === 'LOADING' || this.data.status === 'SAVING' || this.data.saveAndShareBusy) return UNAVAILABLE_SHARE;
    const saveGeneration = this.saveOperationGeneration;
    const theme = this.data.cardTheme;
    if (!this.isEditorOperationActive(saveGeneration)) return UNAVAILABLE_SHARE;
    this.setData({ saveAndShareBusy: true });
    const active = () => this.isEditorOperationActive(saveGeneration) && Date.now() < deadline;
    try {
      const saved = await this.saveProfile();
      if (!active()) return UNAVAILABLE_SHARE;
      if (!saved) {
        const needsEditing = this.data.status === 'ERROR';
        this.setData({ ...(needsEditing ? { editorMode: 'EDIT' as EditorMode } : {}) });
        showShareToast(needsEditing ? '请检查必填信息' : '请查看页面提示');
        return UNAVAILABLE_SHARE;
      }

      if (this.data.demoMode || this.data.localIdentityReady) {
        const localIdentity = this.data.localIdentityReady ? readLocalIdentity() : null;
        if (this.data.localIdentityReady && !localIdentity) throw new Error('Saved identity missing');
        const draft = localIdentity ? null : readOfflineDemoDraft();
        const path = localIdentity
          ? buildLocalIdentitySharePath(localIdentity, theme)
          : buildOfflineDemoSharePath(draft!, theme);
        if (!path.ok) throw new Error('Share path too long');
        const snapshot = localIdentity
          ? createLocalIdentityShareSnapshot(localIdentity, theme)
          : createOfflineDemoShareSnapshot(draft!, theme);
        const imageUrl = await prepareNativeShareCardCover(this, {
          theme,
          displayName: snapshot.card.displayName,
          headline: snapshot.card.headline,
          biography: snapshot.card.biography,
          labels: snapshot.publicLabels,
          phone: snapshot.fields.find((field) => field.key === 'phone')?.value,
          email: snapshot.fields.find((field) => field.key === 'email')?.value,
          demoMode: snapshot.source === 'DEMO',
        });
        if (!active()) return UNAVAILABLE_SHARE;
        return { title: safeShareTitle(), path: path.path, imageUrl: imageUrl || BRAND_SHARE_COVER };
      }

      const cardResult = await getMyPublicCard();
      if (!active()) return UNAVAILABLE_SHARE;
      if (!cardResult.ok) throw new Error('Public card unavailable');
      const card = cardResult.data.card;
      const share = await createCardShare(card.cardId, card.version, shareExpiry(7) as UtcInstant);
      if (!active()) return UNAVAILABLE_SHARE;
      if (!share.ok || share.data.targetType !== 'CARD' || share.data.targetId !== card.cardId
        || !isSafeShareBearer(share.data.token) || !isSafeShareTokenId(share.data.shareTokenId)
        || wasShareRevokedForSession(share.data.shareTokenId)) throw new Error('Invalid share');
      rememberShareForRevocation(share.data.shareTokenId);
      return {
        title: safeShareTitle(),
        path: `/pages/card-share/index?token=${encodeURIComponent(share.data.token)}&theme=${theme}`,
        imageUrl: BRAND_SHARE_COVER,
      };
    } catch (_error) {
      if (active()) {
        this.setData({ status: 'ERROR', message: '暂时无法准备名片分享，请检查保存信息后重试。' });
        showShareToast('分享暂时不可用，请重试');
      }
      return UNAVAILABLE_SHARE;
    } finally {
      if (this.isEditorOperationActive(saveGeneration)) this.setData({ saveAndShareBusy: false });
    }
  },

  onShareAppMessage() {
    if (!this.pendingNativeShare) {
      const generation = this.saveOperationGeneration;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<NativeShareResult>((resolve) => {
        timeout = setTimeout(() => {
          if (this.isEditorOperationActive(generation)) {
            this.saveOperationGeneration += 1;
            this.pendingNativeShare = undefined;
            this.setData({ saveAndShareBusy: false, status: 'ERROR', message: '分享准备时间较长，请稍后重试。' });
            showShareToast('分享准备超时，请重试');
          }
          resolve(UNAVAILABLE_SHARE);
        }, 2500);
      });
      this.pendingNativeShare = Promise.race([this.saveAndOpenShare(), timedOut]).finally(() => {
        if (timeout !== undefined) clearTimeout(timeout);
        if (this.isEditorOperationActive(generation)) this.pendingNativeShare = undefined;
      });
    }
    return { ...UNAVAILABLE_SHARE, promise: this.pendingNativeShare };
  },

  async retryProjectionRefresh() {
    if (!this.data.profile || this.data.status === 'SAVING') return;
    this.setData({ status: 'SAVING', message: '正在刷新公开名片…' });
    const result = await refreshMyCard(this.data.profile.version);
    this.setData(result.ok
      ? { status: 'SAVED', editorMode: 'PREVIEW', message: '公开名片已刷新。' }
      : { status: 'PROJECTION_PENDING', message: result.message });
  },

  returnToOwnerCard() {
    const pages = getCurrentPages();
    const previousRoute = pages.length > 1 ? pages[pages.length - 2]?.route ?? '' : '';
    if (
      !this.openedForRegistration
      && (previousRoute === 'pages/card/index' || previousRoute === 'pages/me/index')
    ) {
      void wx.navigateBack();
      return;
    }
    void wx.redirectTo({ url: '/pages/card/index' });
  },
});
