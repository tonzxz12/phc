import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { APIService } from '../../../services/API/api.service';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface Course {
  id: string;
  course: string;           // Course title
  details?: string;         // Course description
  firstname?: string;       // Teacher first name
  lastname?: string;        // Teacher last name
  profile?: string;         // Teacher profile image
  job?: string;            // Teacher job title
  lessoncount?: number;    // Number of lessons
  complexity?: number;      // Course difficulty level (1-5)
  enrolled?: number;       // Number of enrolled students
  image?: string;          // Course image
}

interface Teacher {
  id: string;
  firstname: string;
  lastname: string;
  email?: string;
  job: string;
  profile?: string;
  // Add computed properties for display
  fullName?: string;
  avatarInitials?: string;
  // Add mock properties for the UI
  subject?: string;
  experience?: string;
  bio?: string;
  rating?: number;
}

interface Language {
  id: number;
  language: string;
}

interface EvaluationForm {
  overallRating: number;
  communication: number;
  knowledge: number;
  teachingStyle: number;
  feedback: string;
  strengths: string;
  improvements: string;
  recommend: boolean;
}

@Component({
  selector: 'app-student-evaluation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './student-evaluation.component.html',
  styleUrls: ['./student-evaluation.component.css']
})
export class StudentEvaluationComponent implements OnInit {
  selectedTab = 0;
  selectedCourse: Course | null = null;
  selectedTeacher: Teacher | null = null;
  showCourseForm = false;
  showTeacherForm = false;
  
  // Initialize forms in constructor
  courseEvaluationForm!: FormGroup;
  teacherEvaluationForm!: FormGroup;

  // Real data from database
  courses: Course[] = [];
  teachers: Teacher[] = [];
  languages: Language[] = [];
  
  // Loading states
  isLoadingCourses = false;
  isLoadingTeachers = false;
  isLoadingLanguages = false;
  errorMessage = '';

  // Add these properties to track current ratings
  currentRatings: { [key: string]: number } = {
    overall_rating: 0,
    content_quality: 0,
    difficulty: 0,
    instructor_effectiveness: 0,
    course_materials: 0,
    learning_outcomes: 0,
    // Add teacher-specific fields
    communication: 0,
    knowledge: 0,
    teaching_style: 0
  };

  // Add property to track if course is already evaluated
  courseAlreadyEvaluated: { [courseId: string]: boolean } = {};

  // Add property to track if teacher is already evaluated
  teacherAlreadyEvaluated: { [teacherId: string]: boolean } = {};

  // Add this property to track teacher ratings
  currentTeacherRatings: { [key: string]: number } = {
    overall_rating: 0,
    communication: 0,
    knowledge: 0,
    teaching_style: 0
  };

  constructor(
    private fb: FormBuilder,
    public apiService: APIService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCourses();
    this.loadTeachers();
  }

  initializeForms(): void {
    // Initialize course evaluation form with correct field names
    this.courseEvaluationForm = this.fb.group({
      overall_rating: ['', Validators.required],
      content_quality: ['', Validators.required],
      difficulty: ['', Validators.required],
      materials: ['', Validators.required],
      strengths: ['', Validators.required],
      improvements: ['', Validators.required],
      additional_feedback: ['', Validators.required]
    });

    // Initialize teacher evaluation form to match database schema
    this.teacherEvaluationForm = this.fb.group({
      overall_rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      communication: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      knowledge: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      teaching_style: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      strengths: ['', Validators.required],
      improvements: ['', Validators.required],
      additional_feedback: [''],
      recommend: [true]
    });
  }

  async loadCourses(): Promise<void> {
    this.isLoadingCourses = true;
    this.errorMessage = '';
    
    try {
      const data = await firstValueFrom(this.apiService.getCourses());
      this.courses = data.output.map((course: any) => ({
        id: course.id,
        course: course.course,
        details: course.details,
        firstname: course.firstname,
        lastname: course.lastname,
        profile: course.profile,
        job: course.job,
        lessoncount: course.lessoncount,
        complexity: course.complexity,
        enrolled: course.enrolled,
        image: course.image
      }));

      await this.checkEvaluatedCourses();
    } catch (error) {
      console.error('Error loading courses:', error);
      this.errorMessage = 'Failed to load courses. Please try again.';
      this.courses = [];
    } finally {
      this.isLoadingCourses = false;
    }
  }

  loadTeachers(): void {
    this.isLoadingTeachers = true;
    this.errorMessage = '';
  
    this.apiService.getTeachers().subscribe({
      next: (response: any) => {
        if (response.success && response.output) {
          this.teachers = response.output.map((teacher: any) => ({
            id: teacher.id,
            firstname: teacher.firstname,
            lastname: teacher.lastname,
            email: teacher.email,
            job: teacher.job,
            profile: teacher.profile,
            rating: 0
          }));
          
          // Check which teachers are already evaluated by this student
          this.checkEvaluatedTeachers();
        }
        this.isLoadingTeachers = false;
      },
      error: (error: any) => {
        console.error('Error loading teachers:', error);
        this.errorMessage = 'Failed to load teachers. Please try again.';
        this.isLoadingTeachers = false;
      }
    });
  }

  loadLanguages(): void {
    this.isLoadingLanguages = true;
    this.errorMessage = '';

    // Use the existing API service method instead of direct HTTP call
    this.apiService.getLanguages().subscribe({
      next: (languages: any) => {
        // Ensure languages is always an array
        this.languages = Array.isArray(languages) ? languages : 
                        (languages?.output && Array.isArray(languages.output)) ? languages.output : 
                        (languages?.data && Array.isArray(languages.data)) ? languages.data : [];
        this.isLoadingLanguages = false;
      },
      error: (error: any) => {
        console.error('Error loading languages:', error);
        this.errorMessage = 'Failed to load languages. Please try again.';
        this.isLoadingLanguages = false;
        // Set empty array as fallback
        this.languages = [];
      }
    });
  }

  // Add method to check which courses are already evaluated
  async checkEvaluatedCourses() {
    const studentId = this.apiService.getUserData()?.id;
    if (!studentId) return;

    for (const course of this.courses) {
      try {
        const response = await firstValueFrom(
          this.apiService.checkIfAlreadyEvaluated(course.id, studentId)
        );
        this.courseAlreadyEvaluated[course.id] = 
          response.success && response.output && response.output.length > 0;
      } catch (error) {
        console.error(`Error checking evaluation for course ${course.id}:`, error);
        this.courseAlreadyEvaluated[course.id] = false;
      }
    }
  }

  // Add method to check which teachers are already evaluated
  async checkEvaluatedTeachers() {
    const studentId = this.apiService.getUserData()?.id;
    if (!studentId) return;

    for (const teacher of this.teachers) {
      try {
        const response = await firstValueFrom(
          this.apiService.checkIfTeacherAlreadyEvaluated(teacher.id, studentId)
        );
        this.teacherAlreadyEvaluated[teacher.id] = 
          response.success && response.output && response.output.length > 0;
      } catch (error) {
        console.error(`Error checking evaluation for teacher ${teacher.id}:`, error);
        this.teacherAlreadyEvaluated[teacher.id] = false;
      }
    }
  }

  // Helper methods
  getTeacherName(teacherId: string): string {
    const teacher = this.teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstname} ${teacher.lastname}` : 'Unknown Teacher';
  }

  getDifficultyLevel(difficulty: number): string {
    if (difficulty <= 2) return 'Beginner';
    if (difficulty <= 4) return 'Intermediate';
    return 'Advanced';
  }

  // Get default course image based on language
  getCourseImage(course: Course): string {
    // Check if course has a valid image
    if (course.image && 
        course.image !== 'undefined' && 
        course.image !== 'null' && 
        course.image !== '' &&
        course.image !== 'Course Image') {
      
      // If it's a full URL, return as is
      if (course.image.startsWith('http://') || course.image.startsWith('https://')) {
        return course.image;
      }
      
      // If it's a relative path, try to get from API service
      if (this.apiService.getURL) {
        return this.apiService.getURL(course.image);
      }
      
      // Fallback to direct path
      return course.image;
    }
    
    // Return a default course image based on course name or random
    const defaultImages = [
      'assets/images/default-course-1.jpg',
      'assets/images/default-course-2.jpg', 
      'assets/images/default-course-3.jpg'
    ];
    
    // Use course ID or name to consistently show same default image for same course
    const index = course.id ? parseInt(course.id) % defaultImages.length : 0;
    return defaultImages[index];
  }

  onImageError(event: any, course: Course): void {
    // Hide the broken image and show fallback
    event.target.style.display = 'none';
    // You could also set a flag to show the fallback div
  }
  

  selectCourse(course: Course): void {
    if (this.courseAlreadyEvaluated[course.id]) {
      this.apiService.failedSnackbar('You have already evaluated this course.');
      return;
    }
    
    this.selectedCourse = course;
    this.showCourseForm = true;
    this.showTeacherForm = false;
  }

  // Update selectTeacher method to check if already evaluated
  selectTeacher(teacher: Teacher): void {
    if (this.teacherAlreadyEvaluated[teacher.id]) {
      this.apiService.failedSnackbar('You have already evaluated this teacher.');
      return;
    }
    
    this.selectedTeacher = teacher;
    this.showTeacherForm = true;
    this.showCourseForm = false;
  }

  submitCourseEvaluation(): void {
    if (!this.courseEvaluationForm.valid || !this.selectedCourse) {
      this.apiService.failedSnackbar('Please fill in all required fields.');
      return;
    }

    const evaluationData = {
      course_id: this.selectedCourse.id,
      student_id: this.apiService.getUserData()?.id,
      overall_rating: this.courseEvaluationForm.get('overall_rating')?.value,
      content_quality: this.courseEvaluationForm.get('content_quality')?.value,
      difficulty: this.courseEvaluationForm.get('difficulty')?.value,
      materials: this.courseEvaluationForm.get('materials')?.value || '',
      strengths: this.courseEvaluationForm.get('strengths')?.value || '',
      improvements: this.courseEvaluationForm.get('improvements')?.value || '',
      additional_feedback: this.courseEvaluationForm.get('additional_feedback')?.value || '',
      recommend: true
    };

    this.apiService.saveCourseEvaluation(evaluationData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.apiService.successSnackbar('Course evaluation submitted successfully!');
          this.courseAlreadyEvaluated[this.selectedCourse!.id] = true;
          this.resetCourseForm();
          this.showCourseForm = false;
          this.selectedCourse = null;
        } else {
          this.apiService.failedSnackbar('Failed to submit evaluation. Please try again.');
        }
      },
      error: (error: any) => {
        console.error('Error saving evaluation:', error);
        this.apiService.failedSnackbar('Error submitting evaluation. Please try again.');
      }
    });
  }

  submitTeacherEvaluation(): void {
    if (!this.teacherEvaluationForm.valid || !this.selectedTeacher) {
      this.apiService.failedSnackbar('Please fill in all required fields.');
      return;
    }

    const formValues = this.teacherEvaluationForm.value;
    const evaluationData = {
      teacher_id: this.selectedTeacher.id,
      student_id: this.apiService.getUserData()?.id,
      overall_rating: formValues.overall_rating,
      communication: formValues.communication,
      knowledge: formValues.knowledge,
      teaching_style: formValues.teaching_style,
      strengths: formValues.strengths,
      improvements: formValues.improvements,
      additional_feedback: formValues.additional_feedback,
      recommend: formValues.recommend
    };

    this.apiService.saveTeacherEvaluation(evaluationData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.apiService.successSnackbar('Teacher evaluation submitted successfully!');
          this.teacherAlreadyEvaluated[this.selectedTeacher!.id] = true;
          this.resetTeacherForm();
          this.showTeacherForm = false;
          this.selectedTeacher = null;
        } else {
          this.apiService.failedSnackbar('Failed to submit teacher evaluation. Please try again.');
        }
      },
      error: (error: any) => {
        console.error('Error submitting teacher evaluation:', error);
        this.apiService.failedSnackbar('Error submitting teacher evaluation. Please try again.');
      }
    });
  }

  resetCourseForm(): void {
    this.courseEvaluationForm.reset({
      overall_rating: '',
      content_quality: '',
      difficulty: '',
      materials: '',
      strengths: '',
      improvements: '',
      additional_feedback: ''
    });
    
    this.currentRatings = {
      overall_rating: 0,
      content_quality: 0,
      difficulty: 0,
      instructor_effectiveness: 0,
      course_materials: 0,
      learning_outcomes: 0,
      communication: 0,
      knowledge: 0,
      teaching_style: 0
    };
  }

  resetTeacherForm(): void {
    this.teacherEvaluationForm.reset({
      overall_rating: 0,
      communication: 0,
      knowledge: 0,
      teaching_style: 0,
      strengths: '',
      improvements: '',
      additional_feedback: '',
      recommend: true
    });
    
    this.currentTeacherRatings = {
      overall_rating: 0,
      communication: 0,
      knowledge: 0,
      teaching_style: 0
    };
  }

  resetForms(): void {
    this.resetCourseForm();
    this.resetTeacherForm();
    this.selectedCourse = null;
    this.selectedTeacher = null;
  }

  // Rating methods for star system
  setRating(field: string, rating: number): void {
    this.currentRatings[field] = rating;
    
    if (this.courseEvaluationForm) {
      this.courseEvaluationForm.patchValue({ [field]: rating });
    }
    
    if (this.teacherEvaluationForm) {
      this.teacherEvaluationForm.patchValue({ [field]: rating });
    }
  }

  // Add method to get current rating for a field
  getCurrentRating(field: string): number {
    return this.currentRatings[field] || 0;
  }

  // Add method to check if a star should be filled
  isStarFilled(field: string, starNumber: number): boolean {
    return starNumber <= this.getCurrentRating(field);
  }

  // Add this method for teacher ratings
  setTeacherRating(field: string, rating: number): void {
    this.currentTeacherRatings[field] = rating;
    this.teacherEvaluationForm.get(field)?.setValue(rating);
  }

}