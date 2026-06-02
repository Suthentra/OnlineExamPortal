import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false
})
export class DashboardComponent implements OnInit {
  user: any;
  allExams: any[] = [];
  availableExamsList: any[] = [];
  results: any[] = [];
  attemptedExams: Set<number> = new Set<number>();
  loading = true;
  errorMessage = '';

  // Statistics
  availableExams: number = 0;
  completedExams: number = 0;
  averageScore: number = 0;
  studentRank: number = 0;
  totalStudents: number = 0;
  highestScore: number = 0;

  // For UI
  activeTab: string = 'exams';

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
    this.loadAllExams();
    this.loadResults();
    this.loadRank();
  }

  loadAllExams() {
    this.api.getPublishedExams().subscribe({
      next: (data: any) => {
        this.allExams = data;
        
        this.api.getStudentResults(this.user.userId).subscribe({
          next: (results: any) => {
            // Explicitly convert to number array
            const examIds: number[] = results.map((r: any) => r.examId);
            const completedExamIdsSet = new Set<number>(examIds);
            
            this.availableExamsList = data.filter((exam: any) => !completedExamIdsSet.has(exam.id));
            this.availableExams = this.availableExamsList.length;
            
            // Clear and add each ID
            this.attemptedExams.clear();
            examIds.forEach(id => this.attemptedExams.add(id));
            
            this.loading = false;
          },
          error: () => {
            this.availableExamsList = data;
            this.availableExams = data.length;
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadResults() {
    this.api.getStudentResults(this.user.userId).subscribe({
      next: (data: any) => {
        this.results = data;
        this.completedExams = data.length;
        this.calculateAverageScore();
      },
      error: (err) => {
        console.error('Error loading results:', err);
      }
    });
  }

  loadRank() {
    this.api.getStudentRank(this.user.userId).subscribe({
      next: (data: any) => {
        this.studentRank = data.rank;
        this.totalStudents = data.totalStudents;
      },
      error: (err) => {
        console.error('Error loading rank:', err);
        this.totalStudents = 4;
        this.studentRank = 1;
      }
    });
  }

  calculateAverageScore() {
    if (this.results.length === 0) {
      this.averageScore = 0;
      return;
    }
    const total = this.results.reduce((sum, r) => sum + (r.percentage || 0), 0);
    this.averageScore = Math.round(total / this.results.length);
    this.highestScore = Math.max(...this.results.map(r => r.percentage || 0), 0);
  }

  getPassRate(): number {
    if (this.results.length === 0) return 0;
    const passedCount = this.results.filter(r => r.isPassed).length;
    return Math.round((passedCount / this.results.length) * 100);
  }

  isExamAttempted(examId: number): boolean {
    return this.attemptedExams.has(examId);
  }

  startExam(examId: number) {
    if (this.isExamAttempted(examId)) {
      alert('You have already completed this exam.');
      return;
    }
    if (confirm('Are you ready to start the exam? The timer will start immediately.')) {
      this.router.navigate(['/exam', examId]);
    }
  }

  viewResultDetail(attemptId: number) {
    this.router.navigate(['/result-detail', attemptId]);
  }

  getRankMessage(): string {
    if (this.studentRank === 1) return '🏆 Excellent! You are the Top Performer!';
    if (this.studentRank <= 3) return '🌟 Outstanding performance!';
    if (this.studentRank <= 10) return '👍 Great job! Keep it up!';
    if (this.studentRank <= 20) return '📚 Good effort! Aim higher!';
    return '💪 Keep practicing to improve your rank!';
  }

  getRankIcon(): string {
    if (this.studentRank === 1) return '🥇';
    if (this.studentRank === 2) return '🥈';
    if (this.studentRank === 3) return '🥉';
    return '📊';
  }

  logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
}