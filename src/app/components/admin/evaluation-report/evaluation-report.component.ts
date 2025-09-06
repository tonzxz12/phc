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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { APIService } from '../../../services/API/api.service';

interface CourseEvaluation {
  id: string;
  course_id: string;
  student_id: string;
  overall_rating: number;
  content_quality: number;
  difficulty: number;
  materials: number;
  strengths: string;
  improvements: string;
  additional_feedback: string;
  recommend: boolean;
  submitted_at: string;
  status: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  // Additional fields for display
  course_name?: string;
  student_name?: string;
  teacher_name?: string;
}

interface TeacherEvaluation {
  id: string;
  teacher_id: string;
  student_id: string;
  overall_rating: number;
  communication: number;
  knowledge: number;
  teaching_style: number;
  strengths: string;
  improvements: string;
  additional_feedback: string;
  recommend: boolean;
  submitted_at: string;
  status: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  // Additional fields for display
  teacher_name?: string;
  student_name?: string;
}

@Component({
  selector: 'app-evaluation-report',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './evaluation-report.component.html',
  styleUrls: ['./evaluation-report.component.css']
})
export class EvaluationReportComponent implements OnInit {
  selectedTab = 0;
  
  // Course evaluations
  courseEvaluations: CourseEvaluation[] = [];
  filteredCourseEvaluations: CourseEvaluation[] = [];
  
  // Teacher evaluations
  teacherEvaluations: TeacherEvaluation[] = [];
  filteredTeacherEvaluations: TeacherEvaluation[] = [];
  
  // Available courses and teachers for filtering
  availableCourses: { id: string; name: string }[] = [];
  availableTeachers: { id: string; name: string }[] = [];
  
  // Filter form
  filterForm: FormGroup;
  
  // Statistics
  courseStats = {
    total: 0,
    averageRating: 0,
    pendingReview: 0,
    positiveRecommendations: 0
  };
  
  teacherStats = {
    total: 0,
    averageRating: 0,
    pendingReview: 0,
    positiveRecommendations: 0
  };
  
  // Loading states
  isLoadingCourses = false;
  isLoadingTeachers = false;
  
  // Table columns
  courseColumns = [
    'course_name',
    'student_name', 
    'teacher_name',
    'overall_rating',
    'content_quality',
    'difficulty',
    'materials',
    'strengths',
    'improvements',
    'additional_feedback',
    'recommend',
    'submitted_at',
    'status'
    // Removed 'actions' and 'admin_notes'
  ];
  
  // Update the teacher columns to remove admin_notes and actions
  teacherColumns = [
    'teacher_name',
    'student_name',
    'overall_rating',
    'communication',
    'knowledge', 
    'teaching_style',
    'strengths',
    'improvements',
    'additional_feedback',
    'recommend',
    'submitted_at',
    'status'
    // Removed 'admin_notes' and 'actions'
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: APIService
  ) {
    this.filterForm = this.fb.group({
      status: [''],
      rating: [''],
      courseId: [''],      // Keep course filter
      teacherId: ['']      // Keep teacher filter
    });
  }

  ngOnInit(): void {
    this.loadCourseEvaluations();
    this.loadTeacherEvaluations();
    this.loadAvailableCourses();
    this.loadAvailableTeachers();
    this.setupFilterListener();
  }

  loadCourseEvaluations(): void {
    this.isLoadingCourses = true;
    
    // First, get the basic course evaluations
    const postObject = {
      selectors: ['*'],
      tables: 'course_evaluations',
      conditions: {
        'ORDER BY': 'submitted_at DESC'
      }
    };

    this.apiService.post('get_entries', {
      data: JSON.stringify(postObject)
    }).subscribe({
      next: (response: any) => {
        console.log('Raw course evaluations response:', response);
        
        if (response.success && response.output) {
          // Store the raw evaluations
          this.courseEvaluations = response.output;
          this.filteredCourseEvaluations = [...this.courseEvaluations];
          
          // Now fetch related data for each evaluation
          this.loadCourseRelatedData();
        }
        this.isLoadingCourses = false;
      },
      error: (error: any) => {
        console.error('Error loading course evaluations:', error);
        this.isLoadingCourses = false;
      }
    });
  }

  loadCourseRelatedData(): void {
    // For each course evaluation, fetch the related course and student info
    this.courseEvaluations.forEach(evaluation => {
      // Get course info
      const coursePostObject = {
        selectors: ['course', 'teacherid'],
        tables: 'courses',
        conditions: {
          WHERE: {
            id: evaluation.course_id
          }
        }
      };

      this.apiService.post('get_entries', {
        data: JSON.stringify(coursePostObject)
      }).subscribe({
        next: (courseResponse: any) => {
          if (courseResponse.success && courseResponse.output && courseResponse.output.length > 0) {
            const course = courseResponse.output[0];
            evaluation.course_name = course.course;
            
            // Get teacher info
            if (course.teacherid) {
              const teacherPostObject = {
                selectors: ['firstname', 'lastname'],
                tables: 'teachers',
                conditions: {
                  WHERE: {
                    id: course.teacherid
                  }
                }
              };

              this.apiService.post('get_entries', {
                data: JSON.stringify(teacherPostObject)
              }).subscribe({
                next: (teacherResponse: any) => {
                  if (teacherResponse.success && teacherResponse.output && teacherResponse.output.length > 0) {
                    const teacher = teacherResponse.output[0];
                    evaluation.teacher_name = `${teacher.firstname} ${teacher.lastname}`;
                  }
                }
              });
            }
          }
        }
      });

      // Get student info
      const studentPostObject = {
        selectors: ['firstname', 'lastname'],
        tables: 'students',
        conditions: {
          WHERE: {
            id: evaluation.student_id
          }
        }
      };

      this.apiService.post('get_entries', {
        data: JSON.stringify(studentPostObject)
      }).subscribe({
        next: (studentResponse: any) => {
          if (studentResponse.success && studentResponse.output && studentResponse.output.length > 0) {
            const student = studentResponse.output[0];
            evaluation.student_name = `${student.firstname} ${student.lastname}`;
          }
        }
      });
    });

    // Calculate stats after loading related data
    setTimeout(() => {
      this.calculateCourseStats();
    }, 1000); // Give time for all the async calls to complete
  }

  loadTeacherEvaluations(): void {
    this.isLoadingTeachers = true;
    
    // Simplified query to just get teacher evaluations first
    const postObject = {
      selectors: ['*'],
      tables: 'teacher_evaluations',
      conditions: {
        'ORDER BY': 'submitted_at DESC'
      }
    };

    this.apiService.post('get_entries', {
      data: JSON.stringify(postObject)
    }).subscribe({
      next: (response: any) => {
        console.log('Teacher evaluations API response:', response); // Debug log
        
        if (response.success && response.output) {
          this.teacherEvaluations = response.output;
          this.filteredTeacherEvaluations = [...this.teacherEvaluations];
          this.calculateTeacherStats();
          
          console.log('Loaded teacher evaluations:', this.teacherEvaluations); // Debug log
          console.log('Teacher stats calculated:', this.teacherStats); // Debug log
        } else {
          console.log('No teacher evaluations found or API error:', response);
        }
        this.isLoadingTeachers = false;
      },
      error: (error: any) => {
        console.error('Error loading teacher evaluations:', error);
        this.isLoadingTeachers = false;
      }
    });
  }

  calculateCourseStats(): void {
    this.courseStats.total = this.courseEvaluations.length;
    this.courseStats.averageRating = this.courseEvaluations.length > 0 
      ? this.courseEvaluations.reduce((sum, evaluation) => sum + evaluation.overall_rating, 0) / this.courseEvaluations.length
      : 0;
    this.courseStats.pendingReview = this.courseEvaluations.filter(evaluation => evaluation.status === 'pending').length;
    this.courseStats.positiveRecommendations = this.courseEvaluations.filter(evaluation => evaluation.recommend).length;
  }

  calculateTeacherStats(): void {
    this.teacherStats.total = this.teacherEvaluations.length;
    this.teacherStats.averageRating = this.teacherEvaluations.length > 0
      ? this.teacherEvaluations.reduce((sum, evaluation) => sum + evaluation.overall_rating, 0) / this.teacherEvaluations.length
      : 0;
    this.teacherStats.pendingReview = this.teacherEvaluations.filter(evaluation => evaluation.status === 'pending').length;
    this.teacherStats.positiveRecommendations = this.teacherEvaluations.filter(evaluation => evaluation.recommend).length;
  }

  loadAvailableCourses(): void {
    const postObject = {
      selectors: ['id', 'course'],
      tables: 'courses',
      conditions: {
        'ORDER BY': 'course ASC'
      }
    };

    this.apiService.post('get_entries', {
      data: JSON.stringify(postObject)
    }).subscribe({
      next: (response: any) => {
        if (response.success && response.output) {
          this.availableCourses = response.output.map((course: any) => ({
            id: course.id,
            name: course.course
          }));
        }
      },
      error: (error: any) => {
        console.error('Error loading available courses:', error);
      }
    });
  }

  loadAvailableTeachers(): void {
    const postObject = {
      selectors: ['id', 'firstname', 'lastname'],
      tables: 'teachers',
      conditions: {
        'ORDER BY': 'firstname ASC'
      }
    };

    this.apiService.post('get_entries', {
      data: JSON.stringify(postObject)
    }).subscribe({
      next: (response: any) => {
        if (response.success && response.output) {
          this.availableTeachers = response.output.map((teacher: any) => ({
            id: teacher.id,
            name: `${teacher.firstname} ${teacher.lastname}`
          }));
        }
      },
      error: (error: any) => {
        console.error('Error loading available teachers:', error);
      }
    });
  }

  setupFilterListener(): void {
    // Remove the old valueChanges subscription
    // this.filterForm.valueChanges.subscribe(() => {
    //   this.applyFilters();
    // });
  }

  // Fix the filter method to properly update the table
  applyFilters(): void {
    const filters = this.filterForm.value;
    console.log('Applying filters:', filters);
    
    // Filter course evaluations
    this.filteredCourseEvaluations = this.courseEvaluations.filter(evaluation => {
      let matches = true;
      
      if (filters.status && evaluation.status !== filters.status) {
        matches = false;
      }
      
      if (filters.rating && evaluation.overall_rating < filters.rating) {
        matches = false;
      }
      
      if (filters.courseId && filters.courseId !== '' && filters.courseId !== null) {
        if (evaluation.course_id !== filters.courseId) {
          matches = false;
        }
      }
      
      return matches;
    });
    
    // Filter teacher evaluations
    this.filteredTeacherEvaluations = this.teacherEvaluations.filter(evaluation => {
      let matches = true;
      
      if (filters.status && evaluation.status !== filters.status) {
        matches = false;
      }
      
      if (filters.rating && evaluation.overall_rating < filters.rating) {
        matches = false;
      }
      
      if (filters.teacherId && filters.teacherId !== '' && filters.teacherId !== null) {
        if (evaluation.teacher_id !== filters.teacherId) {
          matches = false;
        }
      }
      
      return matches;
    });
    
    console.log('Filtered course evaluations:', this.filteredCourseEvaluations.length);
    console.log('Filtered teacher evaluations:', this.filteredTeacherEvaluations.length);
  }

  // Make sure the filter change method triggers the filter
  onFilterChange(): void {
    console.log('Filter changed, applying filters...');
    this.applyFilters();
  }

  // Remove the updateEvaluationStatus method since we don't need approvals

  exportToExcel(type: 'course' | 'teacher'): void {
    const data = type === 'course' ? this.filteredCourseEvaluations : this.filteredTeacherEvaluations;
    const headers = type === 'course' ? this.courseColumns : this.teacherColumns;
    
    // Remove 'actions' column for export
    const exportHeaders = headers.filter(col => col !== 'actions');
    
    // Create Excel content
    let excelContent = '';
    
    // Add headers
    excelContent += exportHeaders.map(header => this.formatHeader(header)).join('\t') + '\n';
    
    // Add data rows
    data.forEach(row => {
      const values = exportHeaders.map(header => {
        const value = row[header as keyof typeof row];
        return this.formatValue(value, header);
      });
      excelContent += values.join('\t') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_evaluations_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportToPDF(type: 'course' | 'teacher'): void {
    const data = type === 'course' ? this.filteredCourseEvaluations : this.filteredTeacherEvaluations;
    const headers = type === 'course' ? this.courseColumns : this.teacherColumns;
    
    // Remove 'actions' column for export
    const exportHeaders = headers.filter(col => col !== 'actions');
    
    // Create PDF content using jsPDF-like approach
    let pdfContent = '';
    
    // Add title
    pdfContent += `${type === 'course' ? 'Course' : 'Teacher'} Evaluations Report\n`;
    pdfContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    pdfContent += `Total Records: ${data.length}\n\n`;
    
    // Add headers
    pdfContent += exportHeaders.map(header => this.formatHeader(header)).join(' | ') + '\n';
    pdfContent += '-'.repeat(exportHeaders.length * 20) + '\n';
    
    // Add data rows
    data.forEach((row, index) => {
      const values = exportHeaders.map(header => {
        const value = row[header as keyof typeof row];
        return this.formatValue(value, header);
      });
      pdfContent += values.join(' | ') + '\n';
      
      // Add separator every 10 rows for readability
      if ((index + 1) % 10 === 0) {
        pdfContent += '-'.repeat(exportHeaders.length * 20) + '\n';
      }
    });
    
    // Create and download file
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_evaluations_${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private formatHeader(header: string): string {
    return header.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private formatValue(value: any, header: string): string {
    if (value === null || value === undefined) return 'N/A';
    
    if (header === 'submitted_at' || header === 'reviewed_at') {
      return new Date(value).toLocaleDateString();
    }
    
    if (header === 'recommend') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'string' && value.includes(',')) {
      return `"${value}"`;
    }
    
    return String(value);
  }

  getRatingColor(rating: number): string {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  }

  getRatingColorClass(rating: number): string {
    if (rating >= 5) return 'rating-excellent';
    if (rating >= 4) return 'rating-good';
    if (rating >= 3) return 'rating-average';
    if (rating >= 2) return 'rating-poor';
    return 'rating-bad';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusColorClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  }

  clearFilters(): void {
    this.filterForm.reset();
    // After resetting, apply the filters to show all data
    this.applyFilters();
  }
}