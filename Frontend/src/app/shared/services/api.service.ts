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

  checkEmailAvailability(email: string) {
    return this.http.get(`${this.apiUrl}/Auth/check-email/${email}`);
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

  // ============ SECTION APIs ============
  getSectionsByExam(examId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Sections/exam/${examId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  createSection(sectionData: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/Sections`, sectionData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  updateSection(id: number, sectionData: any) {
    const token = this.auth.getToken();
    return this.http.put(`${this.apiUrl}/Sections/${id}`, sectionData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  deleteSection(id: number) {
    const token = this.auth.getToken();
    return this.http.delete(`${this.apiUrl}/Sections/${id}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  createExamWithSections(examData: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/Exams/with-sections`, examData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
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

  bulkCreateQuestions(examId: number, questions: any[]) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/Questions/bulk/${examId}`, questions, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  // ============ QUESTION BANK APIs ============
  getBankQuestions() {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/QuestionBank`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  addToBank(question: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/QuestionBank`, question, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  addFromBankToExam(examId: number, questionIds: number[]) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/QuestionBank/add-to-exam/${examId}`, questionIds, {
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

  getStudentRank(studentId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/Results/rank/${studentId}`, {
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

  changePassword(data: any) {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/Users/change-password`, data, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // ============ VIOLATION APIs ============
  logViolation(violationData: any) {
    const token = this.auth.getToken();
    console.log('Sending violation to API:', violationData);
    return this.http.post(`${this.apiUrl}/ExamAttempt/log-violation`, violationData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    });
  }

  getAllViolations() {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/ExamAttempt/all-violations`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getViolationsByStudent(studentId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/ExamAttempt/violations/student/${studentId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  getViolationsByExam(examId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/ExamAttempt/violations/exam/${examId}`, {
      headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` })
    });
  }

  // Local storage backup for violations (if API fails)
  saveViolationToLocal(violationData: any) {
    let violations = JSON.parse(localStorage.getItem('violations') || '[]');
    violations.push(violationData);
    localStorage.setItem('violations', JSON.stringify(violations));
    console.log('Violation saved to localStorage. Total:', violations.length);
    return violations;
  }

  getLocalViolations() {
    return JSON.parse(localStorage.getItem('violations') || '[]');
  }

  clearLocalViolations() {
    localStorage.removeItem('violations');
  }
}
