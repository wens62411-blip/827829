import { CityId } from '../../shared/constants/geography';
import { ART_RELATED_DEMO_EVENT } from '../../components/ab-event-card/demo-data';
import { EventState, MediaRightsState, PublicationState, RecordOrigin, VerificationState } from '../../shared/types/enums';
import type { CollectionId, ContentId, EventId, OptimisticVersion, OrganizerId, ClubNodeId, StableId, UtcInstant } from '../../shared/types/primitives';
import type { PublicEventProjection } from '../../shared/types/projections';
import type { ArtCategory, ArtCategoryFilter, ArtCollection, ArtContentDetail, ArtCreator } from '../model';

const CREATED_AT='2026-08-27T08:00:00Z' as UtcInstant;
const REVIEWED_AT='2026-08-27T08:30:00Z' as UtcInstant;
const VERSION=1 as OptimisticVersion;
const common={publicationState:PublicationState.PUBLISHED,mediaRightsState:MediaRightsState.UNVERIFIED,rightsStatus:MediaRightsState.UNVERIFIED,origin:RecordOrigin.SYNTHETIC,recordOrigin:RecordOrigin.SYNTHETIC,verificationState:VerificationState.NOT_APPLICABLE,evidenceScope:'DEMO_ONLY',rightsSummary:'暂无图片展示授权。',reviewedAt:REVIEWED_AT,createdAt:CREATED_AT,updatedAt:REVIEWED_AT,version:VERSION} as const;

export const DEMO_ART_CONTENT:readonly ArtContentDetail[]=[
  {...common,contentId:'content_demo_art_ink_001' as ContentId,collectionId:'collection_demo_art_editorial' as CollectionId,creatorId:'creator_demo_lin' as StableId<'creator'>,creatorDisplayName:'林墨',title:'潮汐之后 / After the Tide',summary:'纸本综合媒介作品资料。',category:'ART',cityId:CityId.CN_HANGZHOU,sourceTitle:'AB Club 合成艺术资料',sourceUrl:'https://example.invalid/ab-club/art-demo/art-001',alt:'合成艺术记录未配置作品图片',artwork:{author:'林墨',workTitle:'潮汐之后',year:'2026',medium:'纸本综合媒介',dimensions:'78 × 112 cm',edition:'单件',exhibitionHistory:'未提供',provenanceInformation:'未提供'}},
  {...common,contentId:'content_demo_antique_vessel_001' as ContentId,collectionId:'collection_demo_antique_notes' as CollectionId,creatorId:'creator_demo_research_desk' as StableId<'creator'>,creatorDisplayName:'器物资料组',title:'器物笔记：年代与来源待核对',summary:'年代与来源待核对的器物资料。',category:'ANTIQUE',cityId:CityId.CN_SHANGHAI,sourceTitle:'AB Club 合成器物资料',sourceUrl:'https://example.invalid/ab-club/art-demo/antique-001',alt:'合成古董记录未配置器物图片',antique:{periodRange:'20 世纪上半叶',objectType:'陈设器物',knownProvenance:'未提供',conditionStatement:'未经实物检查',thirdPartyReportReference:'未提供报告'}},
  {...common,contentId:'content_demo_jewelry_pearl_001' as ContentId,collectionId:'collection_demo_jewelry_materials' as CollectionId,creatorId:'creator_demo_material_lab' as StableId<'creator'>,creatorDisplayName:'材质档案室',title:'海水珍珠项饰材质记录',summary:'珍珠项饰的尺寸与材质资料。',category:'JEWELRY',cityId:CityId.FR_PARIS,sourceTitle:'AB Club 合成珠宝资料',sourceUrl:'https://example.invalid/ab-club/art-demo/jewelry-001',alt:'合成珍珠珠宝记录未配置首饰图片',jewelry:{jewelryKind:'PEARL',materialStatement:'白色金属、海水珍珠',gemstoneOrPearlInformation:'珠径 7.5–8.0 mm，未经分级',dimensions:'链长 420 mm',reportReference:'未提供报告',displayAuthorization:'未配置图片展示授权。'}},
] as const;

function collection(id:string,zh:string,en:string,summary:string,category:ArtCategory):ArtCollection{return{collectionId:id as CollectionId,title:{zh,en},summary,publicationState:PublicationState.PUBLISHED,categories:[category],evidenceScope:'DEMO_ONLY',recordOrigin:RecordOrigin.SYNTHETIC,sourceTitle:'AB Club 合成策展资料',sourceUrl:`https://example.invalid/ab-club/art-demo/${id}`,reviewedAt:REVIEWED_AT,createdAt:CREATED_AT,updatedAt:REVIEWED_AT,version:VERSION}}
export const DEMO_ART_COLLECTIONS:readonly ArtCollection[]=[
  collection('collection_demo_art_editorial','纸上叙事','Narratives on Paper','纸本艺术选集。','ART'),
  collection('collection_demo_antique_notes','器物笔记','Object Notes','器物文化资料选集。','ANTIQUE'),
  collection('collection_demo_jewelry_materials','珠宝材质档案','Jewellery Material Notes','珠宝材质资料选集。','JEWELRY'),
];

function creator(id:string,displayName:string,biography:string,creatorKind:ArtCreator['creatorKind'],cityId:ArtCreator['cityId']):ArtCreator{return{creatorId:id as StableId<'creator'>,displayName,biography,verificationState:VerificationState.NOT_APPLICABLE,creatorKind,sourceTitle:'AB Club 合成人物资料',sourceUrl:`https://example.invalid/ab-club/art-demo/${id}`,reviewedAt:REVIEWED_AT,cityId,evidenceScope:'DEMO_ONLY',recordOrigin:RecordOrigin.SYNTHETIC,createdAt:CREATED_AT,updatedAt:REVIEWED_AT,version:VERSION}}
export const DEMO_ART_CREATORS:readonly ArtCreator[]=[
  creator('creator_demo_lin','林墨','示例艺术家','ARTIST',CityId.CN_HANGZHOU),
  creator('creator_demo_research_desk','器物资料组','示例资料组','INSTITUTION',CityId.CN_SHANGHAI),
  creator('creator_demo_material_lab','材质档案室','示例档案室','INSTITUTION',CityId.FR_PARIS),
];

export const DEMO_RELATED_EVENTS:readonly PublicEventProjection[]=[{eventId:ART_RELATED_DEMO_EVENT.eventId as EventId,clubNodeId:'club-node_demo_hangzhou' as ClubNodeId,organizerId:'organizer_demo_art' as OrganizerId,cityId:ART_RELATED_DEMO_EVENT.cityId,title:ART_RELATED_DEMO_EVENT.title,summary:ART_RELATED_DEMO_EVENT.summary,startsAt:'2026-09-12T10:00:00Z' as UtcInstant,endsAt:'2026-09-12T12:00:00Z' as UtcInstant,timezone:ART_RELATED_DEMO_EVENT.timezone as PublicEventProjection['timezone'],state:EventState.PUBLISHED,publicationState:PublicationState.PUBLISHED,reservationAvailable:false,origin:RecordOrigin.SYNTHETIC,verificationState:VerificationState.NOT_APPLICABLE,createdAt:CREATED_AT,updatedAt:REVIEWED_AT,version:VERSION}] as const;

export function listDemoContent(category:ArtCategoryFilter):readonly ArtContentDetail[]{return category==='ALL'?DEMO_ART_CONTENT:DEMO_ART_CONTENT.filter(item=>item.category===category)}
export function listDemoCollections(category:ArtCategoryFilter):readonly ArtCollection[]{return category==='ALL'?DEMO_ART_COLLECTIONS:DEMO_ART_COLLECTIONS.filter(item=>item.categories.includes(category))}
export function getDemoContent(contentId:string):ArtContentDetail|undefined{return DEMO_ART_CONTENT.find(item=>item.contentId===contentId)}
export function getDemoCreator(creatorId:string):ArtCreator|undefined{return DEMO_ART_CREATORS.find(item=>item.creatorId===creatorId)}
export function listDemoRelatedEvents(contentId:string):readonly PublicEventProjection[]{return contentId==='content_demo_art_ink_001'?DEMO_RELATED_EVENTS:[]}
