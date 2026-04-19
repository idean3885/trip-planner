# ERD (Entity-Relationship Diagram)

> **대상 독자**: 기여자·개발자 — 데이터 모델·관계·인덱스를 확인하려는 분.

Prisma 스키마 기준. `prisma/schema.prisma` 참조.

```mermaid
erDiagram
    User {
        string id PK "cuid"
        string name "사용자 이름"
        string email UK "Google OAuth 이메일"
        datetime emailVerified "이메일 인증 시각"
        string image "프로필 이미지 URL"
        datetime createdAt "가입 시각"
    }

    Account {
        string id PK "cuid"
        string userId FK "소속 사용자"
        string type "OAuth 타입"
        string provider "인증 제공자 (google 등)"
        string providerAccountId "제공자 계정 ID"
        string refresh_token "갱신 토큰"
        string access_token "접근 토큰"
        int expires_at "토큰 만료 (epoch)"
        string token_type "토큰 타입"
        string scope "OAuth 스코프"
        string id_token "OIDC ID 토큰"
        string session_state "세션 상태"
    }

    Session {
        string id PK "cuid"
        string sessionToken UK "세션 토큰"
        string userId FK "소속 사용자"
        datetime expires "만료 시각"
    }

    VerificationToken {
        string identifier "인증 대상 (이메일 등)"
        string token "인증 토큰"
        datetime expires "만료 시각"
    }

    Trip {
        int id PK "autoincrement"
        string title "여행 제목"
        text description "여행 설명 (마크다운)"
        timestamptz startDate "여행 시작일"
        timestamptz endDate "여행 종료일"
        string createdBy FK "생성자"
        string updatedBy FK "최종 수정자"
        timestamptz createdAt "생성 시각"
        timestamptz updatedAt "수정 시각"
    }

    Day {
        int id PK "autoincrement"
        int tripId FK "소속 여행"
        timestamptz date "날짜"
        string title "일자 제목 (e.g. 리스본 도착)"
        text content "마크다운 콘텐츠 (레거시)"
        int sortOrder "표시 순서"
    }

    Activity {
        int id PK "autoincrement"
        int dayId FK "소속 일자"
        enum category "활동 유형: SIGHTSEEING DINING TRANSPORT ACCOMMODATION SHOPPING OTHER"
        string title "활동 제목"
        timestamptz startTime "시작 시각 (UTC 저장)"
        varchar startTimezone "시작 표시 시간대 (IANA, NULL이면 Day 도시 기준)"
        timestamptz endTime "종료 시각 (UTC 저장)"
        varchar endTimezone "종료 표시 시간대 (IANA, NULL이면 startTimezone)"
        string location "장소명"
        text memo "메모"
        decimal cost "예상 비용 (10,2)"
        varchar currency "ISO 4217 통화 코드 (기본 EUR)"
        enum reservationStatus "예약 상태: REQUIRED RECOMMENDED ON_SITE NOT_NEEDED"
        int sortOrder "일자 내 표시 순서 (0부터)"
        timestamptz createdAt "생성 시각"
        timestamptz updatedAt "수정 시각"
    }

    TripMember {
        int id PK "autoincrement"
        int tripId FK "소속 여행"
        string userId FK "멤버 사용자"
        enum role "역할: OWNER HOST GUEST"
        timestamptz joinedAt "참여 시각"
    }

    PersonalAccessToken {
        int id PK "autoincrement"
        string userId FK "소유 사용자"
        string name "토큰 이름 (표시용)"
        string tokenHash UK "SHA-256 해시 (인증 검증)"
        varchar tokenPrefix "토큰 접두사 (11자, 식별용)"
        timestamptz expiresAt "만료 시각 (NULL이면 무기한)"
        timestamptz lastUsedAt "마지막 사용 시각"
        timestamptz createdAt "생성 시각"
    }

    User ||--o{ Account : "has"
    User ||--o{ Session : "has"
    User ||--o{ Trip : "created (createdBy)"
    User ||--o{ Trip : "updated (updatedBy)"
    User ||--o{ TripMember : "joins"
    User ||--o{ PersonalAccessToken : "owns"
    Trip ||--o{ Day : "contains"
    Trip ||--o{ TripMember : "has"
    Day ||--o{ Activity : "contains"
```

## 설계 결정

### Activity 시간대 (startTimezone / endTimezone)

- **Timestamptz**는 절대 시각(UTC)을 저장하지만 표시 시간대 정보는 유실됨
- IANA timezone 컬럼으로 원래 표시 시간대를 보존
- 국제 이동(항공편)에서 출발/도착 시간대가 다른 경우 정확한 표시 가능
- nullable: 대부분 활동은 Day 도시 시간대와 동일하므로 생략 가능
- 예: `startTimezone: "Asia/Seoul"` → 표시: `13:00 KST`
