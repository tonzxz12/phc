import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Interfaces for moderation system
interface ReportedMessage {
  id: string;
  content: string;
  author: string;
  userId: string;
  timestamp: Date;
  reportCount: number;
  reportReasons: string[];
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
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit,OnDestroy {
  teachers = 0;
  students = 0;
  courses = 0;
  courseChart: Chart | undefined;
  courseData: any[] = [];

  getStudents$?:Subscription;
  getTeachers$?:Subscription;
  getCourses$?:Subscription;
  getCoursesData: any[] = [];

  isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

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
  censoredWords: string[] = [
    'spam', 'scam', 'inappropriate', 'offensive', 'harassment',
    'bullying', 'hate', 'discrimination', 'violence', 'threat'
  ];

  constructor(private API: APIService, private route: ActivatedRoute){}

  ngOnInit(): void {
     this.getTeachers$ = this.API.getTeachers().subscribe(data=>{
      if(data.success){
        this.teachers = data.output.length;
      }else{
        this.API.failedSnackbar('Unable to load teachers data');
      }
     })

     this.getTeachers$ = this.API.getStudents().subscribe(data=>{
      if(data.success){
        this.students = data.output.length;
      }else{
        this.API.failedSnackbar('Unable to load student data');
      }
     })

     this.getCourses$ = this.API.getCourses().subscribe(data=>{
      if(data.success){
        this.courses = data.output.length;
      }else{
        this.API.failedSnackbar('Unable to load courses data');
      }
     })

     this.createEnrollmentChart(this.getCoursesData);
     this.loadModerationData();

     // Handle moderation anchor link - use startWith to ensure it fires immediately if fragment is already set
     this.route.fragment.subscribe(fragment => {
       if (fragment === 'moderation') {
         setTimeout(() => {
           this.scrollToModeration();
         }, 500); // Small delay to ensure the page is loaded
       }
     });

     // Also check initial fragment on load
     setTimeout(() => {
       if (this.route.snapshot.fragment === 'moderation') {
         this.scrollToModeration();
       }
     }, 1000);
  }

  
  createEnrollmentChart(courses: any[]): void {
    // Sort courses by student count and get top 5
    const topCourses = [...courses]
      .sort((a, b) => (b.studentcount || 0) - (a.studentcount || 0))
      .slice(0, 5);
  
    const labels = topCourses.map(course => course.course);
    const data = topCourses.map(course => course.studentcount || 0);
  
    setTimeout(() => {
      const ctx = document.getElementById('courseChart') as HTMLCanvasElement;
      if (!ctx) return;
  
      if (this.courseChart) {
        this.courseChart.destroy();
      }
  
      this.courseChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Students',
            data: data,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            // borderColor: 'rgba(54, 162, 235, 1)',
            // borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 5,
                callback: (value) => {
                  return value;
                },
                color: this.isDarkMode ? 'white' : 'black'
              },
              title: {
                display: true,
                text: 'Number of Students',
                color: this.isDarkMode ? 'white' : 'black'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Courses',
                color: this.isDarkMode ? 'white' : 'black'
              },
              ticks: {
                color: this.isDarkMode ? 'white' : 'black'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }, 0);
  }

  ngOnDestroy(): void {
    this.getTeachers$?.unsubscribe();
    this.getStudents$?.unsubscribe();
    this.getCourses$?.unsubscribe();
  }

  // Moderation Methods

  loadModerationData(): void {
    // Load sample data - replace with actual API calls
    this.loadReportedMessages();
    this.loadConversations();
    this.loadForumPosts();
    this.loadMessageStats();
  }

  loadReportedMessages(): void {
    // Sample reported messages - replace with actual API call
    this.reportedMessages = [
      {
        id: '1',
        content: 'This is an inappropriate message that violates community guidelines.',
        author: 'John Doe',
        userId: 'user1',
        timestamp: new Date(),
        reportCount: 3,
        reportReasons: ['Inappropriate Content', 'Harassment']
      },
      {
        id: '2', 
        content: 'Spam message with offensive language.',
        author: 'Jane Smith',
        userId: 'user2',
        timestamp: new Date(Date.now() - 3600000),
        reportCount: 5,
        reportReasons: ['Spam', 'Offensive Language']
      }
    ];
    this.reportedMessagesCount = this.reportedMessages.length;
  }

  loadConversations(): void {
    // Sample conversations - replace with actual API call
    this.conversations = [
      {
        id: '1',
        participants: ['John Doe', 'Jane Smith'],
        messageCount: 15,
        lastMessage: 'Thanks for the help with the assignment.',
        lastActivity: new Date()
      },
      {
        id: '2',
        participants: ['Alice Johnson', 'Bob Wilson'],
        messageCount: 8,
        lastMessage: 'See you in class tomorrow.',
        lastActivity: new Date(Date.now() - 1800000)
      }
    ];
    this.filteredConversations = [...this.conversations];
  }

  loadForumPosts(): void {
    // Sample forum posts - replace with actual API call
    this.forumPosts = [
      {
        id: '1',
        title: 'Discussion on Medical Ethics',
        content: 'Let\'s discuss the ethical implications of new medical procedures...',
        author: 'Dr. Smith',
        timestamp: new Date(),
        replyCount: 12,
        reported: false,
        pinned: true
      },
      {
        id: '2',
        title: 'Question about Course Materials',
        content: 'I have a question about the reading materials for this week...',
        author: 'Student123',
        timestamp: new Date(Date.now() - 7200000),
        replyCount: 5,
        reported: true,
        pinned: false
      }
    ];
    this.filteredForumPosts = [...this.forumPosts];
  }

  loadMessageStats(): void {
    // Sample message statistics - replace with actual API call
    this.totalMessages = 1247;
  }

  // Tab Navigation
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Message Moderation Actions
  deleteMessage(messageId: string): void {
    const confirmed = confirm('Are you sure you want to delete this message?');
    if (confirmed) {
      this.reportedMessages = this.reportedMessages.filter(msg => msg.id !== messageId);
      this.reportedMessagesCount = this.reportedMessages.length;
      this.API.successSnackbar('Message deleted successfully');
      // TODO: Add actual API call to delete message
    }
  }

  dismissReports(messageId: string): void {
    const message = this.reportedMessages.find(msg => msg.id === messageId);
    if (message) {
      this.reportedMessages = this.reportedMessages.filter(msg => msg.id !== messageId);
      this.reportedMessagesCount = this.reportedMessages.length;
      this.API.successSnackbar('Reports dismissed');
      // TODO: Add actual API call to dismiss reports
    }
  }

  warnUser(userId: string): void {
    const confirmed = confirm('Send a warning to this user?');
    if (confirmed) {
      this.API.successSnackbar('Warning sent to user');
      // TODO: Add actual API call to warn user
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
    // TODO: Implement conversation viewer
    this.API.justSnackbar('Opening conversation viewer...');
  }

  deleteConversation(conversationId: string): void {
    const confirmed = confirm('Are you sure you want to delete this conversation?');
    if (confirmed) {
      this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
      this.filteredConversations = this.filteredConversations.filter(conv => conv.id !== conversationId);
      this.API.successSnackbar('Conversation deleted successfully');
      // TODO: Add actual API call to delete conversation
    }
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
    // TODO: Implement forum post viewer
    this.API.justSnackbar('Opening forum post...');
  }

  togglePinPost(postId: string, currentlyPinned: boolean): void {
    const post = this.forumPosts.find(p => p.id === postId);
    if (post) {
      post.pinned = !currentlyPinned;
      const filteredPost = this.filteredForumPosts.find(p => p.id === postId);
      if (filteredPost) {
        filteredPost.pinned = post.pinned;
      }
      this.API.successSnackbar(post.pinned ? 'Post pinned' : 'Post unpinned');
      // TODO: Add actual API call to toggle pin status
    }
  }

  deleteForumPost(postId: string): void {
    const confirmed = confirm('Are you sure you want to delete this forum post?');
    if (confirmed) {
      this.forumPosts = this.forumPosts.filter(post => post.id !== postId);
      this.filteredForumPosts = this.filteredForumPosts.filter(post => post.id !== postId);
      this.API.successSnackbar('Forum post deleted successfully');
      // TODO: Add actual API call to delete forum post
    }
  }

  // Auto-censoring functionality
  censorMessage(content: string): string {
    let censoredContent = content;
    
    this.censoredWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      censoredContent = censoredContent.replace(regex, '*'.repeat(word.length));
    });
    
    return censoredContent;
  }

  checkForInappropriateContent(content: string): boolean {
    return this.censoredWords.some(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
  }

  // Modal actions
  openCensorWordsModal(): void {
    const newWords = prompt('Enter censored words (comma-separated):', this.censoredWords.join(', '));
    if (newWords !== null) {
      this.censoredWords = newWords.split(',').map(word => word.trim()).filter(word => word.length > 0);
      this.API.successSnackbar('Censored words updated');
      // TODO: Save to database/API
    }
  }

  refreshModerationData(): void {
    this.loadModerationData();
    this.API.successSnackbar('Moderation data refreshed');
  }

  // Scroll to moderation panel when accessing from sidebar
  scrollToModeration(): void {
    const moderationElement = document.getElementById('moderation-panel');
    if (moderationElement) {
      moderationElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      // Also set active tab to reported for immediate access
      this.setActiveTab('reported');
    }
  }

}
