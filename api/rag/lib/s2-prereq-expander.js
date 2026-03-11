function normalizeTopicPath(rawPath) {
  return String(rawPath || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
}

function isValidTopicPath(topicPath) {
  return /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/.test(topicPath);
}

function getRoot(topicPath) {
  return normalizeTopicPath(topicPath).split('.')[0]?.toLowerCase() || '';
}

function getParent(topicPath) {
  const normalized = normalizeTopicPath(topicPath);
  const parts = normalized.split('.').filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('.');
}

function getDepth(topicPath) {
  return normalizeTopicPath(topicPath).split('.').filter(Boolean).length;
}

const SUBJECT_ROOT_CHILDREN = {
  '9709': ['9709.P1', '9709.P2', '9709.P3', '9709.S1', '9709.S2', '9709.M1'],
  '9702': ['9702.P1', '9702.P2', '9702.P3', '9702.P4', '9702.P5'],
  '9231': ['9231.FP1', '9231.FP2', '9231.FM', '9231.FS'],
};

const PAPER_RELATED_ROOTS = {
  '9709.P1': ['9709.P2'],
  '9709.P2': ['9709.P1', '9709.P3'],
  '9709.P3': ['9709.P2'],
  '9709.S1': ['9709.S2'],
  '9709.S2': ['9709.S1'],
  '9702.P1': ['9702.P2'],
  '9702.P2': ['9702.P1'],
  '9231.FP1': ['9231.FP2'],
  '9231.FP2': ['9231.FP1'],
};

function isDescendantOrEqual(childPath, parentPath) {
  const child = normalizeTopicPath(childPath).toLowerCase();
  const parent = normalizeTopicPath(parentPath).toLowerCase();
  if (!child || !parent) return false;
  if (child === parent) return true;
  return child.startsWith(`${parent}.`);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getPaperRoot(topicPath) {
  const parts = normalizeTopicPath(topicPath).split('.').filter(Boolean);
  if (parts.length < 2) return normalizeTopicPath(topicPath);
  return `${parts[0]}.${parts[1]}`;
}

function getTopicSuffixAfterPaper(topicPath) {
  const parts = normalizeTopicPath(topicPath).split('.').filter(Boolean);
  return parts.length > 2 ? parts.slice(2).join('.') : '';
}

export function expandPrerequisiteTopics(
  {
    currentTopicPath,
    seedRows = [],
    maxExpandedTopics = 6,
    subjectCode = null,
  },
) {
  const current = normalizeTopicPath(currentTopicPath);
  const root = String(subjectCode || getRoot(current)).toLowerCase();
  const maxTopics = toPositiveInteger(maxExpandedTopics, 6);

  if (!current || !isValidTopicPath(current)) {
    return {
      expanded_topic_paths: [],
      expansion_reason_counts: {
        invalid_current_topic_path: 1,
      },
      skipped_topic_paths: [],
      subject_root: root || null,
      max_expanded_topics: maxTopics,
    };
  }

  const scored = new Map();
  const skipped = [];
  const reasonCounts = {};

  function addReason(reason) {
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  }

  function addCandidate(topicPath, score, reason) {
    const normalized = normalizeTopicPath(topicPath);
    if (!normalized || !isValidTopicPath(normalized)) {
      addReason('invalid_topic_path');
      return;
    }
    if (normalized.toLowerCase() === current.toLowerCase()) {
      addReason('same_as_current');
      return;
    }
    if (root && getRoot(normalized) !== root) {
      addReason('cross_subject_root_blocked');
      skipped.push(normalized);
      return;
    }
    const prior = scored.get(normalized) || {
      topic_path: normalized,
      score: 0,
      reasons: new Set(),
      depth: getDepth(normalized),
    };
    prior.score += score;
    prior.reasons.add(reason);
    scored.set(normalized, prior);
    addReason(reason);
  }

  const subjectRootChildren = SUBJECT_ROOT_CHILDREN[root] || [];
  if (current.toLowerCase() === root && subjectRootChildren.length > 0) {
    for (const childPath of subjectRootChildren) {
      addCandidate(childPath, 3, 'subject_root_child');
    }
  }

  const currentPaperRoot = getPaperRoot(current);
  const paperRelatedRoots = PAPER_RELATED_ROOTS[currentPaperRoot] || [];
  const topicSuffix = getTopicSuffixAfterPaper(current);
  for (const relatedRoot of paperRelatedRoots) {
    addCandidate(relatedRoot, 2, 'paper_related_root');
    if (topicSuffix) {
      addCandidate(`${relatedRoot}.${topicSuffix}`, 4, 'paper_related_suffix');
    }
  }

  const currentParent = getParent(current);
  if (currentParent) {
    addCandidate(currentParent, 3, 'current_parent');
    const currentGrandParent = getParent(currentParent);
    if (currentGrandParent && getDepth(currentGrandParent) > 1) {
      addCandidate(currentGrandParent, 1, 'current_grandparent');
    }
  }

  for (const row of Array.isArray(seedRows) ? seedRows : []) {
    const seedPath = normalizeTopicPath(row?.topic_path);
    if (!seedPath) continue;
    if (!isValidTopicPath(seedPath)) {
      addReason('seed_invalid_path');
      skipped.push(seedPath);
      continue;
    }
    if (root && getRoot(seedPath) !== root) {
      addReason('seed_cross_subject_blocked');
      skipped.push(seedPath);
      continue;
    }

    if (isDescendantOrEqual(seedPath, current)) {
      addCandidate(seedPath, 2, 'seed_descendant');
      const seedParent = getParent(seedPath);
      if (seedParent && !isDescendantOrEqual(seedParent, current)) {
        addCandidate(seedParent, 1, 'seed_parent');
      }
    } else if (isDescendantOrEqual(current, seedPath)) {
      addCandidate(seedPath, 2, 'seed_ancestor');
    } else {
      addCandidate(seedPath, 1, 'seed_peer');
      const peerParent = getParent(seedPath);
      if (peerParent && peerParent.toLowerCase() !== current.toLowerCase()) {
        addCandidate(peerParent, 1, 'seed_peer_parent');
      }
    }
  }

  const expanded = [...scored.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.depth !== right.depth) return left.depth - right.depth;
      return left.topic_path.localeCompare(right.topic_path);
    })
    .slice(0, maxTopics)
    .map((item) => ({
      topic_path: item.topic_path,
      score: Number(item.score.toFixed(4)),
      reasons: [...item.reasons],
    }));

  return {
    expanded_topic_paths: expanded.map((item) => item.topic_path),
    expansion_details: expanded,
    expansion_reason_counts: reasonCounts,
    skipped_topic_paths: [...new Set(skipped)],
    subject_root: root || null,
    max_expanded_topics: maxTopics,
  };
}
