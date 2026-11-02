import { Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

/** Moldura arredondada para a foto do grupo (com placeholder enquanto não houver foto). */
@Component({
  selector: 'app-group-photo',
  imports: [NgOptimizedImage],
  templateUrl: './group-photo.html',
  styleUrl: './group-photo.css',
})
export class GroupPhoto {
  readonly src = input<string | null>(null);
  readonly alt = input.required<string>();
}

