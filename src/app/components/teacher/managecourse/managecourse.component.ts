

import { Component, OnInit, Output } from '@angular/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { CreateCourseComponent } from '../teacher-modals/create-course/create-course.component';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';
import { EditCourseComponent } from '../teacher-modals/edit-course/edit-course.component';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-tlesson',
  templateUrl: './managecourse.component.html',
  styleUrls: ['./managecourse.component.css']
})
export class ManageCourseComponent implements OnInit {
  languages: Map<string, any> = new Map();
  selectedLanguage: string = '';
  courseProgress: number = 100; // Set this to your desired initial value (e.g., 50%).
  qrCodeDataUrls: Map<string, string> = new Map();

  displayQRModal: boolean = false;
  currentQRCode: string = '';
  currentCourseForQR: any = null;

  showClassSelectionModal: boolean = false;
  currentCourseClasses: any[] = [];
  currentCourseForClassSelection: any = null;

  getLiquidTopPosition(): string {
    return `-${this.courseProgress}px`; // Convert course progress to negative value for the top position
  }

   updateProgress(newProgress: number) {
    this.courseProgress = newProgress;
  }


  constructor(private modalService: NgbModal, private API: APIService, private router: Router) { }

  courseData: any = [];
  quizzes: any = [];
  topics: any= [];


  ngOnInit(): void {
    this.getQuizzes();

    this.API.getAllLanguages().subscribe(data => {
      if (data.success) {
        for (let language of data.output) {
          this.languages.set(language.language, language);
        }
      } else {
        this.API.failedSnackbar('Failed loading data');
      }
    });
    this.getTeacherCourses();
  }




  getQuizzes() {
    this.API.showLoader();
    this.API.teacherGetQuizzes().subscribe((data) => {
      this.quizzes = data.output;
      console.log("hahahaa", data.output);
      this.API.hideLoader();

    });
  }

  languageSelected(language: string) {
    this.selectedLanguage = language;
  }

  getTeacherCourses() {
    this.API.showLoader();
    this.courseData = [];
    this.API.teacherAllCourses().subscribe(data => {
      console.log('API response:', data);
      if (data.success) {
        for (let course of data.output) {
          let mode = 'LRSW';
          if (course.filter != null) {
            mode = course.filter;
          }

        let targetAudience = course.target_audience.replace(/[{}]/g, '').split(',');
        let technicalRequirements = course.technical_requirements.replace(/[{}]/g, '').split(',');

          try {
            targetAudience = course.target_audience ? JSON.parse(course.target_audience) : [];
          } catch (error) {
            console.error('Error parsing targetAudience:', error);
          }

          try {
            technicalRequirements = course.technical_requirements ? JSON.parse(course.technical_requirements) : [];
          } catch (error) {
            console.error('Error parsing technicalRequirements:', error);
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

        this.generateQRCodesForCourses();

        this.API.hideLoader();
      } else {
        this.API.failedSnackbar('Failed loading courses');
      }
    });
  }

  removeCourse(courseID: string) {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Remove it!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.API.deleteCourse(courseID).subscribe(() => {
          this.getTeacherCourses();
          Swal.fire({
            title: "Removed!",
            text: "Your file has been deleted.",
            icon: "success"
          });
        });
      }
    });
  }

  editCourse(course: any) {
    this.router.navigate(['teacher/manage-lessons', { cid: course.id }]);
  }

  openModal() {
    const modalOptions: NgbModalOptions = {
      centered: false
    };

    const modalRef = this.modalService.open(CreateCourseComponent, modalOptions);
    modalRef.componentInstance.myCustomClass = 'custom-modal'; // Pass the custom class name
    modalRef.componentInstance.languages = this.languages;
    modalRef.closed.subscribe(data => {
      if (data != null) {
        this.getTeacherCourses();
      }
    });
  }

  getURL(file: string) {
    if (file.includes('http')) {
      return file;
    } else {
      return this.API.getURL(file);
    }
  }

  openEdit(course: any) {
    
    const modalOptions: NgbModalOptions = {
      centered: false
    };
    console.log(course);
    const modalRef = this.modalService.open(EditCourseComponent, modalOptions);
    modalRef.componentInstance.myCustomClass = 'custom-modal';
    modalRef.componentInstance.languages = this.languages;
    modalRef.componentInstance.info = course;

    modalRef.closed.subscribe(data => {
      if (data != null) {
        this.getTeacherCourses();
      }
    });
  }
  async showCertificateModal(course: any) {
    const imageUrl = 'assets/cert/qlab.png'; 
    const teacherSign = this.API.getUserData().esign;
    const response = await firstValueFrom(this.API.getCNSCPresident());
    if (response.output.length <= 0) {
      this.API.failedSnackbar('Unable to retrieve certificate information');
    }
    const president = response?.output?.[0];
    if (!teacherSign) {
      this.API.failedSnackbar('Please sign the certificate on your profile.');
    }
    if (!president?.esign) {
      this.API.failedSnackbar('President have not signed the certificate yet.');
    }
   
  
    const result = await Swal.fire({
      title: 'Certificate Preview',
      html: `
        <div style="width: 740px; position: relative;" class='select-none overflow-hidden'>
          <div class='relative w-full h-[500px]'>
            <div class='absolute top-[54%] left-6 w-full flex justify-center z-10 font-semibold text-3xl text-black'>
              JUAN DE LA CRUZ
            </div>
    
            <div class='absolute top-[64.8%] left-6 w-full flex justify-center z-10 font-bold text-xs text-black'>
              ${course.title.toUpperCase()}
            </div>
    
            <div class='absolute bottom-[9.2%] left-[19%] w-full flex justify-center z-20'>
              <img src ='${teacherSign ? this.API.getURL(teacherSign) : ''}' class=' h-24 w-32 object-contain ${teacherSign ? '' : 'hidden'}'>
            </div>
            <div class='absolute bottom-[13%] left-[19%] w-full flex justify-center z-10 font-bold text-xs text-black'>
              ${this.API.getFullName().toUpperCase()}
            </div>
            <div class='absolute bottom-[9.2%] right-[10%] w-full  flex justify-center z-20'>
              <img src ='${president?.esign ? this.API.getURL(president?.esign) : ''}' class=' h-24 w-32  object-contain ${president?.esign ? '' : 'hidden'}'>
            </div>
            <div class='absolute bottom-[13%] right-[10%] w-full flex justify-center z-10 font-bold text-xs text-black'>
              ${president ? president.firstname.toUpperCase() + ' ' + president.lastname.toUpperCase() : ''}
            </div>
    
            <!-- Adjust the image element here -->
            <img src="${imageUrl}" alt="Certificate" style="position: relative; height: 100%; width:100%; object-fit: contain; z-index: 5;">
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Distribute',
      showCancelButton: true,
      cancelButtonText: 'Close',
      customClass: {
        popup: 'wide-popup',
      },
      width: '800px',
      preConfirm: async () => {
        return Swal.fire({
          title: 'Distribute Certificates',
          text: 'Are you sure you want to distribute certificates to the eligible students?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, distribute',
          cancelButtonText: 'Cancel'
        }).then(async (confirmResult) => {
          if (confirmResult.isConfirmed) {
            this.API.distributeCertificates(course.id)
            Swal.fire('Certificates Distributed', 'Certificates have been successfully distributed to eligible students.', 'success');
          }
        });
      }
    });
    
    if (result.dismiss === Swal.DismissReason.cancel) {
      console.log('Certificate preview closed without distribution.');
    }
    
    
    if (result.dismiss === Swal.DismissReason.cancel) {
      console.log('Certificate preview closed without distribution.');
    }
    
    

    if (result.dismiss === Swal.DismissReason.cancel) {
      console.log('Certificate preview closed without distribution.');
    }
  }

  // redirectToLessons(courseID: string) {
  //   this.API.setCourse(courseID);
  //   this.router.navigate(['/teacher/lessons'], { queryParams: { hideMarkAsDone: true } });
  // }


  // managecourse.component.ts
redirectToLessons(courseID: string) {
  this.API.setCourse(courseID);
  // Find the course to get its title and pretest
  const selectedCourse = this.courseData.find((course: { id: string; }) => course.id === courseID);
  this.router.navigate(['/teacher/lessons'], { 
    queryParams: { 
      hideMarkAsDone: true,
      courseTitle: selectedCourse?.title,
      coursePretest: selectedCourse?.pretest // Add pretest if it exists in your course data
    } 
  });
}

navigateToCourseForum(courseId: string) {
  this.router.navigate(['/teacher/course-forum', courseId]);
}

  trimText(text: string, wordLimit: number): string {
    if (!text) return '[NONE]';
    const words = text.split(' ');
    return words.length > wordLimit ? words.slice(0, wordLimit).join(' ') + '...' : text;
  }

  async generateQRCodesForCourses(): Promise<void> {
    if (!this.courseData || this.courseData.length === 0) return;
    
    for (const course of this.courseData) {
      try {
        // Create enrollment URL that opens the coursecontent modal
        const enrollmentUrl = `https://caringwithgraces.com//student/qr-enroll/${course.id}`;
        
        const qrDataUrl = await QRCode.toDataURL(enrollmentUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        this.qrCodeDataUrls.set(course.id, qrDataUrl);
      } catch (error) {
        console.error(`Error generating QR code for course ${course.id}:`, error);
      }
    }
  }

  getQRCodeForCourse(courseId: string): string {
    return this.qrCodeDataUrls.get(courseId) || '';
  }

  async generateQRForClass(courseId: string, classId: string, classcode: string): Promise<void> {
    try {
      // Generate enrollment URL with both course ID and class ID
      const enrollmentUrl = `https://caringwithgraces.com/student/qr-enroll/${courseId}?classId=${classId}`;
      
      const qrDataUrl = await QRCode.toDataURL(enrollmentUrl, {
        width: 512,
        margin: 3,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      
      // Set current QR and close class selection modal
      this.currentQRCode = qrDataUrl;
      this.currentCourseForQR = {
        ...this.currentCourseForClassSelection,
        selectedClass: { id: classId, classcode: classcode }
      };
      this.showClassSelectionModal = false;
      this.displayQRModal = true;
      
      console.log('QR code generated for class:', classcode);
      
    } catch (error) {
      console.error('Error generating QR code for class:', error);
      this.API.failedSnackbar('Error generating QR code');
    }
  }

  closeClassSelectionModal(): void {
    this.showClassSelectionModal = false;
    this.currentCourseClasses = [];
    this.currentCourseForClassSelection = null;
  }


  async showQRModal(course: any): Promise<void> {
      console.log('=== QR MODAL DEBUG ===');
      console.log('Course ID:', course.id);
      console.log('Course object:', course);
      
      this.currentCourseForClassSelection = course;
      
      try {
          // Use the working method from ManageClass
          const classesResponse = await this.API.getClassesByCourseIdWorking(course.id).toPromise();
          console.log('Classes API response:', classesResponse);
          console.log('Classes output:', classesResponse.output);
          
          if (classesResponse.success && classesResponse.output && classesResponse.output.length > 0) {
              this.currentCourseClasses = classesResponse.output.map((cls: any) => ({
                  id: cls.id,
                  classcode: cls.classcode,
                  classname: cls.class,
                  courseid: cls.courseid,
                  studentcount: cls.studentcount || 0
              }));
              console.log('Classes found for course:', this.currentCourseClasses);
              this.showClassSelectionModal = true;
          } else {
              console.error('No classes found or API failed');
              this.API.failedSnackbar('No classes found for this course. Create a class first.');
              this.showClassSelectionModal = false;
              
              // Optionally redirect to class management
              // this.router.navigate(['/teacher/manageclass']);
          }
      } catch (error) {
          console.error('Error loading classes:', error);
          this.API.failedSnackbar('Error loading classes. Please try again.');
          this.showClassSelectionModal = false;
      }
  }

  showCourseQRInfo(course: any): void {
    this.showQRModal(course);
  }

  loadCoursesAndGenerateQR(): void {
    // Your existing course loading logic
    // After courseData is populated:
    this.generateQRCodesForCourses();
  }

  closeQRModal(): void {
    this.displayQRModal = false;
    this.currentQRCode = '';
    this.currentCourseForQR = null;
  }

  downloadQRCode(): void {
    if (!this.currentQRCode || !this.currentCourseForQR) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add header background
    pdf.setFillColor(71, 30, 61);
    pdf.rect(0, 0, 210, 40, 'F');
    
    // Add header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${environment.appTitle} - Class QR Code`, 105, 25, { align: 'center' });

    // Reset text color
    pdf.setTextColor(0, 0, 0);

    // Add course title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const title = this.currentCourseForQR.title;
    const titleLines = pdf.splitTextToSize(title, 170);
    pdf.text(titleLines, 20, 60);

    // Add class code
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    let yPos = 80;
    if (this.currentCourseForQR.selectedClass) {
      pdf.text(`Class Code: ${this.currentCourseForQR.selectedClass.classcode}`, 20, yPos);
      yPos += 15;
    }

    // Add course ID
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Course ID: ${this.currentCourseForQR.id}`, 20, yPos);
    yPos += 15;

    // Add course description if available
    if (this.currentCourseForQR.description) {
      pdf.setFontSize(12);
      pdf.text('Description:', 20, yPos);
      yPos += 8;
      const descLines = pdf.splitTextToSize(this.currentCourseForQR.description, 170);
      pdf.text(descLines, 20, yPos);
      yPos += Math.min(descLines.length * 6, 30) + 15;
    }

    // Add QR code
    const qrSize = 80;
    const xPosition = (210 - qrSize) / 2;
    yPos = Math.max(yPos, 120);

    pdf.addImage(this.currentQRCode, 'PNG', xPosition, yPos, qrSize, qrSize);

    // Add scan instructions
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Scan this QR code to join the class', 105, yPos + qrSize + 15, { align: 'center' });

    // Add footer
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    const date = new Date().toLocaleDateString();
    pdf.text(`Generated on ${date}`, 105, 280, { align: 'center' });

    // Save the PDF with class code
    const fileName = `class-${this.currentCourseForQR.selectedClass?.classcode || 'unknown'}-qr.pdf`;
    pdf.save(fileName);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message
      console.log('Course ID copied to clipboard');
      // You can add a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
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
}