import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';
import * as confetti from 'canvas-confetti';

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
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  startExam() {
    this.api.startExam({ examId: this.examId, studentId: this.user.userId }).subscribe({
      next: (res: any) => {
        console.log('Exam started response:', res);
        this.attemptId = res.id;
        this.examTitle = res.examTitle;
        this.questions = res.questions;
        this.timeLeft = res.remainingMinutes * 60;
        this.selectedAnswers = new Array(this.questions.length).fill('');
        this.startTimer();
        this.loading = false;
        
        console.log('Questions loaded:');
        this.questions.forEach((q, i) => {
          console.log(`Question ${i + 1}: ID = ${q.questionId}`);
        });
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
      } else {
        this.submitExam();
      }
    }, 1000);
  }

  selectAnswer(option: string) {
    const currentQuestion = this.questions[this.currentIndex];
    const questionId = currentQuestion?.questionId;
    
    console.log('=== SELECTING ANSWER ===');
    console.log('Current Index:', this.currentIndex);
    console.log('Question ID being sent:', questionId);
    console.log('Selected Option:', option);
    
    if (!questionId || questionId === 0) {
      console.error('ERROR: Invalid Question ID!', questionId);
      this.errorMessage = 'Invalid question. Please refresh and try again.';
      return;
    }
    
    this.selectedAnswers[this.currentIndex] = option;
    
    this.api.submitAnswer({
      attemptId: this.attemptId,
      questionId: questionId,
      selectedOption: option
    }).subscribe({
      next: (response: any) => {
        console.log('Answer saved successfully:', response);
      },
      error: (err: any) => {
        console.error('Failed to save answer:', err);
      }
    });
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  getCurrentQuestionId(): number {
    return this.getCurrentQuestion()?.questionId;
  }

  getSelectedAnswerForCurrentQuestion(): string {
    return this.selectedAnswers[this.currentIndex] || '';
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToQuestion(index: number) {
    this.currentIndex = index;
  }

  getAnsweredCount(): number {
    return this.selectedAnswers.filter(a => a !== '').length;
  }

  getRemainingCount(): number {
    return this.questions.length - this.getAnsweredCount();
  }

  formatTime() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  submitExam() {
    if (this.timer) clearInterval(this.timer);
    
    if (confirm('Are you sure you want to submit your exam?')) {
      this.loading = true;
      
      this.api.submitExam(this.attemptId).subscribe({
        next: (response: any) => {
          console.log('Exam submitted:', response);
          
          // 🎉 Show confetti if passed
          if (response.isPassed) {
            this.celebratePass();
          }
          
          // Single alert
          alert(`Exam Submitted!\n\nScore: ${response.score}/${response.totalMarks}\nPercentage: ${response.percentage}%\nStatus: ${response.isPassed ? 'Passed ✅' : 'Failed ❌'}`);
          
          this.submitted = true;
          this.loading = false;
          
          setTimeout(() => {
            this.router.navigate(['/results']);
          }, 2000);
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
    // Basic confetti
    confetti.default({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    // Second burst with colors
    setTimeout(() => {
      confetti.default({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#4361ee', '#06ffa5', '#f8961e', '#f72585']
      });
    }, 200);
  }

  logout() {
    this.auth.logout();
  }
}