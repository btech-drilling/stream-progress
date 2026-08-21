// lib/targets.js

// ======================================================
// PROJECT DATES
// ======================================================

// กรรมการอนุมัติแผน
export const PLAN_APPROVAL_DATE =
  '2026-08-17';

// เริ่มโครงการ / เริ่มเก็บตัวอย่าง
// Day 1 ของแผน
export const COLLECTION_START_DATE =
  '2026-08-18';

// วันสุดท้ายตามแผน / Final Delivery
export const PROGRESS_END_DATE =
  '2026-10-15';


// ======================================================
// MILESTONES
// ======================================================

export const MILESTONE_DATES = [
  '2026-09-05',
  '2026-09-20',
  '2026-09-30',
  '2026-10-05',
  '2026-10-15',
];


// ======================================================
// TARGET PLAN
// ======================================================

const MAIN_BATCHES = [
  {
    start: COLLECTION_START_DATE,
    end: '2026-09-05',
    qty: 100,
  },
  {
    start: '2026-09-15',
    end: '2026-09-20',
    qty: 100,
  },
  {
    start: '2026-09-25',
    end: '2026-09-30',
    qty: 120,
  },
  {
    start: '2026-10-01',
    end: '2026-10-05',
    qty: 98,
  },
];

const BSOIL_BATCHES = [
  {
    start: '2026-10-11',
    end: '2026-10-15',
    qty: 30,
  },
];


// ======================================================
// ITEMS
// ======================================================

export const ITEMS = {
  stream: {
    key: 'stream',
    label: 'ตะกอนท้องน้ำ',
    total: 418,
    batches: MAIN_BATCHES,
  },

  weathered: {
    key: 'weathered',
    label: 'ชั้นดินผุพังอยู่กับที่',
    total: 418,
    batches: MAIN_BATCHES,
  },

  heavy_stream: {
    key: 'heavy_stream',
    label:
      'ตัวอย่างแร่หนักจากตะกอนท้องน้ำ',
    total: 418,
    batches: MAIN_BATCHES,
  },

  heavy_weathered: {
    key: 'heavy_weathered',
    label:
      'ตัวอย่างแร่หนักจากชั้นดินผุพัง',
    total: 418,
    batches: MAIN_BATCHES,
  },

  bsoil: {
    key: 'bsoil',
    label: 'ดินชั้น B',
    total: 30,
    batches: BSOIL_BATCHES,
  },
};


// ======================================================
// PROJECT TOTAL
// ======================================================

export const PROJECT_TOTAL =
  Object.values(ITEMS).reduce(
    (sum, item) =>
      sum + item.total,
    0
  );


// ======================================================
// DATE UTIL
// ======================================================

function toDayNumber(dateString) {
  const [year, month, day] =
    dateString
      .split('-')
      .map(Number);

  return Math.floor(
    Date.UTC(
      year,
      month - 1,
      day
    ) / 86400000
  );
}


// ======================================================
// PLAN DAY
// ======================================================

export const PLAN_TOTAL_DAYS =
  toDayNumber(PROGRESS_END_DATE) -
  toDayNumber(COLLECTION_START_DATE) +
  1;


export function planDayForDate(
  dateString
) {
  const currentDay =
    toDayNumber(dateString);

  const startDay =
    toDayNumber(
      COLLECTION_START_DATE
    );

  const endDay =
    toDayNumber(
      PROGRESS_END_DATE
    );

  if (currentDay < startDay) {
    return {
      day: 0,
      total: PLAN_TOTAL_DAYS,
      status: 'before',
      label: 'ยังไม่เริ่มแผน',
    };
  }

  if (currentDay > endDay) {
    return {
      day: PLAN_TOTAL_DAYS,
      total: PLAN_TOTAL_DAYS,
      status: 'completed',
      label:
        `Day ${PLAN_TOTAL_DAYS} / ${PLAN_TOTAL_DAYS} วัน`,
    };
  }

  const day =
    currentDay -
    startDay +
    1;

  return {
    day,
    total: PLAN_TOTAL_DAYS,
    status: 'active',
    label:
      `Day ${day} / ${PLAN_TOTAL_DAYS} วัน`,
  };
}


// ======================================================
// TARGET FOR DATE
// ======================================================

export function targetForDate(
  dateString,
  item
) {
  const currentDay =
    toDayNumber(dateString);

  let cumulative = 0;

  for (const batch of item.batches) {
    const startDay =
      toDayNumber(batch.start);

    const endDay =
      toDayNumber(batch.end);

    if (currentDay < startDay) {
      break;
    }

    if (currentDay > endDay) {
      cumulative += batch.qty;
      continue;
    }

    const totalDays =
      endDay - startDay + 1;

    const elapsedDays =
      currentDay - startDay + 1;

    const batchTarget =
      Math.ceil(
        (batch.qty *
          elapsedDays) /
          totalDays
      );

    cumulative +=
      batchTarget;

    break;
  }

  return Math.min(
    cumulative,
    item.total
  );
}


// ======================================================
// PROJECT SUMMARY
// ======================================================

export function projectSummary(
  dateString,
  actualValues = {}
) {
  let actualTotal = 0;
  let targetTotal = 0;

  const items = {};

  for (
    const [key, item]
    of Object.entries(ITEMS)
  ) {
    const actual =
      Math.max(
        0,
        Math.min(
          item.total,
          Number(
            actualValues[key] ?? 0
          )
        )
      );

    const target =
      targetForDate(
        dateString,
        item
      );

    const difference =
      actual - target;

    const progressPercent =
      item.total > 0
        ? (
            actual /
            item.total
          ) * 100
        : 0;

    const targetPercent =
      item.total > 0
        ? (
            target /
            item.total
          ) * 100
        : 0;

    const behind =
      target > 0 &&
      actual < target;

    const status =
      target === 0
        ? 'not_due'
        : behind
        ? 'behind'
        : 'on_track';

    items[key] = {
      key,
      label: item.label,
      total: item.total,
      actual,
      target,
      difference,
      progressPercent,
      targetPercent,
      behind,
      status,
    };

    actualTotal += actual;
    targetTotal += target;
  }

  const actualPercent =
    PROJECT_TOTAL > 0
      ? (
          actualTotal /
          PROJECT_TOTAL
        ) * 100
      : 0;

  const targetPercent =
    PROJECT_TOTAL > 0
      ? (
          targetTotal /
          PROJECT_TOTAL
        ) * 100
      : 0;

  const behind =
    Object.values(items).some(
      (item) => item.behind
    );

  return {
    date: dateString,

    projectTotal:
      PROJECT_TOTAL,

    actualTotal,

    targetTotal,

    actualPercent,

    targetPercent,

    difference:
      actualTotal -
      targetTotal,

    behind,

    items,
  };
}


// ======================================================
// DELIVERY PLAN
// ======================================================

export const DELIVERY_PLAN = [
  {
    key: 'batch1',
    label: 'รอบที่ 1',
    delivery:
      '1–5 ก.ย. 2569',
    cumulative: 400,
  },

  {
    key: 'batch2',
    label: 'รอบที่ 2',
    delivery:
      '15–20 ก.ย. 2569',
    cumulative: 800,
  },

  {
    key: 'batch3',
    label: 'รอบที่ 3',
    delivery:
      '25–30 ก.ย. 2569',
    cumulative: 1280,
  },

  {
    key: 'batch4',
    label: 'รอบที่ 4',
    delivery:
      '1–5 ต.ค. 2569',
    cumulative: 1672,
  },

  {
    key: 'bsoil',
    label: 'ดินชั้น B',
    delivery:
      '11–15 ต.ค. 2569',
    cumulative: 1702,
  },
];