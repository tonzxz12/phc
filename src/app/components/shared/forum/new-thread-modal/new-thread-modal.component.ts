import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-new-thread-modal',
  templateUrl: './new-thread-modal.component.html',
  styleUrls: ['./new-thread-modal.component.css']
})
export class NewThreadModalComponent implements AfterViewInit {
  @Input() selectedClass: any = null;
  @Input() isTeacher: boolean = false;
  @Output() threadCreated = new EventEmitter<any>();
  @ViewChild('newThreadModal', { static: false }) modal!: ElementRef;

  threadForm: FormGroup;
  isSubmitting = false;
  private bootstrapModal: any;

  constructor(
    private fb: FormBuilder,
    private apiService: APIService
  ) {
    this.threadForm = this.fb.group({
      title: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(200)
      ]],
      body: ['', [
        Validators.required,
        Validators.minLength(10)
      ]],
      isPinned: [false],
      isLocked: [false]
    });
  }

  ngAfterViewInit() {
    // Initialize Bootstrap modal
    if (typeof (window as any).bootstrap !== 'undefined') {
      this.bootstrapModal = new (window as any).bootstrap.Modal(this.modal.nativeElement);
    }
  }

  openModal() {
    this.resetForm();
    if (this.bootstrapModal) {
      this.bootstrapModal.show();
    } else {
      // Fallback for jQuery/older Bootstrap
      this.modal.nativeElement.style.display = 'block';
      this.modal.nativeElement.classList.add('show');
      document.body.classList.add('modal-open');
    }
  }

  closeModal() {
    if (this.bootstrapModal) {
      this.bootstrapModal.hide();
    } else {
      // Fallback for jQuery/older Bootstrap
      this.modal.nativeElement.style.display = 'none';
      this.modal.nativeElement.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
    this.resetForm();
  }

  resetForm() {
    this.threadForm.reset({
      title: '',
      body: '',
      isPinned: false,
      isLocked: false
    });
    this.isSubmitting = false;
  }

  onSubmit() {
    if (this.threadForm.invalid || !this.selectedClass) {
      return;
    }

    this.isSubmitting = true;
    const formData = this.threadForm.value;
    const courseId = this.selectedClass.id || this.selectedClass.ID;

    const threadData = {
      courseid: courseId,
      title: formData.title.trim(),
      body: formData.body.trim(),
      isLocked: this.isTeacher ? formData.isLocked : false
    };

    this.apiService.createCourseForumThread(threadData).subscribe({
      next: (response) => {
        if (response.success) {
          this.apiService.successSnackbar('Thread created successfully!');
          this.threadCreated.emit(response.output);
          this.closeModal();
        } else {
          this.apiService.failedSnackbar(response.output || 'Failed to create thread');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error creating thread:', error);
        this.apiService.failedSnackbar('Error creating thread');
        this.isSubmitting = false;
      }
    });
  }
}
