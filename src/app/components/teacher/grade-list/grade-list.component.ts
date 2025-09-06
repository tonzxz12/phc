import { Component, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Grade {
  studentName: string;
  grade: string | number;
}

interface AssignmentGrade {
  name: string;
  grades: Grade[];
}

interface QuizGrade {
  name: string;
  grades: Grade[];
}

interface AttendanceRecord {
  student: string;
  time: string;
}

interface StudentProgressData {
  student: any;
  quizzes: any[];
  assignments: any[];
  labs: any[];
}

@Component({
  selector: 'app-grade-list',
  templateUrl: './grade-list.component.html',
  styleUrls: ['./grade-list.component.css'],
})
export class GradeListComponent implements OnInit {
  constructor(private API: APIService) {}
  
  // State management
  selectedQuiz: string = '';
  selectedTab: 'quizzes' | 'assignments' | 'attendanceHistory' | 'individual' | null = null;
  selectedMeeting: string = '';
  selectedAssignment: string = '';

  // Data storage
  quizGrades: Map<string, QuizGrade> = new Map();
  labGrades: Map<string, QuizGrade> = new Map();
  assignmentGrades: Map<string, AssignmentGrade> = new Map();
  attendanceHistory: Map<string, AttendanceRecord[]> = new Map();

  // Individual progress properties
  studentsForIndividual: any[] = [];
  filteredStudentsForIndividual: any[] = [];
  searchTermForIndividual: string = '';
  selectedStudentProgress: StudentProgressData | null = null;
  isLoadingStudentProgress: boolean = false;

  // Tracking IDs
  assignments: string[] = [];
  quizzes: string[] = [];
  labquizzes: string[] = [];

  ngOnInit(): void {
    this.API.showLoader();
    this.loadAllData();
  }

  loadAllData(): void {
    const assignmentSub$ = this.API.teacherGetAllSubmissions().subscribe((res) => {
      this.processAssignmentData(res.output);
      
      // Load quiz data after assignments
      const quizSub$ = this.API.teacherGetStudentQuizzes().subscribe((r) => {
        this.processQuizData(r.output);
        quizSub$.unsubscribe();
        this.API.hideLoader();
      });
      
      // Load lab quiz data
      const labSub$ = this.API.teacherGetLabQuizzes().subscribe((r) => {
        this.processLabQuizData(r.output);
        labSub$.unsubscribe();
      });
      
      // Load attendance data
      const attendanceSub$ = this.API.getAttendanceHistory().subscribe((r) => {
        this.processAttendanceData(r.output);
        attendanceSub$.unsubscribe();
      });
      
      assignmentSub$.unsubscribe();
    });
  }

  // Process the assignment data
  processAssignmentData(assignments: any[]): void {
    for (let assignment of assignments) {
      if (this.assignments.includes(assignment.assignmentid)) {
        this.assignmentGrades.get(assignment.assignmentid)?.grades.push({
          studentName: assignment.firstname + ' ' + assignment.lastname,
          grade: assignment.grade,
        });
      } else {
        this.assignments.push(assignment.assignmentid);
        this.assignmentGrades.set(assignment.assignmentid, {
          name: assignment.title,
          grades: [
            {
              studentName: assignment.firstname + ' ' + assignment.lastname,
              grade: assignment.grade,
            },
          ],
        });
      }
    }
  }

  // Process quiz data
  processQuizData(quizzes: any[]): void {
    for (let quiz of quizzes) {
      if (this.quizzes.includes(quiz.assessmentid)) {
        this.quizGrades.get(quiz.assessmentid)?.grades.push({
          studentName: quiz.firstname + ' ' + quiz.lastname,
          grade: quiz.takenpoints + ' / ' + quiz.totalpoints,
        });
      } else {
        this.quizzes.push(quiz.assessmentid);
        this.quizGrades.set(quiz.assessmentid, {
          name: quiz.title,
          grades: [
            {
              studentName: quiz.firstname + ' ' + quiz.lastname,
              grade: quiz.takenpoints + ' / ' + quiz.totalpoints,
            },
          ],
        });
      }
    }
  }

  // Process lab quiz data
  processLabQuizData(labQuizzes: any[]): void {
    for (let quiz of labQuizzes) {
      if (this.labquizzes.includes(`${quiz.lessonid}-${quiz.labid}`)) {
        this.labGrades.get(`${quiz.lessonid}-${quiz.labid}`)?.grades.push({
          studentName: quiz.firstname + ' ' + quiz.lastname,
          grade: quiz.takenpoints + ' / ' + quiz.totalpoints,
        });
      } else {
        this.labquizzes.push(`${quiz.lessonid}-${quiz.labid}`);
        this.labGrades.set(`${quiz.lessonid}-${quiz.labid}`, {
          name: `(${quiz.lab}) ${quiz.lesson}`,
          grades: [
            {
              studentName: quiz.firstname + ' ' + quiz.lastname,
              grade: quiz.takenpoints + ' / ' + quiz.totalpoints,
            },
          ],
        });
      }
    }
  }

  // Process attendance data
  processAttendanceData(attendanceRecords: any[]): void {
    for (let meeting of attendanceRecords) {
      const meetingDateTime = meeting.datetime;
      const studentName = meeting.firstname + ' ' + meeting.lastname;
      
      if (this.attendanceHistory.has(meetingDateTime)) {
        this.attendanceHistory.get(meetingDateTime)?.push({
          student: studentName,
          time: meeting.timein
        });
      } else {
        this.attendanceHistory.set(meetingDateTime, [{
          student: studentName,
          time: meeting.timein
        }]);
      }
    }
  }

  // Format date and time strings
  parseDateTime(time: string): string {
    return this.API.parseDateTime(time);
  }

  parseTime(time: string): string {
    return this.API.parseTime(time);
  }

  // Select a tab to display
  selectTab(tab: 'quizzes' | 'assignments' | 'attendanceHistory' | 'individual'): void {
    this.selectedTab = tab;
    if (tab === 'individual') {
      this.loadStudentsForIndividual();
    }
  }
  
  // Calculate percentage from a score like "3 / 5"
  getScorePercentage(score: string | number): number {
    if (typeof score === 'number') {
      return score;
    }
    
    if (typeof score === 'string' && score.includes('/')) {
      const parts = score.split('/').map(part => parseFloat(part.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
        return (parts[0] / parts[1]) * 100;
      }
    }
    
    return 0;
  }
  
  // Get average for the selected quiz
  getSelectedQuizAverage(): string {
    if (!this.selectedQuiz) {
      return '0.0%';
    }
    
    // Check in regular quizzes
    for (const [id, quiz] of this.quizGrades.entries()) {
      if (quiz.name === this.selectedQuiz) {
        let totalPercentage = 0;
        let count = 0;
        
        for (const grade of quiz.grades) {
          if (grade.grade !== null) {
            const percentage = this.getScorePercentage(grade.grade);
            if (percentage > 0) {
              totalPercentage += percentage;
              count++;
            }
          }
        }
        
        return count > 0 ? (totalPercentage / count).toFixed(1) + '%' : '0.0%';
      }
    }
    
    // Check in lab quizzes
    for (const [id, quiz] of this.labGrades.entries()) {
      if (quiz.name === this.selectedQuiz) {
        let totalPercentage = 0;
        let count = 0;
        
        for (const grade of quiz.grades) {
          if (grade.grade !== null) {
            const percentage = this.getScorePercentage(grade.grade);
            if (percentage > 0) {
              totalPercentage += percentage;
              count++;
            }
          }
        }
        
        return count > 0 ? (totalPercentage / count).toFixed(1) + '%' : '0.0%';
      }
    }
    
    return '0.0%';
  }
  
  // Get average for the selected assignment - using direct sum of grades divided by count
  getSelectedAssignmentAverage(): string {
    if (!this.selectedAssignment) {
      return '0.0';
    }
    
    // Find the matching assignment
    for (const [id, assignment] of this.assignmentGrades.entries()) {
      if (assignment.name === this.selectedAssignment) {
        let totalGrade = 0;
        let count = 0;
        
        for (const grade of assignment.grades) {
          if (grade.grade !== null && grade.grade !== undefined) {
            // Convert grade to number if it's a string
            const numericGrade = typeof grade.grade === 'string' 
              ? parseFloat(grade.grade) 
              : grade.grade;
            
            if (!isNaN(numericGrade)) {
              totalGrade += numericGrade;
              count++;
            }
          }
        }
        
        // Return the average as a simple number (total/count)
        return count > 0 ? (totalGrade / count).toFixed(1) : '0.0';
      }
    }
    
    return '0.0';
  }
  
  // Get color class based on the score value
  getScoreColorClass(score: string | number): string {
    const percentage = this.getScorePercentage(score);
    
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
  
  // Format raw score for display
  formatScore(score: string | number): string {
    if (score === null || score === undefined) return 'NOT GRADED';
    return score.toString();
  }
  
  // Get total count of all students
  getTotalStudents(): number {
    const studentSet = new Set<string>();
    
    // Add quiz students
    this.quizGrades.forEach(quiz => {
      quiz.grades.forEach(grade => {
        studentSet.add(grade.studentName);
      });
    });
    
    // Add lab students
    this.labGrades.forEach(lab => {
      lab.grades.forEach(grade => {
        studentSet.add(grade.studentName);
      });
    });
    
    // Add assignment students
    this.assignmentGrades.forEach(assignment => {
      assignment.grades.forEach(grade => {
        studentSet.add(grade.studentName);
      });
    });
    
    return studentSet.size;
  }
  
  // Export grades to CSV
  exportToCSV(type: 'quizzes' | 'assignments' | 'attendanceHistory'): void {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (type === 'quizzes') {
      // Header row
      csvContent += 'Quiz Name,Student Name,Grade\r\n';
      
      // Add quiz grades
      this.quizGrades.forEach(quiz => {
        quiz.grades.forEach(grade => {
          csvContent += `"${quiz.name}","${grade.studentName}","${grade.grade}"\r\n`;
        });
      });
      
      // Add lab grades
      this.labGrades.forEach(lab => {
        lab.grades.forEach(grade => {
          csvContent += `"${lab.name}","${grade.studentName}","${grade.grade}"\r\n`;
        });
      });
    } else if (type === 'assignments') {
      // Header row
      csvContent += 'Assignment Name,Student Name,Grade\r\n';
      
      // Add assignment grades
      this.assignmentGrades.forEach(assignment => {
        assignment.grades.forEach(grade => {
          csvContent += `"${assignment.name}","${grade.studentName}","${grade.grade}"\r\n`;
        });
      });
    } else if (type === 'attendanceHistory') {
      // Header row
      csvContent += 'Meeting Date,Student Name,Check-in Time\r\n';
      
      // Add attendance records
      this.attendanceHistory.forEach((students, meetingDate) => {
        const formattedDate = this.parseDateTime(meetingDate);
        students.forEach(student => {
          csvContent += `"${formattedDate}","${student.student}","${this.parseTime(student.time)}"\r\n`;
        });
      });
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  }

  // Individual Progress Methods
  loadStudentsForIndividual(): void {
    if (this.studentsForIndividual.length > 0) {
      return; // Already loaded
    }
    
    this.API.showLoader();
    const studentSet = new Set<string>();
    const studentMap = new Map<string, any>();

    // Collect all unique students from quizzes
    this.quizGrades.forEach(quiz => {
      quiz.grades.forEach(grade => {
        const key = grade.studentName;
        if (!studentSet.has(key)) {
          studentSet.add(key);
          const nameParts = grade.studentName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          studentMap.set(key, {
            id: key.toLowerCase().replace(/\s+/g, ''),
            firstname: firstName,
            lastname: lastName,
            fullName: grade.studentName
          });
        }
      });
    });

    // Collect from lab quizzes
    this.labGrades.forEach(lab => {
      lab.grades.forEach(grade => {
        const key = grade.studentName;
        if (!studentSet.has(key)) {
          studentSet.add(key);
          const nameParts = grade.studentName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          studentMap.set(key, {
            id: key.toLowerCase().replace(/\s+/g, ''),
            firstname: firstName,
            lastname: lastName,
            fullName: grade.studentName
          });
        }
      });
    });

    // Collect from assignments
    this.assignmentGrades.forEach(assignment => {
      assignment.grades.forEach(grade => {
        const key = grade.studentName;
        if (!studentSet.has(key)) {
          studentSet.add(key);
          const nameParts = grade.studentName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          studentMap.set(key, {
            id: key.toLowerCase().replace(/\s+/g, ''),
            firstname: firstName,
            lastname: lastName,
            fullName: grade.studentName
          });
        }
      });
    });

    this.studentsForIndividual = Array.from(studentMap.values()).sort((a, b) => 
      a.fullName.localeCompare(b.fullName)
    );
    this.filteredStudentsForIndividual = [...this.studentsForIndividual];
    this.API.hideLoader();
  }

  filterStudentsForIndividual(): void {
    if (!this.searchTermForIndividual.trim()) {
      this.filteredStudentsForIndividual = [...this.studentsForIndividual];
    } else {
      const term = this.searchTermForIndividual.toLowerCase().trim();
      this.filteredStudentsForIndividual = this.studentsForIndividual.filter(student =>
        student.fullName.toLowerCase().includes(term) ||
        student.firstname.toLowerCase().includes(term) ||
        student.lastname.toLowerCase().includes(term)
      );
    }
  }

  loadStudentProgress(student: any): void {
    this.isLoadingStudentProgress = true;
    this.API.showLoader();

    // Initialize progress data
    const progressData: StudentProgressData = {
      student: student,
      quizzes: [],
      assignments: [],
      labs: []
    };

    // Get quiz progress
    this.quizGrades.forEach((quiz, quizId) => {
      const studentGrade = quiz.grades.find(g => g.studentName === student.fullName);
      
      progressData.quizzes.push({
        id: quizId,
        title: quiz.name,
        grade: studentGrade ? studentGrade.grade : 'Not taken',
        percentage: studentGrade ? this.getScorePercentage(studentGrade.grade) : 0,
        status: studentGrade ? 'Completed' : 'Not taken'
      });
    });

    // Get lab quiz progress
    this.labGrades.forEach((lab, labId) => {
      const studentGrade = lab.grades.find(g => g.studentName === student.fullName);
      
      progressData.labs.push({
        id: labId,
        title: lab.name,
        grade: studentGrade ? studentGrade.grade : 'Not taken',
        percentage: studentGrade ? this.getScorePercentage(studentGrade.grade) : 0,
        status: studentGrade ? 'Completed' : 'Not taken'
      });
    });

    // Get assignment progress
    this.assignmentGrades.forEach((assignment, assignmentId) => {
      const studentGrade = assignment.grades.find(g => g.studentName === student.fullName);
      
      progressData.assignments.push({
        id: assignmentId,
        title: assignment.name,
        grade: studentGrade ? studentGrade.grade : 'Not submitted',
        percentage: studentGrade && typeof studentGrade.grade === 'number' ? studentGrade.grade : 0,
        status: studentGrade ? 'Submitted' : 'Not submitted'
      });
    });

    this.selectedStudentProgress = progressData;
    this.isLoadingStudentProgress = false;
    this.API.hideLoader();
  }

  calculateOverallProgress(): { percentage: number; completed: number; total: number } {
    if (!this.selectedStudentProgress) {
      return { percentage: 0, completed: 0, total: 0 };
    }

    const allItems = [
      ...this.selectedStudentProgress.quizzes,
      ...this.selectedStudentProgress.labs,
      ...this.selectedStudentProgress.assignments
    ];

    const completed = allItems.filter(item => 
      item.status === 'Completed' || item.status === 'Submitted'
    ).length;
    
    const total = allItems.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { percentage, completed, total };
  }

  calculateAverageGrade(): number {
    if (!this.selectedStudentProgress) {
      return 0;
    }

    const allItems = [
      ...this.selectedStudentProgress.quizzes,
      ...this.selectedStudentProgress.labs,
      ...this.selectedStudentProgress.assignments
    ];

    const completedItems = allItems.filter(item => 
      (item.status === 'Completed' || item.status === 'Submitted') && 
      item.percentage > 0
    );

    if (completedItems.length === 0) {
      return 0;
    }

    const totalPercentage = completedItems.reduce((sum, item) => sum + item.percentage, 0);
    return totalPercentage / completedItems.length;
  }

  exportIndividualProgressPDF(): void {
    if (!this.selectedStudentProgress) {
      return;
    }

    const doc = new jsPDF();
    const student = this.selectedStudentProgress.student;
    const progress = this.calculateOverallProgress();
    const averageGrade = this.calculateAverageGrade();

    // Header with school logo/title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT PROGRESS REPORT', 105, 25, { align: 'center' });
    
    // Underline
    doc.setLineWidth(0.5);
    doc.line(20, 30, 190, 30);

    // Student Information Box
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.rect(20, 35, 170, 25);
    doc.text(`Student Name: ${student.fullName}`, 25, 45);
    doc.text(`Student ID: ${student.id || 'N/A'}`, 25, 52);
    doc.text(`Report Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 110, 45);
    doc.text(`Academic Period: ${new Date().getFullYear()}`, 110, 52);

    // Summary Statistics Box
    doc.rect(20, 65, 170, 25);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE SUMMARY', 25, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(`Overall Progress: ${progress.completed} of ${progress.total} activities completed (${progress.percentage.toFixed(2)}%)`, 25, 82);
    doc.text(`Average Grade: ${averageGrade.toFixed(2)}%`, 110, 82);

    let yPosition = 100;

    // Summary by category
    const quizCompleted = this.selectedStudentProgress.quizzes.filter(q => q.status === 'Completed').length;
    const labCompleted = this.selectedStudentProgress.labs.filter(l => l.status === 'Completed').length;
    const assignmentCompleted = this.selectedStudentProgress.assignments.filter(a => a.status === 'Submitted').length;

    doc.setFont('helvetica', 'bold');
    doc.text('ACTIVITY BREAKDOWN:', 20, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`• Quizzes: ${quizCompleted}/${this.selectedStudentProgress.quizzes.length} completed`, 25, yPosition);
    yPosition += 7;
    doc.text(`• Lab Quizzes: ${labCompleted}/${this.selectedStudentProgress.labs.length} completed`, 25, yPosition);
    yPosition += 7;
    doc.text(`• Assignments: ${assignmentCompleted}/${this.selectedStudentProgress.assignments.length} submitted`, 25, yPosition);
    yPosition += 15;

    // Quizzes section
    if (this.selectedStudentProgress.quizzes.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('QUIZZES', 20, yPosition);
      yPosition += 10;

      const quizData = this.selectedStudentProgress.quizzes.map((quiz, index) => [
        (index + 1).toString(),
        quiz.title,
        quiz.grade.toString(),
        quiz.status,
        `${quiz.percentage.toFixed(2)}%`,
        this.getGradeLetter(quiz.percentage)
      ]);

      (doc as any).autoTable({
        head: [['#', 'Quiz Name', 'Score', 'Status', 'Percentage', 'Grade']],
        body: quizData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Labs section
    if (this.selectedStudentProgress.labs.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAB QUIZZES', 20, yPosition);
      yPosition += 10;

      const labData = this.selectedStudentProgress.labs.map((lab, index) => [
        (index + 1).toString(),
        lab.title,
        lab.grade.toString(),
        lab.status,
        `${lab.percentage.toFixed(2)}%`,
        this.getGradeLetter(lab.percentage)
      ]);

      (doc as any).autoTable({
        head: [['#', 'Lab Name', 'Score', 'Status', 'Percentage', 'Grade']],
        body: labData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [139, 69, 19],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Assignments section
    if (this.selectedStudentProgress.assignments.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSIGNMENTS', 20, yPosition);
      yPosition += 10;

      const assignmentData = this.selectedStudentProgress.assignments.map((assignment, index) => [
        (index + 1).toString(),
        assignment.title,
        assignment.grade.toString(),
        assignment.status,
        assignment.percentage > 0 ? `${assignment.percentage.toFixed(2)}%` : 'N/A',
        assignment.percentage > 0 ? this.getGradeLetter(assignment.percentage) : 'N/A'
      ]);

      (doc as any).autoTable({
        head: [['#', 'Assignment Name', 'Score', 'Status', 'Percentage', 'Grade']],
        body: assignmentData,
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [34, 139, 34],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Footer with recommendations
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TEACHER REMARKS:', 20, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    let remarks = '';
    if (averageGrade >= 90) {
      remarks = 'Excellent performance! The student demonstrates outstanding understanding and consistent high achievement.';
    } else if (averageGrade >= 80) {
      remarks = 'Good performance! The student shows strong understanding with room for minor improvements.';
    } else if (averageGrade >= 70) {
      remarks = 'Satisfactory performance. The student should focus on strengthening weak areas for better results.';
    } else if (averageGrade >= 60) {
      remarks = 'Below average performance. Additional support and practice recommended for improvement.';
    } else {
      remarks = 'Performance needs significant improvement. Extra attention and remedial work strongly recommended.';
    }
    
    const splitRemarks = doc.splitTextToSize(remarks, 170);
    doc.text(splitRemarks, 20, yPosition);
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
      doc.text('Generated by HarfAI Learning Management System', 105, 285, { align: 'center' });
    }

    // Save the PDF with enhanced filename
    const fileName = `${student.firstname}_${student.lastname}_Progress_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  // Helper method to get grade letter based on percentage
  getGradeLetter(percentage: number): string {
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
    if (percentage >= 65) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  // Helper methods for template calculations
  getCompletedQuizzes(): number {
    if (!this.selectedStudentProgress) return 0;
    return this.selectedStudentProgress.quizzes.filter(q => q.status === 'Completed').length;
  }

  getCompletedLabs(): number {
    if (!this.selectedStudentProgress) return 0;
    return this.selectedStudentProgress.labs.filter(l => l.status === 'Completed').length;
  }

  getSubmittedAssignments(): number {
    if (!this.selectedStudentProgress) return 0;
    return this.selectedStudentProgress.assignments.filter(a => a.status === 'Submitted').length;
  }

  getQuizCompletionPercentage(): number {
    if (!this.selectedStudentProgress || this.selectedStudentProgress.quizzes.length === 0) return 0;
    return (this.getCompletedQuizzes() / this.selectedStudentProgress.quizzes.length) * 100;
  }

  getLabCompletionPercentage(): number {
    if (!this.selectedStudentProgress || this.selectedStudentProgress.labs.length === 0) return 0;
    return (this.getCompletedLabs() / this.selectedStudentProgress.labs.length) * 100;
  }

  getAssignmentCompletionPercentage(): number {
    if (!this.selectedStudentProgress || this.selectedStudentProgress.assignments.length === 0) return 0;
    return (this.getSubmittedAssignments() / this.selectedStudentProgress.assignments.length) * 100;
  }

  // Additional helper methods for the new design
  activeResultTab: string = 'quizzes';

  setActiveResultTab(tab: string): void {
    this.activeResultTab = tab;
  }

  getQuizAveragePercentage(): number {
    if (!this.selectedStudentProgress || this.selectedStudentProgress.quizzes.length === 0) return 0;
    const total = this.selectedStudentProgress.quizzes.reduce((sum: number, quiz: any) => sum + quiz.percentage, 0);
    return total / this.selectedStudentProgress.quizzes.length;
  }

  getAssignmentAveragePercentage(): number {
    if (!this.selectedStudentProgress || this.selectedStudentProgress.assignments.length === 0) return 0;
    const validAssignments = this.selectedStudentProgress.assignments.filter((a: any) => a.percentage > 0);
    if (validAssignments.length === 0) return 0;
    const total = validAssignments.reduce((sum: number, assignment: any) => sum + assignment.percentage, 0);
    return total / validAssignments.length;
  }

  getPerformanceStatus(percentage: number): string {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Good';
    if (percentage >= 70) return 'Satisfactory';
    if (percentage >= 60) return 'Needs Improvement';
    return 'Needs Significant Improvement';
  }

  getPerformanceStatusClass(percentage: number): string {
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  getPercentageColorClass(percentage: number): string {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  getStatusColorClass(status: string): string {
    if (status === 'Completed' || status === 'Submitted') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  }

  getCurrentDateString(): string {
    return new Date().toLocaleDateString();
  }

  getStudentId(student: any): string {
    return student.id || student.fullName?.toLowerCase().replace(/\s+/g, '_') || 'unknown_student';
  }
}