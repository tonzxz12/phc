import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService, VideoTableContent } from 'src/app/services/API/api.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-video-table-contents-modal',
  templateUrl: './video-table-contents-modal.component.html',
  styleUrls: ['./video-table-contents-modal.component.css']
})
export class VideoTableContentsModalComponent implements OnInit, OnDestroy {
  @Input() attachmentId!: number;
  @Input() videoTitle: string = 'Video';

  tableContents: VideoTableContent[] = [];
  isLoading: boolean = false;
  isEditing: boolean = false;
  editingIndex: number = -1;

  // Form data
  contentForm = {
    content_name: '',
    start_time_display: '',
    end_time_display: '',
    description: ''
  };

  constructor(
    private activeModal: NgbActiveModal,
    public apiService: APIService
  ) {}

  ngOnInit(): void {
    this.loadTableContents();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load existing table of contents
   */
  loadTableContents(): void {
    if (!this.attachmentId) return;

    this.isLoading = true;
    this.apiService.getVideoTableContents(this.attachmentId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.tableContents = response.output.map((content: any) => ({
            ...content,
            start_time_display: this.apiService.formatTimestamp(content.start_timestamp),
            end_time_display: this.apiService.formatTimestamp(content.end_timestamp)
          }));
        } else {
          this.apiService.failedSnackbar('Failed to load table of contents');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading table contents:', error);
        this.apiService.failedSnackbar('Error loading table of contents');
        this.isLoading = false;
      }
    });
  }

  /**
   * Add new content section
   */
  addContentSection(): void {
    this.isEditing = true;
    this.editingIndex = -1;
    this.resetForm();
  }

  /**
   * Edit existing content section
   */
  editContentSection(index: number): void {
    const content = this.tableContents[index];
    this.isEditing = true;
    this.editingIndex = index;
    
    this.contentForm = {
      content_name: content.content_name,
      start_time_display: this.apiService.formatTimestamp(content.start_timestamp),
      end_time_display: this.apiService.formatTimestamp(content.end_timestamp),
      description: content.description || ''
    };
  }

  /**
   * Save content section (add or edit)
   */
  saveContentSection(): void {
    if (!this.validateForm()) return;

    try {
      const startTimestamp = this.apiService.parseTimestamp(this.contentForm.start_time_display);
      const endTimestamp = this.apiService.parseTimestamp(this.contentForm.end_time_display);

      // Validate time range
      if (!this.apiService.validateTimeRange(startTimestamp, endTimestamp)) {
        this.apiService.failedSnackbar('End time must be after start time');
        return;
      }

      // Check for overlaps
      const excludeId = this.editingIndex >= 0 ? this.tableContents[this.editingIndex].id : undefined;
      if (this.apiService.checkTimeOverlap(startTimestamp, endTimestamp, this.tableContents, excludeId)) {
        this.apiService.failedSnackbar('Time range overlaps with existing content');
        return;
      }

      const contentData: VideoTableContent = {
        attachment_id: this.attachmentId,
        content_name: this.contentForm.content_name,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        description: this.contentForm.description,
        order_index: this.editingIndex >= 0 ? this.tableContents[this.editingIndex].order_index : this.tableContents.length + 1
      };

      // Add ID if editing
      if (this.editingIndex >= 0 && this.tableContents[this.editingIndex].id) {
        contentData.id = this.tableContents[this.editingIndex].id;
      }

      const operation = this.editingIndex >= 0 
        ? this.apiService.updateVideoTableContentFull(contentData)
        : this.apiService.saveVideoTableContent(contentData);

      operation.subscribe({
        next: (response: any) => {
          if (response.success) {
            this.apiService.successSnackbar(
              this.editingIndex >= 0 ? 'Content updated successfully' : 'Content added successfully'
            );
            this.loadTableContents();
            this.cancelEdit();
          } else {
            this.apiService.failedSnackbar(response.message || 'Failed to save content');
          }
        },
        error: (error: any) => {
          console.error('Error saving content:', error);
          this.apiService.failedSnackbar('Error saving content');
        }
      });

    } catch (error) {
      this.apiService.failedSnackbar('Invalid time format. Use MM:SS');
    }
  }

  /**
   * Delete content section
   */
  deleteContentSection(index: number): void {
    const content = this.tableContents[index];
    if (!content.id) return;

    if (confirm('Are you sure you want to delete this content section?')) {
      this.apiService.deleteVideoTableContent(content.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.apiService.successSnackbar('Content deleted successfully');
            this.loadTableContents();
          } else {
            this.apiService.failedSnackbar('Failed to delete content');
          }
        },
        error: (error: any) => {
          console.error('Error deleting content:', error);
          this.apiService.failedSnackbar('Error deleting content');
        }
      });
    }
  }

  /**
   * Handle drag and drop reordering
   */
  onContentDrop(event: CdkDragDrop<VideoTableContent[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    moveItemInArray(this.tableContents, event.previousIndex, event.currentIndex);
    
    // Update order indexes and save
    const contentIds = this.tableContents.map(content => content.id!).filter(id => id);
    
    this.apiService.reorderVideoTableContents(this.attachmentId, contentIds).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.apiService.successSnackbar('Content reordered successfully');
        } else {
          this.apiService.failedSnackbar('Failed to reorder content');
          this.loadTableContents(); // Reload on failure
        }
      },
      error: (error: any) => {
        console.error('Error reordering content:', error);
        this.apiService.failedSnackbar('Error reordering content');
        this.loadTableContents(); // Reload on failure
      }
    });
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.isEditing = false;
    this.editingIndex = -1;
    this.resetForm();
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.contentForm = {
      content_name: '',
      start_time_display: '',
      end_time_display: '',
      description: ''
    };
  }

  /**
   * Validate form data
   */
  validateForm(): boolean {
    if (!this.contentForm.content_name.trim()) {
      this.apiService.failedSnackbar('Content name is required');
      return false;
    }

    if (!this.contentForm.start_time_display.trim()) {
      this.apiService.failedSnackbar('Start time is required');
      return false;
    }

    if (!this.contentForm.end_time_display.trim()) {
      this.apiService.failedSnackbar('End time is required');
      return false;
    }

    // Validate time format
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(this.contentForm.start_time_display)) {
      this.apiService.failedSnackbar('Invalid start time format. Use MM:SS');
      return false;
    }

    if (!timeRegex.test(this.contentForm.end_time_display)) {
      this.apiService.failedSnackbar('Invalid end time format. Use MM:SS');
      return false;
    }

    return true;
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.activeModal.dismiss();
  }

  /**
   * Save and close modal
   */
  saveAndClose(): void {
    this.activeModal.close(this.tableContents);
  }
}
