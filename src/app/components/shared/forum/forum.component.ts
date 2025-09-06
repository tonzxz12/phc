import { Component, OnInit, ViewChild } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forum',
  templateUrl: './forum.component.html',
  styleUrls: ['./forum.component.css']
})
export class ForumComponent implements OnInit {
  @ViewChild('newThreadModal') newThreadModal: any;
  
  userData: any;
  classes: any[] = [];
  selectedClass: any = null;
  threads: any[] = [];
  loading = false;
  isTeacher = false;

  constructor(
    private apiService: APIService,
    private router: Router
  ) {
    this.userData = this.apiService.userData;
    this.isTeacher = this.userData.accountType === 1;
  }

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses() {
    this.loading = true;
    if (this.isTeacher) {
      // EXACT COPY of manage course pattern - use teacherAllCourses
      this.apiService.teacherAllCourses().subscribe({
        next: (response) => {
          console.log('Teacher courses response:', response);
          if (response.success) {
            this.classes = response.output || [];
            console.log('Loaded teacher courses:', this.classes);
          } else {
            console.error('API returned error:', response);
            this.apiService.failedSnackbar(response.message || 'Failed to load courses');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
          this.apiService.failedSnackbar('Error loading courses');
          this.loading = false;
        }
      });
    } else {
      // EXACT COPY of manage course pattern - use getCourses  
      this.apiService.getCourses().subscribe({
        next: (response) => {
          console.log('Student courses response:', response);
          if (response.success) {
            this.classes = response.output || [];
            console.log('Loaded student courses:', this.classes);
          } else {
            console.error('API returned error:', response);
            this.apiService.failedSnackbar(response.message || 'Failed to load courses');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
          this.apiService.failedSnackbar('Error loading courses');
          this.loading = false;
        }
      });
    }
  }

  selectClass(classItem: any) {
    this.selectedClass = classItem;
    this.loadThreads();
  }

  loadThreads() {
    if (!this.selectedClass) return;
    
    this.loading = true;
    // EXACT COPY of manage course pattern - use course.ID
    const courseId = this.selectedClass.id || this.selectedClass.ID;
    
    console.log('Selected course:', this.selectedClass);
    console.log('Extracted course ID:', courseId);
    
    if (!courseId) {
      console.error('No course ID found in selected course');
      this.apiService.failedSnackbar('Error: No course ID found');
      this.loading = false;
      return;
    }
    
    this.apiService.getCourseForumThreadsSimple(courseId).subscribe({
      next: (response) => {
        console.log('Threads response:', response);
        if (response.success) {
          this.threads = response.output || [];
        } else {
          console.error('API returned error:', response);
          this.apiService.failedSnackbar(response.message || 'Failed to load threads');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading threads:', error);
        this.apiService.failedSnackbar('Error loading threads');
        this.loading = false;
      }
    });
  }

  openThread(thread: any) {
    const baseRoute = this.isTeacher ? '/teacher' : '/student';
    this.router.navigate([`${baseRoute}/forum/thread`, thread.threadid]);
  }

  openNewThreadModal() {
    if (this.newThreadModal) {
      this.newThreadModal.openModal();
    }
  }

  onThreadCreated(newThread: any) {
    console.log('New thread created:', newThread);
    // Reload threads to show the new one
    this.loadThreads();
  }

  backToClasses() {
    this.selectedClass = null;
    this.threads = [];
  }

  canCreateThread(): boolean {
    return this.isTeacher;
  }

  canDeleteThread(thread: any): boolean {
    return this.isTeacher;
  }

  deleteThread(thread: any, event: Event) {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this thread?')) {
      this.apiService.deleteCourseForumThread(thread.threadid).subscribe({
        next: (response) => {
          if (response.success) {
            this.apiService.successSnackbar('Thread deleted successfully');
            this.loadThreads();
          } else {
            this.apiService.failedSnackbar('Failed to delete thread');
          }
        },
        error: (error) => {
          console.error('Error deleting thread:', error);
          this.apiService.failedSnackbar('Error deleting thread');
        }
      });
    }
  }

  toggleLock(thread: any, event: Event) {
    event.stopPropagation();
    
    this.apiService.lockCourseForumThread(thread.threadid, !thread.isLocked).subscribe({
      next: (response) => {
        if (response.success) {
          thread.isLocked = !thread.isLocked;
          this.apiService.successSnackbar(thread.isLocked ? 'Thread locked' : 'Thread unlocked');
        } else {
          this.apiService.failedSnackbar('Failed to update thread');
        }
      },
      error: (error) => {
        console.error('Error updating thread:', error);
        this.apiService.failedSnackbar('Error updating thread');
      }
    });
  }

  formatDate(date: string): string {
    return this.apiService.parseDateFromNow(date);
  }
}
