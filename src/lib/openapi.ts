/**
 * OpenAPI 3.0 스펙 정의
 * 모든 공개 API 엔드포인트를 문서화한다.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Trip Planner API",
    version: "2.0.0",
    description:
      "여행 일정 관리 API. 세션 인증(웹 브라우저) 또는 PAT 인증(외부 클라이언트)을 지원합니다.",
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
        description: "Personal Access Token (설정 페이지에서 생성)",
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
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/trips": {
      get: {
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
            },
          },
        },
        responses: {
          "201": { description: "생성된 여행", content: { "application/json": { schema: { $ref: "#/components/schemas/Trip" } } } },
          "401": { description: "미인증" },
        },
      },
    },
    "/api/trips/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        tags: ["Trips"],
        summary: "여행 상세 조회",
        description: "여행 상세 정보, 일자 목록, 멤버 목록을 반환한다.",
        responses: {
          "200": { description: "여행 상세" },
          "401": { description: "미인증" },
          "403": { description: "멤버가 아님" },
        },
      },
      put: {
        tags: ["Trips"],
        summary: "여행 수정",
        description: "HOST 이상 권한 필요.",
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
          "403": { description: "권한 부족" },
        },
      },
      delete: {
        tags: ["Trips"],
        summary: "여행 삭제",
        description: "OWNER만 삭제 가능. 모든 일자와 멤버가 함께 삭제된다.",
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "OWNER가 아님" },
        },
      },
    },
    "/api/trips/{id}/days": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        tags: ["Days"],
        summary: "일자 목록 조회",
        responses: {
          "200": { description: "일자 목록", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Day" } } } } },
          "403": { description: "멤버가 아님" },
        },
      },
      post: {
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
            },
          },
        },
        responses: {
          "201": { description: "생성된 일자" },
          "403": { description: "권한 부족" },
        },
      },
    },
    "/api/trips/{id}/days/{dayId}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
        { name: "dayId", in: "path", required: true, schema: { type: "integer" } },
      ],
      put: {
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
          "403": { description: "권한 부족" },
        },
      },
      delete: {
        tags: ["Days"],
        summary: "일자 삭제",
        description: "HOST 이상 권한 필요.",
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "권한 부족" },
        },
      },
    },
    "/api/trips/{id}/members": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        tags: ["Members"],
        summary: "멤버 목록 조회",
        responses: {
          "200": { description: "멤버 목록", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/TripMember" } } } } },
        },
      },
      patch: {
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
        tags: ["Members"],
        summary: "멤버 제거",
        parameters: [{ name: "memberId", in: "query", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "제거 완료" } },
      },
    },
    "/api/trips/{id}/invite": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      post: {
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
        tags: ["Members"],
        summary: "여행 탈퇴",
        description: "OWNER는 탈퇴 불가 (소유권 이전 후 가능).",
        responses: { "200": { description: "탈퇴 완료" } },
      },
    },
    "/api/tokens": {
      get: {
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
        tags: ["Tokens"],
        summary: "토큰 생성",
        description: "세션 인증 필수. 생성된 토큰 원문은 이 응답에서만 노출된다.",
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
        tags: ["Tokens"],
        summary: "토큰 삭제",
        description: "세션 인증 필수. 본인 토큰만 삭제 가능. 즉시 무효화.",
        security: [{ SessionAuth: [] }],
        responses: {
          "200": { description: "삭제 완료" },
          "403": { description: "타인 토큰" },
          "404": { description: "존재하지 않음" },
        },
      },
    },
  },
} as const;
