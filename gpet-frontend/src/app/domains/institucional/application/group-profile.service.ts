import { Injectable, signal } from '@angular/core';
import { GroupProfile } from '../domain/group-profile.model';
import { GROUP_PROFILE } from '../infrastructure/group-profile.data';

/** Caso de uso: obter o perfil institucional do grupo. */
@Injectable({ providedIn: 'root' })
export class GroupProfileService {
  readonly profile = signal<GroupProfile>(GROUP_PROFILE).asReadonly();
}

