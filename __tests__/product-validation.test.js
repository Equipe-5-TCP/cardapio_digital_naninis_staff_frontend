import { validateProduct } from '../App';

describe('validateProduct', () => {
  it('exige nome preenchido', () => {
    expect(validateProduct({ name: '', price: '10' })).toMatch(/nome e preço/);
  });

  it('ignora nome só com espaços em branco', () => {
    expect(validateProduct({ name: '   ', price: '8.5' })).toMatch(/nome e preço/);
  });

  it('exige preço maior que zero', () => {
    expect(validateProduct({ name: 'Café', price: '0' })).toMatch(/nome e preço/);
    expect(validateProduct({ name: 'Café', price: '' })).toMatch(/nome e preço/);
  });

  it('aceita nome e preço válidos', () => {
    expect(validateProduct({ name: 'Café', price: '8.5' })).toBeNull();
  });
});
