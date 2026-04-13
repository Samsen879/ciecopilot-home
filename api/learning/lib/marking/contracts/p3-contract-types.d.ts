export type VerificationCondition =
  | {
      kind: 'adapter_call';
      adapter_method: string;
      params?: Record<string, unknown>;
    }
  | {
      kind: 'all' | 'any';
      conditions: VerificationCondition[];
    }
  | {
      kind: 'not';
      condition: VerificationCondition;
    }
  | {
      kind: 'count_at_least';
      min_count: number;
      conditions: VerificationCondition[];
    };

export interface DependencyChain {
  prerequisite_point_ids: string[];
  prerequisite_policy: 'all' | 'any';
  strict: boolean;
}

export interface FollowThroughPolicy {
  enabled: boolean;
  mode:
    | 'reuse_student_binding'
    | 'symbolic_substitution'
    | 'numeric_substitution'
    | 'algebraic_consistency';
  allow_incorrect_source: boolean;
  binding_sources?: string[];
  source_point_ids?: string[];
}

export interface UncertaintyTrigger {
  trigger_id: string;
  trigger_type:
    | 'adapter_confidence_below'
    | 'multiple_branch_match'
    | 'missing_binding'
    | 'ambiguous_parse'
    | 'manual_review_required';
  severity: 'low' | 'medium' | 'high';
  message: string;
  threshold?: number;
  params?: Record<string, unknown>;
}

export interface MarkPoint {
  point_id: string;
  official_mark_notation: string;
  mark_family: 'M' | 'A' | 'B';
  max_score: number;
  verification_condition: VerificationCondition;
  dependency_chain?: DependencyChain;
  follow_through?: FollowThroughPolicy;
  uncertainty_triggers?: UncertaintyTrigger[];
}

export interface RubricPart {
  part_id: string;
  label: string;
  score_max: number;
  points: MarkPoint[];
  uncertainty_triggers?: UncertaintyTrigger[];
  subparts?: RubricPart[];
}

export interface RubricTemplate {
  schema_version: 'p3.rubric_template.v1';
  rubric_template_id: string;
  question_type_id: string;
  title: string;
  release_state: 'draft' | 'validated' | 'released';
  adapter_key: string;
  score_max: number;
  provenance: {
    source_type: 'official_mark_scheme_excerpt' | 'manual_authoring' | 'mixed';
    source_refs: string[];
    authoring_notes?: string[];
  };
  global_uncertainty_rules?: UncertaintyTrigger[];
  parts: RubricPart[];
}
