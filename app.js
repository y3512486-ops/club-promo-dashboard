(function () {
  const D = window.DASHBOARD_DATA;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const NEED = { group: 1, leader: 1, member: 5 };
  const SHORT = { group: '群转发', leader: '社长', member: '成员' };
  const PHASE_NAME = Object.fromEntries(D.phases.map((p) => [p.key, p.name]));

  const CRIT = [
    { k: 'g1', name: '第 1 期群转发', rule: '四要素齐全 · 第 1 周' },
    { k: 'g2', name: '第 2 期群转发', rule: '≥1 张' },
    { k: 'leader', name: '社长朋友圈', rule: '两期合计 ≥1 张 · 带日期' },
    { k: 'member', name: '成员朋友圈', rule: '两期合计 ≥5 人 · 不重复' },
  ];
  const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
  // 手动修改存在浏览器 localStorage：{ 社团id: { g1: bool, ..., verdict: bool } }，只存与默认不同的项
  const STORE = 'club-incentive-edits-v1';
  let edits = {};
  try { edits = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { edits = {}; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(edits)); } catch (e) { /* 无痕模式等无法保存时只在本次会话生效 */ } };
  const itemOk = (c, k) => (edits[c.id] && k in edits[c.id] ? edits[c.id][k] : c.incentive[k].ok);
  const computed = (c) => CRIT.every((cr) => itemOk(c, cr.k));
  const passed = (c) => (edits[c.id] && 'verdict' in edits[c.id] ? edits[c.id].verdict : computed(c));
  const editCount = () => Object.values(edits).reduce((n, e) => n + Object.keys(e).length, 0);
  function setEdit(c, k, val, dflt) {
    const e = edits[c.id] || (edits[c.id] = {});
    if (val === dflt) delete e[k]; else e[k] = val;
    if (!Object.keys(e).length) delete edits[c.id];
    save();
  }

  const state = { view: 'overview', club: null, phase: null, q: '', inc: 'all' };

  const imgs = (club, phase, cat) => (club.phases[phase] || []).flatMap((s) => s.images[cat]);
  const total = (club, phase) => D.categories.reduce((n, c) => n + imgs(club, phase, c.key).length, 0);

  function badge(club, phase, cat) {
    if (!club.phases[phase]) return '<span class="cnt na">—</span>';
    const n = imgs(club, phase, cat).length;
    const cls = n >= NEED[cat] ? 'ok' : n === 0 ? 'bad' : 'warn';
    return `<span class="cnt ${cls}">${n}</span>`;
  }

  // ---------- 路由：#/club/<id>/<phase> ----------
  function readHash() {
    const [, view, id, phase] = location.hash.split('/');
    if (view === 'club' && D.clubs.some((c) => c.id === id)) {
      Object.assign(state, { view: 'club', club: id, phase: phase || null });
    } else if (view === 'incentive') {
      Object.assign(state, { view: 'incentive', club: null, phase: null });
    } else {
      Object.assign(state, { view: 'overview', club: null, phase: null });
    }
  }
  const go = (id, phase) => { location.hash = id ? `#/club/${id}${phase ? '/' + phase : ''}` : '#/'; };

  // ---------- 侧栏 ----------
  function renderList() {
    const q = state.q.trim().toLowerCase();
    const list = D.clubs.filter((c) => !q || (c.name + c.school).toLowerCase().includes(q));
    const items = list.map((c) => `
      <li data-id="${c.id}" class="${state.club === c.id ? 'on' : ''}">
        <div class="txt">
          <div class="name">${esc(c.name)}</div>
          <div class="school">${esc(c.school)}</div>
        </div>
        <span class="ph">${D.phases.map((p) => `<i class="${c.phases[p.key] ? 'has' : ''}" title="${p.name}"></i>`).join('')}</span>
      </li>`).join('');
    $('#clubList').innerHTML =
      `<li data-id="" class="home ${state.view === 'overview' ? 'on' : ''}"><div class="txt"><div class="name">总览</div></div></li>
       <li data-view="incentive" class="home ${state.view === 'incentive' ? 'on' : ''}"><div class="txt"><div class="name">激励达成</div></div>
         <span class="nav-cnt">${D.clubs.filter(passed).length}/${D.clubs.length}</span></li>
       <li class="sep"></li>` + (items || '<li class="none">无匹配</li>');
  }

  // ---------- 总览 ----------
  function renderOverview() {
    const pic = D.clubs.reduce((s, c) => s + D.phases.reduce((t, p) => t + total(c, p.key), 0), 0);
    const stat = (num, lbl) => `<div class="stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;

    const gap = '<th class="gap"></th>';
    const head1 = D.phases.map((p) => `<th colspan="3" class="grp">${p.name}</th>`).join(gap);
    const head2 = D.phases.map(() => D.categories.map((c) => `<th>${SHORT[c.key]}</th>`).join('')).join(gap);
    const rows = D.clubs.map((c) => `
      <tr class="row" data-id="${c.id}">
        <td><div class="name">${esc(c.name)}</div><div class="school">${esc(c.school)}</div>${c.note ? `<div class="club-note">${esc(c.note)}</div>` : ''}</td>
        ${D.phases.map((p) => D.categories.map((k) => `<td>${badge(c, p.key, k.key)}</td>`).join('')).join('<td class="gap"></td>')}
      </tr>`).join('');

    const done = D.clubs.filter(passed).length;
    $('#main').innerHTML = `
      <a class="inc-banner" href="#/incentive">
        <div><div class="num">${done}<span>/ ${D.clubs.length}</span></div><div class="lbl">社团达成激励条件</div></div>
        <span class="go">查看激励达成${ARROW}</span>
      </a>
      <div class="stats">
        ${stat(D.clubs.length, '合作社团')}
        ${D.phases.map((p) => stat(D.clubs.filter((c) => c.phases[p.key]).length, `${p.name}提交`)).join('')}
        ${stat(pic, '凭证截图')}
      </div>
      <div class="card flush">
        <div class="card-head"><h3>各社团凭证数</h3></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th rowspan="2">社团</th>${head1}</tr><tr>${head2}</tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  // ---------- 激励达成 ----------
  function renderIncentive() {
    const done = D.clubs.filter(passed);
    const list = D.clubs.filter((c) => state.inc === 'all' || (state.inc === 'ok') === passed(c));
    const cell = (c, k) => {
      const ok = itemOk(c, k);
      return `<td><button class="chk ${ok ? 'ok' : 'no'}" data-club="${c.id}" data-k="${k}" title="点击切换">${ok ? CHECK : CROSS}</button></td>`;
    };
    const rows = list.map((c) => {
      const ok = passed(c);
      return `<tr class="row" data-id="${c.id}">
        <td><div class="name">${esc(c.name)}</div><div class="school">${esc(c.school)}</div>${c.note ? `<div class="club-note">${esc(c.note)}</div>` : ''}</td>
        ${CRIT.map((cr) => cell(c, cr.k)).join('')}
        <td><button class="verdict ${ok ? 'ok' : 'no'}" data-club="${c.id}" title="点击切换">${ok ? '达成' : '未达成'}</button></td>
      </tr>`;
    }).join('');
    const n = editCount();
    const reset = n ? `<button class="reset" data-reset>已手动修改 ${n} 项 · 恢复默认</button>` : '';
    const tab = (k, label, n) => `<button data-inc="${k}" class="${state.inc === k ? 'on' : ''}">${label} ${n}</button>`;

    $('#main').innerHTML = `
      <div class="stats inc-stats">
        <div class="stat big ok"><div class="num">${done.length}</div><div class="lbl">达成</div></div>
        <div class="stat big no"><div class="num">${D.clubs.length - done.length}</div><div class="lbl">未达成</div></div>
      </div>
      <div class="card flush">
        <div class="card-head"><h3>激励条件核对</h3><span class="spacer"></span>${reset}
          <div class="seg">${tab('all', '全部', D.clubs.length)}${tab('ok', '达成', done.length)}${tab('no', '未达成', D.clubs.length - done.length)}</div>
        </div>
        <div class="tbl-wrap"><table class="inc">
          <thead><tr><th>社团</th>${CRIT.map((cr) => `<th><div class="crit">${cr.name}</div><div class="rule">${cr.rule}</div></th>`).join('')}<th>结果</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  // ---------- 社团详情 ----------
  let lb = [], lbIdx = 0;

  function renderClub() {
    const c = D.clubs.find((x) => x.id === state.club);
    if (!c.phases[state.phase]) state.phase = (D.phases.find((p) => c.phases[p.key]) || D.phases[0]).key;
    const subs = c.phases[state.phase] || [];

    const seg = D.phases.map((p) =>
      `<button data-phase="${p.key}" class="${p.key === state.phase ? 'on' : ''}" ${c.phases[p.key] ? '' : 'disabled'}>${p.name}</button>`).join('');

    lb = [];
    let body;
    if (!subs.length) {
      body = '<div class="card empty">本期未提交</div>';
    } else {
      const meta = subs.filter((s) => s.submitter || s.time).map((s) => `
        <div class="meta"><span>提交人<b>${esc(s.submitter)}</b></span><span>提交时间<b>${s.time}</b></span></div>
        ${s.summary ? `<div class="summary">${esc(s.summary)}</div>` : ''}`).join('');

      body = (meta ? `<div class="card">${meta}</div>` : '') + D.categories.map((k) => {
        const list = imgs(c, state.phase, k.key);
        const cells = list.map((im, i) => {
          lb.push({ src: im.src, caption: `${k.name} ${i + 1}/${list.length}${im.note ? ' · ' + im.note : ''}` });
          return `<figure class="thumb" data-lb="${lb.length - 1}">
              <img src="${im.src}" loading="lazy" alt="">
              <span class="idx">${i + 1}</span>
              ${im.note ? `<figcaption class="note">${esc(im.note)}</figcaption>` : ''}
            </figure>`;
        }).join('');
        return `<div class="card">
          <div class="card-head"><h3>${k.name}</h3>${badge(c, state.phase, k.key)}</div>
          ${list.length ? `<div class="grid">${cells}</div>` : '<div class="empty">无</div>'}
        </div>`;
      }).join('');
    }

    $('#main').innerHTML = `
      <div class="club-head">
        <div><h2>${esc(c.name)}</h2><div class="school">${esc(c.school)}</div>${c.note ? `<div class="club-note">${esc(c.note)}</div>` : ''}</div>
        <div class="seg">${seg}</div>
      </div>${body}`;
  }

  // ---------- 大图 ----------
  function openLb(i) {
    lbIdx = (i + lb.length) % lb.length;
    $('#lightbox img').src = lb[lbIdx].src;
    $('#lightbox figcaption').textContent = lb[lbIdx].caption;
    $('#lightbox').hidden = false;
  }
  const closeLb = () => { $('#lightbox').hidden = true; };

  // ---------- 渲染与事件 ----------
  function render() {
    readHash();
    renderList();
    if (state.view === 'club') renderClub();
    else if (state.view === 'incentive') renderIncentive();
    else renderOverview();
    document.title = state.view === 'club'
      ? `${D.clubs.find((c) => c.id === state.club).name} · ${PHASE_NAME[state.phase]}`
      : state.view === 'incentive' ? '激励达成 · 高校游戏社团宣传看板' : '高校游戏社团宣传看板';
  }

  $('#search').addEventListener('input', (e) => { state.q = e.target.value; renderList(); });
  $('#clubList').addEventListener('click', (e) => {
    if (e.target.closest('li[data-view="incentive"]')) { location.hash = '#/incentive'; return; }
    const li = e.target.closest('li[data-id]');
    if (li) go(li.dataset.id, li.dataset.id && state.view === 'club' ? state.phase : null);
  });
  $('#main').addEventListener('click', (e) => {
    const t = e.target.closest('button[data-inc]');
    if (t) { state.inc = t.dataset.inc; return renderIncentive(); }
    const chk = e.target.closest('button.chk');
    if (chk) {
      const c = D.clubs.find((x) => x.id === chk.dataset.club), k = chk.dataset.k;
      setEdit(c, k, !itemOk(c, k), c.incentive[k].ok);
      if (edits[c.id]) { delete edits[c.id].verdict; if (!Object.keys(edits[c.id]).length) delete edits[c.id]; save(); }  // 改了勾叉，结果重新跟随四项
      renderList(); return renderIncentive();
    }
    const v = e.target.closest('button.verdict');
    if (v) {
      const c = D.clubs.find((x) => x.id === v.dataset.club);
      setEdit(c, 'verdict', !passed(c), computed(c));
      renderList(); return renderIncentive();
    }
    if (e.target.closest('button[data-reset]')) {
      if (confirm('清除所有手动修改，恢复为核对结果？')) { edits = {}; save(); renderList(); renderIncentive(); }
      return;
    }
    const row = e.target.closest('tr.row');
    if (row) return go(row.dataset.id);
    const b = e.target.closest('.seg button');
    if (b && !b.disabled) return go(state.club, b.dataset.phase);
    const th = e.target.closest('.thumb');
    if (th) openLb(+th.dataset.lb);
  });
  $('.lb-close').addEventListener('click', closeLb);
  $('.lb-prev').addEventListener('click', () => openLb(lbIdx - 1));
  $('.lb-next').addEventListener('click', () => openLb(lbIdx + 1));
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLb(); });
  document.addEventListener('keydown', (e) => {
    if ($('#lightbox').hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') openLb(lbIdx - 1);
    if (e.key === 'ArrowRight') openLb(lbIdx + 1);
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
})();
