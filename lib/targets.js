// lib/targets.js

// ======================================================
// PROJECT DATES
// ======================================================

// กรรมการอนุมัติแผน
export const PLAN_APPROVAL_DATE =
  '2026-08-17';

// เริ่มโครงการ / เริ่มเก็บตัวอย่าง
// Day 1
export const COLLECTION_START_DATE =
  '2026-08-18';

// Final Delivery
export const PROGRESS_END_DATE =
  '2026-10-03';


// ======================================================
// MILESTONE DATES
// ======================================================

export const MILESTONE_DATES = [
  '2026-08-24',
  '2026-09-08',
  '2026-09-18',
  '2026-09-23',
  '2026-10-03',
];


// ======================================================
// TARGET MILESTONES
//
// Target จะ Interpolate ต่อเนื่อง
// ระหว่าง Milestone
// ======================================================

// ------------------------------------------------------
// 4 MAIN ITEMS
//
// 24 ส.ค. = 100
// 8 ก.ย.  = 200
// 18 ก.ย. = 320
// 23 ก.ย. = 418
// ------------------------------------------------------

const MAIN_MILESTONES = [
  {
    date: PLAN_APPROVAL_DATE,
    target: 0,
  },

  {
    date: '2026-08-24',
    target: 100,
  },

  {
    date: '2026-09-08',
    target: 200,
  },

  {
    date: '2026-09-18',
    target: 320,
  },

  {
    date: '2026-09-23',
    target: 418,
  },
];


// ------------------------------------------------------
// B-HORIZON SOIL
//
// เริ่มทำในช่วงสุดท้าย
// 28 ก.ย. = 0
// 3 ต.ค. = 30
// ------------------------------------------------------

const BSOIL_MILESTONES = [
  {
    date: '2026-09-28',
    target: 0,
  },

  {
    date: '2026-10-03',
    target: 30,
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
    milestones:
      MAIN_MILESTONES,
  },

  weathered: {
    key: 'weathered',
    label: 'ชั้นดินผุพังอยู่กับที่',
    total: 418,
    milestones:
      MAIN_MILESTONES,
  },

  heavy_stream: {
    key: 'heavy_stream',
    label:
      'ตัวอย่างแร่หนักจากตะกอนท้องน้ำ',
    total: 418,
    milestones:
      MAIN_MILESTONES,
  },

  heavy_weathered: {
    key: 'heavy_weathered',
    label:
      'ตัวอย่างแร่หนักจากชั้นดินผุพัง',
    total: 418,
    milestones:
      MAIN_MILESTONES,
  },

  bsoil: {
    key: 'bsoil',
    label: 'ดินชั้น B',
    total: 30,
    milestones:
      BSOIL_MILESTONES,
  },
};


// ======================================================
// MAIN ITEM KEYS
// ใช้คำนวณ QA/QC Duplicate
// ======================================================

export const MAIN_ITEM_KEYS = [
  'stream',
  'weathered',
  'heavy_stream',
  'heavy_weathered',
];


// ======================================================
// PROJECT TOTAL
// ======================================================

export const PROJECT_TOTAL =
  Object.values(
    ITEMS
  ).reduce(
    (sum, item) =>
      sum + item.total,
    0
  );


// ======================================================
// ADDITIONAL WORK
// ไม่รวมใน PROJECT TOTAL 1,702
// ======================================================

export const SG_TOTAL = 142;

export const HEAVY_COUNT_TOTAL =
  836;


// ======================================================
// SG TARGET
//
// ต่อเนื่องทั้งโครงการ
//
// 17 ส.ค. = 0
// 3 ต.ค. = 142
// ======================================================

const SG_MILESTONES = [
  {
    date: PLAN_APPROVAL_DATE,
    target: 0,
  },

  {
    date: PROGRESS_END_DATE,
    target: SG_TOTAL,
  },
];


// ======================================================
// HEAVY MINERAL COUNT TARGET
//
// 24 ส.ค. = 200
// 8 ก.ย.  = 400
// 18 ก.ย. = 640
// 23 ก.ย. = 836
//
// Continuous Target เหมือน Main Sample
// ======================================================

const HEAVY_COUNT_MILESTONES = [
  {
    date: PLAN_APPROVAL_DATE,
    target: 0,
  },

  {
    date: '2026-08-24',
    target: 200,
  },

  {
    date: '2026-09-08',
    target: 400,
  },

  {
    date: '2026-09-18',
    target: 640,
  },

  {
    date: '2026-09-23',
    target: 836,
  },
];


// ======================================================
// DATE UTIL
// ======================================================

function toDayNumber(
  dateString
) {
  const [
    year,
    month,
    day,
  ] =
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
  toDayNumber(
    PROGRESS_END_DATE
  ) -
  toDayNumber(
    COLLECTION_START_DATE
  ) +
  1;


// 18 ส.ค. – 3 ต.ค.
// = 47 วัน

export function planDayForDate(
  dateString
) {
  const current =
    toDayNumber(
      dateString
    );

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

      total:
        PLAN_TOTAL_DAYS,

      status:
        'before',

      label:
        'ยังไม่เริ่มแผน',
    };
  }


  if (current > end) {
    return {
      day:
        PLAN_TOTAL_DAYS,

      total:
        PLAN_TOTAL_DAYS,

      status:
        'completed',

      label:
        `Day ${PLAN_TOTAL_DAYS} / ${PLAN_TOTAL_DAYS} วัน`,
    };
  }


  const day =
    current -
    start +
    1;


  return {
    day,

    total:
      PLAN_TOTAL_DAYS,

    status:
      'active',

    label:
      `Day ${day} / ${PLAN_TOTAL_DAYS} วัน`,
  };
}


// ======================================================
// CONTINUOUS MILESTONE TARGET
//
// Linear Interpolation ระหว่าง Milestone
//
// ตัวอย่าง:
// 24 ส.ค. = 100
// 8 ก.ย.  = 200
//
// วันที่ระหว่างนั้น Target จะเดินต่อเนื่อง
// 100 → 200
// ไม่มีช่วง Target ค้าง
// ======================================================

function targetFromMilestones(
  dateString,
  milestones,
  total
) {
  const currentDay =
    toDayNumber(
      dateString
    );


  if (
    !milestones ||
    milestones.length === 0
  ) {
    return 0;
  }


  const first =
    milestones[0];

  const last =
    milestones[
      milestones.length - 1
    ];


  const firstDay =
    toDayNumber(
      first.date
    );

  const lastDay =
    toDayNumber(
      last.date
    );


  // ก่อนเริ่ม Target
  if (
    currentDay <=
    firstDay
  ) {
    return Math.min(
      first.target,
      total
    );
  }


  // หลัง Milestone สุดท้าย
  if (
    currentDay >=
    lastDay
  ) {
    return Math.min(
      last.target,
      total
    );
  }


  // หา Segment ที่วันที่ปัจจุบันอยู่ระหว่าง
  for (
    let i = 0;
    i <
    milestones.length - 1;
    i++
  ) {
    const previous =
      milestones[i];

    const next =
      milestones[i + 1];


    const previousDay =
      toDayNumber(
        previous.date
      );

    const nextDay =
      toDayNumber(
        next.date
      );


    if (
      currentDay <
      previousDay ||
      currentDay >
      nextDay
    ) {
      continue;
    }


    const totalDays =
      nextDay -
      previousDay;


    const elapsedDays =
      currentDay -
      previousDay;


    const targetIncrease =
      next.target -
      previous.target;


    // Linear interpolation
    const interpolated =
      previous.target +
      Math.ceil(
        (
          targetIncrease *
          elapsedDays
        ) /
        totalDays
      );


    return Math.min(
      interpolated,
      total
    );
  }


  return Math.min(
    last.target,
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
  return targetFromMilestones(
    dateString,
    item.milestones,
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
    const [
      key,
      item,
    ]
    of Object.entries(
      ITEMS
    )
  ) {
    const actual =
      Math.max(
        0,
        Math.min(
          item.total,
          Number(
            actualValues[
              key
            ] ?? 0
          )
        )
      );


    const target =
      targetForDate(
        dateString,
        item
      );


    const difference =
      actual -
      target;


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

      label:
        item.label,

      total:
        item.total,

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


    actualTotal +=
      actual;

    targetTotal +=
      target;
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
    Object.values(
      items
    ).some(
      (item) =>
        item.behind
    );


  return {
    date:
      dateString,

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
// DUPLICATE
//
// ทุก 25 ตัวอย่าง
// ตัวที่ 25 / 26 เป็นคู่ Duplicate
//
// ครบ 26 = Required 1
// ครบ 52 = Required 2
//
// คำนวณแยก 4 Items หลักแล้วรวม
// ======================================================

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
          actualValues[
            key
          ] ?? 0
        )
      );


    const required =
      Math.floor(
        actual / 26
      );


    byItem[key] =
      required;


    totalRequired +=
      required;
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

  // ----------------------------------------------------
  // SG
  // ----------------------------------------------------

  const sgActual =
    Math.max(
      0,
      Math.min(
        SG_TOTAL,
        Number(
          actualValues
            .sg_measured ??
          0
        )
      )
    );


  const sgTarget =
    targetFromMilestones(
      dateString,
      SG_MILESTONES,
      SG_TOTAL
    );


  // ----------------------------------------------------
  // HEAVY MINERAL COUNT
  // ----------------------------------------------------

  const heavyActual =
    Math.max(
      0,
      Math.min(
        HEAVY_COUNT_TOTAL,
        Number(
          actualValues
            .heavy_counted ??
          0
        )
      )
    );


  const heavyTarget =
    targetFromMilestones(
      dateString,
      HEAVY_COUNT_MILESTONES,
      HEAVY_COUNT_TOTAL
    );


  // ----------------------------------------------------
  // DUPLICATE
  // ----------------------------------------------------

  const duplicateActual =
    Math.max(
      0,
      Number(
        actualValues
          .duplicate_collected ??
        0
      )
    );


  const duplicate =
    requiredDuplicates(
      actualValues
    );


  // ----------------------------------------------------
  // SG RESULT
  // ----------------------------------------------------

  const sg = {
    label:
      'ตรวจวัดค่า ถ.พ.',

    actual:
      sgActual,

    target:
      sgTarget,

    total:
      SG_TOTAL,

    difference:
      sgActual -
      sgTarget,

    behind:
      sgTarget > 0 &&
      sgActual <
      sgTarget,
  };


  // ----------------------------------------------------
  // DUPLICATE RESULT
  // ----------------------------------------------------

  const duplicateItem = {
    label:
      'QA/QC Duplicate',

    actual:
      duplicateActual,

    target:
      duplicate
        .totalRequired,

    total:
      duplicate
        .totalRequired,

    difference:
      duplicateActual -
      duplicate
        .totalRequired,

    behind:
      duplicateActual <
      duplicate
        .totalRequired,

    byItem:
      duplicate
        .byItem,
  };


  // ----------------------------------------------------
  // HEAVY COUNT RESULT
  // ----------------------------------------------------

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


  // ----------------------------------------------------
  // OVERALL ADDITIONAL STATUS
  // ----------------------------------------------------

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
//
// Delivery Window ยังคงเป็นช่วงส่งงาน
// แต่ Daily Target ไม่ได้หยุดตาม Window
// ======================================================

export const DELIVERY_PLAN = [
  {
    key:
      'batch1',

    label:
      'รอบที่ 1',

    delivery:
      '20–24 ส.ค. 2569',

    cumulative:
      400,
  },

  {
    key:
      'batch2',

    label:
      'รอบที่ 2',

    delivery:
      '3–8 ก.ย. 2569',

    cumulative:
      800,
  },

  {
    key:
      'batch3',

    label:
      'รอบที่ 3',

    delivery:
      '13–18 ก.ย. 2569',

    cumulative:
      1280,
  },

  {
    key:
      'batch4',

    label:
      'รอบที่ 4',

    delivery:
      '19–23 ก.ย. 2569',

    cumulative:
      1672,
  },

  {
    key:
      'bsoil',

    label:
      'ดินชั้น B',

    delivery:
      '29 ก.ย.–3 ต.ค. 2569',

    cumulative:
      1702,
  },
];