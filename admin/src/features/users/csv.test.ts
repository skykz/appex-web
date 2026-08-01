import { describe, expect, it } from 'vitest'
import { buildLeadsCsv, buildUsersCsv } from './csv'
import type { AdminLeadRow, AdminUserRow } from './api'

function lead(over: Partial<AdminLeadRow> = {}): AdminLeadRow {
  return {
    id: 'a1',
    email: 'jim@example.com',
    name: 'Jim',
    landing: 'usa',
    selected_plan: 'week_4',
    utm_source: 'Facebook',
    utm_campaign: 'camp',
    utm_medium: 'Instagram_Reels',
    welcome_email_sent_at: null,
    confirmed_at: null,
    confirm_email_sent_at: null,
    created_at: '2026-08-01T08:23:15.487Z',
    ...over,
  }
}

describe('buildLeadsCsv', () => {
  it('emits the header even with no rows, so the file is still importable', () => {
    const csv = buildLeadsCsv([])
    expect(csv.split('\r\n')[0]).toBe(
      'id,email,name,landing,selected_plan,utm_source,utm_campaign,utm_medium,confirmed_at,confirm_email_sent_at,welcome_email_sent_at,created_at'
    )
  })

  it('keeps values aligned with the header', () => {
    const csv = buildLeadsCsv([lead()])
    const [header, row] = csv.split('\r\n')
    expect(row!.split(',').length).toBe(header!.split(',').length)
  })

  it('writes empty strings for missing optional fields rather than "null"', () => {
    // A literal "null" in a spreadsheet cell reads as data, not as absence.
    const csv = buildLeadsCsv([
      lead({ name: '', selected_plan: null, utm_source: null, confirmed_at: null }),
    ])
    expect(csv).not.toContain('null')
    expect(csv).not.toContain('undefined')
  })

  it('exports the confirmation columns, which only exist on the lead export', () => {
    const csv = buildLeadsCsv([lead({ confirmed_at: '2026-08-01T09:00:00.000Z' })])
    expect(csv).toContain('confirmed_at')
    expect(csv).toContain('2026-08-01T09:00:00.000Z')
  })

  it('quotes a name containing a comma so columns do not shift', () => {
    const csv = buildLeadsCsv([lead({ name: 'Doe, John' })])
    expect(csv).toContain('"Doe, John"')
    const rows = csv.split('\r\n')
    expect(rows).toHaveLength(2)
  })

  it('escapes embedded quotes', () => {
    const csv = buildLeadsCsv([lead({ name: 'Jim "The Boss"' })])
    expect(csv).toContain('""The Boss""')
  })

  it('quotes a field containing a newline so it stays one record', () => {
    const csv = buildLeadsCsv([lead({ name: 'Line1\nLine2' })])
    expect(csv).toContain('"Line1\nLine2"')
    // Records are CRLF-separated per RFC 4180, so the bare \n does not split one.
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('renders one record per lead', () => {
    const csv = buildLeadsCsv([lead({ id: 'a' }), lead({ id: 'b' }), lead({ id: 'c' })])
    expect(csv.split('\r\n')[0]).toContain('id')
    expect(csv).toContain('a')
    expect(csv).toContain('b')
    expect(csv).toContain('c')
  })
})

describe('buildUsersCsv', () => {
  const user: AdminUserRow = {
    id: 'u1',
    email: 'bota@example.com',
    name: 'Bota',
    role: 'user',
    created_at: '2026-07-01T00:00:00.000Z',
    credits: 5,
    streak_current: 3,
  } as AdminUserRow

  it('keeps its own header distinct from the lead export', () => {
    const csv = buildUsersCsv([user])
    expect(csv.split('\r\n')[0]).toBe('id,email,name,role,created_at,credits,streak_current')
    // Confirmation state is a lead concept; it must not appear here.
    expect(csv).not.toContain('confirmed_at')
  })

  it('writes numeric columns as plain numbers', () => {
    const csv = buildUsersCsv([user])
    const row = csv.split('\r\n')[1]!
    expect(row).toContain('5')
    expect(row).toContain('3')
  })

  it('tolerates a null name', () => {
    const csv = buildUsersCsv([{ ...user, name: null } as unknown as AdminUserRow])
    expect(csv).not.toContain('null')
  })
})
