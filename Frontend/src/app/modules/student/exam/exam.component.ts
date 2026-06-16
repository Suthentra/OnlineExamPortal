import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-exam',
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.css'],
  standalone: false
})
export class ExamComponent implements OnInit, OnDestroy {
  examId: number;
  examTitle: string = '';
  exam: any = null;
  questions: any[] = [];
  currentQuestionIndex = 0;
  answers: Map<number, number[]> = new Map();
  timeRemaining: number = 0;
  timerInterval: any;
  loading = true;
  examSubmitted = false;
  progress: number = 0;
  errorMessage: string = '';
  
  // Fullscreen
  isFullscreen: boolean = false;
  
  // Violation
  violationCount: number = 0;
  maxViolations: number = 3;
  private violationLock: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.startExam();
    this.setupFullscreenDetection();
    this.disableKeyboardShortcuts();
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.removeFullscreenDetection();
    this.enableKeyboardShortcuts();
  }

  // ===== DISABLE RIGHT CLICK, COPY, PASTE =====

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
    if (!this.examSubmitted) {
      this.toast.warning('Right click is disabled during the exam.');
    }
  }

  @HostListener('copy', ['$event'])
  onCopy(event: ClipboardEvent) {
    event.preventDefault();
    if (!this.examSubmitted) {
      this.toast.warning('Copy is disabled during the exam.');
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    if (!this.examSubmitted) {
      this.toast.warning('Paste is disabled during the exam.');
    }
  }

  @HostListener('cut', ['$event'])
  onCut(event: ClipboardEvent) {
    event.preventDefault();
    if (!this.examSubmitted) {
      this.toast.warning('Cut is disabled during the exam.');
    }
  }

  // ===== DISABLE KEYBOARD SHORTCUTS =====

  disableKeyboardShortcuts() {
    document.addEventListener('keydown', this.preventKeyboardShortcuts.bind(this));
  }

  enableKeyboardShortcuts() {
    document.removeEventListener('keydown', this.preventKeyboardShortcuts.bind(this));
  }

  preventKeyboardShortcuts(event: KeyboardEvent) {
    if (this.examSubmitted) return;

    if (event.ctrlKey && ['c', 'C', 'v', 'V', 'x', 'X', 'u', 'U', 's', 'S', 'p', 'P'].includes(event.key)) {
      event.preventDefault();
      this.toast.warning('Keyboard shortcuts are disabled during the exam.');
    }

    if (event.key === 'F12') {
      event.preventDefault();
      this.toast.warning('Developer tools are disabled during the exam.');
    }

    if (event.key === 'PrintScreen') {
      event.preventDefault();
      this.toast.warning('Print screen is disabled during the exam.');
    }
  }

  // ===== AUTO FULLSCREEN =====

  enterFullscreen() {
    if (this.examSubmitted) return;
    
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
        })
        .catch((err) => {
          console.log('Fullscreen request failed:', err);
          if (!this.examSubmitted && this.violationCount < this.maxViolations) {
            setTimeout(() => this.enterFullscreen(), 300);
          }
        });
    }
  }

  // ===== FULLSCREEN DETECTION =====

  setupFullscreenDetection() {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
  }

  removeFullscreenDetection() {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('blur', this.handleWindowBlur.bind(this));
  }

  handleFullscreenChange() {
    if (this.examSubmitted) return;
    this.isFullscreen = !!document.fullscreenElement;
    
    if (!this.isFullscreen && !this.examSubmitted) {
      this.logViolation('FULLSCREEN_EXIT');
    }
  }

  handleVisibilityChange() {
    if (this.examSubmitted || !this.isFullscreen) return;
    if (document.hidden) this.logViolation('TAB_SWITCH');
  }

  handleWindowBlur() {
    if (this.examSubmitted || !this.isFullscreen) return;
    this.logViolation('WINDOW_BLUR');
  }

  logViolation(type: string) {
    if (this.examSubmitted || this.violationLock) return;
    this.violationLock = true;
    this.violationCount++;

    const user = this.auth.getUser();
    const violation = {
      id: Date.now(),
      studentId: user?.userId,
      studentName: user?.fullName,
      studentEmail: user?.email,
      examId: this.examId,
      examTitle: this.examTitle,
      attemptId: this.exam?.id,
      violationType: type,
      violationCount: this.violationCount,
      timestamp: new Date().toISOString(),
      remainingWarnings: this.maxViolations - this.violationCount
    };

    let violations = JSON.parse(localStorage.getItem('violations') || '[]');
    violations.push(violation);
    localStorage.setItem('violations', JSON.stringify(violations));

    if (this.violationCount >= this.maxViolations) {
      this.toast.errorModal(
        '🚫 <strong>YOU HAVE EXCEEDED THE MAXIMUM VIOLATIONS!</strong><br><br>' +
        'Your exam will now be submitted automatically.<br><br>' +
        '<span style="font-size: 48px;">💀</span>',
        'Exam Auto-Submitted'
      );
      
      setTimeout(() => {
        this.forceSubmitExam();
      }, 1500);
    } else {
      const remaining = this.maxViolations - this.violationCount;
      this.toast.warning(
        `💀 <strong>Violation ${this.violationCount}/${this.maxViolations}</strong><br><br>` +
        `${type.replace('_', ' ')} detected.<br><br>` +
        `<strong>${remaining}</strong> warning(s) remaining.`,
        '⚠️ Warning'
      );
      
      setTimeout(() => {
        if (!this.examSubmitted && this.violationCount < this.maxViolations) {
          this.enterFullscreen();
        }
      }, 500);
    }

    setTimeout(() => { this.violationLock = false; }, 500);
  }

  // ===== CONFETTI METHODS =====

  fireCelebration() {
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 7,
        startVelocity: 30,
        spread: 360,
        origin: { 
          x: Math.random(),
          y: Math.random() * 0.5
        }
      });
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  // ===== TIMER ALERT METHODS =====

  showTimerAlert() {
    this.toast.warning(
      '⏰ <strong>TIME IS RUNNING OUT!</strong><br><br>' +
      'You have less than 1 minute remaining.<br><br>' +
      'Please complete your exam quickly.',
      '⚠️ Time Warning'
    );
    
    const timerElement = document.querySelector('.timer-container');
    if (timerElement) {
      timerElement.classList.add('timer-flash');
      setTimeout(() => {
        timerElement.classList.remove('timer-flash');
      }, 3000);
    }
  }

  // ===== EXAM =====

  startExam() {
    const studentId = this.auth.getUser()?.userId;
    if (!studentId) {
      this.errorMessage = 'User not authenticated.';
      this.loading = false;
      return;
    }

    this.toast.showLoading('Loading exam...');

    this.api.startExam({ studentId, examId: this.examId }).subscribe({
      next: (data: any) => {
        this.toast.closeLoading();
        this.exam = data;
        this.examTitle = data.examTitle || 'Exam';
        this.questions = data.questions || [];
        this.timeRemaining = (data.remainingMinutes || 60) * 60;
        this.loading = false;
        this.updateProgress();
        this.startTimer();
        
        setTimeout(() => {
          this.enterFullscreen();
        }, 500);
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Error starting exam:', err);
        
        if (err.error?.message?.includes('already attempted')) {
          this.toast.warning('You have already completed this exam.');
          this.router.navigate(['/dashboard']);
          return;
        }
        
        this.errorMessage = err.error?.message || 'Failed to start exam.';
        this.loading = false;
        this.toast.error(this.errorMessage);
      }
    });
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining === 60) {
        this.showTimerAlert();
      }
      
      if (this.timeRemaining === 30) {
        this.toast.warning(
          '⏰ <strong>FINAL WARNING!</strong><br><br>' +
          'Only 30 seconds remaining!',
          '⚠️ Last Chance'
        );
      }
      
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.toast.errorModal(
          '⏰ <strong>TIME IS UP!</strong><br><br>' +
          'Your exam will now be submitted automatically.',
          'Exam Auto-Submitted'
        );
        setTimeout(() => {
          this.forceSubmitExam();
        }, 1500);
      }
    }, 1000);
  }

  getFormattedTime(): string {
    const m = Math.floor(this.timeRemaining / 60);
    const s = this.timeRemaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  isTimerWarning(): boolean {
    return this.timeRemaining <= 60 && this.timeRemaining > 30;
  }

  isTimerDanger(): boolean {
    return this.timeRemaining <= 30;
  }

  updateProgress() {
    const answered = this.questions.filter(q => this.answers.has(q.id || q.questionId)).length;
    this.progress = this.questions.length ? Math.round((answered / this.questions.length) * 100) : 0;
  }

  isMultipleAnswer(): boolean {
    const question = this.questions[this.currentQuestionIndex];
    return question?.questionType === 'MULTIPLE_ANSWER';
  }

  getOptionLetter(i: number): string {
    return String.fromCharCode(65 + i);
  }

  onAnswerSelected(qId: number, optId: number, multiple: boolean = false) {
    if (!this.exam) return;
    
    let current = this.answers.get(qId) || [];
    
    if (multiple) {
      // Toggle selection for multiple answers
      if (current.includes(optId)) {
        current = current.filter(id => id !== optId);
      } else {
        current = [...current, optId];
      }
    } else {
      // Single answer - replace
      current = [optId];
    }
    
    this.answers.set(qId, current);
    this.updateProgress();
    this.saveAnswer(qId, current);
  }

  isOptionSelected(qId: number, optId: number): boolean {
    return (this.answers.get(qId) || []).includes(optId);
  }

  saveAnswer(qId: number, selected: number[]) {
    const attemptId = this.exam?.id;
    if (!attemptId) return;

    this.api.submitAnswer({
      attemptId: attemptId,
      questionId: qId,
      selectedOptionIds: selected
    }).subscribe({
      next: () => {},
      error: err => console.error('Save error:', err)
    });
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) this.currentQuestionIndex++;
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) this.currentQuestionIndex--;
  }

  goToQuestion(index: number) {
    if (index >= 0 && index < this.questions.length) this.currentQuestionIndex = index;
  }

  getAnsweredCount(): number {
    return this.questions.filter(q => this.answers.has(q.id || q.questionId)).length;
  }

  isQuestionAnswered(index: number): boolean {
    const q = this.questions[index];
    return q ? this.answers.has(q.id || q.questionId) : false;
  }

  // ===== SUBMIT METHODS =====

  async submitExam() {
    if (this.examSubmitted || !this.exam) return;

    const unanswered = this.questions.filter(q => !this.answers.has(q.id || q.questionId)).length;
    const msg = unanswered > 0 ? `⚠️ You have ${unanswered} unanswered question(s).\n\nAre you sure you want to submit?` : 'Are you sure you want to submit the exam?';
    
    const confirmed = await this.toast.confirm(msg, 'Submit Exam');
    if (!confirmed) return;

    await this.doSubmitExam();
  }

  async forceSubmitExam() {
    if (this.examSubmitted || !this.exam) return;
    await this.doSubmitExam();
  }

  private async doSubmitExam() {
    if (this.examSubmitted || !this.exam) return;

    this.toast.showLoading('Submitting...');

    this.api.submitExam(this.exam.id).subscribe({
      next: (res: any) => {
        this.toast.closeLoading();
        this.examSubmitted = true;
        clearInterval(this.timerInterval);
        if (document.fullscreenElement) document.exitFullscreen();

        const roundedPercentage = Number(res.percentage).toFixed(2);

        if (res.isPassed) {
          this.fireCelebration();
        }

        this.toast.successModal(
          `Score: ${res.score}/${res.totalMarks}\nPercentage: ${roundedPercentage}%\n${res.isPassed ? '✅ PASSED 🎉' : '❌ FAILED'}`,
          res.isPassed ? '🎉 Exam Passed!' : 'Exam Submitted!'
        );

        setTimeout(() => this.router.navigate(['/results']), 3000);
      },
      error: (err) => {
        this.toast.closeLoading();
        this.toast.error(err.error?.message || 'Submission failed. Please try again.');
      }
    });
  }

  goToResults() {
    if (document.fullscreenElement) document.exitFullscreen();
    this.router.navigate(['/results']);
  }

  goToDashboard() {
    if (document.fullscreenElement) document.exitFullscreen();
    this.router.navigate(['/dashboard']);
  }

  goBack() {
    this.toast.warning('You cannot leave during the exam.');
  }

  logout() {
    this.toast.warning('You cannot logout during the exam.');
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (this.examSubmitted) return;
    
    if (e.key === 'Escape') e.preventDefault();
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.nextQuestion();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.previousQuestion();
    }
  }
}