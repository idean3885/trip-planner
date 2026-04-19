# 아키텍처

> **대상 독자**: 기여자·개발자 — 전체 시스템 구성 요소와 흐름을 파악하려는 분.

## 시스템 개요

```mermaid
graph TB
    subgraph Clients
        Browser[웹 브라우저]
        ClaudeDesktop[Claude Desktop]
        ClaudeCLI[Claude Code CLI]
    end

    subgraph "Vercel (Next.js)"
        Middleware[Middleware<br/>세션 가드]
        Pages[Server Components<br/>SSR 페이지]
        API[API Routes<br/>REST]
        AuthConfig[Auth.js v5<br/>Google OAuth]
    end

    subgraph "MCP Server (Python)"
        MCPServer[FastMCP]
        Planner[planner.py<br/>12 도구]
        Search[search.py<br/>8 도구]
        WebClient[web_client.py<br/>HTTP + PAT 인증]
    end

    subgraph "External"
        NeonDB[(Neon Postgres)]
        Google[Google OAuth]
        RapidAPI[RapidAPI<br/>Booking/Flights]
        Keychain[macOS Keychain]
    end

    Browser -->|세션 쿠키| Middleware --> Pages --> API
    Browser -->|Google 로그인| AuthConfig --> Google
    ClaudeDesktop --> MCPServer
    ClaudeCLI --> MCPServer
    MCPServer --> Planner --> WebClient
    MCPServer --> Search --> RapidAPI
    WebClient -->|PAT Bearer| API
    WebClient --> Keychain
    API -->|Prisma ORM| NeonDB
    Pages -->|Prisma ORM| NeonDB
```

## 인증 흐름

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant A as API Route
    participant H as auth-helpers
    participant P as Prisma
    participant DB as Neon DB

    alt 웹 브라우저
        C->>M: 요청 (세션 쿠키)
        M->>M: NextAuth 세션 검증
        M-->>C: 401 (미인증 시)
        M->>A: 통과
    else MCP / 외부 클라이언트
        C->>A: 요청 (Bearer PAT)
    end

    A->>H: getAuthUserId()
    H->>H: 세션 확인 → 실패 시 Bearer 헤더 파싱
    H->>P: PAT 해시 검증
    P->>DB: personal_access_tokens 조회
    H-->>A: userId

    A->>H: canEdit(tripId, userId)
    H->>P: TripMember 역할 조회
    P->>DB: trip_members WHERE tripId, userId
    H-->>A: boolean

    A->>P: 비즈니스 로직 (CRUD)
    P->>DB: SQL
    A-->>C: JSON 응답
```

## 데이터 접근 구조 (현재)

```mermaid
graph LR
    subgraph "API Routes (비즈니스 로직 + 데이터 접근 혼재)"
        R1["/api/trips"]
        R2["/api/trips/[id]"]
        R3["/api/trips/[id]/days"]
        R4["/api/trips/[id]/days/[dayId]"]
        R5["/api/trips/[id]/days/[dayId]/activities"]
        R6["/api/trips/[id]/days/[dayId]/activities/[id]"]
        R7["/api/trips/[id]/members"]
        R8["/api/tokens"]
    end

    subgraph "Shared"
        AH[auth-helpers.ts<br/>인증 + 권한]
        PR[prisma.ts<br/>DB 싱글톤]
    end

    R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 --> AH
    R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 --> PR
    PR --> DB[(Neon DB)]
```

**특징:**
- 서비스/레포지토리 계층 없음 — 라우트가 Prisma를 직접 호출
- 각 라우트가 독립적으로 인증 → 권한 → Prisma 쿼리 → 응답 수행
- 비즈니스 로직과 데이터 접근이 라우트 핸들러에 혼재

## 도메인 결합도

```mermaid
graph TD
    subgraph "강결합 (Prisma FK + Cascade)"
        Trip -->|CASCADE| Day
        Day -->|CASCADE| Activity
        Trip -->|CASCADE| TripMember
        User -->|CASCADE| Account
        User -->|CASCADE| Session
        User -->|CASCADE| PersonalAccessToken
    end

    subgraph "약결합 (FK 참조만)"
        Trip -.->|createdBy| User
        Trip -.->|updatedBy| User
        TripMember -.->|userId| User
    end

    style Trip fill:#f9f,stroke:#333
    style Day fill:#f9f,stroke:#333
    style Activity fill:#f9f,stroke:#333
```

**현재 도메인 의존 관계:**
- Trip → Day → Activity: 강결합 (Cascade 삭제 의존)
- 도메인 이벤트 없음: Trip 삭제 시 Day/Activity가 DB 레벨에서 연쇄 삭제
- 도메인 간 호출: 라우트가 다른 도메인의 Prisma 모델을 직접 참조

## MCP 서버 구조

```mermaid
graph TB
    subgraph "MCP Server (Python)"
        S[server.py<br/>FastMCP 진입점]
        P[planner.py<br/>일정 관리 12도구]
        SR[search.py<br/>검색 8도구]
        W[web_client.py<br/>HTTP 클라이언트]
    end

    S --> P
    S --> SR
    P --> W
    W -->|PAT Bearer| API[trip.idean.me API]
    SR -->|RapidAPI Key| RA[RapidAPI]
    W -->|토큰 저장/조회| KC[macOS Keychain]

    style W fill:#ff9,stroke:#333
```

**web_client.py 인증 흐름:**
1. macOS Keychain에서 PAT 조회
2. API 호출 시 Bearer 헤더 첨부
3. 401 응답 시 브라우저 OAuth 자동 재인증 → 새 PAT 발급 → 요청 재시도

## 현재 한계

| 항목 | 현재 상태 | 영향 |
|------|----------|------|
| **서비스 계층 부재** | 라우트에 Prisma 직접 호출 | 비즈니스 로직 재사용 불가, 테스트 시 Prisma mock 필수 |
| **도메인 이벤트 없음** | Cascade 삭제에 의존 | 삭제 시 부가 작업(로그, 알림) 추가 불가 |
| **권한 체크 반복** | 모든 라우트에서 동일 패턴 | 중복 코드, 누락 위험 |
| **트랜잭션 범위** | 라우트 단위 단일 쿼리 | 복합 작업 시 부분 실패 가능 |
| **프론트-백 결합** | Server Component가 Prisma 직접 호출 | API 분리 시 전면 리팩토링 필요 |
