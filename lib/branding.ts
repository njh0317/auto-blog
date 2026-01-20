// 블로그 브랜딩 설정 모듈
import fs from 'fs';
import path from 'path';

export interface BlogBranding {
  nickname: string;
  greeting: string;
  closing: string;
  style: 'formal' | 'casual';
}

const BRANDING_FILE = path.join(process.cwd(), 'data', 'branding.json');

const DEFAULT_BRANDING: BlogBranding = {
  nickname: '투자하는 개발자',
  greeting: '안녕하세요 {nickname}입니다.\n오늘 미국증시 마감시황 알려드리겠습니다.',
  closing: '감사합니다.\n\n※ 본 콘텐츠는 투자 참고용이며, 투자 판단의 최종 책임은 투자자 본인에게 있습니다.',
  style: 'casual',
};

export function getBranding(): BlogBranding {
  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const data = fs.readFileSync(BRANDING_FILE, 'utf-8');
      return { ...DEFAULT_BRANDING, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('브랜딩 설정 로드 실패:', error);
  }
  return DEFAULT_BRANDING;
}

export function saveBranding(branding: Partial<BlogBranding>): BlogBranding {
  const current = getBranding();
  const updated = { ...current, ...branding };
  
  try {
    const dir = path.dirname(BRANDING_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(updated, null, 2));
  } catch (error) {
    console.error('브랜딩 설정 저장 실패:', error);
  }
  
  return updated;
}

export function applyBranding(template: string, branding: BlogBranding): string {
  return template.replace(/{nickname}/g, branding.nickname);
}
