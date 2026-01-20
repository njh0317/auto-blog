# Vercel 배포 가이드

## 1. Vercel 계정 생성
https://vercel.com 에서 GitHub 계정으로 가입

## 2. 프로젝트 배포
1. GitHub에 이 프로젝트를 push
2. Vercel 대시보드에서 "New Project" 클릭
3. GitHub 저장소 선택
4. "Deploy" 클릭

## 3. 환경 변수 설정
Vercel 프로젝트 Settings > Environment Variables에서 추가:

| 변수명 | 설명 |
|--------|------|
| `OPENAI_API_KEY` | OpenAI API 키 |
| `ADMIN_PASSWORD` | 관리자 비밀번호 |
| `NEXT_PUBLIC_SITE_URL` | 배포된 사이트 URL (예: https://your-blog.vercel.app) |
| `NEXT_PUBLIC_ADSENSE_ID` | 구글 애드센스 ID (선택) |

## 4. 재배포
환경 변수 설정 후 Deployments 탭에서 "Redeploy" 클릭

## 5. 사용 방법
- 메인 페이지: `https://your-domain.com`
- 관리자 페이지: `https://your-domain.com/admin`

## 주의사항
- OpenAI API는 사용량에 따라 비용이 발생합니다
- 애드센스는 승인 후 사용 가능합니다
- `robots.txt`의 Sitemap URL을 실제 도메인으로 변경하세요
