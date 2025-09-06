import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from '../../../services/API/api.service';
import { firstValueFrom } from 'rxjs';

interface CourseThread {
  id: number;
  threadid: string;
  courseid: string;
  title: string;
  body: string;
  ispinned: boolean;
  islocked: boolean;
  createdat: Date;
  updatedat: Date;
  authorName?: string;
  authorProfile?: string;
  postCount?: number;
}

@Component({
  selector: 'app-course-forum',
  templateUrl: './course-forum.component.html',
  styleUrls: ['./course-forum.component.css']
})
export class CourseForumComponent implements OnInit {
  courseId: string = '';
  courseTitle: string = 'Course Forum';
  threads: CourseThread[] = [];
  isLoading: boolean = false;
  showCreateThread: boolean = false;
  newThreadTitle: string = '';
  newThreadBody: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public API: APIService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.courseId = params['courseId'];
      if (this.courseId) {
        this.loadCourseInfo();
        this.loadThreads();
      }
    });
  }

  async loadCourseInfo(): Promise<void> {
    try {
      const courseResponse = await firstValueFrom(
        this.API.post('get_entries', {
          data: JSON.stringify({
            selectors: ['*'],
            tables: 'courses',
            conditions: {
              WHERE: { id: this.courseId }
            }
          })
        })
      );

      if (courseResponse.success && courseResponse.output && courseResponse.output.length > 0) {
        const course = courseResponse.output[0];
        const courseName = course.course || course.CourseName || course.Course || course.courseName || course.name || 'Unknown Course';
        this.courseTitle = `${courseName} - Forum`;
      }
    } catch (error) {
      console.error('Error loading course info:', error);
      this.courseTitle = 'Course Forum';
      this.API.failedSnackbar('Failed to load course information.');
    }
  }

  async loadThreads(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await firstValueFrom(this.API.getCourseForumThreads(this.courseId));

      if (response.success && Array.isArray(response.output)) {
        this.threads = response.output.map((thread: any) => {
          // Determine author name and profile based on whether it's a student or teacher
          let authorName = 'Anonymous';
          let authorProfile = 'assets/images/default-avatar.png';
          
          if (thread.student_firstname && thread.student_lastname) {
            authorName = `${thread.student_firstname} ${thread.student_lastname}`;
            authorProfile = thread.student_profile || 'assets/images/default-avatar.png';
          } else if (thread.teacher_firstname && thread.teacher_lastname) {
            authorName = `${thread.teacher_firstname} ${thread.teacher_lastname}`;
            authorProfile = thread.teacher_profile || 'assets/images/default-avatar.png';
          }
          
          const mappedThread = {
            id: thread.id,
            threadid: thread.threadid,
            courseid: thread.courseid,
            title: thread.title,
            body: thread.body || '',
            ispinned: thread.ispinned === true || thread.ispinned === 't' || thread.ispinned === 'true',
            islocked: thread.islocked === true || thread.islocked === 't' || thread.islocked === 'true',
            postCount: thread.post_count || 0,
            createdat: new Date(thread.createdat),
            updatedat: new Date(thread.updatedat),
            authorName: authorName,
            authorProfile: authorProfile
          };
          return mappedThread;
        });
      } else {
        this.threads = [];
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      this.API.failedSnackbar('Failed to load forum threads.');
      this.threads = [];
    } finally {
      this.sortThreads();
      this.isLoading = false;
    }
  }

async createThread(): Promise<void> {
  if (!this.newThreadTitle.trim()) {
    this.API.failedSnackbar('Please enter a thread title');
    return;
  }

  this.isLoading = true;
  try {
    const response = await firstValueFrom(
      this.API.createCourseForumThread(
        this.courseId,
        this.newThreadTitle.trim(),
        this.newThreadBody.trim()
      )
    );
    console.log('API Response:', response);

    if (response.success && response.output) {
      let threadId = null;
      if (typeof response.output === 'string') {
        // Extract the first quoted value after VALUES (
        const match = response.output.match(/VALUES\s*\(\s*'([^']+)'/);
        threadId = match ? match[1] : null;
      } else if (response.output.threadid) {
        threadId = response.output.threadid;
      }

      if (threadId) {
        this.API.successSnackbar('Forum thread created successfully');
        this.newThreadTitle = '';
        this.newThreadBody = '';
        this.showCreateThread = false;
        await this.loadThreads();
      } else {
        throw new Error('Backend response missing valid threadid');
      }
    } else if (!response.success) {
      throw new Error('Backend thread creation failed: ' + (response.message || 'No details provided'));
    }
  } catch (error) {
    console.error('Error creating thread:', error);
    // Type guard to safely access error.message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.API.failedSnackbar('Failed to create thread: ' + errorMessage);
  } finally {
    this.isLoading = false;
  }
}

  toggleCreateThread(): void {
    this.showCreateThread = !this.showCreateThread;
    if (!this.showCreateThread) {
      this.newThreadTitle = '';
      this.newThreadBody = '';
    }
  }

  cancelCreateThread(): void {
    this.showCreateThread = false;
    this.newThreadTitle = '';
    this.newThreadBody = '';
  }

  openThread(thread: CourseThread): void {
    // Determine context based on current route
    const currentUrl = this.router.url;
    let basePath = '/student';
    
    if (currentUrl.includes('/teacher/')) {
      basePath = '/teacher';
    } else if (currentUrl.includes('/admin/')) {
      basePath = '/admin';
    }
    
    console.log('Course Forum - Opening thread:', { 
      thread, 
      basePath, 
      currentUrl, 
      navigationPath: [basePath, 'thread-detail', 'course', thread.id] 
    });
    
    this.router.navigate([basePath, 'thread-detail', 'course', thread.id]);
  }

  onThreadClick(thread: CourseThread): void {
    this.openThread(thread);
  }

  getAuthorProfile(thread: CourseThread): string {
    const profile = thread.authorProfile;
    return profile && profile !== 'null' && profile !== 'assets/images/default-avatar.png' 
      ? this.API.getURL(profile) 
      : this.API.noProfile();
  }

  getAuthorName(thread: CourseThread): string {
    return thread.authorName || 'Anonymous';
  }

  getAuthorRole(thread: CourseThread): 'teacher' | 'student' | 'unknown' {
    // Check if this thread has teacher information
    if (thread.authorName && thread.authorName !== 'Anonymous') {
      // This is a basic check - in a real scenario, you might want to store this in the thread data
      // For now, we can't definitively determine from the current data structure
      return 'unknown';
    }
    return 'unknown';
  }

  get isTeacher(): boolean {
    return this.API.getUserType() === '1';
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  pinThread(thread: CourseThread): void {
    console.log('Pin thread clicked:', thread.threadid, 'Current state:', thread.ispinned);
    const newPinState = !thread.ispinned;
    thread.ispinned = newPinState;
    
    console.log('Calling pinCourseForumThread with:', thread.threadid, newPinState);
    this.API.pinCourseForumThread(thread.threadid, newPinState).subscribe({
      next: (response) => {
        console.log('Pin thread API response:', response);
        if (!response.success) {
          console.error('Pin thread failed:', response.message || response.error);
          thread.ispinned = !newPinState; // Revert on failure
          this.API.failedSnackbar('Failed to update thread pin status: ' + (response.message || response.error || 'Unknown error'));
        } else {
          console.log('Pin thread successful, new state:', newPinState);
          this.API.successSnackbar(`Thread ${newPinState ? 'pinned' : 'unpinned'} successfully`);
          this.sortThreads();
        }
      },
      error: (error) => {
        console.error('Error pinning thread:', error);
        thread.ispinned = !newPinState; // Revert on failure
        this.API.failedSnackbar('Failed to update thread pin status.');
        this.sortThreads();
      }
    });
  }

  lockThread(thread: CourseThread): void {
    console.log('Lock thread clicked:', thread.threadid, 'Current state:', thread.islocked);
    const newLockState = !thread.islocked;
    thread.islocked = newLockState;
    
    console.log('Calling lockCourseForumThread with:', thread.threadid, newLockState);
    this.API.lockCourseForumThread(thread.threadid, newLockState).subscribe({
      next: (response) => {
        console.log('Lock thread API response:', response);
        if (!response.success) {
          console.error('Lock thread failed:', response.message || response.error);
          thread.islocked = !newLockState; // Revert on failure
          this.API.failedSnackbar('Failed to update thread lock status: ' + (response.message || response.error || 'Unknown error'));
        } else {
          console.log('Lock thread successful, new state:', newLockState);
          this.API.successSnackbar(`Thread ${newLockState ? 'locked' : 'unlocked'} successfully`);
        }
      },
      error: (error) => {
        console.error('Error locking thread:', error);
        thread.islocked = !newLockState; // Revert on failure
        this.API.failedSnackbar('Failed to update thread lock status.');
      }
    });
  }

  deleteThread(thread: CourseThread): void {
    console.log('Delete thread clicked:', thread.threadid);
    // Show confirmation dialog
    if (confirm(`Are you sure you want to delete the thread "${thread.title}"? This action cannot be undone and will also delete all posts in this thread.`)) {
      this.API.deleteCourseForumThread(thread.threadid).subscribe({
        next: (response) => {
          if (response.success) {
            this.API.successSnackbar('Thread deleted successfully');
            // Remove thread from local array
            this.threads = this.threads.filter(t => t.threadid !== thread.threadid);
          } else {
            this.API.failedSnackbar('Failed to delete thread.');
          }
        },
        error: (error) => {
          console.error('Error deleting thread:', error);
          this.API.failedSnackbar('Failed to delete thread.');
        }
      });
    }
  }

  private sortThreads(): void {
    this.threads.sort((a, b) => {
      if (a.ispinned && !b.ispinned) return -1;
      if (!a.ispinned && b.ispinned) return 1;
      return new Date(b.createdat).getTime() - new Date(a.createdat).getTime();
    });
  }
}