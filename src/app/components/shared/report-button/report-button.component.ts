import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ReportContentComponent } from '../../general-modals/report-content/report-content.component';

@Component({
  selector: 'app-report-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="report-btn"
      (click)="openReportModal()"
      [title]="'Report ' + contentType"
      [style]="btnStyle">
      <i class="pi pi-flag" [style]="iconStyle"></i>
      <span *ngIf="showText" [style]="textStyle">Report</span>
    </button>
  `,
  styles: [`
    .report-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--input-border);
      border-radius: 6px;
      background: transparent;
      color: var(--text-color);
      cursor: pointer;
      transition: var(--tran-02);
      font-size: 0.8rem;
      opacity: 0.7;
    }

    .report-btn:hover {
      border-color: var(--warning-color);
      color: var(--warning-color);
      opacity: 1;
      transform: translateY(-1px);
    }

    .report-btn:active {
      transform: translateY(0);
    }

    .report-btn i {
      font-size: 0.8rem;
    }

    /* Compact variant */
    .report-btn.compact {
      padding: 0.375rem;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      justify-content: center;
    }

    /* Dark mode */
    :host-context(.dark) .report-btn {
      border-color: var(--p-primary-700);
      color: var(--p-primary-300);
    }

    :host-context(.dark) .report-btn:hover {
      border-color: var(--warning-color);
      color: var(--warning-color);
      background: var(--p-primary-800);
    }
  `]
})
export class ReportButtonComponent {
  @Input() contentType: 'message' | 'forum_post' | 'thread' | 'conversation' = 'message';
  @Input() contentId!: number;
  @Input() contentTitle?: string;
  @Input() contentText?: string;
  @Input() authorName?: string;
  @Input() showText = true;
  @Input() compact = false;
  @Input() customStyle?: any;

  constructor(private dialog: MatDialog) {}

  get btnStyle() {
    const baseStyle = this.compact ? {
      padding: '0.375rem',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      justifyContent: 'center'
    } : {};

    return { ...baseStyle, ...this.customStyle };
  }

  get iconStyle() {
    return {
      fontSize: this.compact ? '0.75rem' : '0.8rem'
    };
  }

  get textStyle() {
    return {
      fontSize: '0.8rem',
      fontWeight: '500'
    };
  }

  openReportModal(): void {
    if (!this.contentId) {
      console.error('Content ID is required for reporting');
      return;
    }

    const dialogRef = this.dialog.open(ReportContentComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        type: this.contentType,
        id: this.contentId,
        title: this.contentTitle,
        content: this.contentText,
        author: this.authorName
      },
      disableClose: false,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // Content was successfully reported
        console.log('Content reported successfully');
      }
    });
  }
}
