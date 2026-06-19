import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-exam-card',
  templateUrl: './exam-card.component.html',
  styleUrls: ['./exam-card.component.css'],
  standalone: false
})
export class ExamCardComponent {
  @Input() exam: any;
  @Input() isAttempted: boolean = false;
  @Input() result: any = null;

  @Output() examStarted = new EventEmitter<number>();
  @Output() resultViewed = new EventEmitter<number>();

  // ===== GET START TIME =====
  getStartTime(): Date {
    if (!this.exam?.startTime) return new Date();
    return new Date(this.exam.startTime);
  }

  getEndTime(): Date {
    if (!this.exam?.endTime) return new Date();
    return new Date(this.exam.endTime);
  }

  // ===== CHECK IF EXAM IS COMING SOON =====
  isExamComingSoon(): boolean {
    if (!this.exam) return false;
    const now = new Date();
    const startTime = this.getStartTime();
    return now < startTime;
  }

  // ===== CHECK IF EXAM IS EXPIRED =====
  isExamExpired(): boolean {
    if (!this.exam) return false;
    const now = new Date();
    const endTime = this.getEndTime();
    return now > endTime;
  }

  // ===== CHECK IF EXAM IS AVAILABLE =====
  isExamAvailable(): boolean {
    if (!this.exam) return false;
    const now = new Date();
    const startTime = this.getStartTime();
    const endTime = this.getEndTime();
    return now >= startTime && now <= endTime;
  }

  // ===== GET EXAM STATUS =====
  getExamStatus(): string {
    if (!this.exam) return 'Unknown';
    if (this.isExamComingSoon()) return 'Coming Soon';
    if (this.isExamExpired()) return 'Expired';
    if (this.isExamAvailable()) return 'Available';
    return 'Unknown';
  }

  // ===== GET STATUS CLASS =====
  getStatusClass(): string {
    if (this.isExamComingSoon()) return 'coming-soon-status';
    if (this.isExamExpired()) return 'expired-status';
    if (this.isExamAvailable()) return 'available-status';
    return '';
  }

  // ===== CHECK IF EXAM CAN BE STARTED =====
  canStartExam(): boolean {
    return this.isExamAvailable() && !this.isAttempted && !this.isExamExpired();
  }

  startExam() {
    if (this.canStartExam()) {
      this.examStarted.emit(this.exam.id);
    }
  }

  viewResult() {
    if (this.result) {
      this.resultViewed.emit(this.result.attemptId);
    }
  }
}