import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '../i18n'
import { PageHeading } from './PageHeading'
import { StatCard } from './StatCard'
import { StatusBadge } from './StatusBadge'
import { TopItems } from './TopItems'

const t = translations.en

/**
 * The dashboard's small shared widgets. They look decorative, but the status
 * badge is how staff read an order at a glance and the stat card is the only
 * way into the details dialog, so the tests pin what they show and what they
 * open rather than the classes behind them.
 */

describe('StatusBadge', () => {
  it('shows the label the caller translated', () => {
    render(<StatusBadge status="new" label="New" />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('carries a dot for each status so colour is not the only cue', () => {
    const { container, rerender } = render(<StatusBadge status="preparing" label="Preparing" />)
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(1)
    rerender(<StatusBadge status="done" label="Done" size="xs" />)
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(1)
  })
})

describe('PageHeading', () => {
  it('renders the title and, when given, the subtitle', () => {
    render(<PageHeading title="Orders" subtitle="Today" />)
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('leaves the subtitle out when there is none', () => {
    const { container } = render(<PageHeading title="Orders" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders the action beside the title', () => {
    render(<PageHeading title="Orders" action={<button type="button">Refresh</button>} />)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})

describe('StatCard', () => {
  const base = {
    label: 'Orders',
    value: '128',
    icon: <span />,
    iconClass: 'bg-brand-50',
    detailsLabel: 'View details',
  }

  it('names the number and opens the details on click', async () => {
    const onClick = vi.fn()
    render(<StatCard {...base} onClick={onClick} />)
    expect(screen.getByText('128')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Orders — View details' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows the suffix next to the value', () => {
    render(<StatCard {...base} value="1,250" suffix="EGP" onClick={vi.fn()} />)
    expect(screen.getByText('1,250')).toBeInTheDocument()
    expect(screen.getByText('EGP')).toBeInTheDocument()
  })

  it('shows a delta only when one is given', () => {
    const { rerender } = render(<StatCard {...base} onClick={vi.fn()} />)
    expect(screen.queryByText('12%')).not.toBeInTheDocument()
    rerender(<StatCard {...base} delta="12%" up onClick={vi.fn()} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })
})

describe('TopItems', () => {
  it('says so when nothing has sold yet', () => {
    render(<TopItems t={t} onOpenDetails={vi.fn()} items={[]} />)
    expect(screen.getByText(t.home.noTopItems)).toBeInTheDocument()
  })

  it('ranks the items by count, highest first', () => {
    render(
      <TopItems
        t={t}
        onOpenDetails={vi.fn()}
        items={[
          { name: 'Tea', count: 3 },
          { name: 'Burger', count: 20 },
          { name: 'Fries', count: 9 },
        ]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((row) => within(row).getByText(/Tea|Burger|Fries/).textContent)).toEqual([
      'Burger',
      'Fries',
      'Tea',
    ])
    expect(rows[0]).toHaveTextContent('20')
  })

  it('opens the full list from its button', async () => {
    const onOpenDetails = vi.fn()
    render(<TopItems t={t} onOpenDetails={onOpenDetails} items={[{ name: 'Tea', count: 1 }]} />)
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.actions.viewDetails) }))
    expect(onOpenDetails).toHaveBeenCalledTimes(1)
  })
})
