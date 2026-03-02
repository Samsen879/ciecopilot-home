// /api/marking/evaluate.js
// Smart Mark Engine v0 lightweight API endpoint (deterministic baseline).
// @deprecated Legacy endpoint. Do not register in gateway routes.
// Use /api/marking/evaluate-v1 instead.

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^a-z0-9+\-*/=(). ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text).match(/[a-z0-9]+/g) || [];
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach((x) => {
    if (sb.has(x)) inter += 1;
  });
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

function alignStep(stepText, rubric) {
  const basis = `${rubric.mark_label || ""} ${rubric.description || ""}`.trim();
  const score = jaccard(tokenize(stepText), tokenize(basis));
  return {
    rubric_id: rubric.rubric_id,
    mark_label: rubric.mark_label,
    confidence: Number(score.toFixed(4)),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ code: 'request_error', error: "method_not_allowed" });
  }

  try {
    const body = req.body || {};
    const steps = Array.isArray(body.steps) ? body.steps : [];
    const rubricPoints = Array.isArray(body.rubric_points) ? body.rubric_points : [];
    const minConfidence = Number(body.min_confidence ?? 0.55);
    const uncertainMargin = Number(body.uncertain_margin ?? 0.15);

    const alignments = steps.map((step, idx) => {
      const stepId = String(step.step_id || `s${idx + 1}`);
      const stepText = String(step.text || "");

      if (!rubricPoints.length) {
        return {
          step_id: stepId,
          status: "uncertain",
          confidence: 0,
          rubric_id: null,
          mark_label: null,
          reason: "no_rubric_points",
        };
      }

      let best = null;
      for (const rp of rubricPoints) {
        const candidate = alignStep(stepText, rp);
        if (!best || candidate.confidence > best.confidence) {
          best = candidate;
        }
      }

      let status = best.confidence >= minConfidence ? "aligned" : "uncertain";
      let reason = status === "aligned" ? "best_match" : "below_threshold";
      if (best.confidence >= minConfidence && best.confidence < minConfidence + uncertainMargin) {
        status = "uncertain";
        reason = "borderline_score";
      }

      return {
        step_id: stepId,
        status,
        confidence: best.confidence,
        rubric_id: best.rubric_id || null,
        mark_label: best.mark_label || null,
        reason,
      };
    });

    return res.status(200).json({
      engine: "smart_mark_v0",
      min_confidence: minConfidence,
      uncertain_margin: uncertainMargin,
      steps_total: steps.length,
      rubric_points_total: rubricPoints.length,
      alignments,
    });
  } catch (error) {
    return res.status(500).json({ code: 'request_error', error: "internal_error",
      message: error?.message || String(error),
    });
  }
}
