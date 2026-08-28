export interface IntroductionContext {
  readonly displayName: string;
  readonly cityName: string;
  readonly education?: string;
  readonly profession?: string;
  readonly industry?: string;
  readonly position?: string;
  readonly interests?: string;
}

export interface IntroductionDraftResult {
  readonly text: string;
  readonly source: 'AI' | 'TEMPLATE';
  readonly fallbackReason?: 'NO_GENERATOR' | 'TIMEOUT' | 'INVALID_OUTPUT' | 'GENERATOR_ERROR';
}

export type IntroductionGenerator = (context: IntroductionContext) => Promise<string>;

const MAX_BIOGRAPHY_LENGTH = 240;

function cleanPart(value: string | undefined, fallback: string): string {
  const compact = (value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return compact ? compact.slice(0, 40) : fallback;
}

export function deterministicIntroduction(context: IntroductionContext): string {
  const name = cleanPart(context.displayName, '一位新朋友');
  const city = cleanPart(context.cityName, '所在城市');
  const career = [
    cleanPart(context.profession, ''),
    cleanPart(context.industry, ''),
    cleanPart(context.position, ''),
  ]
    .filter(Boolean)
    .join(' · ');
  const education = cleanPart(context.education, '');
  const interests = cleanPart(context.interests, '共同成长与真实连接');
  const careerSentence = career ? `目前关注${career}。` : '';
  const educationSentence = education ? `曾就读于${education}。` : '';
  return `你好，我是${name}，常驻${city}。${educationSentence}${careerSentence}希望在 AB Club 围绕${interests}交流，认识真诚且有行动力的同行者。`.slice(
    0,
    MAX_BIOGRAPHY_LENGTH,
  );
}

function isValidGeneratedText(value: string): boolean {
  const text = value.trim();
  if (text.length < 12 || text.length > MAX_BIOGRAPHY_LENGTH) return false;
  if (/[<>]|https?:\/\/|OPENID|身份证|手机号/.test(text)) return false;
  return true;
}

function settleWithTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('INTRODUCTION_TIMEOUT'));
    }, timeoutMs);

    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function createEditableIntroduction(
  context: IntroductionContext,
  generator?: IntroductionGenerator,
  timeoutMs: number = 5000,
): Promise<IntroductionDraftResult> {
  const fallback = deterministicIntroduction(context);
  if (!generator) {
    return { text: fallback, source: 'TEMPLATE', fallbackReason: 'NO_GENERATOR' };
  }
  try {
    const generated = await settleWithTimeout(generator(context), timeoutMs);
    if (!isValidGeneratedText(generated)) {
      return { text: fallback, source: 'TEMPLATE', fallbackReason: 'INVALID_OUTPUT' };
    }
    return { text: generated.trim(), source: 'AI' };
  } catch (error) {
    const reason = error instanceof Error && error.message === 'INTRODUCTION_TIMEOUT'
      ? 'TIMEOUT'
      : 'GENERATOR_ERROR';
    return { text: fallback, source: 'TEMPLATE', fallbackReason: reason };
  }
}
