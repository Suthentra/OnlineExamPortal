import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';

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
  attemptedExamIds: Set<number> = new Set<number>();
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
  activeTab: string = 'dashboard';
  isDarkMode: boolean = false;

  // Notifications
  showNotifications: boolean = false;
  notifications: any[] = [];
  unreadCount: number = 0;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.checkDarkMode();
    this.loadDashboardData();
    this.loadNotifications();
  }

  checkDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      this.isDarkMode = true;
      document.body.classList.add('dark-mode');
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
      this.toast.info('Dark mode enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
      this.toast.info('Light mode enabled');
    }
  }

  loadDashboardData() {
    this.toast.showLoading('Loading your dashboard...');
    this.loadAllExams();
    this.loadResults();
    this.loadRank();
  }

  loadAllExams() {
    this.api.getPublishedExams().subscribe({
      next: (data: any) => {
        console.log('Published exams received:', data);
        this.allExams = data || [];
        
        this.api.getStudentResults(this.user.userId).subscribe({
          next: (results: any) => {
            console.log('Student results:', results);
            this.results = results || [];
            
            // Create set of attempted exam IDs
            this.attemptedExamIds = new Set<number>(
              this.results.map((r: any) => r.examId)
            );
            
            console.log('Attempted exam IDs:', this.attemptedExamIds);
            
            // Filter available exams (not attempted)
            this.availableExamsList = this.allExams.filter(
              (exam: any) => !this.attemptedExamIds.has(exam.id)
            );
            
            this.availableExams = this.availableExamsList.length;
            this.completedExams = this.attemptedExamIds.size;
            this.loading = false;
            this.toast.closeLoading();
            
            if (this.availableExams === 0 && this.completedExams > 0) {
              this.toast.info('🎉 You have completed all available exams!');
            } else if (this.availableExams === 0) {
              this.toast.info('No exams available at the moment.');
            } else {
              this.toast.success(`${this.availableExams} exam(s) available to take`);
            }
          },
          error: (err) => {
            console.error('Error loading results:', err);
            this.availableExamsList = this.allExams;
            this.availableExams = this.allExams.length;
            this.loading = false;
            this.toast.closeLoading();
            this.toast.error('Failed to load your results');
          }
        });
      },
      error: (err) => {
        console.error('Error loading exams:', err);
        this.loading = false;
        this.toast.closeLoading();
        this.toast.error('Failed to load available exams');
      }
    });
  }

  loadResults() {
    this.api.getStudentResults(this.user.userId).subscribe({
      next: (data: any) => {
        console.log('Student results:', data);
        this.results = data || [];
        this.completedExams = this.results.length;
        this.calculateAverageScore();
      },
      error: (err) => {
        console.error('Error loading results:', err);
        this.toast.error('Failed to load your results');
      }
    });
  }

  loadRank() {
    this.api.getStudentRank(this.user.userId).subscribe({
      next: (data: any) => {
        console.log('Student rank:', data);
        this.studentRank = data.rank || 0;
        this.totalStudents = data.totalStudents || 0;
        
        if (this.studentRank === 1) {
          this.toast.success('🏆 You are the Top Performer!');
        }
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
      this.highestScore = 0;
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
    return this.attemptedExamIds.has(examId);
  }

  getExamResult(examId: number): any {
    return this.results.find(r => r.examId === examId);
  }

  getExamStatus(examId: number): string {
    const result = this.getExamResult(examId);
    if (result) {
      return result.isPassed ? '✅ Passed' : '❌ Failed';
    }
    return 'Not Attempted';
  }

  getExamScore(examId: number): string {
    const result = this.getExamResult(examId);
    if (result) {
      return `${result.percentage}%`;
    }
    return '--';
  }

  async startExam(examId: number) {
    // Check if exam is already attempted
    if (this.isExamAttempted(examId)) {
      this.toast.warning('You have already completed this exam.');
      return;
    }
    
    const confirmed = await this.toast.confirm(
      'Are you ready to start the exam? The timer will start immediately.',
      'Start Exam'
    );
    
    if (confirmed) {
      this.toast.info('Loading exam...');
      this.router.navigate(['/exam', examId]);
    }
  }

  viewResultDetail(attemptId: number) {
    this.toast.info('Loading result details...');
    this.router.navigate(['/result-detail', attemptId]);
  }

  viewAllResults() {
    this.toast.info('Loading all results...');
    this.router.navigate(['/results']);
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

  // ========== NOTIFICATION METHODS ==========

  loadNotifications() {
    const studentId = this.user?.userId;
    const notifications = JSON.parse(localStorage.getItem(`notifications_${studentId}`) || '[]');
    this.notifications = notifications.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    this.unreadCount = this.notifications.filter((n: any) => !n.read).length;
  }

  toggleNotificationDropdown() {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(notificationId: number) {
    const studentId = this.user?.userId;
    let notifications = JSON.parse(localStorage.getItem(`notifications_${studentId}`) || '[]');
    notifications = notifications.map((n: any) => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    localStorage.setItem(`notifications_${studentId}`, JSON.stringify(notifications));
    this.loadNotifications();
    this.toast.info('Notification marked as read');
  }

  async clearAllNotifications() {
    const confirmed = await this.toast.confirm(
      'Clear all notifications?',
      'Clear Notifications'
    );
    
    if (confirmed) {
      const studentId = this.user?.userId;
      localStorage.setItem(`notifications_${studentId}`, '[]');
      this.loadNotifications();
      this.showNotifications = false;
      this.toast.success('All notifications cleared');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown')) {
      this.showNotifications = false;
    }
  }

  async logout() {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to logout?',
      'Logout'
    );
    
    if (confirmed) {
      this.toast.info('Logging out...');
      this.auth.logout();
    }
  }
}