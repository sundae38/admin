export interface Audit {
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface Project extends Audit {
  id: number;
  name: string;
  project_type: string;
  grant_type: string | null;
  year: number;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  budget_grant: number;
  budget_review: number;
  budget_program: number;
  fund_contribution: number;
  fund_investment: number;
  fund_carryover: number;
  fund_donation: number;
  fund_agency: number;
  manager: string | null;
  status: string;
  target_headcount: number;
  applicant_count: number;
  description: string | null;
}

export interface Distribution {
  label: string;
  value: number;
}

export interface AmountItem {
  label: string;
  amount: number;
}

export interface BudgetLine {
  label: string;
  budget: number;
  paid: number;
  rate: number;
}

export interface BudgetExecution {
  label: string;
  project_count: number;
  total_budget: number;
  total_paid: number;
  total_rate: number;
  grant_budget: number;
  grant_paid: number;
  grant_rate: number;
  grant_remaining: number;
}

export interface MonthlyExecution {
  month: string;
  grant_paid: number;
  returned: number;
  net_executed: number;
  cumulative_executed: number;
  cumulative_rate: number;
}

export interface ItemScore {
  label: string;
  score: number;
}

export interface ProjectKPI {
  project_id: number;
  project_name: string;
  project_type: string;
  year: number;
  status: string;
  selected_count: number;
  target_headcount: number;
  applicant_count: number;
  competition_rate: number;
  total_budget: number;
  total_paid: number;
  execution_rate: number;
  grant_budget: number;
  grant_initial: number;
  grant_additional: number;
  grant_returned: number;
  grant_paid: number;
  grant_remaining: number;
  grant_execution_rate: number;
  grant_initial_headcount: number;
  grant_support_headcount: number;
  budget_lines: BudgetLine[];
  funding_sources: AmountItem[];
  program_participation_rate: number;
  program_satisfaction: number;
  overall_satisfaction: number;
  satisfaction_items: ItemScore[];
  growth_achievement_rate: number;
  partner_count: number;
  special_care_count: number;
  special_care_distribution: Distribution[];
  gender_distribution: Distribution[];
  age_distribution: Distribution[];
  school_distribution: Distribution[];
  region_distribution: Distribution[];
  category_distribution: Distribution[];
}

export interface OverviewKPI {
  total_projects: number;
  total_selected: number;
  total_support_headcount: number;
  total_budget: number;
  total_paid: number;
  overall_execution_rate: number;
  avg_satisfaction: number;
  total_partners: number;
  total_special_care: number;
  special_care_distribution: Distribution[];
  school_distribution: Distribution[];
  projects_by_year: Distribution[];
  projects_by_type: Distribution[];
  execution_by_type: BudgetExecution[];
  integrated_execution: BudgetExecution;
  monthly_execution: MonthlyExecution[];
  projects: ProjectKPI[];
}

export interface Meta {
  school_levels: string[];
  special_care_categories: string[];
  grant_types: string[];
  budget_categories: string[];
  project_types: string[];
}

export interface SpecialCategory {
  id: number;
  name: string;
  sort_order: number;
}

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_label: string | null;
  entity_id: number | null;
  project_id: number | null;
  action: string; // create | update | delete | import
  actor: string | null;
  summary: string | null;
  changes: Record<string, { before?: unknown; after?: unknown } | unknown> | null;
  created_at: string;
}

export interface Participant extends Audit {
  id: number;
  project_id: number;
  name: string;
  gender: string | null;
  age_group: string | null;
  school_level: string | null;
  region: string | null;
  category: string | null;
  special_categories: string[] | null;
  selected_date: string | null;
  status: string;
}

export interface Payment extends Audit {
  id: number;
  project_id: number;
  participant_id: number | null;
  payment_type: string | null;
  budget_category: string;
  grant_kind: string;
  initial_headcount: number;
  gender: string | null;
  school_level: string | null;
  special_categories: string[] | null;
  reason: string | null;
  planned_amount: number;
  paid_amount: number;
  paid_date: string | null;
  status: string;
}

export interface Program extends Audit {
  id: number;
  project_id: number;
  name: string;
  program_type: string | null;
  session_no: number | null;
  start_date: string | null;
  end_date: string | null;
  target_count: number;
  participation_count: number;
}

export interface GrowthMetric extends Audit {
  id: number;
  project_id: number;
  participant_id: number | null;
  metric_name: string;
  target_value: number;
  actual_value: number;
  measured_date: string | null;
}

export interface Survey extends Audit {
  id: number;
  project_id: number;
  program_id: number | null;
  survey_type: string;
  title: string | null;
  respondent_count: number;
  avg_score: number;
  conducted_date: string | null;
  item_scores: Record<string, number> | null;
}

export interface Partner extends Audit {
  id: number;
  project_id: number;
  name: string;
  partner_type: string | null;
  contribution: string | null;
  contact: string | null;
  agreement_start: string | null;
  agreement_end: string | null;
  status: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}
