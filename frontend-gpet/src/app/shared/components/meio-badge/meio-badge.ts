import { Component, computed, input } from '@angular/core';

export type MeioAtividade = 'ONLINE' | 'PRESENCIAL' | 'HIBRIDO' | 'IMPRESSO';

interface MeioMetadata {
  readonly label: string;
  readonly classes: string;
}

const MEIO_MAP: Record<MeioAtividade, MeioMetadata> = {
  ONLINE: {
    label: 'Online',
    classes: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  PRESENCIAL: {
    label: 'Presencial',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  HIBRIDO: {
    label: 'Híbrido',
    classes: 'border-violet-200 bg-violet-50 text-violet-900',
  },
  IMPRESSO: {
    label: 'Impresso',
    classes: 'border-amber-200 bg-amber-50 text-amber-900',
  },
};

@Component({
  selector: 'app-meio-badge',
  templateUrl: './meio-badge.html',
  styleUrl: './meio-badge.css',
})
export class MeioBadge {
  readonly meio = input.required<MeioAtividade>();

  protected readonly metadata = computed(() => MEIO_MAP[this.meio()]);
}
