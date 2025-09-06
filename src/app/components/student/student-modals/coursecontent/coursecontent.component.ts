import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-coursecontent',
  templateUrl: './coursecontent.component.html',
  styleUrls: ['./coursecontent.component.css']
})
export class CoursecontentComponent implements OnInit, AfterViewInit {
  @Input() course: any;
  lessons: any = [];
  courseCode: string = '';
  showFullContent: boolean = false;
  showReadMoreButton: boolean = false;

  @Input() autoFillCourseCode: string = '';
  @Input() isQrEnrollment: boolean = false;

  @ViewChild('detailsContent') detailsContent!: ElementRef;

  constructor(
    private API: APIService,
    config: NgbRatingConfig,
    private router: Router,
    public activeModal: NgbActiveModal
  ) {
    // customize default values of ratings used by this component tree
    config.max = 5;
    config.readonly = true;
  }

  ngOnInit(): void {
    console.log('=== COURSECONTENT COMPONENT INIT ===');
    console.log('autoFillCourseCode received:', this.autoFillCourseCode);
    console.log('isQrEnrollment received:', this.isQrEnrollment);
    console.log('course received:', this.course);
    console.log('courseCode before auto-fill:', this.courseCode);
    
    // Auto-fill course code if coming from QR enrollment
    if (this.autoFillCourseCode) {
        this.courseCode = this.autoFillCourseCode;
        console.log('=== AUTO-FILL SUCCESS ===');
        console.log('Course code auto-filled to:', this.courseCode);
    } else {
        console.log('=== NO AUTO-FILL ===');
        console.log('autoFillCourseCode is empty or undefined');
    }

    if (this.course && this.course.id) {
        this.API.teacherCourseLessons(this.course.id).subscribe(data => {
            this.lessons = this.API.returnSuccess(data, 'Failed loading lessons');
        });
    }
  }

  ngAfterViewInit(): void {
    this.checkOverflow();
  }

  checkOverflow(): void {
    if (this.detailsContent) {
      const contentElement = this.detailsContent.nativeElement;
      this.showReadMoreButton = contentElement.scrollHeight > contentElement.clientHeight;
    }
  }

  getUrl(file: string) {
    return this.API.getURL(file) ?? this.API.noProfile();
  }

  // enroll() {
  //   if (this.courseCode.trim() == '') {
  //     this.API.failedSnackbar('Enter course code');
  //     return;
  //   }
  //   this.API.justSnackbar('Enrolling course...');
  //   this.API.matchCourseCode(this.course.id, this.courseCode).subscribe(data => {
  //     if (data.output.length > 0) {
  //       this.API.enrollCourse(data.output[0].id).subscribe(() => {
  //         this.API.pushNotifications(
  //           `${this.API.getFullName()} enrolled to your course, <b>'${this.course.course}'</b>`,
  //           `${this.API.getFullName()} enrolled to your course, <b>'${this.course.course}'</b>. This student will now have access to your lessons and activities in the said course.`,
  //           this.course.teacherid
  //         );
  //         this.API.successSnackbar('Congratulations! You are officially enrolled in ' + this.course.course);
  //         this.activeModal.close(true);
  //       });
  //     } else {
  //       this.API.failedSnackbar('Invalid Course Code!');
  //     }
  //   });
  // }

  enroll() {
    if (this.courseCode.trim() == '') {
      this.API.failedSnackbar('Enter course code');
      return;
    }

    console.log('=== ENROLLMENT DEBUG ===');
    console.log('Course code entered:', this.courseCode);
    console.log('Course ID:', this.course.id);
    console.log('Is QR enrollment:', this.isQrEnrollment);
    console.log('Auto-filled code:', this.autoFillCourseCode);
    
    this.API.justSnackbar('Enrolling course...');
    
    // For QR enrollment, use the course ID directly
    this.API.matchCourseCode(this.course.id, this.courseCode).subscribe(data => {
        console.log('Match course code response:', data);
        
        if (data.output.length > 0) {
            const classId = data.output[0].id;
            console.log('Found class ID:', classId);
            
            this.API.enrollCourse(classId).subscribe((enrollResponse) => {
                console.log('Enrollment response:', enrollResponse);
                
                this.API.pushNotifications(
                    `${this.API.getFullName()} enrolled to your course, <b>'${this.course.course}'</b>`,
                    `${this.API.getFullName()} enrolled to your course, <b>'${this.course.course}'</b>. This student will now have access to your lessons and activities in the said course.`,
                    this.course.teacherid
                );
                this.API.successSnackbar('Congratulations! You are officially enrolled in ' + this.course.course);
                this.activeModal.close(true);
            }, (enrollError) => {
                console.error('Enrollment error:', enrollError);
                this.API.failedSnackbar('Error during enrollment. Please try again.');
            });
        } else {
            console.error('No matching class found for course code:', this.courseCode);
            this.API.failedSnackbar('Invalid Course Code!');
        }
    }, (matchError) => {
        console.error('Course code matching error:', matchError);
        this.API.failedSnackbar('Error validating course code. Please try again.');
    });
  }

  openCourse(courseID: string) {
    this.API.setCourse(courseID);
    this.router.navigate(['/student/lessons']);
  }

  toggleReadMore() {
    this.showFullContent = !this.showFullContent;
  }

  navigateToCourseforum(courseId: string) {
    this.activeModal.close();
    this.router.navigate(['/course-forum', courseId]);
  }

  close() {
    this.activeModal.close();
  }
}
