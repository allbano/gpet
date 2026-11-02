import { Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { GroupProfile } from '../../../domain/group-profile.model';

/** Bloco com logotipo e texto "Quem somos". */
@Component({
  selector: 'app-group-intro',
  imports: [NgOptimizedImage],
  templateUrl: './group-intro.html',
  styleUrl: './group-intro.css',
})
export class GroupIntro {
  readonly profile = input.required<GroupProfile>();
}
