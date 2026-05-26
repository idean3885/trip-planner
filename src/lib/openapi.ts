/**
 * OpenAPI 3.0 스펙 정의
 * 모든 공개 API 엔드포인트를 문서화한다.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Trip Planner API",
    version: "2.1.0",
    description: [
      "여행 일정 관리 API. 세션 인증(웹 브라우저) 또는 PAT 인증(외부 클라이언트)을 지원합니다.",
      "",
      "## 인증",
      "- **Personal Access Token (PAT)**: 발급 페이지 [`/settings/tokens`](/settings/tokens). `Authorization: Bearer <token>` 헤더로 사용. 토큰 원문은 발급 시 1회만 노출됩니다.",
      "- **Session Cookie**: `next-auth.session-token`. 웹 브라우저에서 자동 처리.",
      "",
      "## AI CLI / MCP 연동",
      "trip MCP 서버는 GitHub 저장소(`https://github.com/idean3885/trip-planner`)의 `mcp/` 디렉토리에서 확인할 수 있습니다. Claude Code 등 AI CLI에서 PAT로 직접 호출하거나 MCP 서버로 연결하여 사용합니다.",
      "",
      "## 시간 표기 규약",
      "Activity의 `startTime`/`endTime`은 ISO 8601 datetime 문자열로 저장·응답됩니다(UTC 직렬화). 요청 시 `+09:00` 같은 offset을 포함해 보내면 서버가 UTC로 정규화하여 저장합니다. 원본 타임존을 보존하려면 `startTimezone`/`endTimezone`에 IANA 식별자(`Asia/Seoul`, `Europe/Lisbon` 등)를 함께 전달하세요.",
      "",
      "## 정렬 규약",
      "활동 목록은 `startTime` 오름차순을 1차 정렬, `sortOrder`를 동률 보조 정렬로 사용합니다. 신규 활동을 POST 할 때 `sortOrder`를 지정하지 않으면 0이 부여되므로, 시간 정보를 함께 보내는 것을 권장합니다.",
    ].join("\n"),
  },
  servers: [
    { url: "https://trip.idean.me", description: "Production" },
    { url: "http://localhost:3000", description: "Development" },
  ],
  security: [{ BearerAuth: [] }, { SessionAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Personal Access Token. 발급 페이지: `/settings/tokens`. `Authorization: Bearer <token>` 헤더로 사용합니다. 토큰 원문은 발급 시 1회만 노출되므로 즉시 안전한 곳에 보관하세요.",
      },
      SessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "웹 브라우저 세션 쿠키",
      },
    },
    schemas: {
      Trip: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          startDate: { type: "string", format: "date-time", nullable: true },
          endDate: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Day: {
        type: "object",
        properties: {
          id: { type: "integer" },
          tripId: { type: "integer" },
          date: { type: "string", format: "date-time" },
          title: { type: "string", nullable: true },
          content: { type: "string", nullable: true },
          sortOrder: { type: "integer" },
        },
      },
      TripMember: {
        type: "object",
        properties: {
          id: { type: "integer" },
          role: { type: "string", enum: ["OWNER", "HOST", "GUEST"] },
          joinedAt: { type: "string", format: "date-time" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
              image: { type: "string", nullable: true },
            },
          },
        },
      },
      PersonalAccessToken: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          tokenPrefix: { type: "string" },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          lastUsedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Activity: {
        type: "object",
        properties: {
          id: { type: "integer" },
          dayId: { type: "integer" },
          category: {
            type: "string",
            enum: ["SIGHTSEEING", "DINING", "TRANSPORT", "ACCOMMODATION", "SHOPPING", "OTHER"],
          },
          title: { type: "string" },
          startTime: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "ISO 8601 datetime (UTC 직렬화). 요청 시 offset 포함 가능.",
          },
          startTimezone: {
            type: "string",
            nullable: true,
            description: "IANA timezone 식별자 (예: `Asia/Seoul`, `Europe/Lisbon`).",
          },
          endTime: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "ISO 8601 datetime (UTC 직렬화).",
          },
          endTimezone: {
            type: "string",
            nullable: true,
            description: "IANA timezone 식별자.",
          },
          location: { type: "string", nullable: true },
          memo: { type: "string", nullable: true },
          cost: {
            type: "string",
            nullable: true,
            description:
              "비용 (DB Decimal). 응답은 항상 정수 문자열로 직렬화됩니다. 요청에는 number도 허용됩니다.",
          },
          currency: { type: "string", default: "EUR" },
          reservationStatus: {
            type: "string",
            nullable: true,
            enum: ["REQUIRED", "RECOMMENDED", "ON_SITE", "NOT_NEEDED"],
          },
          sortOrder: {
            type: "integer",
            description: "정렬 보조키. startTime 동률 시 사용. POST 시 미지정하면 0 부여.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", description: "에러 메시지" },
          code: {
            type: "string",
            nullable: true,
            description: "에러 코드 (선택). 클라이언트가 분기 처리할 때 사용.",
          },
        },
      },
    },
  },
  paths: {
    "/api/trips": {
      get: {
        operationId: "listTrips",
        tags: ["Trips"],
        summary: "여행 목록 조회",
        description: "현재 사용자가 멤버로 참여 중인 여행 목록을 반환한다.",
        responses: {
          "200": {
            description: "여행 목록",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Trip" } } } },
          },
          "401": { description: "미인증", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        operationId: "createTrip",
        tags: ["Trips"],
        summary: "여행 생성",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  startDate: { type: "string", format: "date-time" },
                  endDate: { type: "string", format: "date-time" },
                },
              },
              example: {
                title: "포르투갈·스페인 신혼여행",
                description: "리스본→포르투→마드리드→세비야→바르셀로나",
                startDate: "2026-06-07T00:00:00.000Z",
                endDate: "2026-06-21T00:00:00.000Z",
              },
            },
          },
        },
        responses: {
          "201": { description: "생성된 여행", content: { "application/json": { schema: { $ref: "#/components/schemas/Trip" } } } },
          "401": { description: "미인증", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/trips/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        operationId: "getTrip",
        tags: ["Trips"],
        summary: "여행 상세 조회",
        description:
          "여행 상세 정보, 일자 목록, 멤버 목록을 반환한다. **활동(activities)은 포함되지 않는다** — 일자별로 `GET /api/trips/{id}/days/{dayId}/activities`를 호출해야 한다.",
        responses: {
          "200": { description: "여행 상세" },
          "401": { description: "미인증", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "멤버가 아님", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        operationId: "updateTrip",
        tags: ["Trips"],
        summary: "여행 수정",
        description: "HOST 이상 권한 필요. 전달된 필드만 업데이트.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  startDate: { type: "string", format: "date-time" },
                  endDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "수정된 여행" },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        operationId: "deleteTrip",
        tags: ["Trips"],
        summary: "여행 삭제",
        description: "OWNER만 삭제 가능. 모든 일자와 멤버가 함께 삭제된다.",
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "OWNER가 아님", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/trips/{id}/days": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        operationId: "listDays",
        tags: ["Days"],
        summary: "일자 목록 조회",
        responses: {
          "200": { description: "일자 목록", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Day" } } } } },
          "403": { description: "멤버가 아님", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        operationId: "createDay",
        tags: ["Days"],
        summary: "일자 추가",
        description: "HOST 이상 권한 필요.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["date"],
                properties: {
                  date: { type: "string", format: "date-time" },
                  title: { type: "string" },
                  content: { type: "string" },
                  sortOrder: { type: "integer" },
                },
              },
              example: {
                date: "2026-06-07T00:00:00.000Z",
                title: "리스본 (도착)",
                content: "공항 픽업 + 호텔 체크인",
              },
            },
          },
        },
        responses: {
          "201": { description: "생성된 일자" },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/trips/{id}/days/{dayId}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
        { name: "dayId", in: "path", required: true, schema: { type: "integer" } },
      ],
      put: {
        operationId: "updateDay",
        tags: ["Days"],
        summary: "일자 수정",
        description: "HOST 이상 권한 필요.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  date: { type: "string", format: "date-time" },
                  sortOrder: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "수정된 일자" },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        operationId: "deleteDay",
        tags: ["Days"],
        summary: "일자 삭제",
        description: "HOST 이상 권한 필요.",
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/trips/{id}/days/{dayId}/activities": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
        { name: "dayId", in: "path", required: true, schema: { type: "integer" } },
      ],
      get: {
        operationId: "listActivities",
        tags: ["Activities"],
        summary: "활동 목록 조회",
        description:
          "일자의 활동 목록을 반환한다. **정렬 권장**: `startTime` 오름차순 1차, 동일 시간 시 `sortOrder` 보조.",
        responses: {
          "200": { description: "활동 목록", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Activity" } } } } },
          "401": { description: "미인증", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "멤버가 아님", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        operationId: "createActivity",
        tags: ["Activities"],
        summary: "활동 추가",
        description: "HOST 이상 권한 필요. `sortOrder`를 지정하지 않으면 0이 부여된다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["category", "title"],
                properties: {
                  category: { type: "string", enum: ["SIGHTSEEING", "DINING", "TRANSPORT", "ACCOMMODATION", "SHOPPING", "OTHER"] },
                  title: { type: "string" },
                  startTime: { type: "string", format: "date-time", description: "ISO 8601 datetime (offset 포함 가능)" },
                  startTimezone: { type: "string", description: "IANA timezone (예: `Asia/Seoul`)" },
                  endTime: { type: "string", format: "date-time" },
                  endTimezone: { type: "string", description: "IANA timezone" },
                  location: { type: "string" },
                  memo: { type: "string" },
                  cost: { type: "number", description: "비용 정수. 응답에서는 문자열로 직렬화." },
                  currency: { type: "string" },
                  reservationStatus: { type: "string", enum: ["REQUIRED", "RECOMMENDED", "ON_SITE", "NOT_NEEDED"] },
                  sortOrder: { type: "integer" },
                },
              },
              example: {
                category: "TRANSPORT",
                title: "포르투-마드리드 Ryanair",
                startTime: "2026-06-14T14:50:00+01:00",
                startTimezone: "Europe/Lisbon",
                endTime: "2026-06-14T17:05:00+02:00",
                endTimezone: "Europe/Madrid",
                location: "포르투(OPO) → 마드리드(MAD)",
                cost: 645870,
                currency: "KRW",
                reservationStatus: "REQUIRED",
                sortOrder: 2,
              },
            },
          },
        },
        responses: {
          "201": { description: "생성된 활동", content: { "application/json": { schema: { $ref: "#/components/schemas/Activity" } } } },
          "400": { description: "필수 필드 누락", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "일자 없음", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        operationId: "reorderActivities",
        tags: ["Activities"],
        summary: "활동 순서 변경",
        description: "HOST 이상 권한 필요. `orderedIds` 배열에 명시된 순서대로 `sortOrder`가 1부터 재부여된다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orderedIds"],
                properties: {
                  orderedIds: { type: "array", items: { type: "integer" }, description: "새 순서의 활동 ID 배열" },
                },
              },
              example: { orderedIds: [26, 27, 28, 92] },
            },
          },
        },
        responses: {
          "200": { description: "순서 변경 완료" },
          "400": { description: "orderedIds 누락", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/trips/{id}/days/{dayId}/activities/{activityId}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
        { name: "dayId", in: "path", required: true, schema: { type: "integer" } },
        { name: "activityId", in: "path", required: true, schema: { type: "integer" } },
      ],
      put: {
        operationId: "updateActivity",
        tags: ["Activities"],
        summary: "활동 수정",
        description: "HOST 이상 권한 필요. 전달된 필드만 업데이트.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["SIGHTSEEING", "DINING", "TRANSPORT", "ACCOMMODATION", "SHOPPING", "OTHER"] },
                  title: { type: "string" },
                  startTime: { type: "string", format: "date-time" },
                  startTimezone: { type: "string", description: "IANA timezone" },
                  endTime: { type: "string", format: "date-time" },
                  endTimezone: { type: "string", description: "IANA timezone" },
                  location: { type: "string" },
                  memo: { type: "string" },
                  cost: { type: "number" },
                  currency: { type: "string" },
                  reservationStatus: { type: "string", enum: ["REQUIRED", "RECOMMENDED", "ON_SITE", "NOT_NEEDED"] },
                  sortOrder: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "수정된 활동", content: { "application/json": { schema: { $ref: "#/components/schemas/Activity" } } } },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        operationId: "deleteActivity",
        tags: ["Activities"],
        summary: "활동 삭제",
        description: "HOST 이상 권한 필요.",
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "권한 부족", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/trips/{id}/members": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        operationId: "listMembers",
        tags: ["Members"],
        summary: "멤버 목록 조회",
        responses: {
          "200": { description: "멤버 목록", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/TripMember" } } } } },
        },
      },
      patch: {
        operationId: "changeMemberRole",
        tags: ["Members"],
        summary: "멤버 역할 변경",
        description: "promote(GUEST→HOST): HOST 필요, demote(HOST→GUEST): OWNER 필요.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["memberId", "action"],
                properties: {
                  memberId: { type: "integer" },
                  action: { type: "string", enum: ["promote", "demote"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "역할 변경 완료" } },
      },
      delete: {
        operationId: "removeMember",
        tags: ["Members"],
        summary: "멤버 제거",
        parameters: [{ name: "memberId", in: "query", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "제거 완료" } },
      },
    },
    "/api/trips/{id}/invite": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      post: {
        operationId: "createInvite",
        tags: ["Members"],
        summary: "초대 링크 생성",
        description: "HOST 이상 권한 필요. JWT 기반 7일 유효 초대 토큰 발급.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: { role: { type: "string", enum: ["HOST", "GUEST"] } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "초대 URL",
            content: { "application/json": { schema: { type: "object", properties: { inviteUrl: { type: "string" } } } } },
          },
        },
      },
    },
    "/api/trips/{id}/transfer": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      post: {
        operationId: "transferOwnership",
        tags: ["Members"],
        summary: "소유권 이전",
        description: "OWNER만 가능. 대상은 HOST여야 한다.",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["targetMemberId"], properties: { targetMemberId: { type: "integer" } } },
            },
          },
        },
        responses: { "200": { description: "이전 완료" } },
      },
    },
    "/api/trips/{id}/leave": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      post: {
        operationId: "leaveTrip",
        tags: ["Members"],
        summary: "여행 탈퇴",
        description: "OWNER는 탈퇴 불가 (소유권 이전 후 가능).",
        responses: { "200": { description: "탈퇴 완료" } },
      },
    },
    "/api/tokens": {
      get: {
        operationId: "listTokens",
        tags: ["Tokens"],
        summary: "토큰 목록 조회",
        description: "세션 인증 필수. 본인의 PAT 목록을 반환한다.",
        security: [{ SessionAuth: [] }],
        responses: {
          "200": {
            description: "토큰 목록",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/PersonalAccessToken" } } } },
          },
        },
      },
      post: {
        operationId: "createToken",
        tags: ["Tokens"],
        summary: "토큰 수동 생성",
        description: "세션 인증 필수. 생성된 토큰 원문은 이 응답에서만 노출된다. 권장 경로는 `install.sh`의 OAuth CLI 자동 발급이며, 본 엔드포인트는 웹 전용 사용자의 수동 발급용으로 유지된다.",
        security: [{ SessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", maxLength: 100 },
                  expiresAt: { type: "string", format: "date-time", nullable: true },
                },
              },
              example: { name: "claude-cli-2026-05", expiresAt: null },
            },
          },
        },
        responses: {
          "201": {
            description: "생성된 토큰 (원문 포함)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    token: { type: "string", description: "토큰 원문 (1회만 노출)" },
                    tokenPrefix: { type: "string" },
                    expiresAt: { type: "string", format: "date-time", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/tokens/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      delete: {
        operationId: "deleteToken",
        tags: ["Tokens"],
        summary: "토큰 삭제",
        description: "세션 인증 필수. 본인 토큰만 삭제 가능. 즉시 무효화.",
        security: [{ SessionAuth: [] }],
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "타인 토큰", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "존재하지 않음", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
} as const;
