import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TaskcreationComponent } from '../teacher-modals/taskcreation/taskcreation.component';
import { CreateFeedbackComponent } from '../teacher-modals/create-feedback/create-feedback.component';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';
import { TeacherViewComponent } from '../teacher-view/teacher-view.component';

@Component({
  selector: 'app-task-management',
  templateUrl: './task-management.component.html',
  styleUrls: ['./task-management.component.css'],
})
export class TaskManagementComponent implements OnInit {
  get coursesArray(): any[] {
    return Array.from(this.courses.values());
  }
  currentDate!: string;
  courses: Map<string, any> = new Map();
  tasks: any[] = [];
  filterCourse: string = '';
  filterClass: string = '';
  // Submission filters
  filterSubmissionCourse: string = '';
  filterSubmissionClass: string = '';
  filterAssignmentTitle: string = '';
  filterStudentName: string = '';
  submissions: any[] = [];
  classes: { id: string, name: string }[] = [];
  allClasses: any[] = []; // Cache all classes for filtering
  loading: boolean = false;
  loadingClasses: boolean = false;

  // Tab state and new submissions indicator
  activeTab: string = 'tasks';
  newSubmissionsCount: number = 0;

  // Custom table configurations
  taskTableColumns = [
    { field: 'title', header: 'Task Title' },
    { field: 'deadline', header: 'Due Date' },
    { field: 'course', header: 'Course' },
    { field: 'classname', header: 'Class' },
    { field: 'progress', header: 'Progress' },
    { field: 'actions', header: 'Actions' }
  ];

  submissionTableColumns = [
    { field: 'studentName', header: 'Student Name' },
    { field: 'assignmenttitle', header: 'Assignment Title' },
    { field: 'course', header: 'Course' },
    { field: 'classname', header: 'Class' },
    { field: 'submitted_at', header: 'Submitted At' },
    { field: 'actions', header: 'Actions' }
  ];

  constructor(
    private modalService: NgbModal,
    private API: APIService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    this.API.showLoader();
    const currentDate = new Date();
    this.currentDate = currentDate.toISOString().split('T')[0];

    // Load Courses
    this.API.teacherAllCourses().subscribe((data) => {
      for (let course of data.output) {
        this.courses.set(course.id, course);
      }
      this.loading = false;
      this.API.hideLoader();
    });

    // Load Submissions
    this.API.teacherGetAllSubmissions().subscribe((data) => {
      this.submissions = data.output;
      this.updateNewSubmissionsCount();
    });

    // Load Tasks (and classes will be loaded after tasks are ready)
    this.loadTasks();
  }

  /**
   * Update the count of new submissions (e.g., those submitted today)
   * You can adjust this logic to use a 'read' flag if available.
   */
  updateNewSubmissionsCount() {
    const today = new Date();
    this.newSubmissionsCount = this.submissions.filter(sub => {
      // Example: count submissions from today
      if (!sub.submitted_at) return false;
      const submittedDate = new Date(sub.submitted_at);
      return submittedDate.toDateString() === today.toDateString();
    }).length;
  }

  loadAllClasses() {
    this.loadingClasses = true;
    
    // Simple fallback: Create a basic class list based on available tasks
    // This provides functional class filtering without complex API calls
    if (this.tasks.length > 0) {
      const uniqueClasses = new Map();
      
      this.tasks.forEach(task => {
        console.log('Task class info:', {
          classid: task.classid,
          classname: task.classname,
          courseid: task.courseid
        });
        
        if (task.classid && task.classname) {
          uniqueClasses.set(task.classid, {
            id: task.classid,
            name: task.classname,
            courseid: task.courseid
          });
        }
      });
      
      this.allClasses = Array.from(uniqueClasses.values());
      this.filterClasses(); // Apply current filter
    } else {
      // Create some test classes if no task data available
      this.allClasses = [
        { id: '1', name: 'Test Class 1', courseid: this.filterCourse },
        { id: '2', name: 'Test Class 2', courseid: this.filterCourse }
      ];
      this.classes = [...this.allClasses];
    }
    
    this.loadingClasses = false;
    console.log('Loaded classes from tasks data:', this.allClasses.length, this.allClasses);
  }

  filterClasses() {
    console.log('filterClasses called:', {
      filterCourse: this.filterCourse,
      allClassesLength: this.allClasses.length,
      allClasses: this.allClasses
    });
    
    if (this.filterCourse && this.allClasses.length > 0) {
      // Filter classes by course ID
      const filteredClasses = this.allClasses.filter((_class: any) => 
        _class.courseid == this.filterCourse || _class.CourseID == this.filterCourse
      );
      
      console.log('Filtered classes:', filteredClasses);
      
      this.classes = filteredClasses.map((_class: any) => ({
        id: _class.id || _class.ID,
        name: _class.class || _class.name || 'Unnamed Class',
      }));
      
      console.log('Final classes array:', this.classes);
    } else {
      this.classes = [];
      console.log('No filtering - classes set to empty array');
    }
  }

  getTeacherClasses() {
    // This method now just triggers filtering of already loaded classes
    this.filterClasses();
  }

  loadTasks() {
    this.loading = true;
    this.API.teacherGetTasks().subscribe((data) => {
      this.tasks = data.output.map((task: any) => {
        return {
          ...task,
        };
      });
      this.loading = false;
      
      // Load classes after tasks are ready
      this.loadAllClasses();
    });
  }

  filteredTasks(): any[] {
    let filtered = this.tasks;
    
    // Filter by course if selected
    if (this.filterCourse) {
      filtered = filtered.filter(task => task.courseid === this.filterCourse);
    }
    
    // Filter by class if selected
    if (this.filterClass) {
      filtered = filtered.filter(task => task.classid === this.filterClass);
    }
    
    return filtered;
  }

  isOverdue(deadline: string): boolean {
    if (!deadline) return false;
    const today = new Date();
    const dueDate = new Date(deadline);
    return dueDate < today;
  }
  

  selectCourse(courseId: string) {
    this.filterCourse = courseId;
    this.filterClass = ''; // Reset class filter when course changes
    
    console.log('Course selected:', {
      courseId: courseId,
      filterCourse: this.filterCourse
    });
    
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // If we don't have allClasses data, reload it
      if (this.allClasses.length === 0) {
        this.loadAllClasses();
      } else {
        this.filterClasses(); // Filter classes for the selected course
      }
      this.cdr.detectChanges();
    }, 0);
  }

  selectClass(classid: string) {
    this.filterClass = classid;
  }

  clearFilters() {
    this.filterCourse = '';
    this.filterClass = '';
    this.classes = [];
  }

  // Submission filter methods
  selectSubmissionCourse(courseId: string) {
    this.filterSubmissionCourse = courseId;
    this.filterSubmissionClass = ''; // Reset class filter when course changes
    
    console.log('Submission course selected:', {
      courseId: courseId,
      filterSubmissionCourse: this.filterSubmissionCourse
    });
    
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.filterSubmissionClasses();
      this.cdr.detectChanges();
    }, 0);
  }

  selectSubmissionClass(classId: string) {
    this.filterSubmissionClass = classId;
  }

  filterSubmissionClasses() {
    // For submissions, we can use the same allClasses data
    if (this.filterSubmissionCourse && this.allClasses.length > 0) {
      const filteredClasses = this.allClasses.filter((_class: any) => 
        _class.courseid == this.filterSubmissionCourse || _class.CourseID == this.filterSubmissionCourse
      );
      
      // We can reuse the classes array or create a separate one for submissions
      // For now, let's create a separate method to get submission classes
      this.classes = filteredClasses.map((_class: any) => ({
        id: _class.id || _class.ID,
        name: _class.class || _class.name || 'Unnamed Class',
      }));
    } else {
      this.classes = [];
    }
  }

  clearSubmissionFilters() {
    this.filterSubmissionCourse = '';
    this.filterSubmissionClass = '';
    this.filterAssignmentTitle = '';
    this.filterStudentName = '';
  }

  // Get unique assignment titles for dropdown
  getUniqueAssignmentTitles(): {label: string, value: string}[] {
    const uniqueTitles = new Set<string>();
    
    this.submissions.forEach(submission => {
      if (submission.title) {
        uniqueTitles.add(submission.title);
      }
    });
    
    return Array.from(uniqueTitles).sort().map(title => ({
      label: title,
      value: title
    }));
  }

  // Get unique student names for dropdown
  getUniqueStudentNames(): {label: string, value: string}[] {
    const uniqueNames = new Set<string>();
    
    this.submissions.forEach(submission => {
      if (submission.firstname && submission.lastname) {
        const fullName = `${submission.firstname} ${submission.lastname}`;
        uniqueNames.add(fullName);
      }
    });
    
    return Array.from(uniqueNames).sort().map(name => ({
      label: name,
      value: name
    }));
  }

  getFilteredSubmissions(): any[] {
    let filtered = this.submissions;
    
    // Filter by course if selected
    if (this.filterSubmissionCourse) {
      filtered = filtered.filter(submission => {
        const assignment = this.tasks.find(task => task.id === submission.assignmentid);
        return assignment && assignment.courseid === this.filterSubmissionCourse;
      });
    }
    
    // Filter by class if selected
    if (this.filterSubmissionClass) {
      filtered = filtered.filter(submission => {
        const assignment = this.tasks.find(task => task.id === submission.assignmentid);
        return assignment && assignment.classid === this.filterSubmissionClass;
      });
    }
    
    // Filter by assignment title if selected
    if (this.filterAssignmentTitle) {
      filtered = filtered.filter(submission => 
        submission.title && submission.title.toLowerCase().includes(this.filterAssignmentTitle.toLowerCase())
      );
    }
    
    // Filter by student name if selected
    if (this.filterStudentName) {
      filtered = filtered.filter(submission => {
        const fullName = `${submission.firstname || ''} ${submission.lastname || ''}`.toLowerCase();
        return fullName.includes(this.filterStudentName.toLowerCase());
      });
    }
    
    return filtered;
  }

  openFile(file: string) {
    this.API.openFile(file);
  }

  taskCreation() {
    const modalRef = this.modalService.open(TaskcreationComponent);
    modalRef.componentInstance.courses = Array.from(this.courses.values());
    modalRef.closed.subscribe((data) => {
      if (data != undefined) {
        this.loadTasks();
      }
    });
  }

  editTask(task: any) {
    const modalRef = this.modalService.open(TaskcreationComponent);
    modalRef.componentInstance.task = task;
    modalRef.componentInstance.courses = Array.from(this.courses.values());
    modalRef.closed.subscribe((data) => {
      if (data != undefined) {
        this.loadTasks();
      }
    });
  }

  deleteTask(task: any) {
    if (confirm(`Are you sure you want to delete the task titled "${task.title}"?`)) {
      this.API.teacherDeleteTask(task.id).subscribe(
        () => {
          this.tasks = this.tasks.filter((t: any) => t.id !== task.id);
          this.API.successSnackbar('Task deleted successfully.');
        },
        (error) => {
          this.API.failedSnackbar('Failed to delete the task.');
        }
      );
    }
  }

  createfeedback() {
    const modalRef = this.modalService.open(CreateFeedbackComponent);
  }

  navigateToTeacherView(submission: any): void {
    this.router.navigate(['teacher/teacher-view', {
      sid: submission.id,
      aid: submission.assignmentid,
      s: submission.firstname + " " + submission.lastname
    }]);
  }

  navigateBack(): void {
    this.router.navigate(['teacher/t-home']);
  }

  // Methods for custom table data
  getTaskTableData(): any[] {
    return this.filteredTasks().map((task: any) => ({
      ...task,
      course: this.courses.get(task.courseid)?.course || this.courses.get(task.courseid)?.title || 'N/A',
      classname: task.classname || 'N/A',
      progress: task.progress || 0,
      deadline: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'
    }));
  }

  getSubmissionTableData(): any[] {
    const filteredSubmissions = this.getFilteredSubmissions();
    console.log('Filtered submissions data:', filteredSubmissions);
    return filteredSubmissions.map((submission: any) => {
      console.log('Processing submission:', submission);
      console.log('Available fields:', Object.keys(submission));
      
      // Find the assignment first to get course info
      const assignment = this.tasks.find(task => task.id === submission.assignmentid);
      const courseInfo = assignment ? this.courses.get(assignment.courseid) : null;
      
      const processedSubmission = {
        ...submission,
        // Map fields based on actual data structure
        studentName: `${submission.firstname || ''} ${submission.lastname || ''}`.trim(),
        assignmenttitle: submission.title || 'N/A',
        course: courseInfo?.course || courseInfo?.title || 'Course Not Found',
        classname: assignment?.classname || 'Class Not Found',
        submitted_at: this.formatSubmissionDate(submission)
      };
      
      console.log('Assignment lookup for ID:', submission.assignmentid, 'Found:', assignment);
      console.log('Course lookup result:', courseInfo);
      console.log('Processed submission:', processedSubmission);
      return processedSubmission;
    });
  }

  formatSubmissionDate(submission: any): string {
    // Try different possible date field names, prioritizing 'time' based on actual data
    const dateFields = ['time', 'SubmittedAt', 'submitted_at', 'created_at', 'CreatedAt', 'DateSubmitted'];
    
    for (const field of dateFields) {
      if (submission[field]) {
        try {
          // Handle different date formats
          let dateValue = submission[field];
          
          // If it's a timestamp (numeric), convert to milliseconds if needed
          if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
            const timestamp = Number(dateValue);
            // If timestamp is in seconds (10 digits), convert to milliseconds
            if (timestamp < 10000000000) {
              dateValue = timestamp * 1000;
            } else {
              dateValue = timestamp;
            }
          }
          
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString();
          }
        } catch (e) {
          console.warn(`Invalid date in field ${field}:`, submission[field]);
        }
      }
    }
    return 'No Date Available';
  }

  selectTask(task: any): void {
    // Handle task selection if needed
    console.log('Task selected:', task);
  }

  handleTaskAction(event: {action: string, row: any}): void {
    const { action, row } = event;
    if (action === 'edit') {
      this.editTask(row);
    } else if (action === 'delete') {
      this.deleteTask(row);
    }
  }

  handleSubmissionAction(event: {action: string, row: any}): void {
    const { action, row } = event;
    if (action === 'view') {
      this.navigateToTeacherView(row);
    }
  }
}
