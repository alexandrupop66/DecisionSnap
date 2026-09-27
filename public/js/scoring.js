export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normaliseWeights(criteria) {
  if (!criteria.length) return [];
  const positive = criteria.map((criterion) => Math.max(0, Number(criterion.weight) || 0));
  const total = positive.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) {
    const base = Math.floor(100 / criteria.length);
    let remainder = 100 - base * criteria.length;
    return criteria.map((criterion) => ({
      ...criterion,
      weight: base + (remainder-- > 0 ? 1 : 0)
    }));
  }

  const raw = positive.map((weight) => (weight / total) * 100);
  const floors = raw.map(Math.floor);
  let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let i = 0; i < remainder; i += 1) floors[order[i].index] += 1;
  return criteria.map((criterion, index) => ({ ...criterion, weight: floors[index] }));
}

export function rebalanceWeights(criteria, changedId, requestedWeight) {
  if (!criteria.length) return [];
  const next = criteria.map((criterion) => ({ ...criterion }));
  const changedIndex = next.findIndex((criterion) => criterion.id === changedId);
  if (changedIndex < 0) return normaliseWeights(next);

  const changedWeight = Math.round(clamp(Number(requestedWeight) || 0, 0, 100));
  next[changedIndex].weight = changedWeight;

  const otherIndexes = next.map((_, index) => index).filter((index) => index !== changedIndex);
  if (!otherIndexes.length) {
    next[changedIndex].weight = 100;
    return next;
  }

  const remaining = 100 - changedWeight;
  const oldOtherTotal = otherIndexes.reduce((sum, index) => sum + Math.max(0, Number(criteria[index].weight) || 0), 0);

  const raw = otherIndexes.map((index) => {
    const oldWeight = Math.max(0, Number(criteria[index].weight) || 0);
    return oldOtherTotal > 0 ? (oldWeight / oldOtherTotal) * remaining : remaining / otherIndexes.length;
  });
  const floors = raw.map(Math.floor);
  let remainder = remaining - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, position) => ({ position, fraction: value - floors[position] }))
    .sort((a, b) => b.fraction - a.fraction || a.position - b.position);
  for (let i = 0; i < remainder; i += 1) floors[order[i].position] += 1;
  otherIndexes.forEach((index, position) => { next[index].weight = floors[position]; });
  return next;
}

export function calculateRanking(options, criteria) {
  const results = options.map((option) => {
    const contributions = criteria.map((criterion) => {
      const score = clamp(Number(option.scores?.[criterion.id]) || 0, 0, 100);
      const contribution = score * criterion.weight / 100;
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        weight: criterion.weight,
        score,
        contribution
      };
    });
    const total = contributions.reduce((sum, item) => sum + item.contribution, 0);
    return { ...option, total, contributions };
  });

  return results.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function explainRanking(ranking, criteria, changedCriterionId = null, previousWinnerId = null) {
  if (!ranking.length) return 'Add options to calculate a ranking.';
  const winner = ranking[0];
  const changed = criteria.find((criterion) => criterion.id === changedCriterionId);

  if (changed && previousWinnerId && previousWinnerId !== winner.id) {
    return `${winner.name} now ranks first because ${changed.name.toLowerCase()} became a stronger priority.`;
  }

  const strongest = [...winner.contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((item) => item.criterionName.toLowerCase());

  if (strongest.length === 1) return `${winner.name} ranks first mainly because of ${strongest[0]}.`;
  return `${winner.name} ranks first because it performs strongly on ${strongest[0]} and ${strongest[1]} under your current priorities.`;
}

export function isNearTie(ranking, threshold = 0.5) {
  return ranking.length > 1 && Math.abs(ranking[0].total - ranking[1].total) <= threshold;
}
