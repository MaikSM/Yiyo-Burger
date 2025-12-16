import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'copCurrency'
})
export class CurrencyPipe implements PipeTransform {

  transform(value: number | string, currency: string = 'COP'): string {
    if (value === null || value === undefined) {
      return '';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '';
    }

    // Formato colombiano
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  }

}
