import {
  OLX_EXECUTION_BUDGET_DEFAULTS,
  checkOlxBudget,
  createOlxExecutionBudget,
  getOlxBudgetStatus,
  isOlxExecutionBudgetExhausted,
  recordOlxRequest,
  resetOlxCategoryBudget
} from "./executionBudget";

describe("OLX execution budget", () => {
  it("centralizes the OLX defaults", () => {
    expect(OLX_EXECUTION_BUDGET_DEFAULTS).toEqual({
      maxSearchPagesPerCategory: 2,
      maxSearchRequests: 22,
      maxDetailRequestsPerCategory: 4,
      maxDetailRequests: 32,
      timeBudgetMs: 105000
    });
  });

  it("tracks global and category request counters", () => {
    const budget = createOlxExecutionBudget({}, 1000);

    recordOlxRequest(budget, "search");
    recordOlxRequest(budget, "detail");

    expect(getOlxBudgetStatus(budget)).toMatchObject({
      searchRequests: 1,
      detailRequests: 1,
      categorySearchRequests: 1,
      categoryDetailRequests: 1
    });
  });

  it("distinguishes category limits from global limits", () => {
    const categoryBudget = createOlxExecutionBudget({ maxDetailRequestsPerCategory: 1 }, 1000);
    recordOlxRequest(categoryBudget, "detail");

    expect(checkOlxBudget(categoryBudget, "detail", 1001)).toMatchObject({
      budgetExhausted: true,
      reason: "category_detail_limit",
      scope: "category"
    });
    expect(isOlxExecutionBudgetExhausted(categoryBudget)).toBe(false);

    const globalBudget = createOlxExecutionBudget({ maxDetailRequests: 1 }, 1000);
    recordOlxRequest(globalBudget, "detail");

    expect(checkOlxBudget(globalBudget, "detail", 1001)).toMatchObject({
      budgetExhausted: true,
      reason: "global_detail_limit",
      scope: "global"
    });
    expect(isOlxExecutionBudgetExhausted(globalBudget)).toBe(true);
  });

  it("enforces only the global search request limit", () => {
    const budget = createOlxExecutionBudget({
      maxSearchPagesPerCategory: 1,
      maxSearchRequests: 2
    }, 1000);

    recordOlxRequest(budget, "search");
    expect(checkOlxBudget(budget, "search", 1001)).toMatchObject({ allowed: true, budgetExhausted: false });

    const globalBudget = createOlxExecutionBudget({
      maxSearchPagesPerCategory: 5,
      maxSearchRequests: 2
    }, 1000);
    recordOlxRequest(globalBudget, "search");
    recordOlxRequest(globalBudget, "search");
    expect(checkOlxBudget(globalBudget, "search", 1001)).toMatchObject({
      reason: "global_search_limit",
      scope: "global"
    });
  });

  it("enforces the deadline", () => {
    const budget = createOlxExecutionBudget({ timeBudgetMs: 10 }, 1000);

    expect(checkOlxBudget(budget, "search", 1010)).toMatchObject({
      budgetExhausted: true,
      reason: "deadline",
      scope: "global"
    });
    expect(isOlxExecutionBudgetExhausted(budget)).toBe(true);
  });

  it("resets only category counters and category exhaustion", () => {
    const budget = createOlxExecutionBudget({ maxDetailRequestsPerCategory: 1 }, 1000);
    recordOlxRequest(budget, "detail");
    checkOlxBudget(budget, "detail", 1001);

    resetOlxCategoryBudget(budget);

    expect(getOlxBudgetStatus(budget)).toMatchObject({
      detailRequests: 1,
      categoryDetailRequests: 0,
      reason: null,
      scope: null
    });
  });
});
