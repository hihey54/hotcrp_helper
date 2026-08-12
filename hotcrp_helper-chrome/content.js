// == HotCRP Helper Extension ==
// Author: Giovanni Apruzzese
// Description: Automatically sets comment visibility, displays review word counts, and shows a "suggested recommendation" on HotCRP.
// Version: 28
// Last update: 2026-08-12
// ======================

// flags to prevent repeated execution of functions

let alreadyCheckedPriobid = false;
let commentStatsInjected = false;
let wordCountInitialized = false;
let reviewerSummaryCommentsInitialized = false;



// ===== WORD COUNT (and INJECTION) =====

(function () {
  "use strict";

  const TARGET_DATA_RF = [
    "ImpReaAcc", "LimAdd", "ConSugImpPap", "ConSugImp", "ReaNotAcc", "QueForThe", "ComEthMat", "OpeSciCom", "AddComAut", "ComPC", // Specific of USENIX SEC 26
    "PapSum", "Wea", "Str", "DetComAut", "ComAut", "MaiReaAcc", "MaiReaRej", // Common to other HotCRP instances
      "CorVerJus", "DegChaJus", "RelMotJus", "PerOpiExp", "AnyOthCon", "OveRecSum", "QueAutThe", "FurComSug",  //  AsiaCCS'26
      "StrReaAcc", "WeaReaRej", "ConComAut", "AreAddAut", "DesAnyEth", "ConAddDur", "OpeSciCom.2" // CCS'26
  ];


  const LLM_WORDS = ["commendable", "innovative", "meticulous", "intricate", "notable",
    "versatile", "noteworthy", "invaluable", "pivotal", "potent",
    "fresh", "ingenious", "cogent", "ongoing", "tangible",
    "profound", "methodical", "laudable", "lucid", "appreciable",
    "fascinating", "adaptable", "admirable", "refreshing", "proficient",
    "intriguing", "thoughtful", "credible", "exceptional", "digestible",
    "prevalent", "interpretative", "remarkable", "seamless", "economical",
    "proactive", "interdisciplinary", "sustainable", "optimizable", "comprehensive",
    "vital", "pragmatic", "comprehensible", "unique", "fuller",
    "authentic", "foundational", "distinctive", "pertinent", "valuable",
    "invasive", "speedy", "inherent", "considerable", "holistic",
    "insightful", "operational", "substantial", "compelling", "technological",
    "beneficial", "excellent", "keen", "cultural", "unauthorized",
    "strategic", "expansive", "prospective", "vivid", "consequential",
    "manageable", "unprecedented", "inclusive", "asymmetrical", "cohesive",
    "replicable", "quicker", "defensive", "wider", "imaginative",
    "traditional", "competent", "contentious", "widespread", "environmental",
    "instrumental", "substantive", "creative", "academic", "sizeable",
    "extant", "demonstrable", "prudent", "practicable", "signatory",
    "continental", "unnoticed", "automotive", "minimalistic", "intelligent"]; // from https://arxiv.org/pdf/2403.07183?

  const LLM_SYMBOLS = ["–", "≥", "≤", "≠", "→", "←", "", "", "~", "≈"]; // "…", "”", "“", "«", "»", "‘", "’", "‹", "›" I have omitted these because MAC users and/or users of certain layouts may use these, too---which can lead to false positives.

  const getWordCount = (text) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // const injectWordCount = (reviewCard, wordCount) => {
  //   const header = reviewCard.querySelector(".revcard-header-name");
  //   if (!header || header.querySelector(".word-count-tag")) return;
  //
  //   const span = document.createElement("span");
  //   span.className = "word-count-tag";
  //   span.textContent = ` (${wordCount} words)`;
  //   span.style.color = "blue";
  //   span.style.fontWeight = "normal";
  //   span.style.fontSize = "0.9em";
  //   header.appendChild(span);
  // };

  const injectWordCount = (reviewCard, wordCount, fullText, enableExtraCounts) => {
      const header = reviewCard.querySelector(".revcard-header-name");
      if (!header || header.querySelector(".word-count-tag")) return;

      // Create word count span
      const span = document.createElement("span");
      span.className = "word-count-tag";
      span.textContent = ` (${wordCount} words)`;
      span.style.color = "blue";
      span.style.fontWeight = "normal";
      span.style.fontSize = "0.9em";
      header.appendChild(span);

      // --- Add extra counts ---
      if (enableExtraCounts) {
          const lowerText = fullText.toLowerCase();

          const countAuthor = (lowerText.match(/\bauthors?\b/g) || []).length;

          const countEmdash = (fullText.match(/—/g) || []).length;

          const countLlmSymbols = LLM_SYMBOLS.reduce((acc, symbol) => {
              const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g");  // Escape special chars
              return acc + (fullText.match(regex) || []).length;
          }, 0);

          const countLlmWords = LLM_WORDS.reduce((acc, word) => {
              const regex = new RegExp(`\\b${word}\\b`, "gi");
              return acc + (fullText.match(regex) || []).length;
          }, 0);

          const extraInfo = document.createElement("div");
          extraInfo.className = "extra-count-info";
          extraInfo.textContent = `Occ "authors" = ${countAuthor}; Occ "—" = ${countEmdash}; Occ LLMsymbols = ${countLlmSymbols}; Occ LLMwords = ${countLlmWords}`;
          extraInfo.style.fontSize = "0.8em";
          extraInfo.style.color = "#555";
          extraInfo.style.marginTop = "2px";
          header.appendChild(extraInfo);
      }
  };




  const injectScoreTableCount = (reviewId, wordCount) => {
    const scoreRows = document.querySelectorAll(".reinfotable .rl a[href^='#r']");
    scoreRows.forEach((a) => {
      if (a.textContent.includes(reviewId)) {
        if (a.parentElement.querySelector(".word-count-tag-red")) return;

        const span = document.createElement("span");
        span.className = "word-count-tag-red";
        span.textContent = ` (${wordCount} W)`;
        span.style.color = "red";
        span.style.fontWeight = "normal";
        span.style.fontSize = "0.9em";
        a.parentElement.appendChild(span);
      }
    });
  };


  const scanAllReviews = (enableExtraCounts = true) => {
    // const reviewCards = Array.from(document.querySelectorAll(".revcard[data-review-ordinal]")); // used for "previous" instances
    // const reviewCards = Array.from(document.querySelectorAll(".s-review[data-review-ordinal]")); // used by USENIX SEC26 B

    let reviewCards = Array.from(document.querySelectorAll(".revcard[data-review-ordinal]"));
    if (!reviewCards.length) {
      reviewCards = Array.from(document.querySelectorAll(".s-review[data-review-ordinal]"));
    }

    console.log("Scanning", reviewCards.length, "review cards");

    reviewCards.forEach((card) => {
      const rfSections = Array.from(
        card.querySelectorAll(".rf[data-rf], .rfd0[data-rf]")
      ).filter((el) => TARGET_DATA_RF.includes(el.getAttribute("data-rf")));

      let fullText = "";
      rfSections.forEach((section) => {
        const textBlock = section.querySelector(".revtext");
        if (textBlock) {
          fullText += " " + (textBlock.innerText || textBlock.textContent || "");
        }
      });

      const wordCount = getWordCount(fullText);

      const reviewId = card.id.replace("r", "");
      // injectWordCount(card, wordCount);
      injectWordCount(card, wordCount, fullText, enableExtraCounts);
      injectScoreTableCount(reviewId, wordCount);
    });
  };

// ===== VISIBILITY SETTER =====

    const setVisibilityOnce = () => {
      const select = document.querySelector("#cnew-visibility");
      if (select && !select.dataset.visibilitySet) {
        chrome.storage.sync.get(["defaultVisibility", "defaultThread"], (result) => {
          const defaultValue = result.defaultVisibility || "admin";
          select.value = defaultValue;
          select.setAttribute("data-default-value", defaultValue);
          select.dispatchEvent(new Event("change", { bubbles: true }));
          select.dataset.visibilitySet = "true";
          console.log("Set visibility to:", defaultValue);

          // ===== THREAD DROPDOWN =====
          const threadSelect = document.querySelector("#cnew-thread");
          if (threadSelect && !threadSelect.dataset.threadSet) {
            const defaultThread = result.defaultThread || "rev";
            threadSelect.value = defaultThread;
            threadSelect.setAttribute("data-default-value", defaultThread);
            threadSelect.dispatchEvent(new Event("change", { bubbles: true }));
            threadSelect.dataset.threadSet = "true";
            console.log("Set thread to:", defaultThread);
          }

        });
      }
    };

    const setThreadOnce = () => {
      const observer = new MutationObserver(() => {
        const threadSelect = document.querySelector("#cnew-thread");
        if (threadSelect && !threadSelect.dataset.threadSet) {
          chrome.storage.sync.get(["defaultThread"], (result) => {
            const defaultThread = result.defaultThread || "rev";
            threadSelect.value = defaultThread;
            threadSelect.setAttribute("data-default-value", defaultThread);
            threadSelect.dispatchEvent(new Event("change", { bubbles: true }));
            threadSelect.dataset.threadSet = "true";
            console.log("Set thread to:", defaultThread);
          });

          observer.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    };


function normalizeReviewerEmails() {
  // Find the button that contains the current user's email
  const userButton = document.querySelector("#h-usermenubutton");
  if (!userButton) return;

  const rawText = userButton.textContent || "";
  const emailMatch = rawText.match(/[^\s<>"]+@[^\s<>"]+/);
  if (!emailMatch) return;

  const currentUserEmail = emailMatch[0].trim();
  if (!currentUserEmail) return;

  // Find reviewer entries in the summary table whose title is "This is you"
  const reviewerSpans = document.querySelectorAll(
    ".reinfotable .taghl[title]"
  );

  reviewerSpans.forEach((span) => {
    const title = (span.getAttribute("title") || "").trim().toLowerCase();
    if (title === "this is you") {
      span.setAttribute("title", currentUserEmail);
      // optional debug log
      console.log(
        'Normalized "This is you" to email:',
        currentUserEmail,
        "for span:",
        span
      );
    }
  });
}



// ===== REBUTTAL NORMALIZED WORD COUNT =====

/* This function:
- First, finds if there  is a "rebuttal" in the hotcrp page
- If there is, it reads its HTML-formatted text, and re-calculates the wordcount by applying a new heuristic
---> A space is added AFTER certain characters and BEFORE other characters
------> This makes it so that using punctuation to bypass the wordcount does not work (e.g., writing "today_is_a_good_day" counts as 1 word for HotCRP, but as 5 words for my extension because the text becomes "today_ is_ a_ good_ day"
- There is no change done to the rebuttal: the new wordcount is computed and visualized on HotCRP next to the wordcount automatically provided by HotCRP
 */


function addNormalizedWordCount() {
  // I took the names from USENIX Security26, but also from SaTML26, AsiaCCS26, EuroSP26
  document.querySelectorAll(
    "article#response, article#Mainresponse, article#Authorresponse, article#Rebuttalresponse"
  ).forEach(rebuttal => {

    // avoid duplicates
    if (rebuttal.dataset.wordcountDone) return;

    const textContainer = rebuttal.querySelector(".cmttext");
    const header = rebuttal.querySelector("header");

    if (!textContainer || !header) return;

    let text = textContainer.innerText; // NOTE that "innerText" takes the rendered HTML (which may differ from, e.g., the markdown)

    // ===== 0. Extract URLs (they should count as one word and omitted from the count) =====
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const urls = [];

    let protectedText = text.replace(urlRegex, (match) => {
      urls.push(match);
      return `__URL_${urls.length - 1}__`;
    });

    const charsAfter = ["-", "_", ")", ",", ".", ";", "?", "!", ":", "—", "]", "}"];
    const charsBefore = ["(", "[", "{"];
    const allPunct = "-_.,;:()[]{}!?\"'`~@#$%^&*+=<>/\\|";

    let normalizedText = protectedText;


    // ===== 1. Add space AFTER the characters in "charsAfter" =====
    charsAfter.forEach(ch => {
      const escaped = ch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      const punctEscaped = allPunct.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      const regex = new RegExp(
        `${escaped}(?![\\s${punctEscaped}])`,
        "g"
      );



      normalizedText = normalizedText.replace(regex, ch + " ");
    });

    // ===== 2. Add space BEFORE the characters in "charsBefore" =====
    charsBefore.forEach(ch => {
      const escaped = ch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      const regex = new RegExp(
        `(?<![\\s${charsBefore.map(c => c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join("")}])${escaped}`,
        "g"
      );

      normalizedText = normalizedText.replace(regex, " " + ch);
    });

    // ===== 3. Fix decimal numbers (e.g., 23.12 should not be split) =====
    normalizedText = normalizedText.replace(/(\d+)\.\s+(\d+)/g, "$1.$2");

    // ===== 4. Clean spaces to prepare the counting =====
    normalizedText = normalizedText.replace(/\s+/g, " ").trim();
    const wordCount = normalizedText.split(" ").length;

    // ===== 5. Show new wordcount =====

    const div = document.createElement("div");
    div.className = "cmtwords words need-tooltip";
    div.setAttribute("title",
      "Normalized word count: computed after virtually adding spaces after punctuation to prevent undercounting tricks."
    );
    div.setAttribute("aria-label",
      "Normalized word count after splitting tokens on punctuation."
    );
    div.style.fontWeight = "bold";
    div.style.marginLeft = "8px";
    div.textContent = `· Normalized wordcount: ${wordCount} words`;

    const existing = header.querySelector(".cmtwords");
    if (existing) {
      existing.insertAdjacentElement("afterend", div);
    } else {
      header.appendChild(div);
    }

    rebuttal.dataset.wordcountDone = "true"; // flag to avoid duplicates
  });
}




// ===== REVIEWER LAST ACTIVITY =====

function cleanName(raw) {
    if (!raw) return "";

    // Convert HTML → plain text
    const tmp = document.createElement("div");
    tmp.innerHTML = raw;
    return tmp.textContent.trim();
}

function getReviewerLastActivity() {
    const activity = {};

    document.querySelectorAll("script").forEach(s => {
        const text = s.textContent;

        // Reviews
        const reviewMatches = text.matchAll(/hotcrp\.add_review\((\{.*?\})\);/gs);
        for (const match of reviewMatches) {
            try {
                const obj = JSON.parse(match[1]);
                const name = cleanName(obj.reviewer);
                const ts = obj.modified_at;

                if (!activity[name] || activity[name] < ts) {
                    activity[name] = ts;
                }
            } catch (e) {}
        }

        // Comments
        const commentMatches = text.matchAll(/hotcrp\.add_comment\((\{.*?\})\);/gs);
        for (const match of commentMatches) {
            try {
                const obj = JSON.parse(match[1]);
                const name = cleanName(obj.author);
                const ts = obj.modified_at;

                if (!activity[name] || activity[name] < ts) {
                    activity[name] = ts;
                }
            } catch (e) {}
        }
    });

    return activity;
}


function daysSince(ts) {
    const now = Date.now() / 1000; // seconds
    return Math.floor((now - ts) / 86400);
}


// ===== REVIEWER COMMENT COUNTS AFTER REBUTTAL =====

function enhanceReviewerSummaryWithPostRebuttalComments() {
  // First, normalize any "This is you" titles to the actual email
  normalizeReviewerEmails();

  // Find the reviewer summary table
  const container = document.querySelector(".reinfotable-container .reinfotable table.reviewers");
  if (!container) return;

  const table = container;
  const headerRow = table.querySelector("thead tr");
  if (!headerRow) return;

  // Avoid adding columns multiple times
  if (headerRow.querySelector(".comreb-header")) {
    return;
  }

  // --- 1. Detect rebuttal (response) article ---
  const rebuttalArticle = document.querySelector("article.response[id*='response']");
  const hasRebuttal = !!rebuttalArticle;

  // --- 2. Build email -> #comments-after-rebuttal map ---
  const commentCountsByEmail = {};

  if (hasRebuttal) {
    const commentArticles = Array.from(
      document.querySelectorAll("article.comment[id^='c']")
    );

    commentArticles.forEach((comment) => {
      // Only count comments that are AFTER the rebuttal in document order
      const isAfterRebuttal =
        rebuttalArticle.compareDocumentPosition(comment) &
        Node.DOCUMENT_POSITION_FOLLOWING;

      if (!isAfterRebuttal) return;

      const authorNode = comment.querySelector(".cmtname[title]");
      if (!authorNode) return;

      const email = authorNode.getAttribute("title");
      if (!email) return;

      commentCountsByEmail[email] = (commentCountsByEmail[email] || 0) + 1;
    });
  }

  // --- 3. Add header columns: "ComReb #", "Email", "LastActivity" ---
  const comRebTh = document.createElement("th");
  comRebTh.className = "rlscore comreb-header";
  comRebTh.textContent = "ComReb #";
  comRebTh.setAttribute("aria-label",
      "Comments posted after submission of the author's rebuttal."
    );

  const emailTh = document.createElement("th");
  emailTh.className = "rlscore email-header";
  emailTh.textContent = "Email";
  emailTh.setAttribute("aria-label",
      "Inferred from the tooltip of the reviewer's name."
    );

  const lastActivityTh = document.createElement("th");
  lastActivityTh.className = "rlscore lastactivity-header";
  lastActivityTh.textContent = "LastActivity";
  lastActivityTh.setAttribute("aria-label",
      "Days passed since submitting/updating the review, or posting a comment (for this specific paper)."
    );

  headerRow.appendChild(comRebTh);
  headerRow.appendChild(emailTh);
  headerRow.appendChild(lastActivityTh);

  // --- 4. Fill rows with per-reviewer counts and email icons and last activity ---
  const rows = table.querySelectorAll("tbody tr.rl");

  const activity = getReviewerLastActivity();

  rows.forEach((row) => {
    const reviewerSpan = row.querySelector("span.taghl[title]");
    const email = reviewerSpan ? reviewerSpan.getAttribute("title") : null;

    // ComReb # cell
    const comRebTd = document.createElement("td");
    comRebTd.className = "rlscore comreb-cell";

    if (!hasRebuttal) {
      // No response => N/A for everyone
      comRebTd.textContent = "N/A";
    } else if (email && commentCountsByEmail[email] != null) {
      // Reviewer has comments after rebuttal
      comRebTd.textContent = commentCountsByEmail[email];
    } else if (email) {
      // Reviewer has zero comments after rebuttal
      comRebTd.textContent = "0";
    } else {
      // No email associated (e.g., special row)
      comRebTd.textContent = "—";
    }

    // Email cell with ✉
    const emailTd = document.createElement("td");
    emailTd.className = "rlscore email-cell";

    if (email) {
      const link = document.createElement("a");
      link.href = `mailto:${email}`;
      link.textContent = "✉";
      link.title = email;
      link.style.textDecoration = "none";
      emailTd.appendChild(link);
    } else {
      emailTd.textContent = "—";
    }

    row.appendChild(comRebTd);
    row.appendChild(emailTd);

    const nameEl = row.querySelector(".taghl");
    if (nameEl) {
      const name = cleanName(nameEl.textContent);

      const td = document.createElement("td");

      if (activity[name]) {
        const d = daysSince(activity[name]);
        td.textContent = d === 0 ? "today" : d + " days ago";
      } else {
        td.textContent = "-";
      }
      row.appendChild(td);
    }
  });
}



    const loadSettings = () => {
      chrome.storage.sync.get(
        ["showWordCount", "showDecisionRecommendationR1", "showExtraCounts", "showCommentStats", "showNormalizedWordCount"],
        (result) => {
          const enableWordCount = result.showWordCount ?? true;
          const enableDecisionRecommendationR1 = result.showDecisionRecommendationR1 ?? true;
          const enableExtraCounts = result.showExtraCounts ?? true;
          const enableCommentStats = result.showCommentStats ?? true;
          const enableNormalizedWordCount = result.showNormalizedWordCount ?? true;



          if (enableDecisionRecommendationR1) {
              checkPriobidAndMetrics();
          }
          if (enableWordCount && !wordCountInitialized) {
              scanAllReviews(enableExtraCounts);
              wordCountInitialized = true;
          }
          if (enableCommentStats) {
              computeAndDisplayCommentStats();
          }

          if (!reviewerSummaryCommentsInitialized) {
              enhanceReviewerSummaryWithPostRebuttalComments();
              reviewerSummaryCommentsInitialized = true;
          }

          if (enableNormalizedWordCount) {
              addNormalizedWordCount();
          }

          setVisibilityOnce();
          setThreadOnce();

        }
      );
    };


  const observer = new MutationObserver(() => {
    loadSettings();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback interval
  setTimeout(loadSettings, 1500);
})();

// ===== CHECK FOR #priobid AND EXTRACT METRICS =====




function checkPriobidAndMetrics() {

  if (alreadyCheckedPriobid) return;  // Prevent re-running
  alreadyCheckedPriobid = true;

  let priobid = false;
  const Merits = [];
  const Expertises = [];
  const OpenScienceValues = [];

  // 1. Check if #priobid is present inside the #foldtags div
  const foldtagsDiv = document.getElementById("foldtags");
  if (foldtagsDiv && foldtagsDiv.innerHTML.includes("#priobid")) {
    priobid = true;
  }

  // 2. Parse review info table for OveMer and RevExp
  const reinfotable = document.querySelector(".reinfotable-container");
  if (reinfotable) {
    const rows = reinfotable.querySelectorAll("tr.rl");

    rows.forEach(row => {
      const meritCell = row.querySelector('[data-rf="OveMer"]');
      const expertCell = row.querySelector('[data-rf="RevExp"]');
      const openSciCell = row.querySelector('[data-rf="OpeSciMat"]');

      const merit = meritCell?.innerText?.trim();
      const expertise = expertCell?.innerText?.trim();
      const openSci = openSciCell?.innerText?.trim();

      if (merit) Merits.push(merit);
      if (expertise) Expertises.push(expertise);
      if (openSci) OpenScienceValues.push(openSci);

    });
  }

  // 3. Console output
  console.log("priobid:", priobid);
  console.log("Merits:", Merits);
  console.log("Expertises:", Expertises);

  // 4. Inject CHECKED above the "Submitted" <p>
  const submittedPara = document.querySelector("p.pgsm");
  // if (submittedPara) {
  //   const checkNote = document.createElement("p");
  //   checkNote.textContent = "CHECKED";
  //   checkNote.style.color = "green";
  //   checkNote.style.fontWeight = "bold";
  //   submittedPara.parentNode.insertBefore(checkNote, submittedPara);
  // }
  const hasOpenScienceIssue = OpenScienceValues.some(v => v !== "1");
  if (hasOpenScienceIssue) {
    const warning = document.createElement("p");
    warning.textContent = "There is an OpenScience Issue! (please double check the repository and verify if the reviewers are correct or not)";
    warning.style.color = "orange";
    warning.style.fontWeight = "bold";
    warning.style.marginTop = "-8px";
    submittedPara.parentNode.insertBefore(warning, submittedPara);
  }

  const decision = evaluateReviews(priobid, Merits, Expertises);
  console.log("Decision:", decision);

    // Add it below the CHECKED label
  if (submittedPara) {
    const decisionNote = document.createElement("p");
    decisionNote.textContent = "AUTOMATED CHECK: " + decision;
    decisionNote.style.fontStyle = "italic";
    decisionNote.style.color = "green";
    decisionNote.style.marginTop = "-10px";
    submittedPara.parentNode.insertBefore(decisionNote, submittedPara);
  }


}

// ===== Evaluate reviews based on metrics =====

function evaluateReviews(priobid, Merits, Expertises) {
  // Convert string values to numbers
  const numericMerits = Merits.map(m => parseInt(m)).filter(n => !isNaN(n));
  const numericExpertises = Expertises.map(e => parseInt(e)).filter(n => !isNaN(n));

  const meritSum = numericMerits.reduce((a, b) => a + b, 0);

  // Case 1: Not enough reviews
  if (numericMerits.length < 2 || numericExpertises.length < 2) {
    return "Advance to R2 (not enough reviews)";
  }

  // Case 2: Low support, all expertise < 2
  if (meritSum <= 3 && numericExpertises.every(e => e < 2)) {
    return "Advance to R2 (low expertise)";
  }

  // Case 3: Low support, at least one expertise >= 3
  if (meritSum <= 3 && numericExpertises.some(e => e >= 3)) {
    return "Suggest Reject (poor support, high expertise)";
  }

  // Case 4: Low support, no high expertise, priobid true
  if (meritSum <= 3 && numericExpertises.every(e => e < 3) && priobid) {
    return "Suggest Likely Reject (priobid, poor support)";
  }

  // Case 5: Low support, no high expertise, priobid false
  if (meritSum <= 3 && numericExpertises.every(e => e < 3) && !priobid) {
    return "Advance to R2 (poor support, but low expertise)";
  }

  // Case 6: All merits == 2, total merit > 3
  if (meritSum > 3 && numericMerits.every(m => m === 2)) {
    if (numericExpertises.every(e => e >= 3) || (numericExpertises.every(e => e >= 2) && priobid)) {
      return "Suggest Likely Reject (scarce support, high-confidence, or priobid)";
    } else {
      return "Suggest Advance to R2 (scarce support, but not enough expertise)";
    }
  }

  // Case 7: Sum merits > 3
  if (meritSum > 3) {
    return "Suggest Advance to R2 (good support, but double-check or discuss with reviewers to confirm)";
  }

  // Fallback
  return "No clear recommendation";
}

// ===== COMMENT STATS (count comments, words, characters) =====

function computeAndDisplayCommentStats() {

    // prevent repeated execution
  if (commentStatsInjected) return;

  // 1. Collect comments
  const comments = document.querySelectorAll(".cmtrevvis, .cmtpcvis");
  const numComments = comments.length;

  let totalWords = 0;
  let totalChars = 0;

  comments.forEach((cmt) => {
    // Text is in .cmttext (HTML) or sometimes .cmtmsg/.fx20 depending on HotCRP variant
    const textContainer =
      cmt.querySelector(".cmttext") ||
      cmt.querySelector(".cmtmsg") ||
      cmt.querySelector(".cmtmsg.fx20");

    if (!textContainer) return;

    const text = textContainer.innerText || textContainer.textContent || "";
    const words = text.trim().split(/\s+/).filter(Boolean);

    totalWords += words.length;
    totalChars += text.length;
  });

  // 2. Find the "Reviews and comments in plain text" <p> anchor
  const plainTextLink = document.querySelector(
    "p.sd.mt-5 a[href*='text=1']"
  );
  const anchorP = plainTextLink ? plainTextLink.closest("p.sd.mt-5") : null;

  if (!anchorP) {
    console.log("HotCRP helper: plain-text reviews link not found, skipping comment stats injection.");
    return;
  }

  // 3. Create or reuse a stats <p> directly *after* that anchor
  let statsP = document.getElementById("hotcrp-comment-stats");
  if (!statsP) {
    statsP = document.createElement("p");
    statsP.id = "hotcrp-comment-stats";
    statsP.style.marginTop = "0.5em";
    statsP.style.fontSize = "0.9em";
    statsP.style.color = "#444";
    // Insert after the <p class="sd mt-5">...</p>
    anchorP.insertAdjacentElement("afterend", statsP);
  }

  statsP.textContent =
    `Comments: ${numComments} · Total length: ` +
    `${totalWords} words / ${totalChars} characters`;

  // mark as done so we don't keep recomputing
  commentStatsInjected = true;
}
