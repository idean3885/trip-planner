# API Contracts: Activity CRUD

**Feature**: 006-structured-activity

## Web API 엔드포인트

### GET /api/trips/{tripId}/days/{dayId}/activities

일자의 활동 목록 조회. 시간순 → sortOrder순 정렬.

**인증**: Bearer PAT 또는 세션
**응답**: Activity[] (정렬 적용)

### POST /api/trips/{tripId}/days/{dayId}/activities

활동 추가.

**인증**: Bearer PAT 또는 세션 (HOST 이상)
**요청 본문**:
- category (필수): ActivityCategory enum 값
- title (필수): 활동 제목
- startTime (선택): "HH:mm"
- endTime (선택): "HH:mm"
- location (선택): 장소명
- memo (선택): 메모
- cost (선택): 숫자
- currency (선택): 통화 코드 (기본 "EUR")
- reservationStatus (선택): ReservationStatus enum 값
- sortOrder (선택): 정수 (기본 0)

**응답**: 생성된 Activity (201)

### PUT /api/trips/{tripId}/days/{dayId}/activities/{activityId}

활동 수정. 전달된 필드만 업데이트.

**인증**: Bearer PAT 또는 세션 (HOST 이상)
**요청 본문**: POST와 동일 (모든 필드 선택)
**응답**: 수정된 Activity

### DELETE /api/trips/{tripId}/days/{dayId}/activities/{activityId}

활동 삭제.

**인증**: Bearer PAT 또는 세션 (HOST 이상)
**응답**: { ok: true }

### PATCH /api/trips/{tripId}/days/{dayId}/activities/reorder

활동 순서 변경.

**인증**: Bearer PAT 또는 세션 (HOST 이상)
**요청 본문**:
- orderedIds (필수): 활동 ID 배열 (새 순서)

**응답**: { ok: true }
