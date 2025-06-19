import { Component } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {element300, element600X, element900X} from '../../utils/animations';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [
    NgOptimizedImage,
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  animations: [element300, element600X, element900X]
})
export class HomeComponent {
  public currentYear(): string {
    return new Date().getFullYear().toString();
  }
}
