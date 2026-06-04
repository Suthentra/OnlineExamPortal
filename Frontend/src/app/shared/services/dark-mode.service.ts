import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.darkModeSubject.asObservable();
  
  private isDark = false;

  constructor() {
    this.loadInitialState();
  }

  private loadInitialState() {
    const savedMode = localStorage.getItem('darkMode');
    this.isDark = savedMode === 'true';
    this.applyTheme();
  }

  get isDarkMode(): boolean {
    return this.isDark;
  }

  toggleDarkMode() {
    this.isDark = !this.isDark;
    localStorage.setItem('darkMode', String(this.isDark));
    this.applyTheme();
    this.darkModeSubject.next(this.isDark);
    console.log('Dark mode toggled:', this.isDark); // Debug log
  }

  private applyTheme() {
    if (this.isDark) {
      document.body.classList.add('dark-mode');
      console.log('Dark mode enabled'); // Debug log
    } else {
      document.body.classList.remove('dark-mode');
      console.log('Dark mode disabled'); // Debug log
    }
  }
}