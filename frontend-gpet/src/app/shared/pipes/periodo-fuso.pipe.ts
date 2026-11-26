import { Pipe, PipeTransform } from '@angular/core';
import { formatarInstanteNoFuso } from '../../core/time/timezone-datetime.util';

@Pipe({ name: 'periodoFuso' })
export class PeriodoFusoPipe implements PipeTransform {
  transform(isoUtc: string, fuso: string): string {
    return formatarInstanteNoFuso(isoUtc, fuso);
  }
}
