import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { APIService } from 'src/app/services/API/api.service';

interface ReportReason {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface ReportData {
  type: 'message' | 'forum_post' | 'thread' | 'conversation';
  id: number;
  title?: string;
  content?: string;
  author?: string;
}

@Component({
  selector: 'app-report-content',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './report-content.component.html',
  styleUrls: ['./report-content.component.css']
})
export class ReportContentComponent implements OnInit {
  reportReasons: ReportReason[] = [];
  selectedReasonId: number | null = null;
  description = '';
  loading = false;
  submitting = false;

  constructor(
    public dialogRef: MatDialogRef<ReportContentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReportData,
    private API: APIService
  ) {}

  ngOnInit(): void {
    this.loadReportReasons();
  }

  loadReportReasons(): void {
    this.loading = true;
    
    // First try to load from API
    this.API.getReportReasons().subscribe({
      next: (response) => {
        console.log('Report reasons response:', response);
        let reasons = [];
        
        // Handle different response formats
        if (Array.isArray(response)) {
          reasons = response;
        } else if (response && Array.isArray(response.output)) {
          reasons = response.output;
        } else if (response && Array.isArray(response.payload)) {
          reasons = response.payload;
        } else if (response && response.success === false) {
          console.warn('API returned error:', response.output);
          reasons = [];
        } else {
          console.warn('Unexpected response format:', response);
          reasons = [];
        }
        
        // If no reasons from API, try to initialize them
        if (reasons.length === 0) {
          console.log('No report reasons found, attempting to initialize...');
          this.initializeReasons();
        } else {
          this.reportReasons = reasons;
          console.log('Loaded report reasons:', this.reportReasons);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading report reasons:', error);
        console.log('Using fallback report reasons');
        this.reportReasons = this.getFallbackReasons();
        this.loading = false;
      }
    });
  }

  private initializeReasons(): void {
    console.log('Initializing report reasons...');
    this.API.initializeReportReasons().then(() => {
      console.log('Report reasons initialized, retrying load...');
      // Retry loading after initialization
      this.API.getReportReasons().subscribe({
        next: (response) => {
          console.log('Retry response:', response);
          let reasons = [];
          
          if (Array.isArray(response)) {
            reasons = response;
          } else if (response && Array.isArray(response.output)) {
            reasons = response.output;
          } else if (response && Array.isArray(response.payload)) {
            reasons = response.payload;
          }
          
          if (reasons.length > 0) {
            this.reportReasons = reasons;
          } else {
            console.log('Still no reasons, using fallback');
            this.reportReasons = this.getFallbackReasons();
          }
          
          console.log('Final loaded reasons:', this.reportReasons);
          this.loading = false;
        },
        error: () => {
          console.log('Retry failed, using fallback');
          this.reportReasons = this.getFallbackReasons();
          this.loading = false;
        }
      });
    }).catch((error) => {
      console.error('Failed to initialize reasons:', error);
      this.reportReasons = this.getFallbackReasons();
      this.loading = false;
    });
  }

  private getFallbackReasons(): ReportReason[] {
    return [
      { id: 1, code: 'spam', name: 'Spam', description: 'Unwanted commercial content or repetitive posts' },
      { id: 2, code: 'harassment', name: 'Harassment', description: 'Bullying, threats, or intimidating behavior' },
      { id: 3, code: 'inappropriate_content', name: 'Inappropriate Content', description: 'Content not suitable for educational environment' },
      { id: 4, code: 'hate_speech', name: 'Hate Speech', description: 'Content promoting hatred based on identity' },
      { id: 5, code: 'violence', name: 'Violence or Threats', description: 'Content promoting or threatening violence' },
      { id: 6, code: 'off_topic', name: 'Off Topic', description: 'Content not related to the course or discussion' },
      { id: 7, code: 'other', name: 'Other', description: 'Other reason not listed above' }
    ];
  }

  submitReport(): void {
    console.log('Submit report clicked');
    console.log('Selected reason ID:', this.selectedReasonId);
    console.log('Data:', this.data);
    
    if (!this.selectedReasonId) {
      this.API.failedSnackbar('Please select a reason for reporting');
      return;
    }

    this.submitting = true;
    let reportObservable;

    switch (this.data.type) {
      case 'message':
        console.log('Reporting message with ID:', this.data.id);
        reportObservable = this.API.reportMessage(
          this.data.id,
          this.selectedReasonId,
          this.description
        );
        break;
      case 'forum_post':
        console.log('Reporting forum post with ID:', this.data.id);
        reportObservable = this.API.reportForumPost(
          this.data.id,
          this.selectedReasonId,
          this.description
        );
        break;
      default:
        console.error('Unsupported content type:', this.data.type);
        this.API.failedSnackbar('Unsupported content type for reporting');
        this.submitting = false;
        return;
    }

    reportObservable.subscribe({
      next: (response) => {
        console.log('Report submission response:', response);
        if (response.success) {
          this.API.successSnackbar('Content reported successfully');
          this.dialogRef.close({ success: true });
        } else {
          console.error('Report submission failed:', response);
          this.API.failedSnackbar(`Failed to submit report: ${response.output || 'Unknown error'}`);
          this.submitting = false;
        }
      },
      error: (error) => {
        console.error('Error submitting report:', error);
        this.API.failedSnackbar('Failed to submit report');
        this.submitting = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  getContentTypeDisplay(): string {
    switch (this.data.type) {
      case 'message': return 'Message';
      case 'forum_post': return 'Forum Post';
      case 'thread': return 'Thread';
      case 'conversation': return 'Conversation';
      default: return 'Content';
    }
  }
}
