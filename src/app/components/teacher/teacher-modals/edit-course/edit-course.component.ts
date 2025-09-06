import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { APIService, VideoTableContent } from 'src/app/services/API/api.service';
import { VideoTableContentsModalComponent } from '../video-table-contents-modal/video-table-contents-modal.component';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

interface PendingTableOfContent {
  content_name: string;
  description?: string;
  start_timestamp: number;
  end_timestamp: number;
  start_minutes: number;
  start_seconds: number;
  end_minutes: number;
  end_seconds: number;
  order_index: number;
}

interface InteractiveVideoAttachment {
  file: File;
  metadata: {
    type: string;
    quiz_id: string;
    timestamp: string;
  };
}

interface NonInteractiveAttachment {
  file: File;
  metadata: {
    type: 'normal';
    quiz_id: '';
    timestamp: '';
  };
}
interface Lesson {
  id?: string;
  lessonName: string;
  coverImage: File | string | null;
  fileupload: File | string | null;
  description: string;
  complexity: number;
  topics?: any[];
}

type FileType = 'mp4' | 'pdf' | 'any';

@Component({
  selector: 'app-edit-course',
  templateUrl: './edit-course.component.html',
  styleUrls: ['./edit-course.component.css']
})
export class EditCourseComponent implements OnInit {
  @Input() myCustomClass: string = '';
  @Input() languages: Map<string, any> = new Map<string, any>();
  @Input() info: any = null;
  lessons: Lesson[] = [];
  selectedFileName: string | undefined;
  audioDescription: string = '';
  showEditCourseModal = true; // Keeps track of the Edit Course Modal visibility
  isSaving: boolean = false;

  // Form
  language: string = '';
  mode: any = {};
  courseTitle: string = '';
  courseDesc: string = '';
  courseAudience: string = '';
  courseObjective: string = '';
  courseTechRequirements: string = '';
  courseImagePreview: string | ArrayBuffer | null = null;
  courseImageURL: string = '';
  showTopicModal: boolean = false;
  editingTopic: boolean = false;
  videoUrl: string = '';
 
  newTopic: {
    title: string;
    details: string;
    attachments: (File | string | InteractiveVideoAttachment)[];
    topicId?: string;
  } = {
    title: '',
    details: '',
    attachments: [],
    topicId: undefined,
  };
  currentLessonId: string | null = null;

  // Dropdowns and Modal States
  audienceOptions: string[] = ['Student', 'Teacher', 'Principal', 'Parent'];
  requirementsOptions: string[] = ['Internet', 'Phone', 'Tablet', 'Laptop'];
  selectedAudience: string[] = [];
  selectedRequirements: string[] = [];
  showAudienceDropdown = false;
  showRequirementsDropdown = false;

  showVideoModal: boolean = false;
  currentLesson: Lesson | null = null;
  currentFileType: FileType | null = null;
  interactiveVideoFile: File | null = null;
  interactiveVideoFileName: string = '';
  isInteractiveVideoMode: boolean = false;
  selectedQuiz: any = '';  // Initialize as an object instead of a string
  videoTimestamp: string = '';
  showVideoOptionsModal: boolean = false;
  showInteractiveVideoModal: boolean = false;
  
  // Tab management for interactive video modal
  activeInteractiveTab: string = 'video';
  
  // Stepper state
  videoSavedToDatabase: boolean = false;
  currentStep: number = 1; // 1 = Upload Video & Quiz, 2 = Table of Contents

  // Video table of contents
  currentVideoTableContents: VideoTableContent[] = [];
  currentAttachmentId: number | null = null;
  
  // Pending table of contents (before video is saved)
  pendingTableOfContents: PendingTableOfContent[] = [];
  
  // Flag to track if topic has been updated via new workflow
  topicUpdatedViaNewWorkflow: boolean = false;

  constructor(
    public activeModal: NgbActiveModal, 
    private API: APIService,
    private modalService: NgbModal
  ) {}


  ngOnInit(): void {

    this.getQuizzes();

    if (!this.info) {
      console.error('Course information is not available.');
      return;
    }

    console.log('Course Info:', this.info);

    this.courseTitle = this.info.title || '';
    this.courseDesc = this.info.description || '';
    this.courseObjective = this.info.objectives || '';

    this.selectedAudience = this.parseArrayString(this.info.targetAudience);
    this.selectedRequirements = this.parseArrayString(this.info.technicalRequirements);

    if (this.info.image) {
      this.courseImageURL = this.info.image;
      this.courseImagePreview = this.getURL(this.courseImageURL);
    }

    this.API.teacherCourseLessons(this.info.id).subscribe(
      (data) => {
        this.lessons = data.output.map((lesson: any) => ({
          id: lesson.id,
          lessonName: lesson.title,
          coverImage: lesson.background,
          fileupload: lesson.attachments,
          description: lesson.details,
          complexity: this.mapComplexity(Number(lesson.difficulty)),
          topics: [], // Initialize topics as an empty array
        }));

        // Fetch topics for each lesson
        this.lessons.forEach((lesson) => {
          if (lesson.id) {
            this.API.getTopics(lesson.id).subscribe(
              (topicsData) => {
                console.log(`Topics for Lesson ${lesson.id}:`, topicsData.output);
                // Sort topics by ID when they are fetched
                lesson.topics = topicsData.output.sort((a: any, b: any) => a.id - b.id);

                // Fetch attachments for each topic
                if (lesson.topics) {  // Check if topics are defined
                  lesson.topics.forEach((topic: any) => {
                    this.API.getTopicAttachments(topic.topicid).subscribe(
                      (attachmentsData) => {
                        if (attachmentsData.success) {
                          topic.attachments = attachmentsData.output.map((attachment: any) => attachment.attachment);
                          console.log(`Attachments for Topic ${topic.topicid}:`, topic.attachments); // Display attachments
                        } else {
                          console.error(`Error fetching attachments for topic ${topic.topicid}:`, attachmentsData.error || 'Unknown error');
                          this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                        }
                      },
                      (error) => {
                        console.error(`Error fetching attachments for topic ${topic.topicid}:`, error);
                        this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                      }
                    );

                  });
                }
              },
              (error) => {
                console.error(`Error fetching topics for lesson ${lesson.id}:`, error);
              }
            );
          }
        });
      },
      (error) => {
        console.error('Error fetching lessons:', error);
      }
    );
  }





  closeTopicModal(): void {
    // Reset the new workflow flag when closing modal
    this.topicUpdatedViaNewWorkflow = false;
    console.log('Reset topicUpdatedViaNewWorkflow flag on modal close');
    
    this.showTopicModal = false;
    this.showEditCourseModal = true; // Show the Edit Course modal after closing the Edit Topic modal
  }





getFileProgress(){
  return this.API.uploadProgress;
}

async saveTopic(): Promise<void> {
  if (this.isSaving) {
    this.API.failedSnackbar('A save operation is already in progress.');
    return;
  }

  if (this.newTopic.title.trim() === '' || this.newTopic.details.trim() === '') {
    this.API.failedSnackbar('Title and Details are required.');
    return;
  }

  this.isSaving = true;
  this.API.showLoader();



  try {
    console.log('Saving topic:', this.newTopic);
    console.log('Current attachments:', this.newTopic.attachments);

    const attachments: any[] = [];

    for (const attachment of this.newTopic.attachments) {
      if (attachment instanceof File) {
        const serverLocation = uuidv4() + '-' + attachment.name;


        this.API.justSnackbar(`Uploading file`, this.uploadProgress);


        await this.API.uploadFileWithProgress(attachment, serverLocation);
        attachments.push({
          filePath: 'files/' + serverLocation,
          type: 'normal',
          metadata: null,
        });

        // Reset the snackbar to show success after upload
        this.API.justSnackbar('File uploaded successfully!', 3000);
      } else if (typeof attachment === 'object' && 'file' in attachment) {
        const serverLocation = uuidv4() + '-' + attachment.file.name;


        this.uploadInProgress = true;

        await this.API.uploadFileWithProgress(attachment.file,serverLocation);
        if (attachment.metadata.type === 'interactive') {
          attachments.push({
            filePath: 'files/' + serverLocation,
            type: 'interactive',
            metadata: {
              quiz_id: attachment.metadata.quiz_id,
              timestamp: attachment.metadata.timestamp,
            },
          });
        } else {
          attachments.push({
            filePath: 'files/' + serverLocation,
            type: 'normal',
            metadata: null,
          });
        }

        this.API.justSnackbar('Interactive file uploaded successfully!', 3000);
      } else if (typeof attachment === 'string') {
        // Existing file path, keep as is
        attachments.push({
          filePath: attachment,
          type: 'normal',
          metadata: null,
        });
      }
    }

    console.log('Processed attachments:', attachments);

    if (this.editingTopic && this.currentLessonId && this.newTopic.topicId) {
      // Updating existing topic
      const updateResult = await firstValueFrom(
        this.API.updateTopic(
          this.currentLessonId,
          this.newTopic.topicId,
          this.newTopic.title,
          this.newTopic.details
        )
      );

      if (updateResult.success) {
        // Skip clearing existing attachments if topic was updated via new workflow
        if (!this.topicUpdatedViaNewWorkflow) {
          console.log('Clearing existing attachments (normal workflow)');
          // Clear existing attachments before adding new ones
          await this.clearExistingAttachments(this.newTopic.topicId);
        } else {
          console.log('Skipping clearExistingAttachments because topic was updated via new workflow');
        }

        // Add new attachments
        await this.updateTopicAttachments(this.newTopic.topicId, attachments);

        this.API.successSnackbar('Topic and attachments updated successfully!');
        this.updateTopicsList();
        this.closeTopicModal();
      } else {
        throw new Error('Failed to update topic');
      }
    } else if (this.currentLessonId) {
      // Creating new topic
      const result = await firstValueFrom(
        this.API.createTopicWithAttachments(
          this.currentLessonId,
          this.newTopic.title,
          this.newTopic.details,
          attachments
        )
      );

      if (result.success) {
        console.log('Topic and attachments created successfully!', result);
        this.API.successSnackbar('Topic and attachments created successfully!');
        this.updateTopicsList();
        this.closeTopicModal();
      } else {
        throw new Error(result.error || 'Failed to create topic with attachments');
      }
    }
  } catch (error) {
    console.error('Error saving topic:', error);
    this.API.failedSnackbar(`Failed to ${this.editingTopic ? 'update' : 'create'} topic. Please try again.`);
  } finally {
    this.isSaving = false;
    this.API.hideLoader();
  }
}


private async clearExistingAttachments(topicId: string): Promise<void> {
  try {
    console.log('=== CLEARING EXISTING ATTACHMENTS ===');
    console.log('Topic ID:', topicId);
    console.log('This will delete all attachments and their table of contents!');
    
    await firstValueFrom(this.API.deleteTopicAttachments(topicId));
    console.log('Existing attachments cleared');
  } catch (error) {
    console.error('Error clearing existing attachments:', error);
    throw new Error('Failed to clear existing attachments');
  }
}


private async updateTopicAttachments(topicId: string, attachments: any[]): Promise<void> {
  console.log('=== UPDATING TOPIC ATTACHMENTS ===');
  console.log('Topic ID:', topicId);
  console.log('Attachments to process:', attachments);
  console.log('Current pending table of contents:', this.pendingTableOfContents);

  for (const attachment of attachments) {
    try {
      console.log('Processing attachment:', attachment);
      
      const attachmentResult = await firstValueFrom(
        this.API.createTopicAttachments(
          topicId,
          attachment.filePath,
          attachment.type,
          attachment.metadata
        )
      );
      
      console.log('Attachment creation result:', attachmentResult);
      
      // If this is an interactive video and we have pending table of contents, save them
      if (attachment.type === 'interactive' && this.pendingTableOfContents.length > 0) {
        console.log('This is an interactive attachment with table of contents');
        
        // Get the attachment ID from the result - try multiple possible locations
        let attachmentId = null;
        
        // First priority: direct id field in the result
        if (attachmentResult.id) {
          attachmentId = attachmentResult.id;
        } else if (attachmentResult.data?.id) {
          attachmentId = attachmentResult.data.id;
        } else if (attachmentResult.data?.insertId) {
          attachmentId = attachmentResult.data.insertId;
        } else if (attachmentResult.insertId) {
          attachmentId = attachmentResult.insertId;
        } else if (attachmentResult.data?.output?.id) {
          attachmentId = attachmentResult.data.output.id;
        } else if (attachmentResult.data?.output?.insertId) {
          attachmentId = attachmentResult.data.output.insertId;
        } else if (attachmentResult.output?.id) {
          attachmentId = attachmentResult.output.id;
        } else if (attachmentResult.output?.insertId) {
          attachmentId = attachmentResult.output.insertId;
        }
        
        console.log('Extracted attachment ID:', attachmentId);
        console.log('Full attachment result structure:', JSON.stringify(attachmentResult, null, 2));
        
        if (attachmentId) {
          console.log('Calling saveTableOfContentsToDatabase with attachment ID:', attachmentId);
          await this.saveTableOfContentsToDatabase(attachmentId);
        } else {
          console.error('Could not extract attachment ID from result:', attachmentResult);
          this.API.failedSnackbar('Video saved but could not save table of contents - attachment ID not found');
        }
      } else if (attachment.type === 'interactive') {
        console.log('Interactive attachment but no pending table of contents');
      } else {
        console.log('Non-interactive attachment, skipping table of contents');
      }
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw new Error('Failed to add attachment');
    }
  }
}




attachFile(type: FileType): void {
  if (type === 'mp4') {
    this.showVideoOptionsModal = true;
  } else {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'any' ? '*.*' : `.${type}`; // Allow all files for 'any' type
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const selectedFile = target.files[0];
        const nonInteractiveAttachment: NonInteractiveAttachment = {
          file: selectedFile,
          metadata: {
            type: 'normal',
            quiz_id: '',
            timestamp: ''
          }
        };
        this.newTopic.attachments.push(nonInteractiveAttachment);
        this.API.successSnackbar('File added successfully!');
      }
    };
    input.click();
  }
}

saveInteractiveVideo(): void {
  // Validate required fields
  if (!this.interactiveVideoFile) {
    this.API.failedSnackbar('Please select a video file.');
    return;
  }

  if (!this.editingTopic) {
    this.API.failedSnackbar('Please save the topic first before adding interactive video.');
    return;
  }

  // Show loading state
  this.isSaving = true;
  this.API.successSnackbar('Adding interactive video...');

  try {
    // Create the interactive video attachment object
    const interactiveAttachment: InteractiveVideoAttachment = {
      file: this.interactiveVideoFile,
      metadata: {
        type: 'interactive',
        quiz_id: this.selectedQuiz?.id || '',
        timestamp: this.videoTimestamp || ''
      }
    };

    // Add to newTopic.attachments for processing when topic is saved
    this.newTopic.attachments.push(interactiveAttachment);
    
    // Close modal and reset state
    this.showInteractiveVideoModal = false;
    this.resetInteractiveVideoModal();
    
    this.API.successSnackbar('Interactive video added! Click "Save" to upload the video and table of contents.');

  } catch (error) {
    console.error('Error adding interactive video:', error);
    this.API.failedSnackbar('Error adding interactive video. Please try again.');
  } finally {
    this.isSaving = false;
  }
}

/**
 * Reset interactive video modal state
 */
private resetInteractiveVideoModal(): void {
  this.interactiveVideoFile = null;
  this.interactiveVideoFileName = '';
  this.selectedQuiz = '';
  this.videoTimestamp = '';
  this.activeInteractiveTab = 'video';
  
  // Reset stepper state
  this.videoSavedToDatabase = false;
  this.currentStep = 1;
  this.currentAttachmentId = null;
  
  // DON'T clear pendingTableOfContents here - keep it until topic is saved
  // this.pendingTableOfContents = [];
}

/**
 * Cancel interactive video modal
 */
cancelInteractiveVideo(): void {
  // Reset the new workflow flag when canceling
  this.topicUpdatedViaNewWorkflow = false;
  console.log('Reset topicUpdatedViaNewWorkflow flag on cancel');
  
  this.showInteractiveVideoModal = false;
  this.resetInteractiveVideoModal();
  // Clear any pending table of contents when canceling
  this.pendingTableOfContents = [];
  this.currentAttachmentId = null;
}

/**
 * Save video to database first, then enable table of contents
 */
async saveVideoToDatabase(): Promise<void> {
  // Validate required fields
  if (!this.interactiveVideoFile) {
    this.API.failedSnackbar('Please select a video file.');
    return;
  }

  if (!this.editingTopic || !this.newTopic.topicId) {
    this.API.failedSnackbar('Please save the topic first before adding interactive video.');
    return;
  }

  // Show loading state
  this.isSaving = true;
  this.API.successSnackbar('Uploading video to database...');

  try {
    // Generate unique filename for the video
    const serverLocation = uuidv4() + '-' + this.interactiveVideoFile.name;
    
    // Upload the video file first
    await this.API.uploadFileWithProgress(this.interactiveVideoFile, serverLocation);
    const filePath = 'files/' + serverLocation;

    // Create the attachment in database with interactive type
    const attachmentResult = await firstValueFrom(
      this.API.createTopicAttachments(
        this.newTopic.topicId,
        filePath,
        'interactive',
        {
          quiz_id: this.selectedQuiz?.id || '',
          timestamp: this.videoTimestamp || ''
        }
      )
    );

    console.log('Interactive video attachment created:', attachmentResult);

    // Check if the API call was successful
    if (attachmentResult.error) {
      throw new Error(attachmentResult.error);
    }

    if (!attachmentResult.success) {
      throw new Error('Failed to create attachment - API returned success: false');
    }

    // Extract attachment ID from the result
    let attachmentId = null;
    
    // Log the full structure to understand the response format
    console.log('Full attachment result structure:', JSON.stringify(attachmentResult, null, 2));
    
    // Try different possible locations for the attachment ID
    if (attachmentResult.id) {
      attachmentId = attachmentResult.id;
      console.log('Found ID in attachmentResult.id:', attachmentId);
    } else if (attachmentResult.data?.id) {
      attachmentId = attachmentResult.data.id;
      console.log('Found ID in attachmentResult.data.id:', attachmentId);
    } else if (attachmentResult.data?.insertId) {
      attachmentId = attachmentResult.data.insertId;
      console.log('Found ID in attachmentResult.data.insertId:', attachmentId);
    } else if (attachmentResult.insertId) {
      attachmentId = attachmentResult.insertId;
      console.log('Found ID in attachmentResult.insertId:', attachmentId);
    } else if (attachmentResult.output?.id) {
      attachmentId = attachmentResult.output.id;
      console.log('Found ID in attachmentResult.output.id:', attachmentId);
    } else if (attachmentResult.output?.insertId) {
      attachmentId = attachmentResult.output.insertId;
      console.log('Found ID in attachmentResult.output.insertId:', attachmentId);
    } else if (attachmentResult.data?.output?.id) {
      attachmentId = attachmentResult.data.output.id;
      console.log('Found ID in attachmentResult.data.output.id:', attachmentId);
    } else if (attachmentResult.data?.output?.insertId) {
      attachmentId = attachmentResult.data.output.insertId;
      console.log('Found ID in attachmentResult.data.output.insertId:', attachmentId);
    } else if (attachmentResult.attachment_id) {
      attachmentId = attachmentResult.attachment_id;
      console.log('Found ID in attachmentResult.attachment_id:', attachmentId);
    } else if (attachmentResult.data?.attachment_id) {
      attachmentId = attachmentResult.data.attachment_id;
      console.log('Found ID in attachmentResult.data.attachment_id:', attachmentId);
    } else if (attachmentResult.output?.attachment_id) {
      attachmentId = attachmentResult.output.attachment_id;
      console.log('Found ID in attachmentResult.output.attachment_id:', attachmentId);
    } else {
      // If we still can't find it, let's check all properties
      console.log('Could not find attachment ID in standard locations. Checking all properties...');
      console.log('Available properties:', Object.keys(attachmentResult));
      
      // Try to find any property that might contain an ID
      for (const key of Object.keys(attachmentResult)) {
        const value = attachmentResult[key];
        if (typeof value === 'number' && value > 0) {
          console.log(`Found potential ID in ${key}:`, value);
          attachmentId = value;
          break;
        }
        if (typeof value === 'object' && value !== null) {
          for (const subKey of Object.keys(value)) {
            const subValue = value[subKey];
            if (typeof subValue === 'number' && subValue > 0 && (subKey.includes('id') || subKey.includes('Id'))) {
              console.log(`Found potential ID in ${key}.${subKey}:`, subValue);
              attachmentId = subValue;
              break;
            }
          }
          if (attachmentId) break;
        }
      }
    }

    if (attachmentId) {
      this.currentAttachmentId = attachmentId;
      
      // Mark that topic was updated via new workflow
      this.topicUpdatedViaNewWorkflow = true;
      console.log('Topic marked as updated via new workflow');
      
      // Update stepper state
      this.videoSavedToDatabase = true;
      this.currentStep = 2;
      
      // Switch to table of contents step
      this.activeInteractiveTab = 'table-of-contents';
      this.API.successSnackbar('Video uploaded successfully! Now you can define the table of contents.');
      console.log('Successfully set currentAttachmentId to:', this.currentAttachmentId);
    } else {
      console.error('Could not extract attachment ID from result:', attachmentResult);
      
      // Try to get the latest attachment for this topic as a fallback
      console.log('Attempting to get latest attachment ID as fallback...');
      try {
        const attachmentsResponse = await firstValueFrom(this.API.getTopicAttachments(this.newTopic.topicId));
        console.log('Topic attachments response:', attachmentsResponse);
        
        if (attachmentsResponse.success && attachmentsResponse.output && attachmentsResponse.output.length > 0) {
          // Get the latest attachment (assuming it's the one we just created)
          const latestAttachment = attachmentsResponse.output[attachmentsResponse.output.length - 1];
          console.log('Latest attachment:', latestAttachment);
          
          if (latestAttachment.id) {
            this.currentAttachmentId = latestAttachment.id;
            
            // Mark that topic was updated via new workflow
            this.topicUpdatedViaNewWorkflow = true;
            console.log('Topic marked as updated via new workflow (fallback)');
            
            // Update stepper state
            this.videoSavedToDatabase = true;
            this.currentStep = 2;
            
            this.activeInteractiveTab = 'table-of-contents';
            this.API.successSnackbar('Video uploaded successfully! Now you can define the table of contents.');
            console.log('Successfully set currentAttachmentId from fallback to:', this.currentAttachmentId);
          } else {
            this.API.failedSnackbar('Video uploaded but could not determine attachment ID. Please try again.');
          }
        } else {
          this.API.failedSnackbar('Video uploaded but could not retrieve attachment list. Please try again.');
        }
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        this.API.failedSnackbar('Video uploaded but could not extract attachment ID. Please try again.');
      }
    }

  } catch (error) {
    console.error('Error saving video to database:', error);
    this.API.failedSnackbar('Error saving video to database. Please try again.');
  } finally {
    this.isSaving = false;
  }
}

/**
 * Save table of contents and close modal
 */
async saveTableOfContentsAndClose(): Promise<void> {
  if (!this.currentAttachmentId) {
    this.API.failedSnackbar('No video attachment found. Please save the video first.');
    return;
  }

  if (this.pendingTableOfContents.length === 0) {
    this.API.failedSnackbar('Please add at least one table of contents entry.');
    return;
  }

  this.isSaving = true;
  this.API.successSnackbar('Saving table of contents...');

  try {
    console.log('=== SAVING TABLE OF CONTENTS ===');
    console.log('Attachment ID:', this.currentAttachmentId);
    console.log('Pending table of contents:', this.pendingTableOfContents);

    let savedCount = 0;
    for (const entry of this.pendingTableOfContents) {
      if (entry.content_name.trim() && this.isValidTimeRange(entry)) {
        const saveData: VideoTableContent = {
          attachment_id: this.currentAttachmentId,
          content_name: entry.content_name.trim(),
          start_timestamp: entry.start_timestamp,
          end_timestamp: entry.end_timestamp,
          order_index: entry.order_index,
          description: entry.description?.trim() || ''
        };

        console.log('Saving table content data:', saveData);
        
        const result = await firstValueFrom(this.API.saveVideoTableContent(saveData));
        console.log('Save result:', result);
        
        if (result && result.success) {
          savedCount++;
        }
      }
    }

    if (savedCount > 0) {
      this.API.successSnackbar(`Table of contents saved successfully! (${savedCount} entries)`);
      this.showInteractiveVideoModal = false;
      this.resetInteractiveVideoModal();
      this.pendingTableOfContents = [];
      
      // Refresh topic attachments
      if (this.editingTopic && this.newTopic.topicId) {
        this.refreshTopicAttachments(this.newTopic.topicId);
      }
    } else {
      this.API.failedSnackbar('No valid table of contents entries were saved.');
    }

  } catch (error) {
    console.error('Error saving table of contents:', error);
    this.API.failedSnackbar('Error saving table of contents. Please try again.');
  } finally {
    this.isSaving = false;
  }
}

/**
 * Finish without adding table of contents
 */
finishWithoutTableOfContents(): void {
  this.API.successSnackbar('Video saved without table of contents.');
  this.showInteractiveVideoModal = false;
  this.resetInteractiveVideoModal();
  this.pendingTableOfContents = [];
  
  // Refresh topic attachments if needed
  if (this.editingTopic && this.newTopic.topicId) {
    this.refreshTopicAttachments(this.newTopic.topicId);
  }
}

/**
 * Refresh topic attachments after saving
 */
private refreshTopicAttachments(topicId: string): void {
  this.API.getTopicAttachments(topicId).subscribe({
    next: (response) => {
      if (response.success && this.editingTopic) {
        // Update the topic attachments
        const currentTopic = this.lessons
          .flatMap(lesson => lesson.topics || [])
          .find(topic => topic.topicid === topicId);
        
        if (currentTopic) {
          currentTopic.attachments = response.output.map((attachment: any) => attachment.attachment);
          console.log('Refreshed topic attachments:', currentTopic.attachments);
        }
      }
    },
    error: (error) => {
      console.error('Error refreshing topic attachments:', error);
    }
  });
}

saveNonInteractiveFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp4, .pdf, *'; // Accept multiple file types

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const selectedFile = target.files[0]; // Get the selected file

      try {
        // Generate a unique server location path
        const serverLocation = uuidv4() + '-' + selectedFile.name;

        // Upload the file and get the file path
        await this.API.uploadFileWithProgress(selectedFile, serverLocation);
        const filePath = 'files/' + serverLocation;

        // Push the file path to the attachments array
        const nonInteractiveAttachment: NonInteractiveAttachment = {
          file: selectedFile,
          metadata: {
            type: 'normal',  // Set the correct type to 'normal'
            quiz_id: '',     // Empty metadata for non-interactive files
            timestamp: ''    // Empty metadata for non-interactive files
          }
        };

        this.newTopic.attachments.push(nonInteractiveAttachment); // Add to newTopic.attachments

        // Save the attachment to the database with the type 'normal' and a NULL timestamp
        await firstValueFrom(
          this.API.createTopicAttachments(
            this.newTopic.topicId!,
            filePath,
            'normal',  // Ensure type is set to 'normal'
            null       // Set timestamp to NULL
          )
        );

        // Display a success message
        this.API.successSnackbar('Non-interactive file added successfully!');
      } catch (error) {
        console.error('Error uploading file:', error);
        this.API.failedSnackbar('Failed to upload the file. Please try again.');
      }
    } else {
      this.API.failedSnackbar('No file selected.'); // Inform the user if no file is selected
    }
  };

  input.click(); // Open the file dialog
}

playYouTubeVideo(link: string) {
  // If you have a ViewerComponent instance, call its method
  // Or, simply open in a new tab:
  const videoIdMatch = link.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const embedUrl = videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  if (embedUrl) {
    window.open(embedUrl, '_blank');
  } else {
    // Optionally show an error
    alert('Invalid YouTube link.');
  }
}

getYouTubeEmbedUrl(url: string): string {
  const videoId = url.split('v=')[1];
  return `https://www.youtube.com/embed/${videoId}`;
}

deleteTopic(topic: any, lesson: any) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!"
  }).then((result) => {
    if (result.isConfirmed) {
      this.API.showLoader(); // Show loading indicator

      this.API.deleteTopicWithAttachments(topic.topicid).subscribe(
        (response) => {
          this.API.hideLoader(); // Hide loading indicator
          if (response.success) {
            const topicIndex = lesson.topics.findIndex((t: any) => t.topicid === topic.topicid);
            if (topicIndex > -1) {
              lesson.topics.splice(topicIndex, 1);
            }
            this.API.successSnackbar('Topic deleted successfully');
            Swal.fire(
              'Deleted!',
              'The topic has been deleted.',
              'success'
            );
          } else {
            this.API.failedSnackbar('Failed to delete topic');
          }
        },
        (error) => {
          this.API.hideLoader(); // Hide loading indicator
          console.error('Error deleting topic:', error);
          this.API.failedSnackbar('An error occurred while deleting the topic');
        }
      );
    }
  });
}

deleteAttachment(index: number): void {
  if (this.editingTopic && this.newTopic.topicId) {
    const attachmentToDelete = this.newTopic.attachments[index];

    if (typeof attachmentToDelete === 'string') {
      this.API.deleteTopicAttachments(this.newTopic.topicId).subscribe(
        (response) => {
          if (response.success) {
            this.newTopic.attachments.splice(index, 1);
            this.API.successSnackbar('Attachment deleted successfully!');
          } else {
            this.API.failedSnackbar('Failed to delete attachment. Please try again.');
          }
        },
        (error) => {
          console.error('Error deleting attachment:', error);
          this.API.failedSnackbar('Failed to delete attachment. Please try again.');
        }
      );
    } else if (attachmentToDelete && typeof attachmentToDelete === 'object' && 'file' in attachmentToDelete) {
      // It's a newly added file that hasn't been saved to the server yet
      this.newTopic.attachments.splice(index, 1);
      this.API.successSnackbar('Attachment removed successfully!');
    }
  } else {
    // If we're adding a new topic or the topic hasn't been saved yet,
    // we can simply remove the attachment from the array
    this.newTopic.attachments.splice(index, 1);
    this.API.successSnackbar('Attachment removed successfully!');
  }
}


handleVideoOption(option: 'video' | 'interactive'): void {
  this.showVideoOptionsModal = false; // Close options modal
  if (option === 'video') {
    this.uploadRegularVideo(); // Properly handle non-interactive video upload
  } else {
    // Load quizzes and prepare for interactive video
    this.getQuizzes();
    
    // Initialize table of contents data only if not already present
    this.currentVideoTableContents = [];
    // Keep existing pendingTableOfContents if they exist
    if (this.pendingTableOfContents.length === 0) {
      this.pendingTableOfContents = [];
    }
    
    // Reset active tab to video
    this.activeInteractiveTab = 'video';
    
    this.showInteractiveVideoModal = true; // Open the interactive video modal for interactive videos
  }
}


uploadRegularVideo(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp4'; // Accept only video files

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const selectedFile = target.files[0]; // Get the selected file

      try {
        // Generate a unique server location path
        const serverLocation = uuidv4() + '-' + selectedFile.name;

        // Upload the file and get the file path
        // await this.API.uploadFileWithProgress(selectedFile, serverLocation);
        const filePath = 'files/' + serverLocation;

        // Create an attachment object for non-interactive video files
        const nonInteractiveAttachment: NonInteractiveAttachment = {
          file: selectedFile,
          metadata: {
            type: 'normal',  // Set type to 'normal' for non-interactive videos
            quiz_id: '',     // Empty metadata for non-interactive files
            timestamp: ''    // Empty metadata for non-interactive files
          }
        };

        this.newTopic.attachments.push(nonInteractiveAttachment); // Add to newTopic.attachments

        // Save the attachment to the database with the type 'normal' and a NULL timestamp
        await firstValueFrom(
          this.API.createTopicAttachments(
            this.newTopic.topicId!,
            filePath,
            'normal',  // Ensure type is set to 'normal'
            null       // Set timestamp to NULL
          )
        );

        // Display a success message
        this.API.successSnackbar('Video file added successfully as a normal attachment!');
      } catch (error) {
        console.error('Error uploading file:', error);
        this.API.failedSnackbar('Failed to upload the video file. Please try again.');
      }
    } else {
      this.API.failedSnackbar('No video file selected.'); // Inform the user if no file is selected
    }
  };

  input.click(); // Open the file dialog
}

// Add this method after the handleVideoOption method
handleVideoUrl(): void {
  if (!this.videoUrl) {
    this.API.failedSnackbar('Please enter a video URL');
    return;
  }

  // Validate YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  if (!youtubeRegex.test(this.videoUrl)) {
    this.API.failedSnackbar('Please enter a valid YouTube URL');
    return;
  }

  // Create a non-interactive attachment with the video URL
  const nonInteractiveAttachment: NonInteractiveAttachment = {
    file: new File([], 'youtube-video.txt'), // Empty file since we're using URL
    metadata: {
      type: 'normal',
      quiz_id: '',
      timestamp: ''
    }
  };

  // Add the URL to the attachments array
  this.newTopic.attachments.push(this.videoUrl);
  
  // Close the modal and show success message
  this.showVideoOptionsModal = false;
  this.videoUrl = ''; // Reset the URL input
  this.API.successSnackbar('Video URL added successfully!');
}



isFile(file: any): file is File {
  return file instanceof File;
}

isString(file: any): file is string {
  return typeof file === 'string';
}

getFilenameFromPath(filePath: string): string {
  return filePath.split('>').length > 1 ? filePath.split('>')[1] : filePath;
}


openFile(file: string) {
  if (this.isYoutube(file)) {
    this.previewYoutubeVideo(file);
  } else {
    this.API.openFile(file);
  }
}



updateTopicsList(): void {
  const lesson = this.lessons.find((lesson) => lesson.id === this.currentLessonId);
  if (lesson) {
    this.API.fetchLessonTopics(this.currentLessonId!).subscribe(
      (topicsData) => {
        lesson.topics = topicsData.output.sort((a: any, b: any) => a.id - b.id); // Sort topics by ID
        lesson.topics?.forEach((topic) => {
          this.API.getTopicAttachments(topic.topicid).subscribe(
            (attachmentsData) => {
              if (attachmentsData.success) {
                topic.attachments = attachmentsData.output.map((attachment: any) => attachment.attachment);
                console.log(`Updated Attachments for Topic ${topic.topicid}:`, topic.attachments); // Display updated attachments
              } else {
                console.error(`Error fetching attachments for topic ${topic.topicid}:`, attachmentsData.error || 'Unknown error');
                this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
              }
            },
            (error) => {
              console.error(`Error fetching attachments for topic ${topic.topicid}:`, error);
              this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
            }
          );
        });
      },
      (error) => {
        console.error('Error fetching updated topics:', error);
      }
    );
  }
}



openTopicModal(editing: boolean = false, topic?: any, lessonId?: string): void {
  // Reset the new workflow flag when opening modal
  this.topicUpdatedViaNewWorkflow = false;
  console.log('Reset topicUpdatedViaNewWorkflow flag on modal open');
  
  this.showEditCourseModal = false; // Hide the Edit Course modal
  this.editingTopic = editing;
  this.showTopicModal = true;

  if (lessonId) {
    this.currentLessonId = lessonId;
    console.log('Current Lesson ID set to:', this.currentLessonId);
  }

  if (editing && topic) {
    // Parse attachments string into an array if necessary
    const parsedAttachments = typeof topic.attachments === 'string'
      ? topic.attachments.split(',').map((attachment: string) => attachment.trim())
      : topic.attachments || [];

    // Populate the modal with the topic's data
    this.newTopic = {
      title: topic.title || '',
      details: topic.details || '',
      attachments: parsedAttachments.map((attachment: any) =>
        typeof attachment === 'string' ? attachment : {
          file: attachment.file,
          metadata: attachment.metadata
        }
      ),
      topicId: topic.topicid || undefined,
    };
    console.log('Editing Topic Mode:', this.newTopic);
  } else {
    // Clear the modal for adding a new topic
    this.newTopic = { title: '', details: '', attachments: [], topicId: undefined };
    console.log('Adding a new Topic Mode');
  }
}




  toggleDropdown(type: string) {
    if (type === 'audience') {
      this.showAudienceDropdown = !this.showAudienceDropdown;
    } else if (type === 'requirements') {
      this.showRequirementsDropdown = !this.showRequirementsDropdown;
    }
  }

  onSelectAudience(option: string) {
    if (this.selectedAudience.includes(option)) {
      this.selectedAudience = this.selectedAudience.filter(aud => aud !== option);
    } else {
      this.selectedAudience.push(option);
    }
  }

  onSelectRequirement(option: string) {
    if (this.selectedRequirements.includes(option)) {
      this.selectedRequirements = this.selectedRequirements.filter(req => req !== option);
    } else {
      this.selectedRequirements.push(option);
    }
  }

  getURL(file: string): string {
    return this.API.getURL(file); // Use the same logic as in lessons component
  }


  parseArrayString(str: string): string[] {
    try {
      return JSON.parse(str.replace(/'/g, '"'));
    } catch (error) {
      console.error('Failed to parse string:', error);
      return [];
    }
  }

  mapComplexity(difficulty: number): number {
    return Math.round((difficulty * (3 / 5)) - 1);
  }

 

  uploadProgress: number = 0; // Store the upload progress percentage
  uploadInProgress: boolean = false; // Track whether the upload is currently in progress



  uploadCourseImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const filename = uuidv4() + '.' + file.name.split('.').pop();

        // Reset progress and start file upload
        this.uploadProgress = 0;
        this.uploadInProgress = true;

        // Show the initial snackbar with 0% progress
        this.API.justSnackbar(`Uploading file... 0%`, 99999999999999); // Long duration until upload is done

        // Start the file upload and update the snackbar with progress
        this.API.uploadFileLoading(file, filename).subscribe({
          next: (progress: number) => {
            this.uploadProgress = progress; // Update the progress value

            // Update the snackbar message with current progress
            this.API.justSnackbar(`Uploading file... ${progress}%`, 99999999999999);
          },
          error: (error: any) => {
            this.uploadInProgress = false;
            this.API.justSnackbar('Failed to upload image. Please try again.', 3000); // Show error for 3 seconds
          },
          complete: () => {
            this.uploadInProgress = false;
            this.courseImageURL = 'files/' + filename;
            this.API.justSnackbar('Image uploaded successfully!', 3000); // Show success for 3 seconds
          },
        });
      }
    };

    input.click();
  }




  thisLesson() {
    const newLesson: Lesson = {
      lessonName: '',
      coverImage: null,
      fileupload: null,
      description: '',
      complexity: 1,
    };
    this.lessons.push(newLesson);
  }

  deleteQueue: any = [];
  delete(lesson: any) {
    if (this.lessons.length <= 1) {
      this.API.failedSnackbar('This course should have at least one lesson');
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.API.showLoader(); // Show loading indicator

        this.API.deleteLesson(lesson.id).subscribe(
          (response) => {
            this.API.hideLoader(); // Hide loading indicator
            if (response.success) {
              const index = this.lessons.findIndex(l => l.id === lesson.id);
              if (index > -1) {
                this.lessons.splice(index, 1);
              }
              this.API.successSnackbar('Lesson deleted successfully');
              Swal.fire(
                'Deleted!',
                'The lesson has been deleted.',
                'success'
              );
            } else {
              this.API.failedSnackbar('Failed to delete lesson');
            }
          },
          (error) => {
            this.API.hideLoader(); // Hide loading indicator
            console.error('Error deleting lesson:', error);
            this.API.failedSnackbar('An error occurred while deleting the lesson');
          }
        );
      }
    });
  }
  getGradient(): string {
    return 'linear-gradient(to right, #ff9a9e, #fad0c4)';
  }

  listen(e: any) {
    this.mode.listen = e.target.value;
  }

  read(e: any) {
    this.mode.read = e.target.value;
  }

  speak(e: any) {
    this.mode.speak = e.target.value;
  }

  write(e: any) {
    this.mode.write = e.target.value;
  }

  onFileSelected(event: Event, lesson: Lesson, type: FileType) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && this.validateFileType(inputElement.files[0], type)) {
      lesson.fileupload = inputElement.files[0];
    }
  }

  // validateFileType(file: File, type: FileType): boolean {
  //   const validTypes: Record<FileType, string[]> = {
  //     mp4: ['mp4'],
  //     pdf: ['pdf'],
  //     any: ['*'],
  //   };
  //   return validTypes[type].includes(file.type) || type === 'any';
  // }

  validateFileType(file: File, type: FileType): boolean {
    if (type === 'any') return true;  // Always return true for 'any' type
    const validTypes: Record<FileType, string[]> = {
      mp4: ['mp4'],
      pdf: ['pdf'],
      any: ['*'],
    };
    return validTypes[type].includes(file.type);
  }

  previewVideo() {
    if (this.interactiveVideoFile) {
      const fileURL = URL.createObjectURL(this.interactiveVideoFile);
      window.open(fileURL, '_blank');
    }
  }



  onInteractiveVideoSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.interactiveVideoFile = target.files[0];
    }
  }

  importImage(event: Event, lesson: Lesson) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];
      if (!validImageTypes.includes(inputElement.files[0].type)) {
        this.API.failedSnackbar('Select valid image file type!');
        return;
      }
      lesson.coverImage = inputElement.files[0];
    }
  }

  setComplexity(complexity: number, lesson: Lesson) {
    lesson.complexity = complexity;
  }

  complexityOptions = ['Beginner', 'Intermediate', 'Advanced'];
  selectedcomplexity: string = 'Beginner';

  async submit() {
    const modeString = 'LRSW';

    if (this.courseTitle.trim() === '') {
      this.API.failedSnackbar('Course title should not be empty!');
      return;
    }

    if (this.courseObjective.trim() === '') {
      this.API.failedSnackbar('Course objective should not be empty!');
      return;
    }

    const defaultLanguage = 'English';
    const languageId = this.languages.get(defaultLanguage)?.id;

    if (!languageId) {
      this.API.failedSnackbar('Invalid language selected!');
      return;
    }

    const genID = this.info.id;  // Use existing ID for updating
    this.API.justSnackbar('Updating course, Please Wait...', 99999999999999);

    try {
      await lastValueFrom(
        this.API.updateCourse(
          genID,
          this.courseTitle,
          this.courseDesc,
          modeString,
          languageId,
          this.courseImageURL,
          this.courseObjective
        )
      );

      for (let lesson of this.lessons) {
        let attachments: string | undefined = undefined;
        let imageupload: string | undefined = undefined;
        const complexity = (Number(lesson.complexity) + 1) * (5 / 3);

        if (lesson.description.trim() === '') {
          lesson.description = '[NONE]';
        }
        if (lesson.fileupload && !(typeof lesson.fileupload === 'string')) {
          const fileparse = lesson.fileupload.name.split('.');
          const serverLocation = uuidv4() + '.' + fileparse[fileparse.length - 1];
          await this.API.uploadFileWithProgress(lesson.fileupload, serverLocation);
          const filelocation = 'files/' + serverLocation;
          const filename = lesson.fileupload.name;
          attachments = filelocation + '>' + filename;
        }

        if (lesson.coverImage && !(typeof lesson.coverImage === 'string')) {
          const fileparse = lesson.coverImage.name.split('.');
          const serverLocation = uuidv4() + '.' + fileparse[fileparse.length - 1];
          this.API.uploadImage(lesson.coverImage, serverLocation);
          const filelocation = 'files/' + serverLocation;
          imageupload = filelocation;
        }

        if (lesson.id) {
          await lastValueFrom(this.API.updateLesson(genID, lesson.id!, lesson.lessonName, lesson.description, complexity, attachments, imageupload));
        } else {
          await lastValueFrom(this.API.createLesson(genID, lesson.lessonName, lesson.description, complexity, attachments, imageupload));
        }
      }

      this.API.successSnackbar('Course updated successfully!');
      this.activeModal.close('update');
    } catch (error) {
      console.error('Error updating course:', error);
      this.API.failedSnackbar('Failed to update course. Please try again.');
    }
  }

  addLesson() {
    this.thisLesson();
  }

  getFilename(file: any) {
    if ((typeof file == 'string')) {
      return file.split('>')[1];
    } else {
      return file.name;
    }
  }

  getFilenamee(file: string): string {
    if (!file) return ''; // Handle empty or undefined file case
    return file.split('>').length > 1 ? file.split('>')[1] : file;
  }


  selectLanguage(langID: string) {
    this.language = langID!;
  }

  closeModal() {
    this.activeModal.close();
  }



  openFileSelector(lesson: Lesson, type: FileType, isInteractive: boolean = false) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.getFileAcceptType(type);
    input.onchange = (event: Event) => {
      this.onFileSelected(event, lesson, type);
      if (isInteractive && input.files && input.files[0]) {
        this.interactiveVideoFile = input.files[0];
        this.interactiveVideoFileName = input.files[0].name;
        this.isInteractiveVideoMode = true;
      }
    };
    input.click();
  }

  

  getFileAcceptType(type: FileType): string {
    switch (type) {
      case 'mp4':
        return '.mp4';
      case 'pdf':
        return '.pdf';
      case 'any':
        return '*.*';  // Changed from '*' to '*.*' to explicitly accept all file types
      default:
        return '*.*';
    }
  }



  // Quiz
  quizOptions: any = [];
  quiz: any = [];


  // getQuizzes() {
  //   this.API.showLoader();
  //   this.API.teacherGetQuizzes().subscribe((data) => {
  //     this.quizOptions = data.output;
  //     console.log('quizes:', data);
  //     this.API.hideLoader();
  //   });
  // }

  getQuizzes(): void {
  this.API.showLoader();

  this.API.teacherGetQuizzes().subscribe({
    next: (resp) => {
      if (resp.success) {
        /*  settings comes back as a space‑separated string
            (e.g. "random_question popup_quiz allow_review")          */
        this.quizOptions = (resp.output as any[]).filter(q =>
          (q.settings ?? '').split(' ').includes('popup_quiz')
        );
      } else {
        this.quizOptions = [];
        this.API.failedSnackbar('Unable to load quizzes');
      }
      this.API.hideLoader();
    },
    error: () => {
      this.quizOptions = [];
      this.API.failedSnackbar('Unable to load quizzes');
      this.API.hideLoader();
    }
  });
}

  getFileIcon(file: any): string {
    if (this.isImage(file)) return 'fas fa-image text-blue-500';
    if (this.isVideo(file)) return 'fas fa-video text-purple-500';
    if (this.isPDF(file)) return 'fas fa-file-pdf text-red-500';
    if (this.isPowerPoint(file)) return 'fas fa-file-powerpoint text-orange-500'; 
    if (this.isDoc(file)) return 'fas fa-file-word text-blue-600'; 
    if (this.isExcelFile(file)) return 'fas fa-file-excel text-green-600'; 
    if (this.isTextFile(file)) return 'fas fa-file-alt text-blue-600'; 
    if (this.isYoutube(file)) return 'fas fa-youtube text-red-500';

    return 'fas fa-file text-gray-500';
  }
  
  getFileType(file: any): string {
    if (this.isImage(file)) return 'Image';
    if (this.isVideo(file)) return 'Video';
    if (this.isPDF(file)) return 'PDF';
    if (this.isPowerPoint(file)) return 'PowerPoint';
    if (this.isDoc(file)) return 'Word Document'; 
    if (this.isExcelFile(file)) return 'Excel Spreadsheet'; 
    if (this.isTextFile(file)) return 'Text Document'; 
    if (this.isYoutube(file)) return 'Youtube Video';
    return 'File';
  }
  
  isPreviewable(file: any): boolean {
    return this.isImage(file) || this.isVideo(file) || this.isPDF(file) || this.isYoutube(file);
  }
  
  isImage(file: any): boolean {
    return /\.(jpeg|jpg|gif|png|webp)$/i.test(this.getFilePath(file));
  }
  
  isVideo(file: any): boolean {
    return /\.(mp4|webm|ogg)$/i.test(this.getFilePath(file));
  }
  
  isPDF(file: any): boolean {
    return /\.(pdf)$/i.test(this.getFilePath(file));
  }
  
  isPowerPoint(file: any): boolean {
    return /\.(ppt|pptx)$/i.test(this.getFilePath(file));
  }
  
  isDoc(file: any): boolean {
    return /\.(doc|docx)$/i.test(this.getFilePath(file));
  }
  
  isExcelFile(file: any): boolean {
    return /\.(xls|xlsx)$/i.test(this.getFilePath(file));
  }
  
  isTextFile(file: any): boolean {
    return /\.(txt|csv)$/i.test(this.getFilePath(file));
  }
  

  isInteractiveVideo(file: any): boolean {
    return file && file.type === 'interactive';
  }

  isYoutube(file: any): boolean {
    if (typeof file === 'string') {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      return youtubeRegex.test(file);
    }
    return false;  
  }

  private getYoutubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }
  
  // Preview/Play YouTube video
  previewYoutubeVideo(url: string): void {
    const videoId = this.getYoutubeVideoId(url);
    if (!videoId) {
      this.API.failedSnackbar('Invalid YouTube URL');
      return;
    }
  
    // Create a modal to show the video
    Swal.fire({
      title: 'Video Preview',
      html: `
        <div class="aspect-w-16 aspect-h-9">
          <iframe 
            width="100%" 
            height="315" 
            src="https://www.youtube.com/embed/${videoId}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      `,
      width: '800px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        container: 'youtube-preview-modal'
      }
    });
  }

  getFilePath(file: any): string {
    if (typeof file === 'string') return file;
    if (file && file.file) return file.file;
    return '';
  }

  getOriginalFilename(file: any): string {
    const fullPath = this.getFilePath(file);
    const filename = fullPath.split('/').pop() || fullPath;
    return filename.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '');
  }

  /**
   * Open table of contents modal
   */
  openTableOfContentsModal(): void {
    if (!this.currentAttachmentId) {
      this.API.failedSnackbar('Please save the video first to manage table of contents');
      return;
    }

    const modalRef = this.modalService.open(VideoTableContentsModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.attachmentId = this.currentAttachmentId;
    modalRef.componentInstance.videoTitle = this.interactiveVideoFileName || 'Interactive Video';

    modalRef.result.then((tableContents: VideoTableContent[]) => {
      if (tableContents) {
        this.currentVideoTableContents = tableContents;
        this.API.successSnackbar('Table of contents updated successfully');
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(seconds: number): string {
    return this.API.formatTimestamp(seconds);
  }

  /**
   * Switch active tab in interactive video modal
   */
  /**
   * Go to specific step in the stepper
   */
  goToStep(step: number): void {
    if (step === 1) {
      this.currentStep = 1;
      this.activeInteractiveTab = 'video';
    } else if (step === 2) {
      if (!this.videoSavedToDatabase) {
        this.API.failedSnackbar('Please save the video to database first before accessing table of contents.');
        return;
      }
      this.currentStep = 2;
      this.activeInteractiveTab = 'table-of-contents';
    }
  }

  /**
   * Check if Table of Contents step should be accessible
   */
  canAccessTableOfContents(): boolean {
    return this.videoSavedToDatabase && !!this.currentAttachmentId;
  }

  /**
   * Load table of contents for current attachment
   */
  loadTableOfContents(attachmentId: number): void {
    this.currentAttachmentId = attachmentId;
    this.API.getVideoTableContents(attachmentId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.currentVideoTableContents = response.output;
        }
      },
      error: (error: any) => {
        console.error('Error loading table of contents:', error);
      }
    });
  }

  /**
   * Add new table of contents entry
   */
  addNewTableOfContentsEntry(): void {
    const newEntry: PendingTableOfContent = {
      content_name: '',
      description: '',
      start_timestamp: 0,
      end_timestamp: 30,
      start_minutes: 0,
      start_seconds: 0,
      end_minutes: 0,
      end_seconds: 30,
      order_index: this.pendingTableOfContents.length + 1
    };
    this.pendingTableOfContents.push(newEntry);
  }

  /**
   * Remove table of contents entry
   */
  removeTableOfContentsEntry(index: number): void {
    this.pendingTableOfContents.splice(index, 1);
    // Reorder the remaining entries
    this.pendingTableOfContents.forEach((entry, i) => {
      entry.order_index = i + 1;
    });
  }

  /**
   * Update timestamp when minutes/seconds change
   */
  updateTimestamp(content: PendingTableOfContent, type: 'start' | 'end'): void {
    if (type === 'start') {
      content.start_timestamp = (content.start_minutes || 0) * 60 + (content.start_seconds || 0);
    } else {
      content.end_timestamp = (content.end_minutes || 0) * 60 + (content.end_seconds || 0);
    }
  }

  /**
   * Validate time range
   */
  isValidTimeRange(content: PendingTableOfContent): boolean {
    return content.start_timestamp < content.end_timestamp;
  }

  /**
   * Save table of contents to database after video upload
   */
  async saveTableOfContentsToDatabase(attachmentId: number): Promise<void> {
    console.log('=== SAVING TABLE OF CONTENTS ===');
    console.log('Attachment ID:', attachmentId);
    console.log('Pending table of contents:', this.pendingTableOfContents);
    console.log('Number of entries:', this.pendingTableOfContents.length);

    if (this.pendingTableOfContents.length === 0) {
      console.log('No pending table of contents to save');
      return;
    }

    try {
      let savedCount = 0;
      for (const content of this.pendingTableOfContents) {
        console.log('Processing content entry:', content);
        
        if (content.content_name.trim() && this.isValidTimeRange(content)) {
          const tableContentData = {
            attachment_id: attachmentId,
            content_name: content.content_name.trim(),
            description: content.description?.trim() || '',
            start_timestamp: content.start_timestamp,
            end_timestamp: content.end_timestamp,
            order_index: content.order_index
          };
          
          console.log('Saving table content data:', tableContentData);
          
          const result: any = await firstValueFrom(this.API.saveVideoTableContent(tableContentData));
          console.log('Save result:', result);
          
          if (result && result.success) {
            savedCount++;
            console.log(`Successfully saved table content entry ${savedCount}`);
          } else {
            console.error('Failed to save table content entry:', result);
          }
        } else {
          console.warn('Skipping invalid content entry:', content);
        }
      }
      
      if (savedCount > 0) {
        console.log(`Successfully saved ${savedCount} table of contents entries`);
        this.API.successSnackbar(`Saved ${savedCount} table of contents entries`);
        
        // Clear pending entries after successful save
        this.pendingTableOfContents = [];
        
        // Reload the saved table of contents
        this.loadTableOfContents(attachmentId);
      } else {
        console.warn('No valid table of contents entries were saved');
      }
      
    } catch (error) {
      console.error('Error saving table of contents:', error);
      this.API.failedSnackbar('Error saving table of contents: ' + (error as Error).message);
    }
  }
}
