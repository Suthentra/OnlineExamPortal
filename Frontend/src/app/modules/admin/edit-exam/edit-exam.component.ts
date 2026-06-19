import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-edit-exam',
  templateUrl: './edit-exam.component.html',
  styleUrls: ['./edit-exam.component.css'],
  standalone: false
})
export class EditExamComponent implements OnInit {
  examId: number;
  examForm: FormGroup;
  loading = true;
  submitted = false;
  minDateTime: string = '';
  isExamPublished: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
    
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    this.minDateTime = localNow.toISOString().slice(0, 16);

    // ===== SINGLE FORM INITIALIZATION WITH VALIDATORS =====
    this.examForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      durationInMinutes: ['', [Validators.required, Validators.min(1), Validators.max(480)]],
      totalMarks: ['', [Validators.required, Validators.min(1), Validators.max(1000)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      isPublished: [false]
    }, {
      validators: [
        this.endTimeAfterStartValidator,
        this.durationMatchesTimeRangeValidator
      ]
    });
  }

  ngOnInit() {
    this.loadExam();
  }

  get f() { return this.examForm.controls; }

  // ===== VALIDATOR 1: End Time must be after Start Time =====
  endTimeAfterStartValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = control.get('startTime')?.value;
    const endTime = control.get('endTime')?.value;
    
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        return { endTimeBeforeStart: true };
      }
    }
    return null;
  }

  // ===== VALIDATOR 2: Duration must match Start Time - End Time difference =====
  durationMatchesTimeRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = control.get('startTime')?.value;
    const endTime = control.get('endTime')?.value;
    const duration = control.get('durationInMinutes')?.value;
    
    if (startTime && endTime && duration) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Calculate difference in minutes
      const diffInMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      // Check if duration matches the time range (allow 1 minute tolerance)
      if (Math.abs(diffInMinutes - duration) > 1) {
        return { 
          durationMismatch: true,
          actualDuration: diffInMinutes,
          enteredDuration: duration
        };
      }
    }
    return null;
  }

  formatDateForInput(date: any): string {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return localDate.toISOString().slice(0, 16);
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  }

  // ===== Helper: Calculate time difference in minutes =====
  calculateTimeDifference(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (end <= start) return 0;
    
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  loadExam() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.isExamPublished = data.isPublished;

        this.examForm.patchValue({
          title: data.title,
          description: data.description,
          durationInMinutes: data.durationInMinutes,
          totalMarks: data.totalMarks,
          startTime: this.formatDateForInput(data.startTime),
          endTime: this.formatDateForInput(data.endTime),
          isPublished: data.isPublished
        });
        
        this.loading = false;
      },
      error: (err) => {
        this.toast.error('Failed to load exam');
        this.loading = false;
      }
    });
  }

  onSubmit() {
    this.submitted = true;
    
    if (this.examForm.invalid) {
      // Check for specific errors
      if (this.examForm.errors?.['durationMismatch']) {
        const actualDuration = this.examForm.errors['durationMismatch'].actualDuration;
        const enteredDuration = this.examForm.errors['durationMismatch'].enteredDuration;
        this.toast.warning(
          `Duration mismatch! The time between Start and End is ${actualDuration} minutes, ` +
          `but you entered ${enteredDuration} minutes. Please update the duration or the time range.`
        );
        return;
      }
      
      if (this.examForm.errors?.['endTimeBeforeStart']) {
        this.toast.warning('End time must be after start time');
        return;
      }
      
      this.toast.warning('Please fill all required fields');
      return;
    }

    const startTimeStr = this.examForm.value.startTime;
    const endTimeStr = this.examForm.value.endTime;
    
    if (!startTimeStr || !endTimeStr) {
      this.toast.warning('Please select both start and end time');
      return;
    }

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
    
    // Check if End Time is after Start Time
    if (endTime <= startTime) {
      this.toast.warning('End time must be after start time');
      return;
    }

    this.loading = true;

    const examData = {
      title: this.examForm.value.title.trim(),
      description: this.examForm.value.description?.trim() || '',
      durationInMinutes: this.examForm.value.durationInMinutes,
      totalMarks: this.examForm.value.totalMarks,
      startTime: new Date(startTimeStr).toISOString(),
      endTime: new Date(endTimeStr).toISOString(),
      isPublished: this.examForm.value.isPublished
    };

    this.api.updateExam(this.examId, examData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.toast.success('Exam updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin'], { fragment: 'exams' });
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Failed to update exam');
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin'], { fragment: 'exams' });
  }

  logout() {
    this.auth.logout();
  }
}