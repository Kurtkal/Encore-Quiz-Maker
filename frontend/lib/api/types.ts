export type Role = "admin" | "user";

export type AuthUser = {
  id: number;
  email: string;
  role: Role;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type RegisterPayload = {
  email: string;
  password: string;
  role: Role;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type QuizSummary = {
  id: number;
  title: string;
  is_published: boolean;
  question_count: number;
  pass_threshold?: number;
  one_attempt: boolean;
  show_answers: boolean;
  completed?: boolean;
  created_at: string;
  created_by?: {
    id: number;
    email: string;
  };
};

export type QuizListResponse = {
  quizzes: QuizSummary[];
};

export type AnswerInput = {
  text: string;
  is_correct: boolean;
};

export type QuestionInput = {
  text: string;
  answers: AnswerInput[];
};

export type UpsertQuizPayload = {
  title: string;
  is_published: boolean;
  pass_threshold: number | null;
  one_attempt: boolean;
  show_answers: boolean;
  questions: QuestionInput[];
};

export type AdminQuizDetail = {
  id: number;
  title: string;
  is_published: boolean;
  pass_threshold?: number;
  one_attempt: boolean;
  show_answers: boolean;
  question_count: number;
  created_at: string;
  created_by: {
    id: number;
    email: string;
  };
  questions: AdminQuestion[];
};

export type AdminQuestion = {
  id: number;
  text: string;
  order_index: number;
  answers: AdminAnswer[];
};

export type AdminAnswer = {
  id: number;
  text: string;
  is_correct: boolean;
  order_index: number;
};

export type PublicQuizDetail = {
  id: number;
  title: string;
  question_count: number;
  pass_threshold?: number;
  one_attempt: boolean;
  completed: boolean;
  questions: PublicQuestion[];
};

export type PublicQuestion = {
  id: number;
  text: string;
  order_index: number;
  answers: PublicAnswer[];
};

export type PublicAnswer = {
  id: number;
  text: string;
  order_index: number;
};

export type SubmitQuizPayload = {
  answers: Array<{
    question_id: number;
    answer_id: number;
  }>;
};

export type QuizResult = {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  score: number;
  total: number;
  percentage: number;
  passed?: boolean;
  show_answers: boolean;
  created_at: string;
  questions?: QuestionResult[];
};

export type QuestionResult = {
  question_id: number;
  text: string;
  correct_answer?: AnswerResult;
  user_answer?: AnswerResult;
  is_correct: boolean;
};

export type AnswerResult = {
  id: number;
  text: string;
};
