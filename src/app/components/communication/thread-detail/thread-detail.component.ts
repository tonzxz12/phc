import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { APIService } from 'src/app/services/API/api.service';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ReportContentComponent } from '../../general-modals/report-content/report-content.component';

interface CourseForumPost {
  id: number;
  postid: string;
  body: string;
  parentpostid?: number;
  isedited: boolean;
  isdeleted: boolean;
  createdat: string;
  updatedat: string;
  author_studentid?: string;
  author_teacherid?: string;
  student_firstname?: string;
  student_lastname?: string;
  student_profile?: string;
  teacher_firstname?: string;
  teacher_lastname?: string;
  teacher_profile?: string;
  replies?: CourseForumPost[];
}

@Component({
  selector: 'app-thread-detail',
  templateUrl: './thread-detail.component.html',
  styleUrls: ['./thread-detail.component.css']
})
export class ThreadDetailComponent implements OnInit {
  threadType: string = 'course'; // Default to course
  threadId: number = 0;
  threadInfo: any = {};
  posts: CourseForumPost[] = [];
  isLoading: boolean = false;
  newPostBody: string = '';
  replyingToId: number | null = null;
  replyBody: string = '';
  editingPostId: string | null = null;
  editBody: string = '';
  currentUserId: string = '';
  currentUserType: string = ''; // '0' for student, '1' for teacher

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    public API: APIService,
    private dialog: MatDialog
  ) {
    // Get current user data
    const userData = this.API.getUserData();
    this.currentUserId = userData.id;
    this.currentUserType = this.API.getUserType() || '';
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.threadType = params['type'] || 'course';
      const threadIdParam = params['threadId'];
      console.log('Thread Detail - Route params:', params);
      console.log('Thread ID param:', threadIdParam, 'Type:', typeof threadIdParam);
      
      // Handle both string and numeric thread IDs
      if (threadIdParam) {
        this.threadId = +threadIdParam; // Convert to number
        console.log('Converted thread ID:', this.threadId);
        this.loadThreadInfo();
        this.loadPosts();
      } else {
        console.error('No thread ID provided in route params');
      }
    });
  }

  async loadThreadInfo(): Promise<void> {
    try {
      console.log('Loading thread info for thread:', this.threadId, 'type:', this.threadType);
      const tableName = this.threadType === 'topic' ? 'topic_threads' : 'course_forum_threads';
      const response = await firstValueFrom(
        this.API.post('get_entries', {
          data: JSON.stringify({
            selectors: ['*'],
            tables: tableName,
            conditions: {
              WHERE: { id: this.threadId }
            }
          })
        })
      );
      
      console.log('Thread info response:', response);
      
      if (response.success && response.output && response.output.length > 0) {
        const rawThread = response.output[0];
        // Fix PostgreSQL boolean conversion
        this.threadInfo = {
          ...rawThread,
          ispinned: rawThread.ispinned === true || rawThread.ispinned === 't' || rawThread.ispinned === 'true',
          islocked: rawThread.islocked === true || rawThread.islocked === 't' || rawThread.islocked === 'true'
        };
      } else {
        console.error('Failed to load thread info:', response.message || 'Unknown error');
        this.API.failedSnackbar('Failed to load thread information: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading thread info:', error);
      this.API.failedSnackbar('Error loading thread information: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async loadPosts(): Promise<void> {
    this.isLoading = true;
    try {
      console.log('Loading posts for thread:', this.threadId, 'type:', this.threadType);
      
      let response;
      
      // Use the existing API methods for fetching posts
      if (this.threadType === 'topic') {
        response = await firstValueFrom(this.API.getTopicPosts(this.threadId));
      } else {
        // Use the existing API method for course forum posts
        console.log('Calling getCourseForumPosts with threadId:', this.threadId);
        response = await firstValueFrom(this.API.getCourseForumPosts(this.threadId));
      }
      
      console.log('API Response:', response);
      console.log('Response.output:', response.output);
      console.log('Response.payload:', response.payload);
      
      if (response.success) {
        // Try both output and payload
        const postsData = response.output || response.payload || [];
        console.log('Posts data found:', postsData);
        
        // Log the structure of the first post for debugging
        if (postsData.length > 0) {
          console.log('First post structure:', postsData[0]);
          console.log('All fields in first post:', Object.keys(postsData[0]));
          
          // Specifically check for name fields
          const firstPost = postsData[0];
          console.log('Name fields check:', {
            student_firstname: firstPost.student_firstname,
            student_lastname: firstPost.student_lastname,
            teacher_firstname: firstPost.teacher_firstname,
            teacher_lastname: firstPost.teacher_lastname,
            firstname: firstPost.firstname,
            lastname: firstPost.lastname,
            author_studentid: firstPost.author_studentid,
            author_teacherid: firstPost.author_teacherid
          });
        }
        
        // Enrich posts with author information if missing
        const enrichedPosts = await this.enrichPostsWithAuthorInfo(postsData);
        
        // Organize posts with replies
        this.posts = this.organizePostsWithReplies(enrichedPosts);
        console.log('Posts loaded:', this.posts);
      } else {
        console.error('API returned failure:', response.message);
        this.API.failedSnackbar('Failed to load posts: ' + (response.message || 'Unknown error'));
        this.posts = [];
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      this.API.failedSnackbar('Error loading posts: ' + (error instanceof Error ? error.message : 'Unknown error'));
      this.posts = [];
    } finally {
      this.isLoading = false;
    }
  }

  async enrichPostsWithAuthorInfo(posts: CourseForumPost[]): Promise<CourseForumPost[]> {
    const enrichedPosts = [...posts];
    
    for (let i = 0; i < enrichedPosts.length; i++) {
      const post = enrichedPosts[i];
      
      // If teacher info is missing but we have a teacher ID, fetch it
      if (post.author_teacherid && (!post.teacher_firstname || !post.teacher_lastname)) {
        try {
          console.log('Fetching teacher info for ID:', post.author_teacherid);
          const teacherResponse = await firstValueFrom(
            this.API.post('get_entries', {
              data: JSON.stringify({
                selectors: ['firstname', 'lastname', 'profile'],
                tables: 'teachers',
                conditions: {
                  WHERE: { id: post.author_teacherid }
                }
              })
            })
          );
          
          if (teacherResponse.success && teacherResponse.output?.length > 0) {
            const teacher = teacherResponse.output[0];
            post.teacher_firstname = teacher.firstname;
            post.teacher_lastname = teacher.lastname;
            post.teacher_profile = teacher.profile;
            console.log('Teacher info fetched:', teacher);
          }
        } catch (error) {
          console.error('Error fetching teacher info:', error);
        }
      }
      
      // If student info is missing but we have a student ID, fetch it
      if (post.author_studentid && (!post.student_firstname || !post.student_lastname)) {
        try {
          console.log('Fetching student info for ID:', post.author_studentid);
          const studentResponse = await firstValueFrom(
            this.API.post('get_entries', {
              data: JSON.stringify({
                selectors: ['firstname', 'lastname', 'profile'],
                tables: 'students',
                conditions: {
                  WHERE: { id: post.author_studentid }
                }
              })
            })
          );
          
          if (studentResponse.success && studentResponse.output?.length > 0) {
            const student = studentResponse.output[0];
            post.student_firstname = student.firstname;
            post.student_lastname = student.lastname;
            post.student_profile = student.profile;
            console.log('Student info fetched:', student);
          }
        } catch (error) {
          console.error('Error fetching student info:', error);
        }
      }
    }
    
    return enrichedPosts;
  }

  organizePostsWithReplies(posts: CourseForumPost[]): CourseForumPost[] {
    const postsMap = new Map<number, CourseForumPost>();
    const topLevelPosts: CourseForumPost[] = [];

    // Initialize all posts with empty replies array
    posts.forEach(post => {
      post.replies = [];
      postsMap.set(post.id, post);
    });

    // Organize replies under their parent posts
    posts.forEach(post => {
      if (post.parentpostid) {
        const parent = postsMap.get(post.parentpostid);
        if (parent) {
          parent.replies!.push(post);
        }
      } else {
        topLevelPosts.push(post);
      }
    });

    return topLevelPosts;
  }

  async createPost(): Promise<void> {
    if (!this.newPostBody.trim()) {
      this.API.failedSnackbar('Please enter a post message');
      return;
    }

    // Check if thread is locked (only teachers can post in locked threads)
    if (this.threadInfo.islocked && this.currentUserType !== '1') {
      this.API.failedSnackbar('This thread is locked. Only teachers can post.');
      return;
    }

    try {
      console.log('Creating post for thread:', this.threadId, 'type:', this.threadType);
      
      let response;
      
      // Use the appropriate API method based on thread type
      if (this.threadType === 'topic') {
        response = await firstValueFrom(
          this.API.createTopicPost(this.threadId, this.newPostBody)
        );
      } else {
        console.log('Calling createCourseForumPost with:', {
          threadId: this.threadId,
          body: this.newPostBody
        });
        response = await firstValueFrom(
          this.API.createCourseForumPost(this.threadId, this.newPostBody)
        );
      }
      
      console.log('Create post response:', response);
      
      if (response.success) {
        this.API.successSnackbar('Post created successfully');
        this.newPostBody = '';
        await this.loadPosts(); // Refresh posts
      } else {
        throw new Error(response.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      this.API.failedSnackbar('Failed to create post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async createReply(): Promise<void> {
    if (!this.replyBody.trim() || !this.replyingToId) {
      this.API.failedSnackbar('Please enter a reply message');
      return;
    }

    // Check if thread is locked (only teachers can post in locked threads)
    if (this.threadInfo.islocked && this.currentUserType !== '1') {
      this.API.failedSnackbar('This thread is locked. Only teachers can post.');
      return;
    }

    try {
      console.log('Creating reply for thread:', this.threadId, 'to post:', this.replyingToId, 'type:', this.threadType);
      
      let response;
      
      // Use the appropriate API method based on thread type
      if (this.threadType === 'topic') {
        response = await firstValueFrom(
          this.API.createTopicPost(this.threadId, this.replyBody, this.replyingToId)
        );
      } else {
        response = await firstValueFrom(
          this.API.createCourseForumPost(this.threadId, this.replyBody, this.replyingToId)
        );
      }
      
      console.log('Create reply response:', response);
      
      if (response.success) {
        this.API.successSnackbar('Reply posted successfully');
        this.cancelReply();
        await this.loadPosts(); // Refresh posts
      } else {
        throw new Error(response.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      this.API.failedSnackbar('Failed to post reply: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async editPost(): Promise<void> {
    if (!this.editBody.trim() || !this.editingPostId) {
      this.API.failedSnackbar('Please enter a post message');
      return;
    }

    try {
      console.log('Editing post:', this.editingPostId, 'type:', this.threadType);
      
      let response;
      
      // Use the appropriate API method based on thread type
      if (this.threadType === 'topic') {
        response = await firstValueFrom(
          this.API.editTopicPost(this.editingPostId, this.editBody)
        );
      } else {
        response = await firstValueFrom(
          this.API.editCourseForumPost(this.editingPostId, this.editBody)
        );
      }
      
      console.log('Edit post response:', response);
      
      if (response.success) {
        this.API.successSnackbar('Post updated successfully');
        this.cancelEdit();
        await this.loadPosts(); // Refresh posts
      } else {
        throw new Error(response.message || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      this.API.failedSnackbar('Failed to update post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async deletePost(post: CourseForumPost): Promise<void> {
    // Check if user can modify this post
    if (!this.canModifyPost(post)) {
      this.API.failedSnackbar('You do not have permission to delete this post');
      return;
    }

    const confirmed = confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    try {
      console.log('Deleting post:', post.postid, 'type:', this.threadType);
      
      let response;
      
      // Use the appropriate API method based on thread type
      if (this.threadType === 'topic') {
        response = await firstValueFrom(
          this.API.deleteTopicPost(post.postid)
        );
      } else {
        response = await firstValueFrom(
          this.API.deleteCourseForumPost(post.postid)
        );
      }
      
      console.log('Delete post response:', response);
      
      if (response.success) {
        this.API.successSnackbar('Post deleted successfully');
        await this.loadPosts(); // Refresh posts
      } else {
        throw new Error(response.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      this.API.failedSnackbar('Failed to delete post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  startReply(postId: number): void {
    this.replyingToId = postId;
    this.replyBody = '';
  }

  cancelReply(): void {
    this.replyingToId = null;
    this.replyBody = '';
  }

  startEdit(post: CourseForumPost): void {
    this.editingPostId = post.postid;
    this.editBody = post.body;
  }

  cancelEdit(): void {
    this.editingPostId = null;
    this.editBody = '';
  }

  canModifyPost(post: CourseForumPost): boolean {
    // Teachers can modify any post
    if (this.currentUserType === '1') return true;
    
    // Students can modify their own posts
    if (this.currentUserType === '0') {
      return post.author_studentid === this.currentUserId;
    }
    
    return false;
  }

  getAuthorName(post: CourseForumPost): string {
    // Check for teacher name first
    if (post.teacher_firstname && post.teacher_lastname) {
      return `${post.teacher_firstname} ${post.teacher_lastname}`;
    }
    
    // Check for student name
    if (post.student_firstname && post.student_lastname) {
      return `${post.student_firstname} ${post.student_lastname}`;
    }
    
    // Fallback to direct fields (in case they're not prefixed)
    if ((post as any).firstname && (post as any).lastname) {
      return `${(post as any).firstname} ${(post as any).lastname}`;
    }
    
    console.log('No author name found for post:', post.postid, 'Author IDs:', {
      studentId: post.author_studentid,
      teacherId: post.author_teacherid
    });
    
    return 'Unknown User';
  }

  getAuthorProfile(post: CourseForumPost): string {
    const profile = post.student_profile || post.teacher_profile;
    return profile && profile !== 'null' ? this.API.getURL(profile) : this.API.noProfile();
  }

  getAuthorRole(post: CourseForumPost): string {
    if (post.teacher_firstname && post.teacher_lastname) {
      return 'teacher';
    } else if (post.student_firstname && post.student_lastname) {
      return 'student';
    }
    return 'unknown';
  }

  goBack(): void {
    this.location.back();
  }

  reportPost(post: CourseForumPost): void {
    const dialogRef = this.dialog.open(ReportContentComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        type: 'forum_post',
        id: post.id,
        title: `Post by ${this.getAuthorName(post)}`,
        content: post.body,
        author: this.getAuthorName(post)
      },
      disableClose: false,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.API.successSnackbar('Post reported successfully');
      }
    });
  }
}
