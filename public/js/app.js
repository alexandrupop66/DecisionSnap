import { demoCriteria, demoDecision, demoOptions } from './demo-data.js';
import { calculateRanking, explainRanking, isNearTie, rebalanceWeights } from './scoring.js';
import { removeCriterionFromState, rescoreState } from './criteria.js';
import { addLabel, availableLabels, uniqueLabels } from './composer.js';

const state = {
  decision: demoDecision,
  criteria: structuredClone(demoCriteria),
  options: structuredClone(demoOptions),
  source: 'demo',
  previousWinnerId: null,
  changedCriterionId: null
};

const els = {
  decision: document.querySelector('#decision'),
  sourceLabel: document.querySelector('#source-label'),
  weights: document.querySelector('#weights'),
  ranking: document.querySelector('#ranking'),
  breakdown: document.querySelector('#breakdown'),
  explanation: document.querySelector('#explanation'),
  totalWeight: document.querySelector('#total-weight'),
  reset: document.querySelector('#reset-demo'),
  nudge: document.querySelector('#price-nudge'),
  winnerCard: document.querySelector('#winner-card'),
  analyseForm: document.querySelector('#analyse-form'),
  analyseButton: document.querySelector('#analyse-button'),
  decisionInput: document.querySelector('#decision-input'),
  criteriaInputs: document.querySelector('#criteria-inputs'),
  optionsInputs: document.querySelector('#options-inputs'),
  addFormCriterion: document.querySelector('#add-form-criterion'),
  addFormOption: document.querySelector('#add-form-option'),
  criterionPicker: document.querySelector('#criterion-picker'),
  optionPicker: document.querySelector('#option-picker'),
  addCustomCriterion: document.querySelector('#add-custom-criterion'),
  addCustomOption: document.querySelector('#add-custom-option'),
  analyseStatus: document.querySelector('#analyse-status'),
  useDemo: document.querySelector('#use-demo'),
  aiConfigStatus: document.querySelector('#ai-config-status')
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function scoreLabel(value) {
  return Number(value).toFixed(1).replace('.0', '');
}

function setStatus(message = '', kind = '') {
  els.analyseStatus.textContent = message;
  els.analyseStatus.className = `analyse-status ${kind}`.trim();
}

async function refreshAIStatus() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const status = await response.json();
    if (status.aiConfigured) {
      els.aiConfigStatus.textContent = `AI ready · ${status.model}`;
      els.aiConfigStatus.className = 'ai-config-pill ready';
      els.aiConfigStatus.title = status.envSource ? `Key loaded from ${status.envSource}` : 'Key loaded from environment';
    } else {
      els.aiConfigStatus.textContent = 'AI setup needed';
      els.aiConfigStatus.className = 'ai-config-pill missing';
      els.aiConfigStatus.title = status.warning || 'Run 1_SETUP_GEMINI_KEY.bat, then restart the app.';
    }
  } catch {
    els.aiConfigStatus.textContent = 'AI status unavailable';
    els.aiConfigStatus.className = 'ai-config-pill missing';
  }
}

const composer = {
  criteria: [],
  options: [],
  criteriaCatalog: uniqueLabels(demoCriteria.map((criterion) => criterion.name)),
  optionsCatalog: uniqueLabels(demoOptions.map((option) => option.name))
};

function renderComposerList(container, values, { kind } = {}) {
  if (!values.length) {
    container.innerHTML = `<div class="empty-list-hint">${kind === 'criterion' ? 'No criteria added — AI will suggest them.' : 'No options added yet.'}</div>`;
    return;
  }

  container.innerHTML = values.map((value, index) => `
    <div class="composer-list-item">
      <span class="composer-list-index">${index + 1}</span>
      <span class="composer-list-label">${escapeHtml(value)}</span>
      <button class="icon-remove" type="button" data-remove-${kind}="${index}" aria-label="Remove ${escapeHtml(value)}">×</button>
    </div>
  `).join('');

  container.querySelectorAll(`[data-remove-${kind}]`).forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset[`remove${kind[0].toUpperCase()}${kind.slice(1)}`]);
      const key = kind === 'criterion' ? 'criteria' : 'options';
      composer[key].splice(index, 1);
      renderComposer();
    });
  });
}

function renderPicker(select, available, placeholder) {
  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...available.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`)
  ].join('');
}

function syncComposerButtons() {
  const criterionAvailable = availableLabels(composer.criteriaCatalog, composer.criteria);
  const optionAvailable = availableLabels(composer.optionsCatalog, composer.options);
  const criteriaAtMax = composer.criteria.length >= 6;
  const optionsAtMax = composer.options.length >= 3;

  renderPicker(
    els.criterionPicker,
    criterionAvailable,
    criteriaAtMax ? 'Maximum 6 criteria' : criterionAvailable.length ? 'Choose a criterion…' : 'No saved criteria available'
  );
  renderPicker(
    els.optionPicker,
    optionAvailable,
    optionsAtMax ? 'Maximum 3 options' : optionAvailable.length ? 'Choose an option…' : 'No saved options available'
  );

  els.addFormCriterion.disabled = true;
  els.addFormOption.disabled = true;
  els.criterionPicker.disabled = criteriaAtMax || !criterionAvailable.length;
  els.optionPicker.disabled = optionsAtMax || !optionAvailable.length;
  els.addCustomCriterion.disabled = criteriaAtMax;
  els.addCustomOption.disabled = optionsAtMax;
}

function renderComposer() {
  renderComposerList(els.criteriaInputs, composer.criteria, { kind: 'criterion' });
  renderComposerList(els.optionsInputs, composer.options, { kind: 'option' });
  syncComposerButtons();
}

function addComposerSelection(kind) {
  const isCriterion = kind === 'criterion';
  const key = isCriterion ? 'criteria' : 'options';
  const picker = isCriterion ? els.criterionPicker : els.optionPicker;
  const max = isCriterion ? 6 : 3;
  const result = addLabel(composer[key], picker.value, max);

  if (!result.added) return;
  composer[key] = result.values;
  setStatus('', '');
  renderComposer();
}

function addCustomComposerItem(kind) {
  const isCriterion = kind === 'criterion';
  const key = isCriterion ? 'criteria' : 'options';
  const catalogKey = isCriterion ? 'criteriaCatalog' : 'optionsCatalog';
  const max = isCriterion ? 6 : 3;
  const label = window.prompt(`Add a different ${kind}`)?.trim();
  if (!label) return;

  const result = addLabel(composer[key], label, max);
  if (!result.added) {
    if (result.reason === 'duplicate') setStatus(`That ${kind} is already in the list.`, 'error');
    return;
  }

  composer[key] = result.values;
  composer[catalogKey] = uniqueLabels([...composer[catalogKey], label]);
  setStatus('', '');
  renderComposer();
}

function fillComposer(criteria, options) {
  const cleanCriteria = uniqueLabels(criteria).slice(0, 6);
  const cleanOptions = uniqueLabels(options).slice(0, 3);
  composer.criteriaCatalog = uniqueLabels([...composer.criteriaCatalog, ...cleanCriteria]);
  composer.optionsCatalog = uniqueLabels([...composer.optionsCatalog, ...cleanOptions]);
  composer.criteria = cleanCriteria;
  composer.options = cleanOptions;
  renderComposer();
}

function currentOptionNames() {
  return state.options.map((option) => option.name);
}

function loadDemo({ fillForm = false } = {}) {
  state.decision = demoDecision;
  state.criteria = structuredClone(demoCriteria);
  state.options = structuredClone(demoOptions);
  state.source = 'demo';
  state.previousWinnerId = null;
  state.changedCriterionId = null;

  if (fillForm) {
    els.decisionInput.value = demoDecision;
    fillComposer(demoCriteria.map((criterion) => criterion.name), demoOptions.map((option) => option.name));
  }

  setStatus('Demo data loaded. No AI call was used.', 'success');
  render();
}

function renderWeights() {
  els.weights.innerHTML = state.criteria.map((criterion) => `
    <div class="weight-row" data-id="${escapeHtml(criterion.id)}">
      <div class="weight-label">
        <div class="criterion-title">
          <span>${escapeHtml(criterion.name)}</span>
          <span class="criterion-actions">
            <button class="text-button" type="button" data-action="rename" aria-label="Rename ${escapeHtml(criterion.name)}">Rename</button>
            <button class="text-button danger" type="button" data-action="remove" aria-label="Remove ${escapeHtml(criterion.name)}">Remove</button>
          </span>
        </div>
        <strong>${criterion.weight}%</strong>
      </div>
      <input id="weight-${escapeHtml(criterion.id)}" type="range" min="0" max="100" step="1" value="${criterion.weight}" aria-label="${escapeHtml(criterion.name)} weight">
    </div>
  `).join('') + `
    <button id="add-criterion" class="add-criterion" type="button" ${state.criteria.length >= 6 ? 'disabled' : ''}>+ Add criterion</button>
  `;

  els.weights.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const id = event.currentTarget.closest('.weight-row').dataset.id;
      const rankingBefore = calculateRanking(state.options, state.criteria);
      state.previousWinnerId = rankingBefore[0]?.id || null;
      state.changedCriterionId = id;
      state.criteria = rebalanceWeights(state.criteria, id, Number(event.currentTarget.value));
      render();
    });
  });

  els.weights.querySelectorAll('[data-action="rename"]').forEach((button) => {
    button.addEventListener('click', () => renameCriterion(button.closest('.weight-row').dataset.id));
  });
  els.weights.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', () => removeCriterion(button.closest('.weight-row').dataset.id));
  });
  els.weights.querySelector('#add-criterion')?.addEventListener('click', addCriterion);
}

function renderRanking(ranking) {
  els.ranking.innerHTML = ranking.map((option, index) => `
    <article class="rank-card ${index === 0 ? 'winner' : ''}">
      <div class="rank-position">${index + 1}</div>
      <div>
        <h3>${escapeHtml(option.name)}</h3>
        <p>${index === 0 ? 'Current leader' : 'Weighted score'}</p>
      </div>
      <div class="rank-score">${scoreLabel(option.total)}</div>
    </article>
  `).join('');
}

function renderBreakdown(ranking) {
  els.breakdown.innerHTML = ranking.map((option) => `
    <details ${option.id === ranking[0]?.id ? 'open' : ''}>
      <summary><span>${escapeHtml(option.name)}</span><strong>${scoreLabel(option.total)}</strong></summary>
      <div class="breakdown-grid">
        ${option.contributions.map((item) => `
          <div class="breakdown-item">
            <span>${escapeHtml(item.criterionName)}</span>
            <span class="muted">${item.score}/100 × ${item.weight}%</span>
            <strong>+${scoreLabel(item.contribution)}</strong>
          </div>
        `).join('')}
      </div>
    </details>
  `).join('');
}

function render() {
  els.decision.textContent = state.decision;
  els.sourceLabel.textContent = state.source === 'ai' ? 'AI-structured decision' : 'Demo decision';
  const ranking = calculateRanking(state.options, state.criteria);
  const total = state.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  els.totalWeight.textContent = `${total}%`;
  renderWeights();
  renderRanking(ranking);
  renderBreakdown(ranking);

  const explanation = explainRanking(ranking, state.criteria, state.changedCriterionId, state.previousWinnerId);
  els.explanation.textContent = isNearTie(ranking)
    ? `${explanation} The top two options are very close, so small priority changes may reverse them.`
    : explanation;

  const hasPrice = state.criteria.some((criterion) => criterion.id === 'price' || criterion.name.toLowerCase() === 'price');
  els.nudge.hidden = state.source !== 'demo' || !hasPrice;

  const changedWinner = Boolean(state.previousWinnerId && ranking[0]?.id !== state.previousWinnerId);
  els.winnerCard.classList.toggle('winner-changed', changedWinner);
  if (changedWinner) window.setTimeout(() => els.winnerCard.classList.remove('winner-changed'), 700);
}

async function requestAnalysis({ criteria } = {}) {
  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: state.decision,
      options: currentOptionNames(),
      ...(criteria ? { criteria } : {})
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Live AI analysis failed.');
  return payload;
}

async function rescoreCriteria(nextNames, successMessage) {
  setStatus('AI is rescoring the edited criteria…', 'loading');
  const currentState = structuredClone(state);
  const outcome = await rescoreState(currentState, nextNames, (criteria) => requestAnalysis({ criteria }));
  if (outcome.ok) {
    Object.assign(state, outcome.state);
    setStatus(successMessage, 'success');
    render();
    return true;
  }
  Object.assign(state, outcome.state);
  setStatus(`${outcome.error.message} Your last valid scores were kept.`, 'error');
  render();
  return false;
}

async function renameCriterion(id) {
  const index = state.criteria.findIndex((criterion) => criterion.id === id);
  if (index < 0) return;
  const current = state.criteria[index].name;
  const next = window.prompt('Rename criterion', current)?.trim();
  if (!next || next === current) return;
  if (state.criteria.some((criterion, i) => i !== index && criterion.name.toLowerCase() === next.toLowerCase())) {
    setStatus('Criterion names must be unique.', 'error');
    return;
  }
  const names = state.criteria.map((criterion, i) => i === index ? next : criterion.name);
  await rescoreCriteria(names, `Renamed “${current}” to “${next}” and refreshed AI scores.`);
}

function removeCriterion(id) {
  const removed = state.criteria.find((criterion) => criterion.id === id);
  try {
    Object.assign(state, removeCriterionFromState(state, id));
    setStatus(`Removed “${removed?.name || 'criterion'}”. Existing scores for the remaining criteria were preserved.`, 'success');
    render();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function addCriterion() {
  if (state.criteria.length >= 6) {
    setStatus('DecisionSnap keeps the proof of concept to six criteria maximum.', 'error');
    return;
  }
  const next = window.prompt('Add a criterion')?.trim();
  if (!next) return;
  if (state.criteria.some((criterion) => criterion.name.toLowerCase() === next.toLowerCase())) {
    setStatus('That criterion already exists.', 'error');
    return;
  }
  const names = [...state.criteria.map((criterion) => criterion.name), next];
  await rescoreCriteria(names, `Added “${next}” and refreshed AI scores.`);
}

async function analyseWithAI(event) {
  event.preventDefault();
  const decision = els.decisionInput.value.trim();
  const options = [...composer.options];
  const criteria = [...composer.criteria];

  if (!decision || options.length < 2) {
    setStatus('Add a decision and at least two options.', 'error');
    return;
  }
  if (criteria.length === 1) {
    setStatus('Add a second criterion, or remove the criterion so AI can suggest a complete set.', 'error');
    return;
  }

  els.analyseButton.disabled = true;
  els.analyseButton.textContent = 'Analysing…';
  setStatus('AI is structuring criteria and scores…', 'loading');

  try {
    const response = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, options, ...(criteria.length ? { criteria } : {}) })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Live AI analysis failed.');

    state.decision = payload.decision;
    state.criteria = payload.criteria;
    state.options = payload.options;
    state.source = 'ai';
    state.previousWinnerId = null;
    state.changedCriterionId = null;
    const modelNote = payload.model ? ` using ${payload.model}` : '';
    setStatus(`AI scored ${payload.criteria.length} visible criteria${modelNote}. The ranking below is calculated locally.`, 'success');
    render();
  } catch (error) {
    setStatus(`${error.message} Use demo data to keep the full transparent flow available.`, 'error');
  } finally {
    els.analyseButton.disabled = false;
    els.analyseButton.textContent = 'Analyse with AI';
  }
}

els.analyseForm.addEventListener('submit', analyseWithAI);
els.useDemo.addEventListener('click', () => loadDemo({ fillForm: true }));
els.reset.addEventListener('click', () => loadDemo({ fillForm: true }));
els.addFormCriterion.addEventListener('click', () => addComposerSelection('criterion'));
els.addFormOption.addEventListener('click', () => addComposerSelection('option'));
els.addCustomCriterion.addEventListener('click', () => addCustomComposerItem('criterion'));
els.addCustomOption.addEventListener('click', () => addCustomComposerItem('option'));
els.criterionPicker.addEventListener('change', () => {
  els.addFormCriterion.disabled = !els.criterionPicker.value;
});
els.optionPicker.addEventListener('change', () => {
  els.addFormOption.disabled = !els.optionPicker.value;
});

els.nudge.addEventListener('click', () => {
  const price = state.criteria.find((criterion) => criterion.id === 'price' || criterion.name.toLowerCase() === 'price');
  if (!price) return;
  const rankingBefore = calculateRanking(state.options, state.criteria);
  state.previousWinnerId = rankingBefore[0]?.id || null;
  state.changedCriterionId = price.id;
  state.criteria = rebalanceWeights(state.criteria, price.id, 60);
  render();
});

fillComposer(demoCriteria.map((criterion) => criterion.name), demoOptions.map((option) => option.name));
els.decisionInput.value = demoDecision;
render();
refreshAIStatus();
