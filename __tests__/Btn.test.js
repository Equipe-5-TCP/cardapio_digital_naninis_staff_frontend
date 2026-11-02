import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Btn } from '../App';

describe('<Btn />', () => {
  it('chama onPress ao ser tocado', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Btn label="Marcar como entregue" onPress={onPress} />);
    fireEvent.press(getByText('Marcar como entregue'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('não chama onPress quando desabilitado (ex.: paginação no limite)', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Btn label="Próxima ›" onPress={onPress} disabled />);
    fireEvent.press(getByText('Próxima ›'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('usa a1yLabel customizado em vez do texto visível, quando informado', () => {
    const { getByLabelText } = render(<Btn label="‹ Anterior" a11yLabel="Página anterior" onPress={() => {}} />);
    expect(getByLabelText('Página anterior')).toBeTruthy();
  });
});
