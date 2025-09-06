import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CoursecontentComponent } from '../student-modals/coursecontent/coursecontent.component';

@Component({
  selector: 'app-qr-enrollment',
  templateUrl: './qr-enrollment.component.html',
  styleUrls: ['./qr-enrollment.component.css']
})
export class QrEnrollmentComponent implements OnInit {
  course: any = null;
  courseId: string = '';
  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private API: APIService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    console.log('QR Enrollment Component loaded');

    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    const classId = this.route.snapshot.queryParamMap.get('classId') || undefined;
    
    console.log('Course ID from route:', this.courseId);
    console.log('Class ID from route:', classId);

    if (this.courseId) {
        this.loadCourseAndShowModal(classId);
    } else {
        this.API.failedSnackbar('Invalid course link');
        this.router.navigate(['/student/dashboard']);
    }
  }

  async loadCourseAndShowModal(classId?: string): Promise<void> {
      try {
        console.log('=== LOADING COURSE DEBUG ===');
        console.log('Course ID:', this.courseId);
        console.log('Class ID:', classId);
        
        const courseResponse = await this.API.teacherGetCoursebyID(this.courseId).toPromise();
        console.log('Course response:', courseResponse);
        
        if (courseResponse.success && courseResponse.output.length > 0) {
            this.course = courseResponse.output[0];
            console.log('Course loaded:', this.course);
            
            // If classId is provided, get the SPECIFIC class, not just any class for the course
            if (classId) {
                console.log('=== LOADING SPECIFIC CLASS WITH ID:', classId, '===');
                try {
                    const classResponse = await this.API.getSpecificClass(classId).toPromise();
                    console.log('Specific class response:', classResponse);
                    
                    if (classResponse.success && classResponse.output.length > 0) {
                        this.course.selectedClass = classResponse.output[0];
                        console.log('Specific class loaded:', this.course.selectedClass);
                        console.log('Class code for class ID', classId, ':', this.course.selectedClass.classcode);
                    } else {
                        console.warn('Class with ID', classId, 'not found');
                    }
                } catch (classError) {
                    console.error('Error loading specific class:', classError);
                }
            }
            
            // Check enrollment
            try {
                const enrollmentCheck = await this.API.checkIfEnrolled(this.course.id).toPromise();
                if (enrollmentCheck && enrollmentCheck.enrolled) {
                    this.API.successSnackbar('You are already enrolled in this course!');
                    this.router.navigate(['/student/dashboard']);
                    return;
                }
            } catch (enrollmentError) {
                console.warn('Could not check enrollment status:', enrollmentError);
            }
            
            this.showEnrollmentModal(this.course);
            
        } else {
            this.API.failedSnackbar('Course not found');
            this.router.navigate(['/student/dashboard']);
        }
    } catch (error) {
        console.error('Error loading course:', error);
        this.API.failedSnackbar('Error loading course details');
        this.router.navigate(['/student/dashboard']);
    } finally {
        this.loading = false;
    }
  }

  showEnrollmentModal(course: any): void {
    console.log('=== OPENING ENROLLMENT MODAL ===');
    console.log('Course passed to modal:', course);
    console.log('Selected class:', course.selectedClass);
    
    const modalRef = this.modalService.open(CoursecontentComponent, {
        size: 'lg',
        centered: true,
        backdrop: 'static'
    });

    // Determine what to auto-fill
    let autoFillCode = '';
    if (course.selectedClass && course.selectedClass.classcode) {
        autoFillCode = course.selectedClass.classcode;
        console.log('Using specific class code:', autoFillCode);
    } else if (course.classcode) {
        autoFillCode = course.classcode;
        console.log('Using course class code:', autoFillCode);
    } else {
        // Fallback to course ID if no class code available
        autoFillCode = course.id;
        console.log('No class code found, using course ID as fallback:', autoFillCode);
    }

    modalRef.componentInstance.course = course;
    modalRef.componentInstance.autoFillCourseCode = autoFillCode;
    modalRef.componentInstance.isQrEnrollment = true;

    console.log('=== MODAL INSTANCE PROPERTIES ===');
    console.log('course:', modalRef.componentInstance.course);
    console.log('autoFillCourseCode:', modalRef.componentInstance.autoFillCourseCode);
    console.log('isQrEnrollment:', modalRef.componentInstance.isQrEnrollment);

    modalRef.result.then((result) => {
        if (result === true) {
            this.API.successSnackbar('Successfully enrolled in the course!');
            this.router.navigate(['/student/dashboard']);
        } else {
            this.router.navigate(['/student/dashboard']);
        }
    }).catch(() => {
        this.router.navigate(['/student/dashboard']);
    });
}
}