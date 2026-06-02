import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5163/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders() {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }

  // ============ AUTH APIs ============
  register(data: any) {
    return this.http.post(`${this.apiUrl}/Auth/register`, data);
  }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/Auth/login`, data);
  }

  // ============ EXAM APIs ============
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
    return this.http.post(`${this.apiUrl}/Exams`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
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
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  publishExam(id: number) {
    const token = this.auth.getToken();
    return this.http.patch(`${this.apiUrl}/Exams/${id}/publish`, {}, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ QUESTION APIs ============
  getQuestionsByExam(examId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Questions/exam/${examId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getQuestionById(id: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Questions/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  createQuestion(examId: number, data: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/Questions/exam/${examId}`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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

  deleteQuestion(id: number) {
    const token = this.auth.getToken();
    return this.http.delete(`${this.apiUrl}/Questions/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ EXAM ATTEMPT APIs ============
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

  getAllAttempts() {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/ExamAttempt/all`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  checkExamAttempted(examId: number) {
    const token = this.auth.getToken();
    const studentId = this.auth.getUser()?.userId;
    return this.http.get(`${this.apiUrl}/ExamAttempt/check/${studentId}/${examId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ RESULT APIs ============
  getStudentResults(studentId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Results/student/${studentId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getExamResults(examId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Results/exam/${examId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getResultByAttempt(attemptId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Results/${attemptId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ USER APIs ============
  getAllUsers() {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Users`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getUserById(id: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Users/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  createUser(data: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/Users`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  updateUser(id: number, data: any) {
    const token = this.auth.getToken();
    return this.http.put(`${this.apiUrl}/Users/${id}`, data, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  deleteUser(id: number) {
    const token = this.auth.getToken();
    return this.http.delete(`${this.apiUrl}/Users/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getStudentRank(studentId: number) {
  const token = this.auth.getToken();
  return this.http.get(`${this.apiUrl}/Results/rank/${studentId}`, {
    headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
  });
}
}