
export const ENABLED_PIPELINE_CATEGORIES = Object.freeze(["Hiring", "Deployment"]);

/**
 * @param {string | null | undefined} category
 * @returns {boolean}
 */

export const isPipelineCategoryEnabled = category =>
  ENABLED_PIPELINE_CATEGORIES.includes(String(category || ""));

/**
 * @param {Array<{ stage_category?: string | null }>} stages
 * @returns {Array<{ stage_category?: string | null }>}
 */

export const getEnabledPipelineStages = stages =>
  (Array.isArray(stages) ? stages : []).filter(stage =>
    isPipelineCategoryEnabled(stage?.stage_category)
  );
