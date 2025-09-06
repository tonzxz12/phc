import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { APIService } from 'src/app/services/API/api.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-thread-detail',
  templateUrl: './thread-detail.component.html',
  styleUrls: ['./thread-detail.component.css']
})
export class ThreadDetailComponent implements OnInit {
  thread: any = null;
  posts: any[] = [];
  loading = false;
  userData: any;
  isTeacher = false;
  threadId: string = '';
  
  replyForm: FormGroup;
  isSubmittingReply = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private apiService: APIService
  ) {
    this.userData = this.apiService.userData;
    this.isTeacher = this.userData.accountType === 1;
    
    this.replyForm = this.fb.group({
      body: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.threadId = params['threadId'];
      if (this.threadId) {
        this.loadThread();
        this.loadPosts();
      }
    });
  }

  loadThread() {
    this.loading = true;
    this.apiService.getCourseForumThreadById(this.threadId).subscribe({
      next: (response) => {
        if (response.success) {
          this.thread = response.output;
        } else {
          this.apiService.failedSnackbar('Failed to load thread');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading thread:', error);
        this.apiService.failedSnackbar('Error loading thread');
        this.loading = false;
      }
    });
  }

  loadPosts() {
    // Convert threadId to number if needed
    const threadIdNum = parseInt(this.threadId, 10);
    this.apiService.getCourseForumPosts(threadIdNum).subscribe({
      next: (response) => {
        if (response.success) {
          this.posts = response.output || [];
        } else {
          console.error('Failed to load posts:', response);
        }
      },
      error: (error) => {
        console.error('Error loading posts:', error);
      }
    });
  }

  submitReply() {
    if (this.replyForm.invalid || !this.thread) {
      return;
    }

    this.isSubmittingReply = true;
    const replyData = {
      threadId: parseInt(this.threadId, 10),
      body: this.replyForm.value.body.trim()
    };

    this.apiService.createCourseForumPost(replyData).subscribe({
      next: (response) => {
        if (response.success) {
          this.apiService.successSnackbar('Reply posted successfully!');
          this.resetReplyForm();
          this.loadPosts(); // Reload posts to show the new reply
        } else {
          this.apiService.failedSnackbar('Failed to post reply');
        }
        this.isSubmittingReply = false;
      },
      error: (error) => {
        console.error('Error posting reply:', error);
        this.apiService.failedSnackbar('Error posting reply');
        this.isSubmittingReply = false;
      }
    });
  }

  resetReplyForm() {
    this.replyForm.reset();
  }

  canReply(): boolean {
    return !this.thread?.islocked;
  }

  canManageThread(): boolean {
    return this.isTeacher;
  }

  canManagePost(post: any): boolean {
    if (this.isTeacher) return true;
    
    // Students can only manage their own posts
    const isOwnPost = this.isTeacher ? 
      post.author_teacherid === this.userData.id : 
      post.author_studentid === this.userData.id;
    
    return isOwnPost;
  }

  toggleLock() {
    if (!this.thread) return;
    
    this.apiService.updateCourseForumThread(this.threadId, { isLocked: !this.thread.islocked }).subscribe({
      next: (response) => {
        if (response.success) {
          this.thread.islocked = !this.thread.islocked;
          this.apiService.successSnackbar(this.thread.islocked ? 'Thread locked' : 'Thread unlocked');
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

  deleteThread() {
    if (!this.thread || !confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
      return;
    }
    
    this.apiService.deleteCourseForumThread(this.threadId).subscribe({
      next: (response) => {
        if (response.success) {
          this.apiService.successSnackbar('Thread deleted successfully');
          this.goBack();
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

  editPost(post: any) {
    // TODO: Implement post editing functionality
    console.log('Edit post:', post);
  }

  deletePost(post: any) {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    this.apiService.deleteCourseForumPost(post.postid).subscribe({
      next: (response) => {
        if (response.success) {
          this.apiService.successSnackbar('Post deleted successfully');
          this.loadPosts(); // Reload posts
        } else {
          this.apiService.failedSnackbar('Failed to delete post');
        }
      },
      error: (error) => {
        console.error('Error deleting post:', error);
        this.apiService.failedSnackbar('Error deleting post');
      }
    });
  }

  getAuthorName(thread: any): string {
    // For thread author info - this would need to be included in the thread data
    return 'Thread Author'; // Placeholder
  }

  getPostAuthorName(post: any): string {
    if (post.author_teacher_firstname && post.author_teacher_lastname) {
      return `${post.author_teacher_firstname} ${post.author_teacher_lastname}`;
    } else if (post.author_student_firstname && post.author_student_lastname) {
      return `${post.author_student_firstname} ${post.author_student_lastname}`;
    }
    return 'Unknown User';
  }

  getAuthorRole(post: any): string {
    if (post.author_teacher_firstname) {
      return 'Teacher';
    } else if (post.author_student_firstname) {
      return 'Student';
    }
    return 'User';
  }

  formatPostBody(body: string): string {
    // Basic formatting - convert line breaks to <br>
    return body ? body.replace(/\n/g, '<br>') : '';
  }

  formatDate(date: string): string {
    return this.apiService.parseDateFromNow(date);
  }

  goBack() {
    this.location.back();
  }
}
