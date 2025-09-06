import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Location } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AnimationOptions } from 'ngx-lottie';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

interface Lesson {
  id: string;
  title: string;
  firstname: string;
  lastname: string;
  time: string;
  details: string;
  progress: number;
  topics?: Topic[];
  hasQuiz?: boolean;
  done?: boolean;
  deadline?: Date;
}

interface Topic {
  id: string;
  topicid: string;
  title: string;
  details: string;
  attachments: { 
    id: number; 
    file: string; 
    type: string; 
    timestamp?: number; 
    quiz_id?: string; 
    isRead?: boolean;
    deadline?: Date;
    safeYoutubeUrl?: any;
    youtubeTitle?: string | null;
  }[];
  hasQuiz?: boolean;
  hasAttachmentQuiz?: boolean;
  done?: boolean;
  show?: boolean;
  isFinished?: string | boolean;
  deadline?: Date;
}

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.css']
})
export class LessonsComponent implements OnInit {
  lessons: Lesson[] = [];
  hideMarkAsDone: boolean = false;
  courseTitle: string = '';  // Add this
  coursePretest: string | undefined;  // Add this

  lottieOptions: AnimationOptions = {
    path: 'https://lottie.host/e4f3816a-6637-4932-bf1a-c9b995936748/4ZuGelrs5m.json',
    autoplay: true,
    loop: true
  };

  constructor(
    private API: APIService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}

  public isTopicFinished(topic: Topic): boolean {
    return topic.isFinished === 't' || topic.isFinished === true;
  }

  private updateTopicVisibility(topics: Topic[], lessonIndex: number) {
    if (!topics || topics.length === 0) return;
  
    // Set first topic of first lesson always visible
    if (lessonIndex === 0) {
      topics[0].show = true;
    } else {
      // For subsequent lessons, make first topic visible if previous lesson is completed
      topics[0].show = this.isPreviousLessonCompleted(lessonIndex);
    }
  
    // For subsequent topics, check if all previous topics are completed
    for (let i = 1; i < topics.length; i++) {
      const allPreviousTopicsCompleted = topics
        .slice(0, i)
        .every(prevTopic => this.isTopicCompleted(prevTopic));
        
      topics[i].show = allPreviousTopicsCompleted;
    }
  }
  
  private isLessonCompleted(lesson: Lesson): boolean {
    return lesson.topics?.every(topic => this.isTopicCompleted(topic)) ?? false;
  }
  
  private isPreviousLessonCompleted(currentLessonIndex: number): boolean {
    if (currentLessonIndex === 0) return true;
    const previousLesson = this.lessons[currentLessonIndex - 1];
    return this.isLessonCompleted(previousLesson);
  }
  
  private isTopicCompleted(topic: Topic): boolean {
    if (this.isTopicFinished(topic)) return true;
    if (!topic.attachments || topic.attachments.length === 0) {
      return !!topic.isFinished;
    }
    return topic.attachments.every(att => att.isRead);
  }

  removeDuplicates(attachments: any[]): any[] {
    return attachments.filter((attachment, index, self) =>
      index === self.findIndex((att) => att.id === attachment.id)
    );
  }
  
 

  isTeacher(): boolean {
    const userType = this.API.getUserType();
    return userType === '1';
  }

  ngOnInit() {

    
    const isTeacher = this.isTeacher();
    console.log('Is Teacher on Init:', isTeacher);

    this.route.queryParams.subscribe(params => {
      this.hideMarkAsDone = params['hideMarkAsDone'] === 'true';
      this.courseTitle = params['courseTitle'] || '';  // Get course title
      this.coursePretest = params['coursePretest'];    // Get pretest if available
    });
  
    this.API.showLoader();
    const studentId = this.API.getUserData().id;
  
    forkJoin({
      lessons: this.API.getLessons(),
      quizzes: this.API.teacherGetQuizzes()
    }).subscribe({
      next: ({ lessons, quizzes }) => {
        this.lessons = lessons.output;
        const lessonQuizMap = new Map();
        const topicQuizMap = new Map();
  
        quizzes.output.forEach((quiz: { topicid: any; lessonid: any }) => {
          if (quiz.topicid) {
            topicQuizMap.set(quiz.topicid, quiz);
          } else if (quiz.lessonid) {
            lessonQuizMap.set(quiz.lessonid, quiz);
          }
        });
  
        this.lessons.forEach((lesson: Lesson, lessonIndex: number) => {
          lesson.hasQuiz = lessonQuizMap.has(lesson.id);
  
          this.API.getTopics(lesson.id).subscribe({
            next: (topicsData: any) => {
              lesson.topics = (topicsData.output || []).map((topic: Topic) => {
                topic.hasQuiz = topicQuizMap.has(topic.id);
                return topic;
              });
  
              if (lesson.topics && lesson.topics.length > 0) {
                lesson.topics.forEach((topic: Topic) => {
                  this.API.getReadTopicStatus(topic.topicid, studentId).subscribe({
                    next: (topicReadStatus) => {
                      if (topicReadStatus.success && topicReadStatus.output.length > 0) {
                        topic.isFinished = topicReadStatus.output[0].isfinished;
                        topic.done = this.isTopicFinished(topic);
                        this.updateTopicVisibility(lesson.topics!, lessonIndex);
                      }
                      
                      this.API.getAttachmentsWithReadStatus(topic.topicid, studentId).subscribe({
                        next: (attachments) => {
                          if (attachments.success && attachments.output.length > 0) {
                            (async () => {
                              topic.attachments = await Promise.all(
                                this.removeDuplicates(attachments.output).map(async (attachment: any) => {
                                  let youtubeTitle = null;
                                  if (this.isYoutube({file: attachment.attachment})) {
                                    const videoId = this.getYoutubeVideoId(attachment.attachment);
                                    youtubeTitle = videoId ? await this.getYoutubeTitle(videoId) : null;
                                  }
                                  return {
                                    id: attachment.id,
                                    deadline: attachment.deadline,
                                    file: attachment.attachment,
                                    type: attachment.type,
                                    timestamp: attachment.timestamp || 0,
                                    quiz_id: attachment.quiz_id,
                                    isRead: !!attachment.isread,
                                    safeYoutubeUrl: this.isYoutube({file: attachment.attachment}) ? this.getSafeYoutubeUrl(attachment.attachment) : null,
                                    youtubeTitle
                                  };
                                })
                              );
                              topic.hasAttachmentQuiz = topic.attachments.some(att => att.type === 'interactive');
                              topic.done = this.isTopicFinished(topic) || topic.attachments.every(att => att.isRead);
                              this.updateTopicVisibility(lesson.topics!, lessonIndex);

                              if (
                                lessonIndex < this.lessons.length - 1 &&
                                this.isLessonCompleted(lesson) &&
                                this.lessons[lessonIndex + 1].topics
                              ) {
                                this.updateTopicVisibility(this.lessons[lessonIndex + 1].topics!, lessonIndex + 1);
                              }
                            })();
                            
                            topic.hasAttachmentQuiz = topic.attachments.some(att => att.type === 'interactive');
                            topic.done = this.isTopicFinished(topic) || topic.attachments.every(att => att.isRead);
                            this.updateTopicVisibility(lesson.topics!, lessonIndex);

                            if (lessonIndex < this.lessons.length - 1 && 
                                this.isLessonCompleted(lesson) &&
                                this.lessons[lessonIndex + 1].topics) {
                              this.updateTopicVisibility(this.lessons[lessonIndex + 1].topics!, lessonIndex + 1);
                            }
                          }
                        },
                        error: (error) => {
                          console.error(`Error fetching attachments for topic ${topic.topicid}:`, error);
                          this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                        }
                      });
                    },
                    error: (error) => {
                      console.error(`Error fetching read status for topic ${topic.topicid}:`, error);
                      this.API.failedSnackbar(`Failed to fetch read status for topic ${topic.topicid}.`);
                    }
                  });
                });
              }
            }
          });
        });
  
        this.API.hideLoader();
      },
      error: (error) => {
        console.error('Error fetching lessons and quizzes:', error);
        this.API.failedSnackbar('Failed to load lessons and quizzes. Please try again.');
        this.API.hideLoader();
      }
    });
  }

  navigateToQuizManagement(): void {
    this.router.navigate(['/teacher/quiz-management']);
  }

  navigateToTopicDiscussion(topicId: string): void {
    // Determine context based on current route
    const currentUrl = this.router.url;
    let basePath = '/student';
    
    if (currentUrl.includes('/teacher/')) {
      basePath = '/teacher';
    } else if (currentUrl.includes('/admin/')) {
      basePath = '/admin';
    }
    
    this.router.navigate([basePath, 'topic-threads', topicId]);
  }

  navigateBack(): void {
    this.location.back();
  }

  // markAsDone(lesson: Lesson) {
  //   lesson.progress = 100;
  //   const mark$ = this.API.lessonProgress(lesson.id, 100).subscribe(() => {
  //     mark$.unsubscribe();
  //   });
  // }

  markAsDone(lesson: Lesson) {
    if (this.isTeacher()) return; // Skip for teachers
    lesson.progress = 100;
    const mark$ = this.API.lessonProgress(lesson.id, 100).subscribe(() => {
      mark$.unsubscribe();
    });
  }

 

  handleTopicClick(topic: Topic) {
    if (this.isTeacher()) return; // Skip for teachers
    if (!topic.show) {
      console.log(`Topic ${topic.topicid} is locked.`);
      return;
    }

    if (topic.done || this.isTopicFinished(topic)) {
      console.log(`Topic ${topic.topicid} is already completed.`);
      return;
    }
  
    console.log(`Topic clicked with ID: ${topic.topicid}`);
    this.API.markTopicAsRead(topic.topicid).subscribe({
      next: (response) => {
        if (response.success) {
          topic.isFinished = 't';
          topic.done = true;
          
          const currentLessonIndex = this.lessons.findIndex(les => les.topics?.includes(topic));
          const lesson = this.lessons[currentLessonIndex];
          
          if (lesson && lesson.topics) {
            this.updateTopicVisibility(lesson.topics, currentLessonIndex);
            this.checkLessonCompletion();
            
            if (currentLessonIndex < this.lessons.length - 1 && 
                this.isLessonCompleted(lesson) &&
                this.lessons[currentLessonIndex + 1].topics) {
              this.updateTopicVisibility(this.lessons[currentLessonIndex + 1].topics!, currentLessonIndex + 1);
            }
          }
        }
      },
      error: (error) => {
        console.error(`Error marking topic ${topic.topicid} as read:`, error);
        this.API.failedSnackbar(`Failed to mark topic as read.`);
      }
    });
  }

  handleFileClick(file: any, topic: Topic) {
    console.log(`Attachment clicked with ID: ${file.id}`);

    if (file.type === 'interactive') {
      this.API.openFileInteractive(
        file.file,
        file.type,
        file.timestamp,
        file.quiz_id,
        new Date(file.deadline),
        file.id // Pass the attachment ID
      );
    } else {
      this.API.openFile(file.file, file.id); // Pass the attachment ID
    }

    if (!this.isTeacher()) {

    this.API.markAttachmentAsRead(file.id).subscribe({
      next: (response) => {
        if (response.success) {
          file.isRead = true;
          topic.done = topic.attachments.every((att: any) => att.isRead);

          if (topic.done) {
            this.API.markTopicAsRead(topic.topicid).subscribe({
              next: () => {
                console.log(`Topic ${topic.topicid} marked as read`);
                topic.isFinished = 't';
                
                const currentLessonIndex = this.lessons.findIndex(les => les.topics?.includes(topic));
                const lesson = this.lessons[currentLessonIndex];
                
                if (lesson && lesson.topics) {
                  this.updateTopicVisibility(lesson.topics, currentLessonIndex);
                  this.checkLessonCompletion();

                  if (currentLessonIndex < this.lessons.length - 1 && 
                      this.isLessonCompleted(lesson) &&
                      this.lessons[currentLessonIndex + 1].topics) {
                    this.updateTopicVisibility(this.lessons[currentLessonIndex + 1].topics!, currentLessonIndex + 1);
                  }
                }
              }
            });
          }
        }
      }
    });
    }
  }

  checkLessonCompletion() {
    this.lessons.forEach((lesson, index) => {
      if (lesson.topics) {
        const allTopicsCompleted = this.isLessonTopicsCompleted(lesson);
        
        // If all topics are completed and lesson isn't marked as done yet, mark it as done
        if (allTopicsCompleted && !this.isDone(lesson)) {
          this.markAsDone(lesson);
        }
        
        lesson.done = allTopicsCompleted;
        
        // Check if we need to update next lesson's visibility
        if (lesson.done && index < this.lessons.length - 1 && this.lessons[index + 1].topics) {
          this.updateTopicVisibility(this.lessons[index + 1].topics!, index + 1);
        }
      }
    });
  }

  isDone(lesson: Lesson): boolean {
    return Number(lesson.progress) > 0;
  }

  getURL(file: string): string {
    return this.API.getURL(file);
  }

  parseTime(time: string): string {
    const t = time.split(/[- :]/) as unknown as number[];
    return new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5])).toLocaleString();
  }

  getOriginalFilename(file: any): string {
    const fullName = this.getFilenameFromPath(file.file);
    return fullName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '');
  }

  getFilenameFromPath(path: string): string {
    return path.split('/').pop() || path;
  }

  getFileIcon(file: any): string {
    if (this.isImage(file)) return 'fas fa-image text-blue-500';
    if (this.isVideo(file)) return 'fas fa-video text-purple-500';
    if (this.isPDF(file)) return 'fas fa-file-pdf text-red-500';
    if (this.isPowerPointFile(file)) return 'fas fa-file-powerpoint text-orange-500'; 
    if (this.isDoc(file)) return 'fas fa-file-word text-blue-600'; 
    if (this.isExcelFile(file)) return 'fas fa-file-excel text-green-600';
    if (this.isTextFile(file)) return 'fas fa-file-alt text-blue-600';
    if (this.isYoutube(file)) return 'fa-brands fa-youtube text-red-500';

    return 'fas fa-file text-gray-500';
  }

  getFileType(file: any): string {
    if (this.isImage(file)) return 'Image';
    if (this.isVideo(file)) return 'Video';
    if (this.isPDF(file)) return 'PDF';
    if (this.isPowerPointFile(file)) return 'PowerPoint';
    if (this.isDoc(file)) return 'Word Document'; 
    if (this.isExcelFile(file)) return 'Excel Spreadsheet';
    if (this.isTextFile(file)) return 'Text Document';
    if (this.isYoutube(file)) return 'Youtube';

    return 'File';
  }

  isExcelFile(file: any): boolean {
    return file.file.match(/\.(xls|xlsx|xlsm)$/i) != null;
}

isTextFile(file: any): boolean {
    return file.file.match(/\.(txt)$/i) != null;
}

  isPreviewable(file: any): boolean {
    return this.isImage(file) || this.isVideo(file) || this.isPDF(file);
  }

  isImage(file: any): boolean {
    return file.file.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
  }

  isVideo(file: any): boolean {
    return file.file.match(/\.(mp4|webm|ogg)$/i) != null;
  }

  isPDF(file: any): boolean {
    return file.file.match(/\.(pdf)$/i) != null;
  }

  isPowerPointFile(file: any): boolean {
    return file.file.match(/\.(pptx|ppt)$/i) != null;
  }

  isDoc(file: any): boolean {
    return file.file.match(/\.(doc|docx)$/i) != null;
  }

  isYoutube(file: any): boolean {
    if (file && file.file && typeof file.file === 'string') {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      return youtubeRegex.test(file.file);
    }
    return false;
  }

  truncateFilename(filename: string, maxLength: number): string {
    if (filename.length <= maxLength) return filename;
    const parts = filename.split('.');
    const extension = parts.length > 1 ? parts.pop() : '';
    const name = parts.join('.');
    if (name.length <= maxLength - 3) {
      return `${name}${extension ? '.' + extension : ''}`;
    }
    return name.substring(0, maxLength - 3) + '...' + (extension ? '.' + extension : '');
  }

  handleImageError(event: any) {
    event.target.style.display = 'none';
  }


  isLessonTopicsCompleted(lesson: Lesson): boolean {
    return lesson.topics?.every(topic => this.isTopicCompleted(topic)) ?? false;
  }

 
  getCourseTitle(): string {
    return this.courseTitle;
  }

  getYoutubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  getYoutubeTitle(videoId: string): Promise<string> {
    const apiKey = 'AIzaSyCPUSyfa51dd59QmgbslcK4wLbvf7YrAOQ'; // Replace with your API key
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
    return this.http.get<any>(url).toPromise().then(res => {
      return res.items && res.items.length > 0 ? res.items[0].snippet.title : 'YouTube Video';
    }).catch(() => 'YouTube Video');
  }

  // Method to sanitize YouTube URL
  getSafeYoutubeUrl(fileUrl: string): SafeUrl | null {
    const videoId = this.getYoutubeVideoId(fileUrl);
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}?controls=1`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }
    return null;
  }

}