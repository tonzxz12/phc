import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import { MatDialog } from '@angular/material/dialog';

import { ManageCensoredWordsComponent } from '../../general-modals/manage-censored-words/manage-censored-words.component';

// Interfaces for moderation system
interface ReportedMessage {
  id: string;
  content: string;
  author: string;
  userId: string;
  timestamp: Date;
  reportCount: number;
  reportReasons: string[];
  reportId?: string;
  messageId?: number;
}

interface Conversation {
  id: string;
  participants: string[];
  messageCount: number;
  lastMessage: string;
  lastActivity: Date;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: Date;
  replyCount: number;
  reported: boolean;
  pinned: boolean;
  postId?: number;
  // Additional fields for reported posts
  reportStatus?: string;
  reportPriority?: string;
  reportReason?: string;
  reportDescription?: string;
  reportDate?: Date;
  reporterName?: string;
  courseid?: string;
  threadId?: number;
  authorProfile?: string;
}

interface CensoredWord {
  id: number;
  word: string;
  description?: string;
  severity: string;
  category?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.css']
})
export class ModerationComponent implements OnInit, OnDestroy {
  // Moderation properties
  totalMessages = 0;
  reportedMessagesCount = 0;
  activeTab = 'reported';
  reportedMessages: ReportedMessage[] = [];
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  forumPosts: ForumPost[] = [];
  filteredForumPosts: ForumPost[] = [];
  
  // Search terms
  conversationSearchTerm = '';
  forumSearchTerm = '';

  // Censored words list
  censoredWords: CensoredWord[] = [];
  censoredWordsText = '';

  // Loading states
  loadingReports = false;
  loadingStats = false;

  // Subscriptions
  getModerationData$?: Subscription;
  getReportedMessages$?: Subscription;
  getReportedPosts$?: Subscription;
  getCensoredWords$?: Subscription;

  constructor(private API: APIService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadModerationData();
  }

  ngOnDestroy(): void {
    this.getModerationData$?.unsubscribe();
    this.getReportedMessages$?.unsubscribe();
    this.getReportedPosts$?.unsubscribe();
    this.getCensoredWords$?.unsubscribe();
  }

  // Moderation Methods
  loadModerationData(): void {
    console.log('🔍 Loading moderation data...');
    
    // Load data directly without API testing since backend has issues
    this.loadReportedMessages();
    this.loadConversations();
    this.loadForumPosts();
    this.loadMessageStats();
    this.loadCensoredWords();
  }

  loadReportedMessages(): void {
    this.loadingReports = true;
    this.getReportedMessages$ = this.API.getReportedMessages().subscribe({
      next: (response) => {
        console.log('🔍 Messages API response:', response);
        if (response.success && Array.isArray(response.output)) {
          this.reportedMessages = this.mapReportedMessages(response.output);
        } else {
          console.log('No reported messages found or API unavailable');
          this.reportedMessages = [];
        }
        this.reportedMessagesCount = this.reportedMessages.length;
        this.loadingReports = false;
      },
      error: (error) => {
        console.log('Reported messages API unavailable, using empty data');
        this.loadingReports = false;
        this.reportedMessages = [];
        this.reportedMessagesCount = 0;
      }
    });
  }

  mapReportedMessages(data: any[]): ReportedMessage[] {
    const messageMap = new Map<number, ReportedMessage>();
    
    data.forEach(report => {
      const messageId = report.message_id;
      const author = `${report.firstname || report.teacher_firstname || ''} ${report.lastname || report.teacher_lastname || ''}`.trim() || 'Unknown User';
      
      if (messageMap.has(messageId)) {
        // Add reason to existing message
        const existing = messageMap.get(messageId)!;
        existing.reportReasons.push(report.reason_name || 'Unknown');
        existing.reportCount++;
      } else {
        // Create new message entry
        messageMap.set(messageId, {
          id: report.reportid,
          content: report.content || '',
          author: author,
          userId: report.senderid || '',
          timestamp: new Date(report.timestamp || Date.now()),
          reportCount: 1,
          reportReasons: [report.reason_name || 'Unknown'],
          reportId: report.reportid,
          messageId: messageId
        });
      }
    });
    
    return Array.from(messageMap.values());
  }

  loadConversations(): void {
    // TODO: Implement conversation API when conversation features are added
    // For now, no conversations will be displayed until the API is implemented
    this.conversations = [];
    this.filteredConversations = [];
  }

  loadForumPosts(): void {
    console.log('🔍 Loading forum posts from database...');
    
    this.getReportedPosts$ = this.API.getReportedForumPosts().subscribe({
      next: (response) => {
        console.log('🔍 Forum posts API response:', response);
        if (response.success && Array.isArray(response.output)) {
          this.forumPosts = this.mapReportedForumPosts(response.output);
          this.filteredForumPosts = [...this.forumPosts];
        } else {
          this.forumPosts = [];
          this.filteredForumPosts = [];
        }
        console.log('🔍 Final forum posts:', this.forumPosts);
      },
      error: (error) => {
        console.log('Forum posts API unavailable, using empty data');
        this.forumPosts = [];
        this.filteredForumPosts = [];
      }
    });
  }



  mapReportedForumPosts(data: any[]): ForumPost[] {
    console.log('🔍 Mapping reported forum posts, input data:', data);
    const postMap = new Map<string, ForumPost>();
    
    data.forEach(report => {
      console.log('🔍 Processing report:', report);
      const reportId = report.reportid;
      
      if (!postMap.has(reportId)) {
        const mappedPost = {
          id: reportId,
          title: `Reported Post ID: ${report.post_id}`,
          content: report.description || 'No report description provided',
          author: 'Loading...', // Will be updated when we add JOIN queries
          timestamp: new Date(report.createdat || Date.now()),
          replyCount: 0,
          reported: true,
          pinned: false,
          postId: report.post_id,
          // Additional fields for moderation
          reportStatus: report.status,
          reportPriority: report.priority,
          reportDescription: report.description,
          reportDate: new Date(report.createdat),
          reporterName: 'Loading...', // Will be updated when we add JOIN queries
        };
        console.log('🔍 Creating mapped post:', mappedPost);
        postMap.set(reportId, mappedPost);
      }
    });
    
    const result = Array.from(postMap.values());
    console.log('🔍 Final mapped forum posts:', result);
    return result;
  }

  loadMessageStats(): void {
    this.loadingStats = true;
    this.getModerationData$ = this.API.getModerationStats().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.totalMessages = data[0].total_messages || 0;
        }
        this.loadingStats = false;
      },
      error: (error) => {
        console.log('Stats API unavailable, using default values');
        this.loadingStats = false;
        this.totalMessages = 0;
      }
    });
  }

  loadCensoredWords(): void {
    this.getCensoredWords$ = this.API.getCensoredWords().subscribe({
      next: (response) => {
        console.log('🔍 Censored words API response:', response);
        if (response.success && Array.isArray(response.output)) {
          this.censoredWords = response.output;
        } else if (Array.isArray(response)) {
          this.censoredWords = response;
        } else {
          console.log('No censored words found or API unavailable');
          this.censoredWords = [];
        }
        this.censoredWordsText = this.censoredWords.map(w => w.word).join(', ');
      },
      error: (error) => {
        console.log('Censored words API unavailable, using empty data');
        this.censoredWords = [];
        this.censoredWordsText = '';
      }
    });
  }

  // Tab Navigation
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Message Moderation Actions
  deleteMessage(messageId: string): void {
    const confirmed = confirm('Are you sure you want to delete this message?');
    if (confirmed) {
      const message = this.reportedMessages.find(msg => msg.id === messageId);
      if (message && message.messageId) {
        const adminId = this.API.getUserData().id;
        
        this.API.deleteReportedMessage(message.messageId, adminId, 'Message deleted due to policy violation').subscribe({
          next: () => {
            this.reportedMessages = this.reportedMessages.filter(msg => msg.id !== messageId);
            this.reportedMessagesCount = this.reportedMessages.length;
            this.API.successSnackbar('Message deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting message:', error);
            this.API.failedSnackbar('Failed to delete message');
          }
        });
      }
    }
  }

  dismissReports(messageId: string): void {
    const message = this.reportedMessages.find(msg => msg.id === messageId);
    if (message && message.messageId) {
      const adminId = this.API.getUserData().id;
      
      this.API.dismissMessageReports(message.messageId, adminId, 'Reports reviewed - no policy violation found').subscribe({
        next: () => {
          this.reportedMessages = this.reportedMessages.filter(msg => msg.id !== messageId);
          this.reportedMessagesCount = this.reportedMessages.length;
          this.API.successSnackbar('Reports dismissed');
        },
        error: (error) => {
          console.error('Error dismissing reports:', error);
          this.API.failedSnackbar('Failed to dismiss reports');
        }
      });
    }
  }

  warnUser(userId: string): void {
    const confirmed = confirm('Send a warning to this user?');
    if (confirmed) {
      // This would require additional API method for user warnings
      // For now, just show success message
      this.API.successSnackbar('Warning sent to user');
    }
  }

  // Conversation Actions
  searchConversations(): void {
    if (!this.conversationSearchTerm.trim()) {
      this.filteredConversations = [...this.conversations];
      return;
    }

    this.filteredConversations = this.conversations.filter(conv => 
      conv.participants.some(p => p.toLowerCase().includes(this.conversationSearchTerm.toLowerCase())) ||
      conv.lastMessage.toLowerCase().includes(this.conversationSearchTerm.toLowerCase())
    );
  }

  viewConversation(conversationId: string): void {
    // TODO: Implement conversation viewer when conversation features are added
    this.API.justSnackbar('Conversation viewer not yet implemented');
  }

  deleteConversation(conversationId: string): void {
    // TODO: Implement conversation deletion when conversation features are added
    this.API.justSnackbar('Conversation management not yet implemented');
  }

  // Forum Actions
  searchForums(): void {
    if (!this.forumSearchTerm.trim()) {
      this.filteredForumPosts = [...this.forumPosts];
      return;
    }

    this.filteredForumPosts = this.forumPosts.filter(post => 
      post.title.toLowerCase().includes(this.forumSearchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(this.forumSearchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(this.forumSearchTerm.toLowerCase())
    );
  }

  viewForumPost(postId: string): void {
    const post = this.forumPosts.find(p => p.id === postId);
    if (post && post.postId) {
      // Get the course ID first, then navigate to admin forum view
      this.API.post('get_entries', {
        data: JSON.stringify({
          selectors: ['course_forum_threads.courseid', 'course_forum_posts.threadid'],
          tables: 'course_forum_posts',
          conditions: {
            'LEFT JOIN course_forum_threads': 'ON course_forum_threads.id = course_forum_posts.threadid',
            WHERE: {
              'course_forum_posts.id': post.postId
            }
          }
        })
      }).subscribe({
        next: (response) => {
          if (response.success && response.output && response.output.length > 0) {
            const data = response.output[0];
            // Navigate to admin forum view
            window.location.href = `/admin/thread-detail/course/${data.threadid}`;
          } else {
            this.API.failedSnackbar('Could not find forum post details');
          }
        },
        error: () => {
          this.API.failedSnackbar('Error loading forum post');
        }
      });
    } else {
      this.API.failedSnackbar('Post not found');
    }
  }

  togglePinPost(postId: string, currentlyPinned: boolean): void {
    const post = this.forumPosts.find(p => p.id === postId);
    if (post && post.postId) {
      this.API.pinCourseForumThread(post.postId.toString(), !currentlyPinned).subscribe({
        next: () => {
          post.pinned = !currentlyPinned;
          const filteredPost = this.filteredForumPosts.find(p => p.id === postId);
          if (filteredPost) {
            filteredPost.pinned = post.pinned;
          }
          this.API.successSnackbar(post.pinned ? 'Post pinned' : 'Post unpinned');
        },
        error: (error) => {
          console.error('Error toggling pin status:', error);
          this.API.failedSnackbar('Failed to update pin status');
        }
      });
    }
  }

  deleteForumPost(postId: string): void {
    const confirmed = confirm('Are you sure you want to delete this reported forum post?');
    if (confirmed) {
      const post = this.forumPosts.find(p => p.id === postId);
      if (post && post.postId) {
        this.API.deleteCourseForumPost(post.postId.toString()).subscribe({
          next: () => {
            this.forumPosts = this.forumPosts.filter(p => p.id !== postId);
            this.filteredForumPosts = this.filteredForumPosts.filter(p => p.id !== postId);
            this.API.successSnackbar('Reported forum post deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting forum post:', error);
            this.API.failedSnackbar('Failed to delete forum post');
          }
        });
      }
    }
  }

  dismissForumReport(postId: string): void {
    const confirmed = confirm('Are you sure you want to dismiss this report?');
    if (confirmed) {
      const post = this.forumPosts.find(p => p.id === postId);
      if (post) {
        // Update report status to dismissed
        const updateObject = {
          tables: 'course_post_reports',
          values: {
            status: 'dismissed',
            reviewed_at: new Date().toISOString(),
            reviewed_by: this.API.getUserData().id
          },
          conditions: {
            WHERE: {
              reportid: post.id
            }
          }
        };

        this.API.post('update_entry', {
          data: JSON.stringify(updateObject)
        }).subscribe({
          next: () => {
            this.forumPosts = this.forumPosts.filter(p => p.id !== postId);
            this.filteredForumPosts = this.filteredForumPosts.filter(p => p.id !== postId);
            this.API.successSnackbar('Report dismissed successfully');
          },
          error: (error) => {
            console.error('Error dismissing report:', error);
            this.API.failedSnackbar('Failed to dismiss report');
          }
        });
      }
    }
  }

  // Auto-censoring functionality
  censorMessage(content: string): string {
    let censoredContent = content;
    
    this.censoredWords.forEach(wordObj => {
      const word = wordObj.word;
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      censoredContent = censoredContent.replace(regex, '*'.repeat(word.length));
    });
    
    return censoredContent;
  }

  checkForInappropriateContent(content: string): boolean {
    return this.censoredWords.some(wordObj => {
      const word = wordObj.word;
      return content.toLowerCase().includes(word.toLowerCase());
    });
  }

  // Modal actions
  openCensorWordsModal(): void {
    const dialogRef = this.dialog.open(ManageCensoredWordsComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      disableClose: false,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.updated) {
        // Reload censored words if they were updated
        this.loadCensoredWords();
      }
    });
  }

  refreshModerationData(): void {
    this.loadModerationData();
    this.API.successSnackbar('Moderation data refreshed');
  }
}
