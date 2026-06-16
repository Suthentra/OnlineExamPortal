import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private toastr: ToastrService) {}

  // Success toast with HTML support
  success(message: string, title: string = 'Success!') {
    this.toastr.success(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      enableHtml: true,  // ← ADD THIS
    });
  }

  // Error toast with HTML support
  error(message: string, title: string = 'Error!') {
    this.toastr.error(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 4000,
      progressBar: true,
      closeButton: true,
      enableHtml: true,  // ← ADD THIS
    });
  }

  // Warning toast with HTML support
  warning(message: string, title: string = 'Warning!') {
    this.toastr.warning(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      enableHtml: true,  // ← ADD THIS
    });
  }

  // Info toast with HTML support
  info(message: string, title: string = 'Info') {
    this.toastr.info(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 2000,
      progressBar: true,
      closeButton: true,
      enableHtml: true,  // ← ADD THIS
    });
  }

  // Confirm dialog with SweetAlert2
  async confirmDelete(itemName: string): Promise<boolean> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `You are about to delete <strong>${itemName}</strong><br>This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });
    return result.isConfirmed;
  }

  // General confirmation dialog
  async confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
    const result = await Swal.fire({
      title: title,
      html: message,  // ← Uses html (not text)
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4361ee',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, proceed!',
      cancelButtonText: 'Cancel',
    });
    return result.isConfirmed;
  }

  // Success modal (blocks until user clicks OK)
  async successModal(message: string, title: string = 'Success!') {
    await Swal.fire({
      title: title,
      html: message,  // ← Uses html (not text)
      icon: 'success',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'OK',
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }

  // Error modal - NO CANCEL BUTTON
  async errorModal(message: string, title: string = 'Error!') {
    await Swal.fire({
      title: title,
      html: message,  // ← Uses html (not text)
      icon: 'error',
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'OK',
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
  }

  // Show loading spinner
  showLoading(message: string = 'Please wait...') {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      showConfirmButton: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  // Close loading spinner
  closeLoading() {
    Swal.close();
  }

  // CSV Preview Modal
  async showCSVPreview(
    totalQuestions: number,
    totalMarks: number,
    remainingMarks: number,
    questionsThatFit: number,
    marksThatFit: number
  ): Promise<boolean> {
    const result = await Swal.fire({
      title: 'CSV Upload Preview',
      html: `
        <div style="text-align: left;">
          <p><strong>📊 Summary:</strong></p>
          <ul style="margin-bottom: 15px;">
            <li>Total Questions: <strong>${totalQuestions}</strong></li>
            <li>Total Marks: <strong>${totalMarks}</strong></li>
            <li>Remaining Marks: <strong>${remainingMarks}</strong></li>
          </ul>
          ${totalMarks > remainingMarks ? `
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 8px; margin: 10px 0;">
              <strong>⚠️ Marks Limit Exceeded!</strong><br>
              Only <strong>${questionsThatFit}</strong> question(s) (<strong>${marksThatFit}</strong> marks) can be added.<br>
              <strong>${totalQuestions - questionsThatFit}</strong> question(s) (${totalMarks - marksThatFit} marks) will be skipped.
            </div>
          ` : `
            <div style="background: #d4edda; border: 1px solid #28a745; padding: 10px; border-radius: 8px; margin: 10px 0;">
              <strong>✅ All questions fit within the limit!</strong><br>
              After upload, you will have <strong>${remainingMarks - totalMarks}</strong> marks remaining.
            </div>
          `}
        </div>
      `,
      icon: totalMarks > remainingMarks ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: totalMarks > remainingMarks ? '#ffc107' : '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: totalMarks > remainingMarks ? `Add ${questionsThatFit} Questions` : 'Add All Questions',
      cancelButtonText: 'Cancel',
    });
    return result.isConfirmed;
  }

  // Exam deletion confirmation
  async confirmExamDelete(examTitle: string, hasQuestions: boolean): Promise<boolean> {
    const result = await Swal.fire({
      title: 'Delete Exam?',
      html: `
        <p>You are about to delete <strong>"${examTitle}"</strong></p>
        ${hasQuestions ? 
          '<p style="color: #dc3545;">⚠️ This exam has questions. All questions and student attempts will be deleted!</p>' : 
          ''}
        <p>This action cannot be undone!</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });
    return result.isConfirmed;
  }
}