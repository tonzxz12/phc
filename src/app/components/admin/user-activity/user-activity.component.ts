import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './user-activity.component.html',
  styleUrl: './user-activity.component.css'
})
export class UserActivityComponent implements OnInit, OnDestroy {
  // Data properties
  activities: any[] = [];
  filteredActivities: any[] = [];
  teachers: any[] = [];
  students: any[] = [];
  meetingActivities: any[] = []; // Add this missing property
  
  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50, 100];
  currentPage = 0;
  totalItems = 0;
  
  // Sorting
  sortColumn = 'timestamp';
  sortDirection = 'desc';
  
  // Filtering
  filterForm: FormGroup;
  isLoading = false;
  
  // Math property for template access
  Math = Math;
  
  // Computed properties for template
  teacherActivityCount = 0;
  studentActivityCount = 0;
  
  // Add these properties for filtering
  currentFilteredData: any[] = []; // Store the currently filtered data
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  constructor(
    private api: APIService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      userType: ['all'],
      userId: [''],
      activityType: ['all'],
      dateFrom: [''],
      dateTo: [''],
      searchTerm: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadUsers();
    this.loadActivities();
    this.loadMeetingActivities(); // Add this call
    this.setupFilterListeners();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadMeetingActivities() {
    console.log('Meeting activities loading...');
    // TODO: Implement method to get all meetings from meetings table
    this.meetingActivities = [];
  }
  
  private loadUsers(): void {
    // Load teachers
    this.subscriptions.push(
      this.api.getTeachers().subscribe({
        next: (response) => {
          if (response.success) {
            this.teachers = response.output || [];
          }
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
        }
      })
    );
    
    // Load students
    this.subscriptions.push(
      this.api.getStudents().subscribe({
        next: (response) => {
          if (response.success) {
            this.students = response.output || [];
          }
        },
        error: (error) => {
          console.error('Error loading students:', error);
        }
      })
    );
  }
  
  private loadActivities(): void {
    this.isLoading = true;
    
    // Load both teacher meetings AND student speech attendance
    Promise.all([
      this.loadTeacherMeetings(),    // From meetings table
      this.loadStudentAttendance()   // From speech_attendance table
    ]).then(([teacherActivities, studentActivities]) => {
      this.activities = [...teacherActivities, ...studentActivities];
      this.applyFilters();
      this.isLoading = false;
    });
  }

  private loadTeacherMeetings(): Promise<any[]> {
    return new Promise((resolve) => {
      this.api.loadMeetingSessions().subscribe({
        next: (response: any) => {
          if (response && response.success) {
            console.log('🔍 Raw meeting data:', response.output); // Add this debug line
            const activities = this.transformMeetingData(response.output);
            console.log('🔍 Transformed activities:', activities); // Add this debug line
            resolve(activities);
          } else {
            console.error('Error loading teacher meetings:', response);
            resolve([]);
          }
        },
        error: (error: any) => {
          console.error('Error loading teacher meetings:', error);
          resolve([]);
        }
      });
    });
  }

  private loadStudentAttendance(): Promise<any[]> {
    return new Promise((resolve) => {
      this.api.getSpeechAttendance().subscribe({
        next: (response: any) => {
          console.log(' Student attendance response:', response); // Add this debug line
          if (response && response.success) {
            const activities = response.output.map((attendance: any) => ({
              id: attendance.id,
              user_id: attendance.studentid,
              user_name: this.getStudentName(attendance.studentid),
              user_type: 'student',
              activity_type: 'joined_meeting',
              description: `Student joined meeting: ${attendance.meetingid}`,
              timestamp: attendance.timein,
              ip_address: 'N/A',
              user_agent: 'N/A'
            }));
            console.log('🔍 Transformed student activities:', activities); // Add this debug line
            resolve(activities);
          } else {
            console.log('🔍 No student attendance data or failed response');
            resolve([]);
          }
        },
        error: (error: any) => {
          console.error('Error loading student attendance:', error);
          resolve([]);
        }
      });
    });
  }

  private getTeacherName(teacherId: string): string {
    const teacher = this.teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstname} ${teacher.lastname}` : `Teacher ${teacherId}`;
  }

  private getStudentName(studentId: string): string {
    const student = this.students.find(s => s.id === studentId);
    return student ? `${student.firstname} ${student.lastname}` : `Student ${studentId}`;
  }
  
  private transformMeetingData(meetingData: any[]): any[] {
    return meetingData.map(meeting => {
      console.log(' Processing meeting:', meeting); // Debug line
      
      // Try different possible column names
      const teacherId = meeting.teacherid || meeting.TeacherID || meeting.teacher_id;
      const meetingCode = meeting.meetingcode || meeting.MeetingCode || meeting.meeting_code;
      const startTime = meeting.starttime || meeting.StartTime || meeting.start_time;
      
      console.log('🔍 Extracted values:', { teacherId, meetingCode, startTime }); // Debug line
      
      // Check if this is a student activity
      const isTeacher = this.teachers.some(t => t.id === teacherId);
      console.log('🔍 Is teacher?', isTeacher, 'Teacher ID:', teacherId); // Debug line
      
      if (!isTeacher && teacherId) {
        // This is a student activity
        const studentId = teacherId;
        const student = this.students.find(s => s.id === studentId);
        const studentName = student ? `${student.firstname} ${student.lastname}` : `Student ${studentId}`;
        
        console.log('🔍 Found student activity:', studentName); // Debug line
        
        return {
          id: meeting.id,
          user_id: studentId,
          user_name: studentName,
          user_type: 'student',
          activity_type: 'joined_meeting',
          description: `Student joined meeting: ${meetingCode}`,
          timestamp: startTime,
          ip_address: 'N/A',
          user_agent: 'N/A'
        };
      } else if (teacherId) {
        // Regular teacher meeting
        const teacher = this.teachers.find(t => t.id === teacherId);
        const teacherName = teacher ? `${teacher.firstname} ${teacher.lastname}` : `Teacher ${teacherId}`;
        
        return {
          id: meeting.id,
          user_id: teacherId,
          user_name: teacherName,
          user_type: 'teacher',
          activity_type: 'meeting_started',
          description: `Started meeting: ${meetingCode}`,
          timestamp: startTime,
          ip_address: 'N/A',
          user_agent: 'N/A'
        };
      } else {
        console.log(' Skipping meeting - no teacherId found:', meeting); // Debug line
        return null;
      }
    }).filter(Boolean); // Remove null entries
  }

  private transformAttendanceData(attendanceData: any[]): any[] {
    return attendanceData.map(attendance => ({
      id: attendance.id,
      user_id: attendance.studentid,
      user_name: `${attendance.students?.firstname || 'Unknown'} ${attendance.students?.lastname || 'Student'}`,
      user_type: 'student',
      activity_type: 'speech_lab_attendance',
      description: 'Student attended speech lab meeting',
      timestamp: attendance.timein,
      ip_address: 'N/A', // Not stored in speech_attendance
      user_agent: 'N/A'  // Not stored in speech_attendance
    }));
  }
  
  private generateMockActivities(): any[] {
    const mockActivities = [];
    const activityTypes = ['login', 'logout', 'course_access', 'quiz_taken', 'assignment_submitted', 'file_upload'];
    const userTypes = ['teacher', 'student'];
    
    for (let i = 1; i <= 100; i++) {
      const isTeacher = Math.random() > 0.6;
      const userType = isTeacher ? 'teacher' : 'student';
      const users = userType === 'teacher' ? this.teachers : this.students;
      const randomUser = users.length > 0 ? users[Math.floor(Math.random() * users.length)] : null;
      
      mockActivities.push({
        id: i,
        user_id: randomUser?.id || `user_${i}`,
        user_name: randomUser ? `${randomUser.firstname} ${randomUser.lastname}` : `User ${i}`,
        user_type: userType,
        activity_type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        description: this.generateActivityDescription(activityTypes[Math.floor(Math.random() * activityTypes.length)]),
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    }
    
    return mockActivities;
  }
  
  private generateActivityDescription(activityType: string): string {
    const descriptions = {
      login: 'User logged into the system',
      logout: 'User logged out of the system',
      course_access: 'User accessed course materials',
      quiz_taken: 'User completed a quiz',
      assignment_submitted: 'User submitted an assignment',
      file_upload: 'User uploaded a file'
    };
    return descriptions[activityType as keyof typeof descriptions] || 'User performed an action';
  }
  
  private setupFilterListeners(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 0;
      this.applyFilters();
    });
  }
  
  public applyFilters(): void {
    const searchTerm = this.filterForm.get('searchTerm')?.value?.toLowerCase() || '';
    const fromDate = this.filterForm.get('dateFrom')?.value;
    const toDate = this.filterForm.get('dateTo')?.value;
    const userType = this.filterForm.get('userType')?.value;
    const activityType = this.filterForm.get('activityType')?.value;

    // Apply filters to the main activities array
    this.currentFilteredData = this.activities.filter(activity => {
      let matches = true;

      // Search term filter
      if (searchTerm) {
        const searchableText = [
          activity.user_name,
          activity.description,
          activity.activity_type
        ].join(' ').toLowerCase();
        matches = matches && searchableText.includes(searchTerm);
      }

      // Date range filter
      if (fromDate) {
        const activityDate = new Date(activity.timestamp);
        matches = matches && activityDate >= fromDate;
      }

      if (toDate) {
        const activityDate = new Date(activity.timestamp);
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        matches = matches && activityDate <= endOfDay;
      }

      // User type filter
      if (userType && userType !== 'all') {
        matches = matches && activity.user_type === userType;
      }

      // Activity type filter
      if (activityType && activityType !== 'all') {
        matches = matches && activity.activity_type === activityType;
      }

      return matches;
    });

    // Update pagination
    this.currentPage = 0;
    this.updatePaginatedData(this.currentFilteredData);
    
    // Update activity counts
    this.updateActivityCounts();
  }

  private updatePaginatedData(allFilteredData: any[]): void {
    this.totalItems = allFilteredData.length;
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredActivities = allFilteredData.slice(startIndex, endIndex);
  }
  
  public clearFilters(): void {
    this.filterForm.reset();
    this.currentFilteredData = [...this.activities]; // Reset to all activities
    this.currentPage = 0;
    this.updatePaginatedData(this.currentFilteredData);
    this.updateActivityCounts();
  }
  
  public exportToExcel(): void {
    // Export the currently filtered data, not all data
    const dataToExport = this.currentFilteredData.length > 0 ? this.currentFilteredData : this.activities;
    
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    
    // Format the data for export
    const exportData = dataToExport.map(activity => ({
      'User Name': activity.user_name,
      'User Type': activity.user_type,
      'Activity Type': activity.activity_type,
      'Description': activity.description,
      'Timestamp': new Date(activity.timestamp).toLocaleString(),
      'IP Address': activity.ip_address,
      'User Agent': activity.user_agent
    }));

    const exportWorksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const exportWorkbook: XLSX.WorkBook = { Sheets: { 'User Activities': exportWorksheet }, SheetNames: ['User Activities'] };
    
    XLSX.writeFile(exportWorkbook, `user_activities_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
  
  public exportToPDF(): void {
    // Export the currently filtered data, not all data
    const dataToExport = this.currentFilteredData.length > 0 ? this.currentFilteredData : this.activities;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('User Activity Report', 20, 20);
    
    // Add filter info
    doc.setFontSize(12);
    const filterInfo = this.getFilterInfo();
    doc.text(filterInfo, 20, 35);
    
    // Add data
    let yPosition = 50;
    dataToExport.forEach((activity, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${activity.user_name} (${activity.user_type})`, 20, yPosition);
      doc.setFontSize(8);
      doc.text(`   ${activity.activity_type}: ${activity.description}`, 25, yPosition + 5);
      doc.text(`   ${new Date(activity.timestamp).toLocaleString()}`, 25, yPosition + 10);
      
      yPosition += 20;
    });
    
    doc.save(`user_activities_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  private getFilterInfo(): string {
    const filters = [];
    const searchTerm = this.filterForm.get('searchTerm')?.value;
    const fromDate = this.filterForm.get('dateFrom')?.value;
    const toDate = this.filterForm.get('dateTo')?.value;
    const userType = this.filterForm.get('userType')?.value;
    const activityType = this.filterForm.get('activityType')?.value;

    if (searchTerm) filters.push(`Search: "${searchTerm}"`);
    if (fromDate) filters.push(`From: ${fromDate.toLocaleDateString()}`);
    if (toDate) filters.push(`To: ${toDate.toLocaleDateString()}`);
    if (userType && userType !== 'all') filters.push(`User Type: ${userType}`);
    if (activityType && activityType !== 'all') filters.push(`Activity Type: ${activityType}`);

    return filters.length > 0 ? `Filters: ${filters.join(', ')}` : 'All Activities';
  }
  
  public getActivityTypeColor(activityType: string): string {
    const colors: { [key: string]: string } = {
      meeting_started: 'bg-blue-100 text-blue-800',
      ended_meeting: 'bg-red-100 text-red-800',
      joined_meeting: 'bg-green-100 text-green-800',
      left_meeting: 'bg-orange-100 text-orange-800',
      speech_lab_attendance: 'bg-purple-100 text-purple-800'
    };
    return colors[activityType] || 'bg-gray-100 text-gray-800';
  }

  public getActivityTypeColorClass(activityType: string): string {
    const normalizedType = activityType.replace('_', '-');
    return `activity-badge ${normalizedType}`;
  }
  
  public onPageChange(newPage: number): void {
    this.currentPage = newPage;
    this.updatePaginatedData(this.currentFilteredData);
  }

  private updateActivityCounts(): void {
    // Count activities based on filtered data
    const dataToCount = this.currentFilteredData.length > 0 ? this.currentFilteredData : this.activities;
    
    this.teacherActivityCount = dataToCount.filter(a => a.user_type === 'teacher').length;
    this.studentActivityCount = dataToCount.filter(a => a.user_type === 'student').length;
    this.totalItems = dataToCount.length;
  }
}