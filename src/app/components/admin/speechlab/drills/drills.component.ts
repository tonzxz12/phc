import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from 'src/app/services/API/api.service';
import { UploadDrillComponent } from '../modal/upload-drill/upload-drill.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-drills',
  templateUrl: './drills.component.html',
  styleUrls: ['./drills.component.css'],
  animations: [
    trigger('openClose', [
      state('void', style({
        opacity: 0,
      })),
      transition('void => *', [
        animate('300ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition('* => void', [
        animate('300ms ease-in-out', style({ opacity: 0 }))
      ]),
    ]),
  ],
})
export class DrillsComponent {
  private unsubscribe$ = new Subject<void>();
  showForm = false;
  practiceName = '';

  // Pagination parameters for practices
  practicePage = 1;
  practicePageSize = 10;

  // Pagination parameters for drills
  drillPage = 1;
  drillPageSize = 10;

  constructor(private modalService: NgbModal, private API: APIService) { }

  ngOnInit(): void {
    this.loadModules();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  practices: any[] = [];
  drills: any[] = [];

  loadModules() {
    this.API.showLoader();
    this.API.loadSpeechAllModules(true)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(data => {
        if (data.success) {
          this.drills = [];
          this.practices = data.output;
          this.loadLessons();
        } else {
          this.API.hideLoader();
        }
      });
  }

  loadLessons() {
    this.API.loadSpeechAllLessons(true)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(data => {
        if (data.success) {
          console.log('HERE', data.output);
          this.drills = data.output;
        }
        this.API.hideLoader();
      });
  }

  // loadLesson:any[] = [{
  //   id: 1,
  //   drillFile: 'Lesson 1 example',
  //   quizFile: 'drill1.pdf',
  // },
  // {
  //   id: 2,
  //   drillFile: 'Lesson 2 example',
  //   quizFile: 'drill2.pdf',
  // }]


  // Pagination methods for practices and drills
  get paginatedPractices() {
    const start = (this.practicePage - 1) * this.practicePageSize;
    return this.practices.slice(start, start + this.practicePageSize);
  }

  get paginatedDrills() {
    const start = (this.drillPage - 1) * this.drillPageSize;
    return this.drills.slice(start, start + this.drillPageSize);
  }

  // Methods for handling pagination changes
  nextPagePractices() {
    if (this.practicePage * this.practicePageSize < this.practices.length) {
      this.practicePage++;
    }
  }

  prevPagePractices() {
    if (this.practicePage > 1) {
      this.practicePage--;
    }
  }

  nextPageDrills() {
    if (this.drillPage * this.drillPageSize < this.drills.length) {
      this.drillPage++;
    }
  }

  prevPageDrills() {
    if (this.drillPage > 1) {
      this.drillPage--;
    }
  }

  openEdit(content: any) {
    this.modalService.open(content);
  }




  openModal() {
    const modalRef = this.modalService.open(UploadDrillComponent);
    modalRef.componentInstance.practices = this.practices;
    modalRef.componentInstance.drills = this.drills;
    const obs$ = modalRef.dismissed.subscribe(data => {
      if (data == 'saved') {
        this.API.successSnackbar('Drill Added')
        this.loadLessons();
      }
      obs$.unsubscribe();
    })
  }

  savePractice(practice: any) {
    const obs = this.API.editSpeechModule(practice.id, practice.name, true).subscribe(data => {
      this.API.successSnackbar("Practice Updated!")
      obs.unsubscribe();
      this.loadModules();
    })
  }

  openModalModule() {
    // const modalRef = this.modalService.open(UploadLessonComponent);
    // modalRef.componentInstance.isModule = true;
  }

  addModule() {

    const obs = this.API.createSpeechModule(`Practice ${this.practices.length + 1}`, true).subscribe(data => {
      this.API.successSnackbar("Practice Added!")
      obs.unsubscribe();
      this.loadModules();
    })

  }

  practiceUid: string = ''; // Stores the currently selected practice ID
  modalPractice: { [key: string]: boolean } = {};
  // Opens the delete modal and stores the practice ID
  deleteModal(practiceID: string) {
    this.modalPractice[practiceID] = true; // Open modal for this practice ID
    this.practiceUid = practiceID; // Set the current practice ID
  }

  // Closes the modal for the specific practice ID
  modalClose() {
    this.modalPractice[this.practiceUid] = false; // Close modal for the current practice ID
    this.practiceUid = ''; // Reset the practice ID
  }

  deleteModule(practiceID: string) {
    const obs = this.API.deleteSpeechModule(practiceID, true).subscribe(data => {
      this.API.successSnackbar("Practice deleted!")
      obs.unsubscribe();
      this.loadModules();
      this.modalClose();
    })
  }



  drillUid: string = '';
  modalDrill: { [key: string]: boolean } = {};
  selectedDrill: any = null;  // Store the selected drill object

  deleteModalDrill(drill: any) {
    this.modalDrill[drill.id] = true;
    this.drillUid = drill.id;
    this.selectedDrill = drill;  // Save the selected drill for deletion
  }

  modalCloseDrill() {
    this.modalDrill[this.drillUid] = false;
    this.drillUid = '';
    this.selectedDrill = null;  // Reset the selected drill
  }

  deleteLesson() {
    if (!this.selectedDrill) return;

    const obs = this.API.deleteSpeechLesson(this.selectedDrill.id, true).subscribe(data => {
      this.API.deleteFile(this.selectedDrill.drillfile.split(">")[0]);
      this.API.deleteFile(this.selectedDrill.audiofile.split(">")[0]);
      this.API.successSnackbar("Drill deleted!");
      obs.unsubscribe();
      this.loadLessons();
      this.modalCloseDrill();  // Close the modal after deleting
    });
  }


  editLesson(drill: any) {
    const modalRef = this.modalService.open(UploadDrillComponent);
    modalRef.componentInstance.practices = this.practices;
    modalRef.componentInstance.drills = this.drills;
    modalRef.componentInstance.drill = drill;
    const obs$ = modalRef.dismissed.subscribe(data => {
      if (data == 'saved') {
        this.API.successSnackbar('Drill Updated')
        this.loadLessons();
      }
      obs$.unsubscribe();
    })
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

}
