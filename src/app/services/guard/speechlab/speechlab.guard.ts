import { Injectable } from '@angular/core';

import { Observable, from } from 'rxjs';
import Swal from 'sweetalert2';

export interface ComponentCanDeactivate {
  canDeactivate: () => boolean | Observable<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechLabGuard  {
  canDeactivate(
    component: ComponentCanDeactivate
  ): Observable<boolean> | boolean {
    // If component has custom deactivation logic
    if (component.canDeactivate) {
      const result = component.canDeactivate();
      if (typeof result === 'boolean' && !result) {
        return this.showConfirmationDialog();
      }
      return result;
    }

    // Default confirmation
    return this.showConfirmationDialog();
  }

  private showConfirmationDialog(): Observable<boolean> {
    return from(
      Swal.fire({
        title: 'Exit Meeting?',
        html: 'Are you sure you want to leave?<br><br>' +
              '<b>Please make sure to:</b><br>' +
              '• End or exit any ongoing meetings<br>' +
              '• Save your progress if needed',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, exit',
        cancelButtonText: 'Stay',
        allowOutsideClick: false,
        customClass: {
          container: 'custom-swal-container',
          popup: 'custom-swal-popup',
          htmlContainer: 'custom-swal-html'
        }
      }).then((result) => {
        return result.isConfirmed;
      })
    );
  }
}

