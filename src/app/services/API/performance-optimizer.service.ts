import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, timeout, retry, debounceTime, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceOptimizerService {
  private cache = new Map<string, CacheItem>();
  private loadingStates = new Map<string, BehaviorSubject<boolean>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRIES = 2;

  constructor(private http: HttpClient) {}

  /**
   * Optimized POST request with caching, timeout, and retry logic
   */
  optimizedPost(method: string, body: any, options?: {
    cache?: boolean;
    cacheKey?: string;
    timeout?: number;
    retries?: number;
  }): Observable<any> {
    const config = {
      cache: false,
      cacheKey: '',
      timeout: this.REQUEST_TIMEOUT,
      retries: this.MAX_RETRIES,
      ...options
    };

    const cacheKey = config.cacheKey || `${method}_${JSON.stringify(body)}`;

    // Check cache first
    if (config.cache && this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    // Check if request is already in progress
    if (this.loadingStates.has(cacheKey)) {
      return this.loadingStates.get(cacheKey)!.asObservable().pipe(
        debounceTime(100),
        shareReplay(1)
      );
    }

    // Create loading state
    const loadingSubject = new BehaviorSubject<boolean>(true);
    this.loadingStates.set(cacheKey, loadingSubject);

    const headers = new HttpHeaders({
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
    });

    const salt = new Date().getTime();
    const requestBody = this.sanitizeBody(body);

    return this.http.post<any>(
      `${environment.api}?${salt}`,
      JSON.stringify({
        API_KEY: environment.apiKey,
        Method: method,
        App: environment.app,
        ...requestBody
      }),
      { headers }
    ).pipe(
      timeout(config.timeout),
      retry(config.retries),
      tap(response => {
        // Cache successful responses
        if (config.cache && response.success) {
          this.setCache(cacheKey, response);
        }
        // Clear loading state
        this.loadingStates.delete(cacheKey);
        loadingSubject.complete();
      }),
      catchError((error: HttpErrorResponse) => {
        // Clear loading state
        this.loadingStates.delete(cacheKey);
        loadingSubject.complete();
        return this.handleError(error, method);
      }),
      shareReplay(1)
    );
  }

  /**
   * Optimized query builder for common database operations
   */
  buildOptimizedQuery(config: {
    selectors: string[];
    tables: string;
    conditions?: any;
    joins?: Array<{type: string, table: string, on: string}>;
    groupBy?: string[];
    orderBy?: string;
    limit?: number;
  }): any {
    const query: any = {
      selectors: config.selectors,
      tables: config.tables
    };

    if (config.conditions) {
      query.conditions = config.conditions;
    }

    // Optimize JOINs - use INNER JOIN where possible
    if (config.joins) {
      config.joins.forEach(join => {
        query.conditions = query.conditions || {};
        query.conditions[`${join.type} ${join.table}`] = join.on;
      });
    }

    if (config.groupBy?.length) {
      query.conditions = query.conditions || {};
      query.conditions['GROUP BY'] = config.groupBy.join(', ');
    }

    if (config.orderBy) {
      query.conditions = query.conditions || {};
      query.conditions['ORDER BY'] = config.orderBy;
    }

    if (config.limit) {
      query.conditions = query.conditions || {};
      query.conditions['LIMIT'] = config.limit;
    }

    return query;
  }

  /**
   * Optimized courses query with pagination and caching
   */
  getCoursesOptimized(userId: string, options?: {
    limit?: number;
    filter?: string;
    page?: number;
  }): Observable<any> {
    const config = {
      limit: 20,
      page: 1,
      ...options
    };

    const offset = (config.page - 1) * config.limit;
    const cacheKey = `courses_${userId}_${JSON.stringify(config)}`;

    const query = this.buildOptimizedQuery({
      selectors: [
        'courses.ID',
        'courses.course',
        'courses.details',
        'teachers.FirstName',
        'teachers.LastName',
        'languages.Language',
        'COUNT(DISTINCT lessons.ID) as lessoncount',
        'COUNT(DISTINCT student_classes.StudentID) as enrolled'
      ],
      tables: 'courses',
      joins: [
        { type: 'INNER JOIN', table: 'teachers', on: 'teachers.ID = courses.TeacherID' },
        { type: 'LEFT JOIN', table: 'languages', on: 'languages.ID = courses.LanguageID' },
        { type: 'LEFT JOIN', table: 'lessons', on: 'lessons.CourseID = courses.ID' },
        { type: 'LEFT JOIN', table: 'classes', on: 'classes.CourseID = courses.ID' },
        { type: 'LEFT JOIN', table: 'student_classes', on: `student_classes.ClassID = classes.ID` }
      ],
      groupBy: ['courses.ID', 'teachers.ID', 'languages.ID'],
      orderBy: 'courses.course ASC',
      limit: config.limit
    });

    if (config.filter) {
      query.conditions = query.conditions || {};
      query.conditions.WHERE = {
        ...query.conditions.WHERE,
        'courses.LanguageID': config.filter
      };
    }

    return this.optimizedPost('get_entries', { data: JSON.stringify(query) }, {
      cache: true,
      cacheKey,
      timeout: 10000
    });
  }

  /**
   * Optimized lessons query with minimal data
   */
  getLessonsOptimized(userId: string, courseId: string): Observable<any> {
    const cacheKey = `lessons_${userId}_${courseId}`;

    const query = this.buildOptimizedQuery({
      selectors: [
        'lessons.ID',
        'lessons.title',
        'lessons.difficulty',
        'lessons_taken.Progress'
      ],
      tables: 'lessons',
      joins: [
        { 
          type: 'LEFT JOIN', 
          table: 'lessons_taken', 
          on: `lessons_taken.LessonID = lessons.ID AND lessons_taken.StudentID = '${userId}'` 
        }
      ],
      conditions: {
        WHERE: {
          'lessons.CourseID': courseId
        }
      },
      orderBy: 'lessons.sequence ASC'
    });

    return this.optimizedPost('get_entries', { data: JSON.stringify(query) }, {
      cache: true,
      cacheKey,
      timeout: 8000
    });
  }

  /**
   * Cache management methods
   */
  private isCacheValid(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    return Date.now() < item.timestamp + item.expiry;
  }

  private setCache(key: string, data: any, customExpiry?: number): void {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      expiry: customExpiry || this.CACHE_DURATION
    };
    this.cache.set(key, item);
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Body sanitization
   */
  private sanitizeBody(body: any): any {
    try {
      const bodyObject = JSON.parse(body.data);
      
      // Remove null/undefined/empty values
      if (bodyObject.values) {
        for (const [field, value] of Object.entries(bodyObject.values)) {
          if (value === null || value === undefined || value === '') {
            delete bodyObject.values[field];
          }
        }
      }
      
      return { data: JSON.stringify(bodyObject) };
    } catch (error) {
      return body;
    }
  }

  /**
   * Enhanced error handling
   */
  private handleError(error: HttpErrorResponse, method: string): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      
      // Log specific method that failed
      console.error(`API Error in ${method}:`, {
        status: error.status,
        message: error.message,
        url: error.url
      });
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Health check for backend connectivity
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${environment.api.replace('/api.php', '')}/health`, {
      timeout: 5000
    }).pipe(
      catchError(error => {
        console.warn('Backend health check failed:', error);
        return of({ status: 'unhealthy', error: error.message });
      })
    );
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
