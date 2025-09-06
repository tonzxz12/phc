import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { firstValueFrom } from 'rxjs';

interface TopicThread {
  id: number;
  threadid: string;
  title: string;
  body?: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  post_count?: number;
  student_firstname?: string;
  student_lastname?: string;
  student_profile?: string;
  teacher_firstname?: string;
  teacher_lastname?: string;
  teacher_profile?: string;
}

@Component({
  selector: 'app-topic-threads',
  templateUrl: './topic-threads.component.html',
  styleUrls: ['./topic-threads.component.css']
})
export class TopicThreadsComponent implements OnInit {
  topicId: string = '';
  topicTitle: string = '';
  threads: TopicThread[] = [];
  isLoading: boolean = false;
  showCreateThread: boolean = false;
  newThreadTitle: string = '';
  newThreadBody: string = '';
  isTeacher: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public API: APIService
  ) {
    this.isTeacher = this.API.getUserType() === '1';
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.topicId = params['topicId'];
      if (this.topicId) {
        this.loadTopicInfo();
        this.loadThreads();
      }
    });
  }

  async loadTopicInfo(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.API.post('get_entries', {
          data: JSON.stringify({
            selectors: ['title'],
            tables: 'topics',
            conditions: {
              WHERE: { topicid: this.topicId }
            }
          })
        })
      );
      
      if (response.success && response.output.length > 0) {
        this.topicTitle = response.output[0].title;
      }
    } catch (error) {
      console.error('Error loading topic info:', error);
    }
  }

  async loadThreads(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await firstValueFrom(this.API.getTopicThreads(this.topicId));
      if (response.success && Array.isArray(response.output)) {
        this.threads = response.output.map((thread: any) => ({
          id: thread.id,
          threadid: thread.threadid,
          title: thread.title,
          body: thread.body || '',
          isPinned: thread.ispinned === true || thread.ispinned === 't' || thread.ispinned === 'true',
          isLocked: thread.islocked === true || thread.islocked === 't' || thread.islocked === 'true',
          createdAt: thread.createdat,
          updatedAt: thread.updatedat,
          post_count: thread.post_count || 0,
          // Author info will be empty for now - could be fetched separately if needed
          student_firstname: thread.student_firstname,
          student_lastname: thread.student_lastname,
          student_profile: thread.student_profile,
          teacher_firstname: thread.teacher_firstname,
          teacher_lastname: thread.teacher_lastname,
          teacher_profile: thread.teacher_profile
        }));
      } else {
        this.threads = [];
        this.API.failedSnackbar('Failed to load discussion threads');
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      this.API.failedSnackbar('Error loading discussion threads');
      this.threads = [];
    } finally {
      this.isLoading = false;
    }
  }

  async createThread(): Promise<void> {
    if (!this.newThreadTitle.trim()) {
      this.API.failedSnackbar('Please enter a thread title');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.API.createTopicThread(this.topicId, this.newThreadTitle, this.newThreadBody)
      );
      
      if (response.success) {
        this.API.successSnackbar('Discussion thread created successfully');
        this.newThreadTitle = '';
        this.newThreadBody = '';
        this.showCreateThread = false;
        await this.loadThreads();
      } else {
        this.API.failedSnackbar('Failed to create discussion thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      this.API.failedSnackbar('Error creating discussion thread');
    }
  }

  openThread(thread: TopicThread): void {
    // Determine context based on current route
    const currentUrl = this.router.url;
    let basePath = '/student';
    
    if (currentUrl.includes('/teacher/')) {
      basePath = '/teacher';
    } else if (currentUrl.includes('/admin/')) {
      basePath = '/admin';
    }
    
    this.router.navigate([basePath, 'thread-detail', 'topic', thread.id]);
  }

  async pinThread(thread: TopicThread): Promise<void> {
    if (!this.isTeacher) return;
    
    try {
      const response = await firstValueFrom(
        this.API.pinTopicThread(thread.threadid, !thread.isPinned)
      );
      
      if (response.success) {
        thread.isPinned = !thread.isPinned;
        this.API.successSnackbar(`Thread ${thread.isPinned ? 'pinned' : 'unpinned'} successfully`);
      } else {
        this.API.failedSnackbar('Failed to update thread');
      }
    } catch (error) {
      console.error('Error updating thread:', error);
      this.API.failedSnackbar('Error updating thread');
    }
  }

  async lockThread(thread: TopicThread): Promise<void> {
    if (!this.isTeacher) return;
    
    try {
      const response = await firstValueFrom(
        this.API.lockTopicThread(thread.threadid, !thread.isLocked)
      );
      
      if (response.success) {
        thread.isLocked = !thread.isLocked;
        this.API.successSnackbar(`Thread ${thread.isLocked ? 'locked' : 'unlocked'} successfully`);
      } else {
        this.API.failedSnackbar('Failed to update thread');
      }
    } catch (error) {
      console.error('Error updating thread:', error);
      this.API.failedSnackbar('Error updating thread');
    }
  }

  getAuthorName(thread: TopicThread): string {
    if (thread.student_firstname && thread.student_lastname) {
      return `${thread.student_firstname} ${thread.student_lastname}`;
    } else if (thread.teacher_firstname && thread.teacher_lastname) {
      return `${thread.teacher_firstname} ${thread.teacher_lastname}`;
    }
    return 'Unknown';
  }

  getAuthorProfile(thread: TopicThread): string {
    const profile = thread.student_profile || thread.teacher_profile;
    return profile && profile !== 'null' ? this.API.getURL(profile) : this.API.noProfile();
  }

  cancelCreateThread(): void {
    this.showCreateThread = false;
    this.newThreadTitle = '';
    this.newThreadBody = '';
  }
}
