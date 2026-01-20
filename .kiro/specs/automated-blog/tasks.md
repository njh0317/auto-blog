# 구현 계획: 자동화 블로그 플랫폼

## 개요

Next.js 14 기반 자동화 블로그 플랫폼을 단계별로 구현합니다. 각 태스크는 이전 단계를 기반으로 점진적으로 진행됩니다.

## 태스크

- [x] 1. 프로젝트 초기 설정
  - Next.js 14 프로젝트 생성 (App Router)
  - TypeScript 설정
  - 기본 디렉토리 구조 생성
  - 환경 변수 설정 (.env.local)
  - _요구사항: 6.1_

- [x] 2. 데이터 모델 및 저장소 구현
  - [x] 2.1 Post 타입 정의 및 JSON 저장소 구현
    - `lib/types.ts` - Post 인터페이스 정의
    - `lib/storage.ts` - JSON 파일 읽기/쓰기 함수
    - `data/posts.json` - 초기 빈 데이터 파일
    - _요구사항: 5.1, 5.2_
  
  - [x] 2.2 글 데이터 처리 유틸리티 구현
    - `lib/posts.ts` - CRUD 함수 (getAllPosts, getPostBySlug, createPost, deletePost)
    - slug 생성 함수
    - _요구사항: 5.1, 5.2, 5.3_

- [x] 3. AI 콘텐츠 생성 기능 구현
  - [x] 3.1 OpenAI API 클라이언트 구현
    - `lib/openai.ts` - OpenAI API 호출 함수
    - 투자/주식 관련 프롬프트 템플릿
    - _요구사항: 1.1, 1.2, 1.3_
  
  - [x] 3.2 콘텐츠 생성 API 라우트 구현
    - `app/api/generate/route.ts` - POST 핸들러
    - 제목, 본문, 메타 설명 생성
    - _요구사항: 1.1, 1.4_

- [x] 4. 블로그 페이지 구현
  - [x] 4.1 공통 레이아웃 및 SEO 컴포넌트 구현
    - `app/layout.tsx` - 기본 레이아웃
    - `components/SEOHead.tsx` - 메타태그 컴포넌트
    - _요구사항: 2.1, 2.2, 2.5_
  
  - [x] 4.2 메인 페이지 (글 목록) 구현
    - `app/page.tsx` - 글 목록 페이지
    - `components/PostCard.tsx` - 글 카드 컴포넌트
    - _요구사항: 6.1, 6.3_
  
  - [x] 4.3 글 상세 페이지 구현
    - `app/posts/[slug]/page.tsx` - 동적 라우트
    - generateStaticParams로 정적 생성
    - _요구사항: 6.1, 6.3_

- [x] 5. SEO 및 애드센스 설정
  - [x] 5.1 SEO 파일 생성
    - `app/sitemap.ts` - 동적 sitemap 생성
    - `public/robots.txt` - robots 파일
    - _요구사항: 2.3, 2.4_
  
  - [x] 5.2 애드센스 컴포넌트 구현
    - `components/AdBanner.tsx` - 광고 배너 컴포넌트
    - 페이지에 광고 위치 설정
    - _요구사항: 3.1, 3.2, 3.3_

- [x] 6. 관리자 페이지 구현
  - [x] 6.1 관리자 인증 구현
    - 간단한 비밀번호 인증 (환경 변수)
    - _요구사항: 4.4_
  
  - [x] 6.2 관리자 UI 구현
    - `app/admin/page.tsx` - 관리자 페이지
    - 글 생성 폼
    - 글 목록 및 삭제 기능
    - _요구사항: 4.1, 4.2, 4.3_
  
  - [x] 6.3 글 관리 API 구현
    - `app/api/posts/route.ts` - GET, POST, DELETE 핸들러
    - _요구사항: 4.1, 4.2, 4.3_

- [x] 7. 체크포인트 - 빌드 및 동작 확인
  - `npm run build` 성공 확인
  - 로컬에서 기본 기능 동작 확인
  - 문제 발생 시 사용자에게 문의

- [x] 8. 배포 설정
  - Vercel 배포를 위한 설정 확인
  - 환경 변수 설정 안내 문서 작성
  - _요구사항: 6.2_

## 참고사항

- 테스트 코드는 사용자 요청에 따라 최소화
- 빌드 성공 여부로 기본 검증
- 각 태스크는 이전 태스크 완료 후 진행
