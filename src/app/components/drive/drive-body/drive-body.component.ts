import { Component, OnInit, ViewChild, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from '../../../services/API/api.service';
import { ViewerComponent } from '../../../unused-components/viewer/viewer.component';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface DriveFile {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'video' | 'youtube' | 'document' | 'audio' | 'archive' | 'other';
  size?: number;
  modified?: Date;
  owner?: string;
  shared: boolean;
  starred: boolean;
  thumbnail?: string;
  path: string[];
  itemType: 'topic' | 'lesson' | 'course' | 'attachment';
  parentId?: string;
  courseId?: string;
  lessonId?: string;
  topicId?: string;
  description?: string;
  imageError?: boolean;
  downloadUrl?: string;
  attachment?: string;
}


interface NavigationLevel {
  type: 'root' | 'course' | 'lesson' | 'topic';
  id?: string;
  name: string;
}

@Component({
  selector: 'app-drive-body',
  templateUrl: './drive-body.component.html',
  styleUrls: ['./drive-body.component.css']
})
export class DriveBodyComponent implements OnInit, OnChanges {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Input() currentView: string = 'my-files';

  // Search and filter properties
  searchQuery: string = '';
  viewMode: 'grid' | 'list' = 'grid';
  
  // File management
  files: DriveFile[] = [];
  filteredFiles: DriveFile[] = [];
  selectedFiles: string[] = [];
  
  // Course data from API
  courseData: any = [];
  quizzes: any = [];
  topics: any = [];
  
  // Upload properties
  isUploading: boolean = false;
  uploadProgress: number = 0;
  
  // UI state
  loading: boolean = false;
  
  // Context menu
  showContextMenuFlag: boolean = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedFile: DriveFile | null = null;
  
  // Modal
  showNewModalFlag: boolean = false;
  
  // Navigation
  currentNavigationLevel: NavigationLevel = { type: 'root', name: 'My Drive' };
  navigationHistory: NavigationLevel[] = [];

  constructor(
    private router: Router,
    private modalService: NgbModal,
    private apiService: APIService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadFiles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentView'] && !changes['currentView'].firstChange) {
      this.loadFiles();
    }
  }

  // Search functionality
  onSearch(): void {
    this.filterFiles();
  }

  private filterFiles(): void {
    if (!this.searchQuery.trim()) {
      this.filteredFiles = [...this.files];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredFiles = this.files.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query)
      );
    }
  }

  // View mode
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  // File operations
  loadFiles(): void {
    this.loading = true;
    
    // Reset navigation when switching views
    if (this.currentView !== 'my-files') {
      this.currentNavigationLevel = { type: 'root', name: 'My Drive' };
      this.navigationHistory = [];
    }
    
    // Load courses based on current view
    if (this.currentView === 'my-files') {
      if (this.currentNavigationLevel.type === 'root') {
        this.getTeacherCourses();
      } else {
        // We're in a subdirectory, reload the appropriate content
        this.reloadCurrentLevel();
      }
    } else if (this.currentView === 'recent') {
      this.loadRecentFiles();
    } else if (this.currentView === 'trash') {
      this.loadTrashFiles();
    }
  }

  // reloadCurrentLevel(): void {
  //   switch (this.currentNavigationLevel.type) {
  //     case 'course':
  //       this.loadLessonsForCourse(this.currentNavigationLevel.id!);
  //       break;
  //     case 'lesson':
  //       this.loadTopicsForLesson(this.currentNavigationLevel.id!);
  //       break;
  //     case 'topic':
  //       this.loadAttachmentsForTopic(this.currentNavigationLevel.id!);
  //       break;
  //     default:
  //       this.getTeacherCourses();
  //       break;
  //   }
  // }

  getTeacherCourses(): void {
    this.loading = true;
    this.courseData = [];
    this.apiService.teacherAllCourses().subscribe(data => {
      console.log('API response:', data);
      if (data.success) {
        for (let course of data.output) {
          let mode = 'LRSW';
          if (course.filter != null) {
            mode = course.filter;
          }

          let targetAudience = course.target_audience;
          let technicalRequirements = course.technical_requirements;

          // Handle target audience parsing
          if (typeof targetAudience === 'string') {
            try {
              targetAudience = targetAudience.replace(/[{}]/g, '').split(',');
              if (targetAudience.length === 1 && targetAudience[0] === '') {
                targetAudience = [];
              }
            } catch (error) {
              console.error('Error parsing targetAudience:', error);
              targetAudience = [];
            }
          }

          // Handle technical requirements parsing
          if (typeof technicalRequirements === 'string') {
            try {
              technicalRequirements = technicalRequirements.replace(/[{}]/g, '').split(',');
              if (technicalRequirements.length === 1 && technicalRequirements[0] === '') {
                technicalRequirements = [];
              }
            } catch (error) {
              console.error('Error parsing technicalRequirements:', error);
              technicalRequirements = [];
            }
          }

          this.courseData.push({
            id: course.id,
            code: course.code,
            lang: course.languageid,
            title: course.course,
            lessons: course.lessons,
            description: course.details,
            image: course.image,
            mode: mode,
            objectives: course.objectives,
            targetAudience: targetAudience,
            technicalRequirements: technicalRequirements
          });
        }

        // Convert course data to drive files
        this.convertCoursesToDriveFiles();
        this.loading = false;
      } else {
        console.error('Failed loading courses');
        this.loading = false;
        this.files = [];
        this.filteredFiles = [];
      }
    }, error => {
      console.error('Error loading courses:', error);
      this.loading = false;
      this.files = [];
      this.filteredFiles = [];
    });
  }

  convertCoursesToDriveFiles(): void {
    this.files = this.courseData.map((course: any) => {
      return {
        id: course.id,
        name: course.title,
        type: 'folder' as const,
        size: undefined,
        modified: new Date(), // You can use course creation date if available
        owner: 'You',
        shared: false,
        starred: false,
        thumbnail: course.image ? this.apiService.getURL(course.image) : undefined,
        path: [],
        itemType: 'course' as const,
        courseId: course.id,
        description: course.description || 'No description available',
        attachmentCount: course.lessons || 0,
        imageError: false,
        // Add these additional properties for better display
        code: course.code,
        objectives: course.objectives,
        targetAudience: course.targetAudience,
        technicalRequirements: course.technicalRequirements
      };
    });
    this.filterFiles();
  }

  loadRecentFiles(): void {
    // Placeholder for recent files functionality
    console.log('Loading recent files...');
    this.loading = false;
    this.files = [];
    this.filteredFiles = [];
  }

  loadTrashFiles(): void {
    // Placeholder for trash functionality
    console.log('Loading trash files...');
    this.loading = false;
    this.files = [];
    this.filteredFiles = [];
  }

  // Utility method for getting file URLs
  getURL(file: string): string {
    if (file && file.includes('http')) {
      return file;
    } else {
      return this.apiService.getURL(file);
    }
  }

 
  // Navigation
  navigateToFolder(file: DriveFile): void {
    console.log('🚀 NavigateToFolder called for:', file.name);
    console.log('📂 File type:', file.type);
    console.log('🔗 File downloadUrl:', file.downloadUrl);
    console.log('📋 File itemType:', file.itemType);
    
    if (file.type === 'folder') {
      // Add smooth transition effect
      this.loading = true;
      
      // Add current level to history before navigating
      this.navigationHistory.push({ ...this.currentNavigationLevel });
      
      // Small delay for visual feedback
      setTimeout(() => {
        if (file.itemType === 'course') {
          console.log('Navigating to course lessons:', file.name);
          this.navigateToCourse(file);
        } else if (file.itemType === 'lesson') {
          console.log('Navigating to lesson topics:', file.name);
          this.navigateToLesson(file);
        } else if (file.itemType === 'topic') {
          console.log('Navigating to topic attachments:', file.name);
          this.navigateToTopic(file);
        }
      }, 200);
    } else {
      console.log('🎯 Opening file instead of navigating:', file.name);
      this.openFile(file);
    }
  }

  navigateToCourse(courseFile: DriveFile): void {
    this.currentNavigationLevel = {
      type: 'course',
      id: courseFile.id,
      name: courseFile.name
    };
    this.loadLessonsForCourse(courseFile.id);
  }

  navigateToLesson(lessonFile: DriveFile): void {
    this.currentNavigationLevel = {
      type: 'lesson',
      id: lessonFile.id,
      name: lessonFile.name
    };
    this.loadTopicsForLesson(lessonFile.id);
  }

  navigateToTopic(topicFile: DriveFile): void {
    this.currentNavigationLevel = {
      type: 'topic',
      id: topicFile.topicId || topicFile.id, // Use topicId (string) for API calls
      name: topicFile.name
    };
    this.loadAttachmentsForTopic(topicFile.topicId || topicFile.id);
  }

  navigateBack(): void {
    if (this.navigationHistory.length > 0) {
      this.currentNavigationLevel = this.navigationHistory.pop()!;
      this.loadFiles();
    }
  }

  // Load different content types
  loadLessonsForCourse(courseId: string): void {
    this.loading = true;
    this.apiService.setCourse(courseId); // Set the course context
    this.apiService.GetLessonsForDrive(courseId).subscribe(data => {
      console.log('Lessons API response:', data);
      if (data.success) {
        this.files = data.output.map((lesson: any) => {
          return {
            id: lesson.id || lesson.ID,
            name: lesson.title || lesson.Title,
            type: 'folder' as const,
            size: undefined,
            modified: new Date(lesson.time || lesson.date_created || Date.now()),
            owner: 'You',
            shared: false,
            starred: false,
            thumbnail: lesson.background ? this.apiService.getURL(lesson.background) : undefined,
            path: [courseId],
            itemType: 'lesson' as const,
            courseId: courseId,
            lessonId: lesson.id || lesson.ID,
            description: lesson.details || 'No description available',
            attachmentCount: 0, // Will be updated when we get topics
            imageError: false
          };
        });
        this.filterFiles();
        this.loading = false;
      } else {
        console.error('Failed loading lessons');
        this.loading = false;
        this.files = [];
        this.filteredFiles = [];
      }
    }, error => {
      console.error('Error loading lessons:', error);
      this.loading = false;
      this.files = [];
      this.filteredFiles = [];
    });
  }

  loadTopicsForLesson(lessonId: string): void {
    this.loading = true;
    this.apiService.GetTopicsForDrive(lessonId).subscribe(data => {
      console.log('Topics API response:', data);
      if (data.success) {
        this.files = data.output.map((topic: any) => {
          return {
            id: topic.id || topic.ID,
            name: topic.title || topic.Title,
            type: 'folder' as const,
            size: undefined,
            modified: new Date(topic.date_created || Date.now()),
            owner: 'You',
            shared: false,
            starred: false,
            thumbnail: undefined, // Topics don't usually have images
            path: [this.getCurrentCourseId(), lessonId],
            itemType: 'topic' as const,
            courseId: this.getCurrentCourseId(),
            lessonId: lessonId,
            topicId: topic.topicid || topic.TopicID || topic.id,
            description: topic.details || 'No description available',
            attachmentCount: 0, // Will be updated with actual attachment count
            imageError: false
          };
        });
        this.filterFiles();
        this.loading = false;
      } else {
        console.error('Failed loading topics');
        this.loading = false;
        this.files = [];
        this.filteredFiles = [];
      }
    }, error => {
      console.error('Error loading topics:', error);
      this.loading = false;
      this.files = [];
      this.filteredFiles = [];
    });
  }

  loadAttachmentsForTopic(topicId: string): void {
    this.loading = true;
    // Load attachments for the topic
    this.apiService.GetTopicAttachmentsForDrive(topicId).subscribe(data => {
      console.log('Attachments API response:', data);
      if (data.success) {
        console.log('📁 Loading attachments data:', data.output);
        
        // Update the file mapping logic to detect YouTube videos
        const processedFiles = data.output.map((attachment: any) => {
          console.log('📎 Processing attachment:', attachment.attachment, 'Type:', attachment.type);
          
          // Check if it's a YouTube attachment
          const isYouTube = this.isYouTubeAttachment(attachment.attachment);
          console.log(isYouTube ? '🎬 Detected YouTube attachment' : '📁 Regular file attachment');
          
          const downloadUrl = isYouTube ? attachment.attachment : this.apiService.getURL(attachment.attachment);
          
          return {
            id: attachment.id,
            name: attachment.name,
            type: isYouTube ? 'youtube' : this.getFileType(attachment.attachment, attachment.type),
            size: undefined,
            modified: new Date(attachment.created_at),
            owner: 'You',
            shared: false,
            starred: false,
            thumbnail: undefined,
            path: [this.getCurrentCourseId(), this.getCurrentLessonId(), topicId],
            itemType: 'attachment' as const, // This was missing!
            parentId: topicId,
            courseId: this.getCurrentCourseId(),
            lessonId: this.getCurrentLessonId(),
            topicId: topicId,
            description: attachment.description || '',
            imageError: false,
            downloadUrl: downloadUrl, // Make sure this is set
            attachment: attachment.attachment // Keep original attachment reference
          };
        });
        
        this.files = processedFiles;
        this.filterFiles();
        this.loading = false;
      } else {
        console.error('Failed loading attachments');
        this.loading = false;
        this.files = [];
        this.filteredFiles = [];
      }
    }, error => {
      console.error('Error loading attachments:', error);
      this.loading = false;
      this.files = [];
      this.filteredFiles = [];
    });
  }

  // Helper methods
  getCurrentCourseId(): string {
    // Navigate back through history to find course ID
    for (let i = this.navigationHistory.length - 1; i >= 0; i--) {
      if (this.navigationHistory[i].type === 'course') {
        return this.navigationHistory[i].id || '';
      }
    }
    return '';
  }

  getCurrentLessonId(): string {
    // Navigate back through history to find lesson ID
    for (let i = this.navigationHistory.length - 1; i >= 0; i--) {
      if (this.navigationHistory[i].type === 'lesson') {
        return this.navigationHistory[i].id || '';
      }
    }
    return '';
  }

  getFileType(filename: string, attachmentType?: string): string {
    // First check if it's a YouTube URL
    if (this.isYouTubeAttachment(filename)) {
      return 'youtube';
    }
    
    // If type is provided and it's a topic, treat as folder
    if (attachmentType === 'topic') {
      return 'folder';
    }
    
    // Get file extension
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return 'image';
    }
    
    // Document files
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
      return 'document';
    }
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
      return 'audio';
    }
    
    return 'other';
  }

  // File actions
  openFile(file: DriveFile): void {
    console.log('🔍 OpenFile called for:', file.name);
    console.log('📎 File downloadUrl:', file.downloadUrl);
    console.log('📋 File itemType:', file.itemType);
    console.log('🔄 File type:', file.type);
    console.log('🆔 File ID:', file.id);
    console.log('📁 Full file object:', file);
    
    // Check if file has downloadUrl
    if (!file.downloadUrl) {
      console.error('❌ No downloadUrl available for file:', file.name);
      // Use snackbar instead of errorSnackbar
      this.snackBar.open('File cannot be opened: No download URL available', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    // For attachments, always try to open in viewer
    if (file.itemType === 'attachment') {
      console.log('✅ Opening attachment in viewer component');
      this.openFileViewer(file);
    } else {
      // For other items, check if viewable
      if (this.isViewableFile(file.type)) {
        console.log('✅ Opening viewable file in viewer component');
        this.openFileViewer(file);
      } else {
        console.log('💾 Downloading non-viewable file');
        this.downloadFile(file);
      }
    }
  }

  isViewableFile(fileType: string): boolean {
    return ['image', 'video', 'youtube', 'document', 'audio'].includes(fileType);
  }

  openFileViewer(file: DriveFile): void {
    console.log('🔍 Opening file viewer for file:', file.name);
    console.log('📎 File downloadUrl:', file.downloadUrl);
    console.log('📝 File name:', file.name);
    console.log('🆔 File ID:', file.id);
    console.log('📋 File itemType:', file.itemType);
    console.log('🔄 File type:', file.type);
    
    // Check if it's a YouTube URL
    const isYouTubeUrl = this.isYouTubeAttachment(file.downloadUrl || '');
    console.log('🎬 Is YouTube URL in openFileViewer?', isYouTubeUrl);
    console.log('🔗 URL being passed to viewer:', file.downloadUrl);
    
    // Validate required data
    if (!file.downloadUrl) {
      console.error('❌ Cannot open viewer: No downloadUrl');
      this.snackBar.open('Cannot open file: No download URL available', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    try {
      // Open the viewer component in a modal
      const modalRef = this.modalService.open(ViewerComponent, {
        size: 'xl',
        backdrop: 'static',
        windowClass: 'viewer-modal',
        container: 'body'
      });

      modalRef.componentInstance.link = file.downloadUrl;
      modalRef.componentInstance.fileName = file.name;
      modalRef.componentInstance.interactive = false;
      
      // Set attachment ID if it's available for video table of contents
      if (file.id && file.itemType === 'attachment') {
        modalRef.componentInstance.attachmentId = parseInt(file.id);
      }

      console.log('✅ Viewer modal opened successfully');

      modalRef.result.then((result) => {
        console.log('📝 Viewer closed with result:', result);
      }).catch((error) => {
        console.log('❌ Viewer dismissed with error:', error);
      });
    } catch (error) {
      console.error('❌ Error opening viewer modal:', error);
      this.snackBar.open('Error opening file viewer', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  shareFile(file: DriveFile): void {
    console.log('Sharing file:', file.name);
    // Implement sharing functionality
  }

  /**
   * Check if an attachment is a YouTube URL
   */
  isYouTubeAttachment(url: string): boolean {
    if (!url) return false;
    
    // Check for partial YouTube URLs (missing domain)
    if (/^watch\?v=([A-Za-z0-9_-]{11})/.test(url)) {
      console.log('🎬 Detected YouTube attachment (partial):', url);
      return true;
    }
    
    // Check for just video ID (11 characters)
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      console.log('🎬 Detected YouTube attachment (ID only):', url);
      return true;
    }
    
    // Check for full YouTube URLs
    if (/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/.test(url) || 
        /youtu\.be\/([A-Za-z0-9_-]{11})/.test(url)) {
      console.log('🎬 Detected YouTube attachment (full URL):', url);
      return true;
    }
    
    return false;
  }

  downloadFile(file: DriveFile): void {
    console.log('🔗 Downloading file:', file.name);
    console.log('🔗 File downloadUrl:', file.downloadUrl);
    
    if (file.downloadUrl) {
      // Check if it's a YouTube URL - YouTube videos can't be downloaded, open viewer instead
      if (this.isYouTubeAttachment(file.downloadUrl)) {
        console.log('🎬 YouTube video detected - opening in viewer instead of downloading');
        this.apiService.successSnackbar('YouTube videos cannot be downloaded. Opening in viewer instead.');
        this.openFileViewer(file);
        return;
      }
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('No download URL available for file:', file.name);
    }
  }

  deleteFile(file: DriveFile): void {
    console.log('Deleting file:', file.name);
  }

  toggleStar(fileId: string): void {
    const file = this.files.find(f => f.id === fileId);
    if (file) {
      file.starred = !file.starred;
    }
  }

  // Context menu
  showContextMenu(event: MouseEvent, file: DriveFile): void {
    event.preventDefault();
    this.selectedFile = file;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showContextMenuFlag = true;
  }

  hideContextMenu(): void {
    this.showContextMenuFlag = false;
    this.selectedFile = null;
  }

  showFileMenu(event: MouseEvent, file: DriveFile): void {
    event.stopPropagation();
    this.showContextMenu(event, file);
  }

  // Upload functionality
  uploadFiles(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.isUploading = true;
      // Simulate upload progress
      this.simulateUpload();
    }
  }

  private simulateUpload(): void {
    this.uploadProgress = 0;
    const interval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
        this.isUploading = false;
        this.uploadProgress = 0;
      }
    }, 200);
  }

  cancelUpload(): void {
    this.isUploading = false;
    this.uploadProgress = 0;
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  triggerFolderUpload(): void {
    // Implementation for folder upload
  }

  // Modal
  showNewModal(): void {
    this.showNewModalFlag = true;
  }

  createNewFolder(): void {
    console.log('Creating new folder');
    this.showNewModalFlag = false;
  }

  // Utility methods
  getFileIconClass(fileType: string): string {
    switch (fileType) {
      case 'folder':
        return 'bx bx-folder';
      case 'video':
        return 'bx bx-play-circle';
      case 'youtube':
        return 'bx bxl-youtube';
      case 'image':
        return 'bx bx-image';
      case 'document':
        return 'bx bx-file-doc';
      case 'audio':
        return 'bx bx-music';
      default:
        return 'bx bx-file';
    }
  }

  getFileIconColor(fileType: string): string {
    switch (fileType) {
      case 'folder':
        return '#059669'; // emerald-600
      case 'video':
        return '#dc2626'; // red-600
      case 'youtube':
        return '#ff0000'; // YouTube red
      case 'image':
        return '#d97706'; // amber-600
      case 'document':
        return '#2563eb'; // blue-600
      case 'audio':
        return '#7c3aed'; // violet-600
      default:
        return '#4b5563'; // gray-600
    }
  }

  getEmptyStateIcon(): string {
    const iconMap = {
      'my-files': 'bx bx-folder-open text-6xl text-gray-400',
      'recent': 'bx bx-time text-6xl text-gray-400',
      'trash': 'bx bx-trash text-6xl text-gray-400'
    };
    return iconMap[this.currentView as keyof typeof iconMap] || iconMap['my-files'];
  }

  getEmptyStateTitle(): string {
    const titleMap = {
      'my-files': 'No files yet',
      'recent': 'No recent files',
      'trash': 'Trash is empty'
    };
    return titleMap[this.currentView as keyof typeof titleMap] || 'No files found';
  }

  getEmptyStateMessage(): string {
    const messageMap = {
      'my-files': 'Your course files will appear here once you have courses with content.',
      'recent': 'Files you\'ve recently accessed will appear here.',
      'trash': 'Items you delete will appear here before being permanently removed.'
    };
    return messageMap[this.currentView as keyof typeof messageMap] || 'No files to display';
  }

  isUserAuthenticated(): boolean {
    return this.apiService.isLoggedIn();
  }

  navigateToLMS(): void {
    this.router.navigate(['/lms-login']);
  }

  // Utility methods from managecourse
  trimText(text: string, wordLimit: number): string {
    if (!text) return '[NONE]';
    const words = text.split(' ');
    return words.length > wordLimit ? words.slice(0, wordLimit).join(' ') + '...' : text;
  }

  safeSlice(data: any, count: number = 4): any[] {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.slice(0, count);
    }
    // If it's a string, try to parse it or split it
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.slice(0, count) : [data];
      } catch {
        return [data];
      }
    }
    return [data];
  }

  onImageError(event: any, file: DriveFile): void {
    file.imageError = true;
  }

  // TrackBy function for better performance
  trackByFileId(index: number, file: DriveFile): string {
    return file.id;
  }

  /**
   * Get CSS class for file type styling
   */
  getFileTypeClass(fileType: string): string {
    const typeClassMap: { [key: string]: string } = {
      'folder': 'type-folder',
      'image': 'type-image',
      'video': 'type-video',
      'document': 'type-document',
      'audio': 'type-audio',
      'archive': 'type-archive',
      'other': 'type-other'
    };
    return typeClassMap[fileType] || 'type-other';
  }

  /**
   * Get the full breadcrumb path including navigation history and current level
   */
  getBreadcrumbPath(): NavigationLevel[] {
    const path: NavigationLevel[] = [];
    
    // Add all items from navigation history
    for (const level of this.navigationHistory) {
      path.push(level);
    }
    
    // Add current level if it's not root
    if (this.currentNavigationLevel.type !== 'root') {
      path.push(this.currentNavigationLevel);
    }
    
    return path;
  }

  /**
   * Navigate to root (My Drive)
   */
  navigateToRoot(): void {
    this.currentNavigationLevel = { type: 'root', name: 'My Drive' };
    this.navigationHistory = [];
    this.loadFiles();
  }

  /**
   * Navigate to a specific breadcrumb level
   */
  navigateToBreadcrumb(index: number): void {
    const breadcrumbPath = this.getBreadcrumbPath();
    
    if (index < 0 || index >= breadcrumbPath.length) {
      return;
    }
    
    // If clicking on the last item (current level), do nothing
    if (index === breadcrumbPath.length - 1) {
      return;
    }
    
    // Navigate to the selected level
    const targetLevel = breadcrumbPath[index];
    
    // Update navigation history (remove everything after the target level)
    this.navigationHistory = breadcrumbPath.slice(0, index);
    
    // Set the target level as current
    this.currentNavigationLevel = targetLevel;
    
    // Reload content for the target level
    this.reloadCurrentLevel();
  }

  /**
   * Enhanced file type display names
   */
  getFileTypeDisplayName(fileType: string): string {
    const typeDisplayMap: { [key: string]: string } = {
      'folder': 'Folder',
      'image': 'Image',
      'video': 'Video',
      'youtube': 'YouTube Video',
      'document': 'Document',
      'audio': 'Audio',
      'archive': 'Archive',
      'other': 'File'
    };
    return typeDisplayMap[fileType] || 'File';
  }

  /**
   * Reload current navigation level
   */
  reloadCurrentLevel(): void {
    // Implementation depends on your navigation logic
    this.loadFiles();
  }
}
