import { useRef, useState } from 'react'
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  Database,
  Download,
  Upload,
  Trash2,
  BellRing,
  ShieldCheck,
} from 'lucide-react'
import { Header } from '../components/Header'
import { useData } from '../context/DataContext'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import type { CareTone, MealType, ReminderSettings } from '../types'
import { MEAL_LABELS } from '../lib/reminders'
import { notificationPermission, requestNotificationPermission } from '../lib/notifications'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const TONE_OPTIONS: Array<{ value: CareTone; label: string; sample: string }> = [
  { value: 'caring', label: 'Caring', sample: 'Just checking in. Have you eaten?' },
  { value: 'funny', label: 'Funny', sample: 'Lunch department is requesting a status update.' },
  { value: 'cute', label: 'Cute', sample: 'Food check! 🍱 Have you eaten?' },
  { value: 'professional', label: 'Professional', sample: 'Meal status has not been updated.' },
  { value: 'strict', label: 'Strict', sample: 'Meal update required.' },
]

function SectionCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Settings() {
  const { db, updateProfile, updateTheme, updateReminderSettings, eraseAllData, serverConnected, exportBackup, importBackup } = useData()
  const { currentProfile, signOut } = useSession()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [notifPermission, setNotifPermission] = useState(notificationPermission())

  if (!currentProfile) return null
  const isUser = currentProfile.role === 'user'
  const reminders = db.settings.reminders

  const handleImportClick = () => fileInputRef.current?.click()
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await importBackup(file)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not import that file.', 'error')
    }
  }

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission()
    setNotifPermission(perm)
    if (perm === 'granted') showToast('Notifications enabled.', 'success')
    else if (perm === 'denied') showToast('Notifications were blocked in browser settings.', 'warning')
  }

  return (
    <div>
      <Header title="Settings" subtitle={`Signed in as ${currentProfile.name}`} />

      <div className="space-y-4 px-4">
        <SectionCard title="Profile">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{currentProfile.name}</p>
              <p className="text-xs text-slate-400">{currentProfile.email}</p>
              <p className="mt-0.5 text-xs capitalize text-honey-600 dark:text-honey-400">
                {currentProfile.role === 'engineer' ? 'Care companion' : 'Meal tracker'}
              </p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              <LogOut size={15} /> Switch
            </button>
          </div>
        </SectionCard>

        {isUser && (
          <SectionCard title="Privacy" icon={<ShieldCheck size={16} />}>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Share meal status with your care companion
              </span>
              <input
                type="checkbox"
                checked={currentProfile.shareWithEngineer}
                onChange={(e) => updateProfile(currentProfile.id, { shareWithEngineer: e.target.checked })}
                className="h-5 w-5 accent-honey-500"
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">
              When off, your care companion's dashboard won't show your meal data or receive missed-meal alerts.
            </p>
          </SectionCard>
        )}

        <SectionCard title="Reminders" icon={<BellRing size={16} />}>
          <div className="space-y-4">
            {MEAL_ORDER.map((mealType) => {
              const cfg = reminders[mealType]
              return (
                <div key={mealType} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) =>
                        updateReminderSettings({ [mealType]: { ...cfg, enabled: e.target.checked } } as Partial<ReminderSettings>)
                      }
                      className="h-4 w-4 accent-honey-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{MEAL_LABELS[mealType]}</span>
                  </div>
                  <input
                    type="time"
                    value={cfg.time}
                    disabled={!cfg.enabled}
                    onChange={(e) => updateReminderSettings({ [mealType]: { ...cfg, time: e.target.value } } as Partial<ReminderSettings>)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )
            })}

            <label className="flex items-center justify-between gap-3 pt-1">
              <span className="text-sm text-slate-600 dark:text-slate-300">Quiet hours</span>
              <input
                type="checkbox"
                checked={reminders.quietHours.enabled}
                onChange={(e) =>
                  updateReminderSettings({ quietHours: { ...reminders.quietHours, enabled: e.target.checked } })
                }
                className="h-5 w-5 accent-honey-500"
              />
            </label>
            {reminders.quietHours.enabled && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={reminders.quietHours.start}
                  onChange={(e) => updateReminderSettings({ quietHours: { ...reminders.quietHours, start: e.target.value } })}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="time"
                  value={reminders.quietHours.end}
                  onChange={(e) => updateReminderSettings({ quietHours: { ...reminders.quietHours, end: e.target.value } })}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            <label className="flex items-center justify-between gap-3 pt-1">
              <span className="text-sm text-slate-600 dark:text-slate-300">Missed-meal alerts</span>
              <input
                type="checkbox"
                checked={reminders.missedMealAlertsEnabled}
                onChange={(e) => updateReminderSettings({ missedMealAlertsEnabled: e.target.checked })}
                className="h-5 w-5 accent-honey-500"
              />
            </label>

            <div>
              <p className="mb-1.5 text-sm text-slate-600 dark:text-slate-300">Reminder tone</p>
              <div className="grid grid-cols-1 gap-1.5">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => updateReminderSettings({ tone: t.value })}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      reminders.tone === t.value
                        ? 'border-honey-400 bg-honey-50 dark:border-honey-700 dark:bg-honey-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{t.label}</span>
                    <span className="ml-1.5 text-slate-400">"{t.sample}"</span>
                  </button>
                ))}
              </div>
            </div>

            {notifPermission !== 'granted' && (
              <button
                onClick={enableNotifications}
                className="w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Enable browser notifications
              </button>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Appearance">
          <div className="flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => updateTheme(value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                  db.settings.theme === value ? 'bg-white text-honey-700 shadow dark:bg-slate-900 dark:text-honey-300' : 'text-slate-500'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Your data file" icon={<Database size={16} />}>
          <p className="mb-3 text-xs text-slate-400">
            Honey has no external server. While the app is running locally, everything is saved
            automatically to a real file inside the project: <span className="font-mono">data/honey-data.json</span>.
          </p>
          <p
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              serverConnected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
            }`}
          >
            {serverConnected
              ? 'Synced to the project data file.'
              : "Not connected right now — using this browser's storage only. Make sure the app is running via npm run dev."}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={exportBackup}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={handleImportClick}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              <Upload size={14} /> Import
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
          </div>
        </SectionCard>

        <SectionCard title="Danger zone">
          {!confirmErase ? (
            <button
              onClick={() => setConfirmErase(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-50 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <Trash2 size={14} /> Delete meal history &amp; alerts
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This permanently deletes all meal history and alerts on this device (and linked file, if any). This
                can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    eraseAllData()
                    setConfirmErase(false)
                  }}
                  className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setConfirmErase(false)}
                  className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
