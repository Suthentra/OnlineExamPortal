import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-create-exam',
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.css'],
  standalone: false
})
export class CreateExamComponent {
  examForm: FormGroup;
  loading = false;
  submitted = false;
  minDateTime: string = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {
    // Set minimum date to now (for datetime-local input)
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    this.minDateTime = localNow.toISOString().slice(0, 16);

    this.examForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      durationInMinutes: ['', [Validators.required, Validators.min(1), Validators.max(480)]],
      totalMarks: ['', [Validators.required, Validators.min(1), Validators.max(1000)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]]
    }, {
      // ===== ADD CUSTOM VALIDATORS =====
      validators: [
        this.endTimeAfterStartValidator,
        this.durationMatchesTimeRangeValidator  // ← NEW VALIDATOR
      ]
    });
  }

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

  get f() { return this.examForm.controls; }

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
      
      this.toast.warning('Please fix all validation errors');
      return;
    }

    // Additional validation for future date
    const startTime = new Date(this.examForm.value.startTime);
    const endTime = new Date(this.examForm.value.endTime);
    const now = new Date();

    if (startTime <= now) {
      this.toast.warning('Start time must be in the future');
      return;
    }

    this.loading = true;

    const examData = {
      title: this.examForm.value.title.trim(),
      description: this.examForm.value.description?.trim() || '',
      durationInMinutes: this.examForm.value.durationInMinutes,
      totalMarks: this.examForm.value.totalMarks,
      startTime: new Date(this.examForm.value.startTime).toISOString(),
      endTime: new Date(this.examForm.value.endTime).toISOString()
    };

    this.api.createExam(examData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.toast.success('Exam created successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin'], { fragment: 'exams' });
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Failed to create exam');
      }
    });
  }


// ===== Helper: Calculate time difference in minutes =====
calculateTimeDifference(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (end <= start) return 0;
  
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}


  goBack() {
    this.router.navigate(['/admin'], { fragment: 'exams' });
  }
}