import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { DarkModeService } from '../../../shared/services/dark-mode.service';

interface Violation {
  attemptId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  examId: number;
  examTitle: string;
  violationType: string;
  violationCount: number;
  timestamp: string;
  remainingWarnings: number;
}

interface ExamViolation {
  examId: number;
  examTitle: string;
  violations: Violation[];
  lastViolation: string | null;
}

interface StudentViolation {
  studentId: number;
  studentName: string;
  studentEmail: string;
  totalViolations: number;
  examsAffected: number;
  exams: ExamViolation[];
  lastViolation: string | null;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  user: any;
  exams: any[] = [];
  students: any[] = [];
  attempts: any[] = [];
  loading = true;
  activeTab: string = 'dashboard';
  isDarkMode: boolean = false;

  violations: Violation[] = [];
  filteredViolations: Violation[] = [];
  loadingViolations: boolean = false;
  searchTerm: string = '';

  showModal: boolean = false;
  modalTitle: string = '';
  modalData: any = [];
  modalType: string = '';

  totalExams: number = 0;
  totalStudents: number = 0;
  totalAttempts: number = 0;
  averageScore: number = 0;
  passRate: number = 0;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private darkModeService: DarkModeService
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.isDarkMode = this.darkModeService.isDarkMode;
    this.loadDashboardData();
    this.loadViolations();
  }

  toggleDarkMode() {
    this.darkModeService.toggleDarkMode();
    this.isDarkMode = this.darkModeService.isDarkMode;
  }

  logout() { 
    this.auth.logout(); 
  }

  loadDashboardData() {
    this.loadExams();
    this.loadStudents();
    this.loadAttempts();
  }

  loadExams() {
    this.api.getAllExams().subscribe({
      next: (data: any) => { 
        this.exams = data; 
        this.totalExams = data.length; 
        this.loading = false; 
      },
      error: () => { 
        this.loading = false; 
      }
    });
  }

  loadStudents() {
    this.api.getAllUsers().subscribe({
      next: (data: any) => { 
        this.students = data.filter((u: any) => u.userRole === 'Student'); 
        this.totalStudents = this.students.length; 
      },
      error: (err: any) => console.error('Error loading students:', err)
    });
  }

  loadAttempts() {
    this.api.getAllAttempts().subscribe({
      next: (data: any) => {
        this.attempts = data.filter((a: any) => a.status === 'Completed');
        this.totalAttempts = this.attempts.length;
        const totalScore = this.attempts.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0);
        this.averageScore = this.attempts.length ? Math.round(totalScore / this.attempts.length) : 0;
      },
      error: (err: any) => console.error('Error loading attempts:', err)
    });
  }

  loadViolations() {
    this.loadingViolations = true;
    
    // Load from localStorage only
    const localViolations = JSON.parse(localStorage.getItem('violations') || '[]');
    console.log('Violations from localStorage:', localViolations);
    
    this.violations = localViolations;
    this.filteredViolations = localViolations;
    this.loadingViolations = false;
}

// Remove API calls - use localStorage only

  filterViolations() {
    if (!this.searchTerm) {
      this.filteredViolations = this.violations;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredViolations = this.violations.filter(v => 
        v.studentName?.toLowerCase().includes(term) || 
        v.studentEmail?.toLowerCase().includes(term)
      );
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.filteredViolations = this.violations;
  }

  // ========== GROUPED VIOLATIONS METHODS ==========

  getGroupedViolations(): StudentViolation[] {
    const studentMap = new Map<number, StudentViolation>();
    
    this.filteredViolations.forEach(violation => {
      if (!studentMap.has(violation.studentId)) {
        studentMap.set(violation.studentId, {
          studentId: violation.studentId,
          studentName: violation.studentName,
          studentEmail: violation.studentEmail,
          totalViolations: 0,
          examsAffected: 0,
          exams: [],
          lastViolation: null
        });
      }
      
      const student = studentMap.get(violation.studentId)!;
      student.totalViolations++;
      
      let exam = student.exams.find(e => e.examId === violation.examId);
      if (!exam) {
        exam = {
          examId: violation.examId,
          examTitle: violation.examTitle,
          violations: [],
          lastViolation: null
        };
        student.exams.push(exam);
      }
      
      exam.violations.push(violation);
      
      const violationTime = new Date(violation.timestamp).getTime();
      if (!exam.lastViolation || violationTime > new Date(exam.lastViolation).getTime()) {
        exam.lastViolation = violation.timestamp;
      }
      if (!student.lastViolation || violationTime > new Date(student.lastViolation).getTime()) {
        student.lastViolation = violation.timestamp;
      }
    });
    
    const result: StudentViolation[] = Array.from(studentMap.values()).map(student => ({
      ...student,
      examsAffected: student.exams.length,
      exams: student.exams.sort((a, b) => b.violations.length - a.violations.length)
    }));
    
    return result.sort((a, b) => b.totalViolations - a.totalViolations);
  }

  getSeverityLevel(totalViolations: number): string {
    if (totalViolations >= 3) return 'Critical';
    if (totalViolations >= 2) return 'Warning';
    return 'Monitor';
  }

  getViolationBreakdown(student: StudentViolation): string {
    const types = new Set<string>();
    student.exams.forEach(exam => {
      exam.violations.forEach(v => types.add(v.violationType));
    });
    return Array.from(types).map(t => this.getViolationTypeName(t)).join(', ');
  }

  getUniqueViolationTypes(violations: Violation[]): string[] {
    return [...new Set(violations.map(v => v.violationType))];
  }

  getViolationCountForType(violations: Violation[], type: string): number {
    return violations.filter(v => v.violationType === type).length;
  }

  getExamViolationCount(violations: Violation[]): number {
    return violations.length;
  }

  viewStudentViolations(student: StudentViolation) {
    this.modalTitle = `Violations - ${student.studentName}`;
    this.modalType = 'student-violations';
    this.modalData = {
      student: student,
      violations: this.filteredViolations.filter(v => v.studentId === student.studentId)
    };
    this.showModal = true;
  }

// Send notification to student (store in localStorage for now)
notifyStudent(student: StudentViolation) {
    const message = `⚠️ Academic Integrity Warning ⚠️\n\nDear ${student.studentName},\n\nYou have received ${student.totalViolations} violation(s) across ${student.examsAffected} exam(s).\n\nViolations detected:\n${this.getViolationBreakdown(student)}\n\nPlease ensure you follow exam rules:\n• Stay in fullscreen mode\n• Do not switch tabs\n• Do not click outside the exam window\n\nRepeated violations may lead to automatic exam submission.\n\nRegards,\nExam Portal Admin`;
    
    if (confirm(`Send warning notification to ${student.studentName}?\n\nViolations: ${student.totalViolations}\nExams: ${student.examsAffected}`)) {
        
        // Store notification in localStorage for student to see
        const notification = {
            id: Date.now(),
            studentId: student.studentId,
            studentName: student.studentName,
            message: message,
            type: 'warning',
            read: false,
            timestamp: new Date().toISOString(),
            violations: student.totalViolations
        };
        
        // Get existing notifications
        let notifications = JSON.parse(localStorage.getItem('student_notifications') || '[]');
        notifications.push(notification);
        localStorage.setItem('student_notifications', JSON.stringify(notifications));
        
        // Also store in student's specific notification area
        let studentNotifications = JSON.parse(localStorage.getItem(`notifications_${student.studentId}`) || '[]');
        studentNotifications.push(notification);
        localStorage.setItem(`notifications_${student.studentId}`, JSON.stringify(studentNotifications));
        
        alert(`✅ Warning notification sent to ${student.studentName}!\n\nThey will see it when they log in.`);
        
        // Optional: Play sound effect
        this.playNotificationSound();
    }
}

// Play sound effect for notification
playNotificationSound() {
    const audio = new Audio();
    // Simple beep using Web Audio API
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 800;
        gain.gain.value = 0.3;
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
        oscillator.stop(context.currentTime + 0.5);
    } catch(e) {
        console.log('Sound not supported');
    }
}

  // ========== DELETE VIOLATION METHODS ==========

  deleteStudentViolations(student: StudentViolation) {
    if (confirm(`⚠️ Are you sure you want to delete ALL violations for ${student.studentName}?\n\nThis action cannot be undone!`)) {
      this.api.deleteViolationsByStudent(student.studentId).subscribe({
        next: () => {
          alert(`✅ All violations for ${student.studentName} have been deleted.`);
          this.loadViolations();
        },
        error: (err) => {
          console.error('Delete failed:', err);
          alert('❌ Failed to delete violations. Please try again.');
        }
      });
    }
  }

  deleteViolationType(studentId: number, examId: number, violationType: string) {
    if (confirm(`⚠️ Delete ${this.getViolationTypeName(violationType)} violations for this exam?`)) {
      const violationsToDelete = this.violations.filter(v => 
        v.studentId === studentId && 
        v.examId === examId && 
        v.violationType === violationType
      );
      
      if (violationsToDelete.length === 0) return;
      
      let deleted = 0;
      violationsToDelete.forEach(v => {
        this.api.deleteViolation(v.attemptId).subscribe({
          next: () => {
            deleted++;
            if (deleted === violationsToDelete.length) {
              alert(`✅ Deleted ${deleted} violation(s).`);
              this.loadViolations();
            }
          },
          error: (err) => console.error('Delete failed:', err)
        });
      });
    }
  }

  deleteSingleViolation(attemptId: number) {
    if (confirm(`⚠️ Delete this violation?`)) {
      this.api.deleteViolation(attemptId).subscribe({
        next: () => {
          alert('✅ Violation deleted successfully.');
          this.loadViolations();
          this.closeModal();
        },
        error: (err) => {
          console.error('Delete failed:', err);
          alert('❌ Failed to delete violation.');
        }
      });
    }
  }

  clearAllViolations() {
    if (confirm('⚠️⚠️⚠️ DANGER: This will delete ALL violations from the system!\n\nThis action cannot be undone. Are you absolutely sure?')) {
      const userInput = prompt('Type "DELETE" to confirm:');
      if (userInput === 'DELETE') {
        this.api.clearAllViolations().subscribe({
          next: () => {
            alert('✅ All violations have been cleared.');
            this.loadViolations();
          },
          error: (err) => {
            console.error('Clear failed:', err);
            alert('❌ Failed to clear violations. Please try again.');
          }
        });
      } else {
        alert('Cancelled. No violations were deleted.');
      }
    }
  }

  // ========== STATS METHODS ==========

  getTotalViolations(): number { 
    return this.violations.length; 
  }

  getStudentsWithViolations(): number { 
    return new Set(this.violations.map(v => v.studentId)).size; 
  }

  getExamsWithViolations(): number { 
    return new Set(this.violations.map(v => v.examId)).size; 
  }

  getViolationIcon(type: string): string {
    switch(type) {
      case 'FULLSCREEN_EXIT': return 'fas fa-expand';
      case 'TAB_SWITCH': return 'fas fa-window-restore';
      case 'WINDOW_BLUR': return 'fas fa-eye-slash';
      default: return 'fas fa-exclamation-triangle';
    }
  }

  getViolationTypeName(type: string): string {
    switch(type) {
      case 'FULLSCREEN_EXIT': return 'Fullscreen Exit';
      case 'TAB_SWITCH': return 'Tab Switch';
      case 'WINDOW_BLUR': return 'Window Blur';
      default: return type;
    }
  }

  // ========== EXAM CRUD METHODS ==========

  createExam() { this.router.navigate(['/admin/create-exam']); }
  editExam(id: number) { this.router.navigate(['/admin/edit-exam', id]); }
  addQuestions(id: number) { this.router.navigate(['/admin/add-questions', id]); }
  viewResults(id: number) { this.router.navigate(['/admin/exam-results', id]); }
  
  publishExam(id: number) {
    this.api.publishExam(id).subscribe(() => this.loadExams());
  }

  deleteExam(id: number, title: string) {
    if (confirm(`Delete "${title}"?`)) {
      this.api.deleteExam(id).subscribe(() => this.loadExams());
    }
  }

  // ========== MODAL METHODS ==========

  showExamList() {
    this.modalTitle = 'All Exams';
    this.modalType = 'exams';
    this.modalData = this.exams.map(e => ({ 
      id: e.id, 
      title: e.title, 
      status: e.isPublished ? 'Published' : 'Draft', 
      questions: e.totalQuestions || 0 
    }));
    this.showModal = true;
  }

  showStudentList() {
    this.modalTitle = 'Student Performance';
    this.modalType = 'students';
    this.modalData = this.students.map(s => ({ 
      id: s.id, 
      name: s.fullName, 
      email: s.email, 
      registeredOn: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A', 
      attemptsCount: this.attempts.filter(a => a.userId === s.id).length, 
      avgScore: 0 
    }));
    this.showModal = true;
  }

  showAttemptsList() {
    this.modalTitle = 'Exam Attempts';
    this.modalType = 'attempts';
    this.modalData = this.attempts.map(a => ({ 
      studentName: this.getStudentName(a.userId), 
      examTitle: this.getExamTitle(a.examId), 
      score: a.score, 
      totalMarks: a.totalMarks || 100, 
      percentage: a.percentage, 
      status: a.isPassed ? 'Passed' : 'Failed', 
      submittedAt: new Date(a.submittedAt).toLocaleString() 
    }));
    this.showModal = true;
  }

  showAverageScore() {
    this.modalTitle = 'Average Score Analysis';
    this.modalType = 'averagescore';
    this.modalData = { 
      averageScore: this.averageScore, 
      totalAttempts: this.totalAttempts, 
      totalStudents: this.totalStudents, 
      passRate: this.passRate 
    };
    this.showModal = true;
  }

  getStudentName(id: number): string { 
    const s = this.students.find(s => s.id === id); 
    return s ? s.fullName : 'Unknown'; 
  }

  getExamTitle(id: number): string { 
    const e = this.exams.find(e => e.id === id); 
    return e ? e.title : 'Unknown'; 
  }

  viewStudentDetails(id: number) { 
    this.showModal = false; 
    this.router.navigate(['/admin/student-performance', id]); 
  }

  closeModal() { 
    this.showModal = false; 
  }
}