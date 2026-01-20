# 설계 문서

## 개요

자동화 블로그 플랫폼은 Next.js 14 App Router를 사용한 정적 사이트 생성(SSG) 기반 웹앱입니다. OpenAI API로 콘텐츠를 생성하고, JSON 파일로 데이터를 저장하며, Vercel에 무료 배포합니다.

## 아키텍처

```mermaid
graph TB
    subgraph "프론트엔드 (Next.js)"
        A[블로그 페이지] --> B[글 목록]
        A --> C[글 상세]
        D[관리자 페이지] --> E[글 생성]
        D --> F[글 관리]
    end
    
    subgraph "API Routes"
        G[/api/posts] --> H[CRUD 처리]
        I[/api/generate] --> J[AI 생성]
    end
    
    subgraph "데이터"
        K[(posts.json)]
    end
    
    subgraph "외부 서비스"
        L[OpenAI API]
        M[Google AdSense]
    end
    
    E --> I
    I --> L
    H --> K
    A --> M
```

## 컴포넌트 및 인터페이스

### 디렉토리 구조

```
/
├── app/
│   ├── page.tsx              # 메인 페이지 (글 목록)
│   ├── posts/[slug]/page.tsx # 글 상세 페이지
│   ├── admin/page.tsx        # 관리자 페이지
│   ├── api/
│   │   ├── posts/route.ts    # 글 CRUD API
│   │   └── generate/route.ts # AI 생성 API
│   └── layout.tsx            # 공통 레이아웃
├── components/
│   ├── PostCard.tsx          # 글 카드 컴포넌트
│   ├── AdBanner.tsx          # 애드센스 배너
│   └── SEOHead.tsx           # SEO 메타태그
├── lib/
│   ├── posts.ts              # 글 데이터 처리
│   ├── openai.ts             # OpenAI API 클라이언트
│   └── storage.ts            # JSON 파일 저장
├── data/
│   └── posts.json            # 글 데이터 저장소
└── public/
    └── robots.txt
```

### 핵심 인터페이스

```typescript
// Post 타입
interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

// AI 생성 요청
interface GenerateRequest {
  topic: string;
  keywords?: string[];
}

// AI 생성 응답
interface GenerateResponse {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
}
```

## 데이터 모델

### posts.json 구조

```json
{
  "posts": [
    {
      "id": "uuid-v4",
      "slug": "url-friendly-title",
      "title": "글 제목",
      "content": "마크다운 본문",
      "excerpt": "요약 (메타 설명용)",
      "keywords": ["투자", "주식"],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 정확성 속성

*정확성 속성은 시스템의 모든 유효한 실행에서 참이어야 하는 특성입니다. 이는 사람이 읽을 수 있는 명세와 기계로 검증 가능한 정확성 보장 사이의 다리 역할을 합니다.*

사용자 요청에 따라 테스트 코드를 최소화하므로, 핵심 속성만 정의합니다:

**Property 1: Post 저장 및 조회 일관성**
*모든* Post에 대해, 저장 후 조회하면 동일한 데이터를 반환해야 한다
**검증: 요구사항 5.1, 5.2**

**Property 2: Slug 고유성**
*모든* Post에 대해, slug는 고유해야 한다
**검증: 요구사항 5.2**

## 오류 처리

| 상황 | 처리 방법 |
|------|----------|
| OpenAI API 실패 | 에러 메시지 반환, 재시도 안내 |
| JSON 파일 읽기 실패 | 빈 배열 반환 |
| 잘못된 관리자 비밀번호 | 401 Unauthorized |
| 존재하지 않는 글 | 404 페이지 표시 |

## 테스트 전략

사용자 요청에 따라 테스트를 최소화합니다:

- **수동 테스트**: 주요 기능 동작 확인
- **빌드 검증**: `npm run build` 성공 여부로 기본 검증
- **선택적 단위 테스트**: 핵심 유틸리티 함수만 (필요시)
