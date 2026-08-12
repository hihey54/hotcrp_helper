// Load saved settings and initialize the popup controls
window.addEventListener("DOMContentLoaded", () => {
  const wordCountCheckbox = document.getElementById("toggleWordCount");
  const visibilitySelect = document.getElementById("visibilitySelect");
  const normalizedWordCountCheckbox = document.getElementById("toggleNormalizedWordCount");
  const decisionRecommendationCheckboxR1 = document.getElementById("toggleDecisionRecommendationR1");
  const threadSelect = document.getElementById("threadSelect");
  const extraCountsCheckbox = document.getElementById("toggleExtraCounts");
  const commentStatsCheckbox = document.getElementById("toggleCommentStats");





  // Load settings
  chrome.storage.sync.get(["showWordCount", "defaultVisibility", "showDecisionRecommendationR1", "defaultThread", "showExtraCounts", "showCommentStats", "showNormalizedWordCount"], (data) => {
    wordCountCheckbox.checked = data.showWordCount ?? true;
    visibilitySelect.value = data.defaultVisibility ?? "admin";
    decisionRecommendationCheckboxR1.checked = data.showDecisionRecommendationR1 ?? true;
    threadSelect.value = data.defaultThread ?? "rev";
    extraCountsCheckbox.checked = data.showExtraCounts ?? true;
    commentStatsCheckbox.checked = data.showCommentStats ?? true;
    normalizedWordCountCheckbox.checked = data.showNormalizedWordCount ?? true;



  });

  // Save settings on change
  wordCountCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set({ showWordCount: wordCountCheckbox.checked });
  });

  visibilitySelect.addEventListener("change", () => {
    chrome.storage.sync.set({ defaultVisibility: visibilitySelect.value });
  });

  decisionRecommendationCheckboxR1.addEventListener("change", () => {
    chrome.storage.sync.set({ showDecisionRecommendationR1: decisionRecommendationCheckboxR1.checked });
  });

  threadSelect.addEventListener("change", () => {
    chrome.storage.sync.set({ defaultThread: threadSelect.value });
  });

  extraCountsCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set({ showExtraCounts: extraCountsCheckbox.checked });
  });

  commentStatsCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set({ showCommentStats: commentStatsCheckbox.checked });
  });

  normalizedWordCountCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set({ showNormalizedWordCount: normalizedWordCountCheckbox.checked });
  });

});