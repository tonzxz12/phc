import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { QuizCreationComponent } from '../teacher-modals/quiz-creation/quiz-creation.component';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizBankComponent } from '../quiz-bank/quiz-bank.component';

@Component({
  selector: 'app-quiz-management',
  templateUrl: './quiz-management.component.html',
  styleUrls: ['./quiz-management.component.css'],
})
export class QuizManagementComponent implements OnInit {
  // Properties for feedback modal
  displayFeedbackModal: boolean = false;
  selectedStudentForFeedback: any = null;
  feedback: string = '';
  showAddQuestionModal: boolean = false;
  selectedQuestionForEdit: any = null;
  showEditQuestionModal: boolean = false;
  
  // Add the new question form property
  newQuestion: any = {
    type: '0',
    question: '',
    answer: '',
    category: ''
  };

  multipleChoiceOptions: string[] = ['', '', '', ''];
  existingCategories: string[] = [];
  newCategoryName: string = '';
  showNewCategoryInput: boolean = false;

  constructor(
    private modalService: NgbModal,
    private API: APIService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {}

  isDropdownOpen = false;
  currentCourse: any;
  courses: any = [];
  mockAverageScore = 0;
  mockCompletionRate = 85;
  isCourseDropdownOpen = false;
  isClassDropdownOpen = false;
  currentClass: any;
  classes: any = [];

  selectedQuiz: any;
  selectedStudent: any;

  quizOptions = ['Quiz A', 'Quiz B', 'Quiz C'];
  studentOptions = ['Kenneth', 'Felix', 'John'];

  filteredQuizOptions: string[] = [];
  filteredStudentOptions: string[] = [];

  quizzes: any = [];
  
  // Student quiz data
  quizStudentData: any[] = [];
  loadingStudentData: boolean = false;

  // Pagination Variables
  itemsPerPage: number = 10; // Max items per page
  currentPage: number = 0; // Current page index
  loading: boolean = false; // Add this line
  selectedIndex: number = 0;
  value: number = 0;

  // Question Bank properties
  questionBankStats: any = {
    total: 0,
    categories: 0,
    multipleChoice: 0,
    essay: 0
  };
  recentQuestions: any[] = [];
  editMultipleChoiceOptions: string[] = ['', '', '', ''];
  selectedQuestionsFromBank: any[] = [];

  questionBankPage: number = 0;
  questionBankItemsPerPage: number = 10;
  questionBankTotalItems: number = 0;
  allQuestions: any[] = []; // Store all questions

  Math = Math;
  
  // ✅ ADD: Filter properties
  questionBankFilters: any = {
    category: 'all',
    type: 'all',
    search: ''
  };

  // Custom table configurations
  quizTableColumns = [
    { field: 'title', header: 'Quiz Title' },
    { field: 'createdOn', header: 'Created On' },
    { field: 'items', header: 'Items' },
    { field: 'deadline', header: 'Deadline' },
    { field: 'actions', header: 'Actions' }
  ];

  studentTableColumns = [
    { field: 'name', header: 'Student Name' },
    { field: 'scoreDisplay', header: 'Score' },
    { field: 'percentageDisplay', header: 'Percentage' },
    { field: 'completedOn', header: 'Completed On' },
    { field: 'actions', header: 'Actions' }
  ];

  ngOnInit(): void {
    this.getQuizzes();
    this.getTeacherCourses();
    this.getTeacherClasses();
    this.getQuestionBankStats();
    this.getAllQuestions();
    this.loadExistingCategories();

    this.filteredQuizOptions = this.quizOptions.slice();
    this.filteredStudentOptions = this.studentOptions.slice();

    

    setTimeout(() => {
      const quizzesTab = document.querySelector('[value="0"]');
      if (quizzesTab) {
        quizzesTab.classList.add('p-tabview-selected');
        const quizPanel = document.querySelector('[value="0"] + p-tabpanel');
        if (quizPanel) quizPanel.classList.add('p-tabview-panel');
      }
    }, 0); // Delay to ensure DOM is ready
  }

  debugCategoryInput(): void {
    console.log('=== Category Input Debug ===');
    console.log('newCategoryName:', this.newCategoryName);
    console.log('newCategoryName.trim():', this.newCategoryName.trim());
    console.log('newCategoryName.length:', this.newCategoryName.length);
    console.log('Button should be enabled:', !!this.newCategoryName.trim());
    console.log('=== End Debug ===');
  }

  loadExistingCategories(): void {
    this.API.getQuestionBankCategories(this.API.getUserData().id).subscribe(
      (data: any) => {
        if (data.success) {
          this.existingCategories = data.output.map((item: any) => item.category).filter(Boolean);
        }
      },
      (error: any) => {
        console.error('Error loading categories:', error);
      }
    );
  }
  
  get selectedQuizTitle(): string {
    return this.selectedQuiz == null ? 'Select a Quiz Above' : this.selectedQuiz.title;
  }

  getQuizzes() {
    this.API.showLoader();
    this.API.teacherGetQuizzes(this.currentCourse?.id, this.currentClass?.id).subscribe(
      (data: any) => {
        if (data.success) {
          this.quizzes = data.output;
          this.currentPage = 0; // Reset to first page when new data is loaded
        } else {
          this.API.failedSnackbar('Failed to load quizzes');
        }
        this.API.hideLoader();
      },
      (error) => {
        console.error('Error loading quizzes:', error);
        this.API.failedSnackbar('Error loading quizzes');
        this.API.hideLoader();
      }
    );
  }
  
  getTeacherClasses() {
    if (this.currentCourse) {
      this.API.teacherGetClassesByCourse(this.currentCourse.id).subscribe(
        (data: any) => {
          if (data.success) {
            this.classes = data.output.map((_class: any) => ({
              id: _class.id,
              name: _class.class,
              courseId: _class.courseid
            }));
          } else {
            this.API.failedSnackbar('Failed loading classes');
          }
        },
        (error) => {
          console.error('Error loading classes:', error);
          this.API.failedSnackbar('Error loading classes');
        }
      );
    } else {
      this.classes = [];
    }
  }

  getTeacherCourses() {
    this.courses = [];
    this.API.teacherAllCourses().subscribe((data) => {
      if (data.success) {
        for (let course of data.output) {
          var mode = 'LRSW';
          if (course.filter != null) {
            mode = course.filter;
          }
          this.courses.push({
            id: course.id,
            lang: course.languageid,
            title: course.course,
            lessons: course.lessons,
            description: course.details,
            image: course.image,
            mode: mode,
            pretest: course.pretest
          });
        }
        // Log the courses array after it's populated
        console.log('Courses loaded:', this.courses);
      } else {
        this.API.failedSnackbar('Failed loading courses');
      }
    });
  }

  selectQuiz(quiz: any) {
    this.selectedQuiz = quiz;
    this.resetStudent();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleCourseDropdown() {
    this.isCourseDropdownOpen = !this.isCourseDropdownOpen;
  }

  toggleClassDropdown() {
    this.isClassDropdownOpen = !this.isClassDropdownOpen;
  }

  changeCourse(course: any) {
    console.log('Course selected:', course);
    this.currentCourse = course;
    this.currentClass = null; // Reset class when course changes
    this.isCourseDropdownOpen = false;
    this.getTeacherClasses(); // Update class list for the selected course
    this.filterQuizzes();
  }

  changeClass(selectedClass: any) {
    console.log('Class selected:', selectedClass);
    this.currentClass = selectedClass;
    this.isClassDropdownOpen = false;
    this.filterQuizzes();
  }

  gettingAvg = false;

  getAverageScore(quiz: any) {
    // Reset relevant variables
    this.search = '';
    this.resetStudent();
    this.selectedQuiz = quiz;
    this.gettingAvg = true;
    this.people = [];
    
    // Get quiz average
    this.API.getQuizAverage(quiz.id).subscribe((data) => {
      if (data.output.length) {
        this.mockAverageScore = Number(Number(data.output[0].average).toFixed(4));
      } else {
        this.mockAverageScore = 0;
      }
      this.gettingAvg = false;
      
      // Load all students who took the quiz
      this.loadAllStudentsForQuiz(quiz.id);
    });
  }
  
  // Load all students who took the selected quiz
  loadAllStudentsForQuiz(quizId: string) {
    this.loadingStudentData = true;
    this.quizStudentData = [];
    
    console.log("Loading student data for quiz ID:", quizId);
    
    this.API.teacherGetStudentQuizzes().subscribe(
      (data: any) => {
        if (data.success) {
          console.log("Raw student quiz data received:", data.output);
          
          // For testing: if no specific quiz data, show all students
          this.quizStudentData = data.output.map(this.mapStudentData);
          
          // Extract title from the selected quiz for filtering
          const quizTitle = this.selectedQuiz?.title?.toLowerCase();
          if (quizTitle) {
            // Try to filter by quiz title if ID filtering fails
            this.quizStudentData = this.quizStudentData.filter(student => {
              return student.quizTitle?.toLowerCase() === quizTitle;
            });
          }
          
          console.log('Processed student quiz data:', this.quizStudentData);
        } else {
          console.error("API returned error:", data);
          this.API.failedSnackbar('Failed to load student quiz data');
        }
        this.loadingStudentData = false;
      },
      (error: any) => {
        console.error('Error loading student quiz data:', error);
        this.API.failedSnackbar('Error loading student data');
        this.loadingStudentData = false;
      }
    );
  }
  
  // Helper method to map student data with case-insensitive field handling
  mapStudentData = (student: any) => {
    // Create lowercase version of all keys for case-insensitive access
    const lcStudent: any = {};
    Object.keys(student).forEach(key => {
      lcStudent[key.toLowerCase()] = student[key];
    });
    
    // Handle various possible field names with case-insensitive approach
    const firstName = lcStudent.firstname || '';
    const lastName = lcStudent.lastname || '';
    const score = parseFloat(lcStudent.score || lcStudent.takenpoints || "0");
    const totalPoints = parseFloat(lcStudent.totalpoints || lcStudent.totalitems || "100");
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    
    // Get student ID from various possible field names
    const studentId = lcStudent.studentid || lcStudent.id || '';
    
    // Store the quiz title for filtering
    const quizTitle = lcStudent.title || lcStudent.quiztitle || '';
    
    // Use timestamp field for completion date (as seen in your data)
    const completedDate = lcStudent.timestamp || lcStudent.datetaken || lcStudent.submittedon || 
                          lcStudent.datesubmitted || lcStudent.datecompleted;
    
    return {
      id: studentId,
      name: `${firstName} ${lastName}`,
      score: score,
      totalPoints: totalPoints,
      percentage: percentage.toFixed(2),
      completedOn: this.formatDate(completedDate),
      quizTitle: quizTitle
    };
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  search = '';
  people: any = [];
  searching = false;
  search$: any;

  searchPeople(event: any) {
    this.people = [];
    if (event.target.value.trim() == '') {
      return;
    }

    if (this.selectedQuiz == null) {
      return;
    }

    this.searching = true;
    this.search$?.unsubscribe();
    this.search$ = this.API.searchStudentInQuiz(event.target.value.trim().toLowerCase(), this.selectedQuiz.id).subscribe((data) => {
      this.searching = false;
      if (data.success) {
        for (let person of data.output) {
          this.people.push(person);
        }
      }
      this.search$?.unsubscribe();
    });
  }

  selectStudent(student: any) {
    this.selectedStudent = student;
    this.search = student.firstname + ' ' + student.lastname;
    this.people = [];
  }

  resetStudent() {
    this.selectedStudent = null;
    this.search = '';
  }

  isModalOpen = false;
  createQuiz() {
    this.selectedQuiz = null; // Clear selected quiz for creating a new one
    this.isModalOpen = true; // Open the modal
    
    console.log('Quiz creation modal opened with questions from bank:', this.selectedQuestionsFromBank);
  }

  editQuiz(quiz: any) {
    this.selectedQuiz = quiz; // Set the selected quiz for editing
    this.isModalOpen = true; // Open the modal
  }

  closeQuiz() {
    this.isModalOpen = false;
    this.selectedQuestionsFromBank = [];
    this.getQuizzes(); // Refresh quizzes after closing
  }

  parseDate(date: string) {
    return this.API.parseDate(date);
  }

  filterQuizzes() {
    if (this.currentCourse || this.currentClass) {
      this.getQuizzes(); // This will now use the current course and class
    }
  }

  filterStudents() {
    if (!this.selectedStudent) {
      this.filteredStudentOptions = this.studentOptions.slice();
    } else {
      this.filteredStudentOptions = this.studentOptions.filter((option) =>
        option.toLowerCase().includes(this.selectedStudent.toLowerCase())
      );
    }
  }

  // Feedback modal functions
  openFeedbackModal(student: any): void {
    this.selectedStudentForFeedback = student;
    this.feedback = '';
    this.displayFeedbackModal = true;
  }

  closeFeedbackModal(): void {
    this.displayFeedbackModal = false;
    this.selectedStudentForFeedback = null;
    this.feedback = '';
  }

  sendFeedback(): void {
    if (!this.selectedStudentForFeedback || !this.feedback.trim() || !this.selectedQuiz) {
      this.API.failedSnackbar('Please provide feedback message before sending.');
      return;
    }

    // Assuming API.pushNotifications needs student ID
    const studentId = this.selectedStudentForFeedback.id;
    
    this.API.pushNotifications(
      `${this.API.getFullName()} sent a feedback`,
      `${this.API.getFullName()} sent a feedback about your quiz titled, <b>'${this.selectedQuiz.title}'</b>. ${this.API.getUserData().firstname} said <b>'${this.feedback}'</b>`,
      studentId
    );

    this.API.successSnackbar('Successfully sent feedback!');
    this.closeFeedbackModal();
  }

  navigateBack(): void {
    this.router.navigate(['teacher/t-home']);
  }

  navigateAnal(): void {
    if (this.selectedQuiz) {
      this.router.navigate(['teacher/quiz-analytics'], { state: { quiz: this.selectedQuiz } });
    } else {
      this.API.failedSnackbar('Please select a quiz');
    }
  }

  // Pagination Logic
  paginatedQuizzes() {
    const start = this.currentPage * this.itemsPerPage;
    return this.quizzes.slice(start, start + this.itemsPerPage);
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage() {
    if ((this.currentPage + 1) * this.itemsPerPage < this.quizzes.length) {
      this.currentPage++;
    }
  }

  get totalPages() {
    return Math.ceil(this.quizzes.length / this.itemsPerPage);
  }

  private verifyQuestionDeleted(questionId: number): void {
    console.log('�� Verifying question deletion for ID:', questionId);
    
    // Check if the question still exists in our local array
    const stillExists = this.recentQuestions.find(q => q.id === questionId);
    console.log('🔍 Question still exists in local array:', !!stillExists);
    
    if (stillExists) {
      console.log('🔍 Question details:', stillExists);
    }
  }

  deleteQuiz(quizId: string) {
    if (confirm('Are you sure you want to delete this quiz?')) {
      this.API.deleteQuiz(quizId).subscribe(
        (response) => {
          if (response.success) {
            this.API.successSnackbar('Quiz successfully deleted!');
            this.getQuizzes(); // Refresh the quiz list after deletion
          } else {
            this.API.failedSnackbar('Failed to delete quiz.');
          }
        },
        (error) => {
          console.error('Error deleting quiz:', error);
          this.API.failedSnackbar('An error occurred while deleting the quiz.');
        }
      );
    }
  }

  // Question Bank Methods
  getQuestionBankStats(): void {
    this.loading = true; // Add loading state
    this.API.getQuestionBank(this.API.getUserData().id).subscribe(
      (data: any) => {
        if (data.success) {
          const questions = data.output;
          console.log('�� Raw questions data:', questions); // Debug log
          
          this.questionBankStats = {
            total: questions.length,
            categories: new Set(questions.map((q: any) => q.category).filter(Boolean)).size,
            multipleChoice: questions.filter((q: any) => q.type === '0').length,
            essay: questions.filter((q: any) => q.type === '3').length
          };
          
          console.log('🔍 Calculated stats:', this.questionBankStats); // Debug log
        }
        this.loading = false;
      },
      (error: any) => {
        console.error('Error loading question bank stats:', error);
        this.loading = false;
      }
    );
  }

  getAllQuestions(): void {
    this.loading = true;
    this.API.getQuestionBank(this.API.getUserData().id).subscribe(
      (data: any) => {
        if (data.success) {
          // ✅ FIX: Sort questions by creation date (recent to oldest)
          this.allQuestions = data.output.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // Apply filters and search
          const filteredQuestions = this.applyQuestionBankFilters();
          
          // Update total count
          this.questionBankTotalItems = filteredQuestions.length;
          
          // Get current page of questions
          this.recentQuestions = this.getPaginatedQuestions(filteredQuestions);
        }
        this.loading = false;
      },
      (error: any) => {
        console.error('Error loading questions:', error);
        this.loading = false;
      }
    );
  }

  applyQuestionBankFilters(): any[] {
    let filtered = [...this.allQuestions];
    
    // Category filter
    if (this.questionBankFilters.category && this.questionBankFilters.category !== 'all') {
      filtered = filtered.filter(q => q.category === this.questionBankFilters.category);
    }
    
    // Type filter
    if (this.questionBankFilters.type && this.questionBankFilters.type !== 'all') {
      filtered = filtered.filter(q => q.type === this.questionBankFilters.type);
    }
    
    // Search filter
    if (this.questionBankFilters.search.trim()) {
      const searchTerm = this.questionBankFilters.search.toLowerCase();
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchTerm) ||
        q.answer.toLowerCase().includes(searchTerm) ||
        (q.category && q.category.toLowerCase().includes(searchTerm))
      );
    }
    
    // ✅ MAINTAIN: Questions are already sorted by creation date (recent to oldest)
    // No need to sort again here since getAllQuestions() already sorts them
    
    return filtered;
  }

getPaginatedQuestions(questions: any[]): any[] {
  const start = this.questionBankPage * this.questionBankItemsPerPage;
  const end = start + this.questionBankItemsPerPage;
  return questions.slice(start, end);
}

onQuestionBankFilterChange(event?: Event): void {
  if (event) {
    // Handle event-based changes
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.questionBankFilters[target.name as keyof typeof this.questionBankFilters] = target.value;
    }
  }
  
  // Always reset page and apply filters
  this.questionBankPage = 0; // Reset to first page
  const filteredQuestions = this.applyQuestionBankFilters();
  this.questionBankTotalItems = filteredQuestions.length;
  this.recentQuestions = this.getPaginatedQuestions(filteredQuestions);
}

onQuestionBankSearch(event?: Event): void {
  if (event) {
    // Handle event-based changes
    const target = event.target as HTMLInputElement;
    if (target) {
      this.questionBankFilters.search = target.value;
    }
  }
  
  // Always reset page and apply filters
  this.questionBankPage = 0; // Reset to first page
  const filteredQuestions = this.applyQuestionBankFilters();
  this.questionBankTotalItems = filteredQuestions.length;
  this.recentQuestions = this.getPaginatedQuestions(filteredQuestions);
}

onQuestionBankPageChange(page: number): void {
  this.questionBankPage = page;
  const filteredQuestions = this.applyQuestionBankFilters();
  this.recentQuestions = this.getPaginatedQuestions(filteredQuestions);
}

onQuestionBankItemsPerPageChange(event?: Event): void {
  if (event) {
    // Handle event-based changes
    const target = event.target as HTMLSelectElement;
    if (target) {
      const itemsPerPage = parseInt(target.value);
      this.questionBankItemsPerPage = itemsPerPage;
    }
  }
  
  // Always reset page and apply filters
  this.questionBankPage = 0; // Reset to first page
  const filteredQuestions = this.applyQuestionBankFilters();
  this.recentQuestions = this.getPaginatedQuestions(filteredQuestions);
}

get questionBankTotalPages(): number {
  return Math.ceil(this.questionBankTotalItems / this.questionBankItemsPerPage);
}

getPageNumbers(): number[] {
  const totalPages = this.questionBankTotalPages;
  const currentPage = this.questionBankPage;
  const pages: number[] = [];
  
  // Show max 5 page numbers around current page
  const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  
  for (let i = start; i < end; i++) {
    pages.push(i);
  }
  
  return pages;
}

clearQuestionBankFilters(): void {
  this.questionBankFilters = {
    category: 'all',
    type: 'all',
    search: ''
  };
  this.questionBankPage = 0;
  // ✅ FIX: Call without parameters since it's a reset
  this.onQuestionBankFilterChange();
}

  getQuestionTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      '0': 'Multiple Choice',
      '1': 'True/False',
      '2': 'Identification',
      '3': 'Essay'
    };
    return typeMap[type] || type;
  }

  getQuestionPreview(question: string): string {
    return question.length > 100 ? question.substring(0, 100) + '...' : question;
  }

  openQuestionBankModal(): void {
    console.log('Opening question bank modal...');
    
    this.showAddQuestionModal = true;
    
  }
  
  openQuestionBankBrowser(): void {
    // Open a modal to browse all questions
    console.log('Opening question bank browser...');
    
    // Option 1: Use your existing quiz bank component
    const modalRef = this.modalService.open(QuizBankComponent, {
      size: 'xl',
      backdrop: 'static'
    });
    
    // Handle questions selected from bank
    modalRef.componentInstance.questionsSelected.subscribe((questions: any[]) => {
      console.log('Questions selected from bank:', questions);
      
      // Close the browse modal
      modalRef.close();
      
      // Open quiz creation modal with selected questions
      this.openQuizCreationWithQuestions(questions);
    });
  }

  openQuizCreationWithQuestions(selectedQuestions: any[]): void {
    console.log('Opening quiz creation with questions:', selectedQuestions);
    
    // Store the selected questions in this component
    this.selectedQuestionsFromBank = selectedQuestions;
    
    // Open the quiz creation modal
    this.createQuiz();
  }
  
  editQuestion(question: any): void {
    console.log('🔄 Editing question:', question);
    this.selectedQuestionForEdit = { ...question };
    
    // ✅ FIX: Properly initialize multiple choice options for editing
    if (question.type === '0' && question.options) {
      // Parse the options string into an array
      this.editMultipleChoiceOptions = question.options.split('\n').filter((opt: string) => opt.trim());
      
      // Ensure we always have 4 options
      while (this.editMultipleChoiceOptions.length < 4) {
        this.editMultipleChoiceOptions.push('');
      }
      
      // Convert answer to number if it's a string
      if (typeof this.selectedQuestionForEdit.answer === 'string') {
        this.selectedQuestionForEdit.answer = parseInt(this.selectedQuestionForEdit.answer);
      }
    }
    
    this.showEditQuestionModal = true;
    console.log('🔄 Edit modal opened with options:', this.editMultipleChoiceOptions);
  }

  onEditOptionChange(index: number, event: any): void {
    const value = event.target.value;
    this.editMultipleChoiceOptions[index] = value;
    
    // Update the selectedQuestionForEdit options string
    this.selectedQuestionForEdit.options = this.editMultipleChoiceOptions.join('\n');
    
    console.log('🔄 Option changed:', { index, value, options: this.editMultipleChoiceOptions });
  }
  
  deleteQuestion(questionId: number): void {
    console.log('🗑️ Delete button clicked for question ID:', questionId);
    console.log('��️ Current questions count before deletion:', this.recentQuestions.length);
    
    if (confirm('Are you sure you want to delete this question?')) {
      console.log('🗑️ User confirmed deletion, calling API...');
      
      this.API.deleteQuestionFromBank(questionId).subscribe(
        (response: any) => {
          console.log('🗑️ API response:', response);
          
          if (response.success) {
            this.API.successSnackbar('Question deleted successfully!');
            
            // ✅ ADD: Log the current state
            console.log('🗑️ About to refresh data...');
            
            // ✅ FIX: Refresh BOTH the stats AND the recent questions
            this.getQuestionBankStats();
            this.getAllQuestions(); // This was missing!
            
            // ✅ ADD: Force UI refresh
            this.cdRef.detectChanges();
            
            console.log('🗑️ Data refresh completed');
          } else {
            this.API.failedSnackbar('Failed to delete question.');
          }
        },
        (error: any) => {
          console.error('🗑️ Error deleting question:', error);
          this.API.failedSnackbar('An error occurred while deleting the question.');
        }
      );
    } else {
      console.log('🗑️ User cancelled deletion');
    }
  }

  addNewQuestion(): void {
    if (!this.isFormValid()) {
      this.API.failedSnackbar('Please fill in all required fields');
      return;
    }
    
    let questionData: any = {
      question: this.newQuestion.question,
      type: this.newQuestion.type,
      category: this.newQuestion.category || '',
      created_by: this.API.getUserData().id
    };
    
    // Handle different question types
    switch (this.newQuestion.type) {
      case '0': // Multiple Choice
        questionData.answer = this.newQuestion.answer;
        questionData.options = this.multipleChoiceOptions.join('\n\n');
        break;
      case '1': // True/False
        questionData.answer = this.newQuestion.answer;
        questionData.options = 'TRUE\n\nFALSE';
        break;
      case '2': // Identification
      case '3': // Essay
        questionData.answer = this.newQuestion.answer;
        break;
    }
    
    this.API.saveQuestionToBank(questionData).subscribe(
      (response: any) => {
        if (response.success) {
          this.API.successSnackbar('Question added successfully!');
          this.showAddQuestionModal = false;
          this.resetNewQuestionForm();
          // Refresh the data
          this.getQuestionBankStats();
          this.getAllQuestions();
        } else {
          this.API.failedSnackbar('Failed to add question: ' + response.output);
        }
      },
      (error: any) => {
        console.error('Error adding question:', error);
        this.API.failedSnackbar('An error occurred while adding the question');
      }
    );
  }

  onQuestionTypeChange(): void {
    // Reset answer when type changes
    this.newQuestion.answer = '';
    
    // Initialize multiple choice options if switching to multiple choice
    if (this.newQuestion.type === '0') {
      this.multipleChoiceOptions = ['', '', '', ''];
    }
  }

  debugFormValidation(): void {
    console.log('=== Form Validation Debug ===');
    console.log('Question:', this.newQuestion.question);
    console.log('Type:', this.newQuestion.type);
    console.log('Answer:', this.newQuestion.answer);
    console.log('Category:', this.newQuestion.category);
    console.log('Multiple Choice Options:', this.multipleChoiceOptions);
    console.log('Form Valid:', this.isFormValid());
    console.log('=== End Debug ===');
  }
  
  // Add this method to validate form based on question type
  isFormValid(): boolean {
    // Check basic required fields
    if (!this.newQuestion.question || !this.newQuestion.type) {
      return false;
    }
    
    // Check question type specific validation
    switch (this.newQuestion.type) {
      case '0': // Multiple Choice
        // Check if all options are filled and correct answer is selected
        const allOptionsFilled = this.multipleChoiceOptions.every(opt => opt.trim() !== '');
        const correctAnswerSelected = this.newQuestion.answer !== '' && 
                                     this.newQuestion.answer >= 0 && 
                                     this.newQuestion.answer < 4;
        return allOptionsFilled && correctAnswerSelected;
        
      case '1': // True/False
        return this.newQuestion.answer === 'T' || this.newQuestion.answer === 'F';
        
      case '2': // Identification
      case '3': // Essay
        return this.newQuestion.answer.trim() !== '';
        
      default:
        return false;
    }
  }

  updateMultipleChoiceOption(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      // Only update the specific option at the given index
      this.multipleChoiceOptions[index] = target.value;
      
      // Log for debugging
      console.log('Updated option', index, 'to:', target.value);
      console.log('All options now:', this.multipleChoiceOptions);
      
      // Force change detection
      this.multipleChoiceOptions = [...this.multipleChoiceOptions];
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
  
  // Add this method to handle adding new categories
  addNewCategory(): void {
    if (this.newCategoryName.trim()) {
      console.log('Adding new category:', this.newCategoryName.trim());
      
      // Add to existing categories if not already there
      if (!this.existingCategories.includes(this.newCategoryName.trim())) {
        this.existingCategories.push(this.newCategoryName.trim());
        console.log('Category added to list:', this.existingCategories);
      }
      
      // Set the new category as selected
      this.newQuestion.category = this.newCategoryName.trim();
      console.log('Category set for question:', this.newQuestion.category);
      
      // Reset the new category input
      this.newCategoryName = '';
      this.showNewCategoryInput = false;
      
      // Force change detection
      this.existingCategories = [...this.existingCategories];
    } else {
      console.log('Category name is empty');
    }
  }

  onCategoryChange(): void {
    console.log('Category changed to:', this.newQuestion.category);
    
    if (this.newQuestion.category === '__NEW__') {
      this.showNewCategoryInput = true;
      this.newCategoryName = '';
    } else {
      this.showNewCategoryInput = false;
    }
  }
  
  // Fix the cancelNewCategory method
  cancelNewCategory(): void {
    console.log('Canceling new category');
    this.newCategoryName = '';
    this.showNewCategoryInput = false;
    this.newQuestion.category = '';
  }
  
  updateExistingQuestion(): void {
    if (!this.isEditFormValid()) {
      this.API.failedSnackbar('Please fill in all required fields');
      return;
    }
    
    console.log('🔄 Updating question:', this.selectedQuestionForEdit);
    
    // Prepare the update data
    const updateData: any = {
      question: this.selectedQuestionForEdit.question,
      type: this.selectedQuestionForEdit.type,
      answer: this.selectedQuestionForEdit.answer.toString(),
      category: this.selectedQuestionForEdit.category || ''
    };
    
    // Handle multiple choice options
    if (this.selectedQuestionForEdit.type === '0') {
      updateData.options = this.editMultipleChoiceOptions.join('\n');
    }
    
    console.log('🔄 Update data prepared:', updateData);
    
    this.API.updateQuestionInBank(this.selectedQuestionForEdit.id, updateData).subscribe(
      (response: any) => {
        if (response.success) {
          this.API.successSnackbar('Question updated successfully!');
          this.showEditQuestionModal = false;
          
          // Refresh the data
          this.getQuestionBankStats();
          this.getAllQuestions();
          this.cdRef.detectChanges();
        } else {
          this.API.failedSnackbar('Failed to update question: ' + (response.output || 'Unknown error'));
        }
      },
      (error: any) => {
        console.error('Error updating question:', error);
        this.API.failedSnackbar('An error occurred while updating the question');
      }
    );
  }

  onEditQuestionTypeChange(): void {
    console.log('🔄 Question type changed to:', this.selectedQuestionForEdit.type);
    
    // Reset answer when type changes
    this.selectedQuestionForEdit.answer = '';
    
    // Initialize options for multiple choice
    if (this.selectedQuestionForEdit.type === '0') {
      this.editMultipleChoiceOptions = ['', '', '', ''];
    }
  }
  
  // Add this method to validate edit form
  isEditFormValid(): boolean {
    if (!this.selectedQuestionForEdit) return false;
    
    const question = this.selectedQuestionForEdit;
    
    // Basic validation
    if (!question.question?.trim() || !question.answer?.toString().trim()) {
      return false;
    }
    
    // Type-specific validation
    if (question.type === '0') {
      // Multiple choice: need at least 2 non-empty options and a valid answer
      const validOptions = this.editMultipleChoiceOptions.filter(opt => opt.trim().length > 0);
      const hasValidAnswer = question.answer >= 0 && question.answer < validOptions.length;
      
      return validOptions.length >= 2 && hasValidAnswer;
    }
    
    if (question.type === '1') {
      // True/False: answer must be T or F
      return question.answer === 'T' || question.answer === 'F';
    }
    
    // For other types, just need question and answer
    return true;
  }
  
  resetNewQuestionForm(): void {
    this.newQuestion = {
      type: '0',
      question: '',
      answer: '',
      category: ''
    };
    this.multipleChoiceOptions = ['', '', '', ''];
    this.showNewCategoryInput = false;
    this.newCategoryName = '';
  }

  // Methods for custom table data
  getQuizTableData(): any[] {
    return this.paginatedQuizzes().map((quiz: any) => ({
      ...quiz,
      createdOn: this.parseDate(quiz.time),
      deadline: this.parseDate(quiz.deadline)
    }));
  }

  getStudentTableData(): any[] {
    return this.quizStudentData.map((student: any) => ({
      ...student,
      scoreDisplay: `${student.score}/${student.totalPoints}`,
      percentageDisplay: `${student.percentage}%`
    }));
  }

  handleQuizAction(event: {action: string, row: any}): void {
    const { action, row } = event;
    if (action === 'edit') {
      this.editQuiz(row);
    } else if (action === 'delete') {
      this.deleteQuiz(row.id);
    }
  }

  handleStudentAction(event: {action: string, row: any}): void {
    const { action, row } = event;
    if (action === 'feedback') {
      this.openFeedbackModal(row);
    }
  }
}