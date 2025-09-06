  import { Component, OnInit } from '@angular/core';
  import { ActivatedRoute, Route, Router } from '@angular/router';
  import { APIService } from 'src/app/services/API/api.service';
  import { Location } from '@angular/common';
  import { LoaderService } from 'src/app/services/API/services-includes/loader.service';

  @Component({
    selector: 'app-teacher-view',
    templateUrl: './teacher-view.component.html',
    styleUrls: ['./teacher-view.component.css']
  })
  export class TeacherViewComponent implements OnInit {

    constructor(private router: Router, private route:ActivatedRoute,  private location: Location, private API:APIService) {}
    submissionID:string = '';
    task: any = {};
    graded:boolean =false;
    studentID:string = '';

    ngOnInit(): void {
      const taskID = this.route.snapshot.paramMap.get('aid');
      const subID = this.route.snapshot.paramMap.get('sid');
      const studentName = this.route.snapshot.paramMap.get('s');
      this.submissionID = subID!;

      this.API.showLoader();
      const getTask$ = this.API.teacherGetAssignment(taskID!).subscribe(taskData => {
        if (taskData.output.length <= 0) {
          this.location.back();
        }
        const task = taskData.output[0];

        const getSubmission$ = this.API.teacherGetStudentAssignment(subID!).subscribe(submissionData => {
          const submission = submissionData.output[0];
          this.studentID = submission.studentid;

          // Parse files separately for task attachments and student submissions
          const attachedFiles = this.parseFileList(task.attachments);   // Task attachments from the teacher
          const submittedFiles = this.parseFileList(submission.attachments);  // Files uploaded by student

          // Assign the parsed data to the task object for template rendering
          this.task = {
            by: studentName,
            title: task.title,
            submittedTime: this.API.parseDateTime(submission.time),
            description: task.details,
            attachedFiles: attachedFiles,  // Teacher-provided attachments
            submittedFiles: submittedFiles,  // Student-provided files
            userComment: submission.comments
          };

          if (submission.grade) {
            this.gradingText = submission.grade;
            this.commentText = submission.feedback ?? '';
            this.graded = true;
          }

          getTask$.unsubscribe();
          getSubmission$.unsubscribe();
          this.API.hideLoader();
        });
      });
    }

    toNumber(value: string): number {
      return Number(value);
    }

    enforceGradeLimit(event: Event): void {
      const input = event.target as HTMLInputElement;

      // Remove non-numeric characters
      input.value = input.value.replace(/[^0-9]/g, '');

      // Limit to 3 characters
      if (input.value.length > 3) {
        input.value = input.value.substring(0, 3);
      }

      // Update the ngModel manually
      this.gradingText = input.value;

      // Validate and adjust the number to ensure it's within the range 1-100
      const grade = this.toNumber(this.gradingText);
      if (grade < 1) {
        this.gradingText = '1';
      } else if (grade > 100) {
        this.gradingText = '100';
      }
    }


    parseFileList(fileList: string): { name: string, url: string }[] {
      if (!fileList) return [];

      // Split the file list on commas, then split each entry on '>'
      return fileList.split(',').map(file => {
        const [url, name] = file.split('>');

        // Make sure that both URL and name exist, if not handle it gracefully
        return {
          url: url ? url.trim() : '',
          name: name ? name.trim() : 'Unknown File'
        };
      });
    }



    openFile(fileUrl: string): void {
      this.API.openFile(fileUrl);
    }


    gradingText: string = '';
    commentText: string = '';

    studentComments: string[] = [
      // 'BOTO BOTO ',
    ];


    submitGrades(): void {
      if (this.graded) {
        this.API.successSnackbar('This student already has a grade.');
        return;
      }

      if (!this.API.checkInputs([this.gradingText])) {
        this.API.failedSnackbar('Please input a grade.');
        return;
      }

      this.API.justSnackbar('Grading student....', 9999999);
      this.API.teacherGradeTask(this.submissionID, this.gradingText, this.commentText.trim() === '' ? undefined : this.commentText).subscribe(() => {
        this.API.successSnackbar('Graded a student!');
        this.API.teacherGetStudentAssignment(this.submissionID).subscribe(submissionData => {
          const submission = submissionData.output[0];
          this.gradingText = submission.grade;
          this.commentText = submission.feedback ?? '';
          this.graded = true;
        });

        this.API.pushNotifications(
          `${this.API.getFullName()} graded your assignment.`,
          `${this.API.getFullName()} graded your assignment titled, <b>'${this.task.title}'</b>, <br>
            <b>Grade: </b> ${this.gradingText} <br>
            ${this.commentText.trim() === '' ? '' : '<b>Comment: </b>' + this.commentText}`,
          this.studentID
        );
      });
    }


    goBack(): void {
      // Implement the logic to navigate back
      this.router.navigate(['teacher/task-management']);
    }
  }
