import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-forum-thread',
  templateUrl: './forum-thread.component.html',
  styleUrls: ['./forum-thread.component.css']
})
export class ForumThreadComponent implements OnInit {
  threadId: string = '';
  thread: any = null;
  posts: any[] = [];
  newPostBody: string = '';
  replyingTo: any = null;
  editingPost: any = null;
  editPostBody: string = '';
  userData: any;
  isTeacher = false;
  loading = false;
  reportReasons: any[] = [];
  reportingPost: any = null;
  reportData = {
    reason_id: '',
    description: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: APIService
  ) {
    this.userData = this.apiService.getUserData();
    this.isTeacher = this.userData.accountType === 1;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.threadId = params['id'];
      this.loadThread();
      this.loadPosts();
      this.loadReportReasons();
    });
  }

  loadThread() {
    this.apiService.getCourseForumThreadById(this.threadId).subscribe({
      next: (response) => {
        if (response.success && response.output.length > 0) {
          this.thread = response.output[0];
        }
      },
      error: (error) => {
        console.error('Error loading thread:', error);
        this.apiService.failedSnackbar('Error loading thread');
      }
    });
  }

  loadPosts() {
    this.loading = true;
    // First get the thread by threadid to get the numeric ID
    this.apiService.getCourseForumThreadById(this.threadId).subscribe({
      next: (response) => {
        if (response.success && response.output.length > 0) {
          const thread = response.output[0];
          this.apiService.getCourseForumPosts(thread.id).subscribe({
            next: (postsResponse) => {
              if (postsResponse.success) {
                this.posts = this.organizePosts(postsResponse.output);
              }
              this.loading = false;
            },
            error: (error) => {
              console.error('Error loading posts:', error);
              this.loading = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading thread:', error);
        this.loading = false;
      }
    });
  }

  loadReportReasons() {
    this.apiService.getReportReasons().subscribe({
      next: (response) => {
        if (response.success) {
          this.reportReasons = response.output;
        }
      },
      error: (error) => {
        console.error('Error loading report reasons:', error);
      }
    });
  }

  organizePosts(posts: any[]): any[] {
    const organized: any[] = [];
    const postMap = new Map();

    // First pass: create map of all posts
    posts.forEach(post => {
      post.replies = [];
      postMap.set(post.id, post);
    });

    // Second pass: organize into parent-child relationships
    posts.forEach(post => {
      if (post.parentPostId && postMap.has(post.parentPostId)) {
        postMap.get(post.parentPostId).replies.push(post);
      } else {
        organized.push(post);
      }
    });

    return organized;
  }

  createPost() {
    if (!this.newPostBody.trim()) return;

    const postData = {
      threadId: this.thread.id,
      body: this.newPostBody.trim(),
      parentPostId: this.replyingTo ? this.replyingTo.id : undefined
    };

    this.apiService.createCourseForumPost(postData).subscribe({
      next: (response) => {
        if (response.success) {
          this.newPostBody = '';
          this.replyingTo = null;
          this.loadPosts();
          this.apiService.successSnackbar('Post created successfully');
        } else {
          this.apiService.failedSnackbar('Failed to create post');
        }
      },
      error: (error) => {
        console.error('Error creating post:', error);
        this.apiService.failedSnackbar('Error creating post');
      }
    });
  }

  startReply(post: any) {
    this.replyingTo = post;
    this.editingPost = null;
    setTimeout(() => {
      const textarea = document.querySelector('.reply-textarea') as HTMLTextAreaElement;
      if (textarea) textarea.focus();
    });
  }

  cancelReply() {
    this.replyingTo = null;
    this.newPostBody = '';
  }

  startEdit(post: any) {
    this.editingPost = post;
    this.editPostBody = post.body;
    this.replyingTo = null;
  }

  cancelEdit() {
    this.editingPost = null;
    this.editPostBody = '';
  }

  saveEdit() {
    if (!this.editPostBody.trim()) return;

    this.apiService.updateCourseForumPost(this.editingPost.postid, this.editPostBody.trim()).subscribe({
      next: (response) => {
        if (response.success) {
          this.editingPost = null;
          this.editPostBody = '';
          this.loadPosts();
          this.apiService.successSnackbar('Post updated successfully');
        } else {
          this.apiService.failedSnackbar('Failed to update post');
        }
      },
      error: (error) => {
        console.error('Error updating post:', error);
        this.apiService.failedSnackbar('Error updating post');
      }
    });
  }

  deletePost(post: any) {
    if (confirm('Are you sure you want to delete this post?')) {
      this.apiService.deleteCourseForumPost(post.postid).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPosts();
            this.apiService.successSnackbar('Post deleted successfully');
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
  }

  canEditPost(post: any): boolean {
    return (this.isTeacher && post.author_teacherid === this.userData.id) || 
           (!this.isTeacher && post.author_studentid === this.userData.id);
  }

  canDeletePost(post: any): boolean {
    return this.canEditPost(post);
  }

  canReportPost(post: any): boolean {
    return !this.canEditPost(post);
  }

  startReport(post: any) {
    this.reportingPost = post;
    this.reportData = {
      reason_id: '',
      description: ''
    };
  }

  cancelReport() {
    this.reportingPost = null;
    this.reportData = {
      reason_id: '',
      description: ''
    };
  }

  submitReport() {
    if (!this.reportData.reason_id) {
      this.apiService.failedSnackbar('Please select a reason');
      return;
    }

    const reportData = {
      post_id: this.reportingPost.id,
      reason_id: parseInt(this.reportData.reason_id),
      description: this.reportData.description.trim() || undefined
    };

    this.apiService.createCoursePostReport(reportData).subscribe({
      next: (response) => {
        if (response.success) {
          this.cancelReport();
          this.apiService.successSnackbar('Report submitted successfully');
        } else {
          this.apiService.failedSnackbar('Failed to submit report');
        }
      },
      error: (error) => {
        console.error('Error submitting report:', error);
        this.apiService.failedSnackbar('Error submitting report');
      }
    });
  }

  getAuthorName(post: any): string {
    if (post.author_student_firstname) {
      return `${post.author_student_firstname} ${post.author_student_lastname}`;
    } else if (post.author_teacher_firstname) {
      return `${post.author_teacher_firstname} ${post.author_teacher_lastname}`;
    }
    return 'Unknown User';
  }

  getAuthorRole(post: any): string {
    return post.author_teacher_firstname ? 'Teacher' : 'Student';
  }

  formatDate(date: string): string {
    return this.apiService.parseDateFromNow(date);
  }

  goBack() {
    this.router.navigate(['/forum']);
  }
}
