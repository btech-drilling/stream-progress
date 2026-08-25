// lib/targets.js

// ======================================================
// PROJECT DATES
// ======================================================

export const PLAN_APPROVAL_DATE =
  '2026-08-17';

export const COLLECTION_START_DATE =
  '2026-08-18';

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
// MAIN SAMPLE TARGET PLAN
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
// SAMPLE ITEMS
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


export const MAIN_ITEM_KEYS = [
  'stream',
  'weathered',
  'heavy_stream',
  'heavy_weathered',
];


export const PROJECT_TOTAL =
  Object.values(ITEMS).reduce(
    (sum, item) =>
      sum + item.total,
    0
  );


// ======================================================
// ADDITIONAL WORK
// ไม่รวมใน PROJECT_TOTAL 1,702
// ======================================================

export const SG_TOTAL = 142;

export const HEAVY_COUNT_TOTAL = 836;


// ถ.พ. ต้องครบ 142 ภายใน 15 ต.ค.
// กระจาย Daily Target ตั้งแต่ Day 1 ถึง Day 59
const SG_BATCHES = [
  {
    start: COLLECTION_START_DATE,
    end: PROGRESS_END_DATE,
    qty: SG_TOTAL,
  },
];


// Heavy Mineral Count
// ผูกกับคิวส่งงานเดิม
const HEAVY_COUNT_BATCHES = [
  {
    start: COLLECTION_START_DATE,
    end: '2026-09-05',
    qty: 200,
  },
  {
    start: '2026-09-15',
    end: '2026-09-20',
    qty: 200,
  },
  {
    start: '2026-09-25',
    end: '2026-09-30',
    qty: 240,
  },
  {
    start: '2026-10-01',
    end: '2026-10-05',
    qty: 196,
  },
];


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
  const current =
    toDayNumber(dateString);

  const start =
    toDayNumber(
      COLLECTION_START_DATE
    );

  const end =
    toDayNumber(
      PROGRESS_END_DATE
    );

  if (current < start) {
    return {
      day: 0,
      total: PLAN_TOTAL_DAYS,
      status: 'before',
      label: 'ยังไม่เริ่มแผน',
    };
  }

  if (current > end) {
    return {
      day: PLAN_TOTAL_DAYS,
      total: PLAN_TOTAL_DAYS,
      status: 'completed',
      label:
        `Day ${PLAN_TOTAL_DAYS} / ${PLAN_TOTAL_DAYS} วัน`,
    };
  }

  const day =
    current - start + 1;

  return {
    day,
    total: PLAN_TOTAL_DAYS,
    status: 'active',
    label:
      `Day ${day} / ${PLAN_TOTAL_DAYS} วัน`,
  };
}


// ======================================================
// GENERIC TARGET CALCULATOR
// ======================================================

function targetFromBatches(
  dateString,
  batches,
  total
) {
  const currentDay =
    toDayNumber(dateString);

  let cumulative = 0;

  for (const batch of batches) {
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

    cumulative +=
      Math.ceil(
        (
          batch.qty *
          elapsedDays
        ) / totalDays
      );

    break;
  }

  return Math.min(
    cumulative,
    total
  );
}


// ======================================================
// SAMPLE TARGET
// ======================================================

export function targetForDate(
  dateString,
  item
) {
  return targetFromBatches(
    dateString,
    item.batches,
    item.total
  );
}


// ======================================================
// SAMPLE PROJECT SUMMARY
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
      status:
        target === 0
          ? 'not_due'
          : behind
          ? 'behind'
          : 'on_track',
    };

    actualTotal += actual;
    targetTotal += target;
  }

  const actualPercent =
    (
      actualTotal /
      PROJECT_TOTAL
    ) * 100;

  const targetPercent =
    (
      targetTotal /
      PROJECT_TOTAL
    ) * 100;

  const behind =
    Object.values(items).some(
      (item) => item.behind
    );

  return {
    date: dateString,
    projectTotal: PROJECT_TOTAL,
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
// DUPLICATE
// ======================================================

// ตัวที่ 25 และ 26 เป็นคู่ Duplicate
// ดังนั้นเมื่อครบ 26 ตัว = Required Duplicate 1
// ครบ 52 ตัว = Required Duplicate 2
// คำนวณแยก 4 Items หลักแล้วรวมกัน

export function requiredDuplicates(
  actualValues = {}
) {
  let totalRequired = 0;

  const byItem = {};

  for (
    const key
    of MAIN_ITEM_KEYS
  ) {
    const actual =
      Math.max(
        0,
        Number(
          actualValues[key] ?? 0
        )
      );

    const required =
      Math.floor(
        actual / 26
      );

    byItem[key] = required;

    totalRequired += required;
  }

  return {
    totalRequired,
    byItem,
  };
}


// ======================================================
// ADDITIONAL WORK SUMMARY
// ======================================================

export function additionalWorkSummary(
  dateString,
  actualValues = {}
) {
  const sgActual =
    Math.max(
      0,
      Math.min(
        SG_TOTAL,
        Number(
          actualValues
            .sg_measured ?? 0
        )
      )
    );

  const sgTarget =
    targetFromBatches(
      dateString,
      SG_BATCHES,
      SG_TOTAL
    );


  const heavyActual =
    Math.max(
      0,
      Math.min(
        HEAVY_COUNT_TOTAL,
        Number(
          actualValues
            .heavy_counted ?? 0
        )
      )
    );

  const heavyTarget =
    targetFromBatches(
      dateString,
      HEAVY_COUNT_BATCHES,
      HEAVY_COUNT_TOTAL
    );


  const duplicateActual =
    Math.max(
      0,
      Number(
        actualValues
          .duplicate_collected ?? 0
      )
    );

  const duplicate =
    requiredDuplicates(
      actualValues
    );


  const sg = {
    label: 'ตรวจวัดค่า ถ.พ.',
    actual: sgActual,
    target: sgTarget,
    total: SG_TOTAL,
    difference:
      sgActual - sgTarget,
    behind:
      sgTarget > 0 &&
      sgActual < sgTarget,
  };


  const duplicateItem = {
    label: 'QA/QC Duplicate',
    actual:
      duplicateActual,
    target:
      duplicate.totalRequired,
    total:
      duplicate.totalRequired,
    difference:
      duplicateActual -
      duplicate.totalRequired,
    behind:
      duplicateActual <
      duplicate.totalRequired,
    byItem:
      duplicate.byItem,
  };


  const heavyCount = {
    label:
      'Heavy Mineral Count',
    actual:
      heavyActual,
    target:
      heavyTarget,
    total:
      HEAVY_COUNT_TOTAL,
    difference:
      heavyActual -
      heavyTarget,
    behind:
      heavyTarget > 0 &&
      heavyActual <
        heavyTarget,
  };


  const behind =
    sg.behind ||
    duplicateItem.behind ||
    heavyCount.behind;


  return {
    sg,
    duplicate:
      duplicateItem,
    heavyCount,
    behind,
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