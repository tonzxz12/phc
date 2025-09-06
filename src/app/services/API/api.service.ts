import { Injectable, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpParams } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { LoadingSnackbarComponent } from 'src/app/components/general-modals/loadingsnackbar/loadingsnackbar.component';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
import { updatePreset } from '@primeng/themes';
import {
  GoogleGenerativeAI, HarmBlockThreshold, HarmCategory
} from '@google/generative-ai';
import {
  AssemblyAI,
  TranscribeParams,
  TranscriptLanguageCode,
} from 'assemblyai';
import { v4 as uuidv4 } from 'uuid';
import * as FileSaver from 'file-saver';
import {
  BehaviorSubject,
  EMPTY,
  ReplaySubject,
  Subject,
  Subscriber,
  Subscription,
  catchError,
  firstValueFrom,
  forkJoin,
  iif,
  lastValueFrom,
  min,
  timeout,
  retry,
  throwError,
  tap,
  shareReplay,
  of,
} from 'rxjs';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ViewerComponent } from 'src/app/unused-components/viewer/viewer.component';
import {
  Course,
  MessageObject,
  ParticipantObject,
} from 'src/app/shared/MockData/selfstudy/model/models';
import { Observable } from 'rxjs';
import { LoaderService } from 'src/app/services/API/services-includes/loader.service';
import Swal from 'sweetalert2';
import { first, map, switchMap } from 'rxjs/operators';
import { fromEvent, merge } from 'rxjs';
import { VideoSDK } from '@videosdk.live/js-sdk';
import { PrimeNG } from 'primeng/config';
import { Title } from '@angular/platform-browser';

const client = new AssemblyAI({
  apiKey: environment.assemblyAIToken,
});

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
  providedIn: 'root',
})
export class APIService implements OnDestroy, OnInit {
  public socket: WebSocket;
  public inbox: number = 0;
  private model: any;


  localServer = 'http://34.80.109.155';
  audio: HTMLAudioElement;
  questionBankRefresh$: any;
  constructor(
    private title:Title,
    private primeNG:PrimeNG,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private modalService: NgbModal,
    private loader: LoaderService
  ) {
    this.initializeModel();
    // this.initializeGeminiTwoModel();
    this.audio = new Audio();
    this.audio.src = 'assets/sounds/notif.mp3';
    this.audio.load();
    this.socket = new WebSocket(environment.socket);
    this.socket.binaryType = 'arraybuffer';
    this.updateLastSeen();
    this.backgroundID = setInterval(() => {
      if (this.online) {
        this.updateLastSeen();
      }
    }, 3000);
    this.userData = this.getUserData();
  }

  ngOnInit(): void {
    const obs = this.endSpeechMeeting(this.getUserData().id).subscribe(() => {
      obs.unsubscribe();
    });
  }

  // private initializeModel() {
  //   const genAI = new GoogleGenerativeAI(environment.genKey);
  //   const generationConfig = {
  //     safetySettings: [
  //       {
  //         category: HarmCategory.HARM_CATEGORY_HARASSMENT,
  //         threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  //       },
  //     ],
  //     temperature: 0.9,
  //     top_p: 1,
  //     top_k: 32,
  //     maxOutputTokens: 10, // Limiting tokens as we only need a score
  //   };

  //   this.model = genAI.getGenerativeModel({
  //     model: 'gemini-1.5-flash',
  //     ...generationConfig,
  //   });
  // }

  


  

  async analyzeEssay(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

      // Ensure that we only return the score
      return text.trim();
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Error generating content. Please try again.');
    }
  }



  private initializeModel() {
    const genAI = new GoogleGenerativeAI(environment.genKey);
    const generationConfig = {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    this.model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
      ...generationConfig,
    });
  }




async chatWithAI(message: string): Promise<string> {
  try {
    // 1) Merge system + user instructions:
    const systemInstruction = `
      You are Lumi, an advanced AI tutor with deep knowledge across various academic subjects.
      Your goal is to help students by:
       - Explaining concepts in clear, understandable language.
       - Offering step-by-step reasoning or solutions where appropriate.
       - Maintaining a friendly, respectful, and encouraging tone.
       - Asking clarifying questions if a student's prompt is ambiguous.
       - Providing references or examples whenever helpful, but remaining concise.

      If you are unsure about a question or lack enough context, politely ask for more details.
      Avoid making up facts. If you don't know something, say so.
    `;

    const prompt = `
      ${systemInstruction}
      User: ${message}
      AI:
    `;

    // 2) Send it to the model
    const result = await this.model.generateContent(prompt);

    // 3) Extract text response
    const response = await result.response;
    const text = await response.text();

    // 4) Return the trimmed text
    return text.trim();

  } catch (error) {
    console.error('Error in chat:', error);
    throw new Error('Failed to get response. Please try again.');
  }
}


cleanSyntax(jsonString: string): string {
  // First, replace all single quotes with double quotes for valid JSON format
  let fixedString = jsonString.replace(/'/g, '"');

  // Escape special characters to avoid parsing errors
  fixedString = fixedString.replace(/\\/g, '\\\\');  // Escape backslashes
  fixedString = fixedString.replace(/"/g, '\\"');     // Escape double quotes
  fixedString = fixedString.replace(/\n/g, '\\n');    // Escape newlines
  fixedString = fixedString.replace(/\r/g, '\\r');    // Escape carriage returns
  fixedString = fixedString.replace(/\t/g, '\\t');    // Escape tabs
  fixedString = fixedString.replace(/\f/g, '\\f');    // Escape form feed

  // Wrap the string in double quotes, making sure it is valid
  if (!fixedString.startsWith('"')) {
    fixedString = '"' + fixedString;
  }
  if (!fixedString.endsWith('"')) {
    fixedString = fixedString + '"';
  }

  // Check if the string can now be parsed as valid JSON
  try {
    JSON.parse(fixedString);
    return fixedString; // Return the fixed JSON string
  } catch (e) {
    throw new Error('The string could not be fixed into valid JSON.');
  }
}


cleanAIResponse(response: string): string {
  const clean = response
  return clean.replaceAll('json','').replaceAll('`','');
}

async generateContent(prompt: string): Promise<string> {
  try {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    return this.cleanAIResponse(text.trim());
  } catch (error) {
    console.error('Error in chat:', error);
    throw new Error('Failed to get response. Please try again.');
  }
}

  async analyzeSpeech(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

      return text.trim();
    } catch (error) {
      console.error('Error generating content from speech:', error);
      throw new Error('Error generating content from speech. Please try again.');
    }
  }

  async generateSpeechToRead(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

      return text.trim();
    } catch (error) {
      console.error('Error generating content from speech:', error);
      throw new Error('Error generating content from speech. Please try again.');
    }
  }



  getAttendanceHistory() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'lab_meetings.ID',
        'lab_meetings.StartTime as datetime',
        'speech_attendance.TimeIn',
        'students.FirstName as firstname',
        'students.LastName as lastname',
      ],
      tables: 'lab_meetings, speech_attendance, students',
      conditions: {
        WHERE: {
          'lab_meetings.ID': 'speech_attendance.MeetingID',
          'lab_meetings.TeacherID': id,
          'students.ID': 'speech_attendance.StudentID',
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // Method to fetch lesson data
  getLessonData(): Observable<any> {
    return this.http.get<any>('assets/jsons/speechlab/module1/lesson1.json');
  }

  getQuizData(): Observable<any> {
    return this.http.get<any>('assets/jsons/speechlab/vidquiz/vidquiz.json');
  }

  ngOnDestroy(): void {
    if (this.backgroundID) {
      clearInterval(this.backgroundID);
    }
    this.downloadProgress$.unsubscribe();
    const obs = this.endSpeechMeeting(this.getUserData().id).subscribe(() => {
      obs.unsubscribe();
    });
  }

  backgroundID: any = 0;

  private usedStorage = this.isLocalStorage() ? localStorage : sessionStorage;
  public userData = this.getUserData();
  public joinWithMic?: boolean;
  public joinWithCamera?: boolean;
  public search: string = '';
  public currentPractice: any;
  public currentTask: any;
  public quizID: string | null = null;
  public messages: any = [];
  public convos: any = [];
  public chat: any;
  public interests: string[] = [];
  public meetingInfo: any;
  public notifications: any = [];

  online = true;

  goOffline() {
    this.online = false;
    this.hideLoader();
    if (this.getUserType() != '0') return;
    Swal.fire({
      title: 'No Internet? No Problem!',
      text: 'Your modules are automatically downloaded for offline viewing!',
      icon: 'info',
      confirmButtonColor: '0172AF',
      cancelButtonColor: '#7F7F7F',
      showCancelButton: true,
      confirmButtonText: 'Proceed!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.value) {
        this.router.navigate(['/modules']);
      }
    });
  }

  async getServerFileAsBase64(link: string) {
    const file = await firstValueFrom(
      this.http.get(this.getURL(link), { responseType: 'blob' })
    );
    // console.log(file);
    const base = await firstValueFrom(this.getBaseAsync(file));
    return base;
  }
  async getServerFile(link: string) {
    const file = await firstValueFrom(
      this.http.get(this.getURL(link), { responseType: 'blob' })
    );
    return file;
  }

  setCourse(courseID: string) {
    this.usedStorage.setItem('courseID', courseID);
  }

  setClass(classID: string) {
    this.usedStorage.setItem('classID', classID);
  }

  setLesson(lessonID: any) {
    this.usedStorage.setItem('lessonID', lessonID);
  }

  createID32() {
    return uuidv4().replaceAll('-', '');
  }
  createID36() {
    return uuidv4();
  }


  setLoaderMessage(message:string | null | undefined) {
    this.loader.setLoaderMessage(message);
  }

  showLoader() {
    this.loader.show();
  }
  hideLoader() {
    this.loader.setLoaderMessage(null);
    this.loader.hide();
  }
  public initializedConfig:boolean = true;
    initialized() {
      this.initializedConfig = true;
    }  
  decrypt(encryptedData: string, iv: string): string {
    const key = CryptoJS.enc.Utf8.parse(environment.decryptKey); // Parse the secret key
    const ivParsed = CryptoJS.enc.Hex.parse(iv);   // Parse the IV from hex
    const encryptedParsed = CryptoJS.enc.Hex.parse(encryptedData); // Parse encrypted data from hex
  
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedParsed } as any, // Type assertion for compatibility
      key,
      {
        iv: ivParsed,
        mode: CryptoJS.mode.CBC,      // Match the CBC mode
        padding: CryptoJS.pad.Pkcs7   // Default padding in Node.js crypto
      }
    );
  
    return decrypted.toString(CryptoJS.enc.Utf8); // Convert back to UTF-8 string
  }
  private encryptData(data: string): string {
    const key = CryptoJS.enc.Utf8.parse(environment.decryptKey); // Your secret key
    const iv = CryptoJS.lib.WordArray.random(16); // Generate a random IV
    const encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  
    // Return IV + encrypted ciphertext as a single string, both base64-encoded
    return iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  }
private decryptData(encryptedData: string): string {
  const key = CryptoJS.enc.Utf8.parse(environment.decryptKey); // Your secret key

  // Split the IV and encrypted ciphertext
  const parts = encryptedData.split(':');
  const iv = CryptoJS.enc.Base64.parse(parts[0]); // Parse the IV
  const ciphertext = CryptoJS.enc.Base64.parse(parts[1]); // Parse the ciphertext

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext } as any, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8); // Return decrypted data as a UTF-8 string
}
  async reInit(){
    this.initializedConfig = false;
    this.setLoaderMessage('Setting up your learning platform ...')
    this.showLoader();
    try{
      const cloudEnv = await firstValueFrom(
        this.http.get<any>(`${environment.contentAPI}/config/${window.location.hostname.split(':')[0]}`).pipe(
          catchError((error) => {
            // Handle the error here
            // You can customize the error message or logging
            console.error('Error fetching config:', error);
            return throwError(() => new Error(error.message || 'Error fetching config'));
          })
        )
      );
      if(cloudEnv){
        const decryptedString = this.decrypt(cloudEnv.encryptedData, cloudEnv.iv);
        const config = JSON.parse(decryptedString);
        for (let key of Object.keys(config)){
          if(key in environment){
            (environment as any)[key] = config[key];
          }else{
            throw new Error('Invalid configuration loaded.')
          }
        }

        updatePreset({
          semantic: {
            colorScheme: {
              light: {
                primary: {... environment.light},
                surface: {
                  0: '#ffffff',
                  50: '{zinc.50}',
                  100: '{zinc.100}',
                  200: '{zinc.200}',
                  300: '{zinc.300}',
                  400: '{zinc.400}',
                  500: '{zinc.500}',
                  600: '{zinc.600}',
                  700: '{zinc.700}',
                  800: '{zinc.800}',
                  900: '{zinc.900}',
                  950: '{zinc.950}'
              },
              },
              dark: {
                primary: {...environment.dark},
                surface: {
                  0: '#ffffff',
                  50: '{slate.50}',
                  100: '{slate.100}',
                  200: '{slate.200}',
                  300: '{slate.300}',
                  400: '{slate.400}',
                  500: '{slate.500}',
                  600: '{slate.600}',
                  700: '{slate.700}',
                  800: '{slate.800}',
                  900: '{slate.900}',
                  950: '{slate.950}'
              },
              },
            },
          },
        })
      }
      this.primeNG.loadCommonTheme();
      this.title.setTitle(environment.appTitle);
  
      const link: HTMLLinkElement = document.querySelector('link[rel="icon"]')!;
      if (link) {
        link.href = environment.appLogo; // Path to your new favicon
      }
      this.initialized();
      this.hideLoader();  
    }catch(e:any){
      console.error('Error: No config found');
      if(environment.synced){
        environment.maintenance = true;
      }
      this.initialized();
      this.hideLoader();
    }
   
  }


  updateAdminName(id: string, firstname: string, lastname: string) {
    const postObject = {
      tables: 'administrators',
      values: {
        FirstName: firstname,
        LastName: lastname,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateTeacherName(id: string, firstname: string, lastname: string) {
    const postObject = {
      tables: 'teachers',
      values: {
        FirstName: firstname,
        LastName: lastname,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateStudentName(id: string, firstname: string, lastname: string) {
    const postObject = {
      tables: 'students',
      values: {
        FirstName: firstname,
        LastName: lastname,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateTeacherStudentName(id: string, firstname: string, lastname:string) {
    const postObject = {
      table: 'students',
      update: {
        FirstName: firstname,
        LastName: lastname,
      },
      where: {
        ID: id
      }
    };

    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }


  updateAdminEmail(id: string, email: string) {
    const postObject = {
      tables: 'administrators',
      values: {
        Email: email,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateTeacherEmail(id: string, email: string) {
    const postObject = {
      tables: 'teachers',
      values: {
        Email: email,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }



  updateStudentEmail(id: string, email: string) {
    const postObject = {
      tables: 'students',
      values: {
        Email: email,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  // edit for teacher

  updateForStudentName(id: string, firstname: string, lastname: string) {
    const postObject = {
      tables: 'students',
      values: {
        FirstName: firstname,
        LastName: lastname,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }



  updateForStudentEmail(id: string, email: string) {
    const postObject = {
      tables: 'students',
      values: {
        Email: email,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }
  // end edit for teacher
  updateProfileImage(id: string, url: string) {
    const userType = this.getUserType();
    const postObject = {
      tables:
        userType == '0'
          ? 'students'
          : userType == '1'
          ? 'teachers'
          : 'administrators',
      values: {
        Profile: url,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateStudentPassword(id: string, password: string) {
    const postObject = {
      tables: 'students',
      values: {
        '[hash]Password': password,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateTeacherPassword(id: string, password: string) {
    const postObject = {
      tables: 'teachers',
      values: {
        '[hash]Password': password,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateAdminPassword(id: string, password: string) {
    const postObject = {
      tables: 'administrators',
      values: {
        '[hash]Password': password,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }
  askGemini(prompt: string) {
    this.justSnackbar('Asking Gemini for reponse...', 9999999);
    const headers = new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
    });
    this.http
      .post<any>(
        environment.nodeserver + '/generate',
        JSON.stringify({
          key: environment.socketKey,
          prompt: prompt,
        }),
        { headers }
      ) 
      .pipe(
        timeout(20000),
        catchError((e) => {
          this.failedSnackbar('Took too long to respond.');
          return EMPTY;
        })
      )
      .subscribe((data) => {
        try {
          const json = (data.response as string)
            .replaceAll('```', '')
            .replaceAll('json', '')
            .replaceAll('JSON', '')
            .replaceAll('Json', '')
            .trim();

          const jsonObject = JSON.parse(json);
          var title = 'default';
          if (jsonObject.title != undefined) {
            title = jsonObject.title;
          }
          const blob = new Blob([json], { type: 'application/json' });
          FileSaver.saveAs(blob, title + '.json');
          this.successSnackbar('JSON saved successfully');
        } catch (e) {
          if (data.success) {
            this.justSnackbar(data.response, 9999999);
          } else {
            this.failedSnackbar(data.response, 9999999);
          }
        }
      });
  }

  generateManualId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  // Optimized request batching and caching
  private requestCache = new Map<string, { data: any; timestamp: number; expiry: number }>();
  private pendingRequests = new Map<string, Observable<any>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache-aware request method
  cachedPost(method: string, body: any, cacheMinutes: number = 5): Observable<any> {
    const cacheKey = this.generateCacheKey(method, body);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return of(cached);
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Make new request
    const request = this.post(method, body).pipe(
      tap(response => {
        // Cache successful responses
        if (response.success) {
          this.setCache(cacheKey, response, cacheMinutes);
        }
        // Remove from pending
        this.pendingRequests.delete(cacheKey);
      }),
      catchError(error => {
        this.pendingRequests.delete(cacheKey);
        return throwError(() => error);
      }),
      shareReplay(1)
    );
    
    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  // Optimized course loading
  getCoursesOptimized(limit: number = 20, offset: number = 0, filter?: string): Observable<any> {
    const userId = this.getUserData()?.id;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    const body = {
      data: JSON.stringify({
        user_id: userId,
        limit,
        offset,
        filter
      })
    };

    return this.cachedPost('get_courses_optimized', body, 10);
  }

  // Optimized lessons loading
  getLessonsOptimized(courseId: string): Observable<any> {
    const userId = this.getUserData()?.id;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    const body = {
      data: JSON.stringify({
        user_id: userId,
        course_id: courseId
      })
    };

    return this.cachedPost('get_lessons_optimized', body, 5);
  }

  // Dashboard data with single request
  getUserDashboard(): Observable<any> {
    const userId = this.getUserData()?.id;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    const body = {
      data: JSON.stringify({ user_id: userId })
    };

    return this.cachedPost('get_user_dashboard', body, 3);
  }

  private generateCacheKey(method: string, body: any): string {
    return `${method}_${btoa(JSON.stringify(body))}`;
  }

  private getFromCache(key: string): any | null {
    const item = this.requestCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp + item.expiry) {
      this.requestCache.delete(key);
      return null;
    }
    
    return item.data;
  }

  private setCache(key: string, data: any, minutes: number): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: minutes * 60 * 1000
    });
  }

  // Clear cache manually
  clearRequestCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.requestCache.keys()) {
        if (key.includes(pattern)) {
          this.requestCache.delete(key);
        }
      }
    } else {
      this.requestCache.clear();
    }
  }

  askGeminiTon(prompt: string) {
    const headers = new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.genKey}`,
    });

    return this.http
      .post<any>(
        environment.nodeserver + '/generate',
        JSON.stringify({
          prompt: prompt,
        }),
        { headers }
      )
      .pipe(
        timeout(20000),
        catchError((error) => {
          console.error('Error in API call:', error);
          this.failedSnackbar('Failed to communicate with the analysis service.');
          return EMPTY;
        })
      );
  }


  parseDate(date: string) {
    const dateObject = new Date(date);
    return dateObject.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  parseDateTime(date: string) {
    const dateObject = new Date(date);
    return dateObject.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  parseTime(date:string){
    const dateObject = new Date(date);
    return dateObject.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  parseDateFromNow(date: string) {
    const timePassed = new Date().getTime() - new Date(date).getTime();
    const seconds = timePassed / 1000;
    const minutes = Math.floor(seconds / 60);

    // 8 hours = 480 minutes
    const minutesToSubtract = 8 * 60;
    const adjustedMinutes = minutes - minutesToSubtract;

    // If the adjusted time is less than or equal to 0, show "Just now"
    if (adjustedMinutes <= 0) {
      return 'Just now';
    }

    // Display time in minutes if less than 60 minutes after the adjustment
    if (adjustedMinutes < 60) {
      return adjustedMinutes === 1 ? '1 minute ago' : `${adjustedMinutes} minutes ago`;
    }

    // Display time in hours if less than 24 hours after the adjustment
    const adjustedHours = Math.floor(adjustedMinutes / 60);
    if (adjustedHours < 24) {
      return adjustedHours === 1 ? '1 hour ago' : `${adjustedHours} hours ago`;
    }

    // Display time in days if more than 24 hours but less than 7 days after the adjustment
    const adjustedDays = Math.floor(adjustedHours / 24);
    if (adjustedDays < 7) {
      return adjustedDays === 1 ? '1 day ago' : `${adjustedDays} days ago`;
    }

    // Display time in weeks if more than 7 days after the adjustment
    const adjustedWeeks = Math.floor(adjustedDays / 7);
    if (adjustedWeeks < 4) {
      return adjustedWeeks === 1 ? '1 week ago' : `${adjustedWeeks} weeks ago`;
    }

    return 'A long time ago';
  }


  clearAllNotifications(): Observable<any> {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'notifications',
      conditions: {
        WHERE: {
          RecipientID: id
        }
      }
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject)
    });
  }

  failedSnackbar(message: string, timer?: number) {
    var time = 3000;
    if (timer != undefined) {
      time = timer!;
    }
    this.snackBar.open(message, 'Dismiss', {
      duration: time,
      verticalPosition: 'bottom',
      horizontalPosition: 'right',
      panelClass: 'default-snackbar-error',
    });
  }

  successSnackbar(message: string, timer?: number) {
    var time = 3000;
    if (timer != undefined) {
      time = timer!;
    }
    this.snackBar.open(message, 'Dismiss', {
      duration: time,
      verticalPosition: 'bottom',
      horizontalPosition: 'right',
      panelClass: 'default-snackbar-success',
    });
  }

  showSnackbar(
    message: string,
    action: string = 'Close',
    duration: number = 3000
  ) {
    this.snackBar.open(message, action, {
      duration: duration,
    });
  }
  justSnackbar(message: string, timer?: number) {
    var time = 3000;
    if (timer != undefined) {
      time = timer!;
    }
    this.snackBar.open(message, 'Dismiss', {
      duration: time,
      verticalPosition: 'bottom',
      horizontalPosition: 'right',
      panelClass: 'default-snackbar',
    });
  }

  // post(method: string, body: {}) {
  //   for (var [key, obj] of Object.entries<any>(body)) {
  //     if (key == 'values') {
  //       for (var [field, value] of Object.entries(obj)) {
  //         obj[field] = value ?? '';
  //       }
  //     }
  //   }
  //   const headers = new HttpHeaders({
  //     'X-Requested-With': 'XMLHttpRequest',
  //     'Content-Type': 'application/json',
  //   });
  //   const salt = new Date().getTime();
  //   return this.http.post<any>(
  //     environment.api + '?' + salt,
  //     JSON.stringify(
  //       Object.assign(
  //         {
  //           API_KEY: environment.apiKey,
  //           Method: method,
  //         },
  //         body
  //       )
  //     ),
  //     { headers }
  //   );
  // }

  post(method: string, body: any) {
    console.log('🔍 POST Request Details:', {
      method: method,
      body: body,
      environment: {
        api: environment.api,
        apiKey: environment.apiKey,
        app: environment.app
      }
    });
    
    let data ;
       
   try {
     const bodyObject = JSON.parse(body.data);
    for (const [key, obj] of Object.entries<any>(bodyObject)) {
    
    if (key === 'values') {
      for (const [field, value] of Object.entries(obj)) {
        // Remove field if value is null, undefined, or empty string
        if (value === null || value === undefined || value === '') {
          delete obj[field];
        }
      }
    }
    }
      data = {
          data: JSON.stringify(bodyObject)
     }
     
   } catch (error) {
      data = body
   }
    
  const headers = new HttpHeaders({
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  });
  const salt = new Date().getTime();
  return this.http.post<any>(
    environment.api + '?' + salt,
    JSON.stringify(
      Object.assign(
        {
          API_KEY: environment.apiKey,
          Method: method,
          App: environment.app
        },
    data
      )
    ),
    { headers }
  ).pipe(
    timeout(15000), // 15 second timeout
    retry(1), // Retry once on failure
    catchError((error) => {
      console.error(`API Error in ${method}:`, error);
      this.failedSnackbar(`Request failed: ${error.message}`);
      return throwError(() => error);
    })
  );  
}

  localPost(method: string, body: {}) {
    for (var [key, obj] of Object.entries<any>(body)) {
      if (key == 'values') {
        for (var [field, value] of Object.entries(obj)) {
          obj[field] = value ?? '';
        }
      }
    }
    const headers = new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
    });
    const salt = new Date().getTime();
    return this.http.post<any>(
      `${this.localServer}:85/api.php?${salt}`,
      JSON.stringify(
        Object.assign(
          {
            API_KEY: environment.apiKey,
            Method: method,
          },
          body
        )
      ),
      { headers }
    );
  }

  socketSend(data: object) {
    this.socket.send(
      JSON.stringify({ key: environment.socketKey, data: data })
    );
  }

  setMeetPermissions(cam: boolean, mic: boolean) {
    this.joinWithCamera = cam;
    this.joinWithMic = mic;
  }

  joinMeet() {
    if (this.getUserType() == '0') {
      this.router.navigate(['student/quanhub']);
    } else {
      this.router.navigate(['teacher/quanhub']);
    }
  }

  resetMeetOptions() {
    this.joinWithCamera = undefined;
    this.joinWithMic = undefined;
  }

  // Set a cookie with a specific name, value, and expiration in days
private setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000)); // Set expiration date
  const expiresString = `expires=${expires.toUTCString()}`;
  const cookieValue = `${name}=${value}; ${expiresString}; path=/; secure; samesite=strict`;
  document.cookie = cookieValue; // Set the cookie
}

// Get the cookie value by name
private getCookie(name: string): string | null {
  const match = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return match ? match[2] : null;
}

  // login(username: string, password: string) {
  //   this.snackBar.openFromComponent(LoadingSnackbarComponent, {
  //     verticalPosition: 'bottom',
  //     horizontalPosition: 'right',
  //     panelClass: ['default-snackbar'],
  //   });
  
  //   return this.post('login', {
  //     Username: username,
  //     Password: password,
  //   }).subscribe((data: any) => {
  //     this.snackBar.dismiss();
  //     const display = data.success ? 'Login Successful!' : data.output;
  //     const snackbarType = data.success
  //       ? 'default-snackbar-success'
  //       : 'default-snackbar-error';
  
  //     this.snackBar
  //       .open(display, 'Dismiss', {
  //         duration: 500,
  //         verticalPosition: 'bottom',
  //         horizontalPosition: 'right',
  //         panelClass: [snackbarType],
  //       })
  //       .afterDismissed()
  //       .subscribe(() => {
  //         if (data.success) {
            
  //           const user = data.output;
  //           if (user.esign) {
  //             user.esign = user.esign + '?' + new Date().getTime();
  //           }
  //           // Encrypt and store user info and account type in cookies
  //           const encryptedUserInfo = this.encryptData(JSON.stringify(user));
  //           const encryptedAccountType = this.encryptData(data.output.accountType.toString());
  //           // Set cookies with encrypted data
  //           this.setCookie('user_info', encryptedUserInfo, 1/24);
  //           this.setCookie('logged_in', encryptedAccountType, 1/24);
           
  //           // Redirect based on account type
  //           switch (parseInt(data.output.accountType)) {
  //             case 0:
  //               this.router.navigate(['/student/dashboard']);
  //               break;
  //             case 1:
  //               this.router.navigate(['/teacher/dashboard']);
  //               break;
  //             case 2:
  //               this.router.navigate(['/admin/dashboard']);
  //               break;
  //           }
  //         }
  //       });
  //   });
  // }


  /** api.service.ts (only this method was touched) */
  login(username: string, password: string) {
    /* ░░░ 1. show loading ░░░ */
    const loaderRef = this.snackBar.openFromComponent(
      LoadingSnackbarComponent,
      {
        verticalPosition: 'bottom',
        horizontalPosition: 'right',
        panelClass: ['default-snackbar'],
      }
    );

    /* ░░░ 2. hit the endpoint ░░░ */
    this.post('login', { Username: username, Password: password })
        .subscribe((data: any) => {
      loaderRef.dismiss();                         // remove spinner

      /***************
       * LOGIN FAIL  *
       ***************/
      if (!data.success) {
        this.snackBar.open(data.output, 'Dismiss', {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'right',
          panelClass: ['default-snackbar-error'],
        });
        return;                                    // ← stop here
      }


  /***********************
   * SUSPENDED ACCOUNT   *
   ***********************/
  const user = data.output;              // ← raw user object

  if (toBool(user.isSuspended            // "isSuspended"  ← preferred
          ?? user.issuspended            // issuspended
          ?? user.suspended)) {          // or any other alias
    this.snackBar.open(
      'Your account is suspended. Please contact the administrator.',
      'Dismiss',
      {
        duration: 4000,
        verticalPosition: 'bottom',
        horizontalPosition: 'right',
        panelClass: ['default-snackbar-error'],
      }
    );
    return;                              // ← block login
  }


      /***********************
       * NORMAL SUCCESS FLOW *
       ***********************/
      // refresh esign preview
      if (user.esign) {
        user.esign += '?' + Date.now();
      }

      // cookies
      const encryptedUserInfo      = this.encryptData(JSON.stringify(user));
      const encryptedAccountType   = this.encryptData(user.accountType.toString());
      this.setCookie('user_info',  encryptedUserInfo,    1 / 24); // 1 h
      this.setCookie('logged_in',  encryptedAccountType, 1 / 24);

      // SUCCESS: Check for QR enrollment redirection FIRST
      const qrCourseId = sessionStorage.getItem('qr_enrollment_course');
      
      if (qrCourseId && parseInt(user.accountType) === 0) {
        // Student login with QR enrollment pending
        sessionStorage.removeItem('qr_enrollment_course');
        this.snackBar.open('Login Successful!', 'Dismiss', {
          duration: 800,
          verticalPosition: 'bottom',
          horizontalPosition: 'right',
          panelClass: ['default-snackbar-success'],
        });
        this.router.navigate(['/student/qr-enroll', qrCourseId]);
        return; // Exit early to prevent normal dashboard redirect
      }

      // success snackbar
      this.snackBar.open('Login Successful!', 'Dismiss', {
        duration: 800,
        verticalPosition: 'bottom',
        horizontalPosition: 'right',
        panelClass: ['default-snackbar-success'],
      });

      // Check for drive redirection
      const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
      if (redirectAfterLogin) {
        sessionStorage.removeItem('redirectAfterLogin');
        
        // If redirecting to drive, ensure user is teacher or admin
        if (redirectAfterLogin === '/drive') {
          if (parseInt(user.accountType) === 1 || parseInt(user.accountType) === 2) {
            this.router.navigate([redirectAfterLogin]);
            return;
          } else {
            // Student trying to access drive - show error and redirect to student dashboard
            this.snackBar.open('Access denied. Only teachers and administrators can access Geria Drive.', 'Dismiss', {
              duration: 4000,
              verticalPosition: 'bottom',
              horizontalPosition: 'right',
              panelClass: ['default-snackbar-error'],
            });
            this.router.navigate(['/student/dashboard']);
            return;
          }
        } else {
          this.router.navigate([redirectAfterLogin]);
          return;
        }
      }

      // redirect to default dashboard
      switch (+user.accountType) {
        case 0: this.router.navigate(['/student/dashboard']); break;
        case 1: this.router.navigate(['/teacher/dashboard']); break;
        case 2: this.router.navigate(['/admin/dashboard']);   break;
      }
    });
  }


  /** ─────────────────────────────────────────────────────────────────────────
 *  Toggle a student's suspension flag
 *  @param id       Student primary‑key
 *  @param suspend  true  →  set "isSuspended" = TRUE   (default)
 *                  false →  set "isSuspended" = FALSE
 *  @returns        Observable<{ success:boolean, … }>
 *  ────────────────────────────────────────────────────────────────────── */

  /** internal helper – returns {"\"isSuspended\"": true|false } */


/** Toggle suspension */
suspendStudent(id: string, suspend: boolean = true) {
  const postObject = {
    tables: 'students',
    values: suspendedValue(suspend),  // ★ quoted key
    conditions: { WHERE: { ID: id } }
  };

  console.log('[API] suspendStudent →', postObject);       // debug
  return this.post('update_entry', { data: JSON.stringify(postObject) });
}

/** Reinstate helper (just readability sugar) */
reinstateStudent(id: string) {
  return this.suspendStudent(id, false);
}

// =======================================
// ASYNCHRONOUS COMMUNICATION METHODS
// =======================================

// Get topic threads for a specific topic
getTopicThreads(topicId: string) {
  console.log('getTopicThreads called with topicId:', topicId);
  
  // Simple query first - avoid complex JOINs that cause 500 errors
  const postObject = {
    selectors: [
      'id',
      'threadid',
      'topicid',
      'title',
      'body',
      'createdat',
      'islocked',
      'ispinned',
      'updatedat'
    ],
    tables: 'topic_threads',
    conditions: {
      WHERE: {
        topicid: topicId
      },
      'ORDER BY': 'ispinned DESC, createdat DESC'
    }
  };
  
  console.log('Topic threads query:', JSON.stringify(postObject, null, 2));
  
  return this.post('get_entries', {
    data: JSON.stringify(postObject)
  }).pipe(
    tap((response: any) => {
      console.log('getTopicThreads response:', response);
    }),
    switchMap((response: any) => {
      if (!response.success || !Array.isArray(response.output)) {
        return of(response);
      }
      
      // Get current user info to show as thread author
      const userData = this.getUserData();
      const userType = this.getUserType();
      
      const enrichedThreads = response.output.map((thread: any) => {
        if (userType === '1') { // Teacher
          return {
            ...thread,
            post_count: 0,
            student_firstname: undefined,
            student_lastname: undefined,
            student_profile: undefined,
            teacher_firstname: userData.firstname,
            teacher_lastname: userData.lastname,
            teacher_profile: userData.profile
          };
        } else { // Student
          return {
            ...thread,
            post_count: 0,
            student_firstname: userData.firstname,
            student_lastname: userData.lastname,
            student_profile: userData.profile,
            teacher_firstname: undefined,
            teacher_lastname: undefined,
            teacher_profile: undefined
          };
        }
      });
      
      return of({
        ...response,
        output: enrichedThreads
      });
    })
  );
}

// Create a new topic thread
createTopicThread(topicId: string, title: string, body: string = '') {
  const threadId = this.createID32();
  const userData = this.getUserData();
  const userType = this.getUserType();
  
  console.log('Creating topic thread:', { threadId, topicId, title, body, userType });
  
  const threadValues = {
    threadid: threadId,
    topicid: topicId,
    title: title,
    body: body,
    ispinned: false,
    islocked: false,
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString()
  };
  
  const threadObject = {
    tables: 'topic_threads',
    values: threadValues
  };
  
  console.log('Thread object to create:', threadObject);
  
  // For now, just create the thread without the initial post to avoid lookup issues
  return this.post('create_entry', {
    data: JSON.stringify(threadObject)
  }).pipe(
    map((threadResponse: any) => {
      console.log('Thread creation response:', threadResponse);
      return {
        success: threadResponse.success,
        threadResponse: threadResponse,
        threadId: threadId,
        message: threadResponse.success ? 'Thread created successfully' : 'Failed to create thread'
      };
    })
  );
}

// Get posts in a topic thread
getTopicPosts(threadId: number) {
  console.log('getTopicPosts called with threadId:', threadId);
  
  // Basic query to get posts first
  const postObject = {
    selectors: [
      'id',
      'postid', 
      'threadid',
      'parentpostid',
      'body',
      'author_studentid',
      'author_teacherid',
      'isedited',
      'isdeleted',
      'createdat',
      'updatedat'
    ],
    tables: 'topic_posts',
    conditions: {
      WHERE: {
        threadid: threadId.toString(),
        isdeleted: false
      },
      'ORDER BY': 'createdat ASC'
    }
  };
  
  console.log('getTopicPosts basic query:', JSON.stringify(postObject, null, 2));
  
  return this.post('get_entries', {
    data: JSON.stringify(postObject)
  }).pipe(
    switchMap((response: any) => {
      if (!response.success || !Array.isArray(response.output) || response.output.length === 0) {
        return of(response);
      }
      
      // Enrich each post with author information
      const enrichedPosts$ = response.output.map((post: any) => {
        // Get author info based on student or teacher ID
        if (post.author_studentid) {
          return this.post('get_entries', {
            data: JSON.stringify({
              selectors: ['firstname', 'lastname', 'profile'],
              tables: 'students',
              conditions: {
                WHERE: {
                  id: post.author_studentid
                }
              }
            })
          }).pipe(
            map((studentResponse: any) => {
              if (studentResponse.success && studentResponse.output && studentResponse.output.length > 0) {
                const student = studentResponse.output[0];
                return {
                  ...post,
                  author_firstname: student.firstname,
                  author_lastname: student.lastname,
                  author_profile: student.profile,
                  author_type: 'student'
                };
              }
              return { ...post, author_firstname: 'Unknown', author_lastname: 'User', author_type: 'unknown' };
            }),
            catchError(() => of({ ...post, author_firstname: 'Unknown', author_lastname: 'User', author_type: 'unknown' }))
          );
        } else if (post.author_teacherid) {
          return this.post('get_entries', {
            data: JSON.stringify({
              selectors: ['firstname', 'lastname', 'profile'],
              tables: 'teachers',
              conditions: {
                WHERE: {
                  id: post.author_teacherid
                }
              }
            })
          }).pipe(
            map((teacherResponse: any) => {
              if (teacherResponse.success && teacherResponse.output && teacherResponse.output.length > 0) {
                const teacher = teacherResponse.output[0];
                return {
                  ...post,
                  author_firstname: teacher.firstname,
                  author_lastname: teacher.lastname,
                  author_profile: teacher.profile,
                  author_type: 'teacher'
                };
              }
              return { ...post, author_firstname: 'Unknown', author_lastname: 'User', author_type: 'unknown' };
            }),
            catchError(() => of({ ...post, author_firstname: 'Unknown', author_lastname: 'User', author_type: 'unknown' }))
          );
        } else {
          // No author ID found
          return of({ ...post, author_firstname: 'System', author_lastname: 'User', author_type: 'system' });
        }
      });
      
      // Wait for all author info to be loaded
      if (enrichedPosts$.length === 0) {
        return of(response);
      }
      
      return forkJoin(enrichedPosts$ as Observable<any>[]).pipe(
        map((enrichedPosts: any[]) => ({
          ...response,
          output: enrichedPosts
        })),
        catchError(() => of(response)) // Fallback to basic posts if author lookup fails
      );
    })
  );
}

// Create a new post in a topic thread
createTopicPost(threadId: number, body: string, parentPostId?: number) {
  const postId = this.createID32();
  const userId = this.getUserData().id;
  const userType = this.getUserType();
  
  const values: any = {
    postid: postId,
    threadid: threadId,
    body: body,
    isedited: false,
    isdeleted: false,
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString()
  };
  
  // Set author based on user type
  if (userType === '0') { // Student
    values.author_studentid = userId;
  } else if (userType === '1') { // Teacher
    values.author_teacherid = userId;
  }
  
  if (parentPostId) {
    values.parentpostid = parentPostId;
  }
  
  const postObject = {
    tables: 'topic_posts',
    values: values
  };
  
  return this.post('create_entry', {
    data: JSON.stringify(postObject)
  });
}

// Get course forum threads
getCourseForumThreads(courseId: string) {
  console.log('getCourseForumThreads called with courseId:', courseId);
  
  const postObject = {
    selectors: [
      'course_forum_threads.*',
      'students.firstname as student_firstname',
      'students.lastname as student_lastname',
      'students.profile as student_profile',
      'teachers.firstname as teacher_firstname',
      'teachers.lastname as teacher_lastname',
      'teachers.profile as teacher_profile',
      'COALESCE(post_counts.post_count, 0) as post_count'
    ],
    tables: 'course_forum_threads',
    conditions: {
      'LEFT JOIN students': 'ON students.id = course_forum_threads.author_studentid',
      'LEFT JOIN teachers': 'ON teachers.id = course_forum_threads.author_teacherid',
      'LEFT JOIN (SELECT threadid, COUNT(*) as post_count FROM course_forum_posts WHERE isdeleted = false GROUP BY threadid) as post_counts': 'ON post_counts.threadid = course_forum_threads.id',
      WHERE: {
        'course_forum_threads.courseid': courseId
      },
      'ORDER BY': 'course_forum_threads.ispinned DESC, course_forum_threads.createdat DESC'
    }
  };
  
  console.log('Threads query with author info:', JSON.stringify(postObject, null, 2));
  
  return this.post('get_entries', {
    data: JSON.stringify(postObject)
  }).pipe(
    tap((response: any) => {
      console.log('Threads query response:', response);
      if (response.output && response.output.length > 0) {
        console.log('First thread author info:', {
          student: response.output[0].student_firstname,
          teacher: response.output[0].teacher_firstname,
          postCount: response.output[0].post_count
        });
      }
    }),
    catchError((error) => {
      console.error('Error getting threads:', error);
      return of({ error: 'Failed to get threads.', success: false, output: [] });
    })
  );
}

// Get course forum threads (simplified version without JOINs)
getCourseForumThreadsSimple(courseId: string) {
  const postObject = {
    selectors: [
      'id',
      'courseid',
      'title',
      'body',
      'ispinned',
      'islocked',
      'createdat',
      'updatedat'
    ],
    tables: 'course_forum_threads',
    conditions: {
      WHERE: {
        courseid: courseId
      },
      'ORDER BY': 'ispinned DESC, createdat DESC'
    }
  };
  return this.post('get_entries', {
    data: JSON.stringify(postObject)
  });
}

// Create a new course forum thread
createCourseForumThread(courseId: string, title: string, body: string = '') {
  const threadId = this.createID32();
  const userData = this.getUserData();
  const userType = this.getUserType();
  
  const values: any = {
    threadid: threadId,
    courseid: courseId,
    title: title,
    body: body,
    ispinned: false,
    islocked: false,
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString()
  };
  
  // Set author based on user type
  if (userType === '0') { // Student
    values.author_studentid = userData.id;
  } else if (userType === '1') { // Teacher
    values.author_teacherid = userData.id;
  }
  
  const postObject = {
    tables: 'course_forum_threads',
    values: values
  };
  return this.post('create_entry', {
    data: JSON.stringify(postObject)
  });
}
// Get posts in a course forum thread
getCourseForumPosts(threadId: number) {
  console.log('getCourseForumPosts called with threadId:', threadId);
  
  const postObject = {
    selectors: [
      'course_forum_posts.*',
      'students.firstname as student_firstname', 
      'students.lastname as student_lastname',
      'students.profile as student_profile',
      'teachers.firstname as teacher_firstname',
      'teachers.lastname as teacher_lastname', 
      'teachers.profile as teacher_profile'
    ],
    tables: 'course_forum_posts',
    conditions: {
      'LEFT JOIN students': 'ON students.id = course_forum_posts.author_studentid',
      'LEFT JOIN teachers': 'ON teachers.id = course_forum_posts.author_teacherid',
      WHERE: {
        'course_forum_posts.threadid': threadId,
        'course_forum_posts.isdeleted': false
      },
      'ORDER BY': 'course_forum_posts.createdat ASC'
    }
  };
  
  console.log('Query object for posts with author info:', JSON.stringify(postObject, null, 2));
  
  return this.post('get_entries', {
    data: JSON.stringify(postObject)
  }).pipe(
    tap((response: any) => {
      console.log('Posts query response with author info:', response);
      if (response.output && response.output.length > 0) {
        console.log('First post with author details:', response.output[0]);
      }
    }),
    catchError((error) => {
      console.error('Error getting posts:', error);
      return of({ error: 'Failed to get posts.', success: false, output: [] });
    })
  );
}

// Create a new post in a course forum thread
createCourseForumPost(threadId: number, body: string, parentPostId?: number) {
  const postId = this.createID32();
  const userData = this.getUserData();
  
  console.log('DEBUG: User data from getUserData():', userData);
  console.log('DEBUG: User type from getUserType():', this.getUserType());
  
  if (!userData || !userData.id) {
    console.error('User data not available for creating post. User data:', userData);
    return of({ error: 'User not authenticated', success: false, output: [] });
  }
  
  // First, let's check if the thread actually exists
  const threadCheckObject = {
    selectors: ['id', 'threadid', 'title'],
    tables: 'course_forum_threads',
    conditions: {
      WHERE: {
        id: threadId
      }
    }
  };
  
  console.log('DEBUG: Checking if thread exists:', JSON.stringify(threadCheckObject, null, 2));
  
  return this.post('get_entries', {
    data: JSON.stringify(threadCheckObject)
  }).pipe(
    tap((threadResponse: any) => {
      console.log('DEBUG: Thread check response:', threadResponse);
      if (!threadResponse.success || !threadResponse.output || threadResponse.output.length === 0) {
        console.error('Thread ID', threadId, 'does not exist in course_forum_threads table');
        return;
      }
    }),
    switchMap((threadResponse: any) => {
      if (!threadResponse.success || !threadResponse.output || threadResponse.output.length === 0) {
        return of({ error: 'Thread does not exist', success: false, output: [] });
      }
      
      // Thread exists, proceed with creating the post
      const userId = userData.id;
      const userType = this.getUserType();
  
      const values: any = {
        postid: postId,
        threadid: threadId,
        body: body,
        isdeleted: false,
        isedited: false,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      };
      
      // Set author based on user type
      if (userType === '0') { // Student
        values.author_studentid = userId;
      } else if (userType === '1') { // Teacher
        values.author_teacherid = userId;
      }
      
      if (parentPostId) {
        values.parentpostid = parentPostId;
      }
      
      console.log('DEBUG: Values being inserted:', values);
      
      const postObject = {
        tables: 'course_forum_posts',
        values: values
      };
      
      return this.post('create_entry', {
        data: JSON.stringify(postObject)
      }).pipe(
        tap((createResponse: any) => {
          console.log('DEBUG: Create response details:', createResponse);
          
          // Immediately check if the post was actually saved
          setTimeout(() => {
            const verifyObject = {
              selectors: ['*'],
              tables: 'course_forum_posts',
              conditions: {
                WHERE: {
                  postid: postId
                }
              }
            };
            
            console.log('DEBUG: Verifying post was saved with postid:', postId);
            
            this.post('get_entries', {
              data: JSON.stringify(verifyObject)
            }).subscribe(verifyResponse => {
              console.log('DEBUG: Post verification response:', verifyResponse);
              if (verifyResponse.output && verifyResponse.output.length > 0) {
                console.log('✅ Post found in database:', verifyResponse.output[0]);
              } else {
                console.log('❌ Post NOT found in database after creation');
              }
            });
          }, 1000); // Wait 1 second then check
        })
      );
    })
  );
}

// Edit a topic post
editTopicPost(postId: string, newBody: string) {
  const postObject = {
    tables: 'topic_posts',
    values: {
      body: newBody,
      isEdited: true
    },
    conditions: {
      WHERE: {
        postid: postId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Edit a course forum post
editCourseForumPost(postId: string, newBody: string) {
  const postObject = {
    tables: 'course_forum_posts',
    values: {
      body: newBody,
      isedited: true
    },
    conditions: {
      WHERE: {
        postid: postId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Delete a topic post (soft delete)
deleteTopicPost(postId: string) {
  const postObject = {
    tables: 'topic_posts',
    values: {
      isDeleted: true
    },
    conditions: {
      WHERE: {
        postid: postId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Delete a course forum post (soft delete)
deleteCourseForumPost(postId: string) {
  const postObject = {
    tables: 'course_forum_posts',
    values: {
      isdeleted: true
    },
    conditions: {
      WHERE: {
        postid: postId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Pin/unpin a topic thread
pinTopicThread(threadId: string, isPinned: boolean) {
  const postObject = {
    tables: 'topic_threads',
    values: {
      isPinned: isPinned
    },
    conditions: {
      WHERE: {
        threadid: threadId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Pin/unpin a course forum thread
pinCourseForumThread(threadId: string, isPinned: boolean) {
  const postObject = {
    tables: 'course_forum_threads',
    values: {
      ispinned: isPinned
    },
    conditions: {
      WHERE: {
        threadid: threadId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Lock/unlock a topic thread
lockTopicThread(threadId: string, isLocked: boolean) {
  const postObject = {
    tables: 'topic_threads',
    values: {
      isLocked: isLocked
    },
    conditions: {
      WHERE: {
        threadid: threadId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Lock/unlock a course forum thread
lockCourseForumThread(threadId: string, isLocked: boolean) {
  const postObject = {
    tables: 'course_forum_threads',
    values: {
      islocked: isLocked
    },
    conditions: {
      WHERE: {
        threadid: threadId
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject)
  });
}

// Delete a course forum thread
deleteCourseForumThread(threadId: string) {
  const postObject = {
    tables: 'course_forum_threads',
    conditions: {
      WHERE: {
        threadid: threadId
      }
    }
  };
  
  return this.post('delete_entry', {
    data: JSON.stringify(postObject)
  });
}

// ═══════════════════════════════════════════════════
//             MODERATION & REPORTING METHODS
// ═══════════════════════════════════════════════════

// Get all reported messages for admin moderation
getReportedMessages() {
  // Simplified query for testing
  const postObject = {
    selectors: ['*'],
    tables: 'message_reports'
  };

  return this.post('select_query', {
    data: JSON.stringify(postObject)
  });
}

// Get all reported forum posts  
getReportedForumPosts() {
  const postObject = {
    selectors: ['*'],
    tables: 'course_post_reports'
  };

  return this.post('get_entries', {
    data: JSON.stringify(postObject)
  }).pipe(
    catchError((error) => {
      console.log('Forum posts API error, returning empty result');
      return of({ success: true, output: [] });
    })
  );
}

// Get moderation statistics
getModerationStats() {
  const statsQueries = [
    // Total messages count
    {
      selectors: ['COUNT(*) as total_messages'],
      tables: 'messages',
      conditions: {}
    },
    // Pending reports count
    {
      selectors: ['COUNT(*) as pending_reports'],
      tables: 'message_reports',
      conditions: {
        WHERE: { status: 'pending' }
      }
    }
  ];

  // Execute both queries
  return this.post('select_query', {
    data: JSON.stringify(statsQueries[0])
  });
}

// Report a message
reportMessage(messageId: number, reasonId: number, description?: string) {
  const reportId = this.createID32();
  const userData = this.getUserData();
  const isStudent = this.getUserAccountType() === 'student';
  
  const postObject = {
    tables: 'message_reports',
    values: {
      reportid: reportId,
      message_id: messageId,
      reason_id: reasonId,
      ...(isStudent ? { reporter_studentid: userData.id } : { reporter_teacherid: userData.id }),
      description: description || null,
      status: 'pending',
      priority: 'normal'
    }
  };

  return this.post('insert_query', {
    data: JSON.stringify(postObject)
  });
}

// Report a forum post
reportForumPost(postId: number, reasonId: number, description?: string) {
  const reportId = this.createID32();
  const userData = this.getUserData();
  const isStudent = this.getUserAccountType() === 'student';
  
  console.log('🔍 Report forum post details:', {
    postId: postId,
    postIdType: typeof postId,
    reasonId: reasonId,
    reasonIdType: typeof reasonId,
    userData: userData,
    isStudent: isStudent,
    reportId: reportId
  });
  
  const values: any = {
    reportid: reportId,
    post_id: parseInt(postId.toString()), // Ensure it's a number
    reason_id: parseInt(reasonId.toString()), // Ensure it's a number
    description: description || null,
    status: 'pending',
    priority: 'normal',
    createdat: new Date().toISOString()
  };
  
  // Set reporter based on user type
  if (isStudent) {
    values.reporter_studentid = userData.id;
  } else {
    values.reporter_teacherid = userData.id;
  }
  
  console.log('🔍 Final values for insertion:', values);
  
  const postObject = {
    tables: 'course_post_reports',
    values: values
  };

  console.log('🔍 Complete post object:', postObject);

  return this.post('create_entry', {
    data: JSON.stringify(postObject)
  });
}

// Get report reasons
getReportReasons() {
  const postObject = {
    selectors: ['*'],
    tables: 'report_reasons',
    conditions: {
      WHERE: { isActive: true },
      'ORDER BY': 'name ASC'
    }
  };

  return this.post('select_query', {
    data: JSON.stringify(postObject)
  });
}

// Initialize report reasons if they don't exist
initializeReportReasons() {
  const reportReasons = [
    {
      id: 1,
      code: 'spam',
      name: 'Spam',
      description: 'Unwanted commercial content or repetitive posts',
      isActive: true,
      createdat: new Date()
    },
    {
      id: 2,
      code: 'harassment',
      name: 'Harassment',
      description: 'Bullying, threats, or intimidating behavior',
      isActive: true,
      createdat: new Date()
    },
    {
      id: 3,
      code: 'inappropriate_content',
      name: 'Inappropriate Content',
      description: 'Content not suitable for educational environment',
      isActive: true,
      createdat: new Date()
    },
    {
      id: 4,
      code: 'hate_speech',
      name: 'Hate Speech',
      description: 'Content promoting hatred based on identity',
      isActive: true,
      createdat: new Date()
    },
    {
      id: 5,
      code: 'violence',
      name: 'Violence or Threats',
      description: 'Content promoting or threatening violence',
      isActive: true,
      createdat: new Date()
    },
    {
      id: 6,
      code: 'off_topic',
      name: 'Off Topic',
      description: 'Content not related to the course or discussion',
      isActive: true,
      createdat: new Date()
    },
    {
      id: 7,
      code: 'other',
      name: 'Other',
      description: 'Other reason not listed above',
      isActive: true,
      createdat: new Date()
    }
  ];

  const promises = reportReasons.map(reason => {
    const postObject = {
      table: 'report_reasons',
      fields: reason,
      conflict_fields: ['id'],
      conflict_action: 'UPDATE'
    };

    return this.post('insert_query', {
      data: JSON.stringify(postObject)
    });
  });

  return Promise.all(promises);
}

// Create test forum post report (for testing purposes)
createTestForumPostReport(postId: number = 1, reasonId: number = 1) {
  const reportId = this.createID32();
  const userData = this.getUserData();
  const isStudent = this.getUserAccountType() === 'student';
  
  console.log('🔍 Creating test forum post report:', {
    postId: postId,
    reasonId: reasonId,
    userData: userData,
    isStudent: isStudent,
    reportId: reportId
  });
  
  const values: any = {
    reportid: reportId,
    post_id: parseInt(postId.toString()),
    reason_id: parseInt(reasonId.toString()),
    description: 'Test report for development purposes',
    status: 'pending',
    priority: 'normal',
    createdat: new Date().toISOString()
  };
  
  // Set reporter based on user type or use test data
  if (userData && userData.id) {
    if (isStudent) {
      values.reporter_studentid = userData.id;
    } else {
      values.reporter_teacherid = userData.id;
    }
  } else {
    // Use test data if no user is logged in
    values.reporter_studentid = 'test-student-123';
  }
  
  const postObject = {
    tables: 'course_post_reports',
    values: values
  };

  console.log('🔍 Test report post object:', postObject);

  return this.post('create_entry', {
    data: JSON.stringify(postObject)
  });
}

// Delete reported message (admin action)
deleteReportedMessage(messageId: number, adminId: string, notes?: string) {
  // First mark the message as deleted
  const deleteMessageObject = {
    tables: 'messages',
    conditions: {
      WHERE: { id: messageId }
    }
  };

  // Then update all reports for this message
  const updateReportsObject = {
    tables: 'message_reports',
    values: {
      status: 'resolved',
      resolution: 'deleted',
      reviewed_by: adminId,
      admin_notes: notes || 'Message deleted by admin',
      reviewedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString()
    },
    conditions: {
      WHERE: { message_id: messageId }
    }
  };

  // Log moderation action
  const actionObject = {
    tables: 'moderation_actions',
    values: {
      actionid: this.createID32(),
      target_type: 'message',
      target_id: messageId.toString(),
      action_type: 'delete',
      admin_id: adminId,
      reason: 'Reported content violation',
      notes: notes || 'Message deleted due to reports'
    }
  };

  // Execute delete message first, then update reports and log action
  return this.post('delete_entry', {
    data: JSON.stringify(deleteMessageObject)
  }).pipe(
    switchMap(() => this.post('update_entry', {
      data: JSON.stringify(updateReportsObject)
    })),
    switchMap(() => this.post('insert_query', {
      data: JSON.stringify(actionObject)
    }))
  );
}

// Dismiss reports for a message (admin action)
dismissMessageReports(messageId: number, adminId: string, notes?: string) {
  const updateReportsObject = {
    tables: 'message_reports',
    values: {
      status: 'dismissed',
      resolution: 'no_violation',
      reviewed_by: adminId,
      admin_notes: notes || 'Reports dismissed - no violation found',
      reviewedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString()
    },
    conditions: {
      WHERE: { message_id: messageId }
    }
  };

  // Log moderation action
  const actionObject = {
    tables: 'moderation_actions',
    values: {
      actionid: this.createID32(),
      target_type: 'message',
      target_id: messageId.toString(),
      action_type: 'dismiss',
      admin_id: adminId,
      reason: 'Reports dismissed',
      notes: notes || 'Reports dismissed - no policy violation'
    }
  };

  return this.post('update_entry', {
    data: JSON.stringify(updateReportsObject)
  }).pipe(
    switchMap(() => this.post('insert_query', {
      data: JSON.stringify(actionObject)
    }))
  );
}

// Get censored words
getCensoredWords() {
  const postObject = {
    selectors: ['*'],
    tables: 'censored_words',
    conditions: {
      'ORDER BY': 'word ASC'
    }
  };

  return this.post('select_query', {
    data: JSON.stringify(postObject)
  });
}

// Add censored word
addCensoredWord(word: string, description?: string, severity: string = 'medium', category?: string) {
  const adminId = this.getUserData().id;
  
  const postObject = {
    tables: 'censored_words',
    values: {
      word: word.toLowerCase(),
      description: description || null,
      severity: severity,
      category: category || null,
      added_by: adminId,
      isActive: true
    }
  };

  return this.post('insert_query', {
    data: JSON.stringify(postObject)
  });
}

// Update censored words (bulk update)
updateCensoredWords(words: string[]) {
  const adminId = this.getUserData().id;
  
  // First deactivate all existing words
  const deactivateObject = {
    tables: 'censored_words',
    values: { isActive: false },
    conditions: { WHERE: { added_by: adminId } }
  };

  // Then add new words
  const insertPromises = words.map(word => {
    if (word.trim()) {
      const insertObject = {
        tables: 'censored_words',
        values: {
          word: word.trim().toLowerCase(),
          severity: 'medium',
          added_by: adminId,
          isActive: true
        }
      };
      return this.post('insert_query', {
        data: JSON.stringify(insertObject)
      });
    }
    return of(null);
  }).filter(obs => obs !== null);

  return this.post('update_entry', {
    data: JSON.stringify(deactivateObject)
  }).pipe(
    switchMap(() => forkJoin(insertPromises))
  );
}

// Delete/deactivate a specific censored word
deleteCensoredWord(wordId: number) {
  const updateObject = {
    tables: 'censored_words',
    values: { isActive: false },
    conditions: { WHERE: { id: wordId } }
  };

  return this.post('update_entry', {
    data: JSON.stringify(updateObject)
  });
}

// Update censored word status
updateCensoredWordStatus(wordId: number, isActive: boolean) {
  const updateObject = {
    tables: 'censored_words',
    values: { isActive: isActive },
    conditions: { WHERE: { id: wordId } }
  };

  return this.post('update_entry', {
    data: JSON.stringify(updateObject)
  });
}

// Auto-censor content based on censored words
async censorContent(content: string): Promise<string> {
  try {
    const censoredWords = await firstValueFrom(this.getCensoredWords());
    let censoredContent = content;
    
    if (censoredWords && Array.isArray(censoredWords)) {
      censoredWords.forEach((wordObj: any) => {
        const word = wordObj.word;
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        censoredContent = censoredContent.replace(regex, '*'.repeat(word.length));
      });
    }
    
    return censoredContent;
  } catch (error) {
    console.error('Error censoring content:', error);
    return content; // Return original content if censoring fails
  }
}

// Check if content contains inappropriate words
async hasInappropriateContent(content: string): Promise<boolean> {
  try {
    const censoredWords = await firstValueFrom(this.getCensoredWords());
    
    if (censoredWords && Array.isArray(censoredWords)) {
      return censoredWords.some((wordObj: any) => {
        const word = wordObj.word;
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(content);
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error checking inappropriate content:', error);
    return false;
  }
}




  
  refreshCookies() {
    // Retrieve the user info and account type from cookies
    const encryptedUserInfo = this.getCookie('user_info');
    const encryptedAccountType = this.getCookie('logged_in');
  
    // Check if the cookies exist
    if (encryptedUserInfo && encryptedAccountType) {
      // Decrypt the data if cookies exist
      const userInfo = JSON.parse(this.decryptData(encryptedUserInfo));
      const accountType = this.decryptData(encryptedAccountType);
  
      // Re-encrypt the data
      const refreshedUserInfo = this.encryptData(JSON.stringify(userInfo));
      const refreshedAccountType = this.encryptData(accountType);
  
      // Set the cookies again with the new expiration time (1 hour)
      this.setCookie('user_info', refreshedUserInfo, 1/24);
      this.setCookie('logged_in', refreshedAccountType, 1/24);
    }
  }
  


  teacherAllCourses() {
    const id = this.getUserData().id;
    console.log('Teacher ID for courses query:', id);
    
    // Most basic query first - just get courses for this teacher
    const postObject = {
      selectors: ['*'],
      tables: 'courses',
      conditions: {
        WHERE: {
          'teacherid': id
        }
      }
    };

    console.log('teacherAllCourses query:', JSON.stringify(postObject, null, 2));
    
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }


  
   getCourses(limit?: number, filter?: string) {
    const filterObject = filter != null ? { languageID: filter } : {};
    const limitObject = limit != null ? { LIMIT: limit } : {};
    // const postObject =Object.assign(
    //   {},filterObject, limitObject
    // );
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'teachers.FirstName,teachers.LastName,teachers.Profile',
        'languages.*',
        'courses.*',
        'COUNT(lessons.ID) as lessoncount',
        'AVG(lessons.Difficulty) as complexity',
        'COUNT(student_classes.StudentID) as enrolled',
      ],
      tables: 'courses',
      conditions: Object.assign(
        {
          'LEFT JOIN teachers': 'ON teachers.ID = courses.TeacherID',
          'LEFT JOIN languages': 'ON languages.ID = courses.LanguageID',
          'LEFT JOIN lessons': 'ON lessons.CourseID = courses.ID',
          'LEFT JOIN classes': 'ON classes.CourseID = courses.ID',
          'LEFT JOIN student_classes':
            `ON student_classes.ClassID = classes.ID AND student_classes.StudentID ='` +
            id +
            `'`,
          // 'LEFT JOIN student_classes'
          WHERE: Object.assign(
            {
              'teachers.ID': 'courses.TeacherID',
            },
            filterObject
          ),
          'GROUP BY': 'courses.ID, teachers.ID, languages.ID',
          'ORDER BY': 'AVG(lessons.Difficulty) DESC',
        },
        limitObject
      ),
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
    // return this.post('get_courses', postObject);
  }

  


  matchCourseCode(courseID: string, classCode: string) {
    const classCodeMatch = {
      '[dot]classes.ClassCode': classCode,
    };

    const postObject = {
      selectors: ['classes.*'],
      tables: 'classes, courses',
      conditions: {
        WHERE: Object.assign(classCodeMatch, {
          'classes.CourseID': 'courses.ID',
          'courses.ID': courseID,
        }),
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  enrollCourse(classID: string) {
    const userData = this.getUserData();
    const postObject = {
      tables: 'student_classes',
      values: {
        StudentID: userData.id,
        ClassID: classID,
        Pending: false,
      },
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  checkIfEnrolled(courseID: string) {
    const postObject = { CourseID: courseID, StudentID: this.getUserData().id };
    return this.post('check_if_enrolled', postObject);
  }

  noProfile() {
    return 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg';
  }

  getLessons() {
    const id = this.getUserData().id;
    const currentCourse = this.usedStorage.getItem('courseID');
    if (currentCourse == null) {
      this.router.navigate(['/student/courses']);
    }
    const postObject = {
      selectors: [
        'teachers.FirstName',
        'teachers.LastName',
        'lessons.*, lessons_taken.Progress',
      ],
      tables: 'teachers,courses,lessons',
      conditions: {
        'LEFT JOIN lessons_taken': `ON lessons_taken.LessonID = lessons.ID AND lessons_taken.StudentID ='${id}'`,
        WHERE: {
          'courses.ID': currentCourse,
          'courses.TeacherID': 'teachers.ID',
          'lessons.CourseID': 'courses.ID',
        },
        // 'GROUP BY': 'lessons.ID,teachers.ID, courses.ID',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getCourseByCode(courseCode: string) {
    const postObject = {
      selectors: [
        'courses.id',
        'courses.course',
        'courses.details', 
        'courses.image',
        'courses.objectives',
        'courses.code',
        'courses.teacherid',
        'teachers.firstname',
        'teachers.lastname',
        'COUNT(lessons.id) as lessoncount'
      ],
      tables: 'courses',
      conditions: {
        'LEFT JOIN teachers': 'ON courses.teacherid = teachers.id',
        'LEFT JOIN lessons': 'ON courses.id = lessons.courseid',
        WHERE: {
          'courses.code': courseCode
        },
        'GROUP BY': 'courses.id, teachers.id'
      }
    };
    
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }



  // createTopicWithAttachments(
  //   lessonID: string,
  //   title: string,
  //   details: string,
  //   attachments: string[]
  // ): Observable<any> {
  //   const topicId = this.generateTopicId();

  //   const postObject = {
  //     tables: 'topics',
  //     values: {
  //       lessonid: lessonID,
  //       topicid: topicId,
  //       title: title,
  //       details: details,
  //     }
  //   };

  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject)
  //   }).pipe(
  //     switchMap((response: any) => {
  //       if (response.error || !response.success) {
  //         return of({ error: 'Failed to create topic.' });
  //       }

  //       if (attachments && attachments.length > 0) {
  //         return forkJoin(
  //           attachments.map(attachment =>
  //             this.createTopicAttachments(topicId, attachment, 'file')
  //           )
  //         ).pipe(
  //           map(attachmentResponses => {
  //             const allSuccessful = attachmentResponses.every(res => res.success);
  //             if (allSuccessful) {
  //               return { success: true, topic: response, attachments: attachmentResponses };
  //             } else {
  //               return { error: 'Failed to create some attachments.' };
  //             }
  //           })
  //         );
  //       } else {
  //         return of({ success: true, topic: response });
  //       }
  //     }),
  //     catchError((error) => {
  //       console.error('Error creating topic with attachments:', error);
  //       return of({ error: 'Failed to create topic with attachments.' });
  //     })
  //   );
  // }



  // createTopicAttachments(
  //   topicId: string,
  //   filePath: string,
  //   type: string = 'normal',
  //   metadata?: any
  // ): Observable<any> {
  //   // Ensure timestamp is set correctly
  //   const timestamp = metadata && metadata.timestamp ? Number(metadata.timestamp) : Math.floor(Date.now() / 1000);

  //   // Build post object for creating an attachment
  //   const postObject: any = {
  //     tables: 'attachments',
  //     values: {
  //       topicid: topicId,
  //       attachment: filePath,
  //       type: type,
  //       timestamp: timestamp,
  //       quiz_id: type === 'interactive' && metadata ? metadata.quiz_id : null,
  //     }
  //   };

  //   console.log('Creating attachment with postObject:', postObject);

  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject)
  //   }).pipe(
  //     map((response: any) => {
  //       if (response.error || !response.success) {
  //         console.error('Failed to create attachment in the database:', response.error || 'Unknown error');
  //         return { error: 'Failed to create attachment in the database.' };
  //       } else {
  //         console.log('Attachment created successfully in the database:', response);
  //         return { success: true, data: response };
  //       }
  //     }),
  //     catchError((error) => {
  //       console.error('Error creating attachment:', error);
  //       return of({ error: 'Failed to create attachment in the database.' });
  //     })
  //   );
  // }



  // createTopicAttachments(
  //   topicId: string,
  //   filePath: string,
  //   type: string = 'normal',
  //   metadata?: any
  // ): Observable<any> {
  //   // Ensure timestamp is set correctly
  //   const timestamp = metadata && metadata.timestamp ? Number(metadata.timestamp) : Math.floor(Date.now() / 1000);

  //   // Build post object for creating an attachment
  //   const postObject: any = {
  //     tables: 'attachments',
  //     values: {
  //       topic  id: topicId,
  //       attachment: filePath,
  //       type: type,
  //       timestamp: timestamp,
  //       quiz_id: type === 'interactive' && metadata && metadata.quiz_id ? metadata.quiz_id : null, // Ensure quiz_id is correctly passed
  //     }
  //   };

  //   console.log('Creating attachment with postObject:', postObject);

  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject)
  //   }).pipe(
  //     map((response: any) => {
  //       if (response.error || !response.success) {
  //         console.error('Failed to create attachment in the database:', response.error || 'Unknown error');
  //         return { error: 'Failed to create attachment in the database.' };
  //       } else {
  //         console.log('Attachment created successfully in the database:', response);
  //         return { success: true, data: response };
  //       }
  //     }),
  //     catchError((error) => {
  //       console.error('Error creating attachment:', error);
  //       return of({ error: 'Failed to create attachment in the database.' });
  //     })
  //   );
  // }



  uploadFileLoading(file: File, filename: string, chunkSize: number = 1024 * 1024): Observable<number> {
  return new Observable((subscriber: Subscriber<number>) => {
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0; // Track uploaded chunks

    const uploadChunk = (chunkIndex: number) => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];

        this.http
          .post(environment.nodeserver + '/filehandler-progress', {
            key: environment.socketKey,
            app: environment.app,
            method: 'create_url',
            chunk: base64String,
            fileName: 'files/' +filename,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
          })
          .subscribe({
            next: () => {
              uploadedChunks++;
              const progress = Math.round((uploadedChunks / totalChunks) * 100);
              subscriber.next(progress); // Emit progress

              // Update the snackbar with the current progress
              this.justSnackbar(`Uploading ${filename}... ${progress}%`, 99999999999999);

              if (chunkIndex + 1 < totalChunks) {
                // Upload next chunk
                uploadChunk(chunkIndex + 1);
              } else {
                console.log(`File upload complete: ${filename}`);
                subscriber.complete(); // Complete the observable when the upload is done
              }
            },
            error: (err) => {
              console.error('Error uploading chunk', err);
              subscriber.error(err); // Emit error if there's an issue
            },
          });
      };

      reader.readAsDataURL(chunk);
    };

    // Start uploading the first chunk
    uploadChunk(0);
  });
}

  public uploadProgress:number = 0;

  // uploadFileWithProgress(file: File, filename: string, chunkSize: number = 1024 * 1024): Promise<void> { // Default chunk size of 1MB
  //   return new Promise((resolve, reject) => {
  //     const totalChunks = Math.ceil(file.size / chunkSize);
  //     let uploadedChunks = 0; // Track uploaded chunks

  //     const uploadChunk = (chunkIndex: number) => {
  //       const start = chunkIndex * chunkSize;
  //       const end = Math.min(start + chunkSize, file.size);
  //       const chunk = file.slice(start, end);

  //       const reader = new FileReader();
  //       reader.onloadend = () => {
  //         const base64String = (reader.result as string).split(',')[1];

  //         this.http
  //           .post(environment.nodeserver + '/filehandler-progress', {
  //             key: environment.socketKey,
  //             method: 'create_url',
  //             chunk: base64String,
  //             fileName: 'files/' + filename,
  //             chunkIndex: chunkIndex,
  //             totalChunks: totalChunks,
  //           })
  //           .subscribe({
  //             next: () => {
  //               uploadedChunks++;
  //               this.uploadProgress = Math.round((uploadedChunks / totalChunks) * 100);
  //               // console.log(`Upload progress: ${this.uploadProgress}%`); // Log progress or update UI here
  //               this.justSnackbar(`Uploading interactive file... 0%`, 99999999999999);

  //               if (chunkIndex + 1 < totalChunks) {
  //                 // Upload next chunk
  //                 uploadChunk(chunkIndex + 1);
  //               } else {
  //                 console.log(`File upload complete ${filename}`);
  //                 resolve(); // Resolve the promise when the upload is complete
  //               }
  //             },
  //             error: (err) => {
  //               console.error('Error uploading chunk', err);
  //               reject(err); // Reject the promise on error
  //             },
  //           });
  //       };

  //       reader.readAsDataURL(chunk);
  //     };

  //     // Start uploading the first chunk
  //     uploadChunk(0);
  //   });
  // }

  uploadFileWithProgress(file: File, filename: string, chunkSize: number = 1024 * 1024): Promise<void> {
    return new Promise((resolve, reject) => {
      const totalChunks = Math.ceil(file.size / chunkSize);
      let uploadedChunks = 0; // Track uploaded chunks

      const uploadChunk = (chunkIndex: number) => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];

          this.http
            .post(environment.nodeserver + '/filehandler-progress', {
              key: environment.socketKey,
              app: environment.app,
              method: 'create_url',
              chunk: base64String,
              fileName: 'files/'+ filename,
              chunkIndex: chunkIndex,
              totalChunks: totalChunks,
            })
            .subscribe({
              next: () => {
                uploadedChunks++;
                this.uploadProgress = Math.round((uploadedChunks / totalChunks) * 100);
                // Update the snackbar with the current progress
                this.justSnackbar(`Uploading ${filename}... ${this.uploadProgress}%`, 99999999999999);

                if (chunkIndex + 1 < totalChunks) {
                  // Upload next chunk
                  uploadChunk(chunkIndex + 1);
                } else {
                  console.log(`File upload complete: ${filename}`);
                  resolve(); // Resolve the promise when the upload is complete
                }
              },
              error: (err) => {
                console.error('Error uploading chunk', err);
                reject(err); // Reject the promise on error
              },
            });
        };

        reader.readAsDataURL(chunk);
      };

      // Start uploading the first chunk
      uploadChunk(0);
    });
  }


  uploadFileWithProgressNoSnackbar(file: File, filename: string, chunkSize: number = 1024 * 1024): Promise<void> {
    return new Promise((resolve, reject) => {
      const totalChunks = Math.ceil(file.size / chunkSize);
      let uploadedChunks = 0;

      const uploadChunk = (chunkIndex: number) => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];

          this.http
            .post(environment.nodeserver + '/filehandler-progress', {
              key: environment.socketKey,
              app: environment.app,
              method: 'create_url',
              chunk: base64String,
              fileName: 'files/'+filename,
              chunkIndex: chunkIndex,
              totalChunks: totalChunks,
            })
            .subscribe({
              next: () => {
                uploadedChunks++;
                this.uploadProgress = Math.round((uploadedChunks / totalChunks) * 100);

                if (chunkIndex + 1 < totalChunks) {
                  uploadChunk(chunkIndex + 1);
                } else {
                  console.log(`File upload complete: ${filename}`);
                  resolve();
                }
              },
              error: (err) => {
                console.error('Error uploading chunk', err);
                reject(err); // Reject the promise on error
              },
            });
        };

        reader.readAsDataURL(chunk);
      };

      // Start uploading the first chunk
      uploadChunk(0);
    });
  }







  generateUniqueFileName(): string {
    return 'file_' + Math.random().toString(36).substring(2, 15); // Example file name generator
  }



  createTopicWithAttachments(
    lessonID: string,
    title: string,
    details: string,
    attachments: string[]
  ): Observable<any> {
    const topicId = this.generateTopicId();

    const postObject = {
      tables: 'topics',
      values: {
        lessonid: lessonID,
        topicid: topicId,
        title: title,
        details: details,
      }
    };

    return this.post('create_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      switchMap((response: any) => {
        if (response.error || !response.success) {
          return of({ error: 'Failed to create topic.' });
        }

        if (attachments && attachments.length > 0) {
          return forkJoin(
            attachments.map(attachment =>
              this.createTopicAttachments(topicId, attachment)
            )
          ).pipe(
            map(attachmentResponses => {
              const allSuccessful = attachmentResponses.every(res => res.success);
              if (allSuccessful) {
                return { success: true, topic: response, attachments: attachmentResponses };
              } else {
                return { error: 'Failed to create some attachments.' };
              }
            })
          );
        } else {
          return of({ success: true, topic: response });
        }
      }),
      catchError((error) => {
        console.error('Error creating topic with attachments:', error);
        return of({ error: 'Failed to create topic with attachments.' });
      })
    );
  }


  createTopicAttachments(
    topicId: string,
    filePath: string,
    type: string = 'normal',
    metadata?: any
  ): Observable<any> {
    const postObject: any = {
      tables: 'attachments',
      values: {
        topicid: topicId,
        attachment: filePath,
        type: type,
        timestamp: type === 'interactive' ? Number(metadata.timestamp) : null,
        quiz_id: type === 'interactive' ? metadata.quiz_id : null,
      }
    };

    // Remove null values to ensure they are not sent as empty strings
    Object.keys(postObject.values).forEach(key =>
      postObject.values[key] === null && delete postObject.values[key]
    );

    console.log('Creating attachment with postObject:', postObject);

    return this.post('create_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      map((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to create attachment in the database:', response.error || 'Unknown error');
          return { error: 'Failed to create attachment in the database.' };
        } else {
          console.log('Attachment created successfully in the database:', response);
          return { success: true, data: response, id: response.id || response.insertId };
        }
      }),
      catchError((error) => {
        console.error('Error creating attachment:', error);
        return of({ error: 'Failed to create attachment in the database.' });
      })
    );
  }

  // ===========================
  // TABLE OF CONTENTS METHODS
  // ===========================

  /**
   * Create video table of contents entry
   */
  createVideoTableContent(data: {
    attachment_id: number;
    content_name: string;
    description?: string;
    start_timestamp: number;
    end_timestamp: number;
    order_index: number;
  }): Observable<any> {
    const postObject = {
      tables: 'video_table_contents',
      values: {
        attachment_id: data.attachment_id,
        content_name: data.content_name,
        description: data.description || '',
        start_timestamp: data.start_timestamp,
        end_timestamp: data.end_timestamp,
        order_index: data.order_index
      }
    };

    console.log('Creating video table content with postObject:', postObject);

    return this.post('create_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      map((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to create video table content:', response.error || 'Unknown error');
          return { error: 'Failed to create video table content.' };
        } else {
          console.log('Video table content created successfully:', response);
          return { success: true, data: response, id: response.id || response.insertId };
        }
      }),
      catchError((error) => {
        console.error('Error creating video table content:', error);
        return of({ error: 'Failed to create video table content.' });
      })
    );
  }

  /**
   * Get video table of contents for attachment
   */
  getVideoTableContents(attachmentId: number): Observable<any> {
    const postObject = {
      selectors: ['*'],
      tables: 'video_table_contents',
      conditions: {
        WHERE: { attachment_id: attachmentId },
        'ORDER BY': 'order_index ASC, start_timestamp ASC'
      }
    };

    console.log('Getting video table contents for attachment:', attachmentId);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      map((response: any) => {
        if (response.error) {
          console.error('Failed to get video table contents:', response.error);
          return { success: false, error: response.error };
        } else {
          console.log('Video table contents retrieved successfully:', response);
          return { success: true, output: response.output || [] };
        }
      }),
      catchError((error) => {
        console.error('Error getting video table contents:', error);
        return of({ success: false, error: 'Failed to get video table contents.' });
      })
    );
  }

  /**
   * Update video table of contents entry
   */
  updateVideoTableContent(id: number, data: {
    content_name?: string;
    description?: string;
    start_timestamp?: number;
    end_timestamp?: number;
    order_index?: number;
  }): Observable<any> {
    const postObject = {
      tables: 'video_table_contents',
      values: data,
      conditions: {
        WHERE: { id: id }
      }
    };

    console.log('Updating video table content:', postObject);

    return this.post('update_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      map((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to update video table content:', response.error || 'Unknown error');
          return { error: 'Failed to update video table content.' };
        } else {
          console.log('Video table content updated successfully:', response);
          return { success: true, data: response };
        }
      }),
      catchError((error) => {
        console.error('Error updating video table content:', error);
        return of({ error: 'Failed to update video table content.' });
      })
    );
  }

  /**
   * Delete video table of contents entry
   */
  deleteVideoTableContent(id: number): Observable<any> {
    const postObject = {
      tables: 'video_table_contents',
      conditions: {
        WHERE: { id: id }
      }
    };

    console.log('Deleting video table content:', id);

    return this.post('delete_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      map((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to delete video table content:', response.error || 'Unknown error');
          return { error: 'Failed to delete video table content.' };
        } else {
          console.log('Video table content deleted successfully:', response);
          return { success: true, data: response };
        }
      }),
      catchError((error) => {
        console.error('Error deleting video table content:', error);
        return of({ error: 'Failed to delete video table content.' });
      })
    );
  }

  // Video Table Contents Utility Methods

  /**
   * Save new video table content
   */
  saveVideoTableContent(content: VideoTableContent): Observable<any> {
    return this.createVideoTableContent({
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
  updateVideoTableContentFull(content: VideoTableContent): Observable<any> {
    if (!content.id) {
      throw new Error('Content ID is required for update');
    }
    
    return this.updateVideoTableContent(content.id, {
      content_name: content.content_name,
      description: content.description,
      start_timestamp: content.start_timestamp,
      end_timestamp: content.end_timestamp,
      order_index: content.order_index
    });
  }

  /**
   * Reorder video table contents
   */
  reorderVideoTableContents(attachmentId: number, contentIds: number[]): Observable<any> {
    // For now, we'll update each item's order individually
    // This could be optimized with a batch update endpoint later
    const updatePromises = contentIds.map((id, index) => 
      firstValueFrom(this.updateVideoTableContent(id, { order_index: index + 1 }))
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


  getTopics(lessonId?: string) {
    const postObject = {
      selectors: [
        'topics.*',
        'lessons.Title AS LessonTitle',
        'courses.Course AS CourseTitle'
      ],
      tables: 'topics',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.id = topics.lessonid',
        'LEFT JOIN courses': 'ON courses.id = lessons.courseid',
        WHERE: lessonId ? { 'topics.lessonid': lessonId } : {}, // Correct placement of WHERE
        'ORDER BY': 'topics.id ASC'
      }
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    });
  }



  updateTopic(
    lessonID: string,
    topicID: string,
    title: string,
    details: string
  ): Observable<any> {
    const postObject = {
      tables: 'topics',
      values: {
        title: title,
        details: details
      },
      conditions: {
        WHERE: {
          lessonid: lessonID,
          topicid: topicID
        }
      }
    };

    return this.post('update_entry', {
      data: JSON.stringify(postObject)
    });
  }


  getTopicAttachments(topicId: string): Observable<any> {
    const postObject = {
      selectors: [
        'attachments.*',
        'topics.title AS TopicTitle',
        'assessments.deadline AS deadline'  // Include the deadline from assessments
      ],
      tables: 'attachments',
      conditions: {
        'LEFT JOIN topics': 'ON topics.topicid = attachments.topicid', 
        'LEFT JOIN assessments': 'ON assessments.id = attachments.quiz_id', // Adjust the join condition based on the quiz_id relationship
        WHERE: { 'attachments.topicid': topicId },
        'ORDER BY': 'attachments.id ASC'
      }
    };
  
    console.log('Fetching attachments with postObject:', postObject); // Add detailed logging for debugging
  
    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch attachments from the database:', response.error || 'Unknown error');
        } else {
          console.log('Attachments fetched successfully from the database:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching attachments:', error);
        return of({ error: 'Failed to fetch attachments from the database.' });
      })
    );
  }
  

  // Get all topic attachments for a specific teacher for Geria Drive
  GetTeacherTopicAttachmentsForDrive(): Observable<any> {
    console.log('GetTeacherTopicAttachmentsForDrive called');
    
    // Check if user is logged in
    const userData = this.getUserData();
    console.log('User data:', userData);
    
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const teacherId = userData.id;
    console.log('Teacher ID:', teacherId);
    
    const postObject = {
      selectors: [
        'attachments.*',
        'topics.title AS TopicTitle',
        'lessons.Title AS LessonTitle',
        'courses.Course AS CourseTitle',
        'attachments.created_at AS UploadDate',
        'attachments.attachment AS FilePath',
        'attachments.type AS FileType'
      ],
      tables: 'attachments',
      conditions: {
        'LEFT JOIN topics': 'ON topics.topicid = attachments.topicid',
        'LEFT JOIN lessons': 'ON lessons.id = topics.lessonid',
        'LEFT JOIN courses': 'ON courses.id = lessons.courseid',
        WHERE: { 
          'courses.TeacherID': teacherId,
          'attachments.type': 'file' // Only get file attachments (not quizzes)
        },
        'ORDER BY': 'attachments.created_at DESC'
      }
    };

    console.log('Fetching teacher attachments for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch teacher attachments for drive:', response.error || 'Unknown error');
        } else {
          console.log('Teacher attachments for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching teacher attachments for drive:', error);
        return of({ error: 'Failed to fetch teacher attachments for drive.', success: false, output: [] });
      })
    );
  }

  // ========== GERIA DRIVE HIERARCHICAL FUNCTIONS ==========
  
  // Simple test function to check if we can get any courses at all
  TestGetAllCourses(): Observable<any> {
    console.log('TestGetAllCourses called - simple course fetch');
    
    const postObject = {
      selectors: ['courses.*'],
      tables: 'courses',
      conditions: {
        'ORDER BY': 'courses.Course ASC'
      }
    };

    console.log('Test: Fetching all courses with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        console.log('Test: All courses response:', response);
      }),
      catchError((error) => {
        console.error('Test: Error fetching all courses:', error);
        return of({ error: 'Failed to fetch all courses.', success: false, output: [] });
      })
    );
  }
  
  // Get all courses for drive using teacher-specific logic
  GetCoursesForDrive(limit?: number, filter?: string): Observable<any> {
    console.log('GetCoursesForDrive called');
    
    // Check if user is logged in
    const userData = this.getUserData();
    console.log('User data:', userData);
    
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const id = userData.id;
    console.log('User ID:', id);
    console.log('User Account Type:', userData.accountType);
    
    // Use the exact same logic as teacherAllCourses() which works in manage courses
    const postObject = {
      selectors: ['courses.*', 'COUNT(lessons.ID) as lessons'],
      tables: 'courses',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.CourseID = courses.ID',
        WHERE: {
          'courses.TeacherID': id,
        },
        'GROUP BY': 'courses.ID',
      },
    };

    console.log('Fetching teacher courses for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        console.log('Teacher courses response:', response);
        if (response.error || !response.success) {
          console.error('Failed to fetch teacher courses for drive:', response.error || 'Unknown error');
        } else {
          console.log('Teacher courses fetched successfully for drive:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching teacher courses for drive:', error);
        return of({ error: 'Failed to fetch teacher courses for drive.', success: false, output: [] });
      })
    );
  }

  // Get all courses for a teacher to display as folders in drive
  GetTeacherCoursesForDrive(): Observable<any> {
    console.log('GetTeacherCoursesForDrive called');
    
    // Check if user is logged in
    const userData = this.getUserData();
    console.log('User data:', userData);
    
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const teacherId = userData.id;
    console.log('Teacher ID:', teacherId);
    
    const postObject = {
      selectors: [
        'courses.ID',
        'courses.Course AS courseName',
        'courses.Description AS courseDescription',
        'courses.CourseIMG AS courseImage',
        'courses.created_at AS createdDate',
        'COUNT(lessons.ID) AS lessonCount'
      ],
      tables: 'courses',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.CourseID = courses.ID',
        WHERE: { 
          'courses.TeacherID': teacherId
        },
        'GROUP BY': 'courses.ID',
        'ORDER BY': 'courses.Course ASC'
      }
    };

    console.log('Fetching teacher courses for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch teacher courses for drive:', response.error || 'Unknown error');
        } else {
          console.log('Teacher courses for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching teacher courses for drive:', error);
        return of({ error: 'Failed to fetch teacher courses for drive.', success: false, output: [] });
      })
    );
  }

  // Get lessons for drive using the same logic as LMS getLessons
  GetLessonsForDrive(courseId: string): Observable<any> {
    console.log('GetLessonsForDrive called with courseId:', courseId);
    
    const userData = this.getUserData();
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const id = userData.id;
    
    const postObject = {
      selectors: [
        'teachers.FirstName',
        'teachers.LastName',
        'lessons.*, lessons_taken.Progress',
      ],
      tables: 'teachers,courses,lessons',
      conditions: {
        'LEFT JOIN lessons_taken': `ON lessons_taken.LessonID = lessons.ID AND lessons_taken.StudentID ='${id}'`,
        WHERE: {
          'courses.ID': courseId,
          'courses.TeacherID': 'teachers.ID',
          'lessons.CourseID': 'courses.ID',
        },
      },
    };

    console.log('Fetching lessons for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch lessons for drive:', response.error || 'Unknown error');
        } else {
          console.log('Lessons for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching lessons for drive:', error);
        return of({ error: 'Failed to fetch lessons for drive.', success: false, output: [] });
      })
    );
  }

  // Get all lessons for a specific course to display as subfolders
  GetCourseLessonsForDrive(courseId: string): Observable<any> {
    console.log('GetCourseLessonsForDrive called with courseId:', courseId);
    
    // Check if user is logged in
    const userData = this.getUserData();
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const teacherId = userData.id;
    
    const postObject = {
      selectors: [
        'lessons.ID',
        'lessons.Title AS lessonTitle',
        'lessons.Description AS lessonDescription',
        'lessons.created_at AS createdDate',
        'courses.Course AS courseName',
        'COUNT(topics.topicid) AS topicCount'
      ],
      tables: 'lessons',
      conditions: {
        'INNER JOIN courses': 'ON courses.ID = lessons.CourseID',
        'LEFT JOIN topics': 'ON topics.lessonid = lessons.ID',
        WHERE: { 
          'lessons.CourseID': courseId,
          'courses.TeacherID': teacherId // Verify ownership
        },
        'GROUP BY': 'lessons.ID',
        'ORDER BY': 'lessons.Title ASC'
      }
    };

    console.log('Fetching course lessons for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch course lessons for drive:', response.error || 'Unknown error');
        } else {
          console.log('Course lessons for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching course lessons for drive:', error);
        return of({ error: 'Failed to fetch course lessons for drive.', success: false, output: [] });
      })
    );
  }

  // Get topics for drive using the same logic as LMS getTopics
  GetTopicsForDrive(lessonId?: string): Observable<any> {
    console.log('GetTopicsForDrive called with lessonId:', lessonId);
    
    const userData = this.getUserData();
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const postObject = {
      selectors: [
        'topics.*',
        'lessons.Title AS LessonTitle',
        'courses.Course AS CourseTitle'
      ],
      tables: 'topics',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.id = topics.lessonid',
        'LEFT JOIN courses': 'ON courses.id = lessons.courseid',
        WHERE: lessonId ? { 'topics.lessonid': lessonId } : {},
        'ORDER BY': 'topics.id ASC'
      }
    };

    console.log('Fetching topics for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch topics for drive:', response.error || 'Unknown error');
        } else {
          console.log('Topics for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching topics for drive:', error);
        return of({ error: 'Failed to fetch topics for drive.', success: false, output: [] });
      })
    );
  }

  // Get all topics for a specific lesson to display as subfolders
  GetLessonTopicsForDrive(lessonId: string): Observable<any> {
    console.log('GetLessonTopicsForDrive called with lessonId:', lessonId);
    
    // Check if user is logged in
    const userData = this.getUserData();
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const teacherId = userData.id;
    
    const postObject = {
      selectors: [
        'topics.topicid',
        'topics.title AS topicTitle',
        'topics.description AS topicDescription',
        'topics.created_at AS createdDate',
        'lessons.Title AS lessonTitle',
        'courses.Course AS courseName',
        'COUNT(attachments.id) AS attachmentCount'
      ],
      tables: 'topics',
      conditions: {
        'INNER JOIN lessons': 'ON lessons.ID = topics.lessonid',
        'INNER JOIN courses': 'ON courses.ID = lessons.CourseID',
        'LEFT JOIN attachments': 'ON attachments.topicid = topics.topicid AND attachments.type = "file"',
        WHERE: { 
          'topics.lessonid': lessonId,
          'courses.TeacherID': teacherId // Verify ownership
        },
        'GROUP BY': 'topics.topicid',
        'ORDER BY': 'topics.title ASC'
      }
    };

    console.log('Fetching lesson topics for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch lesson topics for drive:', response.error || 'Unknown error');
        } else {
          console.log('Lesson topics for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching lesson topics for drive:', error);
        return of({ error: 'Failed to fetch lesson topics for drive.', success: false, output: [] });
      })
    );
  }

  // Get topic attachments for drive using the same logic as LMS getTopicAttachments
  GetTopicAttachmentsForDrive(topicId: string): Observable<any> {
    console.log('GetTopicAttachmentsForDrive called with topicId:', topicId);
    
    const userData = this.getUserData();
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const postObject = {
      selectors: [
        'attachments.*',
        'topics.title AS TopicTitle',
        'assessments.deadline AS deadline'
      ],
      tables: 'attachments',
      conditions: {
        'LEFT JOIN topics': 'ON topics.topicid = attachments.topicid', 
        'LEFT JOIN assessments': 'ON assessments.id = attachments.quiz_id',
        WHERE: { 'attachments.topicid': topicId },
        'ORDER BY': 'attachments.id ASC'
      }
    };

    console.log('Fetching topic attachments for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch topic attachments for drive:', response.error || 'Unknown error');
        } else {
          console.log('Topic attachments for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching topic attachments for drive:', error);
        return of({ error: 'Failed to fetch topic attachments for drive.', success: false, output: [] });
      })
    );
  }

  // Get all attachments for a specific topic to display as files
  GetTopicAttachmentsForDriveOriginal(topicId: string): Observable<any> {
    console.log('GetTopicAttachmentsForDriveOriginal called with topicId:', topicId);
    
    // Check if user is logged in
    const userData = this.getUserData();
    if (!userData || !userData.id) {
      console.error('User not logged in or user data not available');
      return of({ 
        error: 'User not authenticated', 
        success: false, 
        output: [] 
      });
    }

    const teacherId = userData.id;
    
    const postObject = {
      selectors: [
        'attachments.*',
        'topics.title AS topicTitle',
        'lessons.Title AS lessonTitle',
        'courses.Course AS courseTitle',
        'attachments.created_at AS uploadDate',
        'attachments.attachment AS filePath',
        'attachments.type AS fileType'
      ],
      tables: 'attachments',
      conditions: {
        'INNER JOIN topics': 'ON topics.topicid = attachments.topicid',
        'INNER JOIN lessons': 'ON lessons.ID = topics.lessonid',
        'INNER JOIN courses': 'ON courses.ID = lessons.CourseID',
        WHERE: { 
          'attachments.topicid': topicId,
          'courses.TeacherID': teacherId, // Verify ownership
          'attachments.type': 'file' // Only get file attachments (not quizzes)
        },
        'ORDER BY': 'attachments.created_at DESC'
      }
    };

    console.log('Fetching topic attachments for drive with postObject:', postObject);

    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch topic attachments for drive:', response.error || 'Unknown error');
        } else {
          console.log('Topic attachments for drive fetched successfully:', response);
        }
      }),
      catchError((error) => {
        console.error('Error fetching topic attachments for drive:', error);
        return of({ error: 'Failed to fetch topic attachments for drive.', success: false, output: [] });
      })
    );
  }

  
  getAttachmentsWithReadStatus(topicId: string, studentId: string): Observable<any> {
    const postObject = {
      selectors: [
        'attachments.*',
        'topics.title AS TopicTitle',
        'assessments.deadline AS deadline',  // Include the deadline from assessments
        'read_attachments.is_read AS isRead' // Include read status from read_attachments
      ],
      tables: 'attachments',
      conditions: {
        'LEFT JOIN topics': 'ON topics.topicid = attachments.topicid',
        'LEFT JOIN assessments': 'ON assessments.id = attachments.quiz_id',
        'LEFT JOIN read_attachments': `ON read_attachments.attachment_id = attachments.id AND read_attachments.student_id = '${studentId}'`,
        WHERE: { 'attachments.topicid': topicId },
        'ORDER BY': 'attachments.id ASC'
      }
    };
  
    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success) {
          console.error('Failed to fetch attachments with read status:', response.error || 'Unknown error');
        } else {
          console.log('Attachments with read status fetched:', response.output); // Log the relevant response output only once
        }
      }),
      catchError((error) => {
        console.error('Error fetching attachments with read status:', error);
        return of({ error: 'Failed to fetch attachments with read status from the database.' });
      })
    );
  }
  

  getReadTopicStatus(topicId: string, studentId: string): Observable<any> {
    const postObject = {
      selectors: [
        'read_topics.topic_id AS topicId',
        'read_topics.is_finished AS isFinished',
        'read_topics.finished_at AS finishedAt'
      ],
      tables: 'read_topics',
      conditions: {
        'WHERE': {
          'read_topics.topic_id': topicId,
          'read_topics.student_id': studentId
        },
        'ORDER BY': 'read_topics.finished_at DESC' // Ensure the most recent status is fetched if duplicates exist
      }
    };
  
    console.log(`Fetching read topic status for topicId: ${topicId} and studentId: ${studentId}`);
  
    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.error || !response.success || !response.output || response.output.length === 0) {
          console.warn(`No data found for topicId: ${topicId} and studentId: ${studentId}. Attempting to create a new entry...`);
          
          // Optionally, trigger an insert for a new record if no data is found
          this.createReadTopicStatus(topicId, studentId).subscribe(insertResponse => {
            if (insertResponse.success) {
              console.log(`Inserted new read topic status for topicId: ${topicId} and studentId: ${studentId}`);
            } else {
              console.error(`Failed to insert read topic status for topicId: ${topicId} and studentId: ${studentId}`, insertResponse.error);
            }
          });
        } else {
          console.log('Read topic status fetched successfully:', response.output[0]); // Log only the relevant data
        }
      }),
      catchError((error) => {
        console.error('Error fetching read topic status:', error);
        return of({ error: 'Failed to fetch read topic status from the database.' });
      })
    );
  }
  
  
  // Helper function to create a new read topic status if not found
  createReadTopicStatus(topicId: string, studentId: string): Observable<any> {
    const postObject = {
      tables: 'read_topics',
      values: {
        topic_id: topicId,
        student_id: studentId,
        is_finished: false,
        finished_at: null
      }
    };
  
    return this.post('create_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        if (response.success) {
          console.log(`Successfully created read topic entry for topicId: ${topicId} and studentId: ${studentId}`);
        } else {
          console.error('Error creating read topic entry:', response.error);
        }
      }),
      catchError((error) => {
        console.error('Error creating read topic status:', error);
        return of({ error: 'Failed to create read topic status in the database.' });
      })
    );
  }
    


  
  
  


  

  deleteTopicWithAttachments(topicId: string): Observable<any> {
    return this.deleteTopicAttachments(topicId).pipe(
      switchMap(() => this.deleteTopic(topicId)),
      catchError(error => {
        console.error('Error deleting topic:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  public deleteTopicAttachments(topicId: string): Observable<any> {
    return this.post('delete_entry', {
      data: JSON.stringify({
        tables: 'attachments',
        conditions: { WHERE: { topicid: topicId } }
      })
    });
  }

  public deleteSpecificAttachment(attachmentId: string): Observable<any> {
    // First, delete any dependent records in other tables
    return this.post('delete_entry', {
      data: JSON.stringify({
        tables: 'read_attachments',
        conditions: { WHERE: { attachment_id: attachmentId } }
      })
    }).pipe(
      switchMap(() =>
        this.post('delete_entry', {
          data: JSON.stringify({
            tables: 'attachments',
            conditions: { WHERE: { id: attachmentId } }
          })
        })
      ),
      catchError((error) => {
        console.error('Error deleting attachment and dependent records:', error);
        return of({ success: false, error: error.message });
      })
    );
  }
  

  public deleteTopic(topicId: string): Observable<any> {
    return this.post('delete_entry', {
      data: JSON.stringify({
        tables: 'topics',
        conditions: { WHERE: { topicid: topicId } }
      })
    });
  }





  updateTopicAttachments(
    topicID: string,
    attachmentID: number,
    attachment: any,
    type: string,
    timestamp?: string,
    quizID?: string
  ): Observable<any> {
    const postObject = {
      tables: 'attachments',
      values: {
        attachment: JSON.stringify(attachment), // Convert attachment data to JSON if needed
        type: type,
        timestamp: timestamp ? timestamp : null,
        quiz_id: quizID ? quizID : null
      },
      conditions: {
        WHERE: {
          topicid: topicID,
          id: attachmentID
        }
      }
    };

    return this.post('update_entry', {
      data: JSON.stringify(postObject)
    });
  }



  lessonProgress(lessonID: string, progress: number) {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'lessons_taken',
      values: {
        LessonID: lessonID,
        StudentID: id,
        Progress: progress,
      },
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  markAttachmentAsRead(attachmentID: string) {
    const studentID = this.getUserData().id;
    const postObject = {
      tables: 'read_attachments',
      values: {
        attachment_id: attachmentID,
        student_id: studentID,
        is_read: true,
      },
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }
  
  markTopicAsRead(topicID: string) {
    const studentID = this.getUserData().id;
    const postObject = {
        tables: 'read_topics',
        values: {
            topic_id: topicID,
            student_id: studentID,
            is_finished: true, // Updated field name
        },
    };
    return this.post('create_entry', {
        data: JSON.stringify(postObject),
    });
}



  getEnrolledCourses() {
    const userData = this.getUserData();
    const postObject = {
      selectors: [
        'teachers.firstname',
        'teachers.lastname',
        'classes.*',
        'classes.id as class_id',
        'courses.*',
      ],
      tables: 'courses',
      conditions: {
        'INNER JOIN classes': 'ON classes.courseid = courses.id',
        'INNER JOIN student_classes': 'ON student_classes.classid = classes.id',
        'INNER JOIN students': 'ON students.id = student_classes.studentid',
        'INNER JOIN teachers': 'ON teachers.id = courses.teacherid',
        WHERE: {
          'students.id': userData.id,
          'student_classes.pending': false
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getSpeechesInClass(_class:string) {
    const postObject = {
      selectors: [
        '*'
      ],
      tables: 'speech_analyzer_items',
      conditions: {
        WHERE: {
          'class_id': _class,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }


 
  // with duration

  createClass(
    courseID: string,
    className: string,
    code: string,
    schedule: string,
    duration: number  // Changed to a single number parameter
  ) {
    const postObject = {
      tables: 'classes',
      values: {
        CourseID: courseID,
        Class: className,
        ClassCode: code,
        Schedule: schedule,
        Duration: duration  // Now just a single number
      },
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  getClassFromCode(course_id:string,code:string) {
    const postObject = {
      selectors: ['*'],
      tables: 'classes',
      conditions: {
        WHERE: {
          'ClassCode': code,
          'courseid' : course_id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  createSpeechlab(
    class_id: string,
  ) {
    const postObject = {
      tables: 'speech_labs',
      values: {
        name: 'Auto Generated',
        class_id : class_id
      },
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  editClass(
    classID: string,
    className: string,
    code: string,
    schedule: string,
    duration: number  // Changed to a single number parameter
  ) {
    const postObject = {
      tables: 'classes',
      values: {
        Class: className,
        ClassCode: code,
        Schedule: schedule,
        Duration: duration  // Now just a single number
      },
      conditions: {
        WHERE: {
          ID: classID,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }


  deleteClass(classID: string) {
    const postObject = {
      tables: 'classes',
      conditions: {
        WHERE: {
          ID: classID,
        },
      },
    };
    console.log('calle');
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  getCourseClasses() {
    const currentCourse = this.usedStorage.getItem('courseID');
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['classes.*', 'courses.ID as course_id'],
      tables: 'classes,courses',
      conditions: {
        WHERE: {
          'classes.CourseID': 'courses.ID',
          'courses.TeacherID': id,
          'courses.ID': currentCourse,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherAllClasses() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'classes.*',
        'courses.ID as course_id',
        'courses.course',
        'COUNT(students.ID) as studentcount',
      ],
      tables: 'classes',
      conditions: {
        'LEFT JOIN student_classes': 'ON student_classes.ClassID = classes.ID',
        'LEFT JOIN courses': 'ON classes.CourseID = courses.ID',
        'LEFT JOIN students': 'ON student_classes.StudentID = students.ID',
        WHERE: {
          // 'classes.CourseID': 'courses.ID',
          // 'student_classes.ClassID': 'classes.ID',
          'courses.TeacherID': id,
        },
        'GROUP BY': 'classes.ID,courses.ID',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherCoursesAndEnrolled() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'courses.*',
        'languages.Language',
        'COUNT(students.ID) as studentcount',
      ],
      tables: 'courses',
      conditions: {
        'LEFT JOIN languages': 'ON languages.ID = courses.LanguageID',
        'LEFT JOIN classes': 'ON classes.CourseID = courses.ID',
        'LEFT JOIN student_classes': 'ON student_classes.ClassID = classes.ID',
        'LEFT JOIN students': 'ON student_classes.StudentID = students.ID',
        WHERE: {
          'courses.TeacherID': id,
        },
        'GROUP BY': 'courses.ID,languages.ID',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getStudentsInClass(classID: string) {
    const postObject = {
      selectors: [
        'students.FirstName',
        'students.LastName',
        'students.Email',
        'students.ID as student_id',
        'classes.classcode'
      ],
      tables: 'classes,student_classes,students',
      conditions: {
        WHERE: {
          'classes.ID': classID,
          'student_classes.ClassID': 'classes.ID',
          'students.ID': 'student_classes.StudentID',
          'student_classes.Pending': false,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

    // getStudents() {
    //   const postObject = {
    //     selectors: [
    //       'classes.id as class_id',
    //       'classes.*',
    //       'courses.*',
    //       'students.ID',
    //       'students.FirstName',
    //       'students.LastName',
    //       'students.gender',
    //       'students.birthdate',
    //       'students.nationality',
    //       'students.address',
    //       'students.VisibleID',
    //       'students.Email',
    //       'students.profile',
    //       'students.lastseen',
    //     ],
    //     tables: 'students',
    //     conditions:{
    //       'LEFT JOIN student_classes':' ON student_classes.studentid = students.id',
    //       'LEFT JOIN classes':' ON student_classes.classid = classes.id',
    //       'LEFT JOIN courses ':' ON classes.courseid = courses.id',

    //     }
    //   };
    //   return this.post('get_entries', {
    //     data: JSON.stringify(postObject),
    //   });
  // }
  
  // api.service.ts  ─────────────────────────────────────────────



    getStudentsTeacher() {
      const postObject = {
        selectors: [
          'students.ID',
          'students.FirstName',
          'students.LastName',
          'students.gender',
          'students.birthdate',
          'students.nationality',
          'students.address',
          'students.VisibleID',
          'students.Email',
          'students.profile',
          'students.lastseen',
          'courses.course',
          'classes.class',
          'classes.id AS class_id'
        ],
        tables: 'students,student_classes,classes,courses',
        conditions: {
          WHERE: {
            'student_classes.StudentID': 'students.ID',
            'student_classes.ClassID': 'classes.ID',
            'classes.CourseID': 'courses.ID',
            'courses.teacherID': this.getUserData().id,
          },
        },
      };
      return this.post('get_entries', {
        data: JSON.stringify(postObject),
      });
    }


    //delete

    deleteStudentFromCourse(classID: string, studentID: string) {
      const postObject = {
        tables: 'student_classes',
        conditions: {
          WHERE: {
            ClassID: classID,
            StudentID: studentID,
          },
        },
      };
      console.log('ken', postObject);
      return this.post('delete_entry', {
        data: JSON.stringify(postObject),
      });
    }



    updateFromTeacher(id: string, firstname: string, lastname: string) {
      const postObject = {
        tables: 'students',
        values: {
          FirstName: firstname,
          LastName: lastname
        },
        conditions: {
          WHERE: {
            ID: id,
          },
        },
      };

      console.log('ken', postObject);
      return this.post('update_entry', {
        data: JSON.stringify(postObject),
      });
    }


  verificationNotifier = new BehaviorSubject<any>(null);

  getPendingStudents() {
    const postObject = {
      selectors: [
        '*',
      ],
      tables: 'verification',
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

 
/* ─── STUDENTS ─────────────────────────────────────────────────────────── */

 getStudents() {
      const postObject = {
        selectors: [
          'classes.id as class_id',
          'classes.*',
          'courses.*',
          'students.ID',
          'students.FirstName',
          'students.LastName',
          'students.gender',
          'students.birthdate',
          'students.nationality',
          'students.address',
          'students.VisibleID',
          'students.Email',
          'students.profile',
          'students.lastseen',
        ],
        tables: 'students',
        conditions:{
          'LEFT JOIN student_classes':' ON student_classes.studentid = students.id',
          'LEFT JOIN classes':' ON student_classes.classid = classes.id',
          'LEFT JOIN courses ':' ON classes.courseid = courses.id',

        }
      };
      return this.post('get_entries', {
        data: JSON.stringify(postObject),
      });
    }

  // Add student to class
  addStudentToClass(studentId: string, classId: string): Observable<any> {
    const postObject = {
      tables: 'student_classes',
      values: {
        StudentID: studentId,
        ClassID: classId,
        Pending: false
      }
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  // Remove student from class
  removeStudentFromClass(studentId: string, classId: string): Observable<any> {
    const postObject = {
      tables: 'student_classes',
      conditions: {
        WHERE: {
          StudentID: studentId,
          ClassID: classId
        }
      }
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  // Get all students for filtering available ones
  getAllStudentsForClass(): Observable<any> {
    const postObject = {
      selectors: [
        'students.ID as StudentID',
        'students.FirstName',
        'students.LastName',
        'students.Email'
      ],
      tables: 'students'
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }


/* ─── TEACHERS ─────────────────────────────────────────────────────────── */

  getTeachers() {
    const postObject = {
      selectors: [
        'ID',
        'FirstName',
        'LastName',
        'VisibleID',
        'Email',
        'lastseen',
        'job',
      ],
      tables: 'teachers',
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

/* ─── ADMINS / DEANS / CHAIRS ──────────────────────────────────────────── */

  getAdmins() {
    const postObject = {
      selectors: [
        'ID',
        'FirstName',
        'LastName',
        'Role',
        'Email',
        'LastSeen'
      ],
      tables: 'administrators',
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  
 addStudent(newStudent: any): Observable<any> {
    const postObject = {
      tables: 'students',
      values: Object.assign({
        FirstName: newStudent.lastname,
        LastName: newStudent.firstname,
        Email: newStudent.email,
        '[hash]Password': newStudent.password ?? '1',
        Job: newStudent.job,
        VisibleID: newStudent.visibleid,
      }),
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }
 addTeacher(newTeacher: any): Observable<any> {
    const postObject = {
      tables: 'teachers',
      values: Object.assign({
        ID: this.createID32(),
        FirstName: newTeacher.firstname,
        LastName: newTeacher.lastname,
        Email: newTeacher.email,
        '[hash]Password': newTeacher.password ?? '1',
        Job: newTeacher.job,
        VisibleID: newTeacher.visibleid,
      }),
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  
  addAdmin(newAdmin: any): Observable<any> {
    const postObject = {
      tables: 'administrators',
      values: Object.assign({
        ID: this.createID32(),
        FirstName: newAdmin.firstname,
        LastName: newAdmin.lastname,
        Email: newAdmin.email,
        '[hash]Password': newAdmin.password ?? '1',
        Role: newAdmin.role,
      }),
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

    updateStudentInfo(student: any) {
    var password = {};
    if (student.password) {
      password = {
        '[hash]Password': student.password,
      };
    }
    const postObject = {
      tables: 'students',
      values: Object.assign(
        {
          FirstName: student.firstname,
          LastName: student.lastname,
          Email: student.email,
          VisibleID: student.visibleid,
          BirthDate: student.birthdate,
          Gender: student.gender,
          Nationality: student.nationality,
          Address: student.address
        },
        password
      ),
      conditions: {
        WHERE: {
          ID: student.id,
        },
      },
    };
    console.log(postObject);
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }
 

   updateTeacher(newTeacher: any) {
    var password = {};
    if (newTeacher.password) {
      password = {
        '[hash]Password': newTeacher.password,
      };
    }
    const postObject = {
      tables: 'teachers',
      values: Object.assign(
        {
          FirstName: newTeacher.firstname,
          LastName: newTeacher.lastname,
          Email: newTeacher.email,
          Job: newTeacher.job,
          VisibleID: newTeacher.visibleid,
        },
        password
      ),
      conditions: {
        WHERE: {
          ID: newTeacher.id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }


    updateAdmin(newAdmin: any) {
    var password = {};
    if (newAdmin.password) {
      password = {
        '[hash]Password': newAdmin.password,
      };
    }
    const postObject = {
      tables: 'administrators',
      values: Object.assign(
        {
          FirstName: newAdmin.firstname,
          LastName: newAdmin.lastname,
          Email: newAdmin.email,
          Role: newAdmin.role,
        },
        password
      ),
      conditions: {
        WHERE: {
          ID: newAdmin.id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }


  

//   getStudents() {
//   const postObject = {
//     selectors: [
//       'students.ID',
//       'students.FirstName',
//       'students.LastName',
//       'students.Email',
//       'students.VisibleID',
//       'students.LastSeen',
//       'students.gender',
//       'students.birthdate',
//       'students.nationality',
//       'students.address',
//       'students.profile',
//       'COALESCE(students."isSuspended",false) AS isSuspended'  // ★
//     ],
//     tables: 'students',
//     conditions : {
//       'LEFT JOIN student_classes':' ON student_classes.studentid = students.id',
//       'LEFT JOIN classes'        :' ON student_classes.classid  = classes.id',
//       'LEFT JOIN courses'        :' ON classes.courseid         = courses.id',
//     }
//   };

//   return this.post('get_entries', { data: JSON.stringify(postObject) });
// }

  // getTeachers() {
  //   const postObject = {
  //     selectors: [
  //       'ID',
  //       'FirstName',
  //       'LastName',
  //       'VisibleID',
  //       'Email',
  //       'lastseen',
  //       'job',
  //     ],
  //     tables: 'teachers',
  //   };
  //   return this.post('get_entries', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  // getAdmins() {
  //   const postObject = {
  //     selectors: [
  //       'ID',
  //       'FirstName',
  //       'LastName',
  //       'Role',
  //       'Email',
  //       'LastSeen'
  //     ],
  //     tables: 'administrators',
  //   };
  //   return this.post('get_entries', {
  //     data: JSON.stringify(postObject),
  //   });
  // }
  // addStudent(newStudent: any): Observable<any> {
  //   const postObject = {
  //     tables: 'students',
  //     values: Object.assign({
  //       FirstName: newStudent.lastname,
  //       LastName: newStudent.firstname,
  //       Email: newStudent.email,
  //       '[hash]Password': newStudent.password ?? '1',
  //       Job: newStudent.job,
  //       VisibleID: newStudent.visibleid,
  //     }),
  //   };
  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }
  // addTeacher(newTeacher: any): Observable<any> {
  //   const postObject = {
  //     tables: 'teachers',
  //     values: Object.assign({
  //       ID: this.createID32(),
  //       FirstName: newTeacher.firstname,
  //       LastName: newTeacher.lastname,
  //       Email: newTeacher.email,
  //       '[hash]Password': newTeacher.password ?? '1',
  //       Job: newTeacher.job,
  //       VisibleID: newTeacher.visibleid,
  //     }),
  //   };
  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  // addAdmin(newAdmin: any): Observable<any> {
  //   const postObject = {
  //     tables: 'administrators',
  //     values: Object.assign({
  //       ID: this.createID32(),
  //       FirstName: newAdmin.firstname,
  //       LastName: newAdmin.lastname,
  //       Email: newAdmin.email,
  //       '[hash]Password': newAdmin.password ?? '1',
  //       Role: newAdmin.role,
  //     }),
  //   };
  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  // updateAdmin(newAdmin: any) {
  //   var password = {};
  //   if (newAdmin.password) {
  //     password = {
  //       '[hash]Password': newAdmin.password,
  //     };
  //   }
  //   const postObject = {
  //     tables: 'administrators',
  //     values: Object.assign(
  //       {
  //         FirstName: newAdmin.firstname,
  //         LastName: newAdmin.lastname,
  //         Email: newAdmin.email,
  //         Role: newAdmin.role,
  //       },
  //       password
  //     ),
  //     conditions: {
  //       WHERE: {
  //         ID: newAdmin.id,
  //       },
  //     },
  //   };
  //   return this.post('update_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  // updateTeacher(newTeacher: any) {
  //   var password = {};
  //   if (newTeacher.password) {
  //     password = {
  //       '[hash]Password': newTeacher.password,
  //     };
  //   }
  //   const postObject = {
  //     tables: 'teachers',
  //     values: Object.assign(
  //       {
  //         FirstName: newTeacher.firstname,
  //         LastName: newTeacher.lastname,
  //         Email: newTeacher.email,
  //         Job: newTeacher.job,
  //         VisibleID: newTeacher.visibleid,
  //       },
  //       password
  //     ),
  //     conditions: {
  //       WHERE: {
  //         ID: newTeacher.id,
  //       },
  //     },
  //   };
  //   return this.post('update_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  // updateStudentInfo(student: any) {
  //   var password = {};
  //   if (student.password) {
  //     password = {
  //       '[hash]Password': student.password,
  //     };
  //   }
  //   const postObject = {
  //     tables: 'students',
  //     values: Object.assign(
  //       {
  //         FirstName: student.firstname,
  //         LastName: student.lastname,
  //         Email: student.email,
  //         VisibleID: student.visibleid,
  //         BirthDate: student.birthdate,
  //         Gender: student.gender,
  //         Nationality: student.nationality,
  //         Address: student.address
  //       },
  //       password
  //     ),
  //     conditions: {
  //       WHERE: {
  //         ID: student.id,
  //       },
  //     },
  //   };
  //   console.log(postObject);
  //   return this.post('update_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }


  getCourseProgress(courseid: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'SUM(lessons_taken.Progress)',
        'COUNT(lessons.ID) as lessons',
        'student_classes.*',
      ],
      tables: 'student_classes,classes,courses',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.CourseID = courses.ID',
        'LEFT JOIN lessons_taken': 'ON lessons_taken.LessonID = lessons.ID',
        WHERE: {
          'student_classes.StudentID': id,
          'student_classes.ClassID': 'classes.ID',
          'classes.CourseID': 'courses.ID',
          'courses.ID': courseid,
        },
        'GROUP BY': 'student_classes.ID, classes.ID, courses.ID',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getClasses() {
    if (this.getUserType() == '1') {
      const id = this.getUserData().id;
      const postObject = {
        selectors: ['courses.*,classes.*'],
        tables: 'classes,courses',
        conditions: {
          WHERE: {
            'classes.CourseID': 'courses.ID',
            'courses.TeacherID': id,
          },
        },
      };
      return this.post('get_entries', {
        data: JSON.stringify(postObject),
      });
    } else {
      const id = this.getUserData().id;
      const postObject = {
        selectors: [' courses.*, classes.*'],
        tables: 'classes,student_classes, courses',
        conditions: {
          WHERE: {
            'classes.CourseID': 'courses.ID',
            'classes.ID': 'student_classes.ClassID',
            'student_classes.StudentID': id,
          },
        },
      };
      return this.post('get_entries', {
        data: JSON.stringify(postObject),
      });
    }
  }

  teacherGetClassesByCourse(courseID: string) {
    const postObject = {
      selectors: [
        'classes.*',
        'COUNT(student_classes.StudentID) as studentCount'
      ],
      tables: 'classes',
      conditions: {
        'LEFT JOIN student_classes': 'ON student_classes.ClassID = classes.ID',
        WHERE: {
          'classes.CourseID': courseID,
        },
        'GROUP BY': 'classes.ID'
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }



  // createCourse(
  //   courseID: string,
  //   title: string,
  //   description: string,
  //   mode: string,
  //   languageID: string,
  //   imageUrl: string,
  //   courseObjectives: string,
  //   targetAudience: string[],
  //   technicalRequirements: string[]
  // ) {
  //   var _description = description;
  //   if (_description == '') {
  //     _description = '[NONE]';
  //   }

  //   const id = this.getUserData().id;
  //   const formattedTargetAudience = `{${targetAudience.join(',')}}`;  // Convert to PostgreSQL TEXT[] format
  //   const formattedTechRequirements = `{${technicalRequirements.join(',')}}`;  // Convert to PostgreSQL TEXT[] format

  //   const postObject = {
  //     tables: 'courses',
  //     values: {
  //       ID: courseID,
  //       Course: title,
  //       Details: _description,
  //       Difficulty: 3,
  //       TeacherID: id,
  //       LanguageID: languageID,
  //       Filter: mode,
  //       Image: imageUrl,
  //       Objectives: courseObjectives,
  //       Target_Audience: formattedTargetAudience,  // Correctly formatted target audience
  //       Technical_Requirements: formattedTechRequirements,  // Correctly formatted technical requirements
  //     },
  //   };

  //   console.log('Request Payload:', postObject);  // Debugging: Log the request payload

  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   }).pipe(
  //     tap((response) => console.log('API Response:', response)),  // Debugging: Log the response
  //     catchError((error) => {
  //       console.error('API Error:', error);  // Debugging: Log any error
  //       throw error;  // Re-throw the error to handle it in the calling function
  //     })
  //   );
  // }


  createCourse(
  courseID: string,
  title: string,
  description: string,
  mode: string,
  languageID: string,
  imageUrl: string,
  courseObjectives: string,
  targetAudience: string[],
  technicalRequirements: string[],
  selectedTest: string
) {
  var _description = description;
  if (_description == '') {
    _description = '[NONE]';
  }

  const id = this.getUserData().id;

  // Convert arrays to PostgreSQL-compatible formats
  const formattedTargetAudience = targetAudience.map(item => `"${item}"`).join(',');
  const formattedTechRequirements = technicalRequirements.map(item => `"${item}"`).join(',');
  const hasPreTest = selectedTest === 'True'; // Convert "True"/"False" string to boolean

  const postObject = {
    tables: 'courses',
    values: {
      id: courseID,
      course: title,
      details: _description,
      difficulty: 3,
      teacherid: id,
      languageid: languageID,
      filter: mode,
      image: imageUrl,
      objectives: courseObjectives,
      target_audience: `{${formattedTargetAudience}}`,
      technical_requirements: `{${formattedTechRequirements}}`,
      pretest: hasPreTest // Set pretest based on selectedTest
    },
  };

  console.log('Request Payload:', postObject);

  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  }).pipe(
    tap((response) => console.log('API Response:', response)),
    catchError((error) => {
      console.error('API Error:', error);
      throw error;
    })
  );
}

  updateCourse(
    courseID: string,
    title: string,
    description: string,
    mode: string,
    languageID: string,
    imageUrl: string,
    courseObjectives: string
  ) {
    var _description = description;
    if (_description == '') {
      _description = '[NONE]';
    }
    const id = this.getUserData().id;
    const postObject = {
      tables: 'courses',
      values: {
        Course: title,
        Details: _description,
        Difficulty: 3,
        TeacherID: id,
        LanguageID: languageID,
        Filter: mode,
        Image: imageUrl,
        Objectives: courseObjectives
      },
      conditions: {
        WHERE: {
          ID: courseID,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }



  // updateCourse(
  //   courseID: string,
  //   title: string,
  //   description: string,
  //   mode: string,
  //   languageID: string,
  //   imageUrl: string // Add this parameter

  // ) {
  //   var _description = description;
  //   if (_description == '') {
  //     _description = '[NONE]';
  //   }
  //   const id = this.getUserData().id;
  //   const postObject = {
  //     tables: 'courses',
  //     values: {
  //       Course: title,
  //       Details: _description,
  //       Difficulty: 3,
  //       TeacherID: id,
  //       LanguageID: languageID,
  //       Filter: mode,
  //       Image: imageUrl

  //     },
  //     conditions: {
  //       WHERE: {
  //         ID: courseID,
  //       },
  //     },
  //   };
  //   return this.post('update_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  deleteCourse(courseID: string) {
    const postObject = {
      tables: 'courses',
      conditions: {
        WHERE: {
          ID: courseID,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  // teacherGetCoursebyID(courseID: string) {
  //   const postObject = {
  //     selectors: ['courses.*'],
  //     tables: 'courses',
  //     conditions: {
  //       WHERE: {
  //         ID: courseID,
  //       },
  //     },
  //   };
  //   return this.post('get_entries', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  teacherGetCoursebyID(courseID: string) {
    console.log('teacherGetCoursebyID called with ID:', courseID);
    
    const postObject = {
        selectors: [
            'courses.id',
            'courses.course',
            'courses.details',
            'courses.image',
            'courses.objectives',
            'courses.teacherid',
            'courses.languageid',
            'courses.filter',
            'courses.target_audience',
            'courses.technical_requirements',
            'classes.classcode'
        ],
        tables: 'courses',
        conditions: {
          'LEFT JOIN classes': 'ON courses.id = classes.courseid',  // Join with classes table
          WHERE: {
              'courses.id': courseID,
          },
          'LIMIT': 1
        },
    };
    
    console.log('teacherGetCoursebyID query:', postObject);
    
    return this.post('get_entries', {
        data: JSON.stringify(postObject),
    });
  }

  getSpecificClass(classId: string) {
    const postObject = {
        selectors: [
            'classes.id',
            'classes.classcode',
            'classes.courseid',
            'classes.class as classname'
        ],
        tables: 'classes',
        conditions: {
            WHERE: {
                'classes.id': classId,  // Get class by specific ID
            },
        },
    };
    console.log('getSpecificClass query for classId', classId, ':', postObject);
    return this.post('get_entries', {
        data: JSON.stringify(postObject),
    });
  }

  getClassesByCourseIdWorking(courseId: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'classes.id',
        'classes.class',
        'classes.classcode', 
        'classes.courseid',
        'classes.duration',
        'courses.course',
        'COUNT(students.ID) as studentcount',
      ],
      tables: 'classes',
      conditions: {
        'LEFT JOIN student_classes': 'ON student_classes.ClassID = classes.ID',
        'LEFT JOIN courses': 'ON classes.CourseID = courses.ID',
        'LEFT JOIN students': 'ON student_classes.StudentID = students.ID',
        WHERE: {
          'courses.TeacherID': id,
          'classes.courseid': courseId,  // Filter by specific course
        },
        'GROUP BY': 'classes.ID,courses.ID',
      },
    };
    console.log('getClassesByCourseIdWorking query:', postObject);
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getClassById(classId: string) {
    const postObject = {
      selectors: [
        'classes.id',
        'classes.classcode',
        'classes.courseid',
        'classes.classname'
      ],
      tables: 'classes',
      conditions: {
        WHERE: {
          'classes.id': classId,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  createLesson(
    courseID: string,
    title: string,
    description: string,
    complexity: number,
    attachments?: string,
    image?: string
  ) {
    var attach = {};
    if (attachments != undefined) {
      attach = { Attachments: attachments };
    }
    var bg = {};
    if (image != undefined) {
      bg = { Background: image };
    }
    const postObject = {
      tables: 'lessons',
      values: Object.assign(
        {},
        {
          CourseID: courseID,
          Title: title,
          Details: description,
          Difficulty: complexity,
        },
        attach,
        bg
      ),
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateLesson(
    courseID: string,
    lessonID: string,
    title: string,
    description: string,
    complexity: number,
    attachments?: string,
    image?: string
  ) {
    var attach = {};
    if (attachments != undefined) {
      attach = { Attachments: attachments };
    }
    var bg = {};
    if (image != undefined) {
      bg = { Background: image };
    }
    const postObject = {
      tables: 'lessons',
      values: Object.assign(
        {
          Title: title,
          Details: description,
          Difficulty: complexity,
        },
        attach,
        bg
      ),
      conditions: {
        WHERE: {
          CourseID: courseID,
          ID: lessonID,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

    private generateTopicId(): string {
      const prefix = 't';
      const randomString = Math.random().toString(36).substring(2, 12).toUpperCase(); // Generate a random alphanumeric string
      return `${prefix}_${randomString}`; // Combine prefix and random string
    }




  getURL(file: string) {
    if (file) {
      if (file.includes('http')) return file;
      return environment.server +'/'+ environment.app +'/' + file ;
    }
    return file;
  }

  checkIfPendingVerification(email:string){
    const postObject = {
      selectors: [
      '*'
      ],
      tables: 'verification',
      conditions: {
        WHERE: {
          '[dot]Email': email,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }


   pushVerification(data:any){
    const postObject = {
      tables: 'verification',
      values: {
        Email: data.email,
        FirstName: data.firstname,
        LastName: data.lastname,
        Token: data.token
      },
    };

    // console.log(postObject);
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  sendVerification(details: any) {
    return this.http.post<any>(
      environment.nodeserver + '/send-verification-email',
      {
        key: environment.socketKey,
        host: details.host,
        email: details.email,
        password: details.password,
        firstname: details.firstname,
        lastname: details.lastname,
        address: details.address,
        nationality: details.nationality,
        birthdate: details.birthdate,
        gender: details.gender,
      }
    );
  }


  adminVerifyToken(token: string) {
    return this.http.post<any>(environment.nodeserver + '/admin-verify-email', {
      key: environment.socketKey,
      token: token,
    });
  }
  adminRejectToken(token: string) {
    return this.http.post<any>(environment.nodeserver + '/admin-reject-email', {
      key: environment.socketKey,
      token: token,
    });
  }

  verifyEmail(token: string) {
    return this.http.post<any>(environment.nodeserver + '/verify-email', {
      key: environment.socketKey,
      token: token,
    });
  }

  removeFromVerification(email:string){
    const postObject = {
      tables: 'verification',
      conditions: {
        WHERE: {
          '[dot]Email': email,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }


  /* api.service.ts */

register(details: any) {
  const id      = this.createID32();
  const newDate = Date.now().toString();
  const visID   = 'Q-S' + newDate.substring(4, 7) + '-' + newDate.substring(7, 13);

  const postObject = {
    tables: 'students',
    values: {
      ID: id,
      VisibleID: visID,
      Email: details.email,
      '[hash]Password': details.password,
      FirstName: details.firstname,
      LastName: details.lastname,
      Address: details.address,
      Nationality: details.nationality,
      BirthDate: details.birthdate,
      Gender: details.gender
    }
  };

  return this.post('create_entry', { data: JSON.stringify(postObject) });
}


  checkEmailExists(email: string, domain: string) {
    const postObject = {
      selectors: [
        'ID',
      ],
      tables: domain,
      conditions: {
        WHERE: {
          '[dot]Email': email,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherCourseLessons(courseID: string) {
    const postObject = {
      selectors: [
        'courses.id as cid',
        'courses.Course',
        'courses.Details',
        'lessons.*',
      ],
      tables: 'courses,lessons',
      conditions: {
        WHERE: {
          'courses.ID': courseID,
          'lessons.CourseID': 'courses.ID',
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  fetchLessonTopics(lessonId: string) {
    const postObject = {
      selectors: ['topics.*'],
      tables: 'topics',
      conditions: {
        WHERE: {
          'topics.lessonid': lessonId
        }
      }
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }


  getAllLanguages() {
    const postObject = {
      selectors: ['languages.*'],
      tables: 'languages',
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getLanguages() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['languages.*'],
      tables: 'languages,courses',
      conditions: {
        WHERE: {
          'languages.ID': 'courses.LanguageID',
          'courses.TeacherID': id,
        },
        'GROUP BY': 'languages.ID',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getCoursesByLanguage(languageID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['courses.*'],
      tables: 'languages,courses',
      conditions: {
        WHERE: {
          'courses.LanguageID': 'languages.ID',
          'courses.TeacherID': id,
          'languages.ID': languageID,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }





  dictionary(word: string) {
    return this.http.get<any>(environment.server + '/' + word, {});
  }

  getWord(word: string) {
    const postObject = {
      selectors: ['*'],
      tables: 'word_searches',
      conditions: {
        WHERE: {
          Search: word,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  pronounce(word: string) {
    const salt = new Date().getTime();
    return this.http.get<any>(
      environment.server + '/audio/' + word + '.json?' + salt,
      {
        headers: {},
      }
    );
  }

  fetchDictionaryAPI(word: string) {
    const headers = new HttpHeaders({
      'X-RapidAPI-Key': environment.lexicalakey,
      'X-RapidAPI-Host': environment.lexicalahost,
    });
    return this.http.get<any>(
      'https://' + environment.lexicalahost + '/search-entries',
      {
        headers: headers,
        params: { text: word },
      }
    );
  }

  fetchSRAPI(url: string, language: string) {
    var lang = 'en-US';
    switch (language) {
      case 'ja':
        lang = 'ja-JP';
        break;
    }
    const encodedParams = new URLSearchParams();
    encodedParams.set('audio_url', url);
    encodedParams.set('language_code', lang);

    const headers = new HttpHeaders({
      'X-RapidAPI-Key': environment.srKey,
      'X-RapidAPI-Host': environment.srHost,
      'content-type': 'application/x-www-form-urlencoded',
    });
    return this.http.post<any>(
      'https://' + environment.srHost + '/recognize',
      encodedParams,
      { headers }
    );
  }

  tts(text: string, lang: string) {
    const params = new HttpParams()
      .set('msg', text)
      .set('lang', 'Salli')
      .set('source', 'ttsmp3');
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-RapidAPI-Key': 'c29ff39618mshcedc0e4b8d12b69p18ec51jsnd5550cdbf497',
      'X-RapidAPI-Host': 'text-to-speech-for-28-languages.p.rapidapi.com',
    });
    return this.http.post(
      'https://text-to-speech-for-28-languages.p.rapidapi.com/',
      {
        data: params,
      },
      {
        headers,
      }
    );
  }

  saveDictionary(word: string, dictionary?: string) {
    var fileObject = {};
    if (dictionary != undefined) {
      const file = 'dictionary/' + word + '.json';
      this.uploadJson(dictionary, file);
      fileObject = { File: file };
    }
    const postObject = {
      tables: 'word_searches',
      values: Object.assign(
        {
          Search: word,
        },
        fileObject
      ),
    };
    const observable$: Subscription = this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => observable$.unsubscribe());
  }

  savePronunciation(word: string, soundURL: string) {
    return this.post('save_pronunciation', {
      search_key: word,
      sound_url: soundURL,
    }).subscribe((data) => {
    });
  }

  convertToBase64(url: string) {
    this.http.get(url, { responseType: 'blob' }).subscribe(
      (blob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          var bbase64 = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      (error) => {
        console.error('Error fetching audio:', error);
      }
    );
  }

  getCurrentLevel(language: string, mode: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['student_practices.*'],
      tables: 'student_practices',
      conditions: {
        WHERE: {
          StudentID: id,
          LanguageID: language,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  createLevelEntry(language: string, mode: string) {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'student_practices',
      values: {
        StudentID: id,
        LanguageID: language,
      },
    };

    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  updateLevel(practiceID: string, level: number, mode: string) {
    var toUpdate: any = {
      Read: level + 1,
    };
    switch (mode) {
      case 'listening':
        toUpdate = {
          Listen: level + 1,
        };
        break;
      case 'writing':
        toUpdate = {
          Write: level + 1,
        };
        break;
      case 'speaking':
        toUpdate = {
          Speak: level + 1,
        };
        break;
    }
    const postObject = {
      tables: 'student_practices',
      values: toUpdate,
      conditions: {
        WHERE: {
          ID: practiceID,
        },
      },
    };
    this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe();
  }

  convertToTimeZone(date: Date, timeZone: string): Date {
    const targetOffset = new Date(
      date.toLocaleString('en-US', { timeZone })
    ).getTimezoneOffset();
    const localOffset = date.getTimezoneOffset();
    const offsetDiff = localOffset - targetOffset;

    return new Date(date.getTime() + offsetDiff * 60000);
  }

  updateLastSeen() {
    if (!this.isLoggedIn()) return;
    var tzoffset = new Date().getTimezoneOffset() * 60000;
    var localISOTime = new Date(Date.now() - tzoffset).toISOString();

    const id = this.getUserData().id;
    if (this.getUserType() == '2') {
      const postObject = {
        tables: 'administrators',
        values: {
          LastSeen: localISOTime.slice(0, 19).replace('T', ' '),
        },
        conditions: {
          WHERE: {
            ID: id,
          },
        },
      };
      const observable = this.post('update_entry', {
        data: JSON.stringify(postObject),
      }).subscribe(
        () => {
          observable.unsubscribe();
        },
        (error) => {
          if (error instanceof HttpErrorResponse) {
            if (error.status == 0) {
              this.goOffline();
            }
          }
        }
      );
    } else if (this.getUserType() == '1') {
      const postObject = {
        tables: 'teachers',
        values: {
          LastSeen: localISOTime.slice(0, 19).replace('T', ' '),
        },
        conditions: {
          WHERE: {
            ID: id,
          },
        },
      };
      const observable = this.post('update_entry', {
        data: JSON.stringify(postObject),
      }).subscribe(
        () => {
          observable.unsubscribe();
        },
        (error) => {
          if (error instanceof HttpErrorResponse) {
            if (error.status == 0) {
              this.goOffline();
            }
          }
        }
      );
    } else {
      const postObject = {
        tables: 'students',
        values: {
          LastSeen: localISOTime.slice(0, 19).replace('T', ' '),
        },
        conditions: {
          WHERE: {
            ID: id,
          },
        },
      };
      const observable = this.post('update_entry', {
        data: JSON.stringify(postObject),
      }).subscribe(
        () => {
          observable.unsubscribe();
        },
        (error) => {
          if (error instanceof HttpErrorResponse) {
            if (error.status == 0) {
              this.goOffline();
            }
          }
        }
      );
    }
  }



  async courseRequiresPretest(courseId: string): Promise<boolean> {
    try {
      const response = await lastValueFrom(
        this.post('get_entries', {
          data: JSON.stringify({
            selectors: ['pretest'],
            tables: 'courses',
            conditions: {
              WHERE: { id: courseId },
            },
          }),
        })
      );
      
      console.log('Course pretest check response:', response);
      
      if (!response.success || !response.output || !response.output.length) {
        return false;
      }
      
      const pretestValue = response.output[0].pretest;
      return pretestValue === 't' || 
             pretestValue === true || 
             pretestValue === 1 || 
             pretestValue === '1' || 
             pretestValue === 'true';
    } catch (error) {
      console.error('Error checking course pretest:', error);
      return false;
    }
  }

  async pretestExists(courseId: string): Promise<boolean> {
    try {
      const response = await lastValueFrom(
        this.post('get_entries', {
          data: JSON.stringify({
            selectors: ['id'],
            tables: 'assessments',
            conditions: {
              WHERE: {
                CourseID: courseId,
                pretest: true,
              },
            },
          }),
        })
      );
      
      console.log('Pretest existence check response:', response);
      return response.success && response.output && response.output.length > 0;
    } catch (error) {
      console.error('Error checking pretest existence:', error);
      return false;
    }
  }
  
  
  
  
  recordAssessment(
    practiceID: string,
    level: number,
    takenPoints: number,
    totalPoints: number,
    mode: string
  ) {
    const postObject = {
      tables: 'student_practice_attempts',
      values: {
        StudentPracticeID: practiceID,
        Mode: mode,
        CurrentLevel: level,
        TakenPoints: takenPoints,
        TotalPoints: totalPoints,
      },
    };
    this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).subscribe();
  }

  async getCurrentAttemptNumber(assessmentID: string): Promise<number> {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['COUNT(*) as attempt_count'],
      tables: 'student_assessments',
      conditions: {
        WHERE: {
          studentid: id,
          assessmentid: assessmentID,
        },
      },
    };

    try {
      const response = await this.post('get_entries', {
        data: JSON.stringify(postObject),
      }).toPromise();
      
      const currentAttempts = response?.output?.[0]?.attempt_count || 0;
      return currentAttempts + 1; // Next attempt number
    } catch (error) {
      console.error('Error getting attempt number:', error);
      return 1; // Default to first attempt if error
    }
  }

  async recordQuiz(assessmentID: string, takenPoints: number, totalPoints: number) {
    const id = this.getUserData().id;
    const attemptNumber = await this.getCurrentAttemptNumber(assessmentID);
    
    const postObject = {
      tables: 'student_assessments',
      values: {
        studentid: id,
        assessmentid: assessmentID,
        takenpoints: takenPoints,
        totalpoints: totalPoints,
        attempt_number: attemptNumber,
      },
    };
    const record$ = this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      record$.unsubscribe();
    });
  }

  updateQuizScore(assessmentID: string, takenPoints: number) {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'student_assessments',
      values: {
        takenpoints: takenPoints,
      },
      conditions: {
        WHERE: {
          studentid: id,
          assessmentid: assessmentID,
        },
      },
    };
    const update$ = this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      update$.unsubscribe();
    });
  }

  getMyQuizScores(assessmentID: string) {
    const studentID = this.getUserData()?.id; // Fetch student ID using getUserData
  
    const postObject = {
      selectors: ['*'], // Fetch all columns including attempt_number
      tables: 'student_assessments',
      conditions: {
        WHERE: {
          assessmentid: assessmentID,
          studentid: studentID,
        },
        'ORDER BY': 'attempt_number ASC', // Order by attempt number
      },
    };
  
    console.log('Fetching quiz scores with postObject:', postObject); // Log the query object
  
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).toPromise()
      .then(response => {
        console.log('Fetched quiz scores:', response); // Log the response
        return response;
      })
      .catch(error => {
        console.error('Error fetching quiz scores:', error); // Log any errors
        throw error;
      });
  }

  // Get student's attempt history for an assessment
  getStudentAttemptHistory(assessmentID: string, studentID?: string): Observable<any> {
    const id = studentID || this.getUserData()?.id;
    
    const postObject = {
      selectors: [
        'student_assessments.*',
        'students.firstname',
        'students.lastname'
      ],
      tables: 'student_assessments, students',
      conditions: {
        WHERE: {
          'student_assessments.assessmentid': assessmentID,
          'student_assessments.studentid': id,
          'students.id': 'student_assessments.studentid',
        },
        'ORDER BY': 'student_assessments.attempt_number ASC',
      },
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // Check if student can retake assessment based on retake limit
  async canStudentRetake(assessmentID: string): Promise<{ canRetake: boolean; currentAttempts: number; retakeLimit: number }> {
    try {
      // Get assessment retake limit
      const assessmentResponse = await this.post('get_entries', {
        data: JSON.stringify({
          selectors: ['retake_limit'],
          tables: 'assessments',
          conditions: {
            WHERE: { id: assessmentID }
          }
        })
      }).toPromise();

      const retakeLimit = assessmentResponse?.output?.[0]?.retake_limit || 1;
      const currentAttempts = await this.getCurrentAttemptNumber(assessmentID) - 1; // Subtract 1 since getCurrentAttemptNumber returns next attempt

      return {
        canRetake: currentAttempts < retakeLimit,
        currentAttempts,
        retakeLimit
      };
    } catch (error) {
      console.error('Error checking retake eligibility:', error);
      return { canRetake: false, currentAttempts: 0, retakeLimit: 1 };
    }
  }
  
  

  similarity(s1: string, s2: string) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (
      (longerLength - this.editDistance(longer, shorter)) /
      parseFloat(longerLength.toString())
    );
  }

  editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  public speechComparison$: Subject<any> = new Subject<any>();

  // speechToText(audioData: any, check: string, language: string) {
  //   const blob = new Blob([audioData], { type: 'audio/wav' });
  //   const reader = new FileReader();
  //   reader.onloadend = () => {
  //     const base64String = (reader.result as string).split(',')[1];
  //     const uniqID = uuidv4() + '.wav';
  //     this.http
  //       .post(environment.nodeserver + '/filehandler', {
  //         key: environment.socketKey,
  //         method: 'create_url',
  //         file_content: base64String,
  //         search_key: environment.app+ '/temp/' + uniqID,
  //       })
  //       .subscribe((data: any) => {
  //         // console.log(data);
  //         const url = environment.server + '/temp/' + uniqID;
  //         // deepgram.listen.prerecorded.transcribeUrl(
  //         //   audioData,
  //         //   {smart_format:true, model:'nova-2', language:'en-US'}
  //         // ).then(data=>{
  //         //   console.log(data);
  //         // })
  //         const params: TranscribeParams = {
  //           audio: url,
  //           language_code: language as TranscriptLanguageCode,
  //         };
  //         const stamp = Date.now();
  //         client.transcripts
  //           .transcribe(params, {
  //             pollingInterval: 100,
  //           })
  //           .then((transcript) => {
  //             // console.log(transcript);
  //             // console.log(
  //             //   ((Date.now() - stamp) / 1000).toString() + ' seconds'
  //             // );
  //             if (transcript.text != null) {
  //               this.speechComparison$.next({
  //                 spoken: transcript.text,
  //                 accuracy: this.similarity(
  //                   transcript.text.toLowerCase(),
  //                   check!.toLowerCase()
  //                 ),
  //               });
  //               // if (check != null) {
  //               //   if (

  //               //     // transcript.text.toLowerCase().includes(check.toLowerCase())
  //               //   ) {
  //               //     this.successSnackbar('Passed!');
  //               //   } else {
  //               //     this.failedSnackbar('Failed!');
  //               //   }
  //               // }
  //               // console.log(transcript.text);
  //             } else {
  //               this.failedSnackbar('Transcription failed');
  //             }
  //             // this.http.post(environment.nodeserver+'/filehandler',
  //             // {
  //             //   'method':'delete_url', 'search_key':uniqID
  //             // }).subscribe();
  //           });
  //       });
  //   };

  //   reader.readAsDataURL(blob);
  // }



// In your API service:
public isLoading$ = new Subject<boolean>();


async speechToText(audioData: Blob, check: string, language: string): Promise<void> {
  try {
    this.isLoading$.next(true);
    
    // Create audio file from blob
    const audioFile = new File([audioData], 'speech.wav', { type: 'audio/wav' });
    const filename = `${this.createID32()}.wav`;

    // Upload the file with progress
    console.log('Starting file upload...');
    await this.uploadFileWithProgressNoSnackbar(audioFile, filename);
    console.log('File upload completed');

    // Add artificial 2-second delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get full URL from your getURL method
    const fileUrl = `files/${filename}`;
    const fullUrl = this.getURL(fileUrl);
    console.log('Audio URL:', fullUrl);

    const params = {
      audio: fullUrl,
      language_code: language
    };
    console.log('Transcription params:', params);

    const transcript = await client.transcripts.transcribe(params, {
      pollingInterval: 100,
    });
    console.log('Full transcript response:', transcript);

    if (transcript.text) {
      console.log('Transcribed text:', transcript.text);
      const accuracy = this.similarity(
        transcript.text.toLowerCase(),
        check.toLowerCase()
      );
      console.log('Calculated accuracy:', accuracy);

      this.speechComparison$.next({
        spoken: transcript.text,
        accuracy: accuracy
      });
    } else {
      console.error('Transcript failed - No text returned:', transcript);
      this.failedSnackbar('Transcription failed');
    }

  } catch (error) {
    console.error('Speech to text error:', error);
    this.failedSnackbar('Speech recognition failed. Please try again.');
  } finally {
    this.isLoading$.next(false);
  }
}


  deleteFile(file: string) {
    const obs = this.http
      .post(environment.nodeserver + '/filehandler', {
        key: environment.socketKey,
        method: 'delete_url',
        search_key: environment.app + '/' + file,
      })
      .subscribe((data) => {
        obs.unsubscribe();
      });
  }

  // uploadImage(image: File, filename: string) {
  //   const reader = new FileReader();
  //   reader.onloadend = () => {
  //     const base64String = (reader.result as string).split(',')[1];
  //     const obs$ = this.http
  //       .post(environment.nodeserver + '/filehandler', {
  //         key: environment.socketKey,
  //         method: 'create_url',
  //         file_content: base64String,
  //         search_key: 'image_upload/' + filename,
  //       })
  //       .subscribe(() => {
  //         obs$.unsubscribe();
  //       });
  //   };
  //   reader.readAsDataURL(image);
  // }

  uploadImage(image: File, filename: string): Observable<any> { // Return type updated to Observable<any>
    const reader = new FileReader();

    return new Observable((observer) => {
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const obs$ = this.http.post(environment.nodeserver + '/filehandler', {
          key: environment.socketKey,
          method: 'create_url',
          file_content: base64String,
          search_key: environment.app+'/image_upload/' + filename,
        });

        obs$.subscribe(
          (response) => {
            observer.next(response);  // Pass response to the observer
            observer.complete();
          },
          (error) => {
            observer.error(error);  // Pass error to the observer
          }
        );
      };
      reader.readAsDataURL(image);
    });
  }


  uploadBase64(file: string, name: string) {
    const base64String = (file as string).split(',')[1];
    this.http
      .post(environment.nodeserver + '/filehandler', {
        key: environment.socketKey,
        method: 'create_url',
        file_content: base64String,
        search_key: environment.app +'/'+ name,
      })
      .subscribe();
  }

  async uploadBase64Async(file: string, name: string) {
    const base64String = (file as string).split(',')[1];
    await firstValueFrom(this.http
      .post(environment.nodeserver + '/filehandler', {
        key: environment.socketKey,
        method: 'create_url',
        file_content: base64String,
        search_key:  environment.app + '/' + name,
      }));
  }

  updateEsign(ref:string){
    const id = this.getUserData().id;
    if(this.getUserType() =='1'){
      const postObject = {
        tables: 'teachers',
        values: {
          ESign: ref,
        },
        conditions: {
          WHERE: {
            ID: id,
          },
        },
      };
      return this.post('update_entry', {
        data: JSON.stringify(postObject),
      })
    }else{
      const postObject = {
        tables: 'administrators',
        values: {
          ESign: ref,
        },
        conditions: {
          WHERE: {
            ID: id,
          },
        },
      };
      return this.post('update_entry', {
        data: JSON.stringify(postObject),
      })
    }
  }

  uploadProfilePicture(file: string, name: string) {
    const base64String = (file as string).split(',')[1];
    return this.http.post(environment.nodeserver + '/filehandler', {
      key: environment.socketKey,
      method: 'create_url',
      file_content: base64String,
      search_key: `${environment.app}/${name}`,

    });
  }

  uploadCourseImage(file: string, name: string) {
    const base64String = (file as string).split(',')[1];  // Extract base64 content
    return this.http.post(environment.nodeserver + '/filehandler', {
      key: environment.socketKey,
      method: 'create_url',
      file_content: base64String,
      search_key: `${environment.app}/${name}`,
    });
  }




  textToSpeech(phrase: string, language: string) {
    var speaker = {
      voice: 'Joanna',
      language: 'en-US',
      engine: 'neutral',
    };
    switch (language) {
      case 'en':
        speaker = {
          voice: 'Joanna',
          language: 'en-US',
          engine: 'neural',
        };
        break;
      case 'fr':
        speaker = {
          voice: 'Celine',
          language: 'fr-FR',
          engine: 'standard',
        };
        break;
      case 'ja':
        speaker = {
          voice: 'Kazuha',
          language: 'ja-JP',
          engine: 'neural',
        };
        break;
    }
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': environment.ttskey,
      'X-RapidAPI-Host': environment.ttshost,
    });

    return this.http.post<any>(
      'https://' + environment.ttshost + '/synthesize-speech',
      JSON.stringify({
        sentence: phrase,
        language: speaker.language,
        voice: speaker.voice,
        engine: speaker.engine,
        withSpeechMarks: false,
      }),
      {
        headers: headers,
      }
    );
  }

  getUserAccountType() {
    const userData = this.getUserData();
    if (userData == null) {
      return null;
    }
    return userData.accountType;
  }

  getUserData(logout: boolean = false) {
    const userData = this.getCookie('user_info');
    if (userData == null && !logout) {
      this.logout();
      return null;
    }
    return JSON.parse(this.decryptData(userData!));
  }


  updateLocalUserData(userData: string) {
    const encryptedUserInfo = this.encryptData(userData);
    this.setCookie('user_info', encryptedUserInfo, 1/24);
    this.userData = this.getUserData();
  }






  useLocalStorage() {
    localStorage.setItem('storage', 'local');
  }

  useSessionStorage() {
    localStorage.setItem('storage', 'session');
  }

  isLocalStorage() {
    const storage = localStorage.getItem('storage');
    return storage == 'local';
  }

  isLoggedIn() {
    let loggedIn = this.getCookie('logged_in');
    return loggedIn != null;
  }

  getUserType() {
    let userType =this.getCookie('logged_in');
    return userType ? this.decryptData(userType) : undefined;
  }

  // startMeeting(uniqID:string, teacherID:string, meetingCode:string){
  //   var classID = this.usedStorage.getItem('classID');
  //   return this.post('start_meeting', {
  //     'ClassID': classID,
  //     'TeacherID': teacherID,
  //     'MeetingCode': meetingCode,
  //   });
  // }

  startMeeting(uniqID: string, teacherID: string, meetingCode: string) {
    var classID = this.usedStorage.getItem('classID');
    const postObject = {
      tables: 'meetings',
      values: {
        ID: uniqID,
        ClassID: classID,
        TeacherID: teacherID,
        MeetingCode: meetingCode,
      },
    };
    
    console.log('🔍 startMeeting called with:', { uniqID, teacherID, meetingCode, classID });
    
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response => {
        console.log('🔍 startMeeting response:', response);
        if (!response.success) {
          console.error('❌ startMeeting failed:', response);
        }
      })
    );
  }

  updateParticipantCount(sessionID: string, participants: number) {
    const postObject = {
      tables: 'meetings',
      values: {
        Participants: participants,
      },
      conditions: {
        WHERE: {
          ID: sessionID,
        },
      },
    };
    const observable$: Subscription = this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => observable$.unsubscribe());
  }

  studentUpdateAssignment(assignmentId: string, comments?: string, attachments?: string) {
    const id = this.getUserData().id;
    const postObject: any = {
      tables: 'student_assignments',
      values: {},
      conditions: {
        WHERE: {
          AssignmentID: assignmentId,
          StudentID: id
        }
      }
    };

    if (comments !== undefined) {
      postObject.values.Comments = comments;
    }

    if (attachments !== undefined) {
      postObject.values.Attachments = attachments;
    }

    return this.post('update_entry', {
      data: JSON.stringify(postObject)
    });
  }



  loadMeetingSessions() {
    const month = new Date().getMonth();
    const postObject = {
      selectors: [
        'classes.Class,meetings.*, teachers.FirstName, teachers.LastName',
      ],
      tables: 'meetings, teachers, classes',
      conditions: {
        WHERE: {
          'meetings.TeacherID': 'teachers.ID',
          'meetings.ClassID': 'classes.ID',
          'EXTRACT(MONTH FROM meetings.StartTime)': month + 1,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  loadWordSearches() {
    const postObject = {
      selectors: ['*'],
      tables: 'word_searches',
      conditions: {
        'WHERE FILE': 'IS NOT NULL',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  notifyParticipants(message: string) {
    const classID = this.usedStorage.getItem('classID');
    const postObject = {
      selectors: ['student_classes.StudentID as id'],
      tables: 'student_classes',
      conditions: {
        WHERE: {
          'student_classes.ClassID': classID,
        },
      },
    };
    this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).subscribe((data) => {
      if (data.success) {
        for (let student of data.output) {
          this.socketSend({
            to: student.id,
            message: message,
          });
        }
      } else {
        this.failedSnackbar('Error notifying participants');
      }
    });
  }

  getMeeting(studentID: string) {
    const classID = this.usedStorage.getItem('classID');

    const postObject = {
      selectors: ['meetings.*,courses.*'],
      tables: 'meetings, student_classes,classes,courses',
      conditions: {
        WHERE: {
          'courses.ID': 'classes.CourseID',
          'classes.ID': 'meetings.ClassID',
          'student_classes.ClassID': 'meetings.ClassID',
          'meetings.ClassID': classID,
          'student_classes.StudentID': studentID,
        },
        AND: 'meetings.EndTime IS NULL',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
    // return this.post('get_meeting', {
    //   'StudentID': studentID,
    //   'ClassID': classID,
    // });
  }

  endMeeting(teacherID: string) {
    return this.post('end_meeting', {
      TeacherID: teacherID,
    });
  }

  returnSuccess(data: any, errorMsg: string) {
    if (data.success) {
      return data.output;
    } else {
      this.failedSnackbar(errorMsg);
      return new Array<any>();
    }
  }

  private deleteCookie(name: string): void {
    const expires = new Date();
    expires.setTime(expires.getTime() - 1); // Set expiration to a past date
    const expiresString = `expires=${expires.toUTCString()}`;
    const cookieValue = `${name}=; ${expiresString}; path=/; secure; samesite=strict`;
    document.cookie = cookieValue; // Set the cookie with an expired date
  }

  logout() {
    if (!this.isLoggedIn()) {
      return;
    }
    const rememberMe = this.isLocalStorage();
    const user = this.getUserData(true);
    const email = user.email;
    this.deleteCookie('user_info');
    this.deleteCookie('logged_in');
    this.usedStorage.clear();
    if (rememberMe) {
      localStorage.setItem('remember', email);
      localStorage.setItem('storage', 'local');
    } else {
      localStorage.clear();
    }
    this.router.navigate(['/login']);
  }

  getSavedEmail() {
    const email = localStorage.getItem('remember');
    return email;
  }

  randomCourseCover(language: string) {
    var list: any = [];
    var folder: string = '';
    switch (language) {
      case 'english':
        list = [
          'english (1).jpg',
          'english (2).jpg',
          'english (3).jpg',
          'english (4).jpg',
          'english (5).jpg',
          'english (6).jpg',
          'english (7).jpg',
          'english (8).jpg',
        ];
        folder = 'english';
        break;
      case 'french':
        list = [
          'french (1).jpg',
          'french (2).jpg',
          'french (3).jpg',
          'french (4).jpg',
          'french (5).jpg',
        ];
        folder = 'french';
        break;
      case 'japanese':
        list = [
          'japanese (1).jpg',
          'japanese (4).jpg',
          'japanese (5).jpg',
          'japanese (6).jpg',
          'japanese (7).jpg',
          'japanese (8).jpg',
          'japanese (9).jpg',
        ];
        folder = 'japanese';
    }
    const random = Math.floor(Math.random() * list.length);
    return 'assets/coursecovers/' + folder + '/' + list[random];
  }

    openFile(file: string, attachmentId?: number) {
      const modalOptions: NgbModalOptions = {
        centered: false,
        size: 'lg',
        windowClass: 'viewer-window',
        // You can add other options here if needed
      };

      const modalRef = this.modalService.open(ViewerComponent, modalOptions);
      modalRef.componentInstance.link = environment.server +'/' + environment.app + '/' + file; // Pass the custom class name
      modalRef.componentInstance.attachmentId = attachmentId; // Pass the attachment ID for table of contents
      // console.log(environment.server + '/' + file);
    }


    openFileInteractive(file: string, type: string, timestamp: number = 0, quizID: string, deadline: Date, attachmentId?: number) {
      const modalOptions: NgbModalOptions = {
        centered: false,
        size: 'lg',
        windowClass: 'viewer-window',
      };

      const modalRef = this.modalService.open(ViewerComponent, modalOptions);
      modalRef.componentInstance.link = environment.server +'/'+ environment.app +'/' + file;
      modalRef.componentInstance.interactive = type === 'interactive'; // Determine if it is interactive
      modalRef.componentInstance.timestamp = timestamp; // Set the timestamp for interactive videos if needed
      modalRef.componentInstance.quizID = quizID; // Set the quizID for interactive videos
      modalRef.componentInstance.deadline = deadline; // Pass the deadline to the ViewerComponent
      modalRef.componentInstance.attachmentId = attachmentId; // Pass the attachment ID for table of contents

    }

  openLocalFile(file: string) {
    const modalOptions: NgbModalOptions = {
      centered: false,
      size: 'lg',
      windowClass: 'viewer-window',
      // You can add other options here if needed
    };

    const modalRef = this.modalService.open(ViewerComponent, modalOptions);
    modalRef.componentInstance.link = `${this.localServer}/${file}`; // Pass the custom class name
    // console.log(environment.server + '/' + file);
  }

  checkInputs(inputs: Array<any>) {
    for (let input of inputs) {
      if (input == '' || input == undefined || input == null) {
        return false;
      }
    }
    return true;
  }

  checkAtLeastOneInput(inputs: Array<any>) {
    for (let input of inputs) {
      if (input != '' && input != undefined && input != null) {
        return true;
      }
    }
    return false;
  }

  createTask(
    courseID: string,
    classID: string,
    title: string,
    description: string,
    deadline: string,
    attachments?: string,
    rubricId?: number | null,
    gradingMethod?: string,
    resubmitLimit?: number
  ) {
    console.log('🔍 createTask called with parameters:', {
      courseID,
      classID,
      title,
      description,
      deadline,
      attachments,
      rubricId,
      gradingMethod,
      resubmitLimit
    });

    // Validate required fields
    if (!courseID || !classID || !title || !description || !deadline) {
      console.error('❌ Missing required fields for assignment creation');
      throw new Error('Missing required fields for assignment creation');
    }

    // Validate and convert classID to integer
    const classIdNumber = parseInt(classID);
    if (isNaN(classIdNumber)) {
      console.error('❌ Invalid classID - cannot convert to integer:', classID);
      throw new Error('Invalid class ID - must be a valid number');
    }

    var attach = {};
    if (attachments != undefined) {
      attach = { attachments: attachments };  // Use lowercase 'attachments'
    }

    // Add rubric and grading fields
    var gradingFields = {};
    if (rubricId !== null && rubricId !== undefined) {
      gradingFields = { 
        rubric_id: rubricId,
        grading_method: gradingMethod || 'rubric',
        resubmit_limit: resubmitLimit || 1
      };
    } else {
      gradingFields = {
        grading_method: gradingMethod || 'traditional',
        resubmit_limit: resubmitLimit || 1
      };
    }

    console.log('📝 Grading fields:', gradingFields);

    const assignmentValues = {
      courseid: courseID,
      classid: classIdNumber,  // Ensure it's a number
      title: title,
      details: description,
      deadline: deadline,
      ...attach,
      ...gradingFields
    };

    console.log('💾 Final assignment values to be saved:', assignmentValues);

    console.log('💾 Final assignment values to be saved:', assignmentValues);

    const postObject = {
      tables: 'assignments',
      values: assignmentValues,
    };

    console.log('🚀 Sending POST request:', postObject);

    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap((response: any) => {
        console.log('📬 Assignment creation response:', response);
        if (response.success) {
          console.log('✅ Assignment created successfully!');
        } else {
          console.error('❌ Assignment creation failed:', response.output);
        }
      }),
      catchError((error: any) => {
        console.error('💥 Error during assignment creation:', error);
        return throwError(() => error);
      })
    );
  }

  // Method for editing a task
  editTask(
    taskId: string,
    title: string,
    description: string,
    deadline: string,
    attachments?: string,
    rubricId?: number | null,
    gradingMethod?: string,
    resubmitLimit?: number,
    taskType?: string,
    isAutoGraded?: boolean,
    allowRetake?: boolean,
    shuffleQuestions?: boolean,
    showResults?: string
  ) {
    var attach = {};
    if (attachments != undefined) {
      attach = { attachments: attachments };  // Use lowercase 'attachments'
    }

    // Add rubric and grading fields
    var gradingFields = {};
    if (rubricId !== null && rubricId !== undefined) {
      gradingFields = { 
        rubric_id: rubricId,
        grading_method: gradingMethod || 'rubric',
        resubmit_limit: resubmitLimit || 1
      };
    } else {
      gradingFields = {
        grading_method: gradingMethod || 'traditional',
        resubmit_limit: resubmitLimit || 1
      };
    }

    // Add test engine fields
    var testEngineFields = {};
    if (taskType) {
      testEngineFields = {
        task_type: taskType,
        is_auto_graded: isAutoGraded || false,
        allow_retake: allowRetake || false,
        shuffle_questions: shuffleQuestions || false,
        show_results: showResults || 'after_submission'
      };
    }

    const postObject = {
      tables: 'assignments',
      values: Object.assign(
        {},
        {
          title: title,
          details: description,
          deadline: deadline,
        },
        attach,
        gradingFields,
        testEngineFields
      ),
      conditions: {
        WHERE: {
          id: taskId,  // Use 'id' instead of 'ID'
        },
      },
    };

    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  // ===========================================
  // GRADING RUBRIC API METHODS
  // ===========================================

  /**
   * Get grading rubrics created by the current teacher
   */
  getTeacherRubrics() {
    const teacherId = this.getUserData().id;
    const postObject = {
      selectors: ['*'],
      tables: 'grading_rubrics',
      conditions: {
        WHERE: {
          created_by: teacherId,
          is_active: true
        },
        'ORDER BY': 'created_at DESC'
      }
    };
    
    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    });
  }

  // ===========================================
  // TEST ENGINE API METHODS
  // ===========================================

  /**
   * Create assessment items (questions) for tests/quizzes
   */
  createAssessmentItem(assessmentId: string, questionData: any) {
    const postObject = {
      tables: 'assessment_items',
      values: {
        assessmentid: assessmentId,
        question: questionData.question,
        type: questionData.type,
        answer: questionData.correct_answer,
        options: questionData.options,
        time_limit: questionData.time_limit || null
      }
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  /**
   * Get questions for an assignment/assessment
   */
  getAssignmentQuestions(assignmentId: string) {
    const postObject = {
      tables: 'assessment_items',
      conditions: {
        WHERE: {
          assessmentid: assignmentId
        },
        ORDER_BY: {
          id: 'ASC'
        }
      }
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  /**
   * Save test results for a student
   */
  saveTestResults(resultData: any) {
    const postObject = {
      tables: 'assessment_tasks_taken',
      values: {
        studentid: resultData.student_id,
        assessmentid: resultData.assignment_id,
        takenpoints: resultData.total_score,
        datetaken: new Date().toISOString()
      }
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  /**
   * Get student test results
   */
  getStudentTestResults(assignmentId: string, studentId: string) {
    const postObject = {
      tables: 'assessment_tasks_taken',
      conditions: {
        WHERE: {
          assessmentid: assignmentId,
          studentid: studentId
        },
        ORDER_BY: {
          datetaken: 'DESC'
        }
      }
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // Method for deleting a task
  teacherDeleteTask(taskId: string) {
    const postObject = {
      tables: 'assignments',
      conditions: {
        WHERE: {
          ID: taskId,
        },
      },
    };

    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }


  teacherGetTasks() {
   const id = this.getUserData().id;
  const postObject = {
    selectors: ['assignments.*', 'courses.course', 'classes.class as className'],
    tables: 'assignments, courses, classes',
    conditions: {
      WHERE: {
        'courses.id': 'assignments.courseid',
        'classes.id': 'assignments.classid',
        'courses.teacherid': id,
      },
    },
  };
  return this.post('get_entries', {
    data: JSON.stringify(postObject),
  });
}

  studentGetAssignments() {
    const id = this.getUserData().id;
    console.log('🔍 Student ID:', id);
    
    // Updated query to include submission count and resubmit limit
    const postObject = {
      selectors: [
        'assignments.*',
        'courses.course',
        'classes.class as classname',
        'classes.id as classid',
        'COUNT(student_assignments.id) as submission_count'
      ],
      tables: 'assignments',
      conditions: {
        'LEFT JOIN courses': 'ON assignments.courseid = courses.id',
        'LEFT JOIN classes': 'ON assignments.classid = classes.id',
        'LEFT JOIN student_classes': 'ON student_classes.classid = classes.id',
        'LEFT JOIN student_assignments': `ON student_assignments.assignmentid = assignments.id AND student_assignments.studentid = '${id}'`,
        WHERE: {
          'student_classes.studentid': id,
          'student_classes.pending': false,
        },
        'GROUP BY': 'assignments.id, courses.id, classes.id, student_classes.id'
      },
    };
    
    console.log('🚀 [API] studentGetAssignments query:', JSON.stringify(postObject, null, 2));
    
    const request = this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
    
    // Debug the response
    request.subscribe({
      next: (response: any) => {
        console.log('📊 [API] Assignment response received:', response);
        if (response && response.output) {
          console.log('📊 [API] Total assignments found:', response.output.length);
          console.log('📊 [API] First few assignments:', response.output.slice(0, 3));
        } else {
          console.log('❌ [API] No assignments found in response');
          console.log('❌ [API] Response structure:', Object.keys(response || {}));
        }
      },
      error: (error: any) => {
        console.error('❌ [API] Assignment query failed:', error);
      }
    });
    
    return request;
  }

  studentGetAssignmentByID(taskID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'assignments.*',
        'courses.course',
        'teachers.ID as teacherid, teachers.FirstName, teachers.LastName',
      ],
      tables: 'assignments,courses,teachers, classes, student_classes',
      conditions: {
        WHERE: {
          'teachers.ID': 'courses.TeacherID',
          'courses.ID': 'assignments.CourseID',
          'classes.CourseID': 'courses.ID',
          'student_classes.ClassID': 'classes.ID',
          'student_classes.StudentID': id,
          'assignments.ID': taskID,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherGetAssignment(taskID: string) {
    const postObject = {
      selectors: ['assignments.*'],
      tables: 'assignments',
      conditions: {
        WHERE: {
          ID: taskID,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  studentSubmitAssignment(
    assignID: string,
    comments?: string,
    attachments?: string
  ) {
    const id = this.getUserData().id;
    var attach = {};
    if (attachments != undefined) {
      attach = { attachments: attachments };
    }
    var comment = {};
    if (comments != undefined) {
      comment = { comments: comments };
    }

    const postObject = {
      tables: 'student_assignments',
      values: Object.assign(
        {},
        {
          assignmentid: assignID,
          studentid: id,
        },
        attach,
        comment
      ),
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }
  studentAssignSubmitted(assignID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['student_assignments.*'],
      tables: 'student_assignments',
      conditions: {
        WHERE: {
          'student_assignments.AssignmentID': assignID,
          'student_assignments.StudentID': id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }



  teacherGetStudentAssignment(subID: string) {
    const postObject = {
      selectors: ['student_assignments.*'],
      tables: 'student_assignments',
      conditions: {
        WHERE: {
          ID: subID,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherGetAllSubmissions() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'students.FirstName',
        'students.LastName',
        'assignments.title',
        'student_assignments.*',
      ],
      tables: 'students,student_assignments, assignments, courses',
      conditions: {
        WHERE: {
          'student_assignments.AssignmentID': 'assignments.ID',
          'student_assignments.StudentID': 'students.ID',
          'assignments.CourseID': 'courses.ID',
          'courses.TeacherID': id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }
  deleteQuizItem(itemId: string) {
    const postObject = {
      tables: 'assessment_items',
      conditions: {
        WHERE: {
          ID: itemId,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }


  createAudioFileWithId(
    id: number,
    audioFile: string
  ): Observable<any> {
    const postObject = {
      tables: 'audio_files',
      values: {
        id: id,
        audio_file: audioFile,
      }
    };

    console.log('Creating audio file with manual ID:', postObject);

    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response => {
        console.log('Create audio file response:', response);
      }),
      catchError(this.handleError)
    );
  }



  getAudioFiles(): Observable<any> {
    const postObject = {
      selectors: ['*'],
      tables: 'audio_files',
      conditions: {
        'ORDER BY': 'id DESC'
      }
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response => console.log('Get audio files response:', response)),
      catchError(this.handleError)
    );
  }


  getSpeechSentence() {
    const postObject = {
      selectors: ['*'],
      tables: 'speech_analyzer_items',
      conditions: {
        'ORDER BY': 'id DESC'
      }
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response=> console.log('Speech Analyzer Sentences:' ,response)),
      catchError(this.handleError)
    );
  }


  createSpeechSentence(
    id: number,
    classid: number,
    sentence_question: string,
  ): Observable<any>  {
    const postObject = {
      tables: 'speech_analyzer_items',
      values: {
        id,
        class_id: classid,
        sentence: sentence_question,
      },
    };

    console.log('Saving Speech Sentence', postObject);

    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response => console.log('Saved Speech sentence:',response)),
      catchError(this.handleError)
    );
  }




  createSpeechAnalyzerResult(
    audioId: number,
    fluency: number,
    pronunciation: number,
    intonation: number,
    grammar: number,
    vocabulary: number,
    areasForImprovement: string,
  ): Observable<any> {
    const postObject = {
      tables: 'result_speech_analyzer',
      values: {
        audio_id: audioId,
        fluency,
        pronunciation,
        intonation,
        grammar,
        vocabulary,
        areas_for_improvement: areasForImprovement,
      },
    };

    console.log('Creating speech analyzer result with data:', postObject);

    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response => console.log('Create speech analyzer result response:', response)),
      catchError(this.handleError)
    );
  }



  getSpeechAnalyzerResults(): Observable<any> {
    const postObject = {
      selectors: ['*'],
      tables: 'result_speech_analyzer',
      conditions: {
        'ORDER BY': 'id DESC'
      }
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).pipe(
      tap(response => console.log('Get speech analyzer results response:', response)),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(errorMessage);
  }

async checkPreTestStatus(courseId: string): Promise<boolean> {
  try {
    const postObject = {
      selectors: ['pretest'],
      tables: 'courses',
      conditions: {
        WHERE: {
          ID: courseId,
        },
      },
    };

    const response = await firstValueFrom(
      this.post('get_entries', {
        data: JSON.stringify(postObject),
      })
    );

    // Log the raw response for debugging
    console.log('Raw API Response for checkPreTestStatus:', response);

    // Extract pretest value and log it separately
    const pretestValue = response.success && response.output.length > 0 ? response.output[0].pretest : null;
    console.log('Extracted pretest value:', pretestValue);

    // Return true if pretest is 't', false otherwise
    return pretestValue === 't';
  } catch (error) {
    console.error('Error checking pre-test status:', error);
    this.failedSnackbar('Failed to check pre-test status.');
    return false; // Default to false on error
  }
}

  async checkPreTestExists(courseId: string): Promise<boolean> {
  try {
    const postObject = {
      selectors: ['*'],
      tables: 'assessments',
      conditions: {
        WHERE: {
          CourseID: courseId,
          pretest: true,
        },
      },
    };

    const response = await lastValueFrom(
      this.post('get_entries', {
        data: JSON.stringify(postObject),
      })
    );
    return response.success && response.output.length > 0;
  } catch (error) {
    console.error('Error checking pre-test:', error);
    this.failedSnackbar('Failed to check pre-test status.');
    return false;
  }
  }
  
  

//   createQuiz(
//   CourseID: string,
//   ID: string,
//   title: string,
//   details: string,
//   timelimit: number,
//   deadline: string,
//   attachments?: string,
//   settings?: string,
//   lessonid?: string,
//   topicid?: string,
//   classid?: string,
//   pretest: boolean = false
// ): Observable<any> {
//   // Default values for optional fields
//   const attach = attachments ? { Attachments: attachments } : {};
//   const det = details.trim() !== '' ? details : '[NONE]';
//   const sett = settings ? { Settings: settings } : {};

//   // Fetch the pretest value from the courses table
//   return this.post('select_entries', {
//     data: JSON.stringify({
//       tables: 'courses',
//       query: { id: CourseID },
//     }),
//   }).pipe(
//     switchMap((courseResponse: any[]) => {
//       if (!courseResponse.length) {
//         throw new Error('Course not found.');
//       }

//       const coursePreTest = courseResponse[0].pretest; // Get the pretest value from the course

//       // Validate pretest parameter against course setting
//       if (pretest !== undefined && pretest !== coursePreTest) {
//         throw new Error(`Pre-test setting must match course setting (course pretest is ${coursePreTest}).`);
//       }

//       // Use the course's pretest value if the input pretest doesn't match or is undefined
//       const assessmentPreTest = coursePreTest;

//       // Only check for existing pre-tests if the course allows pretests
//       if (assessmentPreTest) {
//         return this.post('select_entries', {
//           data: JSON.stringify({
//             tables: 'assessments',
//             query: {
//               CourseID: CourseID,
//               pretest: true,
//             },
//           }),
//         }).pipe(
//           switchMap((preTestResponse: any[]) => {
//             if (preTestResponse.length > 0) {
//               throw new Error('A pre-test already exists for this course.');
//             }

//             // Prepare the assessment data
//             const postObject = {
//               tables: 'assessments',
//               values: Object.assign(
//                 {},
//                 {
//                   CourseID,
//                   ID,
//                   Title: title,
//                   Details: det,
//                   Timelimit: timelimit,
//                   Deadline: deadline,
//                   lessonid: lessonid || '',
//                   topicid: topicid || '',
//                   classid: classid || '',
//                   pretest: assessmentPreTest,
//                 },
//                 attach,
//                 sett
//               ),
//             };

//             console.log('Request Payload:', postObject);

//             return this.post('create_entry', {
//               data: JSON.stringify(postObject),
//             }).pipe(
//               tap((response) => console.log('API Response:', response)),
//               catchError((error) => {
//                 console.error('API Error:', error);
//                 throw error;
//               })
//             );
//           })
//         );
//       } else {
//         // If course.pretest is false, force pretest to false
//         const postObject = {
//           tables: 'assessments',
//           values: Object.assign(
//             {},
//             {
//               CourseID,
//               ID,
//               Title: title,
//               Details: det,
//               Timelimit: timelimit,
//               Deadline: deadline,
//               lessonid: lessonid || '',
//               topicid: topicid || '',
//               classid: classid || '',
//               pretest: false,
//             },
//             attach,
//             sett
//           ),
//         };

//         console.log('Request Payload:', postObject);

//         return this.post('create_entry', {
//           data: JSON.stringify(postObject),
//         }).pipe(
//           tap((response) => console.log('API Response:', response)),
//           catchError((error) => {
//             console.error('API Error:', error);
//             throw error;
//           })
//         );
//       }
//     })
//   );
// }


// OVERWRITE the whole updateQuiz() with the block below
updateQuiz(
  _unusedCourseID: string,       // ← kept to preserve the call‑sites but now ignored
  ID: string,
  title: string,
  details: string,
  deadline: string,
  attachments?: string,
  settings?: string,
  lessonid?: string,
  topicid?: string,
  classid?: string,
  pretest: boolean = false,
  retakeLimit?: number
): Observable<any> {
  const attach = attachments ? { Attachments: attachments } : {}
  const det    = details.trim() !== '' ? details : '[NONE]'
  const sett   = settings ? { Settings: settings } : {}

  // 🔑  no course lookup – just update by assessments.id
 // corrected call inside updateQuiz()
return this.performUpdate(
  _unusedCourseID,   // ✅  satisfy the type checker; value is not looked at anymore
  ID,
  title,
  det,
  deadline,
  lessonid,
  topicid,
  classid,
  pretest,
  attach,
  sett,
  retakeLimit
).pipe(
  catchError(err =>
    throwError(() => new Error('Failed to update quiz: ' + (err.message || 'Unknown error')))
  )
)

}


// Helper method to perform the update
private performUpdate(
  CourseID: string,
  ID: string,
  title: string,
  details: string,
  deadline: string,
  lessonid: string | undefined,
  topicid: string | undefined,
  classid: string | undefined,
  pretest: boolean,
  attach: any,
  sett: any,
  retakeLimit?: number
): Observable<any> {
  const postObject = {
    tables: 'assessments',
    values: Object.assign(
      {},
      {
        CourseID,
        Title: title,
        Details: details,
        Deadline: deadline,
        lessonid: lessonid || '',
        topicid: topicid || '',
        classid: classid || '',
        pretest: pretest,
        retake_limit: retakeLimit || null,
      },
      attach,
      sett
    ),
    conditions: {
      WHERE: {
        ID: ID,
      },
    },
  };

  console.log('Update Request Payload:', postObject);

  return this.post('update_entry', {
    data: JSON.stringify(postObject),
  }).pipe(
    tap((response) => console.log('Update quiz response:', response)),
    catchError((error) => {
      console.error('Error in update:', error);
      throw error;
    })
  );
}
  
  
  // createQuiz(
  //   CourseID: string,
  //   ID: string,
  //   title: string,
  //   details: string,
  //   timelimit: number,
  //   deadline: string,
  //   attachments?: string,
  //   settings?: string,
  //   lessonid?: string,
  //   topicid?: string,
  //   classid?: string,
  //   pretest?: string
  // ) {
  //   var attach = {};
  //   if (attachments != undefined) {
  //     attach = { Attachments: attachments };
  //   }

  //   var det = '[NONE]';
  //   if (details.trim() != '') {
  //     det = details;
  //   }

  //   var sett = {};
  //   if (settings != undefined) {
  //     sett = { Settings: settings };
  //   }

  //   const postObject = {
  //     tables: 'assessments',
  //     values: Object.assign(
  //       {},
  //       {
  //         CourseID: CourseID,
  //         ID: ID,
  //         Title: title,
  //         Details: det,
  //         Timelimit: timelimit,
  //         Deadline: deadline,
  //         lessonid: lessonid,
  //         topicid: topicid,
  //         classid: classid,
  //         pretest: pretest
  //       },
  //       attach,
  //       sett
  //     ),
  //   };
  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }


  createQuiz(
  courseID: string,
  id: string,
  title: string,
  details: string,
  deadline: string,
  attachments?: string,
  settings?: string,
  lessonid?: string,
  topicid?: string,
  classid?: string,
  pretest?: boolean, 
  retakeLimit?: number
) {
  const postObject = {
    tables: 'assessments',
    values: {
      courseid: courseID, // Use lowercase to match DB schema
      id: id, // Ensure correct ID assignment
      title: title,
      details: details.trim() !== '' ? details : '[NONE]', // Ensure non-empty details
      deadline: deadline,
      attachments: attachments || null, // Store as null if undefined
      settings: settings || null, // Store as null if undefined
      lessonid: lessonid || null, // Allow null for pre-tests
      topicid: topicid || null,   // Allow null for pre-tests
      classid: classid || null,   // Allow null for pre-tests
      pretest: pretest ?? false, // Ensure boolean (defaults to false if undefined)
      retake_limit: retakeLimit || null // Fixed field name to match database schema
    },
  };

  console.log('Request Payload:', postObject);

  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  }).pipe(
    tap((response) => console.log('API Response:', response)),
    catchError((error) => {
      console.error('API Error:', error);
      throw error;
    })
  );
}

  
  //   updateQuiz(
  //   CourseID: string,
  //   ID: string,
  //   title: string,
  //   details: string,
  //   timelimit: number,
  //   deadline: string,
  //   attachments?: string,
  //   settings?: string,
  //   lessonid?: string,
  //   topicid?: string,
  //   classid?: string // Added classid parameter
  // ) {
  //   var attach = {};
  //   if (attachments != undefined) {
  //     attach = { Attachments: attachments };
  //   }

  //   var det = '[NONE]';
  //   if (details.trim() != '') {
  //     det = details;
  //   }

  //   var sett = {};
  //   if (settings != undefined) {
  //     sett = { Settings: settings };
  //   }

  //   const postObject = {
  //     tables: 'assessments',
  //     values: Object.assign(
  //       {},
  //       {
  //         CourseID: CourseID,
  //         Title: title,
  //         Details: det,
  //         Timelimit: timelimit,
  //         Deadline: deadline,
  //         lessonid: lessonid,
  //         topicid: topicid,
  //         classid: classid, // Include classid in the update
  //       },
  //       attach,
  //       sett
  //     ),
  //     conditions: {
  //       WHERE: {
  //         ID: ID,
  //       },
  //     },
  //   };

  //   return this.post('update_entry', {
  //     data: JSON.stringify(postObject),
  //   }).pipe(
  //     tap(response => console.log('Update quiz response:', response)),
  //     catchError(error => {
  //       console.error('Error updating quiz:', error);
  //       return throwError(() => new Error('Failed to update quiz. Please try again.'));
  //     })
  //   );
  // }

  
updateQuizItem(
  ID: string,
  type: string,
  question: string,
  answer: string,
  options?: string,
  timeLimit?: number // Add time limit parameter
) {
  var opt = {};
  if (options != undefined) {
    opt = { Options: options };
  }

  var timeLimitObj = {};
  if (timeLimit != undefined && timeLimit > 0) {
    timeLimitObj = { time_limit: timeLimit };
  }

  const postObject = {
    tables: 'assessment_items',
    values: Object.assign(
      {},
      {
        Question: question,
        Type: type,
        Answer: answer,
      },
      opt,
      timeLimitObj
    ),
    conditions: {
      WHERE: {
        ID: ID
      }
    }
  };
  
  return this.post('update_entry', {
    data: JSON.stringify(postObject),
  });
}


 createQuizItem(
  QuizID: string,
  type: string,
  question: string,
  answer: string,
  options?: string,
  timeLimit?: number // Add time limit parameter
) {
  var opt = {};
  if (options != undefined) {
    opt = { Options: options };
  }

  var timeLimitObj = {};
  if (timeLimit != undefined && timeLimit > 0) {
    timeLimitObj = { time_limit: timeLimit };
  }

  const postObject = {
    tables: 'assessment_items',
    values: Object.assign(
      {},
      {
        AssessmentID: QuizID,
        Question: question,
        Type: type,
        Answer: answer,
      },
      opt,
      timeLimitObj
    ),
  };
  
  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  });
}

  deleteLesson(lessonId: string): Observable<any> {
    const postObject = {
      tables: 'lessons',
      conditions: {
        WHERE: {
          ID: lessonId,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    }).pipe(
      map(response => {
        if (response.success) {
          return { success: true };
        } else {
          throw new Error('Failed to delete lesson');
        }
      }),
      catchError(error => {
        console.error('Error deleting lesson:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  deleteQuiz(quizID: string) {
    const postObject = {
      tables: 'assessments',
      conditions: {
        WHERE: {
          ID: quizID,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  teacherGetQuizzes(courseId?: string, classId?: string) {
    const id = this.getUserData().id;
    const postObject: any = {
      selectors: ['assessments.*', 'COUNT(assessment_items.ID) as items'],
      tables: 'assessments',
      conditions: {
        'LEFT JOIN courses': 'ON assessments.CourseID = courses.ID',
        'LEFT JOIN assessment_items': 'ON assessment_items.AssessmentID = assessments.ID',
        WHERE: {
          'courses.TeacherID': id,
        },
        'GROUP BY': 'assessments.ID',
      },
    };

    if (courseId) {
      postObject.conditions.WHERE['assessments.CourseID'] = courseId;
    }

    if (classId) {
      postObject.conditions.WHERE['assessments.classid'] = classId;
    }

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getQuizItemsWithTimeLimit(quizId: string): Observable<any> {
  const postObject = {
    selectors: [
      'assessment_items.*',
      'assessments.title as quiz_title'
    ],
    tables: 'assessment_items',
    conditions: {
      'LEFT JOIN assessments': 'ON assessment_items.assessmentid = assessments.id',
      WHERE: {
        'assessment_items.assessmentid': quizId,
      },
      'ORDER BY': 'assessment_items.id ASC'
    },
  };
  
  return this.post('get_entries', {
    data: JSON.stringify(postObject),
  });
}

calculateTotalQuizTime(quizId: string): Observable<any> {
  const postObject = {
    selectors: [
      'SUM(time_limit) as total_time',
      'COUNT(*) as question_count',
      'AVG(time_limit) as avg_time_per_question'
    ],
    tables: 'assessment_items',
    conditions: {
      WHERE: {
        assessmentid: quizId,
        'time_limit IS NOT': 'NULL'
      }
    }
  };
  
  return this.post('get_entries', {
    data: JSON.stringify(postObject),
  });
}

  teacherGetQuizItems(quizId:string){
    const postObject = {
      selectors: ['assessment_items.*'],
      tables: 'assessment_items',
      conditions: {
        WHERE: {
          'assessment_items.assessmentid': quizId,
        },

      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // studentGetQuizzes() {
  //   const id = this.getUserData().id;
  //   const postObject = {
  //     selectors: [
  //       'assessments.*',
  //       'courses.course',
  //       'languages.Language',
  //       'COUNT(student_assessments.ID) as done',
  //     ],
  //     tables: 'assessments',
  //     conditions: {
  //       'LEFT JOIN courses': 'ON assessments.CourseID = courses.ID',
  //       'LEFT JOIN languages': 'ON courses.LanguageID = languages.ID',
  //       'LEFT JOIN classes': 'ON classes.CourseID = courses.ID',
  //       'LEFT JOIN student_classes': 'ON student_classes.ClassID = classes.ID',
  //       'LEFT JOIN student_assessments': `ON student_assessments.StudentID = '${id}' AND student_assessments.AssessmentID = assessments.ID`,
  //       WHERE: {
  //         'student_classes.StudentID': id,
  //       },
  //       'GROUP BY':
  //         'assessments.ID, courses.ID, languages.ID,classes.ID, student_classes.ID',
  //     },
  //   };
  //   return this.post('get_entries', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  studentGetQuizzes() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'assessments.*',
        'courses.course',
        'languages.Language',
        'classes.class as classname',
        'classes.ID as classid',
        'COUNT(student_assessments.ID) as attempt_count',
        'assessments.retake_limit',
        'CASE WHEN COUNT(student_assessments.ID) > 0 THEN true ELSE false END as done',
      ],
      tables: 'assessments',
      conditions: {
        'LEFT JOIN courses': 'ON assessments.CourseID = courses.ID',
        'LEFT JOIN languages': 'ON courses.LanguageID = languages.ID',
        'LEFT JOIN classes': 'ON classes.ID = assessments.classid',
        'LEFT JOIN student_classes': `ON student_classes.ClassID = classes.ID AND student_classes.StudentID = '${id}'`,
        'LEFT JOIN student_assessments': `ON student_assessments.StudentID = '${id}' AND student_assessments.AssessmentID = assessments.ID`,
        WHERE: {
          'student_classes.StudentID': id,
        },
        'GROUP BY': 'assessments.ID, courses.ID, languages.ID, classes.ID',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }
  

  getFullName() {
    const user = this.getUserData();
    return user.firstname + ' ' + user.lastname;
  }

  teacherGradeTask(submissionID: string, grade: string, comment?: string) {
    const id = this.getUserData().id;
    var _comment: any = {};
    if (comment) {
      _comment = {
        Feedback: comment,
      };
    }
    const postObject = {
      tables: 'student_assignments',
      values: Object.assign(
        {
          Grade: grade,
        },
        _comment
      ),
      conditions: {
        WHERE: {
          ID: submissionID,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  studentQuizPoints() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['student_assessments.*'],
      tables: 'student_assessments',
      conditions: {
        WHERE: {
          'student_assessments.StudentID': id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  studentGetQuiz(taskID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'assessments.*',
        'assessment_items.*',
        'teachers.ID as teacherid',
      ],
      tables:
        'assessments,assessment_items,courses, classes,teachers ,student_classes',
      conditions: {
        WHERE: {
          'courses.TeacherID': 'teachers.ID',
          'courses.ID': 'assessments.CourseID',
          'assessment_items.AssessmentID': 'assessments.ID',
          'assessments.ID': taskID,
          'classes.CourseID': 'courses.ID',
          'student_classes.ClassID': 'classes.ID',
          'student_classes.StudentID': id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  escapeHtml(input: string) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  async pushCertificateNotification(studentId: string, courseName: string, courseId: string) {
    const title = `[CERT]Claim your certificate for '${courseName}'`;
    const message = `<b>${this.getFullName()}</b> has distributed the certificate for <b>'${courseName}'</b>. Complete the survey to claim your certificate.[COURSEID]${courseId}`;

    await this.pushNotifications(title, message, studentId);
  }

  async addSurveyEntryStudent(studentid: string, courseid: string) {
    const postObject = {
      tables: 'surveys',
      values: {
        StudentID: studentid,
        CourseID: courseid,
      },
    };

    await firstValueFrom(this.post('create_entry', {
      data: JSON.stringify(postObject),
    }));
  }

  pushNotifications(title: string, message: string, recipientID: string): Promise<void> {
    const id = this.getUserData()?.id;
    const postObject = {
      tables: 'notifications',
      values: {
        SenderID: id ?? 'Anonymous',
        RecipientID: recipientID,
        Title: title,
        Message: message,
        Status: 'not_seen',
      },
    };

    return new Promise((resolve, reject) => {
      this.post('create_entry', {
        data: JSON.stringify(postObject),
      }).subscribe({
        next: (data: any) => {
          this.socketSend({
            app: 'quanlab',
            type: 'notification',
            sender: this.getUserData() != null ?
              this.getUserData().firstname + ' ' + this.getUserData().lastname : 'Anonymous',
            from:  id ?? 'Anonymous',
            to: recipientID,
            title: title,
            message: title,
          });
          resolve();
        },
        error: (err) => {
          console.error('Error pushing notification:', err);
          reject(err);
        }
      });
    });
  }


  getNotifications() {
    var id = this.getUserData().id;
    if (this.getUserType() == '2') {
      id = '[--administrator--]';
    }
    const postObject = {
      selectors: ['*'],
      tables: 'notifications',
      conditions: {
        WHERE: {
          'notifications.RecipientID': id,
        },
        'ORDER BY': 'notifications.Timestamp DESC',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  markAllAsInbox() {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'notifications',
      values: {
        Status: 'inbox',
      },
      conditions: {
        WHERE: {
          RecipientID: id,
          Status: 'not_seen',
        },
      },
    };
    const obs$ = this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      obs$.unsubscribe();
    });
  }

  markAllAsRead() {
    var id = this.getUserData().id;
    if(this.getUserType()=='2'){
      id = '[--administrator--]';
    }
    const postObject = {
      tables: 'notifications',
      values: {
        Status: 'seen',
      },
      conditions: {
        WHERE: {
          RecipientID: id,
        },
      },
    };
    const obs$ = this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      obs$.unsubscribe();
    });
  }

  markAsRead(id: string) {
    const postObject = {
      tables: 'notifications',
      values: {
        Status: 'seen',
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    const obs$ = this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      obs$.unsubscribe();
    });
  }

  notifyStudentsInCourse(title: string, message: string, courseID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['student_classes.*'],
      tables: 'courses,classes, student_classes',
      conditions: {
        WHERE: {
          'courses.ID': courseID,
          'courses.TeacherID': id,
          'classes.CourseID': 'courses.ID',
          'classes.ID': 'student_classes.ClassID',
        },
      },
    };
    const obs$ = this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).subscribe((data) => {
      for (let student of data.output) {
        this.pushNotifications(title, message, student.studentid);
      }
      obs$.unsubscribe();
    });
  }

  notifyStudentsInClass(title: string, message: string, clsID?: string) {
    const classID = clsID ? clsID : this.usedStorage.getItem('classID');
    const postObject = {
      selectors: ['student_classes.StudentID as id'],
      tables: 'student_classes',
      conditions: {
        WHERE: {
          'student_classes.ClassID': classID,
        },
      },
    };
    const obs$ = this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).subscribe((data) => {
      // console.log(data);
      if (data.success) {
        for (let student of data.output) {
          this.pushNotifications(title, message, student.id);
        }
      } else {
        this.failedSnackbar('Error notifying participants');
      }
      obs$.unsubscribe();
    });
  }

  sendMessage(message: string, recipientID: string) {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'messages',
      values: {
        SenderID: id,
        RecipientID: recipientID,
        Message: message,
        Status: 'not_seen',
      },
    };

    const obs$ = this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).subscribe((data: any) => {
      this.socketSend({
        app: 'quanlab',
        type: 'messaging',
        sender:
          this.getUserData().firstname + ' ' + this.getUserData().lastname,
        from: id,
        to: recipientID,
        message: message,
      });
      obs$.unsubscribe();
    });
  }

  searchPeople(search: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'students.ID, students.FirstName, students.LastName, students.LastSeen, students.VisibleID, students.Profile',
        `'student' as type`,
      ],
      tables: 'students',
      conditions: {
        WHERE: {},
        "lower(concat(students.FirstName,' ',students.LastName))": `LIKE '%${search}%' AND students.ID != '${id}'`,
        'UNION ALL': `SELECT teachers.ID, teachers.FirstName, teachers.LastName, teachers.LastSeen, teachers.VisibleID, teachers.Profile, 'teacher' as type FROM teachers
            WHERE
              lower(concat(teachers.FirstName,' ',teachers.LastName)) LIKE '%${search}%'  AND teachers.ID != '${id}'`,
        'ORDER BY': `FirstName`,
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  searchStudentInQuiz(search: string, id: string) {
    const postObject = {
      selectors: [
        'students.ID, students.FirstName, students.LastName, students.LastSeen, students.VisibleID, students.Profile,TotalPoints, TakenPoints',
      ],
      tables: 'students, student_assessments',
      conditions: {
        WHERE: {
          'students.ID': 'student_assessments.StudentID',
          'student_assessments.AssessmentID': id,
        },
        "AND lower(concat(students.FirstName,' ',students.LastName))": `LIKE '%${search}%'`,
        'ORDER BY': `students.FirstName`,
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherGetStudentQuizzes() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'students.FirstName',
        'students.LastName',
        'assessments.title',
        'student_assessments.*',
      ],
      tables: 'students,student_assessments, assessments, courses',
      conditions: {
        WHERE: {
          'student_assessments.AssessmentID': 'assessments.ID',
          'student_assessments.StudentID': 'students.ID',
          'assessments.CourseID': 'courses.ID',
          'courses.TeacherID': id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  teacherGetLabQuizzes() {
    const postObject = {
      selectors: [
        'students.FirstName',
        'students.LastName',
        'speech_labs.Name as lab',
        'speech_lessons.Description as lesson',
        'speech_quizzes.*',
      ],
      tables:
        'students, speech_quizzes, speech_lessons, speech_lab_computers, speech_labs',
      conditions: {
        WHERE: {
          'speech_quizzes.LessonID': 'speech_lessons.ID',
          'speech_lab_computers.Address': 'students.VisibleID',
          'speech_labs.ID': 'speech_lab_computers.LabID',
          'students.ID': 'speech_quizzes.StudentID',
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  checkStudentLabAttempt() {
    const id = this.getUserData().id;
    const lessonID = this.currentLabLesson;
    const postObject = {
      selectors: [
        'speech_labs.Name as lab',
        'speech_lessons.Description as lesson',
        'speech_quizzes.*',
      ],
      tables:
        'students, speech_quizzes, speech_lessons, speech_lab_computers, speech_labs',
      conditions: {
        WHERE: {
          'speech_quizzes.LessonID': 'speech_lessons.ID',
          'speech_lab_computers.Address': 'students.VisibleID',
          'speech_labs.ID': 'speech_lab_computers.LabID',
          'students.ID': 'speech_quizzes.StudentID',
          'speech_lessons.ID': lessonID,
          'students.ID ': id,
        },
      },
    };
    console.log(postObject);
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getConversations() {
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'students.ID, students.FirstName, students.LastName, students.LastSeen, students.VisibleID, students.Profile',
        'MAX(timestamp) as timestamp',
      ],
      tables: 'students, messages',
      conditions: {
        WHERE: {
          'messages.RecipientID': id,
          'messages.SenderID': 'students.ID',
        },
        OR: `messages.SenderID = '${id}' AND messages.RecipientID = students.ID`,
        'GROUP BY': 'students.ID',
        'UNION ALL': `SELECT teachers.ID, teachers.FirstName, teachers.LastName, teachers.LastSeen, teachers.VisibleID, teachers.Profile
          , MAX(timestamp) as timestamp
           FROM teachers, messages
            WHERE
              messages.RecipientID = '${id}' AND messages.SenderID =teachers.ID
                OR
              messages.RecipientID = teachers.ID AND messages.SenderID = '${id}'
              GROUP BY teachers.ID
        `,
        'ORDER BY': 'timestamp DESC',
      },
    };
    const obs$ = this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).subscribe(async (data) => {
      const convos = [];
      for (let convo of data.output) {
        const otherID = convo.id;
        const message = await firstValueFrom(this.getLastMessage(otherID));
        const lastConvo = message.output[0];
        convo.lastmessageref = lastConvo;
        convo.lastmessage =
          lastConvo.senderid == id
            ? 'You: ' + lastConvo.message
            : lastConvo.message;
        // const last$ =  this.getLastMessage(otherID).subscribe(message=>{
        //   const lastConvo = message.output[0]
        //   convo.lastmessage = lastConvo.senderid == id ? 'You: ' + lastConvo.message : lastConvo.message;
        //   last$.unsubscribe();
        // })
        convo.lastseen = this.parseDateFromNow(convo.lastseen);
        convos.push(convo);
      }
      this.convos = convos;
      obs$.unsubscribe();
    });
  }

  getLastMessage(themID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['*'],
      tables: 'messages',
      conditions: {
        WHERE: {
          'messages.RecipientID': id,
          'messages.SenderID': themID,
        },
        OR: `messages.SenderID = '${id}' AND messages.RecipientID = '${themID}'`,
        'ORDER BY': 'timestamp DESC',
        LIMIT: '1',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  messsagesMarkAllAsRead(otherID: string) {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'messages',
      values: {
        Status: 'seen',
      },
      conditions: {
        WHERE: {
          RecipientID: id,
          SenderID: otherID,
        },
      },
    };
    const obs$ = this.post('update_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      obs$.unsubscribe();
    });
  }

  getMessages(themID: string) {
    const id = this.getUserData().id;
    const postObject = {
      selectors: ['*'],
      tables: 'messages',
      conditions: {
        WHERE: {
          'messages.RecipientID': id,
          'messages.SenderID': themID,
        },
        OR: `messages.SenderID = '${id}' AND messages.RecipientID = '${themID}'`,
        'ORDER BY': 'timestamp ASC',
      },
    };
    const obs$ = this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).subscribe((data) => {
      this.messsagesMarkAllAsRead(themID);
      this.messages = data.output;
      obs$.unsubscribe();
    });
  }

  async checkMaxRegistrations() {
    const postObject = {
      selectors: ['Value'],
      tables: 'admin_options',
      conditions: {
        WHERE: {
          Type: 'max_students',
        },
      },
    };
    const max = Number(
      (
        await firstValueFrom(
          this.post('get_entries', {
            data: JSON.stringify(postObject),
          })
        )
      ).output[0].value
    );

    const postObject2 = {
      selectors: ['COUNT(*) as value'],
      tables: 'students',
    };
    const count = Number(
      (
        await firstValueFrom(
          this.post('get_entries', {
            data: JSON.stringify(postObject2),
          })
        )
      ).output[0].value
    );

    return max > count;
  }

  deleteAccount(accountID: string, type: string) {
    const postObject = {
      tables: type,
      conditions: {
        WHERE: {
          ID: accountID,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  // sendBugReport(title:string, message:string, type:string){
  //   const name =  this.getFullName();
  //   const postObject = {
  //     tables: 'bug_reports',
  //     values: {
  //       Title: title,
  //       Description: message,
  //       type: type,
  //       Sender: name,
  //     },
  //   };
  //   return this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   });
  // }

  getQuizAverage(quizID: string) {
    const postObject = {
      selectors: ['(AVG(TakenPoints)/AVG(TotalPoints)) as average'],
      tables: 'student_assessments',
      conditions: {
        WHERE: {
          AssessmentID: quizID,
        },
        'GROUP BY': 'AssessmentID',
      },
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  async checkIfOffline(lessonID: string) {
    const postObject = {
      selectors: ['*'],
      tables: 'modules',
      conditions: {
        WHERE: {
          ID: lessonID,
        },
      },
    };

    const found = await firstValueFrom(
      this.localPost('get_entries', {
        data: JSON.stringify(postObject),
      })
    );

    return found.output.length;
  }

  getBaseAsync(file: Blob): Observable<string> {
    return new Observable((obs) => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        obs.next(base64String);
        obs.complete();
      };
      reader.readAsDataURL(file);
    });
  }

  // LOCAL SAVES
  public downloadProgress$: Subject<number> = new Subject<number>();
  downloadCourses() {
    if (this.getUserType() != '0') return;
    const id = this.getUserData().id;
    const postObject = {
      selectors: [
        'teachers.FirstName',
        'teachers.LastName',
        'courses.Course',
        'lessons.*',
      ],
      tables: 'teachers,courses,classes, student_classes,lessons',
      conditions: {
        WHERE: {
          'student_classes.StudentID': id,
          'classes.ID': 'student_classes.ClassID',
          'courses.ID': 'classes.CourseID',
          'courses.TeacherID': 'teachers.ID',
          'lessons.CourseID': 'courses.ID',
        },
      },
    };
    const download$ = this.post('get_entries', {
      data: JSON.stringify(postObject),
    }).subscribe(async (data) => {
      let i = 1;
      for (let module of data.output) {
        if (await this.checkIfOffline(module.id)) {
          this.downloadProgress$.next((i / data.output.length) * 100);
          i += 1;
          continue;
        }
        if (module.attachments) {
          const link = module.attachments.split('>')[0];
          const file = await firstValueFrom(
            this.http.get(this.getURL(link), { responseType: 'blob' })
          );
          // console.log(file);
          const base = await firstValueFrom(this.getBaseAsync(file));
          await firstValueFrom(
            this.http.post(`${this.localServer}:3000` + '/filehandler', {
              key: environment.socketKey,
              method: 'create_url',
              file_content: base,
              search_key:  environment.app+'/' + link,
            })
          );
          // const reader = new FileReader();

          // reader.onloadend = () => {
          //   const base64String = (reader.result as string).split(',')[1];

          // };
          // reader.readAsDataURL(file);
        }

        const postObject2 = {
          tables: 'modules',
          values: {
            StudentID: id,
            CourseID: module.courseid,
            Course: module.course,
            Title: module.title,
            Details: module.details,
            Attachments: module.attachments,
            Difficulty: Number(module.difficulty),
            Time: module.time,
            ID: Number(module.id),
          },
        };
        await firstValueFrom(
          this.localPost('create_entry', {
            data: JSON.stringify(postObject2),
          })
        );

        this.downloadProgress$.next((i / data.output.length) * 100);
        i += 1;
      }
      download$.unsubscribe();
    });
  }

  loadOffline() {
    const id = this.getUserData().id;
    var user = {};
    if (id) {
      user = {
        StudentID: id,
      };
    }
    const postObject = {
      selectors: ['modules.*'],
      tables: 'modules',
      conditions: {
        WHERE: Object.assign(
          {
            '1': '1',
          },
          user
        ),
      },
    };
    return this.localPost('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  async uploadFileAsync(file: File, location: string) {
    const base = await firstValueFrom(this.getBaseAsync(file));
    await firstValueFrom(
      this.http.post(environment.nodeserver + '/filehandler', {
        key: environment.socketKey,
        method: 'create_url',
        file_content: base,
        search_key: environment.app + '/' + location,
      })
    );
  }

  uploadJson(json: string, name: string) {
    const base64String = btoa(unescape(encodeURIComponent(json)));
    this.http
      .post(environment.nodeserver + '/filehandler', {
        key: environment.socketKey,
        method: 'create_url',
        file_content: base64String,
        search_key: environment.app + '/' + name,
      })
      .subscribe();
  }
  // SPEECH LAB

  /*
    TABLES
    DROP TABLE IF EXISTS speech_lessons;
    DROP TABLE IF EXISTS speech_modules;
    DROP TABLE IF EXISTS speech_lab_computers;
    DROP TABLE IF EXISTS speech_labs;

      CREATE TABLE speech_labs(
        Name varchar(255) NOT NULL,
        ID serial NOT NULL,
        Timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ID)
      );

      INSERT INTO speech_labs VALUES('Speech Lab 1');
      INSERT INTO speech_labs VALUES('Speech Lab 2');

      CREATE TABLE speech_modules(
        LabID int NOT NULL,
        Name varchar(255) NOT NULL,
        Timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ID varchar(32) NOT NULL,
        PRIMARY KEY (ID),
        FOREIGN KEY (LabID) REFERENCES speech_labs(ID) ON DELETE CASCADE
      );
      CREATE TABLE speech_lessons(
        ModuleID varchar(32) NOT NULL,
        Name varchar(255) NOT NULL,
        LessonFile varchar(255) NOT NULL,
        QuizFile varchar(255) NOT NULL,
        LessonType varchar(100) NOT NULL,
        Timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ID varchar(32) NOT NULL,
        PRIMARY KEY (ID),
        FOREIGN KEY (ModuleID) REFERENCES speech_modules(ID) ON DELETE CASCADE
      );

      CREATE TABLE speech_lab_computers(
        LabID int NOT NULL,
        Name varchar(255) NOT NULL,
        Address varchar(255) NOT NULL,
        Timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ID varchar(32) NOT NULL,
        PRIMARY KEY (ID),
        FOREIGN KEY (LabID) REFERENCES speech_labs(ID) ON DELETE CASCADE
      );
  */

  createSpeechModule(name: string, practice: boolean = false) {
    const id = this.createID32();
    const postObject = {
      tables: practice ? 'speech_practices' : 'speech_modules',
      values: {
        Name: name,
        ID: id,
      },
    };
    console.log(postObject);
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  editSpeechModule(id: string, name: string, practice: boolean = false) {
    const postObject = {
      tables: practice ? 'speech_practices' : 'speech_modules',
      values: {
        Name: name,
      },
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  deleteSpeechModule(id: string, practice: boolean = false) {
    const postObject = {
      tables: practice ? 'speech_practices' : 'speech_modules',
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  async createSpeechLesson(
    moduleID: string,
    name: string,
    description: string,
    lessonType: string,
    lessonFile?: File,
    jsonQuiz?: File,
    practice: boolean = false
  ) {
    var lessonDrillObj = {};
    var quizAudioObj = {};
    if (lessonFile) {
      const lessonFileExt = lessonFile.name.split('.').pop();
      const videoFileExtensions = [
        '.mp4',
        '.mov',
        '.avi',
        '.mkv',
        '.wmv',
        '.flv',
        '.webm',
        '.mpg',
        '.mpeg',
        '.3gp',
        '.m4v',
        '.ogv',
        '.ts',
        '.vob',
        '.swf',
        '.rm',
        '.rmvb',
        '.m2ts',
        '.asf',
        '.divx',
        '.m2v',
        '.mpg2',
        '.mpg4',
        '.mxf',
        '.f4v',
        '.h264',
        '.h265',
      ];

      if (
        lessonFileExt != 'pdf' &&
        !videoFileExtensions.includes(`.${lessonFileExt}`)
      ) {
        this.failedSnackbar(`Invalid ${practice ? 'Drill' : 'Lesson'} File!`);
        return;
      }

      const lessonDir = `modules/${this.createID36()}.${lessonFileExt}`;
      await this.uploadFileAsync(lessonFile, lessonDir);

      lessonDrillObj = practice
        ? { DrillFile: `${lessonDir}>${lessonFile.name}` }
        : { LessonFile: `${lessonDir}>${lessonFile.name}` };
    }

    if (jsonQuiz) {
      const quizFileExt = jsonQuiz.name.split('.').pop();
      if (practice ? quizFileExt != 'mp3' : quizFileExt != 'json') {
        this.failedSnackbar(`Invalid ${practice ? 'Audio' : 'JSON'} File!`);
        return;
      }
      const quizDir = `modules/${this.createID36()}.${quizFileExt}`;

      await this.uploadFileAsync(jsonQuiz, quizDir);

      quizAudioObj = practice
        ? { AudioFile: `${quizDir}>${jsonQuiz.name}` }
        : { QuizFile: `${quizDir}>${jsonQuiz.name}` };
    }

    const id = this.createID32();
    const postObject = {
      tables: practice ? 'speech_drills' : 'speech_lessons',
      values: Object.assign(
        {
          // Name: name,
          ID: id,
          Description: description,
        },
        lessonDrillObj,
        quizAudioObj,
        practice
          ? {
              PracticeID: moduleID,
            }
          : {
              ModuleID: moduleID,
              LessonType: lessonType,
            }
      ),
    };
    return await firstValueFrom(
      this.post('create_entry', {
        data: JSON.stringify(postObject),
      })
    );
  }

  async updateSpeechLesson(
    lessonID: string,
    moduleID: string,
    name: string,
    description: string,
    lessonType: string,
    lessonFile?: File,
    jsonQuiz?: File,
    practice: boolean = false
  ) {
    var lessonDrillObj = {};
    var quizAudioObj = {};
    if (lessonFile) {
      const lessonFileExt = lessonFile.name.split('.').pop();
      const videoFileExtensions = [
        '.mp4',
        '.mov',
        '.avi',
        '.mkv',
        '.wmv',
        '.flv',
        '.webm',
        '.mpg',
        '.mpeg',
        '.3gp',
        '.m4v',
        '.ogv',
        '.ts',
        '.vob',
        '.swf',
        '.rm',
        '.rmvb',
        '.m2ts',
        '.asf',
        '.divx',
        '.m2v',
        '.mpg2',
        '.mpg4',
        '.mxf',
        '.f4v',
        '.h264',
        '.h265',
      ];

      if (
        lessonFileExt != 'pdf' &&
        !videoFileExtensions.includes(`.${lessonFileExt}`)
      ) {
        this.failedSnackbar(`Invalid ${practice ? 'Drill' : 'Lesson'} File!`);
        return;
      }

      const lessonDir = `modules/${this.createID36()}.${lessonFileExt}`;
      await this.uploadFileAsync(lessonFile, lessonDir);

      lessonDrillObj = practice
        ? { DrillFile: `${lessonDir}>${lessonFile.name}` }
        : { LessonFile: `${lessonDir}>${lessonFile.name}` };
    }

    if (jsonQuiz) {
      const quizFileExt = jsonQuiz.name.split('.').pop();
      if (practice ? quizFileExt != 'mp3' : quizFileExt != 'json') {
        this.failedSnackbar(`Invalid ${practice ? 'Audio' : 'JSON'} File!`);
        return;
      }
      const quizDir = `modules/${this.createID36()}.${quizFileExt}`;

      await this.uploadFileAsync(jsonQuiz, quizDir);

      quizAudioObj = practice
        ? { AudioFile: `${quizDir}>${jsonQuiz.name}` }
        : { QuizFile: `${quizDir}>${jsonQuiz.name}` };
    }

    const postObject = {
      tables: practice ? 'speech_drills' : 'speech_lessons',
      values: Object.assign(
        {
          // Name: name,
          description: description,
        },
        lessonDrillObj,
        quizAudioObj,
        practice
          ? {
              PracticeID: moduleID,
            }
          : {
              ModuleID: moduleID,
              LessonType: lessonType,
            }
      ),
      conditions: {
        WHERE: {
          ID: lessonID,
        },
      },
    };
    console.log(postObject);
    return await firstValueFrom(
      this.post('update_entry', {
        data: JSON.stringify(postObject),
      })
    );
  }

  deleteSpeechLesson(id: string, practice: boolean = false) {
    const postObject = {
      tables: practice ? 'speech_drills' : 'speech_lessons',
      conditions: {
        WHERE: {
          ID: id,
        },
      },
    };
    return this.post('delete_entry', {
      data: JSON.stringify(postObject),
    });
  }

  loadSpeechLabs() {
    const postObject = {
      selectors: ['teachers.* ,classes.class as class, courses.id as course_id, courses.*,  speech_labs.*'],
      tables: 'speech_labs, classes, courses, teachers',
      conditions: {
        WHERE : {
          'speech_labs.class_id': 'classes.id',
          'classes.courseid' : 'courses.id',
          'teachers.id' : 'courses.teacherid',
        }
      }
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  loadSpeechAllModules(practice: boolean = false) {
    const postObject = {
      selectors: practice ? ['speech_practices.*'] : ['speech_modules.*'],
      tables: practice ? 'speech_practices' : 'speech_modules',
      conditions: {
        'ORDER BY': practice
          ? 'speech_practices.timestamp'
          : 'speech_modules.timestamp',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }
  loadSpeechLessons(moduleID: string, practice: boolean = false) {
    const postObject = {
      selectors: practice
        ? ['speech_drills.*, speech_practices.name as practice']
        : ['speech_lessons.*, speech_modules.name as module'],
      tables: practice
        ? 'speech_drills, speech_practices'
        : 'speech_lessons, speech_modules',
      conditions: {
        WHERE: practice
          ? {
              'speech_drills.PracticeID': moduleID,
              'speech_practices.ID': 'speech_drills.PracticeID',
            }
          : {
              'speech_lessons.ModuleID': moduleID,
              'speech_modules.ID': 'speech_lessons.ModuleID',
            },
        'ORDER BY': practice
          ? 'speech_drills.timestamp'
          : 'speech_lessons.timestamp',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  loadSpeechAllLessons(practice: boolean = false) {
    const postObject = {
      selectors: practice
        ? ['speech_drills.*, speech_practices.name as practice']
        : ['speech_lessons.*, speech_modules.name as module'],
      tables: practice
        ? 'speech_drills, speech_practices'
        : 'speech_lessons, speech_modules',
      conditions: {
        WHERE: practice
          ? {
              'speech_practices.ID': 'speech_drills.PracticeID',
            }
          : {
              'speech_modules.ID': 'speech_lessons.ModuleID',
            },
        'ORDER BY': practice
          ? 'speech_drills.timestamp'
          : 'speech_lessons.timestamp',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // Configurtion

  changeLocalAddress(ip_addr: string) {
    const postObject = {
      tables: 'admin_options',
      values: {
        Value: ip_addr,
      },
      conditions: {
        WHERE: {
          Type: 'local_server',
        },
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  async changePCAddress(speechLabId: string, pc: any) {
    if (pc.id != null) {
      const postObject = {
        tables: 'speech_lab_computers',
        values: {
          Address: pc.ip,
        },
        conditions: {
          WHERE: {
            ID: pc.id,
          },
        },
      };
      console.log(postObject);
      const obs$ = this.post('update_entry', {
        data: JSON.stringify(postObject),
      }).subscribe(() => {
        // this.successSnackbar('Successfully changed address!')
        obs$.unsubscribe();
      });
    } else {
      const postObject = {
        tables: 'speech_lab_computers',
        values: {
          Address: pc.ip,
          LabID: speechLabId,
          Name: pc.label,
          ID: this.createID32(),
        },
      };
      console.log(postObject);
      const obs$ = this.post('create_entry', {
        data: JSON.stringify(postObject),
      }).subscribe(() => {
        // this.successSnackbar('Successfully changed address!')
        obs$.unsubscribe();
      });
    }
  }

  loadComputerAddresses() {
    const postObject = {
      selectors: ['*'],
      tables: 'speech_lab_computers',
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // async loadComputers() {
  //   var row1: any[] = [];
  //   var row2: any[] = [];
  //   var row3: any[] = [];
  //   let pcIndex = 1;
  //   // iterate to row 3
  //   for (let i = 0; i < 13; i++) {
  //     row3.push({
  //       id: null,
  //       label: `PC-${pcIndex}`,
  //       ip: '',
  //       icon: 'assets/monitor.png',
  //     });
  //     pcIndex += 1;
  //   }
  //   for (let i = 0; i < 13; i++) {
  //     row2.push({
  //       id: null,
  //       label: `PC-${pcIndex}`,
  //       ip: '',
  //       icon: 'assets/monitor.png',
  //     });
  //     pcIndex += 1;
  //   }
  //   for (let i = 0; i < 14; i++) {
  //     row1.push({
  //       id: null,
  //       label: `PC-${pcIndex}`,
  //       ip: '',
  //       icon: 'assets/monitor.png',
  //     });
  //     pcIndex += 1;
  //   }
  //   return [row1, row2, row3];
  // }


  async loadComputers() {
    const rows: any[] = [];
    let pcIndex = 1;

    // Create 5 rows with 7 PCs each
    for (let i = 0; i < 5; i++) {
      const row: any[] = [];
      for (let j = 0; j < 7; j++) {
        row.push({
          id: null,
          label: `PC-${pcIndex}`,
          ip: '',
          icon: 'assets/monitor.png',
        });
        pcIndex += 1;
      }
      rows.push(row);
    }

    // Create the last row with 5 PCs
    const lastRow: any[] = [];
    for (let i = 0; i < 5; i++) {
      lastRow.push({
        id: null,
        label: `PC-${pcIndex}`,
        ip: '',
        icon: 'assets/monitor.png',
      });
      pcIndex += 1;
    }
    rows.push(lastRow);

    return rows;
  }



  labID?: string;
  getStudentAssignedLab() {
    const id = this.getUserData().visibleid;
    const postObject = {
      selectors: [
        'speech_labs.ID as labid, speech_labs.name as lab, speech_lab_computers.*',
      ],
      tables: 'speech_labs, speech_lab_computers',
      conditions: {
        WHERE: {
          'speech_lab_computers.Address': id,
        },
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  // speechlab meet

  meeting: any;
  meetingID?: string;
  isMicOn = false;

  async initSpeechMeeting() {
    VideoSDK.config(environment.token);
    this.meeting = VideoSDK.initMeeting({
      meetingId: this.meetingID!, // required
      participantId: this.getUserData().visibleid,
      name: this.getFullName(), // required
      metaData: { who: this.getUserType(), id : this.getUserData().id, },
      micEnabled: this.getUserType() == '0', // optional, default: true
      webcamEnabled: false, // optional, default: true
    });
  }

  startSpeechMeeting(
    uniqID: string,
    teacherID: string,
    meetingCode: string,
    lab: string
  ) {
    const postObject = {
      tables: 'lab_meetings',
      values: {
        ID: uniqID,
        LabID: lab,
        TeacherID: teacherID,
        MeetingCode: meetingCode,
      },
    };
    return this.post('create_entry', {
      data: JSON.stringify(postObject),
    });
  }

  sessionID?: string;

  getOpenLabMeeting(lab:string){
    const postObject = {
      selectors: ['lab_meetings.*, teachers.Firstname, teachers.LastName,  speech_labs.Name as lab'],
      tables: 'lab_meetings, teachers, speech_labs',
      conditions: {
        WHERE: {
          'speech_labs.ID' : 'lab_meetings.LabID',
          'lab_meetings.LabID': lab,
          'teachers.ID' : 'lab_meetings.teacherid'
        },
        AND: 'lab_meetings.EndTime IS NULL',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  getSpeechMeeting(studentID: string, lab: string) {
    const postObject = {
      selectors: ['lab_meetings.*'],
      tables: 'lab_meetings, speech_lab_computers, students',
      conditions: {
        WHERE: {
          'lab_meetings.LabID': 'speech_lab_computers.LabID',
          ' lab_meetings.LabID': lab,
          'speech_lab_computers.Address': 'students.VisibleID',
          'students.ID': studentID,
        },
        AND: 'lab_meetings.EndTime IS NULL',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }
  getTeacherMeeting() {
    const postObject = {
      selectors: ['lab_meetings.*'],
      tables: 'lab_meetings',
      conditions: {
        WHERE: {
          'lab_meetings.TeacherID': this.getUserData().id,
        },
        AND: 'lab_meetings.EndTime IS NULL',
      },
    };
    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  startLab(lab: string) {
    if (this.getUserType() == '0') {
      const obs = this.getSpeechMeeting(this.getUserData().id, lab).subscribe(
        (data) => {
          if (data.success) {
            if (data.output.length > 0) {
              this.validateSpeechMeeting(data.output[0].meetingcode);
            } else {
              this.failedSnackbar(
                'Please wait for your teacher to start.',
                2 + 1000
              );
            }
          }
          obs.unsubscribe();
        }
      );
    } else {
      const obs = this.endSpeechMeeting(this.getUserData().id).subscribe(() => {
        const obs2$ = this.getOpenLabMeeting(lab).subscribe(data=>{
          if(data.success){
            if(data.output.length > 0){
              this.failedSnackbar(`${data.output[0].firstname} ${data.output[0].lastname} is currently using ${data.output[0].lab}` )
            }else{
              this.createSpeechMeeting(lab);
            }
          }
          obs2$.unsubscribe();
        })
        obs.unsubscribe();
      });
    }
  }

  validateSpeechMeeting(meetingId: string) {
    const url = `https://api.videosdk.live/v2/rooms/validate/${meetingId}`;
    const headers = new HttpHeaders({
      authorization: environment.token,
      'Content-Type': 'application/json',
    });
    this.http
      .get<{ roomId: string }>(url, {
        headers,
      })
      .pipe(map((response) => response.roomId === meetingId))
      .subscribe(
        (isValid) => {
          if (isValid) {
            this.meetingID = meetingId;
            this.joinSpeechMeeting();
          } else {
            console.log('Room expired');
          }
        },
        (error) => {
          console.error('Failed to validate meeting:', error);
        }
      );
  }

  createSpeechMeeting(lab: string) {
    const apiUrl = 'https://api.videosdk.live/v2/rooms';
    const headers = new HttpHeaders({
      authorization: environment.token,
      'Content-Type': 'application/json',
    });
    this.http
      .post<{ roomId: string }>(apiUrl, {}, { headers })
      .pipe(map((response) => response.roomId))
      .subscribe(
        (roomid) => {
          this.meetingID = roomid;
          this.sessionID = this.createID32();
          this.startSpeechMeeting(
            this.sessionID,
            this.getUserData().id,
            this.meetingID,
            lab
          ).subscribe(
            (data) => {
              if (data.success) {
                // this.meetingHeader = `${this.API.meetingInfo.course} (${this.API.meetingInfo.class})`;
                // this.initSpeechMeeting();
                this.joinSpeechMeeting();
              }
            },
            (error) => {
              this.failedSnackbar(
                'Error while creating speech lab meet',
                2 + 1000
              );
            }
          );
        },
        (error) => {
          console.log(error);
        }
      );
  }

  joinSpeechMeeting() {
    this.initSpeechMeeting();
    // console.log('INIT',this.meeting);
    this.meeting.join();
    // console.log('Joined',this.meeting);
    this.handleMeetingEvents(this.meeting);
  }


  async distributeCertificates(courseid: string) {
    const postObject = {
      selectors: [
        'SUM(lessons_taken.Progress)',
        'COUNT(lessons.ID) as lessons',
        'courses.course',
        'student_classes.*',
        'COUNT(surveys.ID) as answered_survey'
      ],
      tables: 'courses',
      conditions: {
        'LEFT JOIN lessons': 'ON lessons.CourseID = courses.ID',
        'LEFT JOIN lessons_taken': 'ON lessons_taken.LessonID = lessons.ID',
        'LEFT JOIN classes': 'ON classes.CourseID = courses.ID',
        'LEFT JOIN student_classes' : 'ON student_classes.ClassID = classes.ID',
        'LEFT JOIN surveys' : 'ON surveys.StudentID = student_classes.StudentID',
        WHERE: {
          'courses.ID': courseid,
        },
        'GROUP BY': 'student_classes.ID, classes.ID, courses.ID',
      },
    };

    const response = await firstValueFrom(this.post('get_entries', {
      data: JSON.stringify(postObject),
    }));

    if(!response.success) {
      this.failedSnackbar('Error distributing certificates!');
      return;
    };

    for(let student of response.output){
      const progress = Number((Number(student.sum) / (Number(student.lessons) * 100)).toFixed(4))*100;
      if(progress >= 100){
        // Check if the student has already answered the survey
        if(student.answered_survey <= 0){
          // Add survey entry for students who haven't answered yet
          await this.addSurveyEntryStudent(student.studentid, courseid);
        }

        // Always send a notification, regardless of survey status
        await this.pushCertificateNotification(student.studentid, student.course, courseid);
      }
    }
  }

  // addSurveyEntryStudent(studentid:string, courseid:string){
  //   const postObject = {
  //     tables: 'surveys',
  //     values: {
  //       StudentID: studentid,
  //       CourseID: courseid,
  //     },
  //   };
  //   const record$ = this.post('create_entry', {
  //     data: JSON.stringify(postObject),
  //   }).subscribe(() => {
  //     record$.unsubscribe();
  //   });
  // }

 async getSurveyEntryStudent(courseid:string){
    const postObject = {
      selectors: ['*'],
      tables: 'courses,teachers,surveys',
      conditions: {
        WHERE:  {
          StudentID: this.getUserData().id,
          CourseID: courseid,
          'courses.ID': 'surveys.CourseID',
          'teachers.ID': 'courses.TeacherID',
        }
      },
    };
    return (await firstValueFrom( this.post('get_entries', {
      data: JSON.stringify(postObject),
    }))).output[0];
  }

  async getAnsweredSurveyStudent(courseid:string){
    const postObject = {
      selectors: ['*'],
      tables: 'surveys,survey_items',
      conditions: {
        WHERE:  {
          'surveys.StudentID':  this.getUserData().id,
          'surveys.CourseID':  courseid,
          'surveys.ID' : 'survey_items.SurveyID'
        }
      },
    };
    return (await firstValueFrom( this.post('get_entries', {
      data: JSON.stringify(postObject),
    }))).output;
  }


  async uploadSurveyStudent( surveyid:string, survey:any[]){
    this.justSnackbar("Uploading survey...");
    var i = 0;
    for(let item of survey){
      i+=1
      var options = ''
      if(item.options){
        for (let option of item.options) {
          if(typeof option === 'object'){
            options += option.value  + '\\n\\n';
          }else{
            options += option + '\\n\\n';
          }
        }
      }

      const postObject = {
        tables: 'survey_items',
        values: {
          SurveyID: surveyid,
          ItemNo: i,
          Question: item.question,
          Type: item.type,
          Answer: item.answer,
          Options: options,
        },
      };
      await firstValueFrom(this.post('create_entry', {
        data: JSON.stringify(postObject),
      }));
    }

    this.successSnackbar("Thank you for answer the survey!");
  }

  participantsAudio: Map<string, ParticipantObject> = new Map();
  // particpantID = this.getUserData().id;
  labMessages: Array<MessageObject> = [];

  micEnabled(stream: any, participant: any) {
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    if (stream?.kind == 'audio') {
      if (participant.metaData.who == '1') {
        this.isMicOn = true;
        this.micLoading = false;
      }
      if (participant.id != this.getUserData().visibleid) {
        const np = new ParticipantObject(participant.displayName, mediaStream);
        if (participant.metaData.who == '1') {
          np.muted = false;
        }
        this.participantsAudio.set(participant.id, np);
      }
    }
  }
  micDisabled(stream: any, participant: any) {
    if (stream?.kind == 'audio') {
      this.participantsAudio.delete(participant.id);
      this.isMicOn = false;
      this.micLoading = false;
    }
  }

  micLoading = false;

  async toggleMic() {
    if (this.micLoading) return;
    if (this.isMicOn) {
      this.meeting.muteMic();
    } else {
      this.meeting.unmuteMic();
      this.micLoading = true;
    }
  }

  getCNSCPresident(){
    const postObject = {
      selectors: ['*'],
      tables: 'administrators',
      conditions: {
        WHERE :  {
          Role: 'Principal',
        },
      }
    };

    return this.post('get_entries', {
      data: JSON.stringify(postObject),
    });
  }

  endSpeechMeeting(teacherID: string) {
    var tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = new Date(Date.now() - tzoffset).toISOString();
    var time = localISOTime.slice(0, 19).replace('T', ' ');
    const postObject = {
      tables: 'lab_meetings',
      values: {
        EndTime: time,
      },
      conditions: {
        WHERE: {
          TeacherID: teacherID,
        },
        'AND EndTime IS ': 'NULL',
      },
    };
    return this.post('update_entry', {
      data: JSON.stringify(postObject),
    });
  }

  resetUI() {
    this.participantsAudio.clear();
    this.meeting = null;
    this.labMessages = [];
  }

  async recordSpeechLabAttendance(id:string){
    const checkObject = {
      selectors: ['*'],
      tables: 'speech_attendance',
      conditions: {
        WHERE :  {
          StudentID: id,
          MeetingID: this.sessionID
        },
      }
    };

    const  data = await firstValueFrom(this.post('get_entries', {
      data: JSON.stringify(checkObject),
    }));

    if(data.output.length > 0) return;

    const postObject = {
      tables: 'speech_attendance',
      values: {
        StudentID: id,
        MeetingID: this.sessionID
      },
    };
    const res = await firstValueFrom(this.post('create_entry', {
      data: JSON.stringify(postObject),
    }));

    // console.log(res);
  }

  handleMeetingEvents(meeting: any) {
    meeting.on('error', (data: any) => {
      const { code, message } = data;
      console.log('Error', code, message);
    });
    // // meeting joined event
    meeting.on('meeting-joined', () => {
      this.micDisabled(undefined, meeting.localParticipant);
    });

    meeting.localParticipant.on('stream-enabled', (stream: any) => {
      this.micEnabled(stream, meeting.localParticipant);
    });
    meeting.localParticipant.on('stream-disabled', (stream: any) => {
      this.micDisabled(stream, meeting.localParticipant);
    });

    // meeting left event
    meeting.on('meeting-left', () => {
      this.resetUI();
      if (this.getUserType() == '1') {
        const obs = this.endSpeechMeeting(this.getUserData().id).subscribe(
          () => {
            obs.unsubscribe();
          }
        );
      }
    });

    meeting.on('participant-joined',  async (participant: any)  => {
      // On teacher side ..
      if(this.getUserType() == '1'){
        // Record attendance of students
        if(participant.metaData.who != '1'){
          this.recordSpeechLabAttendance(participant.metaData.id);
        }
      }

      this.micDisabled(undefined, participant);
      participant.setQuality('med');

      participant.on('stream-enabled', (stream: any) => {
        this.micEnabled(stream, participant);
      });
      participant.on('stream-disabled', (stream: any) => {
        this.micDisabled(stream, participant);
      });
    });

    // participants left
    meeting.on('participant-left', (participant: any) => {
      this.participantsAudio.delete(participant.id);
      if (participant.metaData.who == '1') {
        this.endSpeechMeeting(participant.id).subscribe();
        this.meeting.end();
        this.resetUI();
      }
    });
    meeting.on('chat-message', (participantMessage: any) => {
      const { __, _, text } = participantMessage;
      const data = JSON.parse(text);
      // console.log(data);

      if (data.type == 'message') {
        const now = new Date();
        const time = now.toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });
        this.labMessages.push(
          new MessageObject(
            data.senderID,
            data.senderName,
            data.message,
            time,
            data.profile
          )
        );
      } else if (data.type == 'direct-message') {
        if (data.to == this.getUserData().visibleid) {
          if (data.message != '') {
            this.successSnackbar(data.message);
          }
          if (data.action) {
            this.labNotifiier.next(data.action);
          }
          this.audio.play();
        }
      } else if (data.type == 'direct-action') {
        if (this.getUserData().visibleid == data.to) {
          this.labNotifiier.next(data.action);
        }
      } else if (data.type == 'reset') {
        if (this.getUserType() == '0' && this.labID == data.labid) {
          this.router.navigate(['/student/speechlab/lab']);
        }
      } else {
        // console.log(data.senderID ,this.getUserData().visibleid)
        if (data.action?.includes('select:')) {
          const content = data.action.split(':')[1];
          this.router.navigate([
            '/student/speechlab/practice1',
            { m: content.split(';')[0], q: content.split(';')[1] },
          ]);
          return;
        }
        if (
          data.senderID != this.getUserData().visibleid &&
          this.participantsAudio.get(data.senderID)
        ) {
          if (data.action == 'unmute') {
            const participant = this.participantsAudio.get(data.senderID);
            participant!.muted = false;
            this.participantsAudio.set(data.senderID, participant!);
            // console.log('Update',this.participantsAudio);
          }
          if (data.action == 'mute') {
            const participant = this.participantsAudio.get(data.senderID);
            participant!.muted = true;
            this.participantsAudio.set(data.senderID, participant!);
          }
          this.labNotifiier.next(data.action);
        }
      }
    });
  }
  labNotifiier = new BehaviorSubject<any>(null);

  sendLabMessage(message: string) {
    if (this.meeting == null) {
      return;
    }
    if (message.trim() != '') {
      this.meeting.sendChatMessage(
        JSON.stringify({
          senderID: this.getUserData().visibleid,
          senderName: this.getFullName(),
          message: message,
          profile: this.getUserData().profile,
          type: 'message',
        })
      );
    }
  }
  sendDirectLabMessage(message: string, destination: string, action: string) {
    if (this.meeting == null) {
      return;
    }
    // if(message.trim() != ''){
    this.meeting.sendChatMessage(
      JSON.stringify({
        senderID: this.getUserData().visibleid,
        senderName: this.getFullName(),
        message: message,
        profile: this.getUserData().profile,
        to: destination,
        action: action,
        type: 'direct-message',
      })
    );
    // }
  }

  sendLabAction(action: string) {
    this.meeting.sendChatMessage(
      JSON.stringify({
        senderID: this.getUserData().visibleid,
        senderName: this.getFullName(),
        profile: this.getUserData().profile,
        labid: this.labID,
        type: 'action',
        action: action,
      })
    );
  }

  resetStudents() {
    this.meeting.sendChatMessage(
      JSON.stringify({
        senderID: this.getUserData().visibleid,
        senderName: this.getFullName(),
        profile: this.getUserData().profile,
        labid: this.labID,
        type: 'reset',
      })
    );
  }

  sendDirectLabAction(action: string, destination: string) {
    this.meeting.sendChatMessage(
      JSON.stringify({
        senderID: this.getUserData().visibleid,
        senderName: this.getFullName(),
        profile: this.getUserData().profile,
        type: 'direct-action',
        to: destination,
        action: action,
      })
    );
  }

  leaveSpeechMeeting() {
    this.meeting?.leave();
    this.meeting = null;
    if (this.getUserType() == '1') {
      this.endSpeechMeeting(this.getUserData().id).subscribe();
    }
  }

  recordLabQuiz(lessonID: string, takenPoints: number, totalPoints: number) {
    const id = this.getUserData().id;
    const postObject = {
      tables: 'speech_quizzes',
      values: {
        StudentID: id,
        LessonID: lessonID,
        TakenPoints: takenPoints,
        TotalPoints: totalPoints,
      },
    };
    const record$ = this.post('create_entry', {
      data: JSON.stringify(postObject),
    }).subscribe(() => {
      record$.unsubscribe();
    });
  }

  currentLabLesson: string | boolean = false;

  chosenPCs: any = false;

  updateStudentApproval(studentId: string, approved: boolean) {
    // Make an API call to update the student's approval status
    // Replace the URL and method with your actual API endpoint
    return this.http.put(`/api/students/${studentId}/approval`, { approved });
  }

  updateTeacherApproval(teacherId: string, approved: boolean) {
    // Make an API call to update the teacher's approval status
    // Replace the URL and method with your actual API endpoint
    return this.http.put(`/api/teachers/${teacherId}/approval`, { approved });
  }

  groupMap = new Map<number, any[]>();
  rows:any[] = [];



  /* ───────────────── QUESTION BANK METHODS ───────────────── */

  getQuestionBank(teacherId: string, category?: string, type?: string): Observable<any> {
    // Most basic query structure possible
    const postObject: any = {
      selectors: ['*'],
      tables: 'question_bank',
      conditions: {
        WHERE: { 'created_by': teacherId }
      }
    };
  
    // Add category filter if specified
    if (category && category !== 'all') {
      postObject.conditions.WHERE.category = category;
    }
  
    // Add type filter if specified
    if (type && type !== 'all') {
      postObject.conditions.WHERE.type = type;
    }
  
    console.log('🔍 Basic Question Bank API Request:', {
      method: 'get_entries',
      teacherId: teacherId,
      postObject: postObject,
      jsonData: JSON.stringify(postObject)
    });
  
    return this.post('get_entries', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        console.log('🔍 Question Bank Response:', response);
      }),
      catchError((error: any) => {
        console.error('🔍 Question Bank API Error:', error);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Get question bank categories for a teacher
   */
    getQuestionBankCategories(teacherId: string): Observable<any> {
      const postObject = {
        selectors: ['DISTINCT category'], // Use DISTINCT to avoid duplicates
        tables: 'question_bank',
        conditions: {
          WHERE: { 'created_by': teacherId }
        }
      };
    
      return this.post('get_entries', {
        data: JSON.stringify(postObject)
      });
    }

    testQuestionBankInsert(): Observable<any> {
      const testData = {
        question: 'Test question',
        type: '2',
        answer: 'Test answer',
        created_by: this.getUserData().id
      };
    
      const postObject = {
        tables: 'question_bank',
        values: testData
      };
    
      console.log('Testing question_bank insert with:', postObject);
      
      // Try both methods
      return this.post('create_entry', postObject).pipe(
        catchError((error) => {
          console.log('create_entry failed, trying add_entry...');
          return this.post('add_entry', postObject);
        })
      );
    }
  
  /**
   * Save a question to the question bank
   */
 saveQuestionToBank(questionData: {
  question: string;
  type: string;
  answer: string;
  options?: string;
  category?: string;
  created_by: string;
  time_limit?: number; // Add time limit to question bank
}): Observable<any> {
  const postObject = {
    data: JSON.stringify({
      tables: 'question_bank',
      values: questionData
    })
  };

  console.log('Saving question to bank with:', postObject);
  
  return this.post('create_entry', postObject);
}
  
  /**
   * Update a question in the question bank
   */
  updateQuestionInBank(questionId: number, questionData: any): Observable<any> {
    console.log('🔄 API: Updating question with ID:', questionId);
    
    const teacherId = this.getUserData().id;
    
    const postObject = {
      tables: "question_bank",
      values: questionData,
      conditions: {
        WHERE: {
          id: questionId.toString(),
          created_by: teacherId
        }
      }
    };
    
    console.log('🔄 API: Update postObject:', postObject);
    
    // ✅ FIX: Wrap in 'data' field and stringify
    return this.post('update_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        console.log('🔄 API: Update response received:', response);
      }),
      catchError((error: any) => {
        console.error('🔄 API: Update error:', error);
        throw error;
      })
    );
  }
  
  /**
   * Delete a question from the question bank
   */
  deleteQuestionFromBank(questionId: number): Observable<any> {
    console.log('🗑️ API: Deleting question with ID:', questionId);
    const teacherId = this.getUserData().id;
    
    // ✅ FIX: Use the SAME format as your working getQuestionBank method
    const postObject = {
      tables: "question_bank",
      conditions: {
        WHERE: {
          id: questionId.toString(),
          created_by: teacherId
        }
      }
    };
    
    console.log('🗑️ API: Delete postObject:', postObject);
    
    // ✅ FIX: Wrap in 'data' field and stringify, just like getQuestionBank
    return this.post('delete_entry', {
      data: JSON.stringify(postObject)
    }).pipe(
      tap((response: any) => {
        console.log('🗑️ API: Delete response received:', response);
      }),
      catchError((error: any) => {
        console.error('��️ API: Delete error:', error);
        throw error;
      })
    );
  }
  
  /**
   * Get questions by IDs (for adding to quiz)
   */
    getQuestionsByIds(questionIds: number[]): Observable<any> {
      if (!questionIds.length) {
        return of({ success: true, output: [] });
      }
    
      // If only one question, use simple query
      if (questionIds.length === 1) {
        const postObject = {
          selectors: ['*'],
          tables: 'question_bank',
          conditions: {
            WHERE: { 'id': questionIds[0] }
          }
        };
    
        return this.post('get_entries', {
          data: JSON.stringify(postObject)
        });
      }
    
      // For multiple questions, get all questions and filter in frontend
      const postObject = {
        selectors: ['*'],
        tables: 'question_bank',
        conditions: {
          WHERE: { 'created_by': this.getUserData().id }
        }
      };
    
      console.log('🔍 Getting all questions to filter by IDs:', {
        questionIds: questionIds,
        postObject: postObject
      });
    
      return this.post('get_entries', {
        data: JSON.stringify(postObject)
      }).pipe(
        map((response: any) => {
          if (response.success) {
            // Filter the questions by the requested IDs
            const filteredQuestions = response.output.filter((q: any) => 
              questionIds.includes(q.id)
            );
            console.log('�� Filtered questions:', {
              requested: questionIds,
              found: filteredQuestions.map((q: any) => q.id),
              total: response.output.length
            });
            return {
              success: true,
              output: filteredQuestions
            };
          }
          return response;
        }),
        tap((response: any) => {
          console.log('🔍 Questions by IDs Response (filtered):', response);
        }),
        catchError((error: any) => {
          console.error('🔍 Questions by IDs API Error:', error);
          return throwError(() => error);
        })
      );
    }


    saveCourseEvaluation(evaluationData: {
      course_id: string;
      student_id: string;
      overall_rating: number;
      content_quality: number;
      difficulty: number;
      materials: number;
      strengths?: string;
      improvements?: string;
      additional_feedback?: string;
      recommend?: boolean;
    }): Observable<any> {
      const postObject = {
        tables: 'course_evaluations',
        values: {
          id: this.createID32(),
          course_id: evaluationData.course_id,
          student_id: evaluationData.student_id,
          overall_rating: evaluationData.overall_rating,
          content_quality: evaluationData.content_quality,
          difficulty: evaluationData.difficulty,
          materials: evaluationData.materials,
          strengths: evaluationData.strengths || '',
          improvements: evaluationData.improvements || '',
          additional_feedback: evaluationData.additional_feedback || '',
          recommend: evaluationData.recommend || true,
          submitted_at: new Date().toISOString(),
          status: 'pending'
        }
      };
    
      return this.post('create_entry', {
        data: JSON.stringify(postObject)
      });
    }
    
    saveTeacherEvaluation(evaluationData: {
      teacher_id: string;
      student_id: string;
      overall_rating: number;
      communication: number;
      knowledge: number;
      teaching_style: number;
      strengths?: string;
      improvements?: string;
      additional_feedback?: string;
      recommend?: boolean;
    }): Observable<any> {
      const postObject = {
        tables: 'teacher_evaluations',
        values: {
          id: this.createID32(),
          teacher_id: evaluationData.teacher_id,
          student_id: evaluationData.student_id,
          overall_rating: evaluationData.overall_rating,
          communication: evaluationData.communication,
          knowledge: evaluationData.knowledge,
          teaching_style: evaluationData.teaching_style,
          strengths: evaluationData.strengths || '',
          improvements: evaluationData.improvements || '',
          additional_feedback: evaluationData.additional_feedback || '',
          recommend: evaluationData.recommend || false,
          submitted_at: new Date().toISOString(),
          status: 'pending'
        }
      };
    
      return this.post('create_entry', {
        data: JSON.stringify(postObject)
      });
    }

    checkIfAlreadyEvaluated(courseId: string, studentId: string): Observable<any> {
      const postObject = {
        selectors: ['id'],
        tables: 'course_evaluations',
        conditions: {
          WHERE: {
            course_id: courseId,
            student_id: studentId
          }
        }
      };
    
      return this.post('get_entries', {
        data: JSON.stringify(postObject)
      });
    }

    checkIfTeacherAlreadyEvaluated(teacherId: string, studentId: string): Observable<any> {
      const postObject = {
        selectors: ['id'],
        tables: 'teacher_evaluations',
        conditions: {
          WHERE: {
            teacher_id: teacherId,
            student_id: studentId
          }
        }
      };
    
      return this.post('get_entries', {
        data: JSON.stringify(postObject)
      });
    }

    logTeacherMeetingActivity(teacherId: string, meetingId: string, activityType: string): Observable<any> {
      // We can use the existing meeting structure or create a simple log
      const logData = {
        teacher_id: teacherId,
        meeting_id: meetingId,
        activity_type: activityType,
        timestamp: new Date().toISOString()
      };
      
      return this.post('logTeacherMeetingActivity', logData);
    }

    getSpeechAttendance(): Observable<any> {
      const postObject = {
        selectors: ['*'],
        tables: 'speech_attendance',
        conditions: {}
      };
      
      console.log('🔍 getSpeechAttendance called with:', postObject);
      
      return this.post('get_entries', {
        data: JSON.stringify(postObject)
      });
    }

    saveTeacherMeeting(meetingData: any): Observable<any> {
      const postObject = {
        tables: 'lab_meetings',
        values: {
          id: meetingData.id,
          labid: meetingData.labid,
          teacherid: meetingData.teacherid,
          meetingcode: meetingData.meetingcode,
          participants: meetingData.participants,
          starttime: meetingData.starttime
        }
      };
      
      return this.post('create_entry', {
        data: JSON.stringify(postObject)
      });
    }

    
}


// class VideoSDK {
//   static initMeeting(options:any) {
//     return new WebRTCMeeting(options);
//   }
// }

// class WebRTCMeeting {
//   meetingId:any;
//   participantId:any;
//   name:any;
//   metaData:any;
//   micEnabled:any;
//   webcamEnabled:any;
//   peerConnection:any
//   constructor({ meetingId = null, participantId = null, name = null, metaData = {}, micEnabled = true, webcamEnabled = true }) {
//     this.meetingId = meetingId;
//     this.participantId = participantId;
//     this.name = name;
//     this.metaData = metaData;
//     this.micEnabled = micEnabled;
//     this.webcamEnabled = webcamEnabled;
//     this.peerConnection = null;
//     this.startMeeting();
//   }

//   async startMeeting() {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: this.micEnabled, video: this.webcamEnabled });
//       this.createPeerConnection(stream);
//       console.log('Meeting started with metadata:', this.metaData);
//     } catch (error) {
//       console.error('Error starting meeting:', error);
//     }
//   }

//   createPeerConnection(stream:any) {
//     const configuration = {
//       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Example STUN server
//     };
//     this.peerConnection = new RTCPeerConnection(configuration);
//     stream.getTracks().forEach((track:any )=> this.peerConnection.addTrack(track, stream));
//   }

//   endMeeting() {
//     // Implement cleanup logic if needed
//     this.peerConnection.close();
//     console.log('Meeting ended');
//   }
// }


function suspendedValue(flag: boolean) {
  const v: any = {};
  v['"isSuspended"'] = flag;          // <- keep the exact case with quotes
  return v;
}


/* ───────────────── helpers ───────────────── */
function toBool(v: any): boolean {
  if (v === true)  return true;
  if (v === false) return false;

  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string')
    return ['1', 'true', 't', 'yes', 'y'].includes(v.toLowerCase());

  return false;
}








