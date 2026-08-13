import { useState } from 'react'
import ShiftsTab from './ShiftsTab.jsx'
import EmployeesTab from './EmployeesTab.jsx'
import AttendanceTab from './AttendanceTab.jsx'
import PaymentsTab from './PaymentsTab.jsx'
import CredentialsTab from './CredentialsTab.jsx'
import AttendanceCalendar from './AttendanceCalendar.jsx'

const TABS = [
  { key: 'shifts', label: 'Shifts' },
  { key: 'employees', label: 'Employees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payments', label: 'Payments' },
  { key: 'credentials', label: 'Credentials' },
]

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('shifts')
  // Opening an employee's attendance calendar takes over the whole page
  // (not a modal) — set here from EmployeesTab, cleared by the calendar's back button.
  const [calendarEmployee, setCalendarEmployee] = useState(null)

  if (calendarEmployee) {
    return <AttendanceCalendar employee={calendarEmployee} onBack={() => setCalendarEmployee(null)} />
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
      </div>

      <div className="flex gap-1 border-b border-sandal-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'shifts' && <ShiftsTab />}
      {activeTab === 'employees' && <EmployeesTab onOpenCalendar={setCalendarEmployee} />}
      {activeTab === 'attendance' && <AttendanceTab />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'credentials' && <CredentialsTab />}
    </div>
  )
}
