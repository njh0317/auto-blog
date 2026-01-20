// 블로그 브랜딩 설정 모듈
import { getBrandingData, saveBrandingData, Branding } from './storage';

export type BlogBranding = Branding;

const DEFAULT_BRANDING: BlogBranding = {
  nickname: '투자하는 개발자',
  greeting: '안녕하세요 {nickname}입니다.\n오늘 미국증시 마감시황 알려드리겠습니다.',
  closing: '감사합니다.\n\n※ 본 콘텐츠는 투자 참고용이며, 투자 판단의 최종 책임은 투자자 본인에게 있습니다.',
  style: 'casual',
};

// 동기 버전 (로컬 전용, detailed-report.ts 호환)
export function getBranding(): BlogBranding {
  // Vercel 환경에서는 기본값 반환 (async 버전 사용 권장)
  if (process.env.VERCEL === '1') {
    return DEFAULT_BRANDING;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'branding.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { ...DEFAULT_BRANDING, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('브랜딩 설정 로드 실패:', error);
  }
  return DEFAULT_BRANDING;
}

// 비동기 버전 (Vercel KV 지원)
export async function getBrandingAsync(): Promise<BlogBranding> {
  const branding = await getBrandingData();
  return { ...DEFAULT_BRANDING, ...branding };
}

export async function saveBranding(branding: Partial<BlogBranding>): Promise<BlogBranding> {
  const current = await getBrandingAsync();
  const updated = { ...current, ...branding };
  await saveBrandingData(updated);
  return updated;
}

export function applyBranding(template: string, branding: BlogBranding): string {
  return template.replace(/{nickname}/g, branding.nickname);
}
