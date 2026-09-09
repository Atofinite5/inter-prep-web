export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';
export type QuestionDifficulty = 1 | 2 | 3;

export interface QuestionMeta {
  origin?: 'generated' | 'user';
  is_edited?: boolean;
  is_pinned?: boolean;
  last_modified?: string;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: QuestionDifficulty;
  _meta?: QuestionMeta;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _meta?: {
    confidence?: 1 | 2 | 3 | 4 | 5;
    last_reviewed?: string;
    review_count?: number;
  };
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface RoleBreakdown {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface PrepKit {
  source: KitSource;
  company_brief: CompanyBrief;
  role: RoleBreakdown;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface KitListItem {
  id: string;
  kit: PrepKit;
  updatedAt: string;
}

export interface PracticeSessionStats {
  totalCards: number;
  reviewedCards: number;
  unreviewedCards: number;
  averageConfidence: number;
  masteryPercentage: number;
  weakestRequirementIds: string[];
}
