# MCP Tool Contracts: Activity CRUD

**Feature**: 006-structured-activity

## 신규 도구 (4개)

### create_activity

일자에 활동을 추가한다.

**Parameters**:
- trip_id (int, 필수): 여행 ID
- day_id (int, 필수): 일자 ID
- category (str, 필수): SIGHTSEEING | DINING | TRANSPORT | ACCOMMODATION | SHOPPING | OTHER
- title (str, 필수): 활동 제목
- start_time (str, 선택): "HH:mm" 형식
- end_time (str, 선택): "HH:mm" 형식
- location (str, 선택): 장소명
- memo (str, 선택): 메모
- cost (float, 선택): 예상 비용
- currency (str, 선택): 통화 코드 (기본 "EUR")
- reservation_status (str, 선택): REQUIRED | RECOMMENDED | ON_SITE | NOT_NEEDED

**Returns**: 생성 확인 메시지 (ID, 제목, 시간)

### update_activity

활동을 수정한다.

**Parameters**:
- trip_id (int, 필수): 여행 ID
- day_id (int, 필수): 일자 ID
- activity_id (int, 필수): 활동 ID
- title (str, 선택), start_time, end_time, location, memo, cost, currency, category, reservation_status: 변경할 필드

**Returns**: 수정 확인 메시지

### delete_activity

활동을 삭제한다.

**Parameters**:
- trip_id (int, 필수): 여행 ID
- day_id (int, 필수): 일자 ID
- activity_id (int, 필수): 활동 ID

**Returns**: 삭제 확인 메시지

### reorder_activities

일자 내 활동 순서를 변경한다.

**Parameters**:
- trip_id (int, 필수): 여행 ID
- day_id (int, 필수): 일자 ID
- activity_ids (list[int], 필수): 새 순서의 활동 ID 목록

**Returns**: 순서 변경 확인 메시지

## 기존 도구 변경

### get_trip (수정)

- 기존: days 목록에 content만 표시
- 변경: days 목록에 activities 수 표시, content 유무 표시

## 도구 총 수

기존 14개 + 신규 4개 = **18개**
