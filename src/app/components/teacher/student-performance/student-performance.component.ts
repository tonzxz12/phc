import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';

interface Student {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: 'active' | 'inactive';
}

interface TestScore {
  studentId: number;
  studentName: string;
  testName: string;
  score: number;
  maxScore: number;
  percentage: number;
  date: Date;
  status: 'passed' | 'failed' | 'pending';
}

interface Assessment {
  id: number;
  name: string;
  type: 'quiz' | 'assignment' | 'exam' | 'project';
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  dueDate: Date;
}

interface StudentActivity {
  studentId: number;
  studentName: string;
  loginCount: number;
  lastLogin: Date;
  attendanceRate: number;
  participationScore: number;
  assignmentsCompleted: number;
  totalAssignments: number;
}

@Component({
  selector: 'app-student-performance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressBarModule,
    MatExpansionModule
  ],
  templateUrl: './student-performance.component.html'
})
export class StudentPerformanceComponent implements OnInit {
  selectedTab = 0;
  selectedClass = '';
  selectedDateRange = '';
  selectedAssessment = '';
  
  filterForm: FormGroup;

  // Mock data
  classes = ['Class 10A', 'Class 10B', 'Class 11A', 'Class 11B', 'Class 12A'];
  dateRanges = ['Last 7 days', 'Last 30 days', 'Last 3 months', 'This semester', 'Custom'];
  assessments: Assessment[] = [
    { id: 1, name: 'Midterm Exam', type: 'exam', totalStudents: 25, averageScore: 78.5, completionRate: 100, dueDate: new Date('2024-01-15') },
    { id: 2, name: 'Grammar Quiz', type: 'quiz', totalStudents: 25, averageScore: 85.2, completionRate: 96, dueDate: new Date('2024-01-10') },
    { id: 3, name: 'Essay Assignment', type: 'assignment', totalStudents: 25, averageScore: 82.0, completionRate: 88, dueDate: new Date('2024-01-20') },
    { id: 4, name: 'Final Project', type: 'project', totalStudents: 25, averageScore: 89.5, completionRate: 92, dueDate: new Date('2024-02-01') }
  ];

  testScores: TestScore[] = [
    { studentId: 1, studentName: 'John Smith', testName: 'Midterm Exam', score: 85, maxScore: 100, percentage: 85, date: new Date('2024-01-15'), status: 'passed' },
    { studentId: 2, studentName: 'Emma Wilson', testName: 'Midterm Exam', score: 92, maxScore: 100, percentage: 92, date: new Date('2024-01-15'), status: 'passed' },
    { studentId: 3, studentName: 'Michael Brown', testName: 'Midterm Exam', score: 78, maxScore: 100, percentage: 78, date: new Date('2024-01-15'), status: 'passed' },
    { studentId: 4, studentName: 'Sarah Davis', testName: 'Midterm Exam', score: 95, maxScore: 100, percentage: 95, date: new Date('2024-01-15'), status: 'passed' },
    { studentId: 5, studentName: 'David Lee', testName: 'Midterm Exam', score: 67, maxScore: 100, percentage: 67, date: new Date('2024-01-15'), status: 'failed' }
  ];

  studentActivities: StudentActivity[] = [
    { studentId: 1, studentName: 'John Smith', loginCount: 45, lastLogin: new Date(), attendanceRate: 95, participationScore: 88, assignmentsCompleted: 12, totalAssignments: 15 },
    { studentId: 2, studentName: 'Emma Wilson', loginCount: 52, lastLogin: new Date(), attendanceRate: 98, participationScore: 92, assignmentsCompleted: 15, totalAssignments: 15 },
    { studentId: 3, studentName: 'Michael Brown', loginCount: 38, lastLogin: new Date(), attendanceRate: 87, participationScore: 75, assignmentsCompleted: 10, totalAssignments: 15 },
    { studentId: 4, studentName: 'Sarah Davis', loginCount: 49, lastLogin: new Date(), attendanceRate: 96, participationScore: 89, assignmentsCompleted: 14, totalAssignments: 15 },
    { studentId: 5, studentName: 'David Lee', loginCount: 32, lastLogin: new Date(), attendanceRate: 82, participationScore: 68, assignmentsCompleted: 8, totalAssignments: 15 }
  ];

  displayedColumns = ['studentName', 'testName', 'score', 'percentage', 'status', 'date'];
  activityColumns = ['studentName', 'loginCount', 'attendanceRate', 'participationScore', 'completionRate', 'lastLogin'];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      class: [''],
      dateRange: [''],
      assessment: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {}

  // Computed properties to avoid complex expressions in template
  get totalAssessments(): number {
    return this.assessments.length;
  }

  get averageScore(): number {
    if (this.assessments.length === 0) return 0;
    const total = this.assessments.reduce((sum, a) => sum + a.averageScore, 0);
    return Math.round((total / this.assessments.length) * 10) / 10;
  }

  get averageCompletionRate(): number {
    if (this.assessments.length === 0) return 0;
    const total = this.assessments.reduce((sum, a) => sum + a.completionRate, 0);
    return Math.round((total / this.assessments.length) * 10) / 10;
  }

  get totalStudents(): number {
    return this.assessments[0]?.totalStudents || 0;
  }

  get averageAttendanceRate(): number {
    if (this.studentActivities.length === 0) return 0;
    const total = this.studentActivities.reduce((sum, s) => sum + s.attendanceRate, 0);
    return Math.round((total / this.studentActivities.length) * 10) / 10;
  }

  get averageParticipationScore(): number {
    if (this.studentActivities.length === 0) return 0;
    const total = this.studentActivities.reduce((sum, s) => sum + s.participationScore, 0);
    return Math.round((total / this.studentActivities.length) * 10) / 10;
  }

  get averageAssignmentCompletion(): number {
    if (this.studentActivities.length === 0) return 0;
    const total = this.studentActivities.reduce((sum, s) => {
      return sum + (s.assignmentsCompleted / s.totalAssignments * 100);
    }, 0);
    return Math.round((total / this.studentActivities.length) * 10) / 10;
  }

  generateReport(): void {
    console.log('Generating report with filters:', this.filterForm.value);
    // Here you would typically call your backend API
  }

  exportReport(type: string): void {
    console.log('Exporting report as:', type);
    // Here you would typically generate and download the report
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getAssessmentTypeColor(type: string): string {
    switch (type) {
      case 'quiz': return 'bg-blue-100 text-blue-800';
      case 'assignment': return 'bg-purple-100 text-purple-800';
      case 'exam': return 'bg-red-100 text-red-800';
      case 'project': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCompletionRateColor(rate: number): string {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  }

  getParticipationScoreColor(score: number): string {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }
}