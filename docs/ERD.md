# ERD (Entity-Relationship Diagram)

Prisma 스키마 기준. `prisma/schema.prisma` 참조.

```mermaid
erDiagram
    User {
        string id PK "cuid"
        string name
        string email UK
        datetime emailVerified
        string image
        datetime createdAt
    }

    Account {
        string id PK "cuid"
        string userId FK
        string type
        string provider
        string providerAccountId
        string refresh_token
        string access_token
        int expires_at
        string token_type
        string scope
        string id_token
        string session_state
    }

    Session {
        string id PK "cuid"
        string sessionToken UK
        string userId FK
        datetime expires
    }

    VerificationToken {
        string identifier
        string token
        datetime expires
    }

    Trip {
        int id PK "autoincrement"
        string title
        text description
        timestamptz startDate
        timestamptz endDate
        string createdBy FK
        string updatedBy FK
        timestamptz createdAt
        timestamptz updatedAt
    }

    Day {
        int id PK "autoincrement"
        int tripId FK
        timestamptz date
        string title
        text content
        int sortOrder
    }

    Activity {
        int id PK "autoincrement"
        int dayId FK
        enum category "SIGHTSEEING DINING TRANSPORT ACCOMMODATION SHOPPING OTHER"
        string title
        timestamptz startTime
        varchar startTimezone "IANA e.g. Asia/Seoul"
        timestamptz endTime
        varchar endTimezone "IANA e.g. Europe/Lisbon"
        string location
        text memo
        decimal cost "10,2"
        varchar currency "3 default EUR"
        enum reservationStatus "REQUIRED RECOMMENDED ON_SITE NOT_NEEDED"
        int sortOrder
        timestamptz createdAt
        timestamptz updatedAt
    }

    TripMember {
        int id PK "autoincrement"
        int tripId FK
        string userId FK
        enum role "OWNER HOST GUEST"
        timestamptz joinedAt
    }

    PersonalAccessToken {
        int id PK "autoincrement"
        string userId FK
        string name
        string tokenHash UK
        varchar tokenPrefix "11"
        timestamptz expiresAt
        timestamptz lastUsedAt
        timestamptz createdAt
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
