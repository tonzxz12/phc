import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-discussions',
  templateUrl: './discussions.component.html',
  styleUrls: ['./discussions.component.css']
})
export class DiscussionsComponent implements OnInit {
  loading: boolean = true;
  enrolledCourses: any[] = [];
  recentPosts: any[] = [];
  courseThreadCounts: Map<string, number> = new Map();

  constructor(
    private router: Router,
    private API: APIService
  ) { }

  ngOnInit(): void {
    this.loadEnrolledCourses();
  }

  async loadEnrolledCourses(): Promise<void> {
    try {
      // Try main API method for enrolled courses
      const response = await firstValueFrom(this.API.getEnrolledCourses());
      console.log('Student enrolled courses response:', response);

      if (response?.success && response?.output && response.output.length > 0) {
        this.enrolledCourses = response.output;
        console.log('Enrolled courses loaded successfully:', this.enrolledCourses.length);
      } else if (response?.payload && response.payload.length > 0) {
        this.enrolledCourses = response.payload;
        console.log('Enrolled courses loaded from payload:', this.enrolledCourses.length);
      } else {
        // Fallback: try student_classes approach
        const studentId = this.API.getUserData()?.id;
        if (studentId) {
          const simplePostObject = {
            selectors: ['courses.*'],
            tables: 'courses',
            conditions: {
              'INNER JOIN student_classes': 'ON student_classes.classid = courses.id', 
              'INNER JOIN classes': 'ON classes.id = student_classes.classid',
              WHERE: {
                'student_classes.studentid': studentId,
                'student_classes.pending': false
              }
            }
          };
          const simpleResponse = await firstValueFrom(this.API.post('get_entries', {
            data: JSON.stringify(simplePostObject),
          }));
          console.log('Simple enrolled courses response:', simpleResponse);
          if (simpleResponse?.payload && simpleResponse.payload.length > 0) {
            this.enrolledCourses = simpleResponse.payload;
            console.log('Enrolled courses loaded via simple query:', this.enrolledCourses.length);
          } else if (simpleResponse?.output && simpleResponse.output.length > 0) {
            this.enrolledCourses = simpleResponse.output;
            console.log('Enrolled courses loaded via simple query (output):', this.enrolledCourses.length);
          } else {
            this.enrolledCourses = [];
            console.log('No enrolled courses found for this student');
          }
        } else {
          this.enrolledCourses = [];
          console.log('No student ID found for fallback query');
        }
      }

      // Set default thread counts before loading actual data
      this.setDefaultThreadCounts();

      // Load thread counts and recent activity, but don't fail if errors
      this.loadCourseThreadCounts().catch(error => {
        console.warn('Could not load thread counts:', error);
        this.setDefaultThreadCounts();
      });
      this.loadRecentActivity().catch(error => {
        console.warn('Could not load recent activity:', error);
        this.recentPosts = [];
      });
    } catch (error) {
      console.error('Error loading enrolled courses:', error);
      this.enrolledCourses = [];
      this.setDefaultThreadCounts();
    } finally {
      this.loading = false;
    }
  }

  async loadCourseThreadCounts(): Promise<void> {
    this.setDefaultThreadCounts();
    for (const course of this.enrolledCourses) {
      try {
        console.log('Loading thread count for course:', course.id);
        
        const threadPostObject = {
          selectors: ['COUNT(*) as count'],
          tables: 'course_forum_threads',
          conditions: {
            WHERE: {
              'courseid': course.id
            }
          }
        };
        
        console.log('Thread count query:', JSON.stringify(threadPostObject));
        
        const threadResponse = await firstValueFrom(this.API.post('get_entries', {
          data: JSON.stringify(threadPostObject),
        }));
        
        console.log('Thread count response for course', course.id, ':', threadResponse);
        
        const rawCount = threadResponse?.payload?.[0]?.count || threadResponse?.output?.[0]?.count || 0;
        const threadCount: number = parseInt(String(rawCount)) || 0;
        
        console.log('Raw count value:', rawCount, 'Parsed count:', threadCount);
        this.courseThreadCounts.set(course.id, threadCount);
      } catch (error) {
        console.error(`Error loading thread count for course ${course.id}:`, error);
        this.courseThreadCounts.set(course.id, 0);
      }
    }
  }

  async loadRecentActivity(): Promise<void> {
    try {
      if (this.enrolledCourses.length === 0) return;
      
      const allPosts: any[] = [];
      
      // Get recent posts from the first few enrolled courses
      for (let i = 0; i < Math.min(this.enrolledCourses.length, 3); i++) {
        const course = this.enrolledCourses[i];
        
        try {
          const postsQuery = {
            selectors: [
              'course_forum_posts.*', 
              'course_forum_threads.title as thread_title',
              'students.firstname as student_firstname',
              'students.lastname as student_lastname', 
              'students.profile as student_profile',
              'teachers.firstname as teacher_firstname',
              'teachers.lastname as teacher_lastname',
              'teachers.profile as teacher_profile'
            ],
            tables: 'course_forum_posts',
            conditions: {
              'INNER JOIN course_forum_threads': 'ON course_forum_posts.threadid = course_forum_threads.id',
              'LEFT JOIN students': 'ON students.id = course_forum_posts.author_studentid',
              'LEFT JOIN teachers': 'ON teachers.id = course_forum_posts.author_teacherid',
              WHERE: {
                'course_forum_threads.courseid': course.id,
                'course_forum_posts.isdeleted': false
              },
              'ORDER BY': 'course_forum_posts.createdat DESC',
              'LIMIT': 5
            }
          };
          
          console.log('Recent posts query for course', course.id, ':', JSON.stringify(postsQuery));
          
          const postsResponse = await firstValueFrom(this.API.post('get_entries', {
            data: JSON.stringify(postsQuery)
          }));
          
          console.log('Recent posts response for course', course.id, ':', postsResponse);
          
          if (postsResponse?.success && (postsResponse.payload || postsResponse.output)) {
            const posts = postsResponse.payload || postsResponse.output;
            const formattedPosts = posts.map((post: any) => ({
              ...post,
              course_name: course.course || course.title || 'Course',
              type: 'course_forum'
            }));
            allPosts.push(...formattedPosts);
          }
          
        } catch (error) {
          console.error('Error loading recent posts for course', course.id, ':', error);
        }
      }
      
      // Sort all posts by creation date and take the most recent 10
      this.recentPosts = allPosts
        .sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime())
        .slice(0, 10);
        
      console.log('Final recent posts:', this.recentPosts.length);
        
    } catch (error) {
      console.error('Error loading recent activity:', error);
      this.recentPosts = [];
    } 
  }

  private setDefaultThreadCounts(): void {
    // Set default value of 0 for all courses
    for (const course of this.enrolledCourses) {
      this.courseThreadCounts.set(course.id, 0);
    }
  }

  getCourseThreadCount(courseId: string): number {
    return this.courseThreadCounts.get(courseId) || 0;
  }

  navigateToCourseForum(courseId: string): void {
    this.router.navigate(['/student/course-forum', courseId]);
  }

  getURL(path: string): string {
    if (!path) return 'assets/images/default-course.jpg'; // Provide a default image
    return this.API.getURL(path);
  }

getPostAuthor(post: any): string {
  if (post.student_firstname && post.student_lastname) {
    return `${post.student_firstname} ${post.student_lastname}`;
  } else if (post.teacher_firstname && post.teacher_lastname) {
    return `${post.teacher_firstname} ${post.teacher_lastname}`;
  } else if (post.author_name) {
    return post.author_name;
  } else if (post.firstname && post.lastname) {
    return `${post.firstname} ${post.lastname}`;
  }
  return 'Anonymous'; // Fallback for threads without author info
}

  getTimeAgo(dateString: string): string {
    if (!dateString) return 'Recently';
    
    try {
      const now = new Date();
      const postDate = new Date(dateString);
      const diffInMs = now.getTime() - postDate.getTime();
      
      if (isNaN(diffInMs)) return 'Recently';
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks}w ago`;
      } else {
        const months = Math.floor(diffInDays / 30);
        return `${months}mo ago`;
      }
    } catch (error) {
      return 'Recently';
    }
  }

  // Additional methods for recent activity
  viewPost(post: any): void {
    const threadType = 'course';
    const threadId = post.threadid;
    this.router.navigate(['/student/thread-detail', threadType, threadId]);
  }

  replyToPost(post: any): void {
    const threadType = 'course';
    const threadId = post.threadid;
    this.router.navigate(['/student/thread-detail', threadType, threadId]);
  }

  getPostAuthorProfile(post: any): string | null {
    const profile = post.student_profile || post.teacher_profile;
    return profile && profile !== 'null' ? this.API.getURL(profile) : null;
  }
}