import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

function AdminReceiptsOverview() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const [loading, setLoading] = useState(true)
  const [fuelEntries, setFuelEntries] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [profiles, setProfiles] = useState([])

  useEffect(() => {
    loadReceiptEntries()
  }, [selectedMonth, selectedYear])

  const loadReceiptEntries = async () => {
    setLoading(true)

    try {
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      const nextMonthDate =
        selectedMonth === 12
          ? `${selectedYear + 1}-01-01`
          : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`

      const [
        { data: entriesData, error: entriesError },
        { data: vehiclesData, error: vehiclesError },
        { data: profilesData, error: profilesError },
      ] = await Promise.all([
        supabase
          .from("fuel_entries")
          .select("id, vehicle_id, user_id, fuel_date, liters, receipt_path, created_at")
          .gte("fuel_date", monthStart)
          .lt("fuel_date", nextMonthDate)
          .order("fuel_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("vehicles")
          .select("id, model, plate")
          .order("model", { ascending: true })
          .order("plate", { ascending: true }),

        supabase
          .from("profiles")
          .select("id, full_name, username, vehicle_id"),
      ])

      if (entriesError || vehiclesError || profilesError) {
        alert(
          "Greška pri učitavanju pregleda računa: " +
            (
              entriesError?.message ||
              vehiclesError?.message ||
              profilesError?.message
            )
        )
        return
      }

      setFuelEntries(entriesData || [])
      setVehicles(vehiclesData || [])
      setProfiles(profilesData || [])
    } catch (err) {
      alert("Greška pri učitavanju pregleda računa: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const monthNames = [
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Jun",
    "Jul",
    "Avgust",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar",
  ]

  const getReceiptUrl = (receiptPath) => {
    if (!receiptPath) return null

    const { data } = supabase.storage
      .from("fuel-receipts")
      .getPublicUrl(receiptPath)

    return data?.publicUrl || null
  }

  const rows = useMemo(() => {
    return fuelEntries.map((entry) => {
      const vehicle = vehicles.find((v) => v.id === entry.vehicle_id)
      const profile = profiles.find((p) => p.id === entry.user_id)

      return {
        id: entry.id,
        fuelDate: entry.fuel_date,
        liters: Number(entry.liters || 0),
        vehicleLabel: vehicle ? `${vehicle.model} ${vehicle.plate}` : "-",
        userName: profile?.full_name || "-",
        username: profile?.username || "-",
        receiptPath: entry.receipt_path || null,
      }
    })
  }, [fuelEntries, vehicles, profiles])

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6">Učitavanje pregleda računa...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Pregled unosa računa</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mjesec</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Godina</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        {rows.length === 0 ? (
          <p className="text-gray-500">Nema unosa goriva za izabrani mjesec.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-3">Datum</th>
                  <th className="text-left py-3 px-3">Korisnik</th>
                  <th className="text-left py-3 px-3">Username</th>
                  <th className="text-left py-3 px-3">Vozilo</th>
                  <th className="text-left py-3 px-3">Litara</th>
                  <th className="text-left py-3 px-3">Račun</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const receiptUrl = getReceiptUrl(row.receiptPath)

                  return (
                    <tr key={row.id} className="border-b">
                      <td className="py-3 px-3">{row.fuelDate}</td>
                      <td className="py-3 px-3">{row.userName}</td>
                      <td className="py-3 px-3">{row.username}</td>
                      <td className="py-3 px-3">{row.vehicleLabel}</td>
                      <td className="py-3 px-3">{row.liters.toFixed(2)} l</td>
                      <td className="py-3 px-3">
                        {receiptUrl ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-600 underline"
                          >
                            Pogledaj račun
                          </a>
                        ) : (
                          <span className="text-gray-400">Nema računa</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminReceiptsOverview