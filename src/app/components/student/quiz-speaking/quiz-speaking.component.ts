import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Japanese, English, French } from 'src/app/shared/MockData/selfstudy/model/models';
import { Location } from '@angular/common';
import { AssemblyAI } from 'assemblyai';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

const japanese = new Japanese();
const english = new English();
const french = new French();

interface QuizItem {
  question: string;
  suggestedAnswer: string;
  userAnswer?: string;
}

@Component({
  selector: 'app-quiz-speaking',
  templateUrl: './quiz-speaking.component.html',
  styleUrls: ['./quiz-speaking.component.css']
})
export class QuizSpeakingComponent implements OnInit, OnDestroy {
  // Recording states
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  recording = false;
  analysing = false;
  nextLevel = false;
  isUploading = false;

  // Quiz states
  level?: number;
  userAnswer = '';
  questions: Array<QuizItem> = [];
  currentQuestionIndex = 0;
  correctAnswersCount = 0;
  showResult = false;
  timelimit = 60;
  timer: any;
  backtracking = true;
  review = true;
  randomize = true;
  isPractice = false;
  inputEnabled = true;
  mode = 'speaking';
  mockAnswer = '';

  // UI elements
  audio: HTMLAudioElement;
  title = 'Welcome to the QLAB Language Proficiency Quiz!';
  description = 'Test your skills and see how well you know the language. Choose the correct answers for each question. Good luck!';
  practiceID?: string;
  lang = 'en';

  constructor(
    private API: APIService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    this.audio = new Audio();
    this.audio.src = '../../../assets/sounds/notif.mp3';
    this.audio.load();
  }

  ngOnInit() {
    this.initializeQuiz();
    
    // Subscribe to loading state
    this.API.isLoading$.subscribe(
      isLoading => {
        this.isUploading = isLoading;
        if (isLoading) {
          this.mockAnswer = 'Uploading audio file...';
        }
      }
    );
  }

  ngOnDestroy() {
    this.cleanupRecording();
  }

  private async initializeQuiz() {
    const taskID = this.API.quizID;
    this.API.quizID = null;
    this.route.snapshot.paramMap.get('taskID');

    try {
      const sessionObject = this.API.currentPractice;
      if (!sessionObject) return;

      this.isPractice = true;
      this.level = sessionObject.id;
      this.practiceID = sessionObject.practiceID;
      
      if (sessionObject.title) {
        this.title = sessionObject.title;
      }
      if (sessionObject.description) {
        this.description = sessionObject.description;
      }

      this.API.currentPractice = null;
      this.loadQuestions(sessionObject.lang);
      this.setLanguageCode(sessionObject.lang);

      if (this.randomize) {
        this.shuffle();
      }
    } catch (error) {
      console.error('Quiz initialization error:', error);
      this.API.failedSnackbar('Failed to initialize quiz');
    }
  }

  private loadQuestions(language: string) {
    if (this.level === undefined) return;
    
    const quizMap = {
      japanese: japanese.speakingQuiz,
      english: english.speakingQuiz,
      french: french.speakingQuiz
    };

    const selectedQuiz = quizMap[language as keyof typeof quizMap]?.[this.level];
    if (selectedQuiz?.items) {
      this.questions = selectedQuiz.items.map(item => ({
        question: item.question,
        suggestedAnswer: item.answer,
        userAnswer: ''
      }));
    }
  }

  private setLanguageCode(language: string) {
    const languageCodes = {
      english: 'en',
      japanese: 'ja',
      french: 'fr'
    };
    this.lang = languageCodes[language as keyof typeof languageCodes] || 'en';
  }

  toggleRecording(): void {
    if (!this.recording && this.analysing) return;
    
    if (!this.isRecording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.start();
      this.recording = true;
      this.isRecording = true;
      this.mockAnswer = 'Recording... Speak now!';

      this.mediaRecorder.ondataavailable = (event: any) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];

        const currentQuestion = this.questions[this.currentQuestionIndex];
        const cleanQuestion = this.clean(currentQuestion.question);
        
        try {
          this.analysing = true;
          await this.API.speechToText(audioBlob, cleanQuestion, this.lang);
        } catch (error) {
          console.error('Error processing speech:', error);
          this.API.failedSnackbar('Failed to process speech. Please try again.');
          this.resetRecordingState();
        }
      };

      // Auto stop recording after 3 seconds
      setTimeout(() => {
        if (this.recording) {
          this.stopRecording();
        }
      }, 3000);

    }).catch((err) => {
      console.error('Microphone access denied:', err);
      this.API.failedSnackbar('Microphone access denied. Please check your browser settings.', 3000);
    });
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.isRecording = false;
      this.recording = false;
      this.mockAnswer = 'Analyzing your speech...';
      this.mediaRecorder.stop();
      
      // Clean up the media stream
      const tracks = this.mediaRecorder.stream?.getTracks();
      tracks?.forEach(track => track.stop());
    }
  }

  private resetRecordingState() {
    this.isRecording = false;
    this.recording = false;
    this.analysing = false;
    this.mockAnswer = '';
    this.audioChunks = [];
  }

  private cleanupRecording() {
    if (this.mediaRecorder?.stream) {
      const tracks = this.mediaRecorder.stream.getTracks();
      tracks.forEach(track => track.stop());
    }
    this.mediaRecorder = null;
  }

  clean(phrase: string): string {
    return phrase.split('(')[0].trim();
  }

  shuffle() {
    this.questions = [...this.questions].sort(() => Math.random() - 0.5);
  }

  nextQuestion() {
    this.nextLevel = false;
    this.questions[this.currentQuestionIndex].userAnswer = this.userAnswer;
    this.currentQuestionIndex++;
    this.userAnswer = '';
    this.mockAnswer = '';
    
    if (this.currentQuestionIndex >= this.questions.length) {
      this.finishQuiz();
    }
  }

  private async finishQuiz() {
    this.showResult = true;
    this.correctAnswersCount = this.questions.length;
    
    if (this.isPractice && this.practiceID && this.level !== undefined) {
      try {
        await this.API.recordAssessment(
          this.practiceID,
          this.level + 1,
          this.correctAnswersCount,
          this.questions.length,
          this.mode
        );
        
        if (this.correctAnswersCount >= this.questions.length) {
          await this.API.updateLevel(this.practiceID, this.level + 1, this.mode);
        }
      } catch (error) {
        console.error('Error saving quiz results:', error);
        this.API.failedSnackbar('Error saving quiz results');
      }
    }
  }

  resetQuiz() {
    this.cleanupRecording();
    this.location.back();
  }

  tryAgain() {
    this.resetRecordingState();
    this.startRecording();
  }

  goBack() {
    if (this.nextLevel) {
      this.resetRecordingState();
    } else {
      this.location.back();
    }
  }

  // Set up subscriptions for speech comparison results
  ngAfterViewInit() {
    this.API.speechComparison$.subscribe({
      next: (comparison) => {
        if (comparison.accuracy > 0.6) {
          this.audio.play();
          this.nextLevel = true;
          this.mockAnswer = 'Excellent pronunciation!';
          this.API.successSnackbar('Great job! Ready for next question.', 3000);
        } else {
          const percentage = Math.round(comparison.accuracy * 100);
          this.mockAnswer = `Try again! Accuracy: ${percentage}%`;
          this.API.failedSnackbar(`Keep practicing! Accuracy: ${percentage}%`, 3000);
        }
        this.analysing = false;
      },
      error: (error) => {
        console.error('Speech comparison error:', error);
        this.API.failedSnackbar('Failed to analyze speech. Please try again.');
        this.resetRecordingState();
      }
    });
  }
}