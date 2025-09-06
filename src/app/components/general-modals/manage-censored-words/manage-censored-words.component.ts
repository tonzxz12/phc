import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { APIService } from 'src/app/services/API/api.service';

interface CensoredWord {
  id: number;
  word: string;
  description?: string;
  severity: string;
  category?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-manage-censored-words',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './manage-censored-words.component.html',
  styleUrls: ['./manage-censored-words.component.css']
})
export class ManageCensoredWordsComponent implements OnInit {
  censoredWords: CensoredWord[] = [];
  loading = false;
  saving = false;
  newWord = '';
  newDescription = '';
  newSeverity = 'medium';
  newCategory = '';

  severityOptions = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'extreme', label: 'Extreme', color: '#dc2626' }
  ];

  categoryOptions = [
    'profanity',
    'harassment', 
    'hate_speech',
    'spam',
    'violence',
    'discrimination',
    'other'
  ];

  constructor(
    public dialogRef: MatDialogRef<ManageCensoredWordsComponent>,
    private API: APIService
  ) {}

  ngOnInit(): void {
    this.loadCensoredWords();
  }

  loadCensoredWords(): void {
    this.loading = true;
    this.API.getCensoredWords().subscribe({
      next: (response) => {
        console.log('API Response:', response); // Debug log
        // Ensure we have an array
        if (Array.isArray(response)) {
          this.censoredWords = response;
        } else if (response && Array.isArray(response.data)) {
          this.censoredWords = response.data;
        } else {
          console.warn('Invalid response format, using empty array:', response);
          this.censoredWords = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading censored words:', error);
        this.censoredWords = []; // Ensure it's an array even on error
        this.API.failedSnackbar('Failed to load censored words');
        this.loading = false;
      }
    });
  }

  addNewWord(): void {
    if (!this.newWord.trim()) {
      this.API.failedSnackbar('Please enter a word');
      return;
    }

    // Check if word already exists
    const exists = this.censoredWords.some(w => 
      w.word.toLowerCase() === this.newWord.trim().toLowerCase()
    );

    if (exists) {
      this.API.failedSnackbar('This word is already in the list');
      return;
    }

    this.saving = true;
    this.API.addCensoredWord(
      this.newWord.trim(),
      this.newDescription.trim() || undefined,
      this.newSeverity,
      this.newCategory || undefined
    ).subscribe({
      next: () => {
        this.API.successSnackbar('Word added successfully');
        this.newWord = '';
        this.newDescription = '';
        this.newSeverity = 'medium';
        this.newCategory = '';
        this.loadCensoredWords(); // Reload the list
        this.saving = false;
      },
      error: (error) => {
        console.error('Error adding censored word:', error);
        this.API.failedSnackbar('Failed to add word');
        this.saving = false;
      }
    });
  }

  removeWord(wordId: number): void {
    const confirmed = confirm('Are you sure you want to remove this word from the censored list?');
    if (confirmed) {
      this.API.deleteCensoredWord(wordId).subscribe({
        next: () => {
          this.censoredWords = this.censoredWords.filter(w => w.id !== wordId);
          this.API.successSnackbar('Word removed from list');
        },
        error: (error) => {
          console.error('Error removing censored word:', error);
          this.API.failedSnackbar('Failed to remove word');
        }
      });
    }
  }

  toggleWordStatus(word: CensoredWord): void {
    const newStatus = !word.isActive;
    this.API.updateCensoredWordStatus(word.id, newStatus).subscribe({
      next: () => {
        word.isActive = newStatus;
        this.API.successSnackbar(word.isActive ? 'Word activated' : 'Word deactivated');
      },
      error: (error) => {
        console.error('Error updating word status:', error);
        this.API.failedSnackbar('Failed to update word status');
      }
    });
  }

  getSeverityColor(severity: string): string {
    const option = this.severityOptions.find(s => s.value === severity);
    return option ? option.color : '#6b7280';
  }

  getActiveCount(): number {
    return Array.isArray(this.censoredWords) ? this.censoredWords.filter(w => w.isActive).length : 0;
  }

  getInactiveCount(): number {
    return Array.isArray(this.censoredWords) ? this.censoredWords.filter(w => !w.isActive).length : 0;
  }

  bulkUpdateWords(): void {
    const activeWords = this.censoredWords
      .filter(w => w.isActive)
      .map(w => w.word);

    this.saving = true;
    this.API.updateCensoredWords(activeWords).subscribe({
      next: () => {
        this.API.successSnackbar('Censored words updated successfully');
        this.saving = false;
      },
      error: (error) => {
        console.error('Error updating censored words:', error);
        this.API.failedSnackbar('Failed to update censored words');
        this.saving = false;
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.bulkUpdateWords();
    // Close after a brief delay to show the success message
    setTimeout(() => {
      this.dialogRef.close({ updated: true });
    }, 1000);
  }
}
