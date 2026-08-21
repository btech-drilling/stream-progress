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
  projectSummary,
} from '../lib/targets.js';


const ITEM_KEYS =
  Object.keys(ITEMS);


const INITIAL_VALUES =
  Object.fromEntries(
    ITEM_KEYS.map(
      (key) => [key, 0]
    )
  );


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


function getStatus(item) {
  if (item.target === 0) {
    return {
      label: 'Not Due',
      tone: 'neutral',
      detail:
        'ยังไม่ถึงช่วง Target',
    };
  }

  if (item.behind) {
    return {
      label: 'Behind',
      tone: 'bad',
      detail:
        `ขาด ${fmt(
          Math.abs(
            item.difference
          )
        )} ตัวอย่าง`,
    };
  }

  if (item.difference > 0) {
    return {
      label: 'On Track',
      tone: 'good',
      detail:
        `เกิน Target ${fmt(
          item.difference
        )} ตัวอย่าง`,
    };
  }

  return {
    label: 'On Track',
    tone: 'good',
    detail:
      'ถึง Target',
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
      ([date]) =>
        dateString <= date
    ) || [
      '-',
      'ครบทุกชุด',
      '-',
    ]
  );
}


export default function Page() {
  const [date, setDate] =
    useState(todayBangkok());

  const [values, setValues] =
    useState(INITIAL_VALUES);

  const [message, setMessage] =
    useState(
      'กำลังโหลดข้อมูลล่าสุด...'
    );

  const [saving, setSaving] =
    useState(false);


  const summary =
    useMemo(
      () =>
        projectSummary(
          date,
          values
        ),
      [date, values]
    );


  const milestone =
    useMemo(
      () =>
        nextMilestone(date),
      [date]
    );


  // ====================================================
  // LOAD LATEST PROGRESS
  // ====================================================

  useEffect(() => {
    fetch('/api/progress')
      .then((response) =>
        response.json()
      )
      .then((data) => {
        if (!data.snapshot) {
          setMessage(
            'ยังไม่มีข้อมูลที่บันทึก'
          );

          return;
        }

        const nextValues = {};

        for (
          const key
          of ITEM_KEYS
        ) {
          nextValues[key] =
            Number(
              data.snapshot[
                key
              ] ?? 0
            );
        }

        setValues(
          nextValues
        );

        setMessage(
          data.snapshot
            .progress_date
            ? `โหลดข้อมูลล่าสุด ณ ${data.snapshot.progress_date}`
            : 'โหลดข้อมูลล่าสุดแล้ว'
        );
      })
      .catch(() => {
        setMessage(
          'โหลดข้อมูลไม่สำเร็จ'
        );
      });
  }, []);


  // ====================================================
  // SAVE
  // ====================================================

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

      setMessage(
        'บันทึก Progress เรียบร้อย'
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


  const overallGap =
    summary.actualPercent -
    summary.targetPercent;


  const overallStatus =
    summary.targetTotal === 0
      ? {
          value: 'Not Due',
          tone: 'neutral',
          detail:
            'ยังไม่ถึงช่วง Target',
        }
      : summary.behind
      ? {
          value: 'Behind',
          tone: 'bad',
          detail:
            'มีรายการต่ำกว่า Target',
        }
      : {
          value: 'On Track',
          tone: 'good',
          detail:
            'ทุกรายการถึงหรือเกิน Target',
        };


  return (
    <main className="pageShell">

      {/* HEADER */}

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


      {/* HERO */}

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
                summary.targetTotal ===
                0
                  ? 'ยังไม่ถึงช่วง Target'
                  : summary.behind
                  ? 'ต่ำกว่าแผน'
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
            Overall รวมตัวอย่างทุก Item
            ทั้งโครงการ {fmt(PROJECT_TOTAL)}
            {' '}ตัวอย่าง
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
            {message}
          </div>

        </div>

      </section>


      {/* METRICS */}

      <section className="metricGrid">

        <Metric
          title="Target ณ วันที่"
          value={
            `${pct(
              summary.targetPercent
            )}%`
          }
          sub={
            `${fmt(
              summary.targetTotal
            )} / ${fmt(
              summary.projectTotal
            )} ตัวอย่าง`
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
            summary.targetTotal === 0
              ? 'ยังไม่ถึงช่วง Target'
              : summary.difference < 0
              ? `ขาด ${fmt(
                  Math.abs(
                    summary.difference
                  )
                )} ตัวอย่าง`
              : `เกิน/ถึง Target ${fmt(
                  Math.max(
                    0,
                    summary.difference
                  )
                )} ตัวอย่าง`
          }
          tone={
            summary.targetTotal === 0
              ? 'neutral'
              : summary.behind
              ? 'bad'
              : 'good'
          }
        />


        <Metric
          title="สถานะโครงการ"
          value={
            overallStatus.value
          }
          sub={
            overallStatus.detail
          }
          tone={
            overallStatus.tone
          }
        />


        <Metric
          title="กำหนดถัดไป"
          value={milestone[1]}
          sub={milestone[2]}
        />

      </section>


      {/* ITEM CARDS */}

      <section className="contentGrid">

        <div className="panel">

          <div className="panelHeading">

            <div>
              <div className="sectionEyebrow">
                ACTUAL INPUT
              </div>

              <h2>
                Progress by Item
              </h2>
            </div>

            <div className="panelNote">
              กรอกจำนวนสะสมของแต่ละ Item
            </div>

          </div>


          <div className="itemGrid">

            {ITEM_KEYS.map(
              (key, index) => {

                const item =
                  summary.items[key];

                const status =
                  getStatus(item);

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
                      เป้าหมายทั้งหมด{' '}
                      {fmt(item.total)}
                      {' '}ตัวอย่าง
                    </div>


                    <div className="inputRow">

                      <label
                        htmlFor={
                          `input-${key}`
                        }
                      >
                        Actual สะสม
                      </label>


                      <div className="numberInputWrap">

                        <input
                          id={
                            `input-${key}`
                          }
                          type="number"
                          min="0"
                          max={
                            item.total
                          }
                          value={
                            values[key]
                          }
                          onChange={
                            (event) => {
                              const value =
                                Math.max(
                                  0,
                                  Math.min(
                                    item.total,
                                    Number(
                                      event
                                        .target
                                        .value ||
                                        0
                                    )
                                  )
                                );

                              setValues(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [key]:
                                    value,
                                })
                              );
                            }
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
                        {' / '}
                        {fmt(
                          item.total
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
        </div>


        {/* SUMMARY */}

        <aside className="panel summaryPanel">

          <div className="sectionEyebrow">
            PROJECT SUMMARY
          </div>

          <h2>
            ยอดสะสมรวม
          </h2>

          <div className="summaryBig">
            {fmt(
              summary.actualTotal
            )}
          </div>

          <div className="summaryUnit">
            จากทั้งหมด{' '}
            {fmt(
              summary.projectTotal
            )}
            {' '}ตัวอย่าง
          </div>

          <div className="summaryDivider" />


          {ITEM_KEYS.map(
            (key) => {

              const item =
                summary.items[key];

              return (
                <div
                  className="summaryRow"
                  key={key}
                >

                  <div>
                    <strong>
                      {item.label}
                    </strong>

                    <span>
                      {pct(
                        item.progressPercent
                      )}%
                    </span>
                  </div>

                  <b>
                    {fmt(
                      item.actual
                    )}
                    {' / '}
                    {fmt(
                      item.total
                    )}
                  </b>

                </div>
              );
            }
          )}


          <div className="summaryCallout">

            <strong>
              หลักการคิด Overall
            </strong>

            <span>
              Actual ทุก Item รวมกัน
              ÷ {fmt(PROJECT_TOTAL)}
              {' × 100'}
            </span>

          </div>

        </aside>

      </section>


      {/* DELIVERY PLAN */}

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
            รวมทั้งโครงการ{' '}
            {fmt(PROJECT_TOTAL)}
            {' '}ตัวอย่าง
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
        ข้อมูลบันทึกบน Supabase
      </footer>

    </main>
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