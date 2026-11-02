import { Component, inject } from '@angular/core';
import { PageLayout } from '../../../../../shared/ui/page-layout/page-layout';
import { GroupProfileService } from '../../../application/group-profile.service';
import { GroupIntro } from '../../components/group-intro/group-intro';
import { GroupPhoto } from '../../components/group-photo/group-photo';

/** Tela inicial (endpoint "/"): composição de layout + intro + foto do grupo. */
@Component({
  selector: 'app-home',
  imports: [PageLayout, GroupIntro, GroupPhoto],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly profile = inject(GroupProfileService).profile;
}

