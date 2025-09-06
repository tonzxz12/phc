import { Component, OnInit, OnDestroy } from '@angular/core';
import { APIService } from '../../../services/API/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, Observable, Subscription } from 'rxjs';
import { takeUntil, map, switchMap, catchError, tap } from 'rxjs/operators';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import jsPDF from 'jspdf';

interface ProgressStats {
  totalStudents: number;
  activeCourses: number;
  averageProgress: number;
  topPerformers: number;
  totalTimeSpent: number; // Total time spent by all students
  averageTimePerStudent: number; // Average time per student
  // New assessment and assignment stats
  totalAssessments: number;
  totalAssignments: number;
  averageAssessmentScore: number;
  averageAssignmentScore: number;
  completedAssessments: number;
  completedAssignments: number;
}

interface StudentProgress {
  id: string;
  name: string;
  course: string;
  class: string;
  progress: number;
  lastActivity: string;
  grade: string;
  timeSpent: number; // Time spent in minutes
  timeSpentFormatted: string; // Formatted time string
  lessonTimeDetails: LessonTimeDetail[]; // Detailed time per lesson
  showLessonDetails?: boolean; // UI state for expanding lesson details
  // New assessment and assignment data
  assessments: StudentAssessment[];
  assignments: StudentAssignment[];
  showAssessmentDetails?: boolean;
  showAssignmentDetails?: boolean;
}

interface LessonTimeDetail {
  lessonId: number;
  lessonTitle: string;
  timeSpent: number; // Time in minutes
  timeSpentFormatted: string;
  startTime: string;
  endTime: string;
  progress: number;
}

// New interfaces for assessments and assignments
interface StudentAssessment {
  id: string;
  title: string;
  type: string; // 'quiz', 'test', 'exam', etc.
  takenPoints: number;
  totalPoints: number;
  percentage: number;
  attemptNumber: number;
  timestamp: string;
  status: 'completed' | 'in_progress' | 'not_started';
  timeLimit?: number;
  deadline?: string;
}

interface StudentAssignment {
  id: string;
  title: string;
  status: 'submitted' | 'not_submitted' | 'graded';
  submittedAt?: string;
  grade?: string;
  feedback?: string;
  attachments?: string;
  deadline: string;
  isLate: boolean;
}

interface CourseData {
  id: string;
  course: string;
  classes: any[];
  image?: string;
  description?: string;
  lessons?: number;
  code?: string;
  details?: string;
  objectives?: string;
  target_audience?: string;
  technical_requirements?: string;
  filter?: string;
  languageid?: string;
  // New assessment and assignment counts
  assessmentCount?: number;
  assignmentCount?: number;
}

@Component({
  selector: 'app-progress-report',
  templateUrl: './progress-report.component.html',
  styleUrls: ['./progress-report.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ProgressReportComponent implements OnInit, OnDestroy {
  // Subject for handling unsubscriptions
  private destroy$ = new Subject<void>();

  // Loading state flags
  loadingStats = true;
  loadingProgress = true;
  error = false;
  errorMessage = '';

  // Modal state
  showProgressModal = false;
  showExportModal = false;

  // Export options interface
  exportOptions = {
    includeBasicInfo: true,
    includeProgress: true,
    includeAssessments: true,
    includeAssignments: true,
    includeTimeTracking: true,
    minProgress: 0,
    maxProgress: 100,
    includeExcellent: true,
    includeGood: true,
    includeAverage: true,
    includeBelowAverage: true,
    includePoor: true,
    format: 'csv',
    filename: ''
  };

  // Data storage
  statsData: ProgressStats = {
    totalStudents: 0,
    activeCourses: 0,
    averageProgress: 0,
    topPerformers: 0,
    totalTimeSpent: 0,
    averageTimePerStudent: 0,
    totalAssessments: 0,
    totalAssignments: 0,
    averageAssessmentScore: 0,
    averageAssignmentScore: 0,
    completedAssessments: 0,
    completedAssignments: 0
  };

  studentProgress: StudentProgress[] = [];
  currentCourse: CourseData | null = null;
  courses: CourseData[] = [];
  allStudents: any[] = [];

  constructor(private API: APIService) {}

  ngOnInit(): void {
    this.loadTeacherData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTeacherData(): void {
    this.loadingStats = true;
    this.error = false;
    
    // Load courses and students in parallel
    const courses$ = this.API.teacherAllCourses();
    const students$ = this.API.getStudentsTeacher();
    
    courses$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (courseData: any) => {
        if (courseData.success && courseData.output) {
          this.courses = courseData.output.map((course: any) => ({
            id: course.id,
            course: course.course,
            classes: [],
            image: course.image,
            description: course.details,
            lessons: course.lessons,
            code: course.code,
            details: course.details,
            objectives: course.objectives,
            target_audience: course.target_audience,
            technical_requirements: course.technical_requirements,
            filter: course.filter,
            languageid: course.languageid,
            assessmentCount: course.assessmentCount,
            assignmentCount: course.assignmentCount
          }));
          
          // Load classes for each course
          this.loadClassesForCourses();
        } else {
          this.loadingStats = false;
          this.error = true;
          this.errorMessage = 'Failed to load courses.';
        }
      },
      error: (error: any) => {
        console.error('Error loading courses:', error);
        this.API.failedSnackbar('Error loading courses');
        this.loadingStats = false;
        this.error = true;
        this.errorMessage = 'Failed to load courses. Please try again.';
      }
    });

    students$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (studentData: any) => {
        if (studentData.success && studentData.output) {
          this.allStudents = studentData.output;
        }
      },
      error: (error: any) => {
        console.error('Error loading students:', error);
        this.API.failedSnackbar('Error loading students');
      }
    });
  }

  loadClassesForCourses(): void {
    if (this.courses.length === 0) {
      this.loadingStats = false;
      return;
    }

    // Load classes for each course
    const classPromises = this.courses.map(course => 
      this.API.teacherGetClassesByCourse(course.id).toPromise()
    );

    // Load actual lesson count for each course
    const lessonCountPromises = this.courses.map(course => 
      this.getCourseLessonCount(course.id).toPromise()
    );

    // Load assessment and assignment counts for each course
    const assessmentCountPromises = this.courses.map(course => 
      this.getCourseAssessmentCount(course.id).toPromise()
    );

    const assignmentCountPromises = this.courses.map(course => 
      this.getCourseAssignmentCount(course.id).toPromise()
    );

    Promise.all([...classPromises, ...lessonCountPromises, ...assessmentCountPromises, ...assignmentCountPromises]).then((results) => {
      const classResults = results.slice(0, this.courses.length);
      const lessonCountResults = results.slice(this.courses.length, this.courses.length * 2);
      const assessmentCountResults = results.slice(this.courses.length * 2, this.courses.length * 3);
      const assignmentCountResults = results.slice(this.courses.length * 3);

      // Process class results
      classResults.forEach((result, index) => {
        if (result && result.success && result.output) {
          this.courses[index].classes = result.output;
        } else {
          this.courses[index].classes = [];
        }
      });

      // Process lesson count results
      lessonCountResults.forEach((result, index) => {
        if (result && result.success && result.output && result.output.length > 0) {
          this.courses[index].lessons = result.output[0].lesson_count || 0;
        }
      });

      // Process assessment count results
      assessmentCountResults.forEach((result, index) => {
        if (result && result.success && result.output && result.output.length > 0) {
          this.courses[index].assessmentCount = result.output[0].assessment_count || 0;
        }
      });

      // Process assignment count results
      assignmentCountResults.forEach((result, index) => {
        if (result && result.success && result.output && result.output.length > 0) {
          this.courses[index].assignmentCount = result.output[0].assignment_count || 0;
        }
      });

      // Set current course and load progress data
      if (this.courses.length > 0) {
        this.currentCourse = this.courses[0];
        this.loadProgressData();
      }
      this.loadingStats = false;
    }).catch((error) => {
      console.error('Error loading classes or lesson counts:', error);
      this.loadingStats = false;
      this.error = true;
      this.errorMessage = 'Failed to load class or lesson information.';
    });
  }

  getCourseLessonCount(courseId: string): any {
    // Get the actual number of lessons in a course
    const postObject = {
      selectors: [
        'COUNT(lessons.ID) as lesson_count'
      ],
      tables: 'lessons',
      conditions: {
        WHERE: {
          'lessons.CourseID': courseId,
        },
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // New method to get course assessment count
  getCourseAssessmentCount(courseId: string): any {
    const postObject = {
      selectors: [
        'COUNT(assessments.ID) as assessment_count'
      ],
      tables: 'assessments',
      conditions: {
        WHERE: {
          'assessments.CourseID': courseId,
        },
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // New method to get course assignment count
  getCourseAssignmentCount(courseId: string): any {
    const postObject = {
      selectors: [
        'COUNT(assignments.ID) as assignment_count'
      ],
      tables: 'assignments',
      conditions: {
        WHERE: {
          'assignments.CourseID': courseId,
        },
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  loadProgressData(): void {
    if (!this.currentCourse) {
      this.loadingProgress = false;
      return;
    }

    this.loadingProgress = true;
    this.API.showLoader();
    
    try {
      // Filter students for the current course
      const courseStudents = this.allStudents.filter(student => {
        // Check if student is enrolled in any class of the current course
        return this.currentCourse!.classes.some(cls => 
          cls.id === student.class_id
        );
      });

      // Load actual progress data for each student
      this.loadStudentProgressData(courseStudents);
    } catch (error) {
      console.error('Error processing student data:', error);
      this.studentProgress = [];
      this.statsData.totalStudents = 0;
      this.statsData.averageProgress = 0;
      this.statsData.topPerformers = 0;
      this.loadingProgress = false;
      this.API.hideLoader();
    }
  }

  loadStudentProgressData(students: any[]): void {
    if (students.length === 0) {
      this.processStudentData([]);
      this.loadingProgress = false;
      this.API.hideLoader();
      return;
    }

    console.log(`Loading progress for ${students.length} students in course: ${this.currentCourse?.course}`);

    // First, get lesson information for the course
    this.getBasicLessonInfo(this.currentCourse!.id).toPromise().then((lessonData: any) => {
      const lessonTitles: { [key: number]: string } = {};
      if (lessonData && lessonData.success && lessonData.output) {
        console.log('Loaded lesson titles:', lessonData.output);
        lessonData.output.forEach((lesson: any) => {
          lessonTitles[lesson.id] = lesson.title;
        });
      }

      // Load progress data and time tracking for each student
      const studentDataPromises = students.map(async (student) => {
        console.log(`Loading data for student: ${student.FirstName} ${student.LastName} (ID: ${student.ID})`);
        
        try {
          // Load progress data
          const progressData = await this.getStudentCourseProgress(student.ID || student.id, this.currentCourse!.id).toPromise();
          const actualProgress = this.extractProgressFromResponse(progressData);
          
          // Load time tracking data with error handling
          let timeTracking: { totalTime: number, lessonDetails: LessonTimeDetail[] } = { totalTime: 0, lessonDetails: [] };
          try {
            const timeData = await this.getStudentTimeTracking(student.ID || student.id, this.currentCourse!.id).toPromise();
            console.log(`Time tracking data for student ${student.ID}:`, timeData);
            timeTracking = this.processTimeTrackingData(timeData, lessonTitles);
          } catch (timeError) {
            console.warn(`Time tracking failed for student ${student.ID}:`, timeError);
            // Continue without time tracking data
          }

          // Load assessment and assignment data
          let assessments: StudentAssessment[] = [];
          let assignments: StudentAssignment[] = [];
          try {
            assessments = await this.loadStudentAssessments(student.ID || student.id, this.currentCourse!.id);
            assignments = await this.loadStudentAssignments(student.ID || student.id, this.currentCourse!.id);
          } catch (assessmentError) {
            console.warn(`Assessment/Assignment data failed for student ${student.ID}:`, assessmentError);
            // Continue without assessment/assignment data
          }
          
          return {
            ...student,
            actualProgress: actualProgress,
            timeTracking: timeTracking,
            assessments: assessments,
            assignments: assignments
          };
        } catch (error) {
          console.error(`Error loading data for student ${student.ID}:`, error);
          return {
            ...student,
            actualProgress: 0,
            timeTracking: { totalTime: 0, lessonDetails: [] },
            assessments: [],
            assignments: []
          };
        }
      });

      Promise.all(studentDataPromises).then((studentsWithData) => {
        console.log('All student data loaded:', studentsWithData);
        this.processStudentData(studentsWithData);
        this.loadingProgress = false;
        this.API.hideLoader();
      }).catch((error) => {
        console.error('Error loading student data:', error);
        // Fallback to basic data if API fails
        this.processStudentData(students);
        this.loadingProgress = false;
        this.API.hideLoader();
      });
    }).catch((error: any) => {
      console.error('Error loading lesson info:', error);
      // Continue without lesson titles
      this.loadStudentDataWithoutLessonTitles(students);
    });
  }

  loadStudentDataWithoutLessonTitles(students: any[]): void {
    // Fallback method if lesson info fails
    const studentDataPromises = students.map(async (student) => {
      try {
        const progressData = await this.getStudentCourseProgress(student.ID || student.id, this.currentCourse!.id).toPromise();
        const actualProgress = this.extractProgressFromResponse(progressData);
        
        let timeTracking: { totalTime: number, lessonDetails: LessonTimeDetail[] } = { totalTime: 0, lessonDetails: [] };
        try {
          const timeData = await this.getStudentTimeTracking(student.ID || student.id, this.currentCourse!.id).toPromise();
          timeTracking = this.processTimeTrackingData(timeData, {});
        } catch (timeError) {
          console.warn(`Time tracking failed for student ${student.ID}:`, timeError);
        }
        
        return {
          ...student,
          actualProgress: actualProgress,
          timeTracking: timeTracking
        };
      } catch (error) {
        return {
          ...student,
          actualProgress: 0,
          timeTracking: { totalTime: 0, lessonDetails: [] }
        };
      }
    });

    Promise.all(studentDataPromises).then((studentsWithData) => {
      this.processStudentData(studentsWithData);
      this.loadingProgress = false;
      this.API.hideLoader();
    }).catch((error) => {
      console.error('Error loading student data:', error);
      this.processStudentData(students);
      this.loadingProgress = false;
      this.API.hideLoader();
    });
  }

  getStudentCourseProgress(studentId: string, courseId: string): any {
    // Use the same logic as getCourseProgress but for any student
    const postObject = {
      selectors: [
        'SUM(lessons_taken.Progress)',
        'COUNT(lessons.ID) as lessons',
        'student_classes.*',
      ],
      tables: 'student_classes,classes,courses',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.CourseID = courses.ID',
        'LEFT JOIN lessons_taken': `ON lessons_taken.LessonID = lessons.ID AND lessons_taken.StudentID = '${studentId}'`,
        WHERE: {
          'student_classes.StudentID': studentId,
          'student_classes.ClassID': 'classes.ID',
          'classes.CourseID': 'courses.ID',
          'courses.ID': courseId,
        },
        'GROUP BY': 'student_classes.ID, classes.ID, courses.ID',
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getStudentTimeTracking(studentId: string, courseId: string): any {
    // Get time tracking for a student in a specific course
    const postObject = {
      selectors: [
        'lessons_taken.id',
        'lessons_taken.StudentID',
        'lessons_taken.LessonID',
        'lessons_taken.Progress',
        'lessons_taken.starttime',
        'lessons_taken.endtime',
        'lessons.title as lesson_title',
        'lessons.id as lesson_id'
      ],
      tables: 'lessons_taken',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons_taken.LessonID = lessons.ID',
        'LEFT JOIN courses': 'ON lessons.CourseID = courses.ID',
        WHERE: {
          'lessons_taken.StudentID': studentId,
          'courses.ID': courseId,
        },
        'ORDER BY': 'lessons_taken.starttime DESC',
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getAllCourseLessons(courseId: string): any {
    // Get all lessons in a course for comparison
    const postObject = {
      selectors: [
        'lessons.id',
        'lessons.title'
      ],
      tables: 'lessons',
      conditions: {
        WHERE: {
          'lessons.CourseID': courseId,
        },
        'ORDER BY': 'lessons.id ASC',
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getBasicLessonInfo(courseId: string): any {
    // Fallback method to get basic lesson information for the course
    const postObject = {
      selectors: [
        'lessons.id',
        'lessons.title'
      ],
      tables: 'lessons',
      conditions: {
        WHERE: {
          'lessons.CourseID': courseId,
        },
        'ORDER BY': 'lessons.id ASC',
      },
    };

    return this.API.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  calculateTimeSpent(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      
      const diffMs = end.getTime() - start.getTime();
      return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    } catch (error) {
      console.error('Error calculating time spent:', error);
      return 0;
    }
  }

  formatTimeSpent(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}m`;
      }
    }
  }

  formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return 'N/A';
    
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  toggleLessonDetails(student: StudentProgress): void {
    student.showLessonDetails = !student.showLessonDetails;
  }

  // New methods to toggle assessment and assignment details
  toggleAssessmentDetails(student: StudentProgress): void {
    student.showAssessmentDetails = !student.showAssessmentDetails;
  }

  toggleAssignmentDetails(student: StudentProgress): void {
    student.showAssignmentDetails = !student.showAssignmentDetails;
  }

  getCompletedLessonsCount(lessonDetails: LessonTimeDetail[]): number {
    return lessonDetails.filter(lesson => lesson.progress > 0).length;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  getStudentStatusClass(progress: number): string {
    if (progress === 100) return 'status-excellent';
    if (progress >= 80) return 'status-good';
    if (progress >= 60) return 'status-average';
    if (progress >= 40) return 'status-below-average';
    return 'status-poor';
  }

  getStudentStatusIcon(progress: number): string {
    if (progress === 100) return 'bx-check-circle';
    if (progress >= 80) return 'bx-trending-up';
    if (progress >= 60) return 'bx-minus-circle';
    if (progress >= 40) return 'bx-time';
    return 'bx-x-circle';
  }

  getStudentStatusText(progress: number): string {
    if (progress === 100) return 'Excellent';
    if (progress >= 80) return 'Good';
    if (progress >= 60) return 'Average';
    if (progress >= 40) return 'Below Avg';
    return 'Poor';
  }

  extractProgressFromResponse(progressData: any): number {
    try {
      console.log('Progress data for student:', progressData);
      
      if (progressData && progressData.success && progressData.output && progressData.output.length > 0) {
        const data = progressData.output[0];
        console.log('Extracted progress data:', data);
        
        // Use the same logic as student dashboard
        let progress = 0;
        if (data.sum != null && data.lessons != null) {
          progress = Number((Number(data.sum) / (Number(data.lessons) * 100)).toFixed(4)) * 100;
          console.log(`Calculated progress: ${progress}% (sum: ${data.sum}, lessons: ${data.lessons})`);
        } else {
          console.log('No progress data found in response');
          progress = 0;
        }
        
        return progress;
      }
      
      console.log('No valid progress data found, returning 0');
      return 0;
    } catch (error) {
      console.error('Error extracting progress:', error);
      return 0;
    }
  }

  processStudentData(students: any[]): void {
    try {
      this.statsData.totalStudents = students.length;
      this.statsData.activeCourses = this.courses.length;
      
      // Process student progress data
      this.studentProgress = students.map(student => ({
        id: student.ID || student.id || 'unknown',
        name: `${student.FirstName || student.firstname || 'Unknown'} ${student.LastName || student.lastname || 'Student'}`,
        course: this.currentCourse?.course || 'Unknown Course',
        class: student.class || 'Unknown Class',
        progress: student.actualProgress !== undefined ? student.actualProgress : this.calculateStudentProgress(student),
        lastActivity: this.formatLastActivity(student.lastseen),
        grade: this.getStudentGrade(student),
        timeSpent: student.timeTracking?.totalTime || 0,
        timeSpentFormatted: this.formatTimeSpent(student.timeTracking?.totalTime || 0),
        lessonTimeDetails: student.timeTracking?.lessonDetails || [],
        showLessonDetails: false, // Initialize as collapsed
        assessments: student.assessments || [], // Initialize new fields
        assignments: student.assignments || [], // Initialize new fields
        showAssessmentDetails: false, // Initialize new fields
        showAssignmentDetails: false // Initialize new fields
      }));

      // Calculate average progress
      if (this.studentProgress.length > 0) {
        const totalProgress = this.studentProgress.reduce((sum, student) => sum + student.progress, 0);
        this.statsData.averageProgress = Math.round(totalProgress / this.studentProgress.length);
      }

      // Count top performers (students with progress > 80%)
      this.statsData.topPerformers = this.studentProgress.filter(student => student.progress > 80).length;

      // Calculate time statistics
      if (this.studentProgress.length > 0) {
        const totalTimeSpent = this.studentProgress.reduce((sum, student) => sum + student.timeSpent, 0);
        this.statsData.totalTimeSpent = totalTimeSpent;
        this.statsData.averageTimePerStudent = Math.round(totalTimeSpent / this.studentProgress.length);
      }

      // Calculate assessment and assignment statistics
      this.calculateAssessmentAssignmentStats();
    } catch (error) {
      console.error('Error processing student data:', error);
      this.studentProgress = [];
      this.statsData.totalStudents = 0;
      this.statsData.averageProgress = 0;
      this.statsData.topPerformers = 0;
      this.statsData.totalTimeSpent = 0;
      this.statsData.averageTimePerStudent = 0;
      this.statsData.totalAssessments = 0;
      this.statsData.totalAssignments = 0;
      this.statsData.averageAssessmentScore = 0;
      this.statsData.averageAssignmentScore = 0;
      this.statsData.completedAssessments = 0;
      this.statsData.completedAssignments = 0;
    }
  }

  // New method to calculate assessment and assignment statistics
  calculateAssessmentAssignmentStats(): void {
    try {
      let totalAssessmentScores = 0;
      let totalAssignmentScores = 0;
      let completedAssessmentCount = 0;
      let completedAssignmentCount = 0;
      let totalAssessments = 0;
      let totalAssignments = 0;

      this.studentProgress.forEach(student => {
        // Assessment statistics
        if (student.assessments && student.assessments.length > 0) {
          totalAssessments += student.assessments.length;
          student.assessments.forEach(assessment => {
            if (assessment.status === 'completed') {
              completedAssessmentCount++;
              totalAssessmentScores += assessment.percentage;
            }
          });
        }

        // Assignment statistics
        if (student.assignments && student.assignments.length > 0) {
          totalAssignments += student.assignments.length;
          student.assignments.forEach(assignment => {
            if (assignment.status === 'submitted' || assignment.status === 'graded') {
              completedAssignmentCount++;
              if (assignment.grade && assignment.grade !== 'N/A') {
                // Try to parse grade as percentage
                const gradeValue = parseFloat(assignment.grade);
                if (!isNaN(gradeValue)) {
                  totalAssignmentScores += gradeValue;
                }
              }
            }
          });
        }
      });

      // Update stats
      this.statsData.totalAssessments = totalAssessments;
      this.statsData.totalAssignments = totalAssignments;
      this.statsData.completedAssessments = completedAssessmentCount;
      this.statsData.completedAssignments = completedAssignmentCount;
      
      this.statsData.averageAssessmentScore = completedAssessmentCount > 0 
        ? Math.round((totalAssessmentScores / completedAssessmentCount) * 100) / 100
        : 0;
      
      this.statsData.averageAssignmentScore = completedAssignmentCount > 0 
        ? Math.round((totalAssignmentScores / completedAssignmentCount) * 100) / 100
        : 0;

      console.log('Assessment/Assignment stats calculated:', {
        totalAssessments: this.statsData.totalAssessments,
        totalAssignments: this.statsData.totalAssignments,
        completedAssessments: this.statsData.completedAssessments,
        completedAssignments: this.statsData.completedAssignments,
        averageAssessmentScore: this.statsData.averageAssessmentScore,
        averageAssignmentScore: this.statsData.averageAssignmentScore
      });
    } catch (error) {
      console.error('Error calculating assessment/assignment stats:', error);
    }
  }

  calculateStudentProgress(student: any): number {
    try {
      // Fallback progress calculation - only used if actual progress data is unavailable
      let progress = 0;
      
      // Basic profile completion (40%)
      if (student.profile && student.profile.trim() !== '') progress += 10;
      if (student.email && student.email.trim() !== '') progress += 10;
      if (student.gender && student.gender.trim() !== '') progress += 10;
      if (student.nationality && student.nationality.trim() !== '') progress += 10;
      
      // Activity indicators (40%)
      if (student.lastseen) {
        const lastSeen = new Date(student.lastseen);
        const now = new Date();
        const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastSeen <= 1) progress += 20;      // Very recent activity
        else if (daysSinceLastSeen <= 7) progress += 15;  // Recent activity
        else if (daysSinceLastSeen <= 30) progress += 10; // Somewhat recent
        else if (daysSinceLastSeen <= 90) progress += 5;  // Not very recent
      }
      
      // Additional profile fields (20%)
      if (student.address && student.address.trim() !== '') progress += 10;
      if (student.birthdate) progress += 10;
      
      return Math.min(progress, 100); // Ensure progress doesn't exceed 100%
    } catch (error) {
      console.error('Error calculating student progress:', error);
      return 0;
    }
  }

  getStudentGrade(student: any): string {
    try {
      // Try to get actual grade from student data
      if (student.grade && student.grade !== 'N/A') {
        return student.grade;
      }
      
      // You can enhance this by checking actual grade data from assignments, quizzes, etc.
      // For now, return N/A as placeholder
      return 'N/A';
    } catch (error) {
      console.error('Error getting student grade:', error);
      return 'N/A';
    }
  }

  formatLastActivity(lastActivity: string): string {
    if (!lastActivity) return 'Never';
    
    try {
      const date = new Date(lastActivity);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      if (diffInHours < 48) return 'Yesterday';
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  }

  selectCourse(course: CourseData): void {
    this.currentCourse = course;
    this.loadProgressData();
  }

  openProgressModal(course: CourseData): void {
    this.currentCourse = course;
    this.showProgressModal = true;
    this.loadProgressData();
  }

  closeProgressModal(): void {
    this.showProgressModal = false;
    this.currentCourse = null;
    // Reset data when closing modal
    this.studentProgress = [];
    this.statsData = {
      totalStudents: 0,
      activeCourses: 0,
      averageProgress: 0,
      topPerformers: 0,
      totalTimeSpent: 0,
      averageTimePerStudent: 0,
      totalAssessments: 0,
      totalAssignments: 0,
      averageAssessmentScore: 0,
      averageAssignmentScore: 0,
      completedAssessments: 0,
      completedAssignments: 0
    };
  }

  // Export modal methods
  openExportModal(): void {
    this.showExportModal = true;
    // Set default filename if empty
    if (!this.exportOptions.filename) {
      this.exportOptions.filename = `progress_report_${this.currentCourse?.course || 'course'}_${new Date().toISOString().split('T')[0]}`;
    }
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  getFilenamePreview(): string {
    const filename = this.exportOptions.filename || 'progress_report';
    let extension = '';
    
    switch (this.exportOptions.format) {
      case 'csv':
        extension = '.csv';
        break;
      case 'json':
        extension = '.json';
        break;
      case 'pdf':
        extension = '.pdf';
        break;
      default:
        extension = '.csv';
    }
    
    return `${filename}${extension}`;
  }

  canExport(): boolean {
    return this.exportOptions.filename.trim().length > 0 && 
           (this.exportOptions.includeBasicInfo || 
            this.exportOptions.includeProgress || 
            this.exportOptions.includeAssessments || 
            this.exportOptions.includeAssignments || 
            this.exportOptions.includeTimeTracking);
  }

  executeExport(): void {
    if (!this.canExport()) {
      this.API.failedSnackbar('Please configure export options');
      return;
    }

    try {
      const filteredData = this.getFilteredExportData();
      
      if (filteredData.length === 0) {
        this.API.failedSnackbar('No data matches the selected filters');
        return;
      }

      if (this.exportOptions.format === 'csv') {
        this.exportToCSV(filteredData);
      } else if (this.exportOptions.format === 'json') {
        this.exportToJSON(filteredData);
      } else if (this.exportOptions.format === 'pdf') {
        this.exportToPDF(filteredData);
      }

      this.closeExportModal();
      this.API.successSnackbar('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.API.failedSnackbar('Failed to export data');
    }
  }

  getFilteredExportData(): any[] {
    let filteredStudents = this.studentProgress;

    // Filter by progress range
    if (this.exportOptions.minProgress > 0 || this.exportOptions.maxProgress < 100) {
      filteredStudents = filteredStudents.filter(student => 
        student.progress >= this.exportOptions.minProgress && 
        student.progress <= this.exportOptions.maxProgress
      );
    }

    // Filter by status
    const statusFilters: string[] = [];
    if (this.exportOptions.includeExcellent) statusFilters.push('excellent');
    if (this.exportOptions.includeGood) statusFilters.push('good');
    if (this.exportOptions.includeAverage) statusFilters.push('average');
    if (this.exportOptions.includeBelowAverage) statusFilters.push('below-average');
    if (this.exportOptions.includePoor) statusFilters.push('poor');

    if (statusFilters.length < 5) {
      filteredStudents = filteredStudents.filter(student => {
        const status = this.getStudentStatusClass(student.progress).replace('status-', '');
        return statusFilters.includes(status);
      });
    }

    return filteredStudents;
  }

  exportToCSV(data: any[]): void {
    const headers = this.getCSVHeaders();
    const rows = data.map(student => this.getCSVRow(student));
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    this.downloadFile(csvContent, 'text/csv;charset=utf-8;');
  }

  exportToJSON(data: any[]): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, 'application/json');
  }

  exportToPDF(data: any[]): void {
    try {
      // Generate real PDF using jsPDF
      this.generatePDFDocument(data);
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.API.failedSnackbar('Failed to generate PDF. Please try again.');
    }
  }

  generatePDFDocument(data: any[]): void {
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: `Progress Report - ${this.currentCourse?.course || 'Course'}`,
      subject: 'Student Progress Report',
      author: 'Harfai LMS',
      creator: 'Harfai LMS System'
    });

    // Add header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PROGRESS REPORT', 105, 20, { align: 'center' });
    
    // Course and date info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Course: ${this.currentCourse?.course || 'Unknown Course'}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Summary statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY STATISTICS', 20, 65);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Students: ${this.statsData.totalStudents}`, 20, 80);
    doc.text(`Average Progress: ${this.statsData.averageProgress}%`, 20, 90);
    doc.text(`Top Performers: ${this.statsData.topPerformers}`, 20, 100);
    doc.text(`Total Assessments: ${this.statsData.totalAssessments}`, 20, 110);
    doc.text(`Total Assignments: ${this.statsData.totalAssignments}`, 20, 120);
    
    // Student details table
    let yPosition = 140;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT DETAILS', 20, yPosition);
    yPosition += 15;
    
    // Define table columns and widths - ensure they fit within page
    const pageWidth = 210; // A4 width in mm
    const leftMargin = 20;
    const rightMargin = 20;
    const availableWidth = pageWidth - leftMargin - rightMargin;
    
    // Base columns with adjusted widths to fit page
    const columns = ['No.', 'Name', 'Class', 'Progress', 'Status'];
    const columnWidths = [15, 40, 30, 25, 30];
    
    // Add additional columns based on export options
    if (this.exportOptions.includeTimeTracking) {
      columns.push('Time', 'Last Activity');
      columnWidths.push(25, 35);
    }
    if (this.exportOptions.includeAssessments) {
      columns.push('Assessments');
      columnWidths.push(35);
    }
    if (this.exportOptions.includeAssignments) {
      columns.push('Assignments');
      columnWidths.push(35);
    }
    
    // Adjust column widths to fit page
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth > availableWidth) {
      // Scale down proportionally
      const scale = availableWidth / totalWidth;
      columnWidths.forEach((width, index) => {
        columnWidths[index] = Math.floor(width * scale);
      });
    }
    
    const startX = leftMargin;
    
    // Draw table header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(248, 248, 248); // Light gray instead of black
    
    let currentX = startX;
    columns.forEach((column, index) => {
      // Header cell background - light gray with border
      doc.setFillColor(248, 248, 248);
      doc.rect(currentX, yPosition - 5, columnWidths[index], 8, 'F');
      // Add border for better visibility
      doc.setDrawColor(200, 200, 200);
      doc.rect(currentX, yPosition - 5, columnWidths[index], 8, 'S');
      
      // Header text - center align and use full text
      doc.setFillColor(50, 50, 50); // Dark text for better contrast
      doc.text(column, currentX + (columnWidths[index] / 2), yPosition, { align: 'center' });
      currentX += columnWidths[index];
    });
    
    yPosition += 10;
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8); // Smaller font to fit more content
    
    data.forEach((student, index) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
        
        // Redraw header on new page
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(248, 248, 248);
        currentX = startX;
        columns.forEach((column, colIndex) => {
          doc.setFillColor(248, 248, 248);
          doc.rect(currentX, yPosition - 5, columnWidths[colIndex], 8, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(currentX, yPosition - 5, columnWidths[colIndex], 8, 'S');
          doc.setFillColor(50, 50, 50);
          doc.text(column, currentX + (columnWidths[colIndex] / 2), yPosition, { align: 'center' });
          currentX += columnWidths[colIndex];
        });
        yPosition += 10;
        doc.setFont('helvetica', 'normal');
      }
      
      // Row background (alternating colors)
      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 248);
      doc.rect(startX, yPosition - 5, totalWidth, 8, 'F');
      
      // Draw row data
      currentX = startX;
      
      // No.
      doc.text(`${index + 1}`, currentX + (columnWidths[0] / 2), yPosition, { align: 'center' });
      currentX += columnWidths[0];
      
      // Name - truncate if too long
      const nameText = student.name.length > 15 ? student.name.substring(0, 15) + '...' : student.name;
      doc.text(nameText, currentX + 2, yPosition);
      currentX += columnWidths[1];
      
      // Class - truncate if too long
      const classText = student.class.length > 12 ? student.class.substring(0, 12) + '...' : student.class;
      doc.text(classText, currentX + 2, yPosition);
      currentX += columnWidths[2];
      
      // Progress
      doc.text(`${student.progress}%`, currentX + (columnWidths[3] / 2), yPosition, { align: 'center' });
      currentX += columnWidths[3];
      
      // Status - truncate if too long
      const statusText = this.getStudentStatusText(student.progress);
      const truncatedStatus = statusText.length > 12 ? statusText.substring(0, 12) + '...' : statusText;
      doc.text(truncatedStatus, currentX + 2, yPosition);
      currentX += columnWidths[4];
      
      // Time Tracking (if enabled)
      if (this.exportOptions.includeTimeTracking) {
        const timeText = (student.timeSpentFormatted || '0m').length > 6 ? '0m' : (student.timeSpentFormatted || '0m');
        doc.text(timeText, currentX + (columnWidths[5] / 2), yPosition, { align: 'center' });
        currentX += columnWidths[5];
        
        const activityText = (student.lastActivity || 'N/A').length > 10 ? 'N/A' : (student.lastActivity || 'N/A');
        doc.text(activityText, currentX + 2, yPosition);
        currentX += columnWidths[6];
      }
      
      // Assessments (if enabled)
      if (this.exportOptions.includeAssessments) {
        const assessmentCount = student.assessments?.length || 0;
        const avgAssessmentScore = this.getAverageAssessmentScore(student.assessments);
        const assessmentText = `${assessmentCount} done, ${avgAssessmentScore}%`;
        doc.text(assessmentText, currentX + 2, yPosition);
        currentX += columnWidths[this.exportOptions.includeTimeTracking ? 7 : 5];
      }
      
      // Assignments (if enabled)
      if (this.exportOptions.includeAssignments) {
        const assignmentCount = this.getCompletedAssignmentCount(student.assignments);
        const avgAssignmentScore = this.getAverageAssignmentScore(student.assignments);
        const assignmentText = `${assignmentCount} done, ${avgAssignmentScore}%`;
        doc.text(assignmentText, currentX + 2, yPosition);
        currentX += columnWidths[this.exportOptions.includeTimeTracking ? (this.exportOptions.includeAssessments ? 8 : 7) : (this.exportOptions.includeAssessments ? 6 : 5)];
      }
      
      yPosition += 10;
    });
    
    // Save the PDF
    const filename = this.getFilenamePreview();
    doc.save(filename);
  }

  generatePDFContent(data: any[]): string {
    // This method is no longer needed
    return '';
  }

  generateBasicPDF(data: any[]): void {
    // This method is no longer needed
  }

  generatePDFText(data: any[]): string {
    let content = '';
    
    // Header
    content += `PROGRESS REPORT\n`;
    content += `Course: ${this.currentCourse?.course || 'Unknown Course'}\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n`;
    content += `\n`.repeat(2);
    
    // Summary Statistics
    content += `SUMMARY STATISTICS\n`;
    content += `==================\n`;
    content += `Total Students: ${this.statsData.totalStudents}\n`;
    content += `Average Progress: ${this.statsData.averageProgress}%\n`;
    content += `Top Performers: ${this.statsData.topPerformers}\n`;
    content += `Total Assessments: ${this.statsData.totalAssessments}\n`;
    content += `Total Assignments: ${this.statsData.totalAssignments}\n`;
    content += `\n`.repeat(2);
    
    // Student Data
    content += `STUDENT DETAILS\n`;
    content += `===============\n`;
    
    data.forEach((student, index) => {
      content += `${index + 1}. ${student.name}\n`;
      content += `   Class: ${student.class}\n`;
      content += `   Progress: ${student.progress}%\n`;
      content += `   Status: ${this.getStudentStatusText(student.progress)}\n`;
      
      if (this.exportOptions.includeTimeTracking) {
        content += `   Time Spent: ${student.timeSpentFormatted}\n`;
        content += `   Last Activity: ${student.lastActivity}\n`;
      }
      
      if (this.exportOptions.includeAssessments) {
        const assessmentCount = student.assessments?.length || 0;
        const avgAssessmentScore = this.getAverageAssessmentScore(student.assessments);
        content += `   Assessments: ${assessmentCount} completed, ${avgAssessmentScore}% avg score\n`;
      }
      
      if (this.exportOptions.includeAssignments) {
        const assignmentCount = this.getCompletedAssignmentCount(student.assignments);
        const avgAssignmentScore = this.getAverageAssignmentScore(student.assignments);
        content += `   Assignments: ${assignmentCount} submitted, ${avgAssignmentScore}% avg score\n`;
      }
      
      content += `\n`;
    });
    
    return content;
  }

  getCSVHeaders(): string[] {
    const headers = [];
    
    if (this.exportOptions.includeBasicInfo) {
      headers.push('Student Name', 'Course', 'Class');
    }
    if (this.exportOptions.includeProgress) {
      headers.push('Progress (%)', 'Status');
    }
    if (this.exportOptions.includeTimeTracking) {
      headers.push('Time Spent', 'Last Activity');
    }
    if (this.exportOptions.includeAssessments) {
      headers.push('Assessments Completed', 'Average Assessment Score (%)');
    }
    if (this.exportOptions.includeAssignments) {
      headers.push('Assignments Submitted', 'Average Assignment Score (%)');
    }

    return headers;
  }

  getCSVRow(student: any): any[] {
    const row = [];
    
    if (this.exportOptions.includeBasicInfo) {
      row.push(student.name, student.course, student.class);
    }
    if (this.exportOptions.includeProgress) {
      row.push(student.progress, this.getStudentStatusText(student.progress));
    }
    if (this.exportOptions.includeTimeTracking) {
      row.push(student.timeSpentFormatted, student.lastActivity);
    }
    if (this.exportOptions.includeAssessments) {
      const assessmentCount = student.assessments?.length || 0;
      const avgAssessmentScore = this.getAverageAssessmentScore(student.assessments);
      row.push(assessmentCount, avgAssessmentScore);
    }
    if (this.exportOptions.includeAssignments) {
      const assignmentCount = this.getCompletedAssignmentCount(student.assignments);
      const avgAssignmentScore = this.getAverageAssignmentScore(student.assignments);
      row.push(assignmentCount, avgAssignmentScore);
    }

    return row;
  }

  downloadFile(content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', this.getFilenamePreview());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportProgressData(): void {
    if (this.studentProgress.length === 0) {
      this.API.failedSnackbar('No data to export');
      return;
    }

    try {
      // Create CSV content
      const csvContent = this.generateCSV();
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `progress_report_${this.currentCourse?.course}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.API.successSnackbar('Progress data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.API.failedSnackbar('Failed to export data');
    }
  }

  generateCSV(): string {
    const headers = [
      'Student Name', 
      'Course', 
      'Class', 
      'Progress (%)', 
      'Time Spent', 
      'Last Activity', 
      'Grade',
      'Assessments Completed',
      'Average Assessment Score (%)',
      'Assignments Submitted',
      'Average Assignment Score (%)'
    ];
    
    const rows = this.studentProgress.map(student => {
      const assessmentCount = student.assessments?.length || 0;
      const avgAssessmentScore = student.assessments && student.assessments.length > 0 
        ? Math.round((student.assessments.reduce((sum, a) => sum + a.percentage, 0) / student.assessments.length) * 100) / 100
        : 0;
      const assignmentCount = student.assignments?.filter(a => a.status === 'submitted' || a.status === 'graded').length || 0;
      const avgAssignmentScore = student.assignments && student.assignments.length > 0 
        ? this.calculateAverageAssignmentScore(student.assignments)
        : 0;

      return [
      student.name,
      student.course,
      student.class,
      student.progress,
      student.timeSpentFormatted,
      student.lastActivity,
        student.grade,
        assessmentCount,
        avgAssessmentScore,
        assignmentCount,
        avgAssignmentScore
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Helper method to calculate average assignment score
  private calculateAverageAssignmentScore(assignments: StudentAssignment[]): number {
    const gradedAssignments = assignments.filter(a => a.grade && a.grade !== 'N/A');
    if (gradedAssignments.length === 0) return 0;
    
    const totalScore = gradedAssignments.reduce((sum, assignment) => {
      const gradeValue = parseFloat(assignment.grade || '0');
      return sum + (isNaN(gradeValue) ? 0 : gradeValue);
    }, 0);
    
    return Math.round(totalScore / gradedAssignments.length);
  }

  // Helper methods for HTML template
  getAverageAssessmentScore(assessments: StudentAssessment[]): number {
    if (!assessments || assessments.length === 0) return 0;
    const average = assessments.reduce((sum, a) => sum + a.percentage, 0) / assessments.length;
    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  getCompletedAssignmentCount(assignments: StudentAssignment[]): number {
    if (!assignments || assignments.length === 0) return 0;
    return assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length;
  }

  getCompletedAssessmentCount(assessments: StudentAssessment[]): number {
    if (!assessments || assessments.length === 0) return 0;
    return assessments.filter(a => a.status === 'completed').length;
  }

  getAverageAssignmentScore(assignments: StudentAssignment[]): number {
    return this.calculateAverageAssignmentScore(assignments);
  }

  getCourseImage(imagePath: string): string {
    if (imagePath && imagePath.includes('http')) {
      return imagePath;
    } else if (imagePath) {
      return this.API.getURL(imagePath);
    }
    return '';
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#27ae60';
    if (progress >= 60) return '#f39c12';
    if (progress >= 40) return '#e67e22';
    return '#e74c3c';
  }

  retry(): void {
    this.error = false;
    this.errorMessage = '';
    this.loadTeacherData();
  }

  processTimeTrackingData(timeData: any, lessonTitles: { [key: number]: string }): { totalTime: number, lessonDetails: LessonTimeDetail[] } {
    try {
      if (!timeData || !timeData.success || !timeData.output) {
        console.log('No time tracking data available');
        return { totalTime: 0, lessonDetails: [] };
      }

      console.log('Processing time tracking data:', timeData.output);
      let totalTime = 0;
      const lessonDetails: LessonTimeDetail[] = [];

      // Process taken lessons
      timeData.output.forEach((entry: any) => {
        console.log('Processing lesson entry:', entry);
        const timeSpent = this.calculateTimeSpent(entry.starttime, entry.endtime);
        totalTime += timeSpent;

        const lessonTitle = entry.lesson_title || lessonTitles[entry.lesson_id || entry.LessonID] || `Lesson ${entry.lesson_id || entry.LessonID || 'Unknown'}`;
        console.log(`Lesson ${entry.lesson_id || entry.LessonID}: "${lessonTitle}"`);

        lessonDetails.push({
          lessonId: entry.lesson_id || entry.LessonID || 0,
          lessonTitle: lessonTitle,
          timeSpent: timeSpent,
          timeSpentFormatted: this.formatTimeSpent(timeSpent),
          startTime: entry.starttime || '',
          endTime: entry.endtime || '',
          progress: entry.Progress || 0
        });
      });

      console.log('Final lesson details:', lessonDetails);
      return { totalTime, lessonDetails };
    } catch (error) {
      console.error('Error processing time tracking data:', error);
      return { totalTime: 0, lessonDetails: [] };
    }
  }

  // New method to load student assessments
  async loadStudentAssessments(studentId: string, courseId: string): Promise<StudentAssessment[]> {
    try {
      const postObject = {
        selectors: [
          'assessments.id',
          'assessments.title',
          'assessments.timelimit',
          'assessments.deadline',
          'student_assessments.takenpoints',
          'student_assessments.totalpoints',
          'student_assessments.attempt_number',
          'student_assessments.timestamp'
        ],
        tables: 'assessments, student_assessments',
        conditions: {
          WHERE: {
            'assessments.id': 'student_assessments.assessmentid',
            'student_assessments.studentid': studentId,
            'assessments.courseid': courseId
          },
          'ORDER BY': 'student_assessments.timestamp DESC'
        }
      };

      const response = await this.API.post('get_entries', {
        data: JSON.stringify(postObject)
      }).toPromise();

      if (response && response.success && response.output) {
        return response.output.map((item: any) => ({
          id: item.id,
          title: item.title,
          type: 'quiz', // Default type
          takenPoints: item.takenpoints || 0,
          totalPoints: item.totalpoints || 10,
          percentage: item.totalpoints > 0 ? Math.round((item.takenpoints / item.totalpoints) * 10000) / 100 : 0, // Round to 2 decimal places
          attemptNumber: item.attempt_number || 1,
          timestamp: item.timestamp,
          status: 'completed',
          timeLimit: item.timelimit,
          deadline: item.deadline
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading student assessments:', error);
      return [];
    }
  }

  // New method to load student assignments
  async loadStudentAssignments(studentId: string, courseId: string): Promise<StudentAssignment[]> {
    try {
      const postObject = {
        selectors: [
          'assignments.id',
          'assignments.title',
          'assignments.deadline',
          'student_assignments.attachments',
          'student_assignments.comments',
          'student_assignments.grade',
          'student_assignments.feedback',
          'student_assignments.time'
        ],
        tables: 'assignments, student_assignments',
        conditions: {
          WHERE: {
            'assignments.id': 'student_assignments.assignmentid',
            'student_assignments.studentid': studentId,
            'assignments.courseid': courseId
          },
          'ORDER BY': 'assignments.deadline ASC'
        }
      };

      const response = await this.API.post('get_entries', {
        data: JSON.stringify(postObject)
      }).toPromise();

      if (response && response.success && response.output) {
        return response.output.map((item: any) => {
          const deadline = new Date(item.deadline);
          const submittedAt = item.time ? new Date(item.time) : null;
          const isLate = submittedAt && submittedAt > deadline;
          
          return {
            id: item.id,
            title: item.title,
            status: item.grade ? 'graded' : (item.attachments ? 'submitted' : 'not_submitted'),
            submittedAt: item.time,
            grade: item.grade || '',
            feedback: item.feedback || '',
            attachments: item.attachments || '',
            deadline: item.deadline,
            isLate: isLate
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Error loading student assignments:', error);
      return [];
    }
  }
}
