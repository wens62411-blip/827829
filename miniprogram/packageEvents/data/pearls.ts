export type PearlCategoryId = 'freshwater' | 'akoya' | 'south-sea-white';

export interface PearlCategory {
  readonly id: PearlCategoryId;
  readonly title: string;
  readonly english: string;
  readonly description: string;
  readonly image: string;
  readonly imageLabel: string;
}

export interface PearlStyle {
  readonly id: string;
  readonly title: string;
  readonly english: string;
  readonly description: string;
  readonly image: string;
}

export interface PearlImageCredit {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly sourceUrl: string;
  readonly image: string;
}

export const PEARL_CONTACT_WECHAT = 'ABclub1';
const ASSETS = '/packageEvents/assets/pearls/';

export const PEARL_CATEGORIES: readonly PearlCategory[] = [
  { id: 'freshwater', title: '淡水珠', english: 'FRESHWATER', description: '从自然异形，到柔和珠光。', image: `${ASSETS}freshwater-loose.jpg`, imageLabel: '异形淡水裸珠 · 实拍参考' },
  { id: 'akoya', title: 'Akoya', english: 'AKOYA', description: '小而精致，映照日常的光。', image: `${ASSETS}akoya-loose.jpg`, imageLabel: '黑白 Akoya 裸珠 · 实拍参考' },
  // Only add an image when both permission and Australian white pearl provenance are documented.
  { id: 'south-sea-white', title: '澳白', english: 'SOUTH SEA WHITE', description: '从珠色、尺寸到搭配，一起细选。', image: '', imageLabel: '联系查看实拍' },
];

// These are independent design references, not an inventory or material-filtered product list.
export const PEARL_STYLES: readonly PearlStyle[] = [
  { id: 'studs', title: '耳钉', english: 'EAR STUDS', description: '一对珠光，轻点耳畔。', image: `${ASSETS}style-studs.jpg` },
  { id: 'necklace', title: '项链', english: 'NECKLACE', description: '沿着颈线，展开层次。', image: `${ASSETS}style-necklace.jpg` },
  { id: 'ring', title: '戒指', english: 'RING', description: '以一颗珍珠，构成焦点。', image: `${ASSETS}style-ring.jpg` },
];

export const PEARL_IMAGE_CREDITS: readonly PearlImageCredit[] = [
  { id: 'freshwater', title: '淡水裸珠', author: 'Jennifergaglione', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Freshwater_pearl_texturedloose.jpg', image: `${ASSETS}freshwater-loose.jpg` },
  { id: 'akoya', title: 'Akoya 裸珠 · 原图未注明处理方式', author: 'Mauro Cateb', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Akoya_pearls_-_black_%26_white.jpg', image: `${ASSETS}akoya-loose.jpg` },
  { id: 'studs', title: '耳钉参考', author: 'Auckland Museum · 作者未署名', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Earrings,_pair_(AM_9218-2).jpg', image: `${ASSETS}style-studs.jpg` },
  { id: 'necklace', title: 'White Wedding · 项链参考', author: 'Ann-Sophie Qvarnström / W.carter', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:White_Wedding_-_pearl_necklace.jpg', image: `${ASSETS}style-necklace.jpg` },
  { id: 'ring', title: 'Blue Moon · 马贝珍珠戒指参考', author: 'Ann-Sophie Qvarnström / W.carter', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blue_Moon_-_silver_ring_with_large_Mabe-pearl.jpg', image: `${ASSETS}style-ring.jpg` },
];

export function findPearlCategory(value: unknown): PearlCategory | undefined {
  return typeof value === 'string' ? PEARL_CATEGORIES.find((item) => item.id === value) : undefined;
}

export function pearlPreviewImages(): string[] {
  return PEARL_IMAGE_CREDITS.map((item) => item.image);
}
