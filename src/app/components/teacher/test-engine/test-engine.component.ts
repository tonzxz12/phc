import { Component, Input, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';

interface TestQuestion {
  id?: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_in_blank';
  options?: string[];
  correct_answer: string | string[];
  points: number;
  explanation?: string;
  order_index: number;
}

interface TestAttempt {
  id?: number;
  student_id: string;
  assignment_id: string;
  start_time: Date;
  end_time?: Date;
  total_score: number;
  max_score: number;
  percentage: number;
  attempt_number: number;
  is_completed: boolean;
  answers: TestAnswer[];
}

interface TestAnswer {
  question_id: number;
  student_answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  time_spent: number; // seconds
}

@Component({
  selector: 'app-test-engine',
  templateUrl: './test-engine.component.html',
  styleUrls: ['./test-engine.component.css']
})
export class TestEngineComponent implements OnInit {
  @Input() assignment: any;
  @Input() mode: 'create' | 'take' | 'review' = 'create';
  @Input() student: any;

  // Test Configuration
  questions: TestQuestion[] = [];
  currentQuestionIndex: number = 0;
  testStartTime: Date | null = null;
  timeRemaining: number = 0; // seconds
  timerInterval: any;

  // Student Test Taking
  currentAttempt: TestAttempt | null = null;
  studentAnswers: { [questionId: number]: any } = {};
  isTestStarted: boolean = false;
  isTestCompleted: boolean = false;
  showResults: boolean = false;

  // Test Results
  testResults: any = null;
  detailedResults: TestAnswer[] = [];

  constructor(private API: APIService) {}

  ngOnInit(): void {
    if (this.mode === 'create') {
      this.initializeTestCreation();
    } else if (this.mode === 'take') {
      this.loadTestForTaking();
    } else if (this.mode === 'review') {
      this.loadTestResults();
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // ==========================================
  // TEST CREATION MODE
  // ==========================================

  initializeTestCreation(): void {
    this.addNewQuestion();
  }

  addNewQuestion(): void {
    const newQuestion: TestQuestion = {
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
      explanation: '',
      order_index: this.questions.length
    };
    this.questions.push(newQuestion);
  }

  removeQuestion(index: number): void {
    this.questions.splice(index, 1);
    this.reorderQuestions();
  }

  reorderQuestions(): void {
    this.questions.forEach((question, index) => {
      question.order_index = index;
    });
  }

  onQuestionTypeChange(index: number, type: string): void {
    const question = this.questions[index];
    question.type = type as any;
    
    // Reset options based on type
    switch (type) {
      case 'multiple_choice':
        question.options = ['', '', '', ''];
        question.correct_answer = '';
        break;
      case 'true_false':
        question.options = ['True', 'False'];
        question.correct_answer = '';
        break;
      case 'short_answer':
      case 'essay':
      case 'fill_in_blank':
        question.options = undefined;
        question.correct_answer = '';
        break;
    }
  }

  addOption(questionIndex: number): void {
    const question = this.questions[questionIndex];
    if (question.options) {
      question.options.push('');
    }
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const question = this.questions[questionIndex];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
    }
  }

  saveTest(): void {
    if (!this.validateTest()) return;

    const testData = {
      assignment_id: this.assignment.id,
      questions: this.questions.map(q => ({
        question: q.question,
        type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: Array.isArray(q.correct_answer) ? JSON.stringify(q.correct_answer) : q.correct_answer,
        points: q.points,
        explanation: q.explanation,
        order_index: q.order_index
      }))
    };

    // Save questions to assessment_items table
    testData.questions.forEach(question => {
      this.API.createAssessmentItem(this.assignment.id, question).subscribe({
        next: (response) => {
          console.log('Question saved:', response);
        },
        error: (error) => {
          console.error('Error saving question:', error);
        }
      });
    });

    this.API.successSnackbar('Test saved successfully!');
  }

  validateTest(): boolean {
    if (this.questions.length === 0) {
      this.API.failedSnackbar('Please add at least one question');
      return false;
    }

    for (let i = 0; i < this.questions.length; i++) {
      const question = this.questions[i];
      
      if (!question.question.trim()) {
        this.API.failedSnackbar(`Please enter question ${i + 1}`);
        return false;
      }

      if (!question.correct_answer) {
        this.API.failedSnackbar(`Please set correct answer for question ${i + 1}`);
        return false;
      }

      if (question.type === 'multiple_choice' && question.options) {
        const validOptions = question.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          this.API.failedSnackbar(`Question ${i + 1} needs at least 2 options`);
          return false;
        }
      }
    }

    return true;
  }

  // ==========================================
  // TEST TAKING MODE
  // ==========================================

  loadTestForTaking(): void {
    this.API.getAssignmentQuestions(this.assignment.id).subscribe({
      next: (response) => {
        this.questions = response.output.map((q: any) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options ? JSON.parse(q.options) : undefined,
          correct_answer: q.answer, // Don't show to student
          points: q.points || 1,
          explanation: q.explanation,
          order_index: q.order_index || 0
        }));

        if (this.assignment.shuffle_questions) {
          this.shuffleQuestions();
        }

        this.timeRemaining = this.assignment.time_limit * 60; // Convert to seconds
      },
      error: (error) => {
        this.API.failedSnackbar('Error loading test questions');
      }
    });
  }

  startTest(): void {
    this.isTestStarted = true;
    this.testStartTime = new Date();
    this.startTimer();

    // Create test attempt record
    this.currentAttempt = {
      student_id: this.student.id,
      assignment_id: this.assignment.id,
      start_time: this.testStartTime,
      total_score: 0,
      max_score: this.calculateMaxScore(),
      percentage: 0,
      attempt_number: 1, // TODO: Get actual attempt number
      is_completed: false,
      answers: []
    };
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.autoSubmitTest();
      }
    }, 1000);
  }

  shuffleQuestions(): void {
    for (let i = this.questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
    }
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  saveAnswer(questionId: number, answer: any): void {
    this.studentAnswers[questionId] = answer;
  }

  submitTest(): void {
    if (confirm('Are you sure you want to submit your test? You cannot change your answers after submission.')) {
      this.finishTest();
    }
  }

  autoSubmitTest(): void {
    this.API.justSnackbar('Time is up! Test submitted automatically.', 5000);
    this.finishTest();
  }

  finishTest(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.isTestCompleted = true;
    this.processTestResults();
  }

  processTestResults(): void {
    let totalScore = 0;
    const maxScore = this.calculateMaxScore();
    const answers: TestAnswer[] = [];

    this.questions.forEach(question => {
      const studentAnswer = this.studentAnswers[question.id!];
      const isCorrect = this.checkAnswer(question, studentAnswer);
      const pointsEarned = isCorrect ? question.points : 0;
      
      totalScore += pointsEarned;

      answers.push({
        question_id: question.id!,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_spent: 0 // TODO: Track time per question
      });
    });

    const percentage = (totalScore / maxScore) * 100;

    this.testResults = {
      total_score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      letter_grade: this.calculateLetterGrade(percentage),
      answers: answers
    };

    this.detailedResults = answers;

    // Save results to database
    this.saveTestResults();

    // Show results based on assignment settings
    if (this.assignment.show_results === 'immediately' || this.assignment.show_results === 'after_submission') {
      this.showResults = true;
    }
  }

  checkAnswer(question: TestQuestion, studentAnswer: any): boolean {
    if (!studentAnswer) return false;

    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return studentAnswer === question.correct_answer;
      
      case 'short_answer':
      case 'fill_in_blank':
        // Simple string comparison (could be enhanced with fuzzy matching)
        return studentAnswer.toLowerCase().trim() === question.correct_answer.toString().toLowerCase().trim();
      
      case 'essay':
        // Essays need manual grading, return false for now
        return false;
      
      default:
        return false;
    }
  }

  calculateMaxScore(): number {
    return this.questions.reduce((total, question) => total + question.points, 0);
  }

  calculateLetterGrade(percentage: number): string {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  saveTestResults(): void {
    const resultData = {
      assignment_id: this.assignment.id,
      student_id: this.student.id,
      total_score: this.testResults.total_score,
      max_score: this.testResults.max_score,
      percentage: this.testResults.percentage,
      letter_grade: this.testResults.letter_grade,
      start_time: this.testStartTime,
      end_time: new Date(),
      answers: JSON.stringify(this.detailedResults)
    };

    this.API.saveTestResults(resultData).subscribe({
      next: (response) => {
        console.log('Test results saved:', response);
      },
      error: (error) => {
        console.error('Error saving test results:', error);
      }
    });
  }

  // ==========================================
  // TEST REVIEW MODE
  // ==========================================

  loadTestResults(): void {
    this.API.getStudentTestResults(this.assignment.id, this.student.id).subscribe({
      next: (response) => {
        this.testResults = response.output;
        this.detailedResults = JSON.parse(this.testResults.answers || '[]');
        this.showResults = true;
      },
      error: (error) => {
        this.API.failedSnackbar('Error loading test results');
      }
    });
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  getQuestionTypeDisplay(type: string): string {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'short_answer': return 'Short Answer';
      case 'essay': return 'Essay';
      case 'fill_in_blank': return 'Fill in the Blank';
      default: return type;
    }
  }

  getScoreColor(percentage: number): string {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }
}
