import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NewclassComponent } from '../teacher-modals/newclass/newclass.component';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

// Define interfaces at the top
interface Course {
  id: string;
  course: string;
  title?: string;
  pretest: boolean;
}

interface Class {
  id: string;
  class: string; // Note: 'class' is a reserved keyword, but Angular allows it in this context
  classcode: string;
  courseId: string;
  duration: number;
  course?: string;
  studentcount?: number;
  name?: string; // Optional for dropdown
}

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  class: string; // Assuming this is the class code or ID linking to Class
}

@Component({
  selector: 'app-manageclass',
  templateUrl: './manageclass.component.html',
  styleUrls: ['./manageclass.component.css'],
})
export class ManageclassComponent implements OnInit {
  // Class-related properties
  courses: Course[] = []; // Changed from Map to array
  classes: Class[] = [];
  filteredClasses: Class[] = [];
  selectedClass: Class | null = null;
  errorMessage: string = ''; // Store the error message
  showCreatePreTestButton: boolean = false; // Control button visibility
  // Properties referenced in template but missing in component
  currentCourse: Course | null = null;
  currentClass: Class | null = null;
  loading: boolean = false;
  itemsPerPage: number = 10;

  // Student-related properties
  students: Student[] = [];
  filteredStudents: Student[] = [];
  selectedStudent: string | null = null;
  selectedStudentForAdd: string | null = null; // For add student modal
  searchTerm: string = '';
  allStudents: Student[] = []; // All students in the system
  availableStudents: Student[] = []; // Students not in current class
  
  // Student management modals
  displayAddStudentModal: boolean = false;
  displayRemoveStudentModal: boolean = false;
  showAddStudentModal: boolean = false; // For custom modal
  studentToRemove: Student | null = null;

  displayNewClassModal: boolean = false;
  newClass = {
    className: '',
    courseId: '',
    duration: null as number | null,
    classCode: '',
    isActive: true,
    schedule: ''
  };
  courseOptions: any[] = [];
  isSaving: boolean = false;

  classOptions: any[] = [];

  displayEditClassModal: boolean = false;
  classToEdit = {
    classID: '',
    className: '',
    courseId: '',
    duration: 0,
    classCode: '',
    schedule: '',
  };

  value = 0;
  activeTab: string = 'classes';

  constructor(
    private modalService: NgbModal,
    private API: APIService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCourses().then(() => {
      this.loadClasses();
      this.loadStudents();
      this.loadAllStudents(); // Load all students for adding to classes
      this.populateCourseOptions(); // Populate options after courses are loaded  
    });
  }

  populateCourseOptions(): void {
    this.courseOptions = this.courses.map((course) => ({
      label: course.course || 'Unnamed Course',
      value: course.id
    }));
    console.log('Generated courseOptions:', this.courseOptions);
    this.cdr.detectChanges();
  }

  openNewClassModal(): void {
  if (this.courseOptions.length === 0) {
    this.API.failedSnackbar('No courses available');
    return;
  }
  this.displayNewClassModal = true;
  this.newClass = {
    className: '',
    courseId: '',
    duration: null, // Ensure null to force user input
    classCode: '',
    isActive: true,
    schedule: ''
  };
}
  

  // saveNewClass(): void {
  //   if (!this.isClassFormValid()) return;
  
  //   this.isSaving = true;
    
  //   this.API.createClass(
  //     this.newClass.courseId,
  //     this.newClass.className,
  //     this.newClass.classCode,
  //     this.newClass.schedule || '',
  //     this.newClass.duration!
  //   ).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.API.successSnackbar('Class created successfully');
  //         this.loadClasses();
  //         this.closeNewClassModal();
  //       }
  //     },
  //     error: (error) => {
  //       this.API.failedSnackbar('Failed to create class');
  //       console.error(error);
  //     },
  //     complete: () => {
  //       this.isSaving = false;
  //     }
  //   });
  // }

saveNewClass(): void {
  console.log('Starting saveNewClass with data:', this.newClass);

  if (!this.isClassFormValid()) {
    console.log('Form validation failed:', this.newClass);
    this.API.failedSnackbar('Please fill all required fields');
    return;
  }

  this.isSaving = true;
  console.log('Form valid, proceeding with API call');

  const selectedCourse = this.courses.find(course => course.id === this.newClass.courseId);
  console.log('Selected course:', selectedCourse);

  this.API.courseRequiresPretest(this.newClass.courseId)
    .then(requiresPretest => {
      console.log(`Course ${this.newClass.courseId} requires pretest:`, requiresPretest);
      if (requiresPretest) {
        return this.API.pretestExists(this.newClass.courseId)
          .then(exists => {
            console.log(`Pretest exists for course ${this.newClass.courseId}:`, exists);
            if (!exists) {
              console.log('Pretest required but missing, showing error modal');
              this.selectedErrorCourseId = this.newClass.courseId;
              this.displayErrorModal = true;
              this.isSaving = false;
              throw new Error('Pretest required but not found');
            }
            return true;
          });
      }
      return true;
    })
    .then(canProceed => {
      if (!canProceed) {
        console.log('Cannot proceed due to pretest check');
        return;
      }

      console.log('Calling createClass with:', {
        courseId: this.newClass.courseId,
        className: this.newClass.className,
        classCode: this.newClass.classCode,
        schedule: this.newClass.schedule || '',
        duration: this.newClass.duration
      });

      this.API.createClass(
        this.newClass.courseId,
        this.newClass.className,
        this.newClass.classCode,
        this.newClass.schedule || 'M, T, W, Th, F, Sa, Su',
        this.newClass.duration!
      ).subscribe({
        next: (response) => {
          console.log('createClass response:', response);
          if (response.success) {
            this.API.successSnackbar('Class created successfully');
            this.loadClasses();
            this.closeNewClassModal();
          } else {
            console.error('createClass failed:', response.message || 'No message provided');
            this.API.failedSnackbar('Failed to create class: ' + (response.message || 'Unknown error'));
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('createClass API error:', error);
          this.API.failedSnackbar('Failed to create class: ' + (error.message || 'Server error'));
          this.isSaving = false;
        },
        complete: () => {
          console.log('createClass subscription completed');
          this.isSaving = false;
        }
      });
    })
    .catch(error => {
      console.error('Error in saveNewClass process:', error);
      if (error.message !== 'Pretest required but not found') {
        this.API.failedSnackbar('An unexpected error occurred');
      }
      this.isSaving = false;
    });
}
  
  
  // Update openModal() to use the new modal
  openModal(): void {
    if (this.courses.length === 0) {
      this.loadCourses().then(() => {
        this.populateCourseOptions();
        this.openNewClassModal();
      });
    } else {
      this.populateCourseOptions();
      this.openNewClassModal();
    }
  }

isClassFormValid(): boolean {
  const isValid = !!(
    this.newClass.className.trim() &&
    this.newClass.courseId &&
    this.newClass.duration !== null &&
    this.newClass.duration > 0 &&
    this.newClass.classCode.trim()
  );
  console.log('Form validation check:', {
    className: this.newClass.className.trim(),
    courseId: this.newClass.courseId,
    duration: this.newClass.duration,
    classCode: this.newClass.classCode.trim(),
    isValid: isValid
  });
  return isValid;
}

  isEditClassFormValid(): boolean {
    return !!(
      this.classToEdit.className.trim() &&
      this.classToEdit.courseId &&
      this.classToEdit.duration > 0 && // Ensure duration is greater than 0
      this.classToEdit.classCode.trim()
    );
  }

  // URL helper
  getURL(file: string): string {
    return file.includes('http') ? file : this.API.getURL(file);
  }

  // Class management
  loadClasses(): void {
    this.loading = true;
    this.API.showLoader();
    this.API.teacherAllClasses().subscribe(data => {
      if (data.success) {
        this.classes = data.output.map((cls: any): Class => ({
          id: cls.id,
          class: cls.class,
          classcode: cls.classcode,
          courseId: cls.courseId || cls.courseid, // Handle API inconsistencies
          duration: cls.duration,
          course: cls.course,
          studentcount: cls.studentcount,
          name: cls.class // For dropdown
        }));
        this.filteredClasses = [...this.classes]; // Default to all classes
        this.populateClassOptions();
      } else {
        this.API.failedSnackbar('Unable to connect to the server.', 3000);
      }
      this.loading = false;
      this.API.hideLoader();
    });
  }
  
  loadCourses(): Promise<void> {
  return new Promise((resolve) => {
    this.API.showLoader();
    this.API.teacherAllCourses().subscribe({
      next: (data) => {
        if (data.success) {
          console.log('All courses data:', data.output); // Log raw course data
          this.courses = data.output.map((course: any): Course => {
            console.log(`Course "${course.course}" (ID: ${course.id}) pretest status:`, course.pretest);
            return {
              id: course.id,
              course: course.course,
              title: course.course, // For dropdown
              pretest: course.pretest // Add pretest property to Course interface
            };
          });
          this.populateCourseOptions();
        } else {
          this.API.failedSnackbar('Failed loading courses');
        }
        this.API.hideLoader();
        resolve();
      },
      error: (error) => {
        console.error('API Error:', error);
        this.API.hideLoader();
        resolve();
      }
    });
  });
}

  openEditModal(classID: string, className: string, classCode: string, courseID: string, duration: number): void {
    this.classToEdit = {
      classID,
      className,
      courseId: courseID,
      duration,
      classCode,
      schedule: '' // Set schedule to empty or retrieve from API if available
    };
    this.displayEditClassModal = true;
  }

  closeEditClassModal(): void {
    this.displayEditClassModal = false;
    this.classToEdit = {
      classID: '',
      className: '',
      courseId: '',
      duration: 0,
      classCode: '',
      schedule: ''
    };
  }

  saveEditedClass(): void {
    if (!this.isEditClassFormValid()) return;

    this.isSaving = true;

    this.API.editClass(
      this.classToEdit.classID,
      this.classToEdit.className,
      this.classToEdit.classCode,
      this.classToEdit.schedule || '', // Use schedule, default to empty if not provided
      this.classToEdit.duration
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.API.successSnackbar('Class updated successfully');
          this.loadClasses();
          this.closeEditClassModal();
        }
      },
      error: (error) => {
        this.API.failedSnackbar('Failed to update class');
        console.error(error);
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  deleteClass(classID: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(result => {
      if (result.isConfirmed) {
        this.API.deleteClass(classID).subscribe(() => {
          this.loadClasses();
          Swal.fire('Deleted!', 'Your class has been deleted.', 'success');
        });
      }
    });
  }

  // New methods needed for template
  paginatedClasses(): any[] {
    return this.filteredClasses;
  }

  changeCourse(course: Course | null): void {
    this.currentCourse = course;
    this.currentClass = null; // Reset class selection
    if (course) {
      this.filteredClasses = this.classes.filter(cls => cls.courseId === course.id);
    } else {
      this.filteredClasses = [...this.classes]; // Show all classes if no course selected
    }
    this.applyFilters();
    this.cdr.detectChanges(); // Force table update
  }

  changeClass(classObj: Class | null): void {
    this.currentClass = classObj;
    this.selectClass(classObj); // Maintain selection logic
    if (classObj) {
      this.filteredClasses = [classObj]; // Show only the selected class
      this.loadStudentsInClass(classObj.id); // Load students for this class
    } else if (this.currentCourse) {
      this.filteredClasses = this.classes.filter(cls => cls.courseId === this.currentCourse!.id); // Revert to course filter
      this.filteredStudents = []; // Clear students when no class selected
    } else {
      this.filteredClasses = [...this.classes]; // Show all if no class or course
      this.filteredStudents = []; // Clear students when no class selected
    }
    console.log('Current class:', this.currentClass);
    this.applyFilters();
    this.cdr.detectChanges(); // Force table update
  }

  // For handling class objects in the template
  handleEditClass(classObj: any): void {
    this.openEditModal(
      classObj.id,
      classObj.class,
      classObj.classcode,
      classObj.courseId,
      classObj.duration
    );
  }

  // Student management
  loadStudents(): void {
    this.API.getStudentsTeacher().subscribe(data => { 
      if (data.success) {
        this.students = data.output.map((student: any): Student => {
          console.log('Student data:', student); // Log raw student data
          return {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
            email: student.email,
            class: student.class // Log this specifically
          };
        });
        console.log('Mapped students:', this.students); // Log mapped students
        this.applyFilters();
      } else {
        this.API.failedSnackbar('Unable to load student data');
      }
    });
  }

  // Load all students in the system for adding to classes
  loadAllStudents(): void {
    console.log('Loading all students for filtering...');
    this.API.getStudents().subscribe({
      next: (response) => {
        console.log('All students API response:', response);
        if (response.success && response.output) {
          this.allStudents = response.output.map((student: any): Student => {
            const studentId = student.ID || student.id || student.StudentID;
            console.log('Processing student:', student, 'Extracted ID:', studentId);
            
            return {
              id: studentId?.toString() || '',
              firstname: student.FirstName || student.firstname || '',
              lastname: student.LastName || student.lastname || '',
              email: student.Email || student.email || '',
              class: ''
            };
          });
          console.log('All students loaded:', this.allStudents);
          this.updateAvailableStudents();
        } else {
          console.log('No students found or API returned no data');
          this.allStudents = [];
          this.availableStudents = [];
        }
      },
      error: (error) => {
        console.error('Error loading all students:', error);
        this.allStudents = [];
        this.availableStudents = [];
      }
    });
  }

  // Load students in a specific class
  loadStudentsInClass(classId: string): void {
    console.log('Loading students for class ID:', classId);
    this.API.getStudentsInClass(classId).subscribe(data => {
      console.log('Students in class API response:', data);
      if (data.success) {
        console.log('Raw student data:', data.output);
        this.filteredStudents = data.output.map((student: any): Student => {
          console.log('Mapping student:', student);
          return {
            id: student.student_id || student.ID,
            firstname: student.FirstName || student.firstname || '',
            lastname: student.LastName || student.lastname || '',
            email: student.Email || student.email || '',
            class: student.classcode || student.class || ''
          };
        });
        console.log('Mapped filtered students:', this.filteredStudents);
        // Update available students after loading students in class
        this.updateAvailableStudents();
      } else {
        console.error('API returned error:', data);
        this.filteredStudents = [];
        this.API.failedSnackbar('Unable to load students for this class');
      }
    },
    error => {
      console.error('Error loading students in class:', error);
      this.filteredStudents = [];
    });
  }

  selectClass(classData: any): void {
    this.selectedClass = classData;
  }

  selectStudent(studentId: string): void {
    this.selectedStudent = studentId;
  }

  // Student management modal methods
  openAddStudentModal(): void {
    if (!this.currentClass) {
      this.API.failedSnackbar('Please select a class first');
      return;
    }
    console.log('Opening add student modal...');
    console.log('Current class:', this.currentClass);
    console.log('All students loaded:', this.allStudents.length);
    console.log('Available students:', this.availableStudents.length);
    
    this.showAddStudentModal = true;
    this.selectedStudentForAdd = null; // Reset selection
    
    // Always ensure we have fresh data when opening the modal
    if (this.allStudents.length === 0) {
      console.log('Loading all students...');
      this.loadAllStudents();
    } else {
      console.log('Updating available students...');
      this.updateAvailableStudents();
      
      // If still no available students, try reloading all students
      if (this.availableStudents.length === 0) {
        console.log('No available students found, reloading all students...');
        this.loadAllStudents();
      }
    }
  }

  closeAddStudentModal(): void {
    this.showAddStudentModal = false;
    this.selectedStudentForAdd = null;
  }

  openRemoveStudentModal(student: Student): void {
    console.log('Opening remove student modal for:', student);
    this.studentToRemove = student;
    // Call remove method directly since we're using SweetAlert
    this.removeStudentFromClass();
  }

  closeRemoveStudentModal(): void {
    this.displayRemoveStudentModal = false;
    this.studentToRemove = null;
  }

  // Update available students (those not in current class)
  updateAvailableStudents(): void {
    console.log('Updating available students...');
    console.log('Current class:', this.currentClass);
    console.log('All students:', this.allStudents);
    console.log('Filtered students (in class):', this.filteredStudents);
    
    if (!this.allStudents || this.allStudents.length === 0) {
      console.log('No students available');
      this.availableStudents = [];
      return;
    }

    if (!this.currentClass) {
      console.log('No class selected, showing all students');
      this.availableStudents = [...this.allStudents];
      return;
    }

    // Get students currently in the selected class
    const studentsInClass = (this.filteredStudents || []).map(s => s.id);
    console.log('Students already in class IDs:', studentsInClass);
    
    // Filter out students already in the class
    this.availableStudents = this.allStudents.filter(student => {
      const isInClass = studentsInClass.includes(student.id);
      console.log(`Student ${student.firstname} ${student.lastname} (ID: ${student.id}) - In class: ${isInClass}`);
      return !isInClass;
    });
    console.log('Available students after filtering:', this.availableStudents);
  }

  // Add student to class
  addStudentToClass(): void {
    if (!this.selectedStudentForAdd || !this.currentClass) {
      this.API.failedSnackbar('Please select a student and class');
      return;
    }

    console.log('Adding student to class...');
    console.log('Selected student ID (raw):', this.selectedStudentForAdd, typeof this.selectedStudentForAdd);
    console.log('Current class ID (raw):', this.currentClass.id, typeof this.currentClass.id);

    this.API.showLoader();
    
    // Use IDs as strings since student IDs are UUIDs
    const studentId = this.selectedStudentForAdd.toString();
    const classId = this.currentClass.id.toString();
    
    console.log('String IDs - Student:', studentId, 'Class:', classId);
    
    if (!studentId || !classId || studentId.trim() === '' || classId.trim() === '') {
      console.error('Empty ID values:', { studentId, classId });
      this.API.failedSnackbar(`Empty ID values - Student: ${studentId}, Class: ${classId}`);
      this.API.hideLoader();
      return;
    }
    
    this.API.addStudentToClass(studentId, classId).subscribe({
      next: (response) => {
        console.log('Add student API response:', response);
        if (response.success) {
          this.API.successSnackbar('Student added to class successfully');
          this.loadStudentsInClass(this.currentClass!.id);
          this.loadAllStudents(); // Refresh available students
          this.closeAddStudentModal();
        } else {
          console.error('API returned error:', response);
          this.API.failedSnackbar(response.message || 'Failed to add student to class');
        }
        this.API.hideLoader();
      },
      error: (error) => {
        console.error('Error adding student to class:', error);
        this.API.failedSnackbar('Error adding student to class: ' + (error.message || 'Unknown error'));
        this.API.hideLoader();
      }
    });
  }

  // Remove student from class
  removeStudentFromClass(): void {
    if (!this.studentToRemove || !this.currentClass) {
      console.error('Missing data for removal:', { studentToRemove: this.studentToRemove, currentClass: this.currentClass });
      this.API.failedSnackbar('Invalid operation - missing student or class data');
      return;
    }

    console.log('Removing student from class:', this.studentToRemove, 'from class:', this.currentClass);

    Swal.fire({
      title: 'Are you sure?',
      text: `Remove ${this.studentToRemove.firstname} ${this.studentToRemove.lastname} from ${this.currentClass.name || this.currentClass.class}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove student!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        console.log('User confirmed removal, proceeding...');
        this.API.showLoader();
        
        const studentId = this.studentToRemove!.id;
        const classId = this.currentClass!.id;
        
        console.log('Removing student - ID:', studentId, 'from class ID:', classId);
        
        this.API.removeStudentFromClass(studentId, classId).subscribe({
          next: (response) => {
            console.log('Remove student API response:', response);
            if (response.success) {
              this.API.successSnackbar('Student removed from class successfully');
              this.loadStudentsInClass(this.currentClass!.id);
              this.loadAllStudents(); // Refresh available students
              this.closeRemoveStudentModal();
            } else {
              console.error('API returned error:', response);
              this.API.failedSnackbar(response.message || 'Failed to remove student from class');
            }
            this.API.hideLoader();
          },
          error: (error) => {
            console.error('Error removing student from class:', error);
            this.API.failedSnackbar('Error removing student from class: ' + (error.message || 'Unknown error'));
            this.API.hideLoader();
          }
        });
      } else {
        console.log('User cancelled removal');
        this.closeRemoveStudentModal();
      }
    });
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim().normalize('NFKD').replace(/[^\w\s]/g, '');
    this.filteredClasses = this.classes.filter(cls => {
      const className = cls.class?.toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '') || '';
      return (
        className.includes(term) || // Use 'class' (lowercase) for the class name
        cls.classcode?.toLowerCase().includes(term) ||
        cls.course?.toLowerCase().includes(term) ||
        String(cls.duration).includes(term) ||
        String(cls.studentcount).includes(term)
      );
    });
    console.log('Filtered Classes:', this.filteredClasses);
    this.applyFilters();
    this.cdr.detectChanges(); // Ensure UI updates
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    console.log('Current class:', this.currentClass);
    this.filteredStudents = this.students.filter(student => {
      const matchesSearch = !term || // If no search term, don't filter by it
        `${student.firstname} ${student.lastname}`.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.class?.toLowerCase().includes(term) ||
        student.id?.toLowerCase().includes(term);
  
      const matchesClass = !this.currentClass || // If no class selected, don't filter by it
        student.class === this.currentClass.class; // Assuming 'class' in Student matches 'classcode' in Class
  
      return matchesSearch && matchesClass; // Student must match both conditions
    });
    console.log('Filtered students:', this.filteredStudents);
    this.cdr.detectChanges(); // Ensure UI updates
  }

  // New student modal logic
  populateClassOptions(): void {
    this.classOptions = this.classes.map(cls => ({
      label: `${cls.class} (${cls.classcode})`,
      value: cls.classcode
    }));
  }

  // Utility
  parsetime(schedule: string | undefined): [string, string] {
    if (!schedule) return ['', ''];
    const [days, time] = schedule.split('(');
    return [days.trim(), time?.replace(')', '').trim() || ''];
  }

  closeNewClassModal(): void {
    this.errorMessage = ''; // Clear error when closing modal
    this.showCreatePreTestButton = false; // Hide button when closing modal
    this.displayNewClassModal = false;
  }

  // closeNewClassModal(): void {
  //   this.displayNewClassModal = false;
  // }

  navigateToCourses(): void {
    this.router.navigate(['teacher/quiz-management']);
  }

  displayErrorModal: boolean = false;
selectedErrorCourseId: string = '';

// Helper methods for the error dialog
closeErrorModal(): void {
  this.displayErrorModal = false;
}

getSelectedCourseName(): string {
  if (!this.selectedErrorCourseId) {
    return '';
  }
  
  const selectedCourse = this.courses.find(course => course.id === this.selectedErrorCourseId);
  return selectedCourse ? selectedCourse.course : '';
}
  
  testCreateClass(): void {
  console.log('Testing createClass');
  const testData = {
    courseId: '8db8d91c4a27466290e79dcc4506fa2f', // Replace with a valid course ID from your DB
    className: 'Test Class',
    classCode: 'TEST123',
    schedule: 'M, T, W, Th, F, Sa, Su',
    duration: 30
  };
  this.API.createClass(
    testData.courseId,
    testData.className,
    testData.classCode,
    testData.schedule,
    testData.duration
  ).subscribe({
    next: (response) => console.log('Test createClass response:', response),
    error: (error) => console.error('Test createClass error:', error),
    complete: () => console.log('Test complete')
  });
}

  // Custom table configurations
  classTableColumns = [
    { field: 'class', header: 'Class Name' },
    { field: 'course', header: 'Course' },
    { field: 'classcode', header: 'Class Code' },
    { field: 'duration', header: 'Duration' },
    { field: 'studentcount', header: 'Student Count' },
    { field: 'actions', header: 'Actions' }
  ];

  studentTableColumns = [
    { field: 'id', header: 'Student ID' },
    { field: 'fullName', header: 'Name' },
    { field: 'email', header: 'Email' },
    { field: 'class', header: 'Class Code' },
    { field: 'actions', header: 'Actions' }
  ];

  // Methods for custom table data
  getClassTableData(): any[] {
    return this.paginatedClasses().map((classItem: any) => ({
      ...classItem,
      duration: classItem.duration ? `${classItem.duration} days` : 'N/A',
      studentcount: classItem.studentcount || 0
    }));
  }

  getStudentTableData(): any[] {
    console.log('Getting student table data from filteredStudents:', this.filteredStudents);
    const tableData = this.filteredStudents.map((student: any) => {
      const mapped = {
        ...student,
        fullName: `${student.firstname || 'Unknown'} ${student.lastname || 'User'}`
      };
      console.log('Mapped table row:', mapped);
      return mapped;
    });
    console.log('Final table data:', tableData);
    return tableData;
  }

  handleClassAction(event: {action: string, row: any}): void {
    const { action, row } = event;
    if (action === 'edit') {
      this.handleEditClass(row);
    } else if (action === 'delete') {
      this.deleteClass(row.id);
    }
  }

  handleStudentAction(event: {action: string, row: any}): void {
    const { action, row } = event;
    console.log('Student action triggered:', action, 'for student:', row);
    if (action === 'select') {
      this.selectStudent(row.id);
    } else if (action === 'remove') {
      // Convert row data to Student interface format
      const studentToRemove: Student = {
        id: row.id,
        firstname: row.firstname || 'Unknown',
        lastname: row.lastname || 'User',
        email: row.email || '',
        class: row.class || ''
      };
      this.openRemoveStudentModal(studentToRemove);
    }
  }

}