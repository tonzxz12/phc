import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-taskcreation',
  templateUrl: './taskcreation.component.html',
  styleUrls: ['./taskcreation.component.css']
})
export class TaskcreationComponent implements OnInit {
  @Input() task: any; // For editing an existing task
  @Input() courses: any = [];
  @Input() classes: any = [];
  filteredClasses: any = []; // Local array for dynamically loaded classes

  course: string = '';
  class: string = '';
  deadline: string = '';
  title: string = '';
  description: string = '';
  file: File | null = null;
  isEditMode: boolean = false;
  existingAttachment: string | undefined;

  // Grading rubric fields
  selectedRubricId: number | null = null;
  availableRubrics: any[] = [];
  gradingMethod: string = 'traditional'; // 'traditional' | 'rubric'
  resubmitLimit: number = 1;

  // Assignment specific fields (no need for task type since this is always 'assignment')
  taskType: string = 'assignment'; // Fixed as assignment

  constructor(
    private API: APIService,  
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    // Set task type to assignment since this component is assignment-specific
    this.taskType = 'assignment';
    
    // Initialize filtered classes with input classes
    this.filteredClasses = [...this.classes];
    
    // Load teacher's available rubrics
    this.loadAvailableRubrics();

    if (this.task) {
      this.isEditMode = true;
      this.title = this.task.title;
      this.description = this.task.details;
      this.deadline = this.task.deadline;
      this.course = this.task.courseid;
      this.class = this.task.classid;
      this.existingAttachment = this.task.attachments;
      this.selectedRubricId = this.task.rubric_id;
      this.gradingMethod = this.task.grading_method || 'traditional';
      this.resubmitLimit = this.task.resubmit_limit || 1;

      // Load classes for the selected course when editing
      if (this.course) {
        this.loadClasses(this.course);
      }
    }
  }

  // Get the course name for display
  getCourseName(courseId: string): string {
    const course = this.courses.find((c: any) => c.id === courseId);
    return course ? course.course : 'N/A';
  }

  // Load available grading rubrics for the teacher
  loadAvailableRubrics(): void {
    // TODO: Add this method to API service
    // For now, we'll simulate some rubrics
    this.availableRubrics = [
      { id: 1, name: 'Essay Grading Rubric', description: 'For essay assignments', total_points: 100 },
      { id: 2, name: 'Project Assessment Rubric', description: 'For project submissions', total_points: 150 },
      { id: 3, name: 'Presentation Rubric', description: 'For oral presentations', total_points: 80 }
    ];
    
    // Uncomment when API method is implemented:
    /*
    this.API.getTeacherRubrics().subscribe({
      next: (response: any) => {
        this.availableRubrics = response.output || [];
      },
      error: (error: any) => {
        console.error('Error loading rubrics:', error);
        this.availableRubrics = [];
      }
    });
    */
  }

  // Handle grading method change
  onGradingMethodChange(method: string): void {
    this.gradingMethod = method;
    if (method === 'traditional') {
      this.selectedRubricId = null;
    }
  }

  // Get the class name for display
  getClassName(classId: string): string {
    // First check filtered classes (dynamically loaded)
    let classData = this.filteredClasses.find((c: any) => c.id === classId);
    if (classData) return classData.name;
    
    // Fallback to input classes
    classData = this.classes.find((c: any) => c.id === classId);
    return classData ? classData.name : 'N/A';
  }

  loadClasses(courseId: string) {
    if (courseId) {
      console.log('Loading classes for courseId:', courseId);
      this.API.teacherGetClassesByCourse(courseId).subscribe(
        (data: any) => {
          console.log('Classes response:', data);
          if (data.success) {
            console.log('Classes output:', data.output);
            this.filteredClasses = data.output.map((_class: any) => {
              console.log('Mapping class:', _class);
              return {
                id: _class.ID || _class.id,
                name: _class.Class || _class.class || _class.ClassName,
                courseId: _class.CourseID || _class.courseid,
              };
            });
            console.log('Filtered classes:', this.filteredClasses);
            // Ensure the class is still set after loading
            if (this.isEditMode && this.task.classid) {
              this.class = this.task.classid;
            }
          } else {
            console.error('API failed with message:', data.output);
            this.API.failedSnackbar('Failed loading classes');
            this.filteredClasses = [];
          }
        },
        (error) => {
          console.error('Error loading classes:', error);
          this.API.failedSnackbar('Error loading classes');
          this.filteredClasses = [];
        }
      );
    } else {
      this.filteredClasses = [];
    }
  }

  onCourseChange(courseId: string) {
    console.log('Course changed to:', courseId);
    this.class = ''; // Clear the selected class when a new course is selected
    this.loadClasses(courseId);
  }

  onFileSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      this.file = inputElement.files[0];
    }
  }

  openAttachment(url: string): void {
    this.API.openFile(url);
  }

  closeModal(close?: string) {
    this.activeModal.close(close);
  }

  async createOrUpdateTask() {
    let attachments = this.isEditMode ? this.existingAttachment : undefined;

    this.API.justSnackbar(this.isEditMode ? 'Updating task...' : 'Creating task...', 9999999);

    // Handle file upload if a new file is selected
    if (this.file) {
      const fileParts = this.file.name.split('.');
      const serverLocation = this.API.createID36() + '.' + fileParts[fileParts.length - 1];
      await this.API.uploadFileWithProgress(this.file, serverLocation);
      const fileLocation = 'files/' + serverLocation;
      const filename = this.file.name;
      attachments = fileLocation + '>' + filename;
    }

    // Validate required fields
    if (this.API.checkInputs([this.deadline, this.title, this.description, this.course, this.class])) {
      if (this.isEditMode) {
        this.updateTask(attachments);
      } else {
        this.createTask(attachments);
      }
    } else {
      this.API.failedSnackbar('Please fill out all the fields.');
    }
  }

  createTask(attachments?: string) {
    console.log('🎯 Creating assignment with values:', {
      course: this.course,
      class: this.class,
      title: this.title,
      description: this.description,
      deadline: this.deadline,
      attachments: attachments,
      selectedRubricId: this.selectedRubricId,
      gradingMethod: this.gradingMethod,
      resubmitLimit: this.resubmitLimit,
      taskType: this.taskType
    });

    this.API.createTask(
      this.course, 
      this.class, 
      this.title, 
      this.description, 
      this.deadline, 
      attachments,
      this.selectedRubricId,
      this.gradingMethod,
      this.resubmitLimit
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Assignment creation succeeded:', response);
        this.API.successSnackbar('Assignment created!');
        this.API.notifyStudentsInCourse(
          `${this.API.getFullName()} uploaded a new assignment.`,
          `${this.API.getFullName()} uploaded a new assignment titled, <b>'${this.title}'</b>. Kindly take a moment to check the specified assignment. The assignment is due on <b>${this.API.parseDate(this.deadline)}</b>.`,
          this.course
        );
        this.closeModal('update');
      },
      error: (error: any) => {
        console.error('❌ Assignment creation failed:', error);
        this.API.failedSnackbar('Failed to create assignment. Please try again.');
      }
    });
  }

  updateTask(attachments?: string) {
    this.API.editTask(
      this.task.id, 
      this.title, 
      this.description, 
      this.deadline, 
      attachments,
      this.selectedRubricId,
      this.gradingMethod,
      this.resubmitLimit,
      this.taskType  // Always 'assignment'
    ).subscribe(() => {
      this.API.successSnackbar('Assignment updated successfully!');
      this.closeModal('update');
    });
  }
}