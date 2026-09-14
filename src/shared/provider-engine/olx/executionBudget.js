export const OLX_EXECUTION_BUDGET_DEFAULTS = Object.freeze({
  maxSearchPagesPerCategory: 2,
  maxSearchRequests: 22,
  maxDetailRequestsPerCategory: 4,
  maxDetailRequests: 32,
  timeBudgetMs: 105000
});

export function createOlxExecutionBudget(overrides = {}, now = Date.now()) {
  const limits = {
    ...OLX_EXECUTION_BUDGET_DEFAULTS,
    ...overrides
  };

  return {
    limits,
    startedAtMs: now,
    deadlineAtMs: now + limits.timeBudgetMs,
    searchRequests: 0,
    detailRequests: 0,
    categorySearchRequests: 0,
    categoryDetailRequests: 0,
    exhausted: false,
    exhaustionReason: null,
    exhaustionScope: null
  };
}

export function resetOlxCategoryBudget(budget) {
  if (!budget) return;

  budget.categorySearchRequests = 0;
  budget.categoryDetailRequests = 0;
  if (budget.exhaustionScope === "category") {
    budget.exhaustionReason = null;
    budget.exhaustionScope = null;
  }
}

function exhaust(budget, reason, scope) {
  budget.exhaustionReason = reason;
  budget.exhaustionScope = scope;
  if (scope === "global") budget.exhausted = true;

  return {
    allowed: false,
    budgetExhausted: true,
    reason,
    scope
  };
}

export function checkOlxBudget(budget, requestType, now = Date.now()) {
  if (!budget) return { allowed: true, budgetExhausted: false };

  if (now >= budget.deadlineAtMs) {
    return exhaust(budget, "deadline", "global");
  }

  if (requestType === "search") {
    if (budget.searchRequests >= budget.limits.maxSearchRequests) {
      return exhaust(budget, "global_search_limit", "global");
    }

    if (budget.categorySearchRequests >= budget.limits.maxSearchPagesPerCategory) {
      return exhaust(budget, "category_search_limit", "category");
    }
  }

  if (requestType === "detail") {
    if (budget.detailRequests >= budget.limits.maxDetailRequests) {
      return exhaust(budget, "global_detail_limit", "global");
    }

    if (budget.categoryDetailRequests >= budget.limits.maxDetailRequestsPerCategory) {
      return exhaust(budget, "category_detail_limit", "category");
    }
  }

  return { allowed: true, budgetExhausted: false };
}

export function recordOlxRequest(budget, requestType) {
  if (!budget) return;

  if (requestType === "search") {
    budget.searchRequests += 1;
    budget.categorySearchRequests += 1;
  }

  if (requestType === "detail") {
    budget.detailRequests += 1;
    budget.categoryDetailRequests += 1;
  }
}

export function getOlxBudgetStatus(budget) {
  if (!budget) return null;

  return {
    exhausted: budget.exhausted,
    reason: budget.exhaustionReason,
    scope: budget.exhaustionScope,
    searchRequests: budget.searchRequests,
    detailRequests: budget.detailRequests,
    categorySearchRequests: budget.categorySearchRequests,
    categoryDetailRequests: budget.categoryDetailRequests,
    startedAtMs: budget.startedAtMs,
    deadlineAtMs: budget.deadlineAtMs,
    limits: { ...budget.limits }
  };
}

export function isOlxExecutionBudgetExhausted(budget) {
  return Boolean(budget?.exhausted);
}
