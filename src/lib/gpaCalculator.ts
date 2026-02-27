import { SubjectWithResult, GPACalculation, GPAFilter } from '@/types';

export class GPACalculator {
  /**
   * Calculate GPA for given subjects
   */
  static calculate(
    subjects: SubjectWithResult[],
    includeIncomplete: boolean = false
  ): GPACalculation {
    let totalCredits = 0;
    let weightedSum = 0;
    let completedCredits = 0;

    const filteredSubjects = subjects.filter(subject => {
      if (!subject.result) return false;
      if (subject.result.status === 'Incomplete' && !includeIncomplete) {
        return false;
      }
      return true;
    });

    filteredSubjects.forEach(subject => {
      const credits = subject.credits;
      const gradePoint = subject.result!.grade_point;
      
      totalCredits += credits;
      weightedSum += credits * gradePoint;
      
      if (subject.result!.status === 'Completed') {
        completedCredits += credits;
      }
    });

    const gpa = totalCredits > 0 ? weightedSum / totalCredits : 0;

    return {
      gpa: parseFloat(gpa.toFixed(2)),
      totalCredits: parseFloat(totalCredits.toFixed(1)),
      completedCredits: parseFloat(completedCredits.toFixed(1)),
      subjects: filteredSubjects
    };
  }

  /**
   * Calculate Semester GPA
   */
  static calculateSemesterGPA(
    subjects: SubjectWithResult[],
    year: number,
    semester: number,
    includeIncomplete: boolean = false
  ): GPACalculation {
    const semesterSubjects = subjects.filter(
      s => s.year === year && s.semester === semester
    );
    return this.calculate(semesterSubjects, includeIncomplete);
  }

  /**
   * Calculate Year GPA (all semesters in a year)
   */
  static calculateYearGPA(
    subjects: SubjectWithResult[],
    year: number,
    includeIncomplete: boolean = false
  ): GPACalculation {
    const yearSubjects = subjects.filter(s => s.year === year);
    return this.calculate(yearSubjects, includeIncomplete);
  }

  /**
   * Calculate Multi-Year GPA
   */
  static calculateMultiYearGPA(
    subjects: SubjectWithResult[],
    years: number[],
    includeIncomplete: boolean = false
  ): GPACalculation {
    const multiYearSubjects = subjects.filter(s => years.includes(s.year));
    return this.calculate(multiYearSubjects, includeIncomplete);
  }

  /**
   * Calculate Cumulative GPA (all subjects)
   */
  static calculateCumulativeGPA(
    subjects: SubjectWithResult[],
    includeIncomplete: boolean = false
  ): GPACalculation {
    return this.calculate(subjects, includeIncomplete);
  }

  /**
   * Get available years from subjects
   */
  static getAvailableYears(subjects: SubjectWithResult[]): number[] {
    const years = new Set(subjects.map(s => s.year));
    return Array.from(years).sort();
  }

  /**
   * Get available semesters for a year
   */
  static getAvailableSemesters(
    subjects: SubjectWithResult[],
    year: number
  ): number[] {
    const semesters = new Set(
      subjects.filter(s => s.year === year).map(s => s.semester)
    );
    return Array.from(semesters).sort();
  }

  /**
   * Get GPA breakdown by year and semester
   */
  static getGPABreakdown(
    subjects: SubjectWithResult[],
    includeIncomplete: boolean = false
  ) {
    const years = this.getAvailableYears(subjects);
    
    return years.map(year => {
      const semesters = this.getAvailableSemesters(subjects, year);
      
      return {
        year,
        yearGPA: this.calculateYearGPA(subjects, year, includeIncomplete),
        semesters: semesters.map(semester => ({
          semester,
          semesterGPA: this.calculateSemesterGPA(
            subjects,
            year,
            semester,
            includeIncomplete
          )
        }))
      };
    });
  }
}
