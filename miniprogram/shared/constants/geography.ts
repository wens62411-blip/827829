import { IanaTimezone, type LocalizedName } from '../types/primitives';

export const GLOBAL_ID = 'global' as const;

export const RegionId = {
  ASIA_PACIFIC: 'asia-pacific',
  EUROPE: 'europe',
  NORTH_AMERICA: 'north-america',
} as const;
export type RegionId = (typeof RegionId)[keyof typeof RegionId];

export const CountryId = {
  CN: 'cn',
  CH: 'ch',
  IT: 'it',
  FR: 'fr',
  AU: 'au',
  SG: 'sg',
  CA: 'ca',
} as const;
export type CountryId = (typeof CountryId)[keyof typeof CountryId];

export const CityId = {
  CN_BEIJING: 'cn-beijing',
  CN_SHANGHAI: 'cn-shanghai',
  CN_GUANGZHOU: 'cn-guangzhou',
  CN_SHENZHEN: 'cn-shenzhen',
  CN_HANGZHOU: 'cn-hangzhou',
  CH_ZURICH: 'ch-zurich',
  IT_MILAN: 'it-milan',
  FR_PARIS: 'fr-paris',
  AU_MELBOURNE: 'au-melbourne',
  AU_SYDNEY: 'au-sydney',
  SG_SINGAPORE: 'sg-singapore',
  CA_TORONTO: 'ca-toronto',
  CA_VANCOUVER: 'ca-vancouver',
} as const;
export type CityId = (typeof CityId)[keyof typeof CityId];

export interface RegionDirectoryEntry {
  readonly id: RegionId;
  readonly parentId: typeof GLOBAL_ID;
  readonly name: LocalizedName;
}

export interface CountryDirectoryEntry {
  readonly id: CountryId;
  readonly parentId: RegionId;
  readonly name: LocalizedName;
}

export interface CityDirectoryEntry {
  readonly id: CityId;
  readonly parentId: CountryId;
  readonly regionId: RegionId;
  readonly name: LocalizedName;
  readonly timezone: IanaTimezone;
}

export const REGION_DIRECTORY = [
  { id: RegionId.ASIA_PACIFIC, parentId: GLOBAL_ID, name: { zh: '亚太', en: 'Asia Pacific' } },
  { id: RegionId.EUROPE, parentId: GLOBAL_ID, name: { zh: '欧洲', en: 'Europe' } },
  { id: RegionId.NORTH_AMERICA, parentId: GLOBAL_ID, name: { zh: '北美', en: 'North America' } },
] as const satisfies readonly RegionDirectoryEntry[];

export const COUNTRY_DIRECTORY = [
  { id: CountryId.CN, parentId: RegionId.ASIA_PACIFIC, name: { zh: '中国', en: 'China' } },
  { id: CountryId.CH, parentId: RegionId.EUROPE, name: { zh: '瑞士', en: 'Switzerland' } },
  { id: CountryId.IT, parentId: RegionId.EUROPE, name: { zh: '意大利', en: 'Italy' } },
  { id: CountryId.FR, parentId: RegionId.EUROPE, name: { zh: '法国', en: 'France' } },
  { id: CountryId.AU, parentId: RegionId.ASIA_PACIFIC, name: { zh: '澳大利亚', en: 'Australia' } },
  { id: CountryId.SG, parentId: RegionId.ASIA_PACIFIC, name: { zh: '新加坡', en: 'Singapore' } },
  { id: CountryId.CA, parentId: RegionId.NORTH_AMERICA, name: { zh: '加拿大', en: 'Canada' } },
] as const satisfies readonly CountryDirectoryEntry[];

export const CITY_DIRECTORY = [
  { id: CityId.CN_BEIJING, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: '北京', en: 'Beijing' }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_SHANGHAI, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: '上海', en: 'Shanghai' }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_GUANGZHOU, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: '广州', en: 'Guangzhou' }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_SHENZHEN, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: '深圳', en: 'Shenzhen' }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_HANGZHOU, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: '杭州', en: 'Hangzhou' }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CH_ZURICH, parentId: CountryId.CH, regionId: RegionId.EUROPE, name: { zh: '苏黎世', en: 'Zurich' }, timezone: IanaTimezone.EUROPE_ZURICH },
  { id: CityId.IT_MILAN, parentId: CountryId.IT, regionId: RegionId.EUROPE, name: { zh: '米兰', en: 'Milan' }, timezone: IanaTimezone.EUROPE_ROME },
  { id: CityId.FR_PARIS, parentId: CountryId.FR, regionId: RegionId.EUROPE, name: { zh: '巴黎', en: 'Paris' }, timezone: IanaTimezone.EUROPE_PARIS },
  { id: CityId.AU_MELBOURNE, parentId: CountryId.AU, regionId: RegionId.ASIA_PACIFIC, name: { zh: '墨尔本', en: 'Melbourne' }, timezone: IanaTimezone.AUSTRALIA_MELBOURNE },
  { id: CityId.AU_SYDNEY, parentId: CountryId.AU, regionId: RegionId.ASIA_PACIFIC, name: { zh: '悉尼', en: 'Sydney' }, timezone: IanaTimezone.AUSTRALIA_SYDNEY },
  { id: CityId.SG_SINGAPORE, parentId: CountryId.SG, regionId: RegionId.ASIA_PACIFIC, name: { zh: '新加坡', en: 'Singapore' }, timezone: IanaTimezone.ASIA_SINGAPORE },
  { id: CityId.CA_TORONTO, parentId: CountryId.CA, regionId: RegionId.NORTH_AMERICA, name: { zh: '多伦多', en: 'Toronto' }, timezone: IanaTimezone.AMERICA_TORONTO },
  { id: CityId.CA_VANCOUVER, parentId: CountryId.CA, regionId: RegionId.NORTH_AMERICA, name: { zh: '温哥华', en: 'Vancouver' }, timezone: IanaTimezone.AMERICA_VANCOUVER },
] as const satisfies readonly CityDirectoryEntry[];

export const HIERARCHY_LEVELS = [
  'GLOBAL',
  'REGION',
  'COUNTRY',
  'CITY',
  'CLUB_NODE',
  'EVENT',
] as const;
export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number];

/**
 * Runtime club nodes and events are not directory entries. They must keep only
 * their immediate stable parent ID: node.cityId and event.clubNodeId. Event
 * business records also keep the shared CityId for filtering, never free text.
 */
export const HIERARCHY_PARENT = {
  GLOBAL: null,
  REGION: 'GLOBAL',
  COUNTRY: 'REGION',
  CITY: 'COUNTRY',
  CLUB_NODE: 'CITY',
  EVENT: 'CLUB_NODE',
} as const satisfies { readonly [Level in HierarchyLevel]: HierarchyLevel | null };
