import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5163/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  // ============ AUTH ============
  register(data: any) {
    return this.http.post(`${this.apiUrl}/Auth/register`, data);
  }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/Auth/login`, data);
  }

  // ============ EXAMS ============
  getAllExams() {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Exams`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getPublishedExams() {
    return this.http.get(`${this.apiUrl}/Exams/published`);
  }

  getExamById(id: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Exams/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  createExam(data: any) {
    const token = this.auth.getToken();
    console.log('Token:', token);
    return this.http.post(`${this.apiUrl}/Exams`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  publishExam(id: number) {
    const token = this.auth.getToken();
    return this.http.patch(`${this.apiUrl}/Exams/${id}/publish`, {}, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ QUESTIONS ============
  getQuestionsByExam(examId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Questions/exam/${examId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  createQuestion(examId: number, data: any) {
    const token = this.auth.getToken();
    console.log('Token for question:', token);
    return this.http.post(`${this.apiUrl}/Questions/exam/${examId}`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  deleteQuestion(id: number) {
    const token = this.auth.getToken();
    return this.http.delete(`${this.apiUrl}/Questions/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  updateExam(id: number, data: any) {
  const token = this.auth.getToken();
  return this.http.put(`${this.apiUrl}/Exams/${id}`, data, {
    headers: new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    })
  });
}

deleteExam(id: number) {
  const token = this.auth.getToken();
  return this.http.delete(`${this.apiUrl}/Exams/${id}`, {
    headers: new HttpHeaders({
      'Authorization': `Bearer ${token}`
    })
  });
}
updateQuestion(id: number, data: any) {
  const token = this.auth.getToken();
  return this.http.put(`${this.apiUrl}/Questions/${id}`, data, {
    headers: new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    })
  });
}

  // ============ EXAM ATTEMPT ============
  startExam(data: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/ExamAttempt/start`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  submitAnswer(data: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/ExamAttempt/submit-answer`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  submitExam(attemptId: number) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/ExamAttempt/submit/${attemptId}`, {}, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ RESULTS ============
  getStudentResults(studentId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Results/student/${studentId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }
  getAllAttempts() {
  const token = this.auth.getToken();
  return this.http.get(`${this.apiUrl}/ExamAttempt/all`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}

  getExamResults(examId: number) {
  const token = this.auth.getToken();
  return this.http.get(`${this.apiUrl}/Results/exam/${examId}`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}

getStudentResultDetail(attemptId: number) {
  const token = this.auth.getToken();
  return this.http.get(`${this.apiUrl}/Results/${attemptId}`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}

getResultByAttempt(attemptId: number) {
  const token = this.auth.getToken();
  return this.http.get(`${this.apiUrl}/Results/${attemptId}`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}
getAllUsers() {
  const token = this.auth.getToken();
  return this.http.get(`${this.apiUrl}/Users`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}
  // Check if student has already attempted an exam
checkExamAttempted(examId: number) {
  const token = this.auth.getToken();
  const studentId = this.auth.getUser()?.userId;
  return this.http.get(`${this.apiUrl}/ExamAttempt/check/${studentId}/${examId}`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}
saveExamResult(data: any) {
  const token = this.auth.getToken();
  return this.http.post(`${this.apiUrl}/ExamAttempt/save-result`, data, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}
}