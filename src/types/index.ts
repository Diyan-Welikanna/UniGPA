export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export interface Subject {
  id: number;
  user_id: number;
  subject_name: string;
  credits: number;
  year: number;
  semester: number;
  created_at: Date;
  updated_at: Date;
}

export interface Result {
  id: number;
  subject_id: number;
  grade_point: number;
  status: 'Completed' | 'Incomplete';
  created_at: Date;
  updated_at: Date;
}

export interface SubjectWithResult extends Subject {
  result?: Result;
}

export interface GPACalculation {
  gpa: number;
  totalCredits: number;
  completedCredits: number;
  subjects: SubjectWithResult[];
}

export interface GPAFilter {
  years?: number[];
  semesters?: number[];
  includeIncomplete?: boolean;
}
