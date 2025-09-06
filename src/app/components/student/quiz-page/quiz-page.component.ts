import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  Renderer2,
  ElementRef,
  Input,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Japanese, English, French } from 'src/app/shared/MockData/selfstudy/model/models';
import { Location } from '@angular/common';
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
  timeLimit?: number | null; // Time limit for this specific question in seconds
  timeRemaining?: number | null; // Current time remaining for this question
}

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.css'],
  providers: [NgbActiveModal]
})
export class QuizPageComponent implements OnInit, OnDestroy {
  @Input() quizID: string = ''; // Used when opened as a modal
  @Input() isModal: boolean = false; // Flag to indicate modal usage
  level?: number;
  questions: Array<QuizItem> = [];
  currentQuestionIndex = 0;
  correctAnswers = 0;
  timeRemaining = 180; // Keep for overall quiz timer as fallback
  currentQuestionTimeRemaining = 0; // Time remaining for current question
  showResult = false;
  timelimit = 180;
  timer: any;
  questionTimer: any; // Timer for individual questions
  backtracking = true;
  review = true;
  randomize = true;
  teacherid = '';
  isButtonDisabled: boolean = false;
  private examInProgress: boolean = true;
  quizIDFromAPI: string = ''; // Used when not a modal
  isPractice = false;
  mode = 'reading';
  lang = '';
  analyzing = false;
  generating = false;
  hasPerQuestionTimeLimits = false; // Flag to determine timer type
  quizLoaded = false; // Flag to ensure quiz is loaded before starting timer

  title: string = 'Welcome to the QLAB Language Proficiency Quiz!';
  description: string = 'Test your skills and see how well you know the language. Choose the correct answers for each question. Good luck!';
  practiceID?: string;
  popupQuiz: boolean = false;    

  constructor(
    private API: APIService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private renderer: Renderer2,
    private el: ElementRef,
    private snackBar: MatSnackBar,
    private activeModal: NgbActiveModal
  ) {}

  ngOnInit() {
    this.correctAnswers = 0;

    /* ───────────────────────────────
       1.  QUIZ SHOWN INSIDE A MODAL
       ─────────────────────────────── */
    if (this.isModal) {
      if (!this.quizID) {
        this.snackBar.open('Quiz ID is missing. Unable to load quiz.', 'Close', { duration: 3000 });
        this.closeModal();
        return;
      }
      this.loadQuiz(this.quizID);      // fullscreen is never used in a modal
    }

    /* ───────────────────────────────
       2.  STAND‑ALONE PAGE
       ─────────────────────────────── */
    else {
      const taskID = this.API.quizID;
      this.API.quizID = null;

      /* --------- 2‑A  PRACTICE SESSION --------- */
      if (taskID == null) {
        this.isPractice = true;
        const sessionObject = this.API.currentPractice;
        this.level       = sessionObject.id;
        this.mode        = sessionObject.mode;
        this.practiceID  = sessionObject.practiceID;
        if (sessionObject.title)       this.title       = sessionObject.title;
        if (sessionObject.description) this.description = sessionObject.description;
        this.API.currentPractice = null;

        // Load practice questions for Japanese
        if (sessionObject.lang == 'japanese') {
          for (let item of japanese.quizzes[this.level!].items) {
            const itemOptions: Array<QuizOption> = [];
            let i = 0;
            for (let option of item.options) {
              const newOption: QuizOption = {
                id: i,
                text: String.fromCharCode(65 + i) + '. ' + option,
              };
              itemOptions.push(newOption);
              i += 1;
            }
            const newitem: QuizItem = {
              type: 0,
              question: item.question,
              choices: itemOptions,
              correctAnswers: [item.options.indexOf(item.answer)],
              selectedAnswers: [],
              analysisResult: '',
              analysisAnswer: undefined
            };
            this.questions.push(newitem);
          }
        }

        // Load practice questions for English
        if (sessionObject.lang == 'english') {
          for (let item of english.quizzes[this.level!].items) {
            const itemOptions: Array<QuizOption> = [];
            let i = 0;
            for (let option of item.choices) {
              const newOption: QuizOption = {
                id: i,
                text: String.fromCharCode(65 + i) + '. ' + option,
              };
              itemOptions.push(newOption);
              i += 1;
            }
            const newitem: QuizItem = {
              type: 0,
              question: item.question,
              choices: itemOptions,
              correctAnswers: [item.choices.indexOf(item.answer)],
              selectedAnswers: [],
              analysisResult: '',
              analysisAnswer: undefined
            };
            this.questions.push(newitem);
          }
        }

        // Load practice questions for French
        if (sessionObject.lang == 'french') {
          for (let item of french.quizzes[this.level!].items) {
            const itemOptions: Array<QuizOption> = [];
            let i = 0;
            for (let option of item.choices) {
              const newOption: QuizOption = {
                id: i,
                text: String.fromCharCode(65 + i) + '. ' + option,
              };
              itemOptions.push(newOption);
              i += 1;
            }
            const newitem: QuizItem = {
              type: 0,
              question: item.question,
              choices: itemOptions,
              correctAnswers: [item.choices.indexOf(item.answer)],
              selectedAnswers: [],
              analysisResult: '',
              analysisAnswer: undefined
            };
            this.questions.push(newitem);
          }
        }

        switch (sessionObject.lang) {
          case 'english':  this.lang = 'en'; break;
          case 'japanese': this.lang = 'ja'; break;
          case 'french':   this.lang = 'fr'; break;
        }
        this.questions = this.shuffle();
        this.textToSpeech();
        this.API.hideLoader();
        this.quizLoaded = true;

        /* ★  practice quizzes always go fullscreen immediately  */
        this.toggleFullscreen();
        
        // ★ Start timer only AFTER quiz is loaded
        this.startTimer();
      }

      /* --------- 2‑B  REGULAR QUIZ FROM DATABASE --------- */
      else {
        this.quizIDFromAPI = taskID;
        this.loadQuiz(taskID);   // ★ loadQuiz will call startTimer itself
      }
    }

    // ★ REMOVED: Don't start timer here for database quizzes
    // this.startTimer(); // This was causing premature timer start
  }

  loadQuiz(quizID: string) {
    this.API.showLoader();
    
    // Check if student can retake this assessment
    this.API.canStudentRetake(quizID).then((retakeStatus) => {
      if (!retakeStatus.canRetake) {
        this.snackBar.open(
          `You have reached the maximum number of attempts (${retakeStatus.retakeLimit}) for this assessment.`, 
          'Close', 
          { duration: 5000 }
        );
        this.API.hideLoader();
        this.isModal ? this.closeModal() : this.router.navigate(['/']);
        return;
      }
      
      // If student can retake, proceed with loading the quiz
      this.loadQuizContent(quizID);
    }).catch((error) => {
      console.error('Error checking retake eligibility:', error);
      // If there's an error checking, allow the quiz to load (fail-safe)
      this.loadQuizContent(quizID);
    });
  }

  loadQuizContent(quizID: string) {
    this.API.studentGetQuiz(quizID).subscribe(
      async (data) => {
        if (!data.success) {
          this.isModal ? this.closeModal() : this.router.navigate(['/']);
          this.API.hideLoader();
          return;
        }

        /* ───── 1. HEADER / SETTINGS ───── */
        this.title       = data.output[0].title;
        this.teacherid   = data.output[0].teacherid;
        this.description = data.output[0].details;
        this.timelimit   = data.output[0].timelimit * 60;
        this.timeRemaining = this.timelimit;

        /* settings string ---------------------------------------------------- */
        this.backtracking = false;
        this.randomize    = false;
        this.review       = false;
        if (data.output[0].settings) {
          this.backtracking = data.output[0].settings.includes('allow_backtrack');
          this.randomize    = data.output[0].settings.includes('random_question');
          this.review       = data.output[0].settings.includes('allow_review');
          this.popupQuiz    = data.output[0].settings.includes('popup_quiz');
        }

        /* ───── 2. CLEAR & RE‑POPULATE ITEMS ───── */
        this.questions = [];
        let hasAnyTimeLimit = false;

        for (const item of data.output) {
          /* build the option list */
          const itemOptions: QuizOption[] = [];
          let correctAnswers: any[] = [];

          if (item.type == '0') {                             // Multiple‑choice
            let i = 0;
            for (const opt of item.options.split('\\n\\n')) {
              if (!opt.trim()) continue;
              const [text, attachment] = opt.split('::::');
              itemOptions.push({
                id: i,
                text: String.fromCharCode(65 + i) + '. ' + text,
                attachment: this.getUrl(attachment)
              });
              i++;
            }
            correctAnswers = item.answer.split(' ').map((a: string) => Number(a));
          }
          else if (item.type == '1') {                        // True / False
            itemOptions.push({ id: 0, text: 'TRUE'  });
            itemOptions.push({ id: 1, text: 'FALSE' });
            correctAnswers.push(item.answer == 'T' ? 0 : 1);
          }
          else {                                              // Identification / Essay
            itemOptions.push({ id: 0, text: `${item.answer}` });
            correctAnswers.push(item.answer);
          }

          const selectedAnswers = Number(item.type) > 1 ? [''] : [];
          const [questionTxt, attachRaw = '' ] = item.question.split('::::');

          // Check for per-question time limit - Fixed type issue
          const timeLimit: number | null = item.time_limit ? Number(item.time_limit) : null;
          if (timeLimit) {
            hasAnyTimeLimit = true;
          }

          this.questions.push({
            type  : Number(item.type),
            question : questionTxt,
            attachments : attachRaw.split('\\n\\n')
                                   .filter((x: string) => x.trim())
                                   .map((x: string) => this.getUrl(x)),
            choices        : itemOptions,
            correctAnswers : correctAnswers,
            selectedAnswers: selectedAnswers,
            analysisResult : '',
            analysisAnswer : undefined,
            timeLimit: timeLimit,      // Now properly typed as number | null
            timeRemaining: timeLimit   // Now properly typed as number | null
          });
        }

        /* ───── 3. DETERMINE TIMER TYPE ───── */
        this.hasPerQuestionTimeLimits = hasAnyTimeLimit;

        /* ───── 4. POST‑PROCESS ───── */
        this.questions = this.shuffle();
        this.currentQuestionIndex = 0;

        // Initialize current question timer if applicable
        if (this.hasPerQuestionTimeLimits) {
          this.initializeCurrentQuestionTimer();
        }

        if (!this.popupQuiz && !this.isModal) {
          this.toggleFullscreen();
        }

        if (!this.isPractice) {
          this.API.recordQuiz(quizID, this.correctAnswers, this.getRealTotal());
        }

        this.API.hideLoader();
        this.quizLoaded = true;

        // ★ Start timer only AFTER quiz is fully loaded
        this.startTimer();
      },
      (err) => {
        console.error('Error loading quiz:', err);
        this.API.failedSnackbar('Error loading quiz. Please try again.');
        this.API.hideLoader();
        this.isModal ? this.closeModal() : this.router.navigate(['/']);
      }
    );
  }

  ngOnDestroy() {
    this.stopTimer();
    this.stopQuestionTimer();
  }

  initializeCurrentQuestionTimer() {
    if (this.currentQuestionIndex < this.questions.length) {
      const currentQuestion = this.questions[this.currentQuestionIndex];
      this.currentQuestionTimeRemaining = currentQuestion.timeLimit || 0;
    }
  }

  startTimer() {
    // ★ Don't start timer if quiz isn't loaded yet
    if (!this.quizLoaded || this.mode === 'listening') return;

    console.log('🔥 Starting timer - hasPerQuestionTimeLimits:', this.hasPerQuestionTimeLimits);
    console.log('🔥 timeRemaining:', this.timeRemaining, 'timelimit:', this.timelimit);

    if (this.hasPerQuestionTimeLimits) {
      console.log('🔥 Starting per-question timer');
      this.startQuestionTimer();
    } else {
      console.log('🔥 Starting overall quiz timer');
      // ★ Fixed: Make sure we have a valid time limit
      if (this.timeRemaining <= 0) {
        this.timeRemaining = this.timelimit || 1800; // Default to 30 minutes if no time limit
      }
      
      this.timer = setInterval(() => {
        if (this.timeRemaining > 0) {
          this.timeRemaining--;
        } else {
          console.log('🔥 Overall timer expired');
          if (!this.isModal) this.exitFullscreen();
          this.stopTimer();
          this.checkAnswers();
          this.showResult = true;
          this.isButtonDisabled = true;
        }
      }, 1000);
    }
  }

  startQuestionTimer() {
    this.stopQuestionTimer(); // Clear any existing timer
    
    const currentQuestion = this.questions[this.currentQuestionIndex];
    if (!currentQuestion?.timeLimit) {
      console.log('🔥 No time limit for current question');
      return; // No time limit for this question
    }

    this.currentQuestionTimeRemaining = currentQuestion.timeLimit;
    console.log('🔥 Starting question timer for', this.currentQuestionTimeRemaining, 'seconds');

    this.questionTimer = setInterval(() => {
      if (this.currentQuestionTimeRemaining > 0) {
        this.currentQuestionTimeRemaining--;
        // Update the question's timeRemaining property
        this.questions[this.currentQuestionIndex].timeRemaining = this.currentQuestionTimeRemaining;
      } else {
        // Time's up for this question, move to next
        console.log('🔥 Question timer expired, moving to next question');
        this.stopQuestionTimer();
        this.snackBar.open('Time\'s up for this question!', 'Close', { duration: 2000 });
        this.moveToNextQuestion();
      }
    }, 1000);
  }

  stopQuestionTimer() {
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }
  }

  moveToNextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.textToSpeech();
      if (this.hasPerQuestionTimeLimits) {
        this.startQuestionTimer();
      }
    } else {
      // Quiz completed
      console.log('🔥 Quiz completed - all questions answered');
      this.stopTimer();
      this.checkAnswers();
      this.showResult = true;
      this.isButtonDisabled = true;
      if (!this.isModal) this.exitFullscreen();
    }
  }

  stopTimer() {
    console.log('🔥 Stopping all timers');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stopQuestionTimer();
    if (!this.isModal) this.removeMarginToClass();
  }

  secondsToMinutes(seconds: number) {
    return seconds < 60 ? seconds.toString() : Math.floor(seconds / 60).toString() + ':' + (seconds % 60).toString().padStart(2, '0');
  }

  getCurrentQuestionTimeDisplay(): string {
    if (!this.hasPerQuestionTimeLimits) {
      return this.secondsToMinutes(this.timeRemaining);
    }
    
    const currentQuestion = this.questions[this.currentQuestionIndex];
    if (!currentQuestion?.timeLimit) {
      return 'No Time Limit';
    }
    
    return this.secondsToMinutes(this.currentQuestionTimeRemaining);
  }

  getTimerLabel(): string {
    if (!this.hasPerQuestionTimeLimits) {
      return 'Time Remaining:';
    }
    
    const currentQuestion = this.questions[this.currentQuestionIndex];
    if (!currentQuestion?.timeLimit) {
      return 'Question Time:';
    }
    
    return 'Question Time Remaining:';
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
    if (this.hasPerQuestionTimeLimits) {
      this.stopQuestionTimer();
    }
    
    this.moveToNextQuestion();
  }

  prevQuestion() {
    if (!this.backtracking || this.currentQuestionIndex <= 0) return;
    
    if (this.hasPerQuestionTimeLimits) {
      this.stopQuestionTimer();
    }
    
    this.currentQuestionIndex--;
    
    if (this.hasPerQuestionTimeLimits) {
      this.startQuestionTimer();
    }
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
      const quizID = this.isModal ? this.quizID : this.quizIDFromAPI;
      console.log('Updating quiz score:', quizID, this.correctAnswers);
      this.API.updateQuizScore(quizID, this.correctAnswers);
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
  }

  closeModal() {
    if (this.isModal) {
      this.activeModal.close(this.correctAnswers);
    } else {
      this.resetQuiz();
    }
  }

  setsAreEqual(setA: Set<number>, setB: Set<number>): boolean {
    if (setA.size !== setB.size) return false;
    for (const item of setA) if (!setB.has(item)) return false;
    return true;
  }

  resetQuiz() {
    if (!this.isModal) {
      this.location.back();
    }
  }

  logout() {
    this.renderer.removeClass(document.body, 'min-[768px]:ml-64');
    this.API.logout();
  }

  toggleFullscreen() {
    /* 1 – never run in a modal */
    if (this.isModal) return;

    /* 2 – skip when teacher marked quiz as "video pop‑up" */
    if (this.popupQuiz) return;

    const elem = this.el.nativeElement;

    /* ---------- existing fullscreen logic ---------- */
    this.checkScreenSize();

    if (!document.fullscreenElement) {
      const keydownListener = (e: KeyboardEvent) => {
        if (e.key === 'F11') {
          e.preventDefault();   // disable F11 while in fullscreen
        }
      };
      document.addEventListener('keydown', keydownListener);

      elem.requestFullscreen()
        .then(() => {
          this.renderer.setStyle(document.body, 'overflow-y', 'auto');
          this.renderer.setStyle(document.body, 'height', '100%');

          document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
              document.removeEventListener('keydown', keydownListener);
              this.renderer.removeStyle(document.body, 'overflow-y');
              this.renderer.removeStyle(document.body, 'height');
              this.stopTimer();
              this.checkAnswers();     // auto‑submit on early exit
              this.showResult = true;
              this.isButtonDisabled = true;
            }
          });
        })
        .catch((err: any) => console.error('Error attempting fullscreen:', err));
    }
  }

  exitFullscreen() {
    if (this.isModal) return; // Skip in modal mode
    if (document.fullscreenElement) {
      this.checkAnswers();
      document.exitFullscreen();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.isModal) {
      this.detectF11KeyPress(event);
    }
  }

  detectF11KeyPress(event: KeyboardEvent): void {
    // Only apply in standalone mode
  }

  disableAltTab() {
    if (this.isModal) return;
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key === 'TAB') {
        event.preventDefault();
      }
    });
  }

  disableEscapeKey() {
    if (this.isModal) return;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    });
  }

  checkScreenSize() {
    if (this.isModal) return;
    const isMobile = window.innerWidth <= 767;
    if (!isMobile) {
      this.addMarginToClass();
    } else {
      this.removeMarginToClass();
    }
  }

  addMarginToClass() {
    const element = this.el.nativeElement.querySelector('.marginthisbox');
    this.renderer.setStyle(element, 'margin', '200px');
  }

  removeMarginToClass() {
    const element = this.el.nativeElement.querySelector('.marginthisbox');
    this.renderer.setStyle(element, 'margin', '0px');
  }
}