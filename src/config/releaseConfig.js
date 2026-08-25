// Candidate-facing pipeline phases enabled for the current live release.
// Add Immigration, Deployment, and Aftercare here when those workflows are ready.
export const ENABLED_PIPELINE_CATEGORIES = Object.freeze(["Hiring"]);

export const isPipelineCategoryEnabled = category =>
  ENABLED_PIPELINE_CATEGORIES.includes(String(category || ""));

export const getEnabledPipelineStages = stages =>
  (Array.isArray(stages) ? stages : []).filter(stage =>
    isPipelineCategoryEnabled(stage?.stage_category)
  );
