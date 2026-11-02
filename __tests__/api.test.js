import { getMenu, createOrder, getStatus } from '../src/api';

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('api do cliente', () => {
  it('getMenu busca o cardápio público e retorna o JSON', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, name: 'Cafés', products: [] }] });
    const menu = await getMenu();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/menu'), expect.any(Object));
    expect(menu[0].name).toBe('Cafés');
  });

  it('createOrder lança a mensagem de erro vinda da API quando falha', async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Produto indisponível' }) });
    await expect(createOrder({ items: [] })).rejects.toThrow('Produto indisponível');
  });

  it('getStatus retorna o status atual do pedido', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 10, status: 'pronto' }) });
    const r = await getStatus(10);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/orders/10/status'), expect.any(Object));
    expect(r.status).toBe('pronto');
  });
});
