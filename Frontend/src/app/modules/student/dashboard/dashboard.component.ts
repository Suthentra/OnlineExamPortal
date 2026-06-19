import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Subject, forkJoin, of } from 'rxjs';
import { map, catchError, finalize, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: any;
  allExams: any[] = [];
  availableExamsList: any[] = [];
  attemptedExamsList: any[] = [];
  results: any[] = [];
  attemptedExamIds: Set<number> = new Set<number>();
  loading = true;
  errorMessage = '';

  availableExams: number = 0;
  completedExams: number = 0;
  averageScore: number = 0;
  studentRank: number = 0;
  totalStudents: number = 0;
  highestScore: number = 0;

  activeTab: string = 'dashboard';
  isDarkMode: boolean = false;

  showNotifications: boolean = false;
  notifications: any[] = [];
  unreadCount: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    console.log('👤 Current User:', this.user);
    this.checkDarkMode();
    this.loadDashboardData();
    this.loadNotifications();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.loadAllExams();
    this.loadResults();
    this.loadRank();
  }

  loadAllExams() {
    const studentId = this.user?.userId;
    console.log('👤 Student ID:', studentId);
    
    if (!studentId) {
      console.error('❌ No student ID found!');
      this.toast.error('User not authenticated');
      this.loading = false;
      return;
    }
    
    const exams$ = this.api.getPublishedExams().pipe(
      tap((data: any) => {
        console.log('📚 PUBLISHED EXAMS FROM API:', data);
        console.log('📚 Number of exams:', data?.length || 0);
      }),
      catchError((err) => {
        console.error('❌ Error fetching exams:', err);
        this.toast.error('Failed to load exams');
        return of([]);
      })
    );
    
    const results$ = this.api.getStudentResults(studentId).pipe(
      tap((data: any) => {
        console.log('📝 STUDENT RESULTS FROM API:', data);
        console.log('📝 Number of results:', data?.length || 0);
      }),
      catchError((err) => {
        console.error('❌ Error fetching results:', err);
        return of([]);
      })
    );
    
    const rank$ = this.api.getStudentRank(studentId).pipe(
      tap((data: any) => {
        console.log('🏆 STUDENT RANK:', data);
      }),
      catchError((err) => {
        console.error('❌ Error fetching rank:', err);
        return of({ rank: 0, totalStudents: 0 });
      })
    );

    forkJoin([exams$, results$, rank$])
      .pipe(
        tap(() => {
          console.log('⏳ Loading dashboard data...');
          this.toast.showLoading('Loading dashboard...');
        }),
        map((data: any) => {
          const exams = data[0] || [];
          const results = data[1] || [];
          const rank = data[2] || { rank: 0, totalStudents: 0 };
          
          console.log('🔍 EXAMS FROM API:', exams);
          console.log('🔍 RESULTS FROM API:', results);
          
          // ===== Get attempted exam IDs from results =====
          const attemptedExamIds = new Set<number>();
          results.forEach((result: any) => {
            if (result.examId) {
              attemptedExamIds.add(result.examId);
              console.log(`🎯 Marking exam ${result.examId} as attempted`);
            }
          });
          console.log('🎯 Attempted Exam IDs:', attemptedExamIds);
          
          const now = new Date();
          console.log('🕐 Current Time:', now);
          
          // ===== Categorize exams =====
          // 1. Available Exams: Published, NOT attempted, NOT expired
          const availableExamsList = exams.filter((exam: any) => {
            const isAttempted = attemptedExamIds.has(exam.id);
            const endTime = new Date(exam.endTime);
            const isExpired = now > endTime;
            const isPublished = exam.isPublished === true;
            
            return isPublished && !isAttempted && !isExpired;
          });
          
          // 2. Attempted Exams: Published AND Attempted
          const attemptedExamsList = exams.filter((exam: any) => {
            const isPublished = exam.isPublished === true;
            const isAttempted = attemptedExamIds.has(exam.id);
            return isPublished && isAttempted;
          });
          
          // 3. Expired Exams: Published, NOT attempted, BUT Expired
          const expiredExamsList = exams.filter((exam: any) => {
            const isAttempted = attemptedExamIds.has(exam.id);
            const endTime = new Date(exam.endTime);
            const isExpired = now > endTime;
            const isPublished = exam.isPublished === true;
            
            return isPublished && !isAttempted && isExpired;
          });
          
          console.log('✅ Available Exams (not attempted, not expired):', availableExamsList);
          console.log('📋 Attempted Exams:', attemptedExamsList);
          console.log('⏰ Expired Exams (not attempted):', expiredExamsList);
          
          // ===== Combine available + expired for display =====
          const allVisibleExams = [...availableExamsList, ...expiredExamsList];
          
          return {
            availableExams: availableExamsList.length,
            completedExams: attemptedExamIds.size,
            availableExamsList: allVisibleExams,
            attemptedExamsList: attemptedExamsList,
            expiredExamsList: expiredExamsList,
            results: results,
            rank: rank.rank || 0,
            totalStudents: rank.totalStudents || 0,
            attemptedExamIds: attemptedExamIds
          };
        }),
        catchError((err: any) => {
          console.error('❌ Error loading dashboard:', err);
          this.toast.error('Failed to load dashboard');
          return of({
            availableExams: 0,
            completedExams: 0,
            availableExamsList: [],
            attemptedExamsList: [],
            expiredExamsList: [],
            results: [],
            rank: 0,
            totalStudents: 0,
            attemptedExamIds: new Set<number>()
          });
        }),
        finalize(() => {
          this.loading = false;
          this.toast.closeLoading();
          console.log('✅ Dashboard loading complete');
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          console.log('📊 FINAL DATA:', data);
          
          this.availableExams = data.availableExams;
          this.completedExams = data.completedExams;
          this.availableExamsList = data.availableExamsList;
          this.attemptedExamsList = data.attemptedExamsList;
          this.results = data.results;
          this.studentRank = data.rank;
          this.totalStudents = data.totalStudents;
          this.attemptedExamIds = data.attemptedExamIds || new Set<number>();
          
          // ===== DEBUG: Check attemptedExamsList =====
          console.log('🔍 DEBUG - attemptedExamsList:', this.attemptedExamsList);
          console.log('🔍 DEBUG - attemptedExamsList length:', this.attemptedExamsList?.length);
          
          if (this.attemptedExamsList && this.attemptedExamsList.length > 0) {
            this.attemptedExamsList.forEach((exam: any, index: number) => {
              console.log(`📋 Attempted Exam ${index + 1}:`, {
                id: exam.id,
                title: exam.title,
                result: this.getExamResult(exam.id)
              });
            });
          }
          
          this.calculateAverageScore();
          this.toast.closeLoading();
          
          console.log('📊 Final Stats:');
          console.log(`  - Available/Expired Exams: ${this.availableExamsList.length}`);
          console.log(`  - Completed Exams: ${this.completedExams}`);
          console.log(`  - Results:`, this.results);
          
          if (this.availableExamsList.length === 0 && this.completedExams === 0) {
            this.toast.info('No exams available at the moment.');
          } else if (this.availableExamsList.length === 0 && this.completedExams > 0) {
            this.toast.info('🎉 You have completed all available exams!');
          } else {
            this.toast.success(`${this.availableExamsList.length} exam(s) available to take`);
          }
        },
        error: (err) => {
          console.error('❌ Subscription error:', err);
          this.loading = false;
          this.toast.closeLoading();
        }
      });
  }

  loadResults() {
    const studentId = this.user?.userId;
    if (!studentId) {
      console.error('❌ No student ID for loading results');
      return;
    }
    
    this.api.getStudentResults(studentId).subscribe({
      next: (data: any) => {
        console.log('📝 Results loaded:', data);
        this.results = data || [];
        this.completedExams = this.results.length;
        
        this.results.forEach((result: any) => {
          if (result.examId) {
            this.attemptedExamIds.add(result.examId);
          }
        });
        
        console.log('🎯 Attempted Exam IDs after loading results:', this.attemptedExamIds);
        this.calculateAverageScore();
      },
      error: (err) => {
        console.error('❌ Error loading results:', err);
        this.toast.error('Failed to load your results');
      }
    });
  }

  loadRank() {
    const studentId = this.user?.userId;
    if (!studentId) {
      console.error('❌ No student ID for loading rank');
      return;
    }
    
    this.api.getStudentRank(studentId).subscribe({
      next: (data: any) => {
        console.log('🏆 Rank loaded:', data);
        this.studentRank = data.rank || 0;
        this.totalStudents = data.totalStudents || 0;
        
        if (this.studentRank === 1) {
          this.toast.success('🏆 You are the Top Performer!');
        }
      },
      error: (err) => {
        console.error('❌ Error loading rank:', err);
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
      return result.isPassed ? 'Passed' : 'Failed';
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
    console.log('🚀 Starting exam:', examId);
    
    const exam = this.availableExamsList.find(e => e.id === examId);
    if (!exam) {
      console.error('❌ Exam not found in available list:', examId);
      this.toast.error('Exam not found');
      return;
    }

    console.log('📋 Exam details:', exam);

    const now = new Date();
    const endTime = new Date(exam.endTime);
    
    if (now > endTime) {
      console.error('❌ Exam is expired!');
      this.toast.error('❌ This exam has expired. You cannot start it.');
      return;
    }

    const startTime = new Date(exam.startTime);
    
    if (now < startTime) {
      console.warn('⚠️ Exam has not started yet');
      this.toast.warning(`⏳ This exam starts on ${startTime.toLocaleString()}`);
      return;
    }

    if (this.isExamAttempted(examId)) {
      console.warn('⚠️ Exam already attempted:', examId);
      this.toast.warning('You have already completed this exam.');
      return;
    }
    
    console.log('✅ Exam is available and can be started!');
    
    const confirmed = await this.toast.confirm(
      'Are you ready to start the exam? The timer will start immediately.',
      'Start Exam'
    );
    
    if (confirmed) {
      console.log('🚀 Navigating to exam...');
      this.toast.info('Loading exam...');
      this.router.navigate(['/exam', examId]);
    }
  }

  viewResultDetail(attemptId: number) {
    console.log('📊 Viewing result details for attempt:', attemptId);
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

  loadNotifications() {
    const studentId = this.user?.userId;
    if (!studentId) return;
    
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
    if (!studentId) return;
    
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
      if (studentId) {
        localStorage.setItem(`notifications_${studentId}`, '[]');
      }
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