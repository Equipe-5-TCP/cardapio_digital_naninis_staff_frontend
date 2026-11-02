import { statusParamFor, NEXT_STATUS, NEXT_LABEL, STATUS_LABEL } from '../App';

describe('statusParamFor', () => {
  it('traduz o filtro "ativos" em uma lista de status aceita pela API', () => {
    expect(statusParamFor('ativos')).toBe('recebido,preparando,pronto');
  });

  it('mantém os demais filtros como foram passados', () => {
    expect(statusParamFor('entregue')).toBe('entregue');
    expect(statusParamFor('')).toBe('');
  });
});

describe('fluxo de avanço dos pedidos', () => {
  it('segue a sequência recebido → preparando → pronto → entregue', () => {
    expect(NEXT_STATUS.recebido).toBe('preparando');
    expect(NEXT_STATUS.preparando).toBe('pronto');
    expect(NEXT_STATUS.pronto).toBe('entregue');
  });

  it('não permite avançar um pedido já entregue ou cancelado', () => {
    expect(NEXT_STATUS.entregue).toBeUndefined();
    expect(NEXT_STATUS.cancelado).toBeUndefined();
  });

  it('tem um rótulo em português para todo status', () => {
    Object.values(STATUS_LABEL).forEach((label) => expect(typeof label).toBe('string'));
  });

  it('tem um texto de ação para cada etapa que ainda pode avançar', () => {
    Object.keys(NEXT_STATUS).forEach((status) => expect(NEXT_LABEL[status]).toBeTruthy());
  });
});
