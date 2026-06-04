import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-exam',
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.css'],
  standalone: false
})
export class ExamComponent implements OnInit, OnDestroy {
  examId: number;
  examTitle = '';
  questions: any[] = [];
  attemptId = 0;
  currentIndex = 0;
  selectedAnswers: string[] = [];
  timeLeft = 0;
  timer: any;
  loading = true;
  submitted = false;
  errorMessage = '';
  user: any;
  isFullscreen: boolean = false;
  
  public fullScreenExitCount: number = 0;
  public maxFullScreenExits: number = 3;
  public tabSwitchCount: number = 0;
  public maxTabSwitches: number = 3;
  private isReenteringFullscreen: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private api: ApiService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.user = this.auth.getUser();
    this.startExam();
    this.setupAntiCheatMeasures();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.exitFullscreen();
  }

  startExam() {
    this.api.startExam({ examId: this.examId, studentId: this.user.userId }).subscribe({
      next: (res: any) => {
        this.attemptId = res.id;
        this.examTitle = res.examTitle;
        this.questions = res.questions;
        this.timeLeft = res.remainingMinutes * 60;
        this.selectedAnswers = new Array(this.questions.length).fill('');
        this.startTimer();
        this.loading = false;
        setTimeout(() => this.enterFullscreen(), 500);
      },
      error: (err: any) => {
        console.error('Start exam error:', err);
        this.errorMessage = err.error?.message || 'Failed to start exam';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 3000);
      }
    });
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        if (this.timeLeft === 300) this.showAlert('⚠️ 5 minutes remaining!', 'warning');
        if (this.timeLeft === 60) this.showAlert('⚠️ 1 minute remaining!', 'warning');
        if (this.timeLeft === 30) this.showAlert('⚠️ Only 30 seconds left!', 'danger');
        if (this.timeLeft === 10) this.showAlert('⏰ Final 10 seconds!', 'danger');
      } else {
        this.submitExam();
      }
    }, 1000);
  }

  enterFullscreen() {
    if (this.isReenteringFullscreen) return;
    this.isReenteringFullscreen = true;
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
          this.isReenteringFullscreen = false;
          console.log('Fullscreen entered');
        })
        .catch((err) => {
          this.isReenteringFullscreen = false;
          this.showAlert('Please allow fullscreen mode to continue the exam', 'danger');
          setTimeout(() => this.enterFullscreen(), 1000);
        });
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.error(err));
    }
  }

  setupAntiCheatMeasures() {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
  }

  handleFullscreenChange() {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    
    if (!isCurrentlyFullscreen && this.isFullscreen && !this.submitted && !this.isReenteringFullscreen) {
      this.fullScreenExitCount++;
      const remaining = this.maxFullScreenExits - this.fullScreenExitCount;
      
      this.showAlert(`⚠️ FULLSCREEN EXIT! ${remaining} warning(s) left. Auto-reentering...`, 'danger');
      this.logViolationToAdmin('FULLSCREEN_EXIT', this.fullScreenExitCount);
      
      if (this.fullScreenExitCount >= this.maxFullScreenExits) {
        this.showAlert('❌ Limit exceeded! Exam will be auto-submitted!', 'danger');
        this.autoSubmitForViolation('Exceeded fullscreen exit limit');
        return;
      }
      
      setTimeout(() => {
        if (!this.submitted && this.fullScreenExitCount < this.maxFullScreenExits) {
          this.enterFullscreen();
          this.showAlert('🔄 Fullscreen restored. Continue your exam.', 'success');
        }
      }, 2000);
    }
    this.isFullscreen = isCurrentlyFullscreen;
  }

  handleVisibilityChange() {
    if (document.hidden && !this.submitted && !this.isReenteringFullscreen) {
      this.tabSwitchCount++;
      const remaining = this.maxTabSwitches - this.tabSwitchCount;
      
      this.showAlert(`⚠️ TAB SWITCH! ${remaining} warning(s) left.`, 'danger');
      this.logViolationToAdmin('TAB_SWITCH', this.tabSwitchCount);
      
      if (this.tabSwitchCount >= this.maxTabSwitches) {
        this.showAlert('❌ Tab switch limit exceeded! Auto-submitting...', 'danger');
        this.autoSubmitForViolation('Exceeded tab switch limit');
      } else {
        window.focus();
      }
    }
  }

  handleWindowBlur() {
    if (!this.submitted && !this.isReenteringFullscreen) {
      this.showAlert('⚠️ Stay on exam window!', 'warning');
      this.logViolationToAdmin('WINDOW_BLUR', 1);
      setTimeout(() => window.focus(), 100);
    }
  }

  logViolationToAdmin(violationType: string, violationCount: number) {
    const violationData = {
      attemptId: this.attemptId,
      studentId: this.user.userId,
      studentName: this.user.fullName,
      studentEmail: this.user.email,
      examId: this.examId,
      examTitle: this.examTitle,
      violationType: violationType,
      violationCount: violationCount,
      timestamp: new Date().toISOString(),
      remainingWarnings: violationType === 'FULLSCREEN_EXIT' 
        ? this.maxFullScreenExits - violationCount 
        : this.maxTabSwitches - violationCount
    };
    
    console.log('📝 Logging violation:', violationData);
    
    this.api.logViolation(violationData).subscribe({
      next: (response) => {
        console.log('✅ Violation saved to backend:', response);
      },
      error: (err) => {
        console.error('❌ Backend save failed, saving to localStorage:', err);
        this.api.saveViolationToLocal(violationData);
        this.showAlert('Violation saved locally (offline mode)', 'info');
      }
    });
  }

  autoSubmitForViolation(reason: string) {
    if (this.submitted) return;
    this.loading = true;
    this.showAlert(`⚠️ Exam auto-submitted: ${reason}`, 'danger');
    if (this.timer) clearInterval(this.timer);
    
    this.api.submitExam(this.attemptId).subscribe({
      next: (response: any) => {
        this.submitted = true;
        this.loading = false;
        alert(`Exam auto-submitted!\n\nScore: ${response.score}/${response.totalMarks}\nPercentage: ${response.percentage}%\nStatus: ${response.isPassed ? 'Passed ✅' : 'Failed ❌'}`);
        this.exitFullscreen();
        setTimeout(() => this.router.navigate(['/results']), 3000);
      },
      error: (err: any) => {
        console.error('Auto-submit error:', err);
        this.loading = false;
      }
    });
  }

  showAlert(message: string, type: 'success' | 'warning' | 'danger' | 'info') {
    const colors = {
      success: { bg: '#10b981', icon: 'fa-check-circle' },
      warning: { bg: '#f59e0b', icon: 'fa-exclamation-triangle' },
      danger: { bg: '#ef4444', icon: 'fa-skull-crossbones' },
      info: { bg: '#3b82f6', icon: 'fa-info-circle' }
    };
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'custom-alert';
    alertDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${colors[type].bg};
      color: white;
      padding: 20px 40px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10000;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      min-width: 350px;
      animation: alertSlideIn 0.3s ease;
      backdrop-filter: blur(8px);
      border: 2px solid rgba(255,255,255,0.3);
    `;
    alertDiv.innerHTML = `
      <i class="fas ${colors[type].icon}" style="font-size: 40px; display: block; margin-bottom: 15px;"></i>
      <div>${message}</div>
    `;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      alertDiv.style.animation = 'alertSlideOut 0.3s ease';
      setTimeout(() => alertDiv.remove(), 300);
    }, 3500);
  }

  selectAnswer(option: string) {
    const currentQuestion = this.questions[this.currentIndex];
    const questionId = currentQuestion?.questionId;
    if (!questionId) return;
    
    this.selectedAnswers[this.currentIndex] = option;
    this.api.submitAnswer({
      attemptId: this.attemptId,
      questionId: questionId,
      selectedOption: option
    }).subscribe({
      next: () => console.log('Answer saved'),
      error: (err) => console.error('Failed to save answer:', err)
    });
  }

  getCurrentQuestion() { return this.questions[this.currentIndex]; }
  getSelectedAnswerForCurrentQuestion(): string { return this.selectedAnswers[this.currentIndex] || ''; }
  next() { if (this.currentIndex < this.questions.length - 1) this.currentIndex++; }
  prev() { if (this.currentIndex > 0) this.currentIndex--; }
  goToQuestion(index: number) { this.currentIndex = index; }
  getAnsweredCount(): number { return this.selectedAnswers.filter(a => a !== '').length; }
  
  formatTime() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  submitExam() {
    if (this.timer) clearInterval(this.timer);
    if (confirm('Submit your exam?')) {
      this.loading = true;
      this.api.submitExam(this.attemptId).subscribe({
        next: (response: any) => {
          if (response.isPassed) this.celebratePass();
          alert(`Exam Submitted!\nScore: ${response.score}/${response.totalMarks}\nPercentage: ${response.percentage}%\nStatus: ${response.isPassed ? 'Passed ✅' : 'Failed ❌'}`);
          this.submitted = true;
          this.loading = false;
          this.exitFullscreen();
          setTimeout(() => this.router.navigate(['/results']), 2000);
        },
        error: (err: any) => {
          console.error('Submit error:', err);
          this.errorMessage = err.error?.message || 'Failed to submit exam';
          this.loading = false;
        }
      });
    } else {
      this.startTimer();
    }
  }

  celebratePass() {
    import('canvas-confetti').then((module) => {
      const confetti = module.default;
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 }, colors: ['#4361ee', '#06ffa5', '#f8961e'] });
      }, 200);
    }).catch(err => console.error('Confetti error:', err));
  }

  @HostListener('document:contextmenu', ['$event'])
  onRightClick(event: MouseEvent) { event.preventDefault(); return false; }

  @HostListener('document:copy', ['$event'])
  onCopy(event: ClipboardEvent) { event.preventDefault(); this.showAlert('📋 Copying disabled!', 'warning'); return false; }

  @HostListener('document:cut', ['$event'])
  onCut(event: ClipboardEvent) { event.preventDefault(); this.showAlert('✂️ Cutting disabled!', 'warning'); return false; }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent) { event.preventDefault(); this.showAlert('📋 Pasting disabled!', 'warning'); return false; }

  logout() { this.exitFullscreen(); this.auth.logout(); }
}