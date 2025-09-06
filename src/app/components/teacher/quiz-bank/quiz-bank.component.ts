import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

interface QuestionBankItem {
  id: number;
  question: string;
  type: string;
  answer: string;
  options?: string;
  category?: string;
  created_by: string;
  firstname: string;
  lastname: string;
  created_at: string;
}

@Component({
  selector: 'app-quiz-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-bank.component.html',
  styleUrl: './quiz-bank.component.css'
})
export class QuizBankComponent implements OnInit {
  @Output() questionsSelected = new EventEmitter<QuestionBankItem[]>();

  questions: QuestionBankItem[] = [];
  categories: string[] = [];
  questionTypes = [
    { value: 'all', label: 'All Types' },
    { value: '0', label: 'Multiple Choice' },
    { value: '1', label: 'True/False' },
    { value: '2', label: 'Identification' },
    { value: '3', label: 'Essay' }
  ];

  selectedCategory: string = 'all';
  selectedType: string = 'all';
  searchTerm: string = '';
  selectedQuestions: Set<number> = new Set();
  loading: boolean = false;

  constructor(
    private API: APIService,
    private activeModal: NgbActiveModal // Add this
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadQuestions();
  }

  closeModal(): void {
    console.log('Closing question bank modal');
    this.activeModal.dismiss('User cancelled');
  }

  loadCategories(): void {
    this.API.getQuestionBankCategories(this.API.getUserData().id).subscribe(
      (data: any) => {
        if (data.success) {
          this.categories = data.output.map((item: any) => item.category).filter(Boolean);
        }
      },
      (error) => {
        console.error('Error loading categories:', error);
        this.API.failedSnackbar('Failed to load categories');
      }
    );
  }

  loadQuestions(): void {
    this.loading = true;
    this.API.getQuestionBank(this.API.getUserData().id, this.selectedCategory, this.selectedType).subscribe(
      (data: any) => {
        if (data.success) {
          this.questions = data.output;
        } else {
          this.API.failedSnackbar('Failed to load questions');
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error loading questions:', error);
        this.API.failedSnackbar('Error loading questions');
        this.loading = false;
      }
    );
  }

  onCategoryChange(): void {
    this.loadQuestions();
  }

  onTypeChange(): void {
    this.loadQuestions();
  }

  onSearch(): void {
    // Implement search functionality if needed
    this.loadQuestions();
  }

  toggleQuestionSelection(questionId: number): void {
    if (this.selectedQuestions.has(questionId)) {
      this.selectedQuestions.delete(questionId);
    } else {
      this.selectedQuestions.add(questionId);
    }
  }

  isQuestionSelected(questionId: number): boolean {
    return this.selectedQuestions.has(questionId);
  }

  getSelectedQuestions(): QuestionBankItem[] {
    return this.questions.filter(q => this.selectedQuestions.has(q.id));
  }

  addSelectedQuestionsToQuiz(): void {
    const selectedQuestions = this.getSelectedQuestions();
    if (selectedQuestions.length === 0) {
      this.API.failedSnackbar('Please select at least one question');
      return;
    }
    
    this.questionsSelected.emit(selectedQuestions);
    this.selectedQuestions.clear();
  }

  getQuestionTypeLabel(type: string): string {
    const typeObj = this.questionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  getQuestionPreview(question: string): string {
    return question.length > 100 ? question.substring(0, 100) + '...' : question;
  }

  getAnswerPreview(answer: string): string {
    return answer.length > 50 ? answer.substring(0, 50) + '...' : answer;
  }
}