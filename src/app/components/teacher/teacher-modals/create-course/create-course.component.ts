

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { lastValueFrom } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import { v4 as uuidv4 } from 'uuid';

interface UploadResponse {
  response: string;  // Adjust this based on your actual API response structure
}

interface Lesson {
  lessonName: string;
  coverImage: File | null;
  fileupload: File | null;
  description: string;
  complexity: number;
}

type FileType = 'mp4' | 'pdf' | 'any';  // Define a type for file types

@Component({
  selector: 'app-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.css'],
})
export class CreateCourseComponent {
  @Input() myCustomClass: string = '';
  @Input() languages: Map<string, any> = new Map<string, any>();
  lessons: Lesson[] = [
    {
      lessonName: '',
      coverImage: null,
      fileupload: null,
      description: '',
      complexity: 1,
    },
  ];
  selectedFileName: string | undefined;
  audioDescription: string = '';
  courseImagePreview: string | ArrayBuffer | null = null;  // Added for image preview
  hovering: boolean = false;

  // Form fields
  courseTitle: string = '';
  courseDesc: string = '';
  courseObjective: string = '';
  selectedTargetAudience: string[] = [];
  selectedTechRequirements: string[] = [];

  // New Dropdown para sa Request ni Doc
  audienceOptions: string[] = ['Student'];
  requirementsOptions: string[] = ['Internet', 'Phone', 'Tablet', 'Laptop'];
  testOptions: string[] = ['True', 'False'];

  selectedAudience: string[] = [];
  selectedRequirements: string[] = [];
  selectedTest: string = '';

  showTestDropdown = false;
  showAudienceDropdown = false;
  showRequirementsDropdown = false;



  constructor(public activeModal: NgbActiveModal, private API: APIService) {}

    //  start New Dropdown para sa Request ni Doc

toggleDropdown(type: string) {
  if (type === 'test') {
    this.showTestDropdown = !this.showTestDropdown;
    if (this.showTestDropdown) {
      this.showAudienceDropdown = false;
      this.showRequirementsDropdown = false;
    }
  } else if (type === 'audience') {
    this.showAudienceDropdown = !this.showAudienceDropdown;
    if (this.showAudienceDropdown) {
      this.showTestDropdown = false;
      this.showRequirementsDropdown = false;
    }
  } else if (type === 'requirements') {
    this.showRequirementsDropdown = !this.showRequirementsDropdown;
    if (this.showRequirementsDropdown) {
      this.showTestDropdown = false;
      this.showAudienceDropdown = false;
    }
  }
}

    deleteLesson(index: number) {
      if (this.lessons.length > 1) {
        this.lessons.splice(index, 1);
      } else {
        this.API.failedSnackbar('You must have at least one lesson');
      }
    }
  
  
onSelectTest(option: string) {
  if (this.selectedTest === option) {
    this.selectedTest = ''; // Uncheck if already selected (optional behavior)
  } else {
    this.selectedTest = option; // Set to "True" or "False"
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

    // end New Dropdown para sa Request ni Doc


  thislessons: Lesson[] = [];

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

  getGradient(): string {
    return 'linear-gradient(to right, #ff9a9e, #fad0c4)';
  }

  courseImageURL: string = ''; // Add this to store the uploaded image URL


  uploadCourseImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        console.log('Selected File:', file); // Log the selected file

        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = reader.result as string;  // Read the file as base64 string
          const fileRef = `files/${this.API.createID36()}.png`; // Generate a unique file reference
          console.log('Generated File Reference:', fileRef); // Debugging: Log the generated file reference

          this.API.justSnackbar('Uploading Course Image....', 99999999);

          // Use the correct function to upload the image
          const upload$ = this.API.uploadCourseImage(base64String, fileRef).subscribe((data: any) => {
            console.log('Response from Upload:', data); // Debugging: Log the server response
            if (data && data.response && data.response === 'Created URL') { // Ensure the response is successful
              this.courseImageURL = fileRef; // Save the uploaded image URL
              this.API.successSnackbar('Course image uploaded successfully!');
            } else {
              this.API.failedSnackbar('Failed to upload image. Please try again.');
            }
            upload$.unsubscribe();
          });

          // Update image preview
          this.courseImagePreview = base64String;
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }








  onFileSelected(event: Event, lesson: Lesson, type: FileType) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && this.validateFileType(inputElement.files[0], type)) {
      lesson.fileupload = inputElement.files[0];
    }
  }

  showVideoModal: boolean = false;
  currentLesson: Lesson | null = null;
  currentFileType: FileType | null = null;
  interactiveVideoFile: File | null = null;
  interactiveVideoFileName: string = '';
  isInteractiveVideoMode: boolean = false;
  selectedQuiz: string = '';
  quizOptions: string[] = ['Quiz 1', 'Quiz 2', 'Quiz 3'];
  videoTimestamp: number | null = null;



  attachFile(lesson: Lesson, type: FileType) {
    if (type === 'pdf' || type === 'any') {
      // For PDF and Downloadables, open file selector directly
      this.openFileSelector(lesson, type);
    } else if (type === 'mp4') {
      // For Video, show the modal to choose between Video Only or Interactive Video
      this.showVideoModal = true;
      this.currentLesson = lesson;
      this.currentFileType = type;
    }
  }


  handleVideoOption(option: 'video' | 'interactive') {
    if (!this.currentLesson || !this.currentFileType) {
      return; // Exit if currentLesson or currentFileType is not set
    }

    if (option === 'video') {
      // Handle video only option
      this.openFileSelector(this.currentLesson, this.currentFileType);
      this.showVideoModal = false; // Close the modal after selecting an option
    } else if (option === 'interactive') {
      // Handle interactive video option
      this.isInteractiveVideoMode = true;  // Switch to interactive mode
      this.showVideoModal = true; // Keep modal open for further options
      this.openFileSelector(this.currentLesson, this.currentFileType, true);
    }
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
        this.isInteractiveVideoMode = true;  // Update modal content for interactive video
      }
    };
    input.click();
  }


  openInteractiveVideoModal() {
    console.log('Open Interactive Video Modal');
  }

  previewVideo() {
    if (this.interactiveVideoFile) {
      const fileURL = URL.createObjectURL(this.interactiveVideoFile);
      window.open(fileURL, '_blank');
    }
  }

  goBackToOptions() {
    this.isInteractiveVideoMode = false;  // Switch back to video type options
  }

  // Function to save the interactive video settings
saveInteractiveVideoSettings() {
  if (!this.interactiveVideoFile) {
    this.API.failedSnackbar('Please upload a video before saving.');
    return;
  }
  if (!this.selectedQuiz || !this.videoTimestamp) {
    this.API.failedSnackbar('Please select a quiz and input a video timestamp.');
    return;
  }

  // Perform any additional save operations as needed
  console.log('Interactive Video Settings Saved:', {
    videoFile: this.interactiveVideoFileName,
    quiz: this.selectedQuiz,
    timestamp: this.videoTimestamp
  });

  this.showVideoModal = false;  // Close the modal after saving
  this.API.successSnackbar('Interactive Video settings saved successfully!');
}


  // attachFile(lesson: Lesson, type: FileType) {
  //   const input = document.createElement('input');
  //   input.type = 'file';
  //   input.accept = this.getFileAcceptType(type);
  //   input.onchange = (event: Event) => this.onFileSelected(event, lesson, type);
  //   input.click();
  // }

  getFileAcceptType(type: FileType): string {
    switch (type) {
      case 'mp4':
        return '.mp4';
      case 'pdf':
        return '.pdf';
      default:
        return '*';
    }
  }

  validateFileType(file: File, type: FileType): boolean {
    const validTypes: Record<FileType, string[]> = {
      mp4: ['mp4'],
      pdf: ['pdf'],
      any: ['*'],
    };
    return validTypes[type].includes(file.type) || type === 'any';
  }

  setComplexity(complexity: number, lesson: Lesson) {
    lesson.complexity = complexity;
    console.log(lesson.complexity);
  }

  complexityOptions = ['Beginner', 'Intermediate', 'Advanced'];
  selectedcomplexity: string = 'Beginner';

  getFilename(file: any) {
    if (typeof file == 'string') {
      return file.split('>')[1];
    } else {
      return file.name;
    }
  }


async submit() {
  const modeString = 'LRSW';

  if (this.courseTitle.trim() === '') {
    this.API.failedSnackbar('Course title should not be empty!');
    return;
  }

  if (!this.courseImagePreview) { 
    this.API.failedSnackbar('Please upload a Course Photo / Background!');
    return;
  }

  const defaultLanguage = 'English';
  const languageId = this.languages.get(defaultLanguage)?.id;

  if (!languageId) {
    this.API.failedSnackbar('Invalid language selected!');
    return;
  }

  for (let lesson of this.lessons) {
    if (lesson.lessonName.trim() === '') {
      this.API.failedSnackbar('Lesson titles should be completely filled.');
      return;
    }
  }

  const genID = this.API.createID32();
  this.API.justSnackbar('Creating course, Please Wait...', 99999999999999);

  try {
    const response = await lastValueFrom(
      this.API.createCourse(
        genID,
        this.courseTitle,
        this.courseDesc,
        modeString,
        languageId,
        this.courseImageURL,
        this.courseObjective,
        this.selectedAudience,
        this.selectedRequirements,
        this.selectedTest
      )
    );
    console.log(response);

    // Rest of your submit logic remains unchanged
    for (let lesson of this.lessons) {
      let attachments: string | undefined = undefined;
      let imageupload: string | undefined = undefined;
      lesson.complexity = (Number(lesson.complexity) + 1) * (5 / 3);

      if (lesson.description.trim() === '') {
        lesson.description = '[NONE]';
      }
      if (lesson.fileupload) {
        const fileparse = lesson.fileupload.name.split('.');
        const serverLocation = uuidv4() + '.' + fileparse[fileparse.length - 1];
        await this.API.uploadFileWithProgress(lesson.fileupload, serverLocation);
        const filelocation = 'files/' + serverLocation;
        const filename = lesson.fileupload.name;
        attachments = filelocation + '>' + filename;
      }
      if (lesson.coverImage) {
        const fileparse = lesson.coverImage.name.split('.');
        const serverLocation = uuidv4() + '.' + fileparse[fileparse.length - 1];
        this.API.uploadImage(lesson.coverImage, serverLocation);
        const filelocation = 'files/' + serverLocation;
        imageupload = filelocation;
      }
      await lastValueFrom(
        this.API.createLesson(
          genID,
          lesson.lessonName,
          lesson.description,
          lesson.complexity,
          attachments,
          imageupload
        )
      );
    }

    this.API.successSnackbar('Done!');
    this.activeModal.close('update');
  } catch (error) {
    console.error('Error creating course:', error);
    this.API.failedSnackbar('Failed to create course. Please try again.');
  }
}


  closeModal() {
    this.activeModal.close();
  }
}
