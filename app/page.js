'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ITEMS,
  projectSummary,
} from '../lib/targets';


const keys = [
  'stream',
  'weathered',
  'heavy_stream',
  'heavy_weathered',
  'bsoil',
];


const initial = {
  stream: 0,
  weathered: 0,
  heavy_stream: 0,
  heavy_weathered: 0,
  bsoil: 0,
};


const DELIVERY_MILESTONES = [
  {
    batch: '01',
    displayDate: '1–5 ก.ย. 2569',
    cumulative: 400,
    total: 1702,
  },
  {
    batch: '02',
    displayDate: '15–20 ก.ย. 2569',
    cumulative: 800,
    total: 1702,
  },
  {
    batch: '03',
    displayDate: '25–30 ก.ย. 2569',
    cumulative: 1280,
    total: 1702,
  },
  {
    batch: '04',
    displayDate: '1–5 ต.ค. 2569',
    cumulative: 1672,
    total: 1702,
  },
  {
    batch: 'B',
    displayDate: '11–15 ต.ค. 2569',
    cumulative: 1702,
    total: 1702,
  },
];


function todayBangkok() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date());
}


function fmt(value) {
  return new Intl.NumberFormat(
    'th-TH'
  ).format(value);
}


function statusFor(row) {
  if (row.target === 0) {
    return {
      label: 'Not Due',
      tone: 'neutral',
      detail: 'ยังไม่ถึง Target',
    };
  }

  if (row.gap >= 0) {
    return {
      label: 'On Track',
      tone: 'good',
      detail: `ถึง/เกินเป้า ${fmt(row.gap)} ตัวอย่าง`,
    };
  }

  return {
    label: 'Behind',
    tone: 'bad',
    detail: `ขาด ${fmt(-row.gap)} ตัวอย่าง`,
  };
}


function nextMilestone(date) {
  const milestones = [
    [
      '2026-09-05',
      'รอบที่ 1',
      '5 ก.ย. 2569',
      '100 / 418 ต่อ Item',
    ],
    [
      '2026-09-20',
      'รอบที่ 2',
      '20 ก.ย. 2569',
      '200 / 418 ต่อ Item',
    ],
    [
      '2026-09-30',
      'รอบที่ 3',
      '30 ก.ย. 2569',
      '320 / 418 ต่อ Item',
    ],
    [
      '2026-10-05',
      'รอบที่ 4',
      '5 ต.ค. 2569',
      '418 / 418 ต่อ Item',
    ],
    [
      '2026-10-15',
      'ดินชั้น B',
      '15 ต.ค. 2569',
      '30 / 30',
    ],
  ];

  return (
    milestones.find(
      ([milestoneDate]) =>
        date <= milestoneDate
    ) || [
      '-',
      'ครบทุกชุด',
      '-',
      'ส่งครบตามแผน',
    ]
  );
}


export default function Page() {
  const [date, setDate] =
    useState(todayBangkok());

  const [values, setValues] =
    useState(initial);

  const [message, setMessage] =
    useState('กำลังโหลดข้อมูลล่าสุด...');

  const [saving, setSaving] =
    useState(false);


  const summary = useMemo(
    () => projectSummary(date, values),
    [date, values]
  );


  const milestone = useMemo(
    () => nextMilestone(date),
    [date]
  );


  const overallGap =
    summary.actualPct -
    summary.targetPct;


  useEffect(() => {
    fetch('/api/progress')
      .then((response) =>
        response.json()
      )
      .then((data) => {
        if (data.snapshot) {
          setValues({
            stream:
              data.snapshot.stream ?? 0,

            weathered:
              data.snapshot.weathered ?? 0,

            heavy_stream:
              data.snapshot.heavy_stream ?? 0,

            heavy_weathered:
              data.snapshot.heavy_weathered ?? 0,

            bsoil:
              data.snapshot.bsoil ?? 0,
          });

          setDate(
            data.snapshot.progress_date ||
            todayBangkok()
          );

          setMessage(
            'โหลดข้อมูลล่าสุดแล้ว'
          );
        } else {
          setMessage(
            'ยังไม่มีข้อมูลที่บันทึก'
          );
        }
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
      const res = await fetch(
        '/api/progress',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            progress_date: date,
            ...values,
          }),
        }
      );


      const data =
        await res.json();


      if (res.ok) {
        setMessage(
          'บันทึก Progress เรียบร้อย'
        );
      } else {
        setMessage(
          `บันทึกไม่สำเร็จ: ${
            typeof data.error === 'string'
              ? data.error
              : JSON.stringify(data.error)
          }`
        );
      }
    } catch {
      setMessage(
        'บันทึกไม่สำเร็จ: เชื่อมต่อระบบไม่ได้'
      );
    } finally {
      setSaving(false);
    }
  }


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
          Online Dashboard
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
              {summary.actualPct.toFixed(2)}%
            </span>

            <span className="heroStatusText">
              {
                summary.targetTotal === 0
                  ? 'ยังไม่ถึงช่วง Target'
                  : summary.behind
                    ? 'ต่ำกว่าแผน'
                    : 'ตามแผน'
              }
            </span>

          </div>


          <div className="heroCount">

            <strong>
              {fmt(summary.actualTotal)}
            </strong>

            {' / '}

            {fmt(summary.totalProject)}

            {' ตัวอย่างสะสม'}

          </div>


          <div
            className="heroProgress"
            aria-label={
              `Overall Progress ${summary.actualPct.toFixed(2)}%`
            }
          >

            <span
              style={{
                width:
                  `${Math.min(
                    100,
                    summary.actualPct
                  )}%`,
              }}
            />

          </div>


          <div className="heroFoot">
            4 รายการหลัก 1,672 ตัวอย่าง
            {' + '}
            ดินชั้น B 30 ตัวอย่าง
            {' = '}
            <strong>
              1,702 ตัวอย่าง
            </strong>
          </div>

        </div>


        <div className="controlPanel">

          <label htmlFor="progress-date">
            วันที่ประเมิน
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


      {/* KPI */}

      <section className="metricGrid">

        <Metric
          title="Target วันนี้"

          value={
            `${summary.targetPct.toFixed(2)}%`
          }

          sub={
            `${fmt(summary.targetTotal)} / ${fmt(summary.totalProject)} ตัวอย่าง`
          }
        />


        <Metric
          title="Gap จากแผน"

          value={
            `${overallGap >= 0 ? '+' : ''}${overallGap.toFixed(2)}%`
          }

          sub={
            summary.targetTotal === 0
              ? 'ยังไม่ถึงช่วง Target'
              : summary.behind
                ? `ขาด ${fmt(
                    summary.targetTotal -
                    summary.actualTotal
                  )} ตัวอย่าง`
                : `เกินเป้า ${fmt(
                    Math.max(
                      0,
                      summary.actualTotal -
                      summary.targetTotal
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
            summary.targetTotal === 0
              ? 'Not Due'
              : summary.behind
                ? 'Behind'
                : 'On Track'
          }

          sub={
            summary.targetTotal === 0
              ? 'รอเริ่ม Target ตามแผน'
              : summary.behind
                ? 'ควรเร่ง Progress'
                : 'Progress ถึงหรือเกิน Target'
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
          title="กำหนดถัดไป"

          value={milestone[1]}

          sub={
            `${milestone[2]} · ${milestone[3]}`
          }
        />

      </section>


      {/* CONTENT */}

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
              กรอกจำนวนตัวอย่างสะสมจริง
            </div>

          </div>


          <div className="itemGrid">

            {
              keys.map(
                (key, index) => {

                  const row =
                    summary.rows.find(
                      (item) =>
                        item.key === key
                    );


                  if (!row) {
                    return null;
                  }


                  const status =
                    statusFor(row);


                  return (
                    <article
                      className="itemCard"
                      key={key}
                    >

                      <div className="itemTop">

                        <div className="itemNumber">
                          {
                            String(
                              index + 1
                            ).padStart(
                              2,
                              '0'
                            )
                          }
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
                        {ITEMS[key].label}
                      </h3>


                      <div className="itemTotal">
                        เป้าหมายทั้งหมด
                        {' '}
                        {fmt(row.total)}
                        {' '}
                        ตัวอย่าง
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
                              ITEMS[key].total
                            }

                            value={
                              values[key]
                            }

                            onChange={
                              (event) => {

                                const rawValue =
                                  Number(
                                    event.target.value
                                    || 0
                                  );


                                const safeValue =
                                  Math.max(
                                    0,
                                    Math.min(
                                      ITEMS[key].total,
                                      Number.isFinite(
                                        rawValue
                                      )
                                        ? rawValue
                                        : 0
                                    )
                                  );


                                setValues(
                                  (current) => ({
                                    ...current,
                                    [key]:
                                      safeValue,
                                  })
                                );
                              }
                            }
                          />


                          <span>
                            /
                            {' '}
                            {fmt(row.total)}
                          </span>

                        </div>

                      </div>


                      <div className="itemProgressLine">

                        <strong>
                          {
                            row.progress.toFixed(
                              2
                            )
                          }%
                        </strong>


                        <span>
                          Target
                          {' '}
                          {fmt(row.target)}
                          {' / '}
                          {fmt(row.total)}
                        </span>

                      </div>


                      <div className="itemBar">

                        <span
                          style={{
                            width:
                              `${Math.min(
                                100,
                                row.progress
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
              )
            }

          </div>

        </div>


        {/* PROJECT SUMMARY */}

        <aside className="panel summaryPanel">

          <div className="sectionEyebrow">
            PROJECT SUMMARY
          </div>

          <h2>
            ยอดสะสมรวม
          </h2>


          <div className="summaryBig">
            {fmt(summary.actualTotal)}
          </div>


          <div className="summaryUnit">
            จากทั้งหมด
            {' '}
            {fmt(summary.totalProject)}
            {' '}
            ตัวอย่าง
          </div>


          <div className="summaryDivider" />


          {
            summary.rows.map(
              (row) => (

                <div
                  className="summaryRow"
                  key={row.key}
                >

                  <div>

                    <strong>
                      {row.label}
                    </strong>

                    <span>
                      {
                        row.progress.toFixed(
                          2
                        )
                      }%
                    </span>

                  </div>


                  <b>
                    {fmt(row.actual)}
                    {' / '}
                    {fmt(row.total)}
                  </b>

                </div>

              )
            )
          }


          <div className="summaryCallout">

            <strong>
              Overall Progress
            </strong>

            <span>
              Actual ทุก Item รวมกัน
              {' ÷ '}
              1,702
              {' × '}
              100
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
            Total Project
            {' · '}
            1,702 ตัวอย่าง
          </div>

        </div>


        <div className="deliverySummary">

          <div>
            <span>
              รายการหลัก
            </span>

            <strong>
              418 × 4
            </strong>
          </div>


          <div>
            <span>
              Main Samples
            </span>

            <strong>
              1,672
            </strong>
          </div>


          <div>
            <span>
              ดินชั้น B
            </span>

            <strong>
              30
            </strong>
          </div>


          <div>
            <span>
              Total Project
            </span>

            <strong>
              1,702
            </strong>
          </div>

        </div>


        <div className="tableWrap">

          <table className="deliveryTable">

            <thead>

              <tr>

                <th>
                  รอบส่ง
                </th>

                <th>
                  กำหนดส่ง
                </th>

                <th>
                  ยอดสะสมรวมทุก Item
                </th>

                <th>
                  Progress
                </th>

              </tr>

            </thead>


            <tbody>

              {
                DELIVERY_MILESTONES.map(
                  (row) => {

                    const progress =
                      (
                        row.cumulative /
                        row.total
                      ) * 100;


                    return (
                      <DeliveryRow
                        key={row.batch}

                        batch={
                          row.batch
                        }

                        date={
                          row.displayDate
                        }

                        total={
                          `${fmt(row.cumulative)} / ${fmt(row.total)}`
                        }

                        pct={
                          `${progress.toFixed(2)}%`
                        }
                      />
                    );
                  }
                )
              }

            </tbody>

          </table>

        </div>


        <div className="deliveryFootnote">

          รอบที่ 1–4 ครอบคลุมตัวอย่างหลัก
          {' '}
          4 รายการ รวม
          {' '}
          1,672 ตัวอย่าง
          {' · '}
          ดินชั้น B จำนวน 30 ตัวอย่าง
          {' '}
          ส่งวันที่ 11–15 ต.ค. 2569
          {' · '}
          Total Project = 1,702 ตัวอย่าง

        </div>

      </section>


      <footer className="footerNote">

        Stream Progress
        {' · '}
        BTECH Sample Delivery Control
        {' · '}
        Supabase

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


function DeliveryRow({
  batch,
  date,
  total,
  pct,
}) {

  return (
    <tr>

      <td>
        <span className="batchBadge">
          {batch}
        </span>
      </td>

      <td>
        <strong>
          {date}
        </strong>
      </td>

      <td>
        <span className="deliveryTotal">
          {total}
        </span>
      </td>

      <td>
        <span className="progressBadge">
          {pct}
        </span>
      </td>

    </tr>
  );
}