import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Subject, forkJoin, of } from 'rxjs';
import { map, catchError, finalize, takeUntil, tap } from 'rxjs/operators';

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
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  user: any;
  exams: any[] = [];
  students: any[] = [];
  attempts: any[] = [];
  loading = true;
  activeTab: string = 'dashboard';

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

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadDashboardData();
    this.loadViolations();
  }

  ngAfterViewInit() {
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'exams') {
        this.activeTab = 'exams';
      } else if (fragment === 'results') {
        this.activeTab = 'results';
      } else if (fragment === 'violations') {
        this.activeTab = 'violations';
      } else if (fragment === 'dashboard') {
        this.activeTab = 'dashboard';
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.router.navigate([], { fragment: tab, replaceUrl: true });
  }

  async logout() {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to logout?<br><br>You will need to login again to access the admin dashboard.',
      'Logout Confirmation'
    );
    
    if (confirmed) {
      this.toast.info('Logging out...');
      this.auth.logout();
    }
  }

  loadDashboardData() {
    const exams$ = this.api.getAllExams().pipe(catchError(() => of([])));
    const users$ = this.api.getAllUsers().pipe(catchError(() => of([])));
    const attempts$ = this.api.getAllAttempts().pipe(catchError(() => of([])));

    forkJoin([exams$, users$, attempts$])
      .pipe(
        tap(() => this.toast.showLoading('Loading admin dashboard...')),
        map((data: any) => {
          const exams = data[0] || [];
          const users = data[1] || [];
          const attempts = data[2] || [];
          
          const students = users.filter((u: any) => u.userRole === 'Student');
          const completedAttempts = attempts.filter((a: any) => a.status === 'Completed');
          const totalScore = completedAttempts.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0);
          const avgScore = completedAttempts.length ? Math.round(totalScore / completedAttempts.length) : 0;
          const passRate = completedAttempts.length ? 
            Math.round((completedAttempts.filter((a: any) => a.isPassed).length / completedAttempts.length) * 100) : 0;
          
          return {
            exams: exams,
            students: students,
            attempts: completedAttempts,
            totalExams: exams.length,
            totalStudents: students.length,
            totalAttempts: completedAttempts.length,
            averageScore: avgScore,
            passRate: passRate
          };
        }),
        catchError((err: any) => {
          console.error('Error loading dashboard:', err);
          this.toast.error('Failed to load dashboard');
          return of({
            exams: [],
            students: [],
            attempts: [],
            totalExams: 0,
            totalStudents: 0,
            totalAttempts: 0,
            averageScore: 0,
            passRate: 0
          });
        }),
        finalize(() => {
          this.loading = false;
          this.toast.closeLoading();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          this.exams = data.exams;
          this.students = data.students;
          this.attempts = data.attempts;
          this.totalExams = data.totalExams;
          this.totalStudents = data.totalStudents;
          this.totalAttempts = data.totalAttempts;
          this.averageScore = data.averageScore;
          this.passRate = data.passRate;
          this.toast.success(`Loaded ${data.totalExams} exams, ${data.totalStudents} students`);
        }
      });
  }

  loadStudents() {
    this.api.getAllUsers().subscribe({
      next: (data: any) => { 
        this.students = data.filter((u: any) => u.userRole === 'Student'); 
        this.totalStudents = this.students.length;
      },
      error: (err: any) => {
        console.error('Error loading students:', err);
        this.toast.error('Failed to load students');
      }
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
      error: (err: any) => {
        console.error('Error loading attempts:', err);
        this.toast.error('Failed to load attempts');
      }
    });
  }

  loadViolations() {
    this.loadingViolations = true;
    
    const localViolations = JSON.parse(localStorage.getItem('violations') || '[]');
    
    this.violations = localViolations;
    this.filteredViolations = localViolations;
    this.loadingViolations = false;
    
    if (localViolations.length === 0) {
      this.toast.info('No violations found');
    } else {
      this.toast.info(`Loaded ${localViolations.length} violations`);
    }
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
    this.toast.info('Search cleared');
  }

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
    this.toast.info(`Viewing violations for ${student.studentName}`);
  }

  async notifyStudent(student: StudentViolation) {
    const confirmed = await this.toast.confirm(
      `Send warning notification to ${student.studentName}?\n\n` +
      `Violations: ${student.totalViolations}\n` +
      `Exams Affected: ${student.examsAffected}`,
      'Send Warning'
    );
    
    if (confirmed) {
      const notification = {
        id: Date.now(),
        studentId: student.studentId,
        studentName: student.studentName,
        message: `⚠️ Academic Integrity Warning ⚠️\n\nDear ${student.studentName},\n\nYou have received ${student.totalViolations} violation(s) across ${student.examsAffected} exam(s).\n\nPlease ensure you follow exam rules:\n• Stay in fullscreen mode\n• Do not switch tabs\n• Do not click outside the exam window\n\nRepeated violations may lead to automatic exam submission.\n\nRegards,\nExam Portal Admin`,
        type: 'warning',
        read: false,
        timestamp: new Date().toISOString(),
        violations: student.totalViolations
      };
      
      let notifications = JSON.parse(localStorage.getItem('student_notifications') || '[]');
      notifications.push(notification);
      localStorage.setItem('student_notifications', JSON.stringify(notifications));
      
      let studentNotifications = JSON.parse(localStorage.getItem(`notifications_${student.studentId}`) || '[]');
      studentNotifications.push(notification);
      localStorage.setItem(`notifications_${student.studentId}`, JSON.stringify(studentNotifications));
      
      this.toast.success(`Warning notification sent to ${student.studentName}`);
      this.playNotificationSound();
    }
  }

  playNotificationSound() {
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

  async clearAllViolations() {
    const confirmed = await this.toast.confirmDelete('ALL violation records');
    if (confirmed) {
      localStorage.removeItem('violations');
      this.violations = [];
      this.filteredViolations = [];
      this.toast.success('All violations cleared successfully');
      this.loadViolations();
    }
  }

  // ========== EXAM CRUD METHODS ==========

  createExam() { 
    this.router.navigate(['/admin/create-exam']); 
  }
  
  editExam(id: number) { 
    this.router.navigate(['/admin/edit-exam', id]); 
  }
  
  addQuestions(id: number) { 
    this.router.navigate(['/admin/add-questions', id]); 
  }
  
  viewResults(id: number) { 
    this.router.navigate(['/admin/exam-results', id]); 
  }
  
  // ===== FIXED: publishExam with ExpressionChangedError fix =====
  async publishExam(id: number) {
    const exam = this.exams.find(e => e.id === id);
    
    // Check if exam can be published
    if (exam?.startTime && new Date(exam.startTime) <= new Date()) {
      const confirmed = await this.toast.confirm(
        `⚠️ Warning: "${exam?.title}" has a start time in the past.\n\n` +
        `Start Time: ${new Date(exam.startTime).toLocaleString()}\n` +
        `Current Time: ${new Date().toLocaleString()}\n\n` +
        `Do you still want to publish this exam?`,
        'Publish Exam'
      );
      if (!confirmed) return;
    } else {
      const confirmed = await this.toast.confirm(
        `Publish "${exam?.title}"? Students will be able to take this exam.`,
        'Publish Exam'
      );
      if (!confirmed) return;
    }
    
    this.toast.showLoading('Publishing exam...');
    this.api.publishExam(id).subscribe({
      next: (response: any) => {
        this.toast.closeLoading();
        this.toast.success(response.message || 'Exam published successfully!');
        this.loadExams();
        // ===== FIX: Use setTimeout to avoid ExpressionChanged error =====
        setTimeout(() => {
          this.activeTab = 'exams';
        }, 0);
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Publish error:', err);
        this.toast.error(err.error?.message || 'Failed to publish exam');
      }
    });
  }

  // ===== FIXED: deleteExam with ExpressionChangedError fix =====
  async deleteExam(id: number, title: string) {
    const hasQuestions = this.exams.find(e => e.id === id)?.totalQuestions > 0;
    const confirmed = await this.toast.confirmExamDelete(title, hasQuestions);
    
    if (confirmed) {
      this.toast.showLoading('Deleting exam...');
      this.api.deleteExam(id).subscribe({
        next: () => {
          this.toast.closeLoading();
          this.toast.success(`"${title}" has been deleted`);
          this.loadExams();
          // ===== FIX: Use setTimeout to avoid ExpressionChanged error =====
          setTimeout(() => {
            this.activeTab = 'exams';
          }, 0);
        },
        error: () => {
          this.toast.closeLoading();
          this.toast.error('Failed to delete exam');
        }
      });
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
    this.toast.info(`Showing ${this.exams.length} exams`);
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
    this.toast.info(`Showing ${this.students.length} students`);
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
    this.toast.info(`Showing ${this.attempts.length} attempts`);
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

  loadExams() {
    this.api.getAllExams().subscribe({
      next: (data: any) => {
        this.exams = data;
        this.totalExams = data.length;
      },
      error: (err) => {
        console.error('Error loading exams:', err);
        this.toast.error('Failed to load exams');
      }
    });
  }
}