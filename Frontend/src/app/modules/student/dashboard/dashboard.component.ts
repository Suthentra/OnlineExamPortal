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
  exams: any[] = [];
  results: any[] = [];
  attemptedExams: Set<number> = new Set();
  loading = true;
  loadingResults = true;
  activeTab: string = 'dashboard';

  recentActivities: any[] = [];

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadExams();
    this.loadResults();
  }

  loadExams() {
    this.api.getPublishedExams().subscribe({
      next: (data: any) => {
        this.exams = data;
        this.checkAttemptedExams();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadResults() {
    this.loadingResults = true;
    this.api.getStudentResults(this.user.userId).subscribe({
      next: (data: any) => {
        this.results = data;
        this.updateRecentActivity();
        this.loadingResults = false;
      },
      error: () => {
        this.loadingResults = false;
      }
    });
  }

  checkAttemptedExams() {
    this.exams.forEach(exam => {
      this.api.checkExamAttempted(exam.id).subscribe({
        next: (res: any) => {
          if (res.attempted) {
            this.attemptedExams.add(exam.id);
          }
        }
      });
    });
  }

  isExamAttempted(examId: number): boolean {
    return this.attemptedExams.has(examId);
  }

  startExam(examId: number) {
    if (this.isExamAttempted(examId)) {
      alert('You have already completed this exam.');
      return;
    }
    this.router.navigate(['/exam', examId]);
  }

  viewResultDetail(attemptId: number) {
    this.router.navigate(['/result-detail', attemptId]);
  }

  updateRecentActivity() {
    this.recentActivities = this.results.slice(0, 3).map(r => ({
      type: 'exam',
      icon: 'fas fa-file-alt',
      message: `Completed ${r.examTitle} with ${r.percentage}%`,
      time: this.getTimeAgo(r.submittedAt)
    }));
  }

  getTimeAgo(date: string): string {
    const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  get availableExams(): number {
    return this.exams.filter(e => !this.isExamAttempted(e.id)).length;
  }

  get completedExams(): number {
    return this.results.length;
  }

  get averageScore(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, r) => sum + r.percentage, 0);
    return Math.round(total / this.results.length);
  }

  get rank(): number {
    return 15; // Placeholder - can be calculated from leaderboard
  }

  logout() {
    this.auth.logout();
  }
}