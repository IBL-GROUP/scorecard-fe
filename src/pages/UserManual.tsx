import { useEffect, useMemo, useState } from 'react';
import {
  MANUAL_TABS_NOTE,
  MANUAL_TITLE,
  MANUAL_UPDATED,
  SECTIONS,
  TYPE_LABEL,
  type Block,
  type FieldType,
  type Section,
} from '@/features/userManual/manualData';
import './UserManual.css';

/**
 * The Supply Chain Pulse user manual, at /usermanual — opened in a new tab from
 * the avatar menu.
 *
 * It renders the manual from `manualData`, rather than being written as markup,
 * so the search box can filter every dictionary row on the page at once: a
 * reference document is searched far more often than it is read end to end.
 *
 * `dangerouslySetInnerHTML` appears below for the prose blocks. Every string it
 * renders is authored in manualData.ts — there is no user input, no API response
 * and no URL parameter anywhere in this page — which is what makes it safe here
 * and what must stay true of that file.
 */

const CHIP_CLASS: Record<FieldType, string> = {
  direct: 't-direct',
  agg: 't-agg',
  calc: 't-calc',
  derived: 't-derived',
  hard: 't-hard',
  unconf: 't-unconf',
};

function FieldsTable({ block }: { block: Extract<Block, { kind: 'fields' }> }) {
  return (
    <>
      {block.title && <h3>{block.title}</h3>}
      <div className="manual-tbl">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Field / Metric</th>
              <th>What It Represents</th>
              <th>Data Source</th>
              <th>Source Field</th>
              <th>Type</th>
              <th>Calculation / Logic</th>
              <th>Business Explanation</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={`${row[0]}-${i}`} data-row="">
                <td className="num">{i + 1}</td>
                <td className="field">{row[0]}</td>
                <td className="rep">{row[1]}</td>
                <td className="src">{row[2]}</td>
                <td className="srcfield">{row[3]}</td>
                <td>
                  <span className={`chip ${CHIP_CLASS[row[4]]}`}>{TYPE_LABEL[row[4]]}</span>
                </td>
                <td className="calc" dangerouslySetInnerHTML={{ __html: row[5] }} />
                <td className="biz" dangerouslySetInnerHTML={{ __html: row[6] }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.kind === 'prose') {
    return <div dangerouslySetInnerHTML={{ __html: block.html }} />;
  }
  if (block.kind === 'panel') {
    return <div className="manual-panel" dangerouslySetInnerHTML={{ __html: block.html }} />;
  }
  if (block.kind === 'callout') {
    return (
      <div
        className={`manual-callout${block.tone === 'neutral' ? ' neutral' : ''}`}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  if (block.kind === 'layout') {
    return (
      <>
        <h4>{block.title}</h4>
        <div className="manual-panel">
          <ol className="manual-layout">
            {block.items.map(([name, kind, where]) => (
              <li key={name} data-row="">
                <div>
                  <b>{name}</b>
                  <span className="kind">{kind}</span>
                  <span className="where">{where}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </>
    );
  }
  if (block.kind === 'fields') return <FieldsTable block={block} />;
  if (block.kind === 'checklist') {
    return (
      <div className="manual-tbl manual-checklist">
        <table>
          <thead>
            <tr>
              <th>Dashboard Element</th>
              <th>Visible</th>
              <th>Documented</th>
              <th>Source Identified</th>
              <th>Logic Identified</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]} data-row="">
                <td className="field">{row[0]}</td>
                {[row[1], row[2], row[3]].map((ok, i) => (
                  <td key={i}>
                    <span className={ok ? 'tick' : 'cross'}>{ok ? 'Yes' : 'No'}</span>
                  </td>
                ))}
                <td>
                  <span className={row[4] ? 'tick' : 'cross'}>{row[4] ? 'Yes' : 'Partial'}</span>
                </td>
                <td className="biz">{row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

function SectionView({ section }: { section: Section }) {
  return (
    <section id={section.id}>
      <div className="manual-sec-head">
        <span className="manual-kicker">{section.kicker}</span>
        <h2>{section.title}</h2>
      </div>
      {section.blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </section>
  );
}

export default function UserManual() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(SECTIONS[0]?.id ?? '');
  /** How many rows survived the current search; null when nothing is typed. */
  const [hits, setHits] = useState<number | null>(null);

  // Counts for the masthead, taken from the data so they cannot drift from it.
  const { fieldCount, unconfirmed } = useMemo(() => {
    const rows = SECTIONS.flatMap((section) =>
      section.blocks.flatMap((block) => (block.kind === 'fields' ? block.rows : [])),
    );
    return {
      fieldCount: rows.length,
      unconfirmed: rows.filter((row) => row[4] === 'unconf').length,
    };
  }, []);

  useEffect(() => {
    document.title = `${MANUAL_TITLE} — User Manual`;
  }, []);

  /**
   * Filtering is done against the rendered DOM rather than by re-rendering a
   * filtered copy of the data. The rows a reader searches for are spread across
   * prose, layout lists and eight-column tables, and hiding the ones that do not
   * match keeps every surviving row in its own section, under its own heading —
   * which a flat list of results would lose.
   */
  useEffect(() => {
    const needle = query.trim().toLowerCase();
    const rows = document.querySelectorAll<HTMLElement>('.manual [data-row]');
    const sections = document.querySelectorAll<HTMLElement>('.manual section');

    if (!needle) {
      rows.forEach((row) => row.classList.remove('manual-hidden'));
      sections.forEach((section) => section.classList.remove('manual-hidden'));
      setHits(null);
      return;
    }

    let kept = 0;
    rows.forEach((row) => {
      const match = (row.textContent ?? '').toLowerCase().includes(needle);
      row.classList.toggle('manual-hidden', !match);
      if (match) kept += 1;
    });
    sections.forEach((section) => {
      const total = section.querySelectorAll('[data-row]').length;
      const shown = section.querySelectorAll('[data-row]:not(.manual-hidden)').length;
      section.classList.toggle('manual-hidden', total > 0 && shown === 0);
    });
    // Counted here rather than during render: the classes above are what decide
    // it, and they are only applied once this effect has run.
    setHits(kept);
  }, [query]);

  // Highlights the section being read in the contents rail.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-10% 0px -80% 0px' },
    );
    document.querySelectorAll('.manual section').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="manual">
      <header className="manual-masthead">
        <div className="manual-masthead-inner">
          <div className="manual-topbar">
            <div className="manual-brand">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Searle" />
              <span>OneThunder</span>
            </div>
            <div className="manual-actions">
              <a href={import.meta.env.BASE_URL}>Back to dashboard</a>
              <button type="button" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </div>
          </div>

          <p className="manual-eyebrow">OneThunder · The Searle Company Limited</p>
          <h1>{MANUAL_TITLE} — User Manual &amp; Data Dictionary</h1>
          <p className="manual-standfirst">
            A screen-by-screen record of the dashboard as it stands today: every tab in the order the
            tab bar shows them, every card, chart, filter and table column in the order it appears,
            and for each one the source table, the source field and the calculation behind it.
          </p>
          <dl className="manual-facts">
            <div className="manual-fact">
              <dt>Dashboard</dt>
              <dd>{MANUAL_TITLE}</dd>
            </div>
            <div className="manual-fact">
              <dt>Documented on</dt>
              <dd>{MANUAL_UPDATED}</dd>
            </div>
            <div className="manual-fact">
              <dt>Tabs covered</dt>
              <dd>{MANUAL_TABS_NOTE}</dd>
            </div>
            <div className="manual-fact">
              <dt>Documented fields</dt>
              <dd>{fieldCount}</dd>
            </div>
            <div className="manual-fact">
              <dt>Unverified items</dt>
              <dd>{unconfirmed} marked Not Confirmed</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="manual-shell">
        <nav className="manual-rail" aria-label="Contents">
          <div className="manual-search">
            <label htmlFor="manual-q">Find a field</label>
            <input
              id="manual-q"
              type="search"
              placeholder="e.g. cover days, threshold, WIP"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <p>
              {hits === null
                ? ''
                : hits === 0
                  ? 'No matching entries'
                  : `${hits} matching ${hits === 1 ? 'entry' : 'entries'}`}
            </p>
          </div>
          <p className="manual-rail-title">Contents</p>
          <ol>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={section.id === active ? 'on' : undefined}>
                  <span className="n">{section.num}</span>
                  <span>{section.title.replace(/^Tab \d+: /, '')}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          {SECTIONS.map((section) => (
            <SectionView key={section.id} section={section} />
          ))}
        </main>
      </div>

      <footer className="manual-footer">
        {MANUAL_TITLE} User Manual &amp; Data Dictionary · Documented from the dashboard and its API
        as deployed on {MANUAL_UPDATED}. Where a source or a formula could not be verified, the entry
        is marked <span className="chip t-unconf">Not Confirmed</span> rather than inferred.
      </footer>
    </div>
  );
}
