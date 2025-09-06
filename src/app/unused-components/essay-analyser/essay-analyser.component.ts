import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { APIService } from 'src/app/services/API/api.service'; // Ensure correct path

@Component({
  selector: 'app-essay-analyser',
  templateUrl: './essay-analyser.component.html',
  styleUrls: ['./essay-analyser.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('100ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class EssayAnalyserComponent {
  essayText: string = '';
  analysisResult: string = '';
  analyzing = false;
  essayTextClass: string = 'text-gray-800';

  constructor(private snackBar: MatSnackBar, private apiService: APIService) { }

  async analyzeEssay() {
    this.analyzing = true;
    this.justSnackbar('Analyzing Essay', 9999999);

    try {
      const result = await this.apiService.analyzeEssay(this.essayText);
      this.analysisResult = result;

      if (this.analysisResult === 'This is not an essay, give me an essay') {
        this.failedSnackbar(this.analysisResult, 99999999);
        this.analyzing = false;
      } else {
        await this.showTypingEffect(this.analysisResult);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.failedSnackbar(error.message, 99999999);
      } else {
        this.failedSnackbar('An unexpected error occurred.', 99999999);
      }
      this.analyzing = false;
    } finally {
      this.snackBar.dismiss();
    }
  }

  trimResponse(responseText: string): string {
    const startIndex = responseText.indexOf('* **Identifying the main argument and thesis statement**');
    return startIndex !== -1 ? responseText.substring(0, startIndex).trim() : responseText;
  }

  async showTypingEffect(text: string) {
    this.analysisResult = '';
    
    const lines = text.split('\n');
    for (let line of lines) {
      if (line.startsWith('##')) {
        this.analysisResult += `<p class="text-2xl text-center text-green-500 font-bold mb-4">${line.replace('##', '').trim()}</p>`;
      } else if (line.startsWith('* **')) {
        this.analysisResult += `<p class="text-lg font-normal mb-1">${line.replace(/\*\*/g, '').trim()}</p>`;
      } else if (line.startsWith('**')) {
        this.analysisResult += `<p class="text-xl font-semibold mb-1">${line.replace(/\*\*/g, '').trim()}</p>`;
      } else {        
        this.analysisResult += `<p class="mt-4 text-md font-extralight ">${line}</p>`;
      }
      await this.delay(30); 
    }
    
    this.snackBar.dismiss(); 
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  failedSnackbar(message: string, timer?: number) {
    const time = timer ?? 3000;
    this.snackBar.open(message, 'Dismiss', {
      duration: time,
      verticalPosition: 'bottom',
      horizontalPosition: 'right',
      panelClass: 'default-snackbar-error',
    });
  }

  successSnackbar(message: string, timer?: number) {
    const time = timer ?? 3000;
    this.snackBar.open(message, 'Dismiss', {
      duration: time,
      verticalPosition: 'bottom',
      horizontalPosition: 'right',
      panelClass: 'default-snackbar-success',
    });
  }

  showSnackbar(message: string, action: string = 'Close', duration: number = 3000) {
    this.snackBar.open(message, action, { duration });
  }

  justSnackbar(message: string, timer?: number) {
    const time = timer ?? 3000;
    this.snackBar.open(message, 'Dismiss', {
      duration: time,
      verticalPosition: 'bottom',
      horizontalPosition: 'right',
      panelClass: 'default-snackbar',
    });
  }

  tryAgain() {
    this.essayText = '';
    this.analysisResult = '';
    this.analyzing = false;
  }
}
