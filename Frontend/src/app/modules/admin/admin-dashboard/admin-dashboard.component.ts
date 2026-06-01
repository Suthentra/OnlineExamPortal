import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

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

  // Modal properties
  showModal: boolean = false;
  modalTitle: string = '';
  modalData: any = [];
  modalType: string = '';

  // Statistics
  totalExams: number = 0;
  totalStudents: number = 0;
  totalAttempts: number = 0;
  passRate: number = 0;
  passedCount: number = 0;
  failedCount: number = 0;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadDashboardData();
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
      error: (err) => {
        console.error('Error loading students:', err);
      }
    });
  }

  loadAttempts() {
    this.api.getAllAttempts().subscribe({
      next: (data: any) => {
        this.attempts = data.filter((a: any) => a.status === 'Completed');
        this.totalAttempts = this.attempts.length;
        this.passedCount = this.attempts.filter((a: any) => a.isPassed).length;
        this.failedCount = this.totalAttempts - this.passedCount;
        this.passRate = this.totalAttempts > 0 
          ? Math.round((this.passedCount / this.totalAttempts) * 100) 
          : 0;
      },
      error: (err) => {
        console.error('Error loading attempts:', err);
      }
    });
  }

  // ========== CARD CLICK HANDLERS ==========

  showExamList() {
    this.modalTitle = '📋 All Exams';
    this.modalType = 'exams';
    this.modalData = this.exams.map(e => ({
      id: e.id,
      title: e.title,
      status: e.isPublished ? 'Published ✅' : 'Draft 📝',
      questions: e.totalQuestions || 0
    }));
    this.showModal = true;
  }

  showStudentList() {
    this.modalTitle = '👨‍🎓 Student Performance';
    this.modalType = 'students';
    this.modalData = this.students.map(s => {
      const studentAttempts = this.attempts.filter(a => a.userId === s.id);
      const avgScore = studentAttempts.length > 0
        ? Math.round(studentAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / studentAttempts.length)
        : 0;
      return {
        id: s.id,
        name: s.fullName,
        email: s.email,
        attemptsCount: studentAttempts.length,
        avgScore: avgScore,
        lastAttempt: studentAttempts.length > 0 ? studentAttempts[studentAttempts.length - 1].submittedAt : null
      };
    });
    this.showModal = true;
  }

  showAttemptsList() {
    this.modalTitle = '📊 All Exam Attempts';
    this.modalType = 'attempts';
    this.modalData = this.attempts.map(a => ({
      studentName: this.getStudentName(a.userId),
      examTitle: this.getExamTitle(a.examId),
      score: a.score,
      totalMarks: a.totalMarks || 100,
      percentage: a.percentage,
      status: a.isPassed ? '✅ Passed' : '❌ Failed',
      submittedAt: new Date(a.submittedAt).toLocaleString()
    }));
    this.showModal = true;
  }

  showPassRate() {
    this.modalTitle = '📈 Pass Rate Analysis';
    this.modalType = 'passrate';
    this.modalData = {
      passed: this.passedCount,
      failed: this.failedCount,
      total: this.totalAttempts,
      passRate: this.passRate
    };
    this.showModal = true;
  }

  // ========== EXAM CRUD METHODS ==========

  createExam() {
    this.router.navigate(['/admin/create-exam']);
  }

  editExam(examId: number) {
    this.router.navigate(['/admin/edit-exam', examId]);
  }

  addQuestions(examId: number) {
    this.router.navigate(['/admin/add-questions', examId]);
  }

  publishExam(examId: number) {
    this.api.publishExam(examId).subscribe({
      next: () => {
        this.loadExams();
      },
      error: (err) => {
        console.error('Failed to publish:', err);
      }
    });
  }

  deleteExam(examId: number) {
    if (confirm('Are you sure you want to delete this exam? All questions will also be deleted.')) {
      this.api.deleteExam(examId).subscribe({
        next: () => {
          this.loadExams();
        },
        error: (err) => {
          console.error('Failed to delete:', err);
        }
      });
    }
  }

  viewResults(examId: number) {
    this.router.navigate(['/admin/exam-results', examId]);
  }

  // ========== HELPER METHODS ==========

  getStudentName(userId: number): string {
    const student = this.students.find(s => s.id === userId);
    return student ? student.fullName : 'Unknown';
  }

  getExamTitle(examId: number): string {
    const exam = this.exams.find(e => e.id === examId);
    return exam ? exam.title : 'Unknown';
  }

  viewStudentDetails(studentId: number) {
    this.showModal = false;
    this.router.navigate(['/admin/student-performance', studentId]);
  }

  closeModal() {
    this.showModal = false;
  }

  logout() {
    this.auth.logout();
  }
}