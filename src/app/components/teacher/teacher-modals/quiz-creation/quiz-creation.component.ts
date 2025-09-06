import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable, catchError, firstValueFrom, lastValueFrom, of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { APIService } from 'src/app/services/API/api.service';

interface CourseClass {
  id: string;
  courseid: string;
  course: string;
  class: string;
  pretest?: string; // Adjust if API returns boolean
}

@Component({
  selector: 'app-quiz-creation',
  templateUrl: './quiz-creation.component.html',
  styleUrls: ['./quiz-creation.component.css'],
})
export class QuizCreationComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Input() myCustomClass: string = '';
  @Input() quiz: any = null;
  @Input() courses: any = [];
  @Input() questionsFromBank: any[] = [];

  course: CourseClass | null = null;
  classes: CourseClass[] = [];
  availableCourses: { courseid: string; course: string }[] = [];
  availableClasses: { id: string; courseid: string; class: string }[] = [];
  selectedCourseId: string = '';
  selectedClassID: string = '';
  lesson: string = '';
  topic: string = '';
  title: string = '';
  description: string = '';
  retakeLimit?: number;
  deadline: string = '';
  attachments?: File;
  settings: any = {
    random_question: false,
    allow_backtrack: false,
    allow_review: false,
    popup_quiz: false,
  };
  loading: boolean = false;
  uploading: boolean = false;
  lessons: any[] = [];
  topics: any[] = [];
  types: string[] = ['Multiple Choice', 'True/False', 'Identification', 'Essay'];
  removeList: string[] = [];
  questions: any[] = [
    {
      type: '0',
      question: { value: '', attachments: [] },
      options: [
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
      ],
      answer: '',
    },
  ];
  isPreTest: boolean = false;
  showPreTestOption: boolean = false;
  hasExistingPreTest: boolean = false;

  // AI Modal Variables
  showAIModal: boolean = false;
  aiQuestionCount: number = 1; // Number of questions to generate
  generatedQuestions: any[] = []; // Store all generated questions for display
  selectedQuestionType: string = '';
  currentEditingQuestion: any = null;

  // Question Bank Modal Variables
  showQuestionBankModal: boolean = false;
  questionBankQuestions: any[] = [];
  questionBankCategories: string[] = [];
  selectedCategory: string = 'all';
  selectedType: string = 'all';
  searchTerm: string = '';
  selectedQuestions: Set<number> = new Set();
  loadingQuestions: boolean = false;
  showCategoryModal: boolean = false;
  selectedCategoryForBank: string = '';
  newCategoryName: string = '';
  currentQuestionForBank: any = null;

  defaultQuestionTimeLimit: number = 60; // Default 60 seconds per question
  enableQuestionTimeLimits: boolean = false; // Toggle for per-question time limits

  constructor(
    private API: APIService,
    private cdRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.quiz) {
      this.loading = true;
      this.API.showSnackbar('Loading quiz details...', undefined, 999999999);

      await this.loadAllCourses();
      
      await this.loadClasses();

      this.selectedCourseId = this.quiz.courseid;
      await this.onCourseDropdownChange();
      this.selectedClassID = this.quiz.classid;
      await this.onClassSelectionChange();

      if (this.quiz.lessonid) {
        this.lesson = this.quiz.lessonid;
        const topicData = await firstValueFrom(this.API.getTopics(this.quiz.lessonid));
        if (topicData.success) this.topics = topicData.output;
        if (this.quiz.topicid) this.topic = this.quiz.topicid;
      }

      this.title = this.quiz.title;
      this.description = this.quiz.details;
      this.retakeLimit = this.quiz.retake_limit;
      this.deadline = this.quiz.deadline;
      this.attachments = this.quiz.attachments;
      this.isPreTest = this.quiz.pretest === true || this.quiz.pretest === 't';

      this.settings = {
        random_question: this.quiz.settings?.includes('random_question') ?? false,
        allow_backtrack: this.quiz.settings?.includes('allow_backtrack') ?? false,
        allow_review: this.quiz.settings?.includes('allow_review') ?? false,
        popup_quiz: this.quiz.settings?.includes('popup_quiz') ?? false,
      };

      await this.loadQuizItems();
      this.API.successSnackbar('Quiz loaded successfully!');
      this.loading = false;

      
    } else {
      // For new quiz, start with empty questions array
      this.questions = [];
    }

    await this.loadAllCourses();

    await this.loadClasses();

    console.log('=== COURSES DEBUG IN QUIZ CREATION ===');
    console.log('this.courses value:', this.courses);
    console.log('this.courses length:', this.courses?.length);
    console.log('this.courses type:', typeof this.courses);
    console.log('=== END COURSES DEBUG ===');

    // Always load categories
    this.loadQuestionBankCategories();

    // Process questions from bank (this will populate the questions array)
    if (this.questionsFromBank && this.questionsFromBank.length > 0) {
      console.log('Adding questions from bank:', this.questionsFromBank);
      this.addQuestionsFromBank(this.questionsFromBank);
    } else if (this.questions.length === 0) {
      // Only add default question if no questions from bank and no existing questions
      this.questions = [this.createNewQuestion()];
    }
  }

  private async loadAllCourses(): Promise<void> {
    console.log('=== COURSES LOADING DEBUG ===');
    console.log('1. Starting loadAllCourses method');
    console.log('2. Current user ID:', this.API.getUserData().id);
    
    try {
      console.log('3. About to call API.teacherAllCourses()');
      this.API.showLoader();
      
      const data = await firstValueFrom(this.API.teacherAllCourses());
      console.log('4. API response received:', data);
      console.log('5. API response success:', data.success);
      console.log('6. API response output:', data.output);
      
      if (data.success) {
        console.log('7. Mapping courses data...');
        // ✅ FIX: Use the correct property names that match your HTML
        this.availableCourses = data.output.map((course: any) => {
          const mappedCourse = {
            courseid: course.id,        // ✅ Match HTML [value]="course.courseid"
            course: course.course       // ✅ Match HTML {{ course.course }}
          };
          console.log('8. Mapped course:', mappedCourse);
          return mappedCourse;
        });
        
        console.log('9. Final availableCourses array:', this.availableCourses);
        console.log('10. availableCourses array length:', this.availableCourses.length);
      } else {
        console.error('11. API returned success: false');
        this.API.failedSnackbar('Unable to load courses');
      }
    } catch (error) {
      console.error('12. Error occurred:', error);
      this.API.failedSnackbar('Error loading courses');
    } finally {
      console.log('13. Hiding loader');
      this.API.hideLoader();
      console.log('=== END COURSES DEBUG ===');
    }
  }

  private async loadClasses(): Promise<void> {
    try {
      this.API.showLoader();
      const data = await firstValueFrom(this.API.teacherAllClasses());
      if (data.success) {
        this.availableClasses = data.output.map((_class: any) => ({
          id: _class.id,
          courseid: _class.courseid,
          class: _class.class,
        }));
        this.classes = this.availableClasses.map((cls) => {
          const course = this.availableCourses.find((c) => c.courseid === cls.courseid)?.course || 'Unknown Course';
          return {
            id: cls.id,
            courseid: cls.courseid,
            course: course,
            class: cls.class,
          };
        });
      } else {
        this.API.failedSnackbar('Unable to load classes');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      this.API.failedSnackbar('Error loading classes');
    } finally {
      this.API.hideLoader();
    }
  }

  async onCourseDropdownChange(): Promise<void> {
    if (this.selectedCourseId) {
      const selectedCourse = this.availableCourses.find(
        (course) => course.courseid === this.selectedCourseId
      );
      if (selectedCourse) {
        this.course = { id: '', courseid: selectedCourse.courseid, course: selectedCourse.course, class: '' };
        await this.onCourseSelectionChange();
      } else {
        this.API.failedSnackbar('Selected course not found');
      }
    } else {
      this.course = null;
      this.availableClasses = [];
      this.selectedClassID = '';
      this.lesson = '';
      this.topic = '';
      this.lessons = [];
      this.topics = [];
    }
  }

  async onCourseSelectionChange(): Promise<void> {
    if (!this.selectedCourseId) {
      this.availableClasses = [];
      this.selectedClassID = '';
      this.lesson = '';
      this.topic = '';
      this.lessons = [];
      this.topics = [];
      this.showPreTestOption = false;
      return;
    }

    if (this.availableClasses.length === 0) {
      await this.loadClasses();
    }
    this.availableClasses = this.classes.filter(
      _class => _class.courseid === this.selectedCourseId
    );

    if (!this.availableClasses.some(c => c.id === this.selectedClassID)) {
      this.selectedClassID = '';
    }

    this.lesson = '';
    this.topic = '';
    this.lessons = [];
    this.topics = [];

    this.showPreTestOption = await this.API.checkPreTestStatus(this.selectedCourseId);

    if (this.selectedClassID) {
      await this.onClassSelectionChange();
    }
  }

  async onClassSelectionChange(): Promise<void> {
    if (!this.selectedClassID || !this.selectedCourseId) {
      this.lesson = '';
      this.topic = '';
      this.topics = [];
      this.lessons = [];
      return;
    }

    const lessonData = await firstValueFrom(
      this.API.teacherCourseLessons(this.selectedCourseId)
    );

    if (!lessonData.success) {
      this.API.failedSnackbar('Failed to load lessons');
      return;
    }

    this.lessons = lessonData.output;
    console.log('Lessons loaded:', this.lessons); // Debug log to inspect lessons

    if (!this.lessons.some(l => String(l.id) === String(this.lesson))) {
      this.lesson = '';
    }

    await this.onLessonChange();
  }

  async onLessonChange(): Promise<void> {
    if (!this.lesson) {
      this.topics = [];
      this.topic = '';
      return;
    }

    const resp = await firstValueFrom(this.API.getTopics(this.lesson));

    if (!resp.success) {
      this.API.failedSnackbar('Failed to load topics');
      return;
    }

    this.topics = resp.output;
    console.log('Topics loaded:', this.topics); // Debug log to inspect topics

    if (!this.topic || !this.topics.some(t => String(t.id) === String(this.topic))) {
      this.topic = this.topics[0]?.id || '';
    }
  }

private async loadQuizItems(): Promise<void> {
    try {
      const data = await firstValueFrom(this.API.teacherGetQuizItems(this.quiz.id));
      if (data.success) {
        this.questions = data.output.map((item: any) => {
          const [question, attachments] = item.question.split('::::');
          let options =
            item.type === '0'
              ? item.options
                  .split('\\n\\n')
                  .map((option: string, index: number) => {
                    const [value, attachment] = option.split('::::');
                    return {
                      value,
                      attachment: attachment ? this.API.getURL(attachment) : null,
                      active: item.answer === index.toString(),
                    };
                  })
                  .slice(0, 4)
              : undefined;
          
          return {
            id: item.id,
            type: item.type,
            question: {
              value: question,
              attachments: attachments
                ?.split('\\n\\n')
                .filter((url: string) => url.trim())
                .map((url: string) => this.API.getURL(url)) || [],
            },
            options,
            answer: item.type === '0' ? item.answer : item.answer,
            timeLimit: item.time_limit || null // Add time limit from database
          };
        });

        // Check if any questions have time limits enabled
        this.enableQuestionTimeLimits = this.questions.some(q => q.timeLimit !== null);
      }
    } catch (error) {
      console.error('Error loading quiz items:', error);
      this.API.failedSnackbar('Failed to load quiz items');
    }
  }

    toggleQuestionTimeLimits(): void {
    if (this.enableQuestionTimeLimits) {
      // Enable time limits - set default time for questions without limits
      this.questions.forEach(question => {
        if (!question.timeLimit) {
          question.timeLimit = this.defaultQuestionTimeLimit;
        }
      });
    } else {
      // Disable time limits - remove time limits from all questions
      this.questions.forEach(question => {
        question.timeLimit = null;
      });
    }
  }

  setQuestionTimeLimit(question: any, timeLimit: number): void {
    if (timeLimit > 0) {
      question.timeLimit = timeLimit;
    } else {
      question.timeLimit = null;
    }
  }

   applyDefaultTimeLimitToAll(): void {
    if (this.enableQuestionTimeLimits && this.defaultQuestionTimeLimit > 0) {
      this.questions.forEach(question => {
        question.timeLimit = this.defaultQuestionTimeLimit;
      });
    }
  }


 private createNewQuestion(): any {
    return {
      type: '0',
      question: { value: '', attachments: [] },
      options: [
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
      ],
      answer: '',
      timeLimit: this.enableQuestionTimeLimits ? this.defaultQuestionTimeLimit : null // Add time limit
    };
  }

  selectedFileName: string | undefined;
  questionOnFileSelected(event: Event, question: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => question.attachments.push(reader.result);
      reader.readAsDataURL(input.files[0]);
    }
  }

  optionOnFileSelected(event: Event, option: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => (option.attachment = reader.result);
      reader.readAsDataURL(input.files[0]);
    }
  }

  removeOptionAttachment(option: any): void {
    if (confirm('Are you sure you want to remove this attachment?')) {
      option.attachment = null;
    }
  }

  removeQuestionAttachment(question: any, index: number): void {
    if (confirm('Are you sure you want to remove this attachment?')) {
      question.attachments.splice(index, 1);
    }
  }

  removeQuestion(index: number): void {
    if (confirm('Are you sure you want to remove this question?')) {
      if (this.questions[index].id) this.removeList.push(this.questions[index].id);
      this.questions.splice(index, 1);
    }
  }

  setTFAnswer(answer: string, question: any): void {
    question.answer = answer;
  }

  setType(question: any): void {
    if (question.type === '0' && !question.options) {
      question.options = [
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
      ];
    } else if (question.type !== '0') {
      question.options = undefined;
    }
    question.answer = question.type === '3' ? '{{auto-checked}}' : '';
  }

  addNewItem(): void {
    this.questions.push(this.createNewQuestion());
  }

  async uploadImage(file?: string): Promise<string | null> {
    if (!file) return null;
    const filelocation = `files/${uuidv4()}.png`;
    await this.API.uploadBase64(file, filelocation);
    return filelocation;
  }

  async onCourseChange(selectedClass: CourseClass): Promise<void> {
    try {
      this.course = selectedClass;
      this.selectedClassID = selectedClass.id;
      this.lesson = '';
      this.topic = '';
      this.topics = [];
      this.showPreTestOption = await this.API.checkPreTestStatus(selectedClass.courseid);
      if (selectedClass.courseid) {
        const response = await firstValueFrom(this.API.teacherCourseLessons(selectedClass.courseid));
        if (response.success) {
          this.lessons = response.output;
        } else {
          this.API.failedSnackbar('Failed to load lessons');
        }
      } else {
        this.lessons = [];
        this.showPreTestOption = false;
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
      this.API.failedSnackbar('Failed to fetch lessons for the selected course.');
    }
  }

  async submit(): Promise<void> {
    if (this.uploading || !this.validateInputs()) return;

    this.uploading = true;
    this.API.showLoader();

    const settings = this.prepareSettings();
    const attachments = await this.prepareAttachments();
    const quizData = {
      courseid: this.selectedCourseId,
      title: this.title?.trim() || '',
      description: this.description?.trim() || '',
      retakeLimit: this.retakeLimit ?? null,
      deadline: this.deadline || '',
      attachments: attachments || null,
      settings: settings || null,
      lesson: this.isPreTest ? null : (this.lesson || null),
      topic: this.isPreTest ? null : (this.topic || null),
      classid: this.isPreTest ? null : (this.selectedClassID || null),
      pretest: this.isPreTest,
    };

    try {
      if (this.quiz) {
        await this.updateExistingQuiz(quizData);
      } else {
        await this.createNewQuiz(quizData);
      }
      this.API.successSnackbar('Quiz saved successfully!');
      this.closeModal();
    } catch (error) {
      console.error('Error saving quiz:', error);
      this.API.failedSnackbar(`Failed to save quiz: ${this.getErrorMessage(error)}`);
    } finally {
      this.uploading = false;
      this.API.hideLoader();
    }
  }

  private async createNewQuiz(quizData: any): Promise<void> {
    const id = this.API.createID32();
    await lastValueFrom(
      this.API.createQuiz(
        quizData.courseid,
        id,
        quizData.title,
        quizData.description,
        quizData.deadline,
        quizData.attachments,
        quizData.settings,
        quizData.lesson,
        quizData.topic,
        quizData.classid,
        quizData.pretest,
        quizData.retakeLimit
      )
    );

    await this.saveQuizItems(id);

    this.API.notifyStudentsInCourse(
      `${this.API.getFullName()} uploaded a new quiz.`,
      `${this.API.getFullName()} uploaded a new quiz titled, <b>'${quizData.title}'</b>. Due on <b>${this.API.parseDate(quizData.deadline)}</b>.`,
      quizData.courseid
    );
  }

  private validateInputs(): boolean {
    if (!this.selectedCourseId) {
      this.API.failedSnackbar('Please select a course');
      return false;
    }
    if (!this.title?.trim()) {
      this.API.failedSnackbar('Please enter a quiz title');
      return false;
    }
  // Removed timelimit validation for assessment
    if (!this.deadline) {
      this.API.failedSnackbar('Please select a deadline');
      return false;
    }
    if (!this.isPreTest && !this.selectedClassID) {
      this.API.failedSnackbar('Please select a class');
      return false;
    }
    if (this.questions.length <= 0) {
      this.API.failedSnackbar('Please add at least one question');
      return false;
    }

    for (let i = 0; i < this.questions.length; i++) {
      const question = this.questions[i];
      if (!question.question.value?.trim()) {
        this.API.failedSnackbar(`Question #${i + 1} is empty`);
        return false;
      }
      if (question.type === '0') {
        if (!question.options.some((opt: any) => opt.active)) {
          this.API.failedSnackbar(`Please select one correct answer for Question #${i + 1}`);
          return false;
        }
        if (question.options.find((opt: any) => !opt.value?.trim())) {
          this.API.failedSnackbar(`Please fill in all options for Question #${i + 1}`);
          return false;
        }
        if (!['0', '1', '2', '3'].includes(question.answer)) {
          this.API.failedSnackbar(`Please select a valid answer for Question #${i + 1}`);
          return false;
        }
      }
      if (question.type === '1' && !['T', 'F'].includes(question.answer)) {
        this.API.failedSnackbar(`Please select True or False for Question #${i + 1}`);
        return false;
      }
      if (question.type === '2' && !question.answer?.trim()) {
        this.API.failedSnackbar(`Please provide an answer for Question #${i + 1}`);
        return false;
      }
    }
    return true;
  }

  private prepareSettings(): string {
    return Object.entries(this.settings)
      .filter(([_, active]) => active)
      .map(([key]) => key)
      .join(' ')
      .trim();
  }

  private async prepareAttachments(): Promise<string | undefined> {
    if (!this.attachments) return undefined;
    const fileparse = this.attachments.name.split('.');
    const serverLocation = `${this.API.createID36()}.${fileparse[fileparse.length - 1]}`;
    await this.API.uploadFileWithProgress(this.attachments, serverLocation);
    return `files/${serverLocation}>${this.attachments.name}`;
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred';
  }

  private async updateExistingQuiz(quizData: any): Promise<void> {
    await lastValueFrom(
      this.API.updateQuiz(
        quizData.courseid,
        this.quiz.id,
        quizData.title,
        quizData.description,
        quizData.deadline,
        quizData.attachments,
        quizData.settings,
        quizData.lesson,
        quizData.topic,
        quizData.classid,
        quizData.pretest,
        quizData.retakeLimit
      )
    );

    await this.saveQuizItems(this.quiz.id);
  }

 private async saveQuizItems(quizId: string) {
    for (const item of this.questions) {
      if (item.type === '3') {
        item.answer = item.answer?.trim() ? item.answer : '{{auto-checked}}';
      }

      const options = await this.prepareQuestionOptions(item);
      const qAttchs = await this.prepareQuestionAttachments(item.question);

      if (item.id) {
        await lastValueFrom(
          this.API.updateQuizItem(
            item.id,
            item.type,
            item.question.value + qAttchs,
            item.answer,
            options,
            item.timeLimit // Add time limit parameter
          )
        );
      } else {
        await lastValueFrom(
          this.API.createQuizItem(
            quizId,
            item.type,
            item.question.value + qAttchs,
            item.answer,
            options,
            item.timeLimit // Add time limit parameter
          )
        );
      }
    }

    for (const itemId of this.removeList) {
      await lastValueFrom(this.API.deleteQuizItem(itemId));
    }
  }

  private async prepareQuestionOptions(item: any): Promise<string> {
    if (item.type !== '0') return '';

    let options = '';
    for (const opt of item.options) {
      let link = opt.attachment;
      if (link?.includes('base64') && link?.includes('data:image')) {
        link = await this.uploadImage(link);
      }
      options += `${opt.value}::::${link ?? ''}\\n\\n`;
    }
    return options.trimEnd();
  }

  private async prepareQuestionAttachments(question: any): Promise<string> {
    let attachments = '::::';
    for (const attachment of question.attachments) {
      let link = attachment;
      if (attachment.includes('base64') && attachment.includes('data:image')) {
        link = await this.uploadImage(attachment);
      }
      attachments += (attachments === '::::' ? '' : '\n\n') + link;
    }
    return attachments;
  }

  // AI-Related Functions
  openAIModal(question: any): void {
    this.currentEditingQuestion = question;
    this.selectedQuestionType = question.type;
    this.showAIModal = true;
    this.aiQuestionCount = 1;
    this.generatedQuestions = [];
    this.cdRef.detectChanges();
  }

  async generateAIQuestions(): Promise<void> {
    if (!this.aiQuestionCount || this.aiQuestionCount < 1) {
        this.API.failedSnackbar('Please enter a valid number of questions!');
        return;
    }

    if (!this.selectedCourseId || (!this.isPreTest && !this.selectedClassID)) {
        this.API.failedSnackbar('Please select at least a course and class!');
        return;
    }

    this.loading = true; // Set loading state
    this.API.justSnackbar('Generating questions, please wait...');
    try {
        this.generatedQuestions = []; // Clear previous generated questions

        // Fetch course details
        const courseData = await firstValueFrom(this.API.getCourses());
        if (!courseData.success) {
            this.API.failedSnackbar('Failed to load course details');
            return;
        }
        const course = courseData.output.find((c: any) => c.id === this.selectedCourseId);
        if (!course?.details) {
            this.API.failedSnackbar('Course details not found');
            return;
        }
        const courseDetails = course.details;
        console.log('Course details:', courseDetails);

        let lessonDetails = '';
        let lessonTitle = '';
        let topicDetails = '';
        let topicTitle = '';
        let allLessons = [];

        if (!this.isPreTest) {
            // Fetch lessons for the selected course
            const lessonData = await firstValueFrom(this.API.teacherCourseLessons(this.selectedCourseId));
            if (!lessonData.success) {
                this.API.failedSnackbar('Failed to load lessons');
                return;
            }
            allLessons = lessonData.output;
            console.log('Lessons fetched:', allLessons);

            if (this.selectedClassID && this.lesson && this.topic) {
                // All selected: Use specific lesson and topic
                const lesson = allLessons.find((l: any) => String(l.id) === String(this.lesson));
                if (!lesson) {
                    this.API.failedSnackbar('Selected lesson not found');
                    return;
                }
                console.log('Selected lesson:', lesson);
                lessonTitle = lesson.title || 'Untitled Lesson';
                lessonDetails = lesson.details || lesson.description || lesson.content || 'No lesson details available';
                if (!lessonDetails || lessonDetails === 'No lesson details available') {
                    this.API.failedSnackbar('Lesson details not found');
                    return;
                }

                const topicData = await firstValueFrom(this.API.getTopics(this.lesson));
                if (!topicData.success) {
                    this.API.failedSnackbar('Failed to load topic details');
                    return;
                }
                const topics = topicData.output;
                const topic = topics.find((t: any) => String(t.id) === String(this.topic));
                if (!topic) {
                    this.API.failedSnackbar('Selected topic not found');
                    return;
                }
                console.log('Selected topic:', topic);
                topicTitle = topic.title || 'Untitled Topic';
                topicDetails = topic.details || topic.description || topic.content || 'No topic details available';
                if (!topicDetails || topicDetails === 'No topic details available') {
                    this.API.failedSnackbar('Topic details not found');
                    return;
                }
            } else if (this.selectedClassID && this.lesson) {
                // Course, class, and lesson selected: Use all topics from the lesson
                const lesson = allLessons.find((l: any) => String(l.id) === String(this.lesson));
                if (!lesson) {
                    this.API.failedSnackbar('Selected lesson not found');
                    return;
                }
                console.log('Selected lesson:', lesson);
                lessonTitle = lesson.title || 'Untitled Lesson';
                lessonDetails = lesson.details || lesson.description || lesson.content || 'No lesson details available';
                if (!lessonDetails || lessonDetails === 'No lesson details available') {
                    this.API.failedSnackbar('Lesson details not found');
                    return;
                }

                const topicData = await firstValueFrom(this.API.getTopics(this.lesson));
                if (!topicData.success) {
                    this.API.failedSnackbar('Failed to load topic details');
                    return;
                }
                const allTopics = topicData.output;
                topicDetails = allTopics.map((t: any) => t.details || t.description || t.content || 'No topic details').join('\n');
                topicTitle = 'All Topics';
            } else if (this.selectedClassID) {
                // Course and class selected: Use all lessons and topics
                const topicObservables = allLessons.map((l: any) => this.API.getTopics(l.id).pipe(
                    catchError(error => of({ success: false, output: [] }))
                ));
                const topicResults = await Promise.all(topicObservables.map((obs: Observable<unknown>) => firstValueFrom(obs)));
                lessonDetails = allLessons.map((l: any, index: number) => {
                    const lessonNumber = `Lesson ${index + 1}`;
                    const topics = topicResults[index].success && topicResults[index].output.length > 0
                        ? topicResults[index].output.map((t: any) => t.title || t.details || 'Untitled Topic').join(', ')
                        : 'No topics available';
                    return `${lessonNumber}: ${l.title || 'Untitled Lesson'} - ${l.details || l.description || l.content || 'No details'}\nTopics: ${topics}`;
                }).join('\n');
                lessonTitle = 'All Lessons';
                topicDetails = 'All Topics from All Lessons';
            }
        }

        const context = `Course: ${courseDetails}\n${this.isPreTest ? '' : `${lessonTitle}: ${lessonDetails}\n${topicTitle}: ${topicDetails}`}`;
        console.log('Context for AI:', context);
        const questionType = this.types[Number(this.selectedQuestionType)];

        let generatedCount = 0;
        let attempts = 0;
        const maxAttempts = this.aiQuestionCount * 3; // Prevent infinite loops
        let trueFalseCount = { true: 0, false: 0 }; // Track True/False balance

        while (generatedCount < this.aiQuestionCount && attempts < maxAttempts) {
            attempts++;
            let prompt = '';
            if (questionType === 'True/False') {
                // Determine desired answer to balance True/False
                const desiredAnswer = trueFalseCount.true <= trueFalseCount.false ? 'true' : 'false';
                prompt = `Based on context: ${context}, generate a True/False question about specific content taught in the course (e.g., concepts, facts, or topics). Avoid questions about the course structure or design. The answer should be ${desiredAnswer} to balance True and False answers. Use this JSON structure: {"question": "<statement>", "answer": "${desiredAnswer}", "options": [{"value": "True", "correct": ${desiredAnswer === 'true'}}, {"value": "False", "correct": ${desiredAnswer === 'false'}}]}. Return only valid JSON.`;
            } else if (questionType === 'Identification') {
                prompt = `Based on context: ${context}, generate an Identification question about specific content taught in the course (e.g., concepts, facts, or topics). Provide a concise, non-empty answer (1-5 words). Use this JSON structure: {"question": "<question text>", "answer": "<answer>", "options": null}. Return only valid JSON.`;
            } else if (questionType === 'Multiple Choice') {
                prompt = `Based on context: ${context}, generate a Multiple Choice question about specific content taught in the course (e.g., concepts, facts, or topics). Provide exactly 4 options with the correct answer randomly placed among them. Use this JSON structure: {"question": "<question text>", "answer": null, "options": [{"value": "<option1>", "correct": true or false}, {"value": "<option2>", "correct": true or false}, {"value": "<option3>", "correct": true or false}, {"value": "<option4>", "correct": true or false}]}, ensuring only one option is correct. Return only valid JSON.`;
            } else {
                prompt = `Based on context: ${context}, generate a ${questionType} question in JSON format. Use this structure: {"question": "<question text>", "answer": "<answer text or null>", "options": [{"value": "<option1>", "correct": true}, {"value": "<option2>", "correct": false}, ...] or null for non-multiple-choice}. Return only valid JSON.`;
            }
            const response = await this.API.analyzeEssay(prompt);
            console.log('Raw API Response:', response);

            try {
                // Remove markdown code block wrappers (e.g., ```json, ```) and trim whitespace
                let cleanedResponse = response.trim();
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

                const data = JSON.parse(cleanedResponse);
                let newQuestion = {
                    type: this.selectedQuestionType,
                    question: { value: data.question, attachments: [] },
                    options: data.options || undefined,
                    answer: data.answer || (this.selectedQuestionType === '3' ? '{{auto-checked}}' : ''),
                };

                if (this.selectedQuestionType === '0' && data.options) {
                    // Validate exactly one correct answer
                    const correctCount = data.options.filter((opt: any) => opt.correct).length;
                    if (correctCount !== 1) {
                        console.warn(`Multiple Choice must have exactly one correct answer on attempt ${attempts}. Retrying...`);
                        continue;
                    }
                    // Shuffle options to ensure random correct answer position
                    newQuestion.options = data.options.sort(() => Math.random() - 0.5).map((opt: any, index: number) => ({
                        value: opt.value,
                        attachment: null,
                        active: opt.correct,
                    }));
                    newQuestion.answer = newQuestion.options.findIndex((opt: any) => opt.active).toString();
                } else if (this.selectedQuestionType === '1') {
                    newQuestion.answer = data.answer === 'true' ? 'T' : 'F';
                    // Update True/False balance tracking
                    if (data.answer === 'true') trueFalseCount.true++;
                    else trueFalseCount.false++;
                } else if (this.selectedQuestionType === '2' && !data.answer) {
                    console.warn(`Identification question must have a non-empty answer on attempt ${attempts}. Retrying...`);
                    continue;
                }

                this.generatedQuestions.push(newQuestion);
                generatedCount++;
                // Add delay to stay within 15 requests per minute (approx. 4s per request for 15 questions)
                if (generatedCount < this.aiQuestionCount) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                }
            } catch (e) {
                console.warn(`Invalid JSON response on attempt ${attempts}. Retrying...`, e);
                continue; // Skip invalid responses and retry
            }
        }

        if (generatedCount < this.aiQuestionCount) {
            this.API.failedSnackbar(`Only generated ${generatedCount} out of ${this.aiQuestionCount} questions due to generation issues.`);
        } else {
            this.API.successSnackbar(`${this.generatedQuestions.length} question(s) generated successfully!`);
        }

        this.cdRef.detectChanges(); // Force UI update to display generated questions
    } catch (error) {
        console.error('Error generating questions:', error);
        this.API.failedSnackbar('Error generating questions. Please check your selections and try again.');
        this.generatedQuestions = []; // Reset on error to avoid stale data
    } finally {
        this.loading = false; // Reset loading state
    }
}

  useAllGeneratedQuestions(): void {
    if (this.generatedQuestions.length === 0) {
      this.API.failedSnackbar('No generated questions to use.');
      return;
    }

    if (this.currentEditingQuestion && this.questions.includes(this.currentEditingQuestion)) {
      const index = this.questions.indexOf(this.currentEditingQuestion);
      this.questions[index] = this.generatedQuestions[0];
      if (this.generatedQuestions.length > 1) {
        this.questions.push(...this.generatedQuestions.slice(1));
      }
    } else {
      this.questions.push(...this.generatedQuestions);
    }

    this.generatedQuestions = [];
    this.showAIModal = false;
    this.cdRef.detectChanges();
  }

  updateActiveState(question: any): void {
    question.options.forEach((opt: any, index: number) => {
      opt.active = question.answer === index.toString();
    });
  }

  private _tempSelections: { classId: string; lesson: string; topic: string } | null = null;

  onPreTestToggle(): void {
    if (this.isPreTest) {
      this._tempSelections = {
        classId: this.selectedClassID,
        lesson: this.lesson,
        topic: this.topic,
      };
      this.selectedClassID = '';
      this.lesson = '';
      this.topic = '';
      this.topics = [];
      this.lessons = [];
    } else if (this._tempSelections) {
      this.selectedClassID = this._tempSelections.classId || '';
      this.lesson = this._tempSelections.lesson || '';
      this.topic = this._tempSelections.topic || '';
      if (this.selectedClassID) this.onClassSelectionChange();
    }
  }

  closeModal(): void {
    this.closed.emit();
  }


  /**
   * Save the current question to the question bank
   */
    saveQuestionToBank(question: any): void {
      console.log('saveQuestionToBank called with:', question);
      
      // Validate required fields
      if (!question.question.value || !question.answer) {
        this.API.failedSnackbar('Please fill in the question and answer before saving to bank');
        return;
      }
    
      // Store the question and open category modal
      this.currentQuestionForBank = question;
      this.selectedCategoryForBank = '';
      this.newCategoryName = '';
      this.showCategoryModal = true;
      
      // Add these debug logs
      console.log('showCategoryModal set to:', this.showCategoryModal);
      console.log('currentQuestionForBank:', this.currentQuestionForBank);
      console.log('Modal should be visible now');
    }
  
    /**
     * Cancel saving to bank
     */
    cancelSaveToBank(): void {
      this.showCategoryModal = false;
      this.currentQuestionForBank = null;
      this.selectedCategoryForBank = '';
      this.newCategoryName = '';
    }

    canSaveToBank(): boolean {
      if (this.selectedCategoryForBank === 'new') {
        return this.newCategoryName.trim() !== '';
      }
      return this.selectedCategoryForBank !== '';
    }
  
    /**
     * Confirm and save question to bank
     */
    confirmSaveToBank(): void {
    if (!this.currentQuestionForBank || !this.canSaveToBank()) {
      return;
    }

    const questionData: any = {
      question: this.currentQuestionForBank.question.value,
      type: this.currentQuestionForBank.type,
      answer: this.currentQuestionForBank.answer,
      category: this.selectedCategoryForBank === 'new' ? this.newCategoryName.trim() : this.selectedCategoryForBank,
      created_by: this.API.getUserData().id,
      time_limit: this.currentQuestionForBank.timeLimit || null // Add time limit to bank
    };

    // Handle options for multiple choice questions
    if (this.currentQuestionForBank.type === '0' && this.currentQuestionForBank.options) {
      const optionsText = this.currentQuestionForBank.options
        .map((opt: any) => opt.value)
        .filter((value: string) => value.trim() !== '')
        .join('\n\n');
      
      if (optionsText) {
        questionData.options = optionsText;
      }
    }

    console.log('Formatted question data with time limit:', questionData);

    this.API.saveQuestionToBank(questionData).subscribe(
      (response: any) => {
        if (response.success) {
          this.API.successSnackbar('Question saved to bank successfully!');
          this.refreshQuestionBank();
          
          this.showCategoryModal = false;
          this.currentQuestionForBank = null;
          this.selectedCategoryForBank = '';
          this.newCategoryName = '';
        } else {
          this.API.failedSnackbar('Failed to save question to bank: ' + response.output);
        }
      },
      (error: any) => {
        console.error('API returned error:', error);
        this.API.failedSnackbar('Failed to save question to bank');
      }
    );
  }

    private refreshQuestionBank(): void {
      // If you're in the quiz management component, refresh the stats and recent questions
      // This will update the UI to show the new question
      if (this.API.questionBankRefresh$) {
        this.API.questionBankRefresh$.next(true);
      }
    }
  
  /**
   * Load question bank categories
   */
  loadQuestionBankCategories(): void {
    this.API.getQuestionBankCategories(this.API.getUserData().id).subscribe(
      (data: any) => {
        if (data.success) {
          this.questionBankCategories = data.output.map((item: any) => item.category).filter(Boolean);
        }
      },
      (error) => {
        console.error('Error loading categories:', error);
      }
    );
  }
  

  /**
   * Validate question before saving to bank
   */
  private validateQuestionForBank(question: any): boolean {
    if (!question.question.value?.trim()) {
      this.API.failedSnackbar('Question text is required');
      return false;
    }

    if (question.type === '0') {
      if (!question.options.some((opt: any) => opt.active)) {
        this.API.failedSnackbar('Please select one correct answer');
        return false;
      }
      if (question.options.find((opt: any) => !opt.value?.trim())) {
        this.API.failedSnackbar('Please fill in all options');
        return false;
      }
    }

    if (question.type === '1' && !['T', 'F'].includes(question.answer)) {
      this.API.failedSnackbar('Please select True or False');
      return false;
    }

    if (question.type === '2' && !question.answer?.trim()) {
      this.API.failedSnackbar('Please provide an answer');
      return false;
    }

    return true;
  }

  /**
   * Prepare question data for saving to bank
   */
  private prepareQuestionDataForBank(question: any): any {
    let options = '';
    
    if (question.type === '0') {
      options = question.options.map((opt: any) => opt.value).join('\n\n');
    }

    return {
      question: question.question.value,
      type: question.type,
      answer: question.answer,
      options: options || undefined,
      category: 'General', // You can add a category field to the question if needed
      created_by: this.API.getUserData().id
    };
  }

  /**
   * Open the question bank modal
   */
  openQuestionBankModal(question?: any): void {
    this.showQuestionBankModal = true;
    this.selectedQuestions.clear();
    this.loadQuestionBankCategories();
    this.loadQuestionBankQuestions();
  }

  /**
   * Load questions from the bank
   */
  loadQuestionBankQuestions(): void {
    this.loadingQuestions = true;
    this.API.getQuestionBank(this.API.getUserData().id, this.selectedCategory, this.selectedType).subscribe(
      (data: any) => {
        if (data.success) {
          this.questionBankQuestions = data.output;
          if (this.searchTerm) {
            this.filterQuestionsBySearch();
          }
        } else {
          this.API.failedSnackbar('Failed to load questions from bank');
        }
        this.loadingQuestions = false;
      },
      (error: any) => {
        console.error('Error loading questions from bank:', error);
        this.API.failedSnackbar('Error loading questions from bank');
        this.loadingQuestions = false;
      }
    );
  }

  /**
   * Filter questions by search term
   */
  filterQuestionsBySearch(): void {
    if (!this.searchTerm.trim()) {
      return;
    }
    
    const searchLower = this.searchTerm.toLowerCase();
    this.questionBankQuestions = this.questionBankQuestions.filter(q => 
      q.question.toLowerCase().includes(searchLower) ||
      q.answer.toLowerCase().includes(searchLower) ||
      (q.category && q.category.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Handle category change
   */
  onCategoryChange(): void {
    this.loadQuestionBankQuestions();
  }

  /**
   * Handle type change
   */
  onTypeChange(): void {
    this.loadQuestionBankQuestions();
  }

  /**
   * Handle search input
   */
  onSearch(): void {
    this.loadQuestionBankQuestions();
  }

  /**
   * Toggle question selection
   */
  toggleQuestionSelection(questionId: number): void {
    if (this.selectedQuestions.has(questionId)) {
      this.selectedQuestions.delete(questionId);
    } else {
      this.selectedQuestions.add(questionId);
    }
  }

  /**
   * Check if question is selected
   */
  isQuestionSelected(questionId: number): boolean {
    return this.selectedQuestions.has(questionId);
  }

  /**
   * Use selected questions from bank
   */
  useSelectedQuestions(): void {
    if (this.selectedQuestions.size === 0) {
      this.API.failedSnackbar('Please select at least one question');
      return;
    }

    const selectedQuestionIds = Array.from(this.selectedQuestions);
    
    this.API.getQuestionsByIds(selectedQuestionIds).subscribe(
      (data: any) => {
        if (data.success) {
          const questionsToAdd = data.output.map((bankQuestion: any) => 
            this.convertBankQuestionToQuizQuestion(bankQuestion)
          );
          
          this.questions.push(...questionsToAdd);
          this.API.successSnackbar(`${questionsToAdd.length} question(s) added to quiz`);
          this.showQuestionBankModal = false;
          this.selectedQuestions.clear();
        } else {
          this.API.failedSnackbar('Failed to load selected questions');
        }
      },
      (error: any) => {
        console.error('Error loading selected questions:', error);
        this.API.failedSnackbar('Error loading selected questions');
      }
    );
  }

  addQuestionsFromBank(questions: any[]): void {
    console.log('Processing questions from bank...');
    
    questions.forEach((bankQuestion, index) => {
      const quizQuestion = this.convertBankQuestionToQuizQuestion(bankQuestion);
      this.questions.push(quizQuestion);
      console.log(`Added question ${index + 1}:`, quizQuestion);
    });
    
    console.log('All questions added. Total questions:', this.questions.length);
    
    // Force change detection
    this.cdRef.detectChanges();
  }
  

  /**
   * Convert bank question to quiz question format
   */
  private convertBankQuestionToQuizQuestion(bankQuestion: any): any {
    const quizQuestion: any = {
      type: bankQuestion.type,
      question: { 
        value: bankQuestion.question, 
        attachments: [] 
      },
      answer: bankQuestion.answer,
      timeLimit: bankQuestion.time_limit || (this.enableQuestionTimeLimits ? this.defaultQuestionTimeLimit : null) // Add time limit
    };

    // Handle multiple choice questions
    if (bankQuestion.type === '0') {
      quizQuestion.options = [
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false }
      ];

      if (bankQuestion.options) {
        const optionsArray = bankQuestion.options
          .split('\n\n')
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt !== '');

        optionsArray.forEach((opt: string, index: number) => {
          if (index < 4) {
            quizQuestion.options[index].value = opt;
          }
        });
      }

      if (bankQuestion.answer) {
        const answerIndex = parseInt(bankQuestion.answer);
        if (!isNaN(answerIndex) && answerIndex >= 0 && answerIndex < 4) {
          quizQuestion.answer = answerIndex.toString();
          quizQuestion.options[answerIndex].active = true;
        }
      }
    } else if (bankQuestion.type === '1') {
      quizQuestion.options = [];
      quizQuestion.answer = bankQuestion.answer || 'T';
    } else {
      quizQuestion.options = [];
    }

    return quizQuestion;
  }

   getTotalEstimatedTime(): number {
    if (!this.enableQuestionTimeLimits) {
      return 0;
    }
    
    return this.questions.reduce((total, question) => {
      return total + (question.timeLimit || 0);
    }, 0);
  }

  formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get question type label
   */
  getQuestionTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      '0': 'Multiple Choice',
      '1': 'True/False',
      '2': 'Identification',
      '3': 'Essay'
    };
    return typeMap[type] || type;
  }

  /**
   * Get question preview
   */
  getQuestionPreview(question: string): string {
    return question.length > 100 ? question.substring(0, 100) + '...' : question;
  }

  /**
   * Get answer preview
   */
  getAnswerPreview(answer: string): string {
    return answer.length > 50 ? answer.substring(0, 50) + '...' : answer;
  }
}