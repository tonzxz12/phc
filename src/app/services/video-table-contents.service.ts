import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { APIService } from './API/api.service';

export interface VideoTableContent {
  id?: number;
  attachment_id: number;
  content_name: string;
  start_timestamp: number;
  end_timestamp: number;
  description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoTableContentsService {

  constructor(private http: HttpClient, private apiService: APIService) { }

  /**
   * Get table of contents for a video attachment
   */
  getVideoTableContents(attachmentId: number): Observable<any> {
    return this.apiService.getVideoTableContents(attachmentId);
  }

  /**
   * Save new video table content
   */
  saveVideoTableContent(content: VideoTableContent): Observable<any> {
    return this.apiService.createVideoTableContent({
      attachment_id: content.attachment_id,
      content_name: content.content_name,
      description: content.description,
      start_timestamp: content.start_timestamp,
      end_timestamp: content.end_timestamp,
      order_index: content.order_index
    });
  }

  /**
   * Update existing video table content
   */
  updateVideoTableContent(content: VideoTableContent): Observable<any> {
    if (!content.id) {
      throw new Error('Content ID is required for update');
    }
    
    return this.apiService.updateVideoTableContent(content.id, {
      content_name: content.content_name,
      description: content.description,
      start_timestamp: content.start_timestamp,
      end_timestamp: content.end_timestamp,
      order_index: content.order_index
    });
  }

  /**
   * Delete video table content
   */
  deleteVideoTableContent(contentId: number): Observable<any> {
    return this.apiService.deleteVideoTableContent(contentId);
  }

  /**
   * Reorder video table contents
   */
  reorderVideoTableContents(attachmentId: number, contentIds: number[]): Observable<any> {
    // For now, we'll update each item's order individually
    // This could be optimized with a batch update endpoint later
    const updatePromises = contentIds.map((id, index) => 
      firstValueFrom(this.apiService.updateVideoTableContent(id, { order_index: index + 1 }))
    );
    
    // Convert to observable that emits when all updates complete
    return new Observable(observer => {
      Promise.all(updatePromises)
        .then(results => {
          observer.next({ success: true, results });
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Format seconds to MM:SS display format
   */
  formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Parse MM:SS format to seconds
   */
  parseTimestamp(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid time format. Use MM:SS');
    }
    
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      throw new Error('Invalid time values');
    }
    
    return (minutes * 60) + seconds;
  }

  /**
   * Validate that end time is after start time
   */
  validateTimeRange(startTime: number, endTime: number): boolean {
    return endTime > startTime;
  }

  /**
   * Check if a time range overlaps with existing contents
   */
  checkTimeOverlap(
    newStartTime: number, 
    newEndTime: number, 
    existingContents: VideoTableContent[], 
    excludeId?: number
  ): boolean {
    return existingContents.some(content => {
      if (excludeId && content.id === excludeId) {
        return false; // Skip the content being edited
      }
      
      return (
        (newStartTime >= content.start_timestamp && newStartTime < content.end_timestamp) ||
        (newEndTime > content.start_timestamp && newEndTime <= content.end_timestamp) ||
        (newStartTime <= content.start_timestamp && newEndTime >= content.end_timestamp)
      );
    });
  }
}
