// Payments QA Scenario Dashboard — application logic
// State, scenario generation, filtering, rendering, event handling.

const RENDER_CAP = 500;

const DIM_ORDER = [
  'deposit', 'depositFrequency', 'paymentType', 'paymentMethod',
  'planType', 'paymentFrequency', 'planBasis', 'budgetBasis'
];

const SNAPSHOT_KEY = 'payments-qa-snapshot-v1';

const state = {
  projectId: 'globalsquirrels',
  filters: {
    deposit: [], depositFrequency: [], paymentType: [], paymentMethod: [],
    planType: [], paymentFrequency: [], planBasis: [], budgetBasis: []
  },
  statuses: {},
  notes: {},
  showAll: false,
  scenariosCache: null,
  viewMode: 'grid',
  expandedNodes: new Set(),
  statusFilter: 'all',  // 'all' | 'pass' | 'fail' | 'partial' | 'pending'
  search: ''
};

function getProject() {
  return PROJECTS[state.projectId];
}

function buildScenarios(project) {
  const d = project.dimensions;
  const scenarios = [];
  let idx = 0;

  for (const deposit of d.deposit) {
    // Deposit Frequency only applies when an onboarding deposit is taken.
    const depositFreqValues = deposit === 'Yes' ? d.depositFrequency : [null];
    for (const depositFrequency of depositFreqValues)
    for (const paymentType of d.paymentType)
    for (const paymentMethod of d.paymentMethod)
    for (const planType of d.planType)
    for (const paymentFrequency of d.paymentFrequency)
    for (const planBasis of d.planBasis)
    for (const budgetBasis of d.budgetBasis) {
      idx++;
      const id = project.code + '-' + String(idx).padStart(4, '0');
      scenarios.push({
        id,
        deposit,
        depositFrequency,
        paymentType,
        paymentMethod,
        planType,
        paymentFrequency,
        planBasis,
        budgetBasis
      });
    }
  }
  return scenarios;
}

function getScenarios() {
  if (!state.scenariosCache) {
    state.scenariosCache = buildScenarios(getProject());
  }
  return state.scenariosCache;
}

function matchesFilter(scenario, dim, selected) {
  if (selected.length === 0) return true;
  const value = scenario[dim];
  if (dim === 'paymentMethod' || dim === 'planType') {
    return selected.indexOf(value.id) !== -1;
  }
  return selected.indexOf(value) !== -1;
}

function applyFilters(scenarios) {
  const f = state.filters;
  return scenarios.filter(s =>
    matchesFilter(s, 'deposit',          f.deposit) &&
    matchesFilter(s, 'depositFrequency', f.depositFrequency) &&
    matchesFilter(s, 'paymentType',      f.paymentType) &&
    matchesFilter(s, 'paymentMethod',    f.paymentMethod) &&
    matchesFilter(s, 'planType',         f.planType) &&
    matchesFilter(s, 'paymentFrequency', f.paymentFrequency) &&
    matchesFilter(s, 'planBasis',        f.planBasis) &&
    matchesFilter(s, 'budgetBasis',      f.budgetBasis)
  );
}

function applyStatusFilter(scenarios) {
  if (state.statusFilter === 'all') return scenarios;
  return scenarios.filter(s => cardState(s) === state.statusFilter);
}

function applySearch(scenarios) {
  const q = state.search.trim().toLowerCase();
  if (!q) return scenarios;
  return scenarios.filter(s => {
    if (s.id.toLowerCase().indexOf(q) !== -1) return true;
    const haystack = [
      s.deposit, s.depositFrequency, s.paymentType,
      s.paymentMethod.label, s.paymentMethod.feeKey,
      s.planType.label, s.planType.category,
      s.paymentFrequency, s.planBasis, s.budgetBasis,
      (state.notes[s.id] || '')
    ].join(' ').toLowerCase();
    return haystack.indexOf(q) !== -1;
  });
}

function applyAllFilters(scenarios) {
  return applySearch(applyStatusFilter(applyFilters(scenarios)));
}

function countByStatus(scenarios) {
  const counts = { all: scenarios.length, pass: 0, fail: 0, partial: 0, pending: 0 };
  for (const s of scenarios) counts[cardState(s)]++;
  return counts;
}

function computeFee(scenario) {
  const feeKey = scenario.paymentMethod.feeKey;
  const rule = FEES[feeKey];
  let amount = 0;
  if (rule.kind === 'flat')    amount = rule.amount;
  if (rule.kind === 'percent') amount = SAMPLE_AMOUNT * rule.rate;
  return {
    amount,
    label: rule.label,
    isContractor: scenario.planType.category === 'Contractor'
  };
}

function formatMoney(n) {
  return '$' + n.toFixed(2);
}

function countStatuses(scenarios) {
  let pass = 0, fail = 0;
  const total = scenarios.length * 2;
  for (const s of scenarios) {
    const st = state.statuses[s.id];
    if (!st) continue;
    if (st.first  === 'pass') pass++;
    if (st.first  === 'fail') fail++;
    if (st.second === 'pass') pass++;
    if (st.second === 'fail') fail++;
  }
  return { total, pass, fail, pending: total - pass - fail };
}

function cardState(s) {
  const st = state.statuses[s.id];
  if (!st) return 'pending';
  const f = st.first, sd = st.second;
  if (f === 'fail' || sd === 'fail') return 'fail';
  if (f === 'pass' && sd === 'pass') return 'pass';
  if (f || sd) return 'partial';
  return 'pending';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- Rendering ----------

function renderFilters() {
  const project = getProject();
  if (!project.enabled) return '';
  const d = project.dimensions;

  function chip(dim, value, label, isActive) {
    return `<button class="chip${isActive ? ' chip--active' : ''}"
              data-filter-dim="${dim}" data-filter-value="${escapeHtml(value)}"
              type="button">${escapeHtml(label)}</button>`;
  }

  function chipGroup(dim) {
    const selected = state.filters[dim];
    const values = d[dim];

    if (dim === 'paymentMethod') {
      return values.map(v => chip(dim, v.id, v.label, selected.indexOf(v.id) !== -1)).join('');
    }
    if (dim === 'planType') {
      const employee = values.filter(v => v.category === 'Employee');
      const contractor = values.filter(v => v.category === 'Contractor');
      return `
        <div class="filter__subheader">Employee</div>
        <div class="chip-row">${employee.map(v => chip(dim, v.id, v.label, selected.indexOf(v.id) !== -1)).join('')}</div>
        <div class="filter__subheader">Contractor</div>
        <div class="chip-row">${contractor.map(v => chip(dim, v.id, v.label, selected.indexOf(v.id) !== -1)).join('')}</div>
      `;
    }
    return values.map(v => chip(dim, v, v, selected.indexOf(v) !== -1)).join('');
  }

  return FILTER_GROUPS.map(group => `
    <div class="filter__group">
      <h3 class="filter__group-title">${group.title}</h3>
      ${group.dimensions.map(dim => `
        <div class="filter__dim">
          <div class="filter__label">${DIMENSION_LABELS[dim]}</div>
          ${dim === 'planType'
            ? chipGroup(dim)
            : `<div class="chip-row">${chipGroup(dim)}</div>`}
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderSummary(filtered) {
  const { total, pass, fail, pending } = countStatuses(filtered);
  const marked = pass + fail;
  const pct = total === 0 ? 0 : Math.round((marked / total) * 100);

  return `
    <div class="summary__head">
      <div class="summary__title">Coverage</div>
      ${renderViewToggle()}
    </div>
    <div class="summary__counts">
      <div class="summary__metric">
        <span class="summary__num">${filtered.length.toLocaleString()}</span>
        <span class="summary__caption">scenarios</span>
      </div>
      <div class="summary__metric">
        <span class="summary__num">${total.toLocaleString()}</span>
        <span class="summary__caption">payment tests</span>
      </div>
      <div class="summary__metric summary__metric--pass">
        <span class="summary__num">${pass.toLocaleString()}</span>
        <span class="summary__caption">passed</span>
      </div>
      <div class="summary__metric summary__metric--fail">
        <span class="summary__num">${fail.toLocaleString()}</span>
        <span class="summary__caption">failed</span>
      </div>
      <div class="summary__metric summary__metric--pending">
        <span class="summary__num">${pending.toLocaleString()}</span>
        <span class="summary__caption">pending</span>
      </div>
    </div>
    <div class="progress">
      <div class="progress__bar" style="width:${pct}%"></div>
      <div class="progress__label">${pct}% complete</div>
    </div>
  `;
}

function renderCard(s) {
  const fee = computeFee(s);
  const st = state.statuses[s.id] || {};
  const status = cardState(s);

  function stageRow(stageKey, stageLabel) {
    const v = st[stageKey];
    return `
      <div class="stage stage--${v || 'pending'}">
        <span class="stage__label">${stageLabel}</span>
        <div class="stage__actions">
          <button class="btn btn--pass${v === 'pass' ? ' is-active' : ''}"
                  data-action="pass" data-stage="${stageKey}" data-id="${s.id}" type="button">
            <span aria-hidden="true">✓</span> Pass
          </button>
          <button class="btn btn--fail${v === 'fail' ? ' is-active' : ''}"
                  data-action="fail" data-stage="${stageKey}" data-id="${s.id}" type="button">
            <span aria-hidden="true">✗</span> Fail
          </button>
          <button class="btn btn--reset" data-action="reset" data-stage="${stageKey}" data-id="${s.id}" type="button"
                  title="Reset this stage" aria-label="Reset this stage">↻</button>
        </div>
      </div>
    `;
  }

  return `
    <article class="card card--${status}" data-id="${s.id}">
      <header class="card__head">
        <span class="card__id">${s.id}</span>
        <span class="card__status-pill card__status-pill--${status}">${status}</span>
      </header>
      <div class="card__chips">
        <span class="tag tag--deposit">Deposit: ${s.deposit}</span>
        ${s.depositFrequency ? `<span class="tag">Dep. Freq: ${s.depositFrequency}</span>` : ''}
        <span class="tag">${s.paymentType}</span>
        <span class="tag tag--method">${s.paymentMethod.label}</span>
        <span class="tag tag--plan tag--${s.planType.category === 'Contractor' ? 'contractor' : 'employee'}">${s.planType.label}</span>
        <span class="tag">Pay. Freq: ${s.paymentFrequency}</span>
        <span class="tag">Plan: ${s.planBasis}</span>
        <span class="tag">Budget: ${s.budgetBasis}</span>
      </div>
      <div class="card__fee">
        <span class="card__fee-label">Fee on ${formatMoney(SAMPLE_AMOUNT)}:</span>
        <span class="card__fee-amount">${formatMoney(fee.amount)}</span>
        <span class="card__fee-rule">(${fee.label})</span>
        ${fee.isContractor ? '<span class="badge badge--wise">Wise fee applies</span>' : ''}
      </div>
      <div class="card__stages">
        ${stageRow('first', '1st Payment')}
        ${stageRow('second', '2nd Payment')}
      </div>
      <label class="card__note-wrap">
        <span class="card__note-label">Notes</span>
        <input class="card__note" type="text"
               data-note-id="${s.id}"
               value="${escapeHtml(state.notes[s.id] || '')}"
               placeholder="Jira ID, error message, repro step..." />
      </label>
    </article>
  `;
}

// ---------- Mind map ----------

function getDimLabel(scenario, dim) {
  const v = scenario[dim];
  if (dim === 'paymentMethod' || dim === 'planType') return v.label;
  return v;
}

function buildTree(scenarios) {
  const root = {
    label: getProject().name,
    dim: null,
    pathKey: 'root',
    depth: -1,
    children: new Map(),
    scenarios: [],
    count: scenarios.length,
    pass: 0,
    fail: 0
  };

  for (const s of scenarios) {
    let node = root;
    let path = 'root';
    // Filter to the dimensions this scenario actually has values for.
    const applicableDims = DIM_ORDER.filter(dim => s[dim] != null);
    for (let i = 0; i < applicableDims.length; i++) {
      const dim = applicableDims[i];
      const label = getDimLabel(s, dim);
      path = path + '|' + dim + '=' + label;
      if (!node.children.has(label)) {
        node.children.set(label, {
          label,
          dim,
          pathKey: path,
          depth: i,
          children: new Map(),
          scenarios: [],
          count: 0,
          pass: 0,
          fail: 0,
          isLeaf: false
        });
      }
      node = node.children.get(label);
      node.count++;
      if (i === applicableDims.length - 1) {
        node.scenarios.push(s);
        node.isLeaf = true;
      }
    }
  }

  function rollup(node) {
    let pass = 0, fail = 0;
    for (const s of node.scenarios) {
      const st = state.statuses[s.id];
      if (!st) continue;
      if (st.first  === 'pass') pass++;
      if (st.first  === 'fail') fail++;
      if (st.second === 'pass') pass++;
      if (st.second === 'fail') fail++;
    }
    for (const child of node.children.values()) {
      rollup(child);
      pass += child.pass;
      fail += child.fail;
    }
    node.pass = pass;
    node.fail = fail;
  }
  rollup(root);

  return root;
}

function nodeStateClass(node) {
  const totalTests = node.count * 2;
  const marked = node.pass + node.fail;
  if (node.fail > 0)              return 'tree__node--fail';
  if (marked === totalTests)      return 'tree__node--pass';
  if (node.pass > 0)              return 'tree__node--partial';
  return 'tree__node--pending';
}

function renderLeafActions(s) {
  const st = state.statuses[s.id] || {};
  function stage(stageKey, label) {
    return `<span class="tree__stage">
      <span class="tree__stage-label">${label}</span>
      <button class="btn btn--pass${st[stageKey] === 'pass' ? ' is-active' : ''}"
              data-action="pass" data-stage="${stageKey}" data-id="${s.id}" type="button"
              title="Mark ${label} as Pass" aria-label="Mark ${label} as Pass">✓</button>
      <button class="btn btn--fail${st[stageKey] === 'fail' ? ' is-active' : ''}"
              data-action="fail" data-stage="${stageKey}" data-id="${s.id}" type="button"
              title="Mark ${label} as Fail" aria-label="Mark ${label} as Fail">✗</button>
      <button class="btn btn--reset"
              data-action="reset" data-stage="${stageKey}" data-id="${s.id}" type="button"
              title="Reset ${label}" aria-label="Reset ${label}">↻</button>
    </span>`;
  }
  return `<span class="tree__leaf-actions">
    ${stage('first', '1st')}
    ${stage('second', '2nd')}
  </span>`;
}

function renderTreeNode(node, isRoot) {
  const isLeaf = !!node.isLeaf && node.children.size === 0;
  const hasChildren = node.children.size > 0;
  const expanded = isRoot || state.expandedNodes.has(node.pathKey);
  const stateClass = nodeStateClass(node);

  const dimLabel = node.depth >= 0 ? DIMENSION_LABELS[node.dim] : '';
  const totalTests = node.count * 2;
  const marked = node.pass + node.fail;
  const pendingNum = totalTests - marked;
  const pct = totalTests === 0 ? 0 : Math.round((marked / totalTests) * 100);

  if (isLeaf) {
    const s = node.scenarios[0];
    const wise = s.planType.category === 'Contractor';
    return `<div class="tree__node tree__node--leaf ${stateClass}">
      <div class="tree__row tree__row--leaf">
        <span class="tree__caret tree__caret--empty">•</span>
        <span class="tree__label">
          ${dimLabel ? `<span class="tree__dim">${dimLabel}:</span>` : ''}
          <span class="tree__value">${escapeHtml(node.label)}</span>
          <span class="tree__leaf-id">${s.id}</span>
          ${wise ? '<span class="badge badge--wise">Wise</span>' : ''}
        </span>
        ${renderLeafActions(s)}
      </div>
    </div>`;
  }

  let childrenHtml = '';
  if (expanded && hasChildren) {
    const arr = Array.from(node.children.values());
    childrenHtml = `<div class="tree__children">${arr.map(c => renderTreeNode(c, false)).join('')}</div>`;
  }

  const caret = hasChildren
    ? `<span class="tree__caret">${expanded ? '▼' : '▶'}</span>`
    : `<span class="tree__caret tree__caret--empty">•</span>`;

  return `<div class="tree__node ${stateClass}">
    <div class="tree__row" data-expand="${escapeHtml(node.pathKey)}">
      ${caret}
      <span class="tree__label">
        ${dimLabel ? `<span class="tree__dim">${dimLabel}:</span>` : ''}
        <span class="tree__value">${escapeHtml(node.label)}</span>
      </span>
      <span class="tree__meta">
        <span class="tree__count">${node.count.toLocaleString()} scenario${node.count !== 1 ? 's' : ''}</span>
        ${node.pass > 0    ? `<span class="tree__stat tree__stat--pass">✓ ${node.pass.toLocaleString()}</span>` : ''}
        ${node.fail > 0    ? `<span class="tree__stat tree__stat--fail">✗ ${node.fail.toLocaleString()}</span>` : ''}
        ${pendingNum > 0   ? `<span class="tree__stat tree__stat--pending">○ ${pendingNum.toLocaleString()}</span>` : ''}
        ${marked > 0       ? `<span class="tree__pct">${pct}%</span>` : ''}
      </span>
    </div>
    ${childrenHtml}
  </div>`;
}

function renderMindMap(filtered) {
  if (filtered.length === 0) {
    return `<div class="empty">No scenarios match the current filters.</div>`;
  }
  const tree = buildTree(filtered);
  return `
    <div class="tree-controls">
      <span class="tree-controls__hint">Click any branch to expand. Drill all the way down to mark individual scenarios.</span>
      <button class="btn-secondary" id="btn-collapse-all" type="button">Collapse all</button>
    </div>
    <div class="tree">${renderTreeNode(tree, true)}</div>
  `;
}

function renderViewToggle() {
  return `
    <div class="view-toggle" role="tablist" aria-label="View mode">
      <button class="view-toggle__btn${state.viewMode === 'grid' ? ' is-active' : ''}"
              data-view="grid" type="button" role="tab">Grid</button>
      <button class="view-toggle__btn${state.viewMode === 'mindmap' ? ' is-active' : ''}"
              data-view="mindmap" type="button" role="tab">Mind Map</button>
    </div>
  `;
}

function renderGrid(filtered) {
  if (filtered.length === 0) {
    return `<div class="empty">No scenarios match the current filters.</div>`;
  }

  const overCap = filtered.length > RENDER_CAP && !state.showAll;
  const slice = overCap ? filtered.slice(0, RENDER_CAP) : filtered;

  const banner = overCap
    ? `<div class="banner">
         Showing first ${RENDER_CAP.toLocaleString()} of ${filtered.length.toLocaleString()} scenarios.
         <button class="banner__btn" id="btn-show-all" type="button">Show all</button>
       </div>`
    : '';

  return banner + `<div class="grid">${slice.map(renderCard).join('')}</div>`;
}

function renderProjectSwitcher() {
  return Object.values(PROJECTS).map(p => `
    <button class="proj${state.projectId === p.id ? ' proj--active' : ''}${!p.enabled ? ' proj--disabled' : ''}"
            data-proj="${p.id}" type="button" ${!p.enabled ? 'disabled' : ''}>
      <span class="proj__name">${p.name}</span>
      ${!p.enabled ? '<span class="proj__pill">Coming Soon</span>' : ''}
    </button>
  `).join('');
}

function render() {
  document.getElementById('project-switcher').innerHTML = renderProjectSwitcher();

  const project = getProject();
  const toolbarEl = document.getElementById('toolbar');

  if (!project.enabled) {
    document.getElementById('filters').innerHTML =
      `<div class="placeholder">Filters become available once the project is configured.</div>`;
    document.getElementById('summary').innerHTML = '';
    if (toolbarEl) toolbarEl.style.display = 'none';
    document.getElementById('grid-wrap').innerHTML =
      `<div class="placeholder placeholder--main">
         <h2>${project.name} configuration coming soon</h2>
         <p>Scenario definitions for ${project.name} haven't been added yet. Switch to Global Squirrels to start QA.</p>
       </div>`;
    return;
  }

  if (toolbarEl) toolbarEl.style.display = '';

  const scenarios = getScenarios();
  const dimFiltered = applyFilters(scenarios);
  const displayed = applySearch(applyStatusFilter(dimFiltered));

  document.getElementById('filters').innerHTML = renderFilters();
  document.getElementById('summary').innerHTML = renderSummary(dimFiltered);
  document.getElementById('quick-filters').innerHTML = renderQuickFilters(dimFiltered);
  document.getElementById('grid-wrap').innerHTML =
    state.viewMode === 'mindmap' ? renderMindMap(displayed) : renderGrid(displayed);
}

// ---------- Quick filters (status pills) ----------

function renderQuickFilters(dimFiltered) {
  const counts = countByStatus(dimFiltered);
  const items = [
    { key: 'all',     label: 'All',     n: counts.all },
    { key: 'pending', label: 'Pending', n: counts.pending },
    { key: 'partial', label: 'Partial', n: counts.partial },
    { key: 'pass',    label: 'Passed',  n: counts.pass },
    { key: 'fail',    label: 'Failed',  n: counts.fail }
  ];
  return items.map(it => `
    <button class="qf qf--${it.key}${state.statusFilter === it.key ? ' is-active' : ''}"
            data-status="${it.key}" type="button">
      <span class="qf__label">${it.label}</span>
      <span class="qf__count">${it.n.toLocaleString()}</span>
    </button>
  `).join('');
}

// ---------- Export ----------

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toRow(s) {
  const fee = computeFee(s);
  const st = state.statuses[s.id] || {};
  return {
    id: s.id,
    deposit: s.deposit,
    depositFrequency: s.depositFrequency,
    paymentType: s.paymentType,
    paymentMethod: s.paymentMethod.label,
    planType: s.planType.label,
    planCategory: s.planType.category,
    paymentFrequency: s.paymentFrequency,
    planBasis: s.planBasis,
    budgetBasis: s.budgetBasis,
    feeAmount: Number(fee.amount.toFixed(2)),
    feeRule: fee.label,
    wiseApplies: fee.isContractor,
    firstPayment: st.first || '',
    secondPayment: st.second || '',
    overallStatus: cardState(s),
    note: state.notes[s.id] || ''
  };
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
      else field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function importCsvText(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) { showToast('CSV is empty or has no data rows'); return; }

  const headers = rows[0].map(h => h.trim());
  const idCol     = headers.indexOf('id');
  const firstCol  = headers.indexOf('firstPayment');
  const secondCol = headers.indexOf('secondPayment');
  const noteCol   = headers.indexOf('note');

  if (idCol === -1) {
    showToast('CSV is missing the "id" column — not a dashboard export');
    return;
  }

  const scenarios = getScenarios();
  const validIds = new Set(scenarios.map(s => s.id));

  let imported = 0, skipped = 0;
  const otherPrefixes = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && row[0] === '') continue;
    const id = (row[idCol] || '').trim();
    if (!id) continue;
    if (!validIds.has(id)) {
      const m = id.match(/^([A-Za-z]+)-/);
      if (m) otherPrefixes.add(m[1]);
      skipped++;
      continue;
    }

    const first  = firstCol  !== -1 ? (row[firstCol]  || '').trim() : '';
    const second = secondCol !== -1 ? (row[secondCol] || '').trim() : '';
    const note   = noteCol   !== -1 ? (row[noteCol]   || '')        : '';

    const validFirst  = (first  === 'pass' || first  === 'fail') ? first  : null;
    const validSecond = (second === 'pass' || second === 'fail') ? second : null;

    if (validFirst || validSecond) {
      if (!state.statuses[id]) state.statuses[id] = {};
      if (validFirst)  state.statuses[id].first  = validFirst;
      if (validSecond) state.statuses[id].second = validSecond;
    }
    if (note) state.notes[id] = note;

    imported++;
  }

  render();

  if (imported === 0) {
    const proj = getProject();
    if (otherPrefixes.size > 0 && !otherPrefixes.has(proj.code)) {
      const other = Object.values(PROJECTS).find(p => otherPrefixes.has(p.code));
      if (other) {
        showToast(`No scenarios matched — CSV looks like ${other.name}. Switch project and re-import.`);
        return;
      }
    }
    showToast(`No matching scenario IDs found (${skipped} skipped)`);
  } else {
    let msg = `Imported ${imported} scenario${imported !== 1 ? 's' : ''}`;
    if (skipped) msg += ` · ${skipped} unknown ID${skipped !== 1 ? 's' : ''} skipped`;
    showToast(msg);
  }
}

function exportCsv() {
  const project = getProject();
  const scenarios = getScenarios();
  const displayed = applyAllFilters(scenarios);

  if (displayed.length === 0) {
    showToast('No scenarios to export with current filters');
    return;
  }

  const rows = displayed.map(toRow);
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvCell(r[h])).join(','))
  ].join('\r\n');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `${project.code}_scenarios_${stamp}.csv`;
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  download(blob, filename);
  showToast(`Exported ${rows.length} scenarios as CSV`);
}

// ---------- Snapshot ----------

function saveSnapshot() {
  try {
    const snap = {
      version: 1,
      savedAt: new Date().toISOString(),
      projectId: state.projectId,
      statuses: state.statuses,
      notes: state.notes
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    showToast('Snapshot saved');
  } catch (e) {
    showToast('Save failed: ' + (e && e.message ? e.message : 'unknown error'));
  }
}

function loadSnapshot() {
  let raw;
  try { raw = localStorage.getItem(SNAPSHOT_KEY); }
  catch (e) { showToast('Load failed: storage unavailable'); return; }
  if (!raw) { showToast('No saved snapshot found'); return; }
  let snap;
  try { snap = JSON.parse(raw); }
  catch (e) { showToast('Snapshot is corrupted'); return; }

  if (snap.projectId && snap.projectId !== state.projectId && PROJECTS[snap.projectId]) {
    state.projectId = snap.projectId;
    state.scenariosCache = null;
    state.expandedNodes.clear();
  }
  state.statuses = snap.statuses || {};
  state.notes = snap.notes || {};
  render();
  const when = snap.savedAt ? new Date(snap.savedAt).toLocaleString() : 'unknown time';
  showToast(`Snapshot loaded (saved ${when})`);
}

function clearSnapshot() {
  try { localStorage.removeItem(SNAPSHOT_KEY); showToast('Snapshot cleared'); }
  catch (e) { showToast('Clear failed'); }
}

// ---------- Toast ----------

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('toast--show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('toast--show'), 2400);
}

// ---------- Events ----------

function toggleFilter(dim, value) {
  const arr = state.filters[dim];
  const i = arr.indexOf(value);
  if (i === -1) arr.push(value); else arr.splice(i, 1);
  state.showAll = false;
  render();
}

function setStatus(id, stage, value) {
  if (!state.statuses[id]) state.statuses[id] = {};
  if (value === null) {
    delete state.statuses[id][stage];
    if (!state.statuses[id].first && !state.statuses[id].second) delete state.statuses[id];
  } else {
    if (state.statuses[id][stage] === value) {
      delete state.statuses[id][stage];
      if (!state.statuses[id].first && !state.statuses[id].second) delete state.statuses[id];
    } else {
      state.statuses[id][stage] = value;
    }
  }
  render();
}

function resetFilters() {
  for (const k in state.filters) state.filters[k] = [];
  state.showAll = false;
  render();
}

function resetStatuses() {
  state.statuses = {};
  state.notes = {};
  render();
}

function switchProject(id) {
  if (!PROJECTS[id] || !PROJECTS[id].enabled) {
    state.projectId = id;
    state.scenariosCache = null;
    state.expandedNodes.clear();
    render();
    return;
  }
  state.projectId = id;
  state.scenariosCache = null;
  for (const k in state.filters) state.filters[k] = [];
  state.statuses = {};
  state.showAll = false;
  state.expandedNodes.clear();
  render();
}

function attachEvents() {
  document.getElementById('project-switcher').addEventListener('click', e => {
    const btn = e.target.closest('[data-proj]');
    if (!btn || btn.disabled) return;
    switchProject(btn.dataset.proj);
  });

  document.getElementById('filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter-dim]');
    if (!chip) return;
    toggleFilter(chip.dataset.filterDim, chip.dataset.filterValue);
  });

  document.getElementById('grid-wrap').addEventListener('click', e => {
    const showAllBtn = e.target.closest('#btn-show-all');
    if (showAllBtn) { state.showAll = true; render(); return; }

    const collapseAllBtn = e.target.closest('#btn-collapse-all');
    if (collapseAllBtn) { state.expandedNodes.clear(); render(); return; }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      e.stopPropagation();
      const { action, stage, id } = actionBtn.dataset;
      if (action === 'reset') setStatus(id, stage, null);
      else                    setStatus(id, stage, action);
      return;
    }

    const expandRow = e.target.closest('[data-expand]');
    if (expandRow) {
      const path = expandRow.dataset.expand;
      if (state.expandedNodes.has(path)) state.expandedNodes.delete(path);
      else                               state.expandedNodes.add(path);
      render();
    }
  });

  document.getElementById('summary').addEventListener('click', e => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    state.viewMode = btn.dataset.view;
    render();
  });

  document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);
  document.getElementById('btn-reset-statuses').addEventListener('click', resetStatuses);

  document.getElementById('quick-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    state.statusFilter = btn.dataset.status;
    state.showAll = false;
    render();
  });

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', e => {
    state.search = e.target.value;
    state.showAll = false;
    render();
  });

  document.getElementById('btn-export-csv').addEventListener('click', exportCsv);

  const importBtn = document.getElementById('btn-import-csv');
  const importInput = document.getElementById('import-input');
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { importCsvText(String(reader.result || '')); }
      catch (err) { showToast('Import failed: ' + (err && err.message ? err.message : 'parse error')); }
      e.target.value = '';
    };
    reader.onerror = () => { showToast('Failed to read file'); e.target.value = ''; };
    reader.readAsText(file);
  });

  document.getElementById('btn-save-snapshot').addEventListener('click', saveSnapshot);
  document.getElementById('btn-load-snapshot').addEventListener('click', loadSnapshot);
  document.getElementById('btn-clear-snapshot').addEventListener('click', clearSnapshot);

  // Notes input: capture typing without triggering re-render (preserves focus).
  document.getElementById('grid-wrap').addEventListener('input', e => {
    const note = e.target.closest('[data-note-id]');
    if (!note) return;
    const id = note.dataset.noteId;
    const value = note.value;
    if (value) state.notes[id] = value;
    else       delete state.notes[id];
  });
}

// ---------- Wise calculator ----------

let wiseInitialized = false;

function fillSelect(el, values, defaultValue) {
  el.innerHTML = values.map(v =>
    `<option value="${v}"${v === defaultValue ? ' selected' : ''}>${v}</option>`
  ).join('');
}

function initWiseForm() {
  if (wiseInitialized) return;
  fillSelect(document.getElementById('wise-source-currency'), WISE_CURRENCIES, 'USD');
  fillSelect(document.getElementById('wise-target-currency'), WISE_CURRENCIES, 'MXN');
  fillSelect(document.getElementById('wise-payin'),           WISE_PAYIN_OPTIONS,  'BANK_TRANSFER');
  fillSelect(document.getElementById('wise-payout'),          WISE_PAYOUT_OPTIONS, 'BANK_TRANSFER');
  wiseInitialized = true;
}

function openWise() {
  initWiseForm();
  const modal = document.getElementById('wise-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('no-scroll');
}

function closeWise() {
  const modal = document.getElementById('wise-modal');
  if (!modal) return;
  modal.hidden = true;
  if (document.getElementById('help-modal').hidden) {
    document.body.classList.remove('no-scroll');
  }
}

function formatNumber(n, decimals) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals != null ? decimals : 2, maximumFractionDigits: decimals != null ? decimals : 4 });
}

function renderWiseResult(quote, request) {
  const fee   = quote.fee != null ? formatNumber(quote.fee) : '—';
  const rate  = quote.rate != null ? formatNumber(quote.rate, 6) : '—';
  const src   = quote.sourceAmount != null ? formatNumber(quote.sourceAmount)
              : (request.sourceAmount != null ? formatNumber(request.sourceAmount) : '—');
  const tgt   = quote.targetAmount != null ? formatNumber(quote.targetAmount)
              : (request.targetAmount != null ? formatNumber(request.targetAmount) : '—');
  const eta   = quote.estimatedDelivery || quote.deliveryEstimate || '';

  return `
    <div class="wise-result__card wise-result__card--ok">
      <h3 class="wise-result__title">Quote</h3>
      <dl class="wise-result__grid">
        <dt>You send</dt>            <dd>${src} <strong>${escapeHtml(request.sourceCurrency)}</strong></dd>
        <dt>Recipient gets</dt>      <dd>${tgt} <strong>${escapeHtml(request.targetCurrency)}</strong></dd>
        <dt>Wise fee</dt>            <dd class="wise-result__fee">${fee} <strong>${escapeHtml(request.sourceCurrency)}</strong></dd>
        <dt>Exchange rate</dt>       <dd>${rate}</dd>
        ${eta ? `<dt>Estimated delivery</dt><dd>${escapeHtml(String(eta))}</dd>` : ''}
        <dt>Pay in / Pay out</dt>    <dd>${escapeHtml(request.preferredPayIn)} → ${escapeHtml(request.payOut)}</dd>
      </dl>
      <details class="wise-result__raw">
        <summary>Raw API response</summary>
        <pre>${escapeHtml(JSON.stringify(quote, null, 2))}</pre>
      </details>
    </div>
  `;
}

function renderWiseError(message, raw) {
  return `
    <div class="wise-result__card wise-result__card--err">
      <h3 class="wise-result__title">Request failed</h3>
      <p>${escapeHtml(message)}</p>
      ${raw ? `<details class="wise-result__raw"><summary>Details</summary><pre>${escapeHtml(raw)}</pre></details>` : ''}
    </div>
  `;
}

async function calculateWise(e) {
  if (e && e.preventDefault) e.preventDefault();

  const sourceCurrency = document.getElementById('wise-source-currency').value;
  const targetCurrency = document.getElementById('wise-target-currency').value;
  const sourceRaw      = document.getElementById('wise-source-amount').value;
  const targetRaw      = document.getElementById('wise-target-amount').value;
  const sourceAmount   = parseFloat(sourceRaw);
  const targetAmount   = parseFloat(targetRaw);
  const payOut         = document.getElementById('wise-payout').value;
  const preferredPayIn = document.getElementById('wise-payin').value;

  const resultEl = document.getElementById('wise-result');

  const hasSource = sourceRaw !== '' && isFinite(sourceAmount) && sourceAmount > 0;
  const hasTarget = targetRaw !== '' && isFinite(targetAmount) && targetAmount > 0;

  if (!sourceCurrency || !targetCurrency) {
    resultEl.innerHTML = renderWiseError('Pick both source and target currencies.');
    return;
  }
  if (!hasSource && !hasTarget) {
    resultEl.innerHTML = renderWiseError('Enter either a source or target amount.');
    return;
  }
  if (hasSource && hasTarget) {
    resultEl.innerHTML = renderWiseError('Enter only one — source or target amount. Leave the other blank.');
    return;
  }
  if (sourceCurrency === targetCurrency) {
    resultEl.innerHTML = renderWiseError('Source and target currencies are the same — Wise quotes need a conversion.');
    return;
  }

  const body = {
    sourceCurrency,
    targetCurrency,
    sourceAmount: hasSource ? sourceAmount : null,
    targetAmount: hasTarget ? targetAmount : null,
    payOut,
    preferredPayIn
  };

  const btn = document.getElementById('btn-wise-calc');
  btn.disabled = true;
  btn.textContent = 'Calculating…';
  resultEl.innerHTML = `<div class="wise-result__loading">Calling Wise API…</div>`;

  try {
    const res = await fetch(WISE_API.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-App-Url': WISE_API.tenantAppUrl
      },
      body: JSON.stringify(body)
    });

    const rawText = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch (_) { /* not JSON */ }

    if (!res.ok) {
      const msg = (parsed && (parsed.message || parsed.error)) || `HTTP ${res.status} ${res.statusText}`;
      resultEl.innerHTML = renderWiseError(msg, rawText);
      return;
    }

    if (!parsed) {
      resultEl.innerHTML = renderWiseError('API responded but the body was not JSON.', rawText);
      return;
    }

    resultEl.innerHTML = renderWiseResult(parsed, body);
  } catch (err) {
    const detail = err && err.message ? ` (${err.message})` : '';
    const msg = `Couldn't reach the Wise API${detail}. Share the URL where this dashboard is deployed with the developer team so they can allow it to access the API.`;
    resultEl.innerHTML = renderWiseError(msg);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Calculate quote';
  }
}

function attachWiseEvents() {
  const btn = document.getElementById('btn-wise');
  if (btn) btn.addEventListener('click', openWise);

  const modal = document.getElementById('wise-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.closest('[data-close-modal]')) closeWise();
    });
  }

  const form = document.getElementById('wise-form');
  if (form) form.addEventListener('submit', calculateWise);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && !modal.hidden) closeWise();
  });
}

function openHelp() {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add('no-scroll');
}

function closeHelp() {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
}

function attachHelpEvents() {
  const helpBtn = document.getElementById('btn-help');
  if (helpBtn) helpBtn.addEventListener('click', openHelp);

  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target.closest('[data-close-modal]')) closeHelp();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && !modal.hidden) closeHelp();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  attachHelpEvents();
  attachWiseEvents();
  render();
});
