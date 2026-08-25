'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ITEMS,
  DELIVERY_PLAN,
  PROJECT_TOTAL,
  COLLECTION_START_DATE,
  PROGRESS_END_DATE,
  PLAN_TOTAL_DAYS,
  SG_TOTAL,
  HEAVY_COUNT_TOTAL,
  planDayForDate,
  projectSummary,
  additionalWorkSummary,
} from '../lib/targets.js';


const ITEM_KEYS =
  Object.keys(ITEMS);


const INITIAL_VALUES = {
  ...Object.fromEntries(
    ITEM_KEYS.map(
      (key) => [key, 0]
    )
  ),

  sg_measured: 0,
  duplicate_collected: 0,
  heavy_counted: 0,
};


function todayBangkok() {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (p) => p.type === 'year'
    )?.value;

  const month =
    parts.find(
      (p) => p.type === 'month'
    )?.value;

  const day =
    parts.find(
      (p) => p.type === 'day'
    )?.value;

  return `${year}-${month}-${day}`;
}


function thaiDate(
  dateString
) {
  if (!dateString) return '-';

  const [
    year,
    month,
    day,
  ] =
    dateString
      .split('-')
      .map(Number);

  const months = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];

  return (
    `${day} ` +
    `${months[month - 1]} ` +
    `${year + 543}`
  );
}


function thaiDateTime(
  timestamp
) {
  if (!timestamp) return '-';

  return new Intl.DateTimeFormat(
    'th-TH-u-ca-buddhist',
    {
      timeZone:
        'Asia/Bangkok',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }
  ).format(
    new Date(timestamp)
  );
}


function fmt(value) {
  return new Intl.NumberFormat(
    'th-TH'
  ).format(
    Number(value || 0)
  );
}


function pct(value) {
  return Number(
    value || 0
  ).toFixed(2);
}


function getStatus(
  actual,
  target
) {
  if (target === 0) {
    return {
      label: 'Not Due',
      tone: 'neutral',
      detail:
        'ยังไม่ถึงช่วง Target',
    };
  }

  if (actual < target) {
    return {
      label: 'Behind',
      tone: 'bad',
      detail:
        `ขาด ${fmt(
          target - actual
        )}`,
    };
  }

  if (actual > target) {
    return {
      label: 'On Track',
      tone: 'good',
      detail:
        `เกิน Target ${fmt(
          actual - target
        )}`,
    };
  }

  return {
    label: 'On Track',
    tone: 'good',
    detail: 'ถึง Target',
  };
}


function nextMilestone(
  dateString
) {
  const milestones = [
    [
      '2026-09-05',
      'รอบที่ 1',
      '5 ก.ย. 2569',
    ],
    [
      '2026-09-20',
      'รอบที่ 2',
      '20 ก.ย. 2569',
    ],
    [
      '2026-09-30',
      'รอบที่ 3',
      '30 ก.ย. 2569',
    ],
    [
      '2026-10-05',
      'รอบที่ 4',
      '5 ต.ค. 2569',
    ],
    [
      '2026-10-15',
      'ดินชั้น B',
      '15 ต.ค. 2569',
    ],
  ];

  return (
    milestones.find(
      ([d]) =>
        dateString <= d
    ) || [
      '-',
      'ครบทุกชุด',
      '-',
    ]
  );
}


export default function Page() {
  const [date, setDate] =
    useState(
      todayBangkok()
    );

  const [values, setValues] =
    useState(
      INITIAL_VALUES
    );

  const [message, setMessage] =
    useState(
      'กำลังโหลดข้อมูลล่าสุด...'
    );

  const [saving, setSaving] =
    useState(false);

  const [
    lastSavedAt,
    setLastSavedAt,
  ] = useState(null);


  const summary =
    useMemo(
      () =>
        projectSummary(
          date,
          values
        ),
      [date, values]
    );


  const additional =
    useMemo(
      () =>
        additionalWorkSummary(
          date,
          values
        ),
      [date, values]
    );


  const planDay =
    useMemo(
      () =>
        planDayForDate(date),
      [date]
    );


  const milestone =
    useMemo(
      () =>
        nextMilestone(date),
      [date]
    );


  useEffect(() => {
    fetch('/api/progress')
      .then(
        (response) =>
          response.json()
      )
      .then((data) => {
        if (!data.snapshot) {
          setMessage(
            'ยังไม่มีข้อมูลที่บันทึก'
          );

          return;
        }

        const nextValues = {
          ...INITIAL_VALUES,
        };


        for (
          const key
          of ITEM_KEYS
        ) {
          nextValues[key] =
            Number(
              data.snapshot[key] ??
              0
            );
        }


        nextValues.sg_measured =
          Number(
            data.snapshot
              .sg_measured ?? 0
          );

        nextValues.duplicate_collected =
          Number(
            data.snapshot
              .duplicate_collected ??
              0
          );

        nextValues.heavy_counted =
          Number(
            data.snapshot
              .heavy_counted ?? 0
          );


        setValues(
          nextValues
        );


        setLastSavedAt(
          data.snapshot
            .created_at ?? null
        );


        setMessage(
          data.snapshot
            .progress_date
            ? `โหลดข้อมูลล่าสุด: ${thaiDate(
                data.snapshot
                  .progress_date
              )}`
            : 'โหลดข้อมูลล่าสุดแล้ว'
        );
      })
      .catch(() => {
        setMessage(
          'โหลดข้อมูลไม่สำเร็จ'
        );
      });
  }, []);


  async function save() {
    setSaving(true);

    setMessage(
      'กำลังบันทึก...'
    );

    try {
      const response =
        await fetch(
          '/api/progress',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                progress_date:
                  date,
                ...values,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {
        setMessage(
          `บันทึกไม่สำเร็จ: ${
            data.error ||
            'unknown error'
          }`
        );

        return;
      }


      setLastSavedAt(
        data.snapshot
          ?.created_at ??
          new Date().toISOString()
      );


      setMessage(
        `บันทึก Progress วันที่ ${thaiDate(
          date
        )} เรียบร้อย`
      );
    }

    catch {
      setMessage(
        'บันทึกไม่สำเร็จ: เชื่อมต่อระบบไม่ได้'
      );
    }

    finally {
      setSaving(false);
    }
  }


  function updateValue(
    key,
    value,
    max
  ) {
    setValues(
      (current) => ({
        ...current,

        [key]:
          Math.max(
            0,
            Math.min(
              max,
              Number(value || 0)
            )
          ),
      })
    );
  }


  const overallGap =
    summary.actualPercent -
    summary.targetPercent;


  const overallBehind =
    summary.behind ||
    additional.behind;


  return (
    <main className="pageShell">

      <header className="appHeader">

        <div className="brandBlock">

          <div className="brandMark">
            B
          </div>

          <div>

            <div className="brandTitle">
              BTECH
            </div>

            <div className="brandSub">
              Sample Progress Control
            </div>

          </div>

        </div>


        <div className="headerMeta">
          <span className="liveDot" />
          Online dashboard
        </div>

      </header>


      <section className="heroCard">

        <div className="heroMain">

          <div className="heroEyebrow">
            OVERALL SAMPLE PROGRESS
          </div>


          <div className="heroHeadline">

            <span className="heroPercent">
              {pct(
                summary.actualPercent
              )}%
            </span>

            <span className="heroStatusText">
              {
                overallBehind
                  ? 'มีงานต่ำกว่าแผน'
                  : 'ตามแผน'
              }
            </span>

          </div>


          <div className="heroCount">

            <strong>
              {fmt(
                summary.actualTotal
              )}
            </strong>

            {' / '}

            {fmt(
              summary.projectTotal
            )}

            {' ตัวอย่างสะสม'}

          </div>


          <div className="heroProgress">

            <span
              style={{
                width:
                  `${Math.min(
                    100,
                    summary.actualPercent
                  )}%`,
              }}
            />

          </div>


          <div className="heroFoot">
            Overall Sample Total =
            {' '}
            {fmt(PROJECT_TOTAL)}
            {' '}
            ตัวอย่าง
            · Additional Work
            ไม่รวมในยอดนี้
          </div>

        </div>


        <div className="controlPanel">

          <label htmlFor="progress-date">
            Progress ณ วันที่
          </label>

          <input
            id="progress-date"
            type="date"
            value={date}
            max={todayBangkok()}
            onChange={
              (event) =>
                setDate(
                  event.target.value
                )
            }
          />


          <button
            className="primaryButton"
            onClick={save}
            disabled={saving}
          >
            {
              saving
                ? 'กำลังบันทึก...'
                : 'บันทึก Progress'
            }
          </button>


          <div className="saveMessage">

            <div>
              {message}
            </div>

            {lastSavedAt && (
              <div>
                บันทึกล่าสุด:{' '}
                {thaiDateTime(
                  lastSavedAt
                )} น.
              </div>
            )}

          </div>

        </div>

      </section>


      <section className="metricGrid">

        <Metric
          title="Project Start"
          value={
            thaiDate(
              COLLECTION_START_DATE
            )
          }
          sub="Day 1"
        />


        <Metric
          title="วันที่ตามแผน"
          value={
            planDay.label
          }
          sub={
            `แผนทั้งหมด ${PLAN_TOTAL_DAYS} วัน`
          }
          tone="good"
        />


        <Metric
          title="Final Delivery"
          value={
            thaiDate(
              PROGRESS_END_DATE
            )
          }
          sub={
            `Day ${PLAN_TOTAL_DAYS} / ${PLAN_TOTAL_DAYS} วัน`
          }
        />


        <Metric
          title="กำหนดถัดไป"
          value={
            milestone[1]
          }
          sub={
            milestone[2]
          }
        />

      </section>


      <section className="metricGrid">

        <Metric
          title="Target Sample"
          value={
            `${pct(
              summary.targetPercent
            )}%`
          }
          sub={
            `${fmt(
              summary.targetTotal
            )} / ${fmt(
              PROJECT_TOTAL
            )}`
          }
        />


        <Metric
          title="Actual Sample"
          value={
            `${pct(
              summary.actualPercent
            )}%`
          }
          sub={
            `${fmt(
              summary.actualTotal
            )} / ${fmt(
              PROJECT_TOTAL
            )}`
          }
        />


        <Metric
          title="Gap จากแผน"
          value={
            `${
              overallGap > 0
                ? '+'
                : ''
            }${pct(
              overallGap
            )}%`
          }
          sub={
            summary.difference < 0
              ? `ขาด ${fmt(
                  Math.abs(
                    summary.difference
                  )
                )} ตัวอย่าง`
              : `ถึง/เกิน ${fmt(
                  Math.max(
                    0,
                    summary.difference
                  )
                )} ตัวอย่าง`
          }
          tone={
            summary.behind
              ? 'bad'
              : 'good'
          }
        />


        <Metric
          title="สถานะรวม"
          value={
            overallBehind
              ? 'Behind'
              : 'On Track'
          }
          sub={
            overallBehind
              ? 'มีงานที่ต้องเร่ง'
              : 'งานทั้งหมดตามแผน'
          }
          tone={
            overallBehind
              ? 'bad'
              : 'good'
          }
        />

      </section>


      <section className="panel">

        <div className="panelHeading">

          <div>

            <div className="sectionEyebrow">
              SAMPLE PROGRESS
            </div>

            <h2>
              ตัวอย่างหลัก
            </h2>

          </div>


          <div className="panelNote">
            รวม {fmt(PROJECT_TOTAL)}
            {' '}ตัวอย่าง
          </div>

        </div>


        <div className="itemGrid">

          {ITEM_KEYS.map(
            (key, index) => {

              const item =
                summary.items[key];

              const status =
                getStatus(
                  item.actual,
                  item.target
                );


              return (
                <article
                  className="itemCard"
                  key={key}
                >

                  <div className="itemTop">

                    <div className="itemNumber">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </div>


                    <span
                      className={
                        `statusBadge ${status.tone}`
                      }
                    >
                      {status.label}
                    </span>

                  </div>


                  <h3>
                    {item.label}
                  </h3>


                  <div className="itemTotal">
                    Total{' '}
                    {fmt(
                      item.total
                    )}
                  </div>


                  <div className="inputRow">

                    <label>
                      Actual สะสม
                    </label>


                    <div className="numberInputWrap">

                      <input
                        type="number"
                        min="0"
                        max={
                          item.total
                        }
                        value={
                          values[key]
                        }
                        onChange={
                          (event) =>
                            updateValue(
                              key,
                              event
                                .target
                                .value,
                              item.total
                            )
                        }
                      />

                      <span>
                        / {fmt(
                          item.total
                        )}
                      </span>

                    </div>

                  </div>


                  <div className="itemProgressLine">

                    <strong>
                      {pct(
                        item.progressPercent
                      )}%
                    </strong>

                    <span>
                      Target{' '}
                      {fmt(
                        item.target
                      )}
                    </span>

                  </div>


                  <div className="itemBar">

                    <span
                      style={{
                        width:
                          `${Math.min(
                            100,
                            item.progressPercent
                          )}%`,
                      }}
                    />

                  </div>


                  <div
                    className={
                      `gapText ${status.tone}`
                    }
                  >
                    {status.detail}
                  </div>

                </article>
              );
            }
          )}

        </div>

      </section>


      <section className="panel">

        <div className="panelHeading">

          <div>

            <div className="sectionEyebrow">
              ADDITIONAL WORK / QA-QC
            </div>

            <h2>
              งานติดตามเพิ่มเติม
            </h2>

          </div>


          <div className="panelNote">
            ไม่รวมในยอด Sample
            1,702 ตัวอย่าง
          </div>

        </div>


        <div className="itemGrid">

          <AdditionalCard
            number="A1"
            title="ตรวจวัดค่า ถ.พ."
            actual={
              values.sg_measured
            }
            max={SG_TOTAL}
            target={
              additional.sg.target
            }
            onChange={
              (value) =>
                updateValue(
                  'sg_measured',
                  value,
                  SG_TOTAL
                )
            }
          />


          <DuplicateCard
            actual={
              values
                .duplicate_collected
            }
            required={
              additional
                .duplicate
                .target
            }
            onChange={
              (value) =>
                updateValue(
                  'duplicate_collected',
                  value,
                  100
                )
            }
          />


          <AdditionalCard
            number="A3"
            title="Heavy Mineral Count"
            actual={
              values.heavy_counted
            }
            max={
              HEAVY_COUNT_TOTAL
            }
            target={
              additional
                .heavyCount
                .target
            }
            onChange={
              (value) =>
                updateValue(
                  'heavy_counted',
                  value,
                  HEAVY_COUNT_TOTAL
                )
            }
          />

        </div>

      </section>


      <section className="panel schedulePanel">

        <div className="panelHeading">

          <div>

            <div className="sectionEyebrow">
              DELIVERY PLAN
            </div>

            <h2>
              แผนส่งตัวอย่าง
            </h2>

          </div>


          <div className="panelNote">
            Final Delivery{' '}
            {thaiDate(
              PROGRESS_END_DATE
            )}
          </div>

        </div>


        <div className="tableWrap">

          <table className="deliveryTable">

            <thead>

              <tr>
                <th>รอบส่ง</th>
                <th>กำหนดส่ง</th>
                <th>ยอดสะสมรวม</th>
                <th>Progress</th>
              </tr>

            </thead>


            <tbody>

              {DELIVERY_PLAN.map(
                (row) => {

                  const progress =
                    (
                      row.cumulative /
                      PROJECT_TOTAL
                    ) * 100;

                  return (
                    <tr key={row.key}>

                      <td>
                        <strong>
                          {row.label}
                        </strong>
                      </td>

                      <td>
                        {row.delivery}
                      </td>

                      <td>
                        {fmt(
                          row.cumulative
                        )}
                        {' / '}
                        {fmt(
                          PROJECT_TOTAL
                        )}
                      </td>

                      <td>
                        <span className="progressBadge">
                          {pct(
                            progress
                          )}%
                        </span>
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </section>


      <footer className="footerNote">
        Stream Progress ·
        BTECH Sample Delivery Control ·
        Supabase
      </footer>

    </main>
  );
}


function AdditionalCard({
  number,
  title,
  actual,
  max,
  target,
  onChange,
}) {
  const status =
    getStatus(
      actual,
      target
    );

  const progress =
    max > 0
      ? (
          actual /
          max
        ) * 100
      : 0;

  return (
    <article className="itemCard">

      <div className="itemTop">

        <div className="itemNumber">
          {number}
        </div>

        <span
          className={
            `statusBadge ${status.tone}`
          }
        >
          {status.label}
        </span>

      </div>


      <h3>{title}</h3>


      <div className="itemTotal">
        Total {fmt(max)}
      </div>


      <div className="inputRow">

        <label>
          Actual สะสม
        </label>

        <div className="numberInputWrap">

          <input
            type="number"
            min="0"
            max={max}
            value={actual}
            onChange={
              (event) =>
                onChange(
                  event.target.value
                )
            }
          />

          <span>
            / {fmt(max)}
          </span>

        </div>

      </div>


      <div className="itemProgressLine">

        <strong>
          {pct(progress)}%
        </strong>

        <span>
          Target {fmt(target)}
        </span>

      </div>


      <div className="itemBar">

        <span
          style={{
            width:
              `${Math.min(
                100,
                progress
              )}%`,
          }}
        />

      </div>


      <div
        className={
          `gapText ${status.tone}`
        }
      >
        {status.detail}
      </div>

    </article>
  );
}


function DuplicateCard({
  actual,
  required,
  onChange,
}) {
  const status =
    getStatus(
      actual,
      required
    );

  return (
    <article className="itemCard">

      <div className="itemTop">

        <div className="itemNumber">
          A2
        </div>

        <span
          className={
            `statusBadge ${status.tone}`
          }
        >
          {status.label}
        </span>

      </div>


      <h3>
        QA/QC Duplicate
      </h3>


      <div className="itemTotal">
        ระบบคำนวณ Required
        จาก 4 Items หลัก
      </div>


      <div className="inputRow">

        <label>
          Duplicate Collected
        </label>

        <div className="numberInputWrap">

          <input
            type="number"
            min="0"
            max="100"
            value={actual}
            onChange={
              (event) =>
                onChange(
                  event.target.value
                )
            }
          />

          <span>
            Required {fmt(
              required
            )}
          </span>

        </div>

      </div>


      <div className="itemProgressLine">

        <strong>
          {fmt(actual)}
        </strong>

        <span>
          Required{' '}
          {fmt(required)}
        </span>

      </div>


      <div
        className={
          `gapText ${status.tone}`
        }
      >
        {status.detail}
      </div>

    </article>
  );
}


function Metric({
  title,
  value,
  sub,
  tone = 'neutral',
}) {
  return (
    <div
      className={
        `metricCard ${tone}`
      }
    >

      <div className="metricLabel">
        {title}
      </div>

      <div className="metricValue">
        {value}
      </div>

      <div className="metricSub">
        {sub}
      </div>

    </div>
  );
}