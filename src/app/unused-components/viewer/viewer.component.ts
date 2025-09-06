import { AfterContentInit, Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PopupQuizPageComponent } from 'src/app/components/student/popup-quiz-page/popup-quiz-page.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { APIService, VideoTableContent } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css']
})
export class ViewerComponent implements AfterContentInit, AfterViewInit {
  [x: string]: any;
  @Input() link: string = '';
  @Input() interactive: boolean = false;
  @Input() timestamp: number = 0;
  @Input() quizID: string = '';
  @Input() deadline: string = '';
  @Input() attachmentId: number | null = null;

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  countdown: number = 3;
  showCountdown: boolean = false;
  quizShown: boolean = false;

  // Table of contents
  tableOfContents: VideoTableContent[] = [];
  showTableOfContents: boolean = false;

  constructor(
    private modalService: NgbModal,
    private activeModal: NgbActiveModal,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private apiService: APIService
    // private videoTableService: VideoTableContentsService // Removed - moved to APIService
  ) {}

  ngAfterContentInit(): void {
    // No longer setting up the video here; moved to ngAfterViewInit
  }

  ngAfterViewInit(): void {
    console.log('🚀 ViewerComponent ngAfterViewInit started');
    console.log('📝 Original link:', this.link);
    console.log('🆔 Attachment ID:', this.attachmentId);
    console.log('🎯 Interactive mode:', this.interactive);
    
    // Normalize YouTube URL if it's a partial URL
    this.normalizeYouTubeUrl();
    
    console.log('📝 After normalization:', this.link);
    console.log('🎬 Is YouTube link?', this.isYouTubeLink());
    console.log('🎥 YouTube embed URL:', this.getYouTubeEmbedUrl());
    console.log('📹 Is video file?', this.isVideoFile());
    console.log('❌ Is unsupported file?', this.isUnsupportedFile());
    
    // Add delay to see if link changes after component initialization
    setTimeout(() => {
      console.log('⏰ After 1 second - Link:', this.link);
      console.log('⏰ After 1 second - Is YouTube?', this.isYouTubeLink());
    }, 1000);
    
    // Set up video event listeners for all video files
    if (this.isVideoFile()) {
      setTimeout(() => {
        this.setupVideoEventListeners();
      }, 100); // Small delay to ensure video element is fully initialized
    }
    
    // Set up interactive functionality if needed
    if (this.interactive && this.isVideoFile()) {
      this.setupInteractiveVideo();
    }
    
    // Load table of contents if attachment ID is provided
    if (this.attachmentId) {
      this.loadTableOfContents();
    }
    
    console.log('✅ ViewerComponent ngAfterViewInit completed');
  }

  /**
   * Normalize partial YouTube URLs to full URLs
   */
  normalizeYouTubeUrl(): void {
    console.log('🔧 Normalizing URL:', this.link);
    
    // Don't normalize if it's already a full URL
    if (this.link.includes('youtube.com') || this.link.includes('youtu.be')) {
      console.log('✅ URL is already normalized');
      return;
    }
    
    // Handle partial YouTube URL: watch?v=VIDEO_ID
    if (/^watch\?v=([A-Za-z0-9_-]{11})/.test(this.link)) {
      this.link = `https://www.youtube.com/${this.link}`;
      console.log('✅ Normalized partial URL to:', this.link);
      return;
    }
    
    // Handle just video ID
    if (/^[A-Za-z0-9_-]{11}$/.test(this.link)) {
      this.link = `https://www.youtube.com/watch?v=${this.link}`;
      console.log('✅ Normalized video ID to:', this.link);
      return;
    }
    
    console.log('ℹ️ No normalization needed');
  }

  /**
   * Set up basic video event listeners for timeline functionality
   */
  setupVideoEventListeners(): void {
    if (!this.videoPlayerRef || !this.videoPlayerRef.nativeElement) {
      console.error('Video player element is not available');
      return;
    }
    
    const videoPlayer = this.videoPlayerRef.nativeElement;
    
    // Add loadedmetadata listener if not already added
    videoPlayer.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded, duration:', videoPlayer.duration);
      this.onVideoLoaded({ target: videoPlayer });
    });
    
    // Add time update listener for current time tracking
    videoPlayer.addEventListener('timeupdate', () => {
      // Time updates handled by onTimeUpdate method
    });
    
    // Add seeking support listeners
    videoPlayer.addEventListener('seeking', () => {
      console.log('Video seeking...');
    });
    
    videoPlayer.addEventListener('seeked', () => {
      console.log('Video seek completed to:', videoPlayer.currentTime);
    });
  }

  /**
   * Load table of contents for the video
   */
  loadTableOfContents(): void {
    if (!this.attachmentId) return;

    this.apiService.getVideoTableContents(this.attachmentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.tableOfContents = response.output;
          console.log('Table of contents loaded:', this.tableOfContents);
        }
      },
      error: (error) => {
        console.error('Error loading table of contents:', error);
      }
    });
  }

  setupInteractiveVideo(): void {
    if (!this.videoPlayerRef || !this.videoPlayerRef.nativeElement) {
      console.error('Video player element is not available');
      return;
    }
    const videoPlayer = this.videoPlayerRef.nativeElement;
    
    // Add time update listener for interactive functionality
    videoPlayer.addEventListener('timeupdate', () => {
      this.checkTimestamp(videoPlayer);
    });
    
    // Add additional event listeners for better browser compatibility
    videoPlayer.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded');
      this.onVideoLoaded({ target: videoPlayer });
    });
    
    videoPlayer.addEventListener('canplay', () => {
      console.log('Video can start playing');
    });
    
    // Ensure video is seekable
    videoPlayer.addEventListener('loadeddata', () => {
      console.log('Video data loaded, seekable:', videoPlayer.seekable.length > 0);
    });
  }

  checkTimestamp(videoPlayer: HTMLVideoElement): void {
    if (this.interactive && !this.quizShown) {
      if (videoPlayer.currentTime >= this.timestamp) {
        videoPlayer.pause();
        this.checkAndShowQuiz(videoPlayer);
        this.quizShown = true;
      }
    }
  }

  async checkAndShowQuiz(videoPlayer: HTMLVideoElement): Promise<void> {
    const currentDate = new Date();
    const quizDeadline = new Date(this.deadline);

    if (currentDate > quizDeadline) {
      this.apiService.failedSnackbar('You cannot take the exam, it is already due date.');
      return;
    }

    try {
      const studentID = this.apiService.getUserData()?.id;
      if (!studentID) {
        this.apiService.failedSnackbar('Unable to fetch student ID.');
        return;
      }

      const quizScores = await this.apiService.getMyQuizScores(this.quizID);

      if (quizScores && quizScores.output.length > 0) {
        const scoreData = quizScores.output[0];
        if (scoreData.takenpoints !== null) {
          this.apiService.successSnackbar(
            `You have already completed this quiz. Score: ${scoreData.takenpoints}/${scoreData.totalpoints}`
          );
          return;
        }
      }

      this.startCountdown(videoPlayer);
    } catch (error) {
      console.error('Error fetching quiz scores:', error);
      this.apiService.failedSnackbar('Failed to fetch quiz scores. Please try again.');
    }
  }

  startCountdown(videoPlayer: HTMLVideoElement): void {
    this.showCountdown = true;
    const interval = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.showCountdown = false;
        this.showQuizModal(this.quizID, videoPlayer);
        this.countdown = 3;
      }
    }, 1000);
  }

  /**
   * Resumes the video at the quiz timestamp without skipping ahead.
   * Ensures the video resumes exactly from the point it was paused.
   */
  resumeVideoAtTime(videoPlayer: HTMLVideoElement): void {
  if (!videoPlayer) {
    console.warn('Video player is not ready');
    return;
  }

  // Log the timestamp for debugging
  console.log(`Resuming video at timestamp: ${this.timestamp}s`);

  // Pause the video to ensure we are in control of the current time
  videoPlayer.pause();

  // Set the currentTime to the timestamp value
  videoPlayer.currentTime = this.timestamp;

  // Add a slight delay to allow the browser to register the new time
  setTimeout(() => {
    // Play the video from the specified timestamp
    videoPlayer.play().then(() => {
      console.log(`Video started at timestamp: ${this.timestamp}s`);
    }).catch((err) => {
      console.warn('Autoplay blocked or error during playback:', err);
    });
  }, 50);  // Add a small delay before playing (50ms)
}


  showQuizModal(quizID: string, videoPlayer: HTMLVideoElement): void {
    console.log('Opening quiz modal with quizID:', quizID);
    const modalRef = this.modalService.open(PopupQuizPageComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      windowClass: 'modal-fullscreen-sm-down'
    });

    modalRef.componentInstance.quizID = quizID;
    this.apiService.quizID = quizID;

    modalRef.result.then(
      () => this.resumeVideoAtTime(videoPlayer),   // closed
      () => this.resumeVideoAtTime(videoPlayer)    // dismissed
    ).catch((error) => {
      console.error('Modal result promise rejected:', error);
    });
  }

  close() {
    this.activeModal.dismiss();
  }

  downloadFile() {
    this.http.get(this.link, { responseType: 'blob' }).subscribe(blob => {
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = this.getFileName();
      a.click();
      URL.revokeObjectURL(objectUrl);
    });
  }

  getFileName(): string {
    console.log('📄 Getting filename for:', this.link);
    
    // Special handling for YouTube videos
    if (this.isYouTubeLink()) {
      const videoId = this.extractYouTubeVideoId();
      const title = videoId ? `YouTube Video (${videoId})` : 'YouTube Video';
      console.log('🎬 YouTube title:', title);
      return title;
    }
    
    const filename = this.link.split('/').pop() || 'File';
    console.log('📁 Regular filename:', filename);
    return filename;
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeVideoId(): string {
    let videoId = '';
    
    if (/^watch\?v=([A-Za-z0-9_-]{11})/.test(this.link)) {
      videoId = this.link.match(/^watch\?v=([A-Za-z0-9_-]{11})/)?.[1] || '';
    } else if (/^[A-Za-z0-9_-]{11}$/.test(this.link)) {
      videoId = this.link;
    } else if (/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/.test(this.link)) {
      videoId = this.link.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/)?.[1] || '';
    } else if (/youtu\.be\/([A-Za-z0-9_-]{11})/.test(this.link)) {
      videoId = this.link.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1] || '';
    }
    
    console.log('🆔 Extracted video ID:', videoId);
    return videoId;
  }

  isVideoFile(): boolean {
    return /\.(mp4|webm|ogg|mp3)$/i.test(this.link);
  }

  isPdfFile(): boolean {
    return /\.pdf$/i.test(this.link);
  }

  isImageFile(): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(this.link);
  }

  isPowerPointFile(): boolean {
    return /\.(ppt|pptx)$/i.test(this.link);
  }

  isDocFile(): boolean {
    return /\.(doc|docx)$/i.test(this.link);
  }

  isExcelFile(): boolean {
    return /\.(xls|xlsx|xlsm)$/i.test(this.link);
  }

  isTextFile(): boolean {
    return /\.(txt)$/i.test(this.link);
  }

  isHtmlFile(): boolean {
    return /\.(html|htm)$/i.test(this.link);
  }

  isOtherSupportedFile(): boolean {
    return /\.(html|txt)$/i.test(this.link);
  }

  isYouTubeLink(): boolean {
    console.log('🔍 Checking YouTube link:', this.link);
    
    // Handle partial YouTube URLs (missing domain) 
    if (/^watch\?v=([A-Za-z0-9_-]{11})/.test(this.link)) {
      console.log('✅ Detected partial YouTube URL (watch?v=)');
      return true;
    }
    
    // Check for just video ID (11 characters)
    if (/^[A-Za-z0-9_-]{11}$/.test(this.link)) {
      console.log('✅ Detected YouTube video ID only');
      return true;
    }
    
    // Check for full YouTube URLs
    if (/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/.test(this.link) || 
        /youtu\.be\/([A-Za-z0-9_-]{11})/.test(this.link)) {
      console.log('✅ Detected full YouTube URL');
      return true;
    }
    
    console.log('❌ Not a YouTube link');
    return false;
  }

  getYouTubeEmbedUrl(): string {
    console.log('🎥 Getting YouTube embed URL for:', this.link);
    
    let videoId = '';
    
    // Extract video ID from different formats
    if (/^watch\?v=([A-Za-z0-9_-]{11})/.test(this.link)) {
      // Partial URL: watch?v=VIDEO_ID
      videoId = this.link.match(/^watch\?v=([A-Za-z0-9_-]{11})/)?.[1] || '';
      console.log('📱 Extracted from partial URL:', videoId);
    } else if (/^[A-Za-z0-9_-]{11}$/.test(this.link)) {
      // Just video ID
      videoId = this.link;
      console.log('🆔 Using direct video ID:', videoId);
    } else if (/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/.test(this.link)) {
      // Full YouTube URL
      videoId = this.link.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/)?.[1] || '';
      console.log('🔗 Extracted from full URL:', videoId);
    } else if (/youtu\.be\/([A-Za-z0-9_-]{11})/.test(this.link)) {
      // Short YouTube URL
      videoId = this.link.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1] || '';
      console.log('📎 Extracted from short URL:', videoId);
    }
    
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      console.log('✅ Generated embed URL:', embedUrl);
      return embedUrl;
    }
    
    console.log('❌ Could not generate embed URL');
    return '';
  }

  playYouTubeVideo(): void {
    const embedUrl = this.getYouTubeEmbedUrl();
    if (embedUrl) {
      // The video will be displayed in the embedded iframe in the template
      console.log('YouTube video ready for display:', embedUrl);
    } else {
      this.apiService.failedSnackbar('Invalid YouTube link.');
    }
  }

  isUnsupportedFile(): boolean {
    return !this.isVideoFile() && 
           !this.isPdfFile() && 
           !this.isImageFile() && 
           !this.isDocFile() &&
           !this.isPowerPointFile() &&
           !this.isExcelFile() &&
           !this.isTextFile() &&
           !this.isHtmlFile() &&
           !this.isYouTubeLink();
  }

  handleImageError(event: any) {
    event.target.style.display = 'none';
  }

  /**
   * Toggle table of contents visibility
   */
  toggleTableOfContents(): void {
    this.showTableOfContents = !this.showTableOfContents;
  }

  /**
   * Handle marker click with proper event handling
   */
  onMarkerClick(event: Event, timestamp: number): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Jumping to timestamp:', timestamp);
    this.jumpToTimestamp(timestamp);
  }

  /**
   * Jump to specific timestamp in video
   */
  jumpToTimestamp(timestamp: number): void {
    console.log('Jumping to timestamp:', timestamp);
    
    if (this.videoPlayerRef && this.videoPlayerRef.nativeElement) {
      const videoPlayer = this.videoPlayerRef.nativeElement;
      
      // Ensure video is loaded and ready
      if (videoPlayer.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        this.seekToTimestamp(videoPlayer, timestamp);
      } else {
        // Wait for video to be ready
        const onLoadedData = () => {
          this.seekToTimestamp(videoPlayer, timestamp);
          videoPlayer.removeEventListener('loadeddata', onLoadedData);
        };
        videoPlayer.addEventListener('loadeddata', onLoadedData);
      }
    }
  }

  /**
   * Seek to specific timestamp with proper browser compatibility
   */
  private seekToTimestamp(videoPlayer: HTMLVideoElement, timestamp: number): void {
    try {
      console.log('Seeking to timestamp:', timestamp, 'Video duration:', videoPlayer.duration);
      
      // Validate timestamp
      if (timestamp < 0 || timestamp > videoPlayer.duration) {
        console.warn('Invalid timestamp:', timestamp);
        return;
      }
      
      // For Chrome/Edge: ensure video is in a playable state
      if (videoPlayer.readyState < 2) {
        console.log('Video not ready for seeking, waiting...');
        const onCanPlay = () => {
          this.performSeek(videoPlayer, timestamp);
          videoPlayer.removeEventListener('canplay', onCanPlay);
        };
        videoPlayer.addEventListener('canplay', onCanPlay);
        return;
      }
      
      this.performSeek(videoPlayer, timestamp);
      
    } catch (error) {
      console.error('Error seeking to timestamp:', error);
    }
  }
  
  /**
   * Perform the actual seek operation
   */
  private performSeek(videoPlayer: HTMLVideoElement, timestamp: number): void {
    const wasPlaying = !videoPlayer.paused;
    
    // Pause the video for clean seeking
    videoPlayer.pause();
    
    // Set the time
    videoPlayer.currentTime = timestamp;
    
    // Chrome/Edge specific: Force a frame update
    if (videoPlayer.currentTime !== timestamp) {
      // Retry setting the time
      setTimeout(() => {
        videoPlayer.currentTime = timestamp;
        if (wasPlaying) {
          videoPlayer.play().catch(err => {
            console.warn('Autoplay after seek failed:', err);
          });
        }
      }, 50);
    } else {
      // Resume playback if it was playing
      if (wasPlaying) {
        setTimeout(() => {
          videoPlayer.play().catch(err => {
            console.warn('Autoplay after seek failed:', err);
          });
        }, 100);
      }
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(seconds: number): string {
    return this.apiService.formatTimestamp(seconds);
  }

  /**
   * Video loaded event handler
   */
  onVideoLoaded(event: any): void {
    console.log('Video loaded:', event);
  }

  /**
   * Video time update handler
   */
  onTimeUpdate(event: any): void {
    const videoPlayer = this.videoPlayerRef.nativeElement;
    
    // Call the existing checkTimestamp method for interactive functionality
    this.checkTimestamp(videoPlayer);
  }

  /**
   * Get current video time for highlighting active chapter
   */
  getCurrentChapter(): VideoTableContent | null {
    if (!this.videoPlayerRef || !this.videoPlayerRef.nativeElement || this.tableOfContents.length === 0) {
      return null;
    }

    const currentTime = this.videoPlayerRef.nativeElement.currentTime;
    return this.tableOfContents.find(content => 
      currentTime >= content.start_timestamp && currentTime < content.end_timestamp
    ) || null;
  }

  /**
   * Check if a chapter is currently active
   */
  isChapterActive(chapter: VideoTableContent): boolean {
    const currentChapter = this.getCurrentChapter();
    return currentChapter?.id === chapter.id;
  }
}