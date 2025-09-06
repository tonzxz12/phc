import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import Chart.js
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);


interface StatsData {
  totalStudents: number;
  activeCourses: number;
  totalClasses: number;
  totalAssessments: number;
  newAssessments: number;
  studentsGrowth?: number;
  newCourses?: number;
  classesGrowth?: number;
}
@Component({
  selector: 'app-thome',
  templateUrl: './thome.component.html',
  styleUrls: ['./thome.component.css']
})
export class ThomeComponent implements OnInit, AfterViewInit, OnDestroy {
  // Subject for handling unsubscriptions
  private destroy$ = new Subject<void>();

  // Loading state flags
  loadingCourses = true;
  loadingClasses = true;
  loadingSelectedCourseClasses = false;
  
  // Month array for the calendar
  month_names: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Stats summary data
  statsData: StatsData = {
    totalStudents: 0,
    activeCourses: 0,
    totalClasses: 0,
    totalAssessments: 0,
    newAssessments: 0,
    studentsGrowth: 0,
    newCourses: 0,
    classesGrowth: 0
  };

  // Chart references
  enrollmentChart: Chart | undefined;
  classesChart: Chart | undefined;

  // Date trackers for the calendar
  currentDate: Date = new Date();
  currentMonth: { value: number } = { value: this.currentDate.getMonth() };
  currentYear: { value: number } = { value: this.currentDate.getFullYear() };

  // Data from your APIs
  courses: any[] = [];
  classes: any[] = [];

  // For toggling between "All Courses" vs. "Selected Course" classes
  selectedCourse: any = null;
  selectedCourseClasses: any[] = [];

  // DOM references for date/time display
  todayShowDate: string;
  todayShowTime: string;
  timeInterval: any;

  constructor(private router: Router, private API: APIService) {
    // Format current date
    const currshowDate = new Date();
    const showCurrentDateOption: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };

    this.todayShowDate = new Intl.DateTimeFormat(
      'en-US',
      showCurrentDateOption
    ).format(currshowDate);

    // Initial time setting
    const timeOption: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    };
    this.todayShowTime = new Intl.DateTimeFormat('en-us', timeOption).format(new Date());
  }

  ngOnInit(): void {
    // Start the clock
    this.startClock();
    
    // Load data using forkJoin for parallel requests
    this.loadDashboardData();
    this.loadAssessmentStats();

  }

  

  startClock(): void {
    this.timeInterval = setInterval(() => {
      const timer = new Date();
      const option: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      };
      this.todayShowTime = new Intl.DateTimeFormat('en-us', option).format(timer);
    }, 1000);
  }

  loadAssessmentStats() {
    // Get the current date and the date 7 days ago
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // First fetch quizzes
    this.API.teacherGetQuizzes().subscribe((quizResponse: any) => {
      if (quizResponse.success) {
        const quizzes = quizResponse.output || [];
        
        // Now fetch tasks
        this.API.teacherGetTasks().subscribe((taskResponse: any) => {
          if (taskResponse.success) {
            const tasks = taskResponse.output || [];
            
            // Total count
            const totalQuizzes = quizzes.length;
            const totalTasks = tasks.length;
            this.statsData.totalAssessments = totalQuizzes + totalTasks;
            
            // Count new ones this week
            const newQuizzes = quizzes.filter((quiz: any) => {
              const createdDate = new Date(quiz.timestamp);
              return createdDate >= lastWeek;
            }).length;
            
            const newTasks = tasks.filter((task: any) => {
              const createdDate = new Date(task.timestamp);
              return createdDate >= lastWeek;
            }).length;
            
            this.statsData.newAssessments = newQuizzes + newTasks;
          }
        });
      }
    });
  }

  loadDashboardData(): void {
    // Reset loading states
    this.loadingCourses = true;
    this.loadingClasses = true;
    
    // Make parallel API calls using forkJoin
    forkJoin({
      courses: this.API.teacherCoursesAndEnrolled(),
      classes: this.API.teacherAllClasses()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results) => {
        // Process courses data
        if (results.courses.success) {
          this.courses = results.courses.output.map((course: any) => {
            return {
              ...course,
              background: this.API.randomCourseCover(course.language?.toLowerCase() || 'english')
            };
          });
          
          // Update stats
          this.calculateStats(this.courses, results.classes.output);
          this.createOrUpdateEnrollmentChart();
          this.loadingCourses = false;
        }
        
        // Process classes data
        if (results.classes.success) {
          this.classes = results.classes.output;
          this.createOrUpdateClassesChart();
          this.loadingClasses = false;
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.API.failedSnackbar('Failed to load dashboard data');
        this.loadingCourses = false;
        this.loadingClasses = false;
      }
    });
  }

  calculateStats(courses: any[], classes: any[]): void {
    // Calculate total students across all courses
    this.statsData.totalStudents = courses.reduce((total, course) => 
      total + (parseInt(course.studentcount) || 0), 0);

    // Count active courses (has at least one student)
    this.statsData.activeCourses = courses.filter(course => 
      parseInt(course.studentcount) > 0).length;

    // Count total classes
    this.statsData.totalClasses = classes.length;

    // Calculate growth rates and new courses
    // For demo: simulate previous month data (replace with real API if available)
    const previousStudents = courses.reduce((total, course) => 
      total + (parseInt(course.previousStudentCount) || 0), 0);
    this.statsData.studentsGrowth = previousStudents > 0
      ? Math.round(((this.statsData.totalStudents - previousStudents) / previousStudents) * 100)
      : 0;

    // New courses this week (simulate with createdThisWeek property)
    this.statsData.newCourses = courses.filter(course => course.createdThisWeek).length;

    // Classes growth (simulate previous month)
    const previousClasses = classes.reduce((total, cls) => 
      total + (parseInt(cls.previousCount) || 0), 0);
    this.statsData.classesGrowth = previousClasses > 0
      ? Math.round(((this.statsData.totalClasses - previousClasses) / previousClasses) * 100)
      : 0;
  }

  ngAfterViewInit(): void {
    // Generate the calendar for the current month & year
    setTimeout(() => {
      this.generateCalendar(this.currentMonth.value, this.currentYear.value);
    }, 0);
  }

  ngOnDestroy(): void {
    // Clear the clock interval
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    
    // Complete the destroy subject to unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
    
    // Destroy charts to prevent memory leaks
    if (this.enrollmentChart) {
      this.enrollmentChart.destroy();
    }
    if (this.classesChart) {
      this.classesChart.destroy();
    }
  }

  // =========== CHARTS ===========

  createOrUpdateEnrollmentChart(): void {
    const labels = this.courses.map((c) => c.course);
    const data = this.courses.map((c) => parseInt(c.studentcount) || 0);

    // Use timeout to ensure the DOM is ready
    setTimeout(() => {
      const ctx = document.getElementById('enrollmentChart') as HTMLCanvasElement;
      if (!ctx) return;

      if (this.enrollmentChart) {
        this.enrollmentChart.data.labels = labels;
        this.enrollmentChart.data.datasets[0].data = data;
        this.enrollmentChart.update();
      } else {
        this.enrollmentChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Enrolled Students',
                data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true
              }
            },
            animation: {
              duration: 1000
            }
          }
        });
      }
    }, 0);
  }

  createOrUpdateClassesChart(): void {
    const labels = this.classes.map((cls) => cls.class);
    const data = this.classes.map((cls) => cls.duration || 0);

    // Use timeout to ensure the DOM is ready
    setTimeout(() => {
      const ctx = document.getElementById('classesChart') as HTMLCanvasElement;
      if (!ctx) return;

      if (this.classesChart) {
        this.classesChart.data.labels = labels;
        this.classesChart.data.datasets[0].data = data;
        this.classesChart.update();
      } else {
        this.classesChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Class Duration (Days)',
                data,
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true
              }
            },
            animation: {
              duration: 1000
            }
          }
        });
      }
    }, 0);
  }

  // =========== COURSE SELECTION ===========

  // Fetch classes for the selected course
  selectCourse(course: any) {
    this.selectedCourse = course;
    this.loadingSelectedCourseClasses = true;
    this.selectedCourseClasses = [];
    
    // Fetch classes specific to this course with student counts
    this.API.teacherGetClassesByCourse(course.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingSelectedCourseClasses = false;
          if (response.success) {
            this.selectedCourseClasses = response.output;
            
            // Debug output
            console.log('Classes for selected course:', this.selectedCourseClasses);
          } else {
            console.error('Failed to fetch classes for course:', response.error);
            this.API.failedSnackbar('Failed to load classes for this course');
          }
        },
        error: (error) => {
          this.loadingSelectedCourseClasses = false;
          console.error('Error fetching classes for course:', error);
          this.API.failedSnackbar('Error loading classes');
        }
      });
  }

  // Clear the selected course classes
  deselectCourse() {
    this.selectedCourse = null;
    this.selectedCourseClasses = [];
  }

  // =========== CALENDAR LOGIC ===========

  isLeapYear(year: number): boolean {
    return (
      (year % 4 === 0 && year % 100 !== 0 && year % 400 !== 0) ||
      (year % 100 === 0 && year % 400 === 0)
    );
  }

  getFebDays(year: number): number {
    return this.isLeapYear(year) ? 29 : 28;
  }

  changeMonth(change: number): void {
    // Update month value, handling year change if needed
    let newMonth = this.currentMonth.value + change;
    
    if (newMonth > 11) {
      newMonth = 0;
      this.currentYear.value++;
    } else if (newMonth < 0) {
      newMonth = 11;
      this.currentYear.value--;
    }
    
    this.currentMonth.value = newMonth;
    this.generateCalendar(this.currentMonth.value, this.currentYear.value);
  }

  generateCalendar(month: number, year: number): void {
    const calendar_days = document.querySelector('.calendar-days') as HTMLElement;
    if (!calendar_days) return;

    // Clear existing days
    calendar_days.innerHTML = '';
    
    const days_of_month: number[] = [
      31, this.getFebDays(year), 31, 30, 31, 30,
      31, 31, 30, 31, 30, 31
    ];

    // First day of the selected month
    const first_day = new Date(year, month, 1);

    // Use the real "today"
    const today = new Date();

    // Add empty <div> for days before the 1st of the month
    for (let i = 0; i < first_day.getDay(); i++) {
      const emptyDay = document.createElement('div');
      calendar_days.appendChild(emptyDay);
    }

    // Render the actual days in the month
    for (let i = 1; i <= days_of_month[month]; i++) {
      const day = document.createElement('div');
      day.textContent = i.toString();

      // Highlight if it's "today"
      if (
        i === today.getDate() &&
        year === today.getFullYear() &&
        month === today.getMonth()
      ) {
        day.classList.add('current-date');
        day.innerHTML = ` <span class="text-xs text-white bg-[var(--primary-color)] rounded-full p-1.5 ml-1"> ${i} </span>`;
      }

      day.classList.add('p-3', 'hover:bg-slate-100', 'rounded', 'cursor-pointer');
      calendar_days.appendChild(day);
    }
  }

  // =========== UTILITIES & NAVIGATION ===========

  getUrl(file: string) {
    return this.API.getURL(file) ?? this.API.noProfile();
  }

  // Navigation methods
  openMessage() {
    this.router.navigate(['teacher/communication']);
  }

  openInbox() {
    this.router.navigate(['teacher/communication']);
  }
  
  // Method to navigate to course management
  navigateToCourses() {
    this.router.navigate(['teacher/managecourse']);
  }

  // Method to navigate to class management
  navigateToClasses() {
    this.router.navigate(['teacher/manageclass']);
  }

  // Method to navigate to student management
  navigateToStudents() {
    this.router.navigate(['teacher/grade-list']);
  }

  // Method to refresh data
  refreshData() {
    this.loadDashboardData();
  }
}