const CITY_MEDIA: Readonly<Record<string, readonly [string, string, string]>> = {
'cn-beijing': ['从高处俯瞰北京故宫红墙金瓦建筑群与城市天际线', 'Güldem Üstün', 'CC BY 2.0'],
'cn-shanghai': ['从外滩方向眺望上海浦东陆家嘴天际线，东方明珠与摩天楼临江而立', 'King of Hearts', 'CC BY-SA 4.0'],
'cn-guangzhou': ['航拍广州塔与珠江两岸城市建筑', 'Tim Wu', 'CC BY-SA 4.0'],
'cn-shenzhen': ['深圳福田中央商务区全景，平安金融中心高耸于城市天际线', 'Charlie fong', 'CC BY-SA 4.0'],
'cn-hangzhou': ['航拍杭州西湖、湖中岛屿与远山全景', 'Wanderingchina', 'CC BY 4.0'],
'ch-zurich': ['苏黎世利马特河两岸老城全景，双塔大教堂与教堂尖顶映入河岸', 'Beat Ruest', 'CC BY-SA 4.0'],
'it-milan': ['米兰大教堂与埃马努埃莱二世拱廊俯瞰大教堂广场', 'Steffen Schmitz', 'CC BY-SA 4.0'],
'fr-paris': ['清晨从特罗卡德罗广场眺望巴黎埃菲尔铁塔', 'Nitot', 'CC BY-SA 3.0'],
'au-melbourne': ['暮色中的墨尔本滨水区、游艇码头与城市天际线', 'Diliff', 'CC BY 2.5'],
'au-sydney': ['暮色中的悉尼歌剧院与海港大桥横跨海湾', 'Benh LIEU SONG', 'CC BY-SA 4.0'],
'sg-singapore': ['暮色中的新加坡滨海湾、滨海湾金沙与中央商务区天际线', 'Benh LIEU SONG', 'CC BY-SA 4.0'],
'ca-toronto': ['多伦多滨水区与加拿大国家电视塔城市景观', 'ImagePerson', 'CC BY 4.0'],
'ca-vancouver': ['从伊丽莎白女王公园眺望温哥华天际线与积雪北岸山脉', 'Kyle Pearce / DIY Genius', 'CC BY-SA 2.0'],
};
export function getCityMediaPresentation(cityId: string) {
const [alt, author, license] = CITY_MEDIA[cityId] ?? ['城市代表性实景照片', '来源与许可见城市素材清单', 'cities.json'];
return { alt, credit: `${author} · ${license} · Wikimedia Commons`, licenseLabel: `${author} / ${license}` };
}
