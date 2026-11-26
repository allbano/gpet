import { Pipe, PipeTransform } from '@angular/core';
import { formatarCargaHoraria } from '../../core/time/timezone-datetime.util';

@Pipe({ name: 'cargaHoraria' })
export class CargaHorariaPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    return formatarCargaHoraria(minutos);
  }
}
