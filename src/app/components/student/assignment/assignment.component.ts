// assignment.component.ts

import { Component, OnDestroy, OnInit, Renderer2, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-assignment',
  templateUrl: './assignment.component.html',
  styleUrls: ['./assignment.component.css']
})
export class AssignmentComponent implements OnInit, OnDestroy {
  timerActive: boolean = true;
  tasks: any[] = [];
  quizPoints: Map<string, any> = new Map();
  showDescription: boolean = true;
  windowWidth: number = window.innerWidth;
  isLoading: boolean = true;
  hoveredCard: number | null = null;

  getAssignment$?: Subscription;
  getQuizzes$?: Subscription;
  getQuizPoints$?: Subscription;

  // Property for filtering tasks
  filterType: string = 'all';

  constructor(private router: Router, private API: APIService, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.API.showLoader();
    this.isLoading = true;
    this.getAssignment$ = this.API.studentGetAssignments().subscribe({
      next: (data) => {
        console.log('🎯 Raw assignments data from API:', data);
        const tasks: any = [];
        if (data.output && Array.isArray(data.output)) {
          for (let task of data.output) {
            console.log('📝 Processing assignment task:', task);
            task.type = 'assignment';
            task.submission_count = Number(task.submission_count) || 0;
            task.resubmit_limit = Number(task.resubmit_limit) || 1;
            task.done = task.submission_count > 0;
            task.canResubmit = task.submission_count < task.resubmit_limit;
            // Ensure the deadline is in the correct format (date string)
            task.deadline = new Date(task.deadline); // Converts to Date object for consistency
            tasks.push(task);
          }
        } else {
          console.warn('⚠️ No assignments found or invalid data format');
        }
        console.log('📚 Assignments processed:', tasks.length);
        
        this.getQuizzes$ = this.API.studentGetQuizzes().subscribe(data => {
          console.log('🧪 Raw quizzes data from API:', data);
          if (data.output && Array.isArray(data.output)) {
            for (let task of data.output) {
              console.log('📝 Processing quiz task:', task);
              task.type = 'quiz';
              task.attempt_count = Number(task.attempt_count) || 0;
              task.retake_limit = Number(task.retake_limit) || 1;
              task.done = task.attempt_count > 0;
              task.deadline = new Date(task.deadline);
              tasks.push(task);
            }
          }
          console.log('🎯 Total tasks after adding quizzes:', tasks.length);
          this.getQuizPoints$ = this.API.studentQuizPoints().subscribe(data => {
            for (let quiz of data.output) {
              this.quizPoints.set(quiz.assessmentid, quiz);
            }
          });
          this.API.hideLoader();
          this.isLoading = false;
          // Sort tasks by their due date or time created
          tasks.sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          this.tasks = tasks;
          console.log('✅ Final tasks array:', this.tasks);
        });
      },
      error: (error) => {
        console.error('❌ Error fetching assignments:', error);
        this.API.hideLoader();
        this.isLoading = false;
        this.API.failedSnackbar('Failed to load assignments');
      }
    });
  }

  parseDate(date: Date | string): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  ngOnDestroy(): void {
    this.getAssignment$?.unsubscribe();
    this.getQuizzes$?.unsubscribe();
    this.getQuizPoints$?.unsubscribe();
    this.checkScreenWidth();
  }

  
  switchTag(type: string) {
    switch (type) {
      case 'assignment':
        return 'Assignment';
      case 'quiz':
        return 'Quiz';
      default:
        return 'Assignment';
    }
  }

  redirect(taskID: string) {
    this.router.navigate(['student/materials', { taskID: taskID }]);
  }

  // Check if assignment can be resubmitted
  canResubmitAssignment(task: any): boolean {
    return task.submission_count < task.resubmit_limit;
  }

  // Get submission status text
  getSubmissionStatus(task: any): string {
    if (task.submission_count === 0) {
      return 'Not Submitted';
    } else if (this.canResubmitAssignment(task)) {
      return `Submitted (${task.submission_count}/${task.resubmit_limit}) - Can Resubmit`;
    } else {
      return `Submitted (${task.submission_count}/${task.resubmit_limit}) - Max Submissions Reached`;
    }
  }

  // Handle assignment action (view/submit/resubmit)
  handleAssignmentAction(task: any) {
    if (this.checkOverdue(task.deadline) && task.submission_count === 0) {
      this.API.failedSnackbar('This assignment is overdue and cannot be submitted.');
      return;
    }
    
    if (task.submission_count === 0) {
      // First submission
      this.redirect(task.id);
    } else if (this.canResubmitAssignment(task)) {
      // Can resubmit
      Swal.fire({
        title: 'Resubmit Assignment?',
        text: `You have already submitted this assignment (${task.submission_count}/${task.resubmit_limit}). Do you want to resubmit?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f5a425',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Resubmit',
        cancelButtonText: 'Just View'
      }).then((result) => {
        if (result.isConfirmed) {
          this.redirect(task.id);
        } else {
          // Navigate to view-only mode (you might want to create a different route for this)
          this.redirect(task.id);
        }
      });
    } else {
      // Max submissions reached - view only
      this.API.failedSnackbar('Maximum submission limit reached. You can only view your previous submissions.');
      this.redirect(task.id);
    }
  }

attemptQuiz(task: any) {
    // Check if retake limit is exceeded
    if (task.attempt_count >= task.retake_limit && task.retake_limit > 0) {
      this.API.failedSnackbar('Maximum retake limit reached. You cannot attempt this quiz anymore.');
      return;
    }
    
    if (this.checkOverdue(task.deadline)) {
      this.API.failedSnackbar('This quiz is overdue and cannot be taken anymore.');
      return;
    }

    const isRetake = task.attempt_count > 0;
    const title = isRetake ? 'Ready to Retake?' : 'Ready?';
    const text = isRetake 
      ? `This is attempt ${task.attempt_count + 1} of ${task.retake_limit}. Keep in mind that exiting fullscreen mode while answering will terminate your quiz!`
      : 'Keep in mind that exiting fullscreen mode while answering will terminate your quiz!';

    Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      confirmButtonColor: '#0172AF',
    }).then((value) => {
      if (value.isConfirmed) {
        this.API.quizID = task.id;
        this.router.navigate(['student/quiz-page']);
      }
    });
  }

  canRetakeQuiz(task: any): boolean {
    return task.attempt_count > 0 && task.attempt_count < task.retake_limit && task.retake_limit > 1;
  }

  getQuizStatus(task: any): string {
    if (task.attempt_count === 0) {
      return 'Not Attempted';
    } else if (task.attempt_count >= task.retake_limit) {
      return 'Completed';
    } else {
      return `Attempted (${task.attempt_count}/${task.retake_limit})`;
    }
  }

  // New method for unified task status text
  getTaskStatusText(task: any): string {
    if (task.type === 'assignment') {
      if (task.submission_count === 0) {
        return this.checkOverdue(task.deadline) ? 'Overdue' : 'Pending';
      } else {
        return task.canResubmit ? 'Submitted' : 'Complete';
      }
    } else { // quiz
      if (task.attempt_count === 0) {
        return this.checkOverdue(task.deadline) ? 'Overdue' : 'Available';
      } else if (task.attempt_count >= task.retake_limit) {
        return 'Complete';
      } else {
        return 'In Progress';
      }
    }
  }

  // Check if deadline is within 2 days
  isDeadlineSoon(date: string): boolean {
    const dateObject = new Date(date);
    const daysUntil = (dateObject.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return daysUntil <= 2 && daysUntil > 0;
  }

  // Get human-readable time until deadline
  getTimeUntilDeadline(date: string): string {
    const dateObject = new Date(date);
    const now = new Date();
    const timeDiff = dateObject.getTime() - now.getTime();
    
    if (timeDiff < 0) {
      const daysOverdue = Math.abs(Math.floor(timeDiff / (1000 * 3600 * 24)));
      if (daysOverdue === 0) {
        const hoursOverdue = Math.abs(Math.floor(timeDiff / (1000 * 3600)));
        return `${hoursOverdue} hour(s) overdue`;
      }
      return `${daysOverdue} day(s) overdue`;
    }
    
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    const hours = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
    
    if (days > 0) {
      return `${days} day(s) remaining`;
    } else if (hours > 0) {
      return `${hours} hour(s) remaining`;
    } else {
      const minutes = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));
      return `${minutes} minute(s) remaining`;
    }
  }

  getQuizPoint(quizID: string) {
    if (!this.quizPoints.has(quizID)) return null;
    const quiz = this.quizPoints.get(quizID);
    return quiz.takenpoints + '/' + quiz.totalpoints;
  }

  checkOverdue(date: string) {
    const dateObject = new Date(date);
    return ((dateObject.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + 1 < 0;
  }

  // Added truncateDescription function
  truncateDescription(description: string, limit: number): string {
    const words = description.split(' ');
    if (this.windowWidth < 1000 && words.length > 7) {
      return words.slice(0, 7).join(' ') + '...';
    }
    if (words.length > limit) {
      return words.slice(0, limit).join(' ') + '...';
    }
    return description;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.windowWidth = event.target.innerWidth;
    this.checkScreenWidth();
  }

  checkScreenWidth(): void {
    this.showDescription = this.windowWidth >= 500;
  }

  // Method for filtering tasks based on filterType
  filteredTasks() {
    if (this.filterType === 'all') {
      return this.tasks;
    }
    return this.tasks.filter(task => task.type === this.filterType);
  }

  setFilterType(type: string) {
    this.filterType = type;
  }

  // Simple method for task status colors
  getTaskStatusColor(task: any): string {
    const status = this.getTaskStatusText(task);
    switch (status) {
      case 'Pending':
      case 'Available':
        return 'bg-yellow-100 text-yellow-800';
      case 'Submitted':
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Complete':
        return 'bg-green-100 text-green-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}