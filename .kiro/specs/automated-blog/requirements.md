# 요구사항 문서

## 소개

AI 기반 자동화 블로그 플랫폼으로, 투자/주식 관련 콘텐츠를 자동 생성하고 애드센스 수익화를 목표로 합니다. Next.js SSG와 Vercel 무료 티어를 활용하여 초기 비용을 최소화합니다.

## 용어집

- **Blog_System**: 전체 자동화 블로그 플랫폼
- **Content_Generator**: AI를 활용한 콘텐츠 생성 모듈
- **SEO_Optimizer**: 검색엔진 최적화 처리 모듈
- **Admin_Panel**: 블로그 관리를 위한 관리자 페이지
- **Post**: 블로그에 게시되는 개별 글
- **Storage**: 콘텐츠 저장소 (JSON 파일 또는 Supabase)

## 요구사항

### 요구사항 1: AI 콘텐츠 생성

**사용자 스토리:** 블로그 운영자로서, AI가 자연스러운 투자/주식 관련 글을 자동 생성하여 콘텐츠 작성 시간을 절약하고 싶습니다.

#### 수용 기준

1. WHEN 관리자가 주제를 입력하면 THE Content_Generator SHALL OpenAI API를 호출하여 글을 생성한다
2. THE Content_Generator SHALL 자연스러운 한국어 문체로 글을 작성한다
3. THE Content_Generator SHALL 최소 1000자 이상의 본문을 생성한다
4. WHEN 글이 생성되면 THE Blog_System SHALL 제목, 본문, 메타 설명을 포함한 Post를 생성한다

### 요구사항 2: SEO 최적화

**사용자 스토리:** 블로그 운영자로서, 검색엔진에서 상위 노출되어 더 많은 방문자를 유치하고 싶습니다.

#### 수용 기준

1. THE SEO_Optimizer SHALL 각 Post에 메타 태그(title, description, keywords)를 자동 생성한다
2. THE SEO_Optimizer SHALL Open Graph 태그를 포함한다
3. THE Blog_System SHALL sitemap.xml을 자동 생성한다
4. THE Blog_System SHALL robots.txt를 제공한다
5. THE Blog_System SHALL 시맨틱 HTML 구조를 사용한다

### 요구사항 3: 애드센스 통합

**사용자 스토리:** 블로그 운영자로서, 구글 애드센스 광고를 통해 수익을 창출하고 싶습니다.

#### 수용 기준

1. THE Blog_System SHALL 애드센스 스크립트를 페이지에 삽입할 수 있다
2. THE Blog_System SHALL 광고 위치를 설정할 수 있는 컴포넌트를 제공한다
3. WHEN 페이지가 로드되면 THE Blog_System SHALL 광고가 정상적으로 표시되도록 한다

### 요구사항 4: 관리자 페이지

**사용자 스토리:** 블로그 운영자로서, 간단한 관리자 페이지에서 콘텐츠를 관리하고 싶습니다.

#### 수용 기준

1. THE Admin_Panel SHALL 새 글 생성 기능을 제공한다
2. THE Admin_Panel SHALL 기존 글 목록 조회 기능을 제공한다
3. THE Admin_Panel SHALL 글 삭제 기능을 제공한다
4. THE Admin_Panel SHALL 간단한 비밀번호 인증을 제공한다

### 요구사항 5: 데이터 저장

**사용자 스토리:** 블로그 운영자로서, 생성된 콘텐츠가 안전하게 저장되어 언제든 조회할 수 있기를 원합니다.

#### 수용 기준

1. THE Storage SHALL Post 데이터를 JSON 파일로 저장한다
2. THE Storage SHALL 글 생성 시 고유 ID와 생성일시를 기록한다
3. WHEN 빌드가 실행되면 THE Blog_System SHALL JSON 파일에서 모든 Post를 읽어 정적 페이지를 생성한다

### 요구사항 6: 정적 사이트 생성

**사용자 스토리:** 블로그 운영자로서, 빠른 로딩 속도와 무료 호스팅을 위해 정적 사이트로 배포하고 싶습니다.

#### 수용 기준

1. THE Blog_System SHALL Next.js SSG를 사용하여 정적 HTML을 생성한다
2. THE Blog_System SHALL Vercel에 자동 배포될 수 있다
3. THE Blog_System SHALL 빌드 시 모든 Post 페이지를 사전 생성한다
