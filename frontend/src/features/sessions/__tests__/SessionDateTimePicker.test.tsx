import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { SessionDateTimePicker } from '../components/SessionDateTimePicker'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <SessionDateTimePicker label="Fecha y hora" value={value} onChange={setValue} />
}

describe('<SessionDateTimePicker>', () => {
  it('shows the placeholder trigger when no value is set', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: /fecha y hora/i })).toBeInTheDocument()
    expect(screen.getByText(/selecciona fecha y hora/i)).toBeInTheDocument()
  })

  it('opens the popover with calendar + time slots when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const trigger = screen.getByRole('button', { name: /fecha y hora/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    // Algunos slots de hora son visibles
    expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '22:00' })).toBeInTheDocument()
  })

  it('renders time slots in 30-min steps from 08:00 to 22:00 inclusive', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /fecha y hora/i }))

    // 8 → 21 (cada hora con :00 y :30) + 22:00 final = 29 slots
    const expected = [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
      '21:30',
      '22:00',
    ]
    for (const slot of expected) {
      expect(screen.getByRole('button', { name: slot })).toBeInTheDocument()
    }
    // 22:30 ya no existe
    expect(screen.queryByRole('button', { name: '22:30' })).not.toBeInTheDocument()
  })

  it('reflects an existing value in the trigger label', () => {
    // Fecha fija futura — el componente no la valida, solo la muestra.
    render(<Harness initial="2030-05-30T20:00" />)
    const trigger = screen.getByRole('button', { name: /fecha y hora/i })
    // El label contiene la hora en formato HH:mm
    expect(trigger).toHaveTextContent(/20:00/)
  })

  it('closes when "Hecho" is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2030-05-30T20:00" />)
    const trigger = screen.getByRole('button', { name: /fecha y hora/i })
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: /hecho/i }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('updates the value when a time slot is selected after picking a day', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2030-05-30T20:00" />)
    await user.click(screen.getByRole('button', { name: /fecha y hora/i }))

    // Cambiar la hora a 21:30 — el trigger se debe actualizar
    await user.click(screen.getByRole('button', { name: '21:30' }))
    expect(screen.getByRole('button', { name: /fecha y hora/i })).toHaveTextContent(/21:30/)
  })
})
