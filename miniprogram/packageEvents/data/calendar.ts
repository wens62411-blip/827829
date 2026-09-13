export type CalendarMonthCode = 'JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN' | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC';

export interface CalendarEventView {
  readonly id: string;
  readonly cityEn: string;
  readonly cityZh: string;
  readonly titleEn: string;
  readonly titleZh: string;
  readonly date: string;
  readonly venue: string;
  readonly summary: string;
  readonly featured: boolean;
}

export interface CalendarMonthView {
  readonly code: CalendarMonthCode;
  readonly name: string;
  readonly anchor: string;
  readonly events: readonly CalendarEventView[];
}

export interface CalendarMonthNavView {
  readonly code: CalendarMonthCode;
  readonly name: string;
  readonly anchor: string;
}

const month = (code: CalendarMonthCode, name: string, events: readonly CalendarEventView[] = []): CalendarMonthView => ({
  code,
  name,
  anchor: `month-${code.toLowerCase()}`,
  // All entries belong to their start month; retain verified date text while sorting the edition.
  events: [...events].sort((left, right) => parseInt(left.date, 10) - parseInt(right.date, 10)),
});

const event = (
  id: string,
  cityEn: string,
  cityZh: string,
  titleEn: string,
  titleZh: string,
  date: string,
  venue: string,
  summary: string,
  featured = false,
): CalendarEventView => ({
  id,
  cityEn,
  cityZh,
  titleEn,
  titleZh,
  date,
  venue,
  summary,
  featured,
});

export const CALENDAR_YEAR = '2026';

export const CALENDAR_MONTHS: readonly CalendarMonthView[] = [
  month('JAN', 'JANUARY', [
    event('calendar-2026-singapore-art-week', 'SINGAPORE', '新加坡', 'Singapore Art Week 2026', '新加坡艺术周', '22–31 JAN 2026', 'Singapore', '新加坡年度视觉艺术季，覆盖展览、公共艺术、装置及城市文化项目。'),
    event('calendar-2026-art-sg', 'SINGAPORE', '新加坡', 'ART SG 2026', '新加坡当代艺术博览会', '23–25 JAN 2026', 'Marina Bay Sands, Singapore', '东南亚重要国际当代艺术博览会。'),
  ]),
  month('FEB', 'FEBRUARY', [
    event('calendar-2026-frieze-la', 'LOS ANGELES', '洛杉矶', 'Frieze Los Angeles 2026', '弗里兹洛杉矶艺术展', '26 FEB–1 MAR 2026', 'Los Angeles, USA', '国际当代艺术博览会，汇集全球画廊与艺术家。'),
  ]),
  month('MAR', 'MARCH', [
    event('calendar-2026-tefaf', 'MAASTRICHT', '马斯特里赫特', 'TEFAF Maastricht 2026', '欧洲艺术博览会', '14–19 MAR 2026', 'Maastricht, Netherlands', '覆盖古典艺术、现代艺术、古董及设计的重要国际博览会。'),
    event('calendar-2026-art-basel-hk', 'HONG KONG', '香港', 'Art Basel Hong Kong 2026', '香港巴塞尔艺术展', '27–29 MAR 2026', 'Hong Kong', '亚洲最重要的国际艺术博览会之一。', true),
    event('calendar-2026-art-central', 'HONG KONG', '香港', 'Art Central 2026', '艺术中环', '25–29 MAR 2026', 'Hong Kong', '关注亚洲新兴艺术家及当代艺术的年度艺术展会。'),
    event('calendar-2026-shenzhen-art-week', 'SHENZHEN', '深圳', 'Shenzhen Art Week 2026', '深圳艺术周', '23–29 MAR 2026', 'Shenzhen, China', '联动深圳艺术机构与城市文化空间的年度艺术周。'),
  ]),
  month('APR', 'APRIL'),
  month('MAY', 'MAY', [
    event('calendar-2026-art-dubai', 'DUBAI', '迪拜', 'Art Dubai 2026', '迪拜艺术博览会', '14–17 MAY 2026', 'Dubai, UAE', '中东重要国际艺术博览会，覆盖当代、现代及数字艺术。'),
    event('calendar-2026-photofairs-shanghai', 'SHANGHAI', '上海', 'PHOTOFAIRS Shanghai 2026', '上海影像艺术博览会', '7–10 MAY 2026', 'Shanghai, China', '聚焦摄影、影像及跨媒介艺术。'),
    event('calendar-2026-biennale-arte', 'VENICE', '威尼斯', 'Biennale Arte 2026', '威尼斯双年展', '9 MAY–22 NOV 2026', 'Venice, Italy', '全球最重要的年度当代艺术事件之一。', true),
    event('calendar-2026-beijing-dangdai', 'BEIJING', '北京', 'Beijing Dangdai 2026', '北京当代艺术博览会', '21–24 MAY 2026', 'Beijing, China', '中国及亚洲当代艺术市场的重要年度节点。'),
    event('calendar-2026-gallery-weekend-beijing', 'BEIJING', '北京', 'Gallery Weekend Beijing 2026', '画廊周北京', '22–31 MAY 2026', 'Beijing, China', '北京年度重要画廊及艺术机构活动。'),
  ]),
  month('JUN', 'JUNE', [
    event('calendar-2026-art-basel-basel', 'BASEL', '巴塞尔', 'Art Basel 2026', '巴塞尔艺术展', '18–21 JUN 2026', 'Basel, Switzerland', '全球艺术市场最重要的年度艺术博览会之一。', true),
  ]),
  month('JUL', 'JULY'),
  month('AUG', 'AUGUST'),
  month('SEP', 'SEPTEMBER', [
    event('calendar-2026-frieze-seoul', 'SEOUL', '首尔', 'Frieze Seoul 2026', '弗里兹首尔艺术展', '2–5 SEP 2026', 'Seoul, South Korea', '亚洲重要当代艺术博览会。', true),
    event('calendar-2026-kiaf-seoul', 'SEOUL', '首尔', 'Kiaf SEOUL 2026', '韩国国际艺术博览会', '2–6 SEP 2026', 'Seoul, South Korea', '韩国重要国际艺术博览会，与 Frieze Seoul 同期形成首尔艺术周。'),
    event('calendar-2026-armory-show', 'NEW YORK', '纽约', 'The Armory Show 2026', '纽约军械库艺术展', '24–27 SEP 2026', 'New York, USA', '纽约重要国际艺术博览会。'),
  ]),
  month('OCT', 'OCTOBER', [
    event('calendar-2026-frieze-london', 'LONDON', '伦敦', 'Frieze London 2026', '弗里兹伦敦艺术展', '14–18 OCT 2026', 'London, UK', '全球重要当代艺术博览会。', true),
    event('calendar-2026-frieze-masters', 'LONDON', '伦敦', 'Frieze Masters 2026', '弗里兹大师展', '14–18 OCT 2026', 'London, UK', '连接历史艺术、古典艺术与收藏市场的重要艺术展会。'),
    event('calendar-2026-art-basel-paris', 'PARIS', '巴黎', 'Art Basel Paris 2026', '巴黎巴塞尔艺术展', '23–25 OCT 2026', 'Paris, France', '欧洲秋季重要国际艺术博览会。', true),
  ]),
  month('NOV', 'NOVEMBER'),
  month('DEC', 'DECEMBER', [
    event('calendar-2026-art-basel-miami', 'MIAMI BEACH', '迈阿密海滩', 'Art Basel Miami Beach 2026', '迈阿密海滩巴塞尔艺术展', '4–6 DEC 2026', 'Miami Beach, USA', '全球年度艺术市场的重要收官节点。', true),
  ]),
] as const;

export const CALENDAR_MONTH_NAV: readonly CalendarMonthNavView[] = CALENDAR_MONTHS.map(({ code, name, anchor }) => ({ code, name, anchor }));
