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
    
    this.api.getAllViolations().subscribe({
      next: (data: any) => {
        console.log('Violations from API:', data);
        this.violations = data;
        this.filteredViolations = data;
        this.loadingViolations = false;
      },
      error: (err: any) => {
        console.error('API error, loading from localStorage:', err);
        const localViolations = this.api.getLocalViolations();
        console.log('Violations from localStorage:', localViolations);
        this.violations = localViolations;
        this.filteredViolations = localViolations;
        this.loadingViolations = false;
      }
    });
  }

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
      
      // Check if exam already exists
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
      
      // Update last violation time
      const violationTime = new Date(violation.timestamp).getTime();
      if (!exam.lastViolation || violationTime > new Date(exam.lastViolation).getTime()) {
        exam.lastViolation = violation.timestamp;
      }
      if (!student.lastViolation || violationTime > new Date(student.lastViolation).getTime()) {
        student.lastViolation = violation.timestamp;
      }
    });
    
    // Convert to array and calculate examsAffected
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

  notifyStudent(student: StudentViolation) {
    if (confirm(`Send warning notification to ${student.studentName}?\n\nTotal Violations: ${student.totalViolations}\nExams Affected: ${student.examsAffected}`)) {
      alert(`📧 Warning notification sent to ${student.studentName}`);
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