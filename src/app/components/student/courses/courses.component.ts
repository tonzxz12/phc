// courses.component.ts
import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { CoursecontentComponent } from '../student-modals/coursecontent/coursecontent.component';
import { PopupQuizPageComponent } from '../popup-quiz-page/popup-quiz-page.component'; // Updated import
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: any = [];
  showDropdown: boolean = false;
  selectedDifficulty: string | null = null;
  selectedValue!: any;
  quizPoints: Map<string, any> = new Map();

  constructor(
    private API: APIService,
    private router: Router,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getCourses();
    this.loadQuizPoints();
  }

  async getCourses() {
    this.API.showLoader();
    this.cdr.detectChanges();
    this.API.setLoaderMessage('Getting the best courses for you!');
    try {
      const data = await firstValueFrom(this.API.getCourses());
       const coursesPromises = data.output.map(async (course: any) => {
        const _course = { ...course };
        if (_course.complexity == null) _course.complexity = 1;
        _course.enrolled = Number(course.enrolled);
        _course.pretest = await this.API.courseRequiresPretest(course.id);
        return _course;
      });
       this.courses = await Promise.all(coursesPromises);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      this.API.hideLoader();
      this.cdr.detectChanges();
    }
  }

  async getPretestAssessmentId(courseId: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.API.post('get_entries', {
          data: JSON.stringify({
            selectors: ['id'],
            tables: 'assessments',
            conditions: { WHERE: { CourseID: courseId, pretest: true } },
          }),
        })
      );
      return response.success && response.output.length > 0 ? response.output[0].id : null;
    } catch (error) {
      this.API.failedSnackbar('Failed to load pretest assessment.');
      return null;
    }
  }

  async loadQuizPoints() {
    try {
      const response = await firstValueFrom(this.API.studentQuizPoints());
      for (let quiz of response.output) {
        this.quizPoints.set(quiz.assessmentid, quiz);
      }
    } catch (error) {
      this.API.failedSnackbar('Failed to load quiz points.');
    }
  }

  getQuizPoint(quizID: string): string | null {
    const quiz = this.quizPoints.get(quizID);
    return quiz ? `${quiz.takenpoints}/${quiz.totalpoints}` : null;
  }

  async checkIfEnrolled(course: any) {
    if (course.pretest) {
      if (!course.enrolled) {
        this.openModal(course);
        return;
      }

      const hasPretest = await this.API.pretestExists(course.id);
      if (!hasPretest) {
        this.API.failedSnackbar('No pretest assessment found.');
        return;
      }

      const quizID = await this.getPretestAssessmentId(course.id);
      if (!quizID) {
        this.API.failedSnackbar('Failed to load pretest assessment ID.');
        return;
      }

      const quizPoint = this.getQuizPoint(quizID);
      if (quizPoint !== null) {
        this.openCourse(course.id);
        return;
      }

      const ref = this.modalService.open(PopupQuizPageComponent, {
        windowClass: 'custom-modal',
        size: 'lg',
      });
      ref.componentInstance.quizID = quizID;

      try {
        const result = await firstValueFrom(ref.closed);
        if (result !== undefined) {
          await this.loadQuizPoints(); // Refresh quiz points
          await this.getCourses(); // Reload courses
          this.openCourse(course.id); // Proceed after pretest
        }
      } catch (error) {
        this.API.failedSnackbar('Error completing the quiz.');
      }
    } else {
      if (course.enrolled) this.openCourse(course.id);
      else this.openModal(course);
    }
  }

  toggleDropdown(selectedDifficulty: string) {
    this.showDropdown = !this.showDropdown;
  }

  selectDifficulty(difficulty: string | null) {
    this.selectedDifficulty = difficulty;
    this.showDropdown = false;
    switch (difficulty) {
      case 'Beginner': this.selectedValue = { min: 1, max: 2 }; break;
      case 'Intermediate': this.selectedValue = { min: 3, max: 4 }; break;
      case 'Advanced': this.selectedValue = { min: 5, max: 5 }; break;
    }
  }

  getUrl(file: string) {
    return this.API.getURL(file) ?? this.API.noProfile();
  }

  checkComplexity(complexity: number) {
    return this.selectedValue ? complexity >= this.selectedValue.min && complexity <= this.selectedValue.max : false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isInsideDropdown(event.target as HTMLElement)) {
      this.showDropdown = false;
    }
  }

  isInsideDropdown(target: HTMLElement | null): boolean {
    let currentElement = target;
    while (currentElement) {
      if (currentElement.classList?.contains('dropdown')) return true;
      currentElement = currentElement.parentElement;
    }
    return false;
  }


  openCourse(courseID: string) {
    this.API.setCourse(courseID);
    this.router.navigate(['/student/lessons']);
  }

  openModal(course: any) {
    const ref = this.modalService.open(CoursecontentComponent, { windowClass: 'custom-modal' });
    ref.componentInstance.course = course;
    ref.closed.subscribe(enrolled => {
      if (enrolled) this.getCourses();
    });
  }
}