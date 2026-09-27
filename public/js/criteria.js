import { normaliseWeights } from './scoring.js';

export function preserveWeights(newCriteria, oldCriteria) {
  return normaliseWeights(newCriteria.map((criterion, index) => ({
    ...criterion,
    weight: oldCriteria[index]?.weight ?? 10
  })));
}

export function removeCriterionFromState(currentState, id) {
  if (currentState.criteria.length <= 2) {
    throw new Error('Keep at least two criteria so the comparison still shows a trade-off.');
  }
  const criteria = normaliseWeights(currentState.criteria.filter((criterion) => criterion.id !== id));
  const options = currentState.options.map((option) => {
    const scores = { ...option.scores };
    delete scores[id];
    return { ...option, scores };
  });
  return {
    ...currentState,
    criteria,
    options,
    previousWinnerId: null,
    changedCriterionId: null
  };
}

export async function rescoreState(currentState, nextNames, requestFn) {
  try {
    const payload = await requestFn(nextNames);
    return {
      ok: true,
      state: {
        ...currentState,
        criteria: preserveWeights(payload.criteria, currentState.criteria),
        options: payload.options,
        source: 'ai',
        previousWinnerId: null,
        changedCriterionId: null
      }
    };
  } catch (error) {
    return { ok: false, state: currentState, error };
  }
}
