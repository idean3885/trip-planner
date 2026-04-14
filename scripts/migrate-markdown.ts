/**
 * 마크다운 → DB 마이그레이션 스크립트
 *
 * trips/ 디렉토리의 마크다운 파일을 읽어 Trip + Day + TripMember(HOST) 레코드를 생성한다.
 * 실행: npx tsx scripts/migrate-markdown.ts
 *
 * 전제: 로그인한 사용자(AUTH_USER_EMAIL)가 Trip 생성자 겸 HOST로 등록된다.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/** 영어 slug → 한국어 표시명 */
const CITY_DISPLAY: Record<string, string> = {
  lisbon: "리스본", porto: "포르투", madrid: "마드리드",
  sevilla: "세비야", granada: "그라나다", barcelona: "바르셀로나",
  arrival: "도착", departure: "출발", wine: "와인",
  douro: "도우루", valley: "계곡", gaudi: "가우디",
  montserrat: "몬세라트", beach: "해변", shopping: "쇼핑",
};

function toKoreanTitle(slug: string): string {
  return slug
    .split(" ")
    .map((w) => CITY_DISPLAY[w.toLowerCase()] ?? w)
    .join(" · ");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: true },
  }),
});

const TRIPS_DIR = path.join(process.cwd(), "trips");
const AUTH_USER_EMAIL = process.env.AUTH_USER_EMAIL;

if (!AUTH_USER_EMAIL) {
  console.error("ERROR: AUTH_USER_EMAIL 환경변수를 설정하세요.");
  console.error("예: AUTH_USER_EMAIL=idean3885@gmail.com npx tsx scripts/migrate-markdown.ts");
  process.exit(1);
}

async function main() {
  // 1. 사용자 조회
  const user = await prisma.user.findUnique({
    where: { email: AUTH_USER_EMAIL },
  });
  if (!user) {
    console.error(`ERROR: 이메일 ${AUTH_USER_EMAIL}에 해당하는 사용자가 없습니다.`);
    console.error("먼저 웹앱에서 소셜 로그인하세요.");
    process.exit(1);
  }
  console.log(`사용자: ${user.name} (${user.email})`);

  // 2. trips/ 디렉토리 스캔
  const tripDirs = fs
    .readdirSync(TRIPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const tripDir of tripDirs) {
    const tripPath = path.join(TRIPS_DIR, tripDir.name);
    console.log(`\n--- 여행: ${tripDir.name} ---`);

    // 3. overview.md 파싱
    const overviewPath = path.join(tripPath, "overview.md");
    if (!fs.existsSync(overviewPath)) {
      console.warn(`  SKIP: overview.md 없음`);
      continue;
    }

    const overviewContent = fs.readFileSync(overviewPath, "utf-8");
    const { title, startDate, endDate } = parseOverview(overviewContent);
    console.log(`  제목: ${title}`);
    console.log(`  기간: ${startDate?.toISOString()} ~ ${endDate?.toISOString()}`);

    // 4. Trip 생성 (중복 방지)
    const existingTrip = await prisma.trip.findFirst({
      where: { title, createdBy: user.id },
    });
    if (existingTrip) {
      console.log(`  SKIP: 이미 존재하는 여행 (id: ${existingTrip.id})`);
      continue;
    }

    const trip = await prisma.trip.create({
      data: {
        title,
        description: overviewContent,
        startDate,
        endDate,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
    console.log(`  Trip 생성: id=${trip.id}`);

    // 5. TripMember(HOST) 등록
    await prisma.tripMember.create({
      data: {
        tripId: trip.id,
        userId: user.id,
        role: "HOST",
      },
    });
    console.log(`  TripMember(HOST) 등록`);

    // 6. daily/ 파일 파싱 → Day 레코드
    const dailyDir = path.join(tripPath, "daily");
    if (!fs.existsSync(dailyDir)) {
      console.warn(`  SKIP: daily/ 디렉토리 없음`);
      continue;
    }

    const dayFiles = fs
      .readdirSync(dailyDir)
      .filter((f) => f.endsWith(".md"))
      .sort();

    let dayCount = 0;
    for (const dayFile of dayFiles) {
      const dayContent = fs.readFileSync(path.join(dailyDir, dayFile), "utf-8");
      const parsed = parseDayFile(dayFile, trip.startDate);

      await prisma.day.create({
        data: {
          tripId: trip.id,
          date: parsed.date,
          title: parsed.title,
          content: dayContent,
          sortOrder: parsed.sortOrder,
        },
      });
      dayCount++;
    }
    console.log(`  Day 레코드: ${dayCount}개 생성`);
  }

  console.log("\n마이그레이션 완료.");
}

/**
 * overview.md에서 제목, 시작일, 종료일을 파싱한다.
 */
function parseOverview(content: string) {
  // 첫 번째 # 헤딩 = 제목
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Trip";

  // 기간 파싱: "2026.6.7(일) ~ 6.20(토)" 패턴
  const periodMatch = content.match(
    /기간.*?(\d{4})\.(\d{1,2})\.(\d{1,2}).*?~.*?(\d{1,2})\.(\d{1,2})/
  );

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (periodMatch) {
    const year = parseInt(periodMatch[1]);
    const startMonth = parseInt(periodMatch[2]) - 1;
    const startDay = parseInt(periodMatch[3]);
    const endMonth = parseInt(periodMatch[4]) - 1;
    const endDay = parseInt(periodMatch[5]);

    // UTC 자정으로 저장. 표시 시 UTC 기준 날짜 추출 → 타임존 무관
    startDate = new Date(Date.UTC(year, startMonth, startDay, 0, 0, 0));
    endDate = new Date(Date.UTC(year, endMonth, endDay, 0, 0, 0));
  }

  return { title, startDate, endDate };
}

/**
 * 일별 파일명에서 날짜와 제목을 파싱한다.
 * 파일명 패턴: dayNN-MMDD-title.md
 * 예: day01-0607-lisbon-arrival.md
 */
function parseDayFile(filename: string, tripStartDate: Date | null) {
  const match = filename.match(/day(\d+)-(\d{2})(\d{2})-(.+)\.md/);

  if (!match) {
    return {
      date: new Date(),
      title: filename.replace(".md", ""),
      sortOrder: 0,
    };
  }

  const dayNum = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  const day = parseInt(match[3]);
  const titleSlug = match[4].replace(/-/g, " ");
  const titleKo = toKoreanTitle(titleSlug);

  // 연도는 tripStartDate에서 가져옴
  const year = tripStartDate ? tripStartDate.getFullYear() : new Date().getFullYear();

  // UTC 자정으로 저장. 표시 시 UTC 기준 날짜 추출 → 타임존 무관
  const dateUtc = new Date(Date.UTC(year, month, day, 0, 0, 0));

  return {
    date: dateUtc,
    title: titleKo,
    sortOrder: dayNum,
  };
}

main()
  .catch((e) => {
    console.error("마이그레이션 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
