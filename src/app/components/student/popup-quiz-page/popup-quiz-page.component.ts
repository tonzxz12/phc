import {
  Component,
  OnInit,
  OnDestroy,
  Renderer2,
  ElementRef,
  Input,
} from '@angular/core';
import { Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Japanese, English, French } from 'src/app/shared/MockData/selfstudy/model/models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

const japanese = new Japanese();
const english = new English();
const french = new French();

interface QuizOption {
  id: number;
  text: string;
  attachment?: string;
}

interface QuizItem {
  analysisAnswer: any;
  analysisResult: string;
  type: number;
  question: string;
  attachments?: Array<string>;
  choices: Array<QuizOption>;
  correctAnswers: Array<any>;
  selectedAnswers: Array<any>;
}

@Component({
  selector: 'app-popup-quiz-page',
  templateUrl: './popup-quiz-page.component.html',
  styleUrls: ['./popup-quiz-page.component.css'],
})
export class PopupQuizPageComponent implements OnInit, OnDestroy {
  @Input() quizID: string = '';
  level?: number;
  questions: Array<QuizItem> = [];
  currentQuestionIndex = 0;
  correctAnswers = 0;
  timeRemaining = 180;
  showResult = false;
  timelimit = 180;
  timer: any;
  backtracking = true;
  review = true;
  randomize = true;
  teacherid = '';
  isButtonDisabled: boolean = false;
  isPractice = false;
  mode = 'reading';
  lang = '';
  analyzing = false;
  generating = false;
  title: string = 'Welcome to the QLAB Language Proficiency Quiz!';
  description: string = 'Test your skills and see how well you know the language. Choose the correct answers for each question. Good luck!';
  practiceID?: string;

  constructor(
    private API: APIService,
    private router: Router,
    private renderer: Renderer2,
    private el: ElementRef,
    private snackBar: MatSnackBar,
    private activeModal: NgbActiveModal
  ) {}

  ngOnInit() {
    this.correctAnswers = 0;

    if (!this.quizID) {
      this.snackBar.open('Quiz ID is missing. Unable to load quiz.', 'Close', { duration: 3000 });
      this.closeModal();
      return;
    }
    this.loadQuiz(this.quizID);
    this.startTimer();
  }

  loadQuiz(quizID: string) {
    this.API.showLoader();
    this.API.studentGetQuiz(quizID).subscribe(
      (data) => {
        if (!data.success) {
          this.closeModal();
          this.API.hideLoader();
          return;
        }

        this.title = data.output[0].title;
        this.teacherid = data.output[0].teacherid;
        this.description = data.output[0].details;
        this.timelimit = data.output[0].timelimit * 60;
        this.timeRemaining = this.timelimit;
        this.backtracking = false;
        this.randomize = false;
        this.review = false;
        if (data.output[0].settings) {
          this.backtracking = data.output[0].settings.includes('allow_backtrack');
          this.randomize = data.output[0].settings.includes('random_question');
          this.review = data.output[0].settings.includes('allow_review');
        }

        this.questions = [];
        for (let item of data.output) {
          const itemOptions: Array<QuizOption> = [];
          let i = 0;
          let correctAnswers: any[] = [];

          if (item.type == '0') {
            for (let option of item.options.split('\\n\\n')) {
              if (option.trim() == '') continue;
              const [text, attachment] = option.split('::::');
              const newOption: QuizOption = {
                id: i,
                text: String.fromCharCode(65 + i) + '. ' + text,
                attachment: this.getUrl(attachment)
              };
              itemOptions.push(newOption);
              i += 1;
            }
            for (let answer of item.answer.split(' ')) {
              correctAnswers.push(Number(answer));
            }
          } else if (item.type == '1') {
            const tru: QuizOption = { id: 0, text: 'TRUE' };
            itemOptions.push(tru);
            const fals: QuizOption = { id: 1, text: 'FALSE' };
            itemOptions.push(fals);
            correctAnswers.push(item.answer == 'T' ? 0 : 1);
          } else {
            const answer: QuizOption = { id: 0, text: `${item.answer}` };
            itemOptions.push(answer);
            correctAnswers.push(item.answer);
          }

          const selectedAnswers = [];
          if (Number(item.type) > 1) {
            selectedAnswers.push('');
          }

          const [question, attachments] = item.question.split('::::');
          const newitem: QuizItem = {
            type: Number(item.type),
            question: question,
            attachments: attachments.split('\\n\\n').reduce((acc: any, item: any) => {
              if (item.trim() == '') return acc;
              return [...acc, this.getUrl(item)];
            }, []),
            choices: itemOptions,
            correctAnswers: correctAnswers,
            selectedAnswers: selectedAnswers,
            analysisResult: '',
            analysisAnswer: undefined
          };
          this.questions.push(newitem);
        }
        this.questions = this.shuffle();
        if (!this.isPractice) {
          this.API.recordQuiz(quizID, this.correctAnswers, this.getRealTotal());
        }
        this.API.hideLoader();
      },
      (error) => {
        console.error('Error loading quiz:', error);
        this.API.failedSnackbar('Error loading quiz. Please try again.');
        this.API.hideLoader();
        this.closeModal();
      }
    );
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  textToSpeech() {
    if (this.generating || this.mode !== 'listening') return;
    this.generating = true;
    const talk$ = this.API.textToSpeech(this.questions[this.currentQuestionIndex].question, this.lang).subscribe(data => {
      this.generating = false;
      const audio = new Audio(data.fileDownloadUrl);
      audio.play();
      talk$.unsubscribe();
    });
  }

  matchText(target: any, src: any) {
    if (typeof target == 'string' && typeof src == 'string') {
      return target.toLowerCase() == src.toLowerCase();
    }
    return false;
  }

  getUrl(link: string) {
    return this.API.getURL(link);
  }

  letterFromIndex(index: number) {
    return String.fromCharCode(65 + index);
  }

  startTimer() {
    if (this.mode !== 'listening') {
      this.timer = setInterval(() => {
        if (this.timeRemaining > 0) {
          this.timeRemaining--;
        } else {
          this.stopTimer();
          this.checkAnswers();
          this.showResult = true;
          this.isButtonDisabled = true;
        }
      }, 1000);
    }
  }

  secondsToMinutes(seconds: number) {
    return seconds < 60 ? seconds.toString() : Math.floor(seconds / 60).toString() + ':' + (seconds % 60).toString().padStart(2, '0');
  }

  stopTimer() {
    clearInterval(this.timer);
  }

  selectAnswer(choiceId: number) {
    const question = this.questions[this.currentQuestionIndex];
    const selectedIndex = question.selectedAnswers.indexOf(choiceId);

    if (question.type <= 1) {
      question.selectedAnswers = [choiceId];
    } else if (selectedIndex === -1) {
      question.selectedAnswers.push(choiceId);
    } else {
      question.selectedAnswers.splice(selectedIndex, 1);
    }
  }

  trackByFn(index: any, item: any) {
    return index;
  }

  isAnswerCorrect(question: QuizItem, choiceId: number): boolean {
    return question.correctAnswers.includes(choiceId);
  }

  isAnswerIncorrect(question: QuizItem, choiceId: number): boolean {
    return !this.isAnswerCorrect(question, choiceId) && question.selectedAnswers.includes(choiceId);
  }

  isQuestionUnanswered(question: QuizItem): boolean {
    return question.selectedAnswers.length === 0;
  }

  isUserSelectedAnswer(question: QuizItem, choiceId: number): boolean {
    return question.selectedAnswers.includes(choiceId);
  }

  shuffle() {
    if (!this.randomize) return this.questions;
    return this.questions.sort(() => Math.random() - 0.5);
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.textToSpeech();
    } else {
      this.stopTimer();
      this.checkAnswers();
      this.showResult = true;
      this.isButtonDisabled = true;
    }
  }

  prevQuestion() {
    if (!this.backtracking || this.currentQuestionIndex <= 0) return;
    this.currentQuestionIndex--;
  }

  getRealTotal() {
    return this.questions.reduce((acc: number, curr: any) => {
      return curr.type == 3 ? acc + 5 : acc + 1;
    }, 0);
  }

  async geminiCheckAnswer(question: any) {
    const answer = question.selectedAnswers[0];
    question.analysisAnswer = answer;

    const prompt = `"Please evaluate the following question and answer. Assign a score of either 0 to 5 based on the accuracy of the user's response.

    Question: "${question.question}"
    User's Answer: "${answer}"

    Provide only the number 0 to 5 as the response. Do not include any additional text."`;

    try {
      const result = await this.API.analyzeEssay(prompt);
      return Number(result);
    } catch (error) {
      if (error instanceof Error) {
        this.API.failedSnackbar(error.message, 99999999);
      } else {
        this.API.failedSnackbar('An unexpected error occurred.', 99999999);
      }
      question.analysisResult = 'Score: Not Available';
      return null;
    }
  }

  async checkAnswers() {
    this.API.showLoader();
    this.correctAnswers = 0;
    const totalQuestions = this.getRealTotal();

    for (let question of this.questions) {
      const correctAnswersSet = new Set(question.correctAnswers);
      const selectedAnswersSet = new Set(question.selectedAnswers);

      if (question.type === 3) {
        const score = await this.geminiCheckAnswer(question);
        if (score === null) {
          this.correctAnswers = 0;
          await this.checkAnswers();
          return;
        }
        this.correctAnswers += score;
      } else {
        if (
          this.setsAreEqual(correctAnswersSet, selectedAnswersSet) ||
          this.matchText(question.selectedAnswers[0], question.correctAnswers[0])
        ) {
          this.correctAnswers++;
        }
      }
    }

    if (this.isPractice) {
      this.API.recordAssessment(
        this.practiceID!,
        this.level! + 1,
        this.correctAnswers,
        totalQuestions,
        this.mode
      );
      if (this.correctAnswers >= totalQuestions) {
        this.API.updateLevel(this.practiceID!, this.level! + 1, this.mode);
      }
    } else {
      this.API.updateQuizScore(this.quizID, this.correctAnswers);
      this.API.pushNotifications(
        `${this.API.getFullName()} finished a quiz`,
        `${this.API.getFullName()} finished a quiz titled <b>'${this.title}'</b>. Their score has been successfully recorded.`,
        this.teacherid
      );
    }

    this.API.hideLoader();
    this.showResult = true;
    this.isButtonDisabled = true;

    this.snackBar.open(`Quiz completed. Score: ${this.correctAnswers}/${totalQuestions}`, 'Close', { duration: 5000 });

    // Automatically close the modal after a 3-second delay to allow the student to see the result
    setTimeout(() => {
      console.log('Auto-closing modal after showing results'); // Debug log
      this.closeModal();
    }, 3000);
  }

  closeModal() {
    console.log('Closing modal with score:', this.correctAnswers); // Debug log
    this.stopTimer(); // Ensure timer is stopped
    this.activeModal.close(this.correctAnswers); // Close the modal and pass the score
  }

  setsAreEqual(setA: Set<number>, setB: Set<number>): boolean {
    if (setA.size !== setB.size) return false;
    for (const item of setA) if (!setB.has(item)) return false;
    return true;
  }
}
