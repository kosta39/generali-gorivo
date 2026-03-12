import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

function AdminCostsOverview() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const [vehicles, setVehicles] = useState([])
  const [profiles, setProfiles] = useState([])
  const [monthFuelRows, setMonthFuelRows] = useState([])
  const [ytdFuelRows, setYtdFuelRows] = useState([])
  const [yearFuelRows, setYearFuelRows] = useState([])
  const [loading, setLoading] = useState(true)

  const [sortConfig, setSortConfig] = useState({
    key: "monthTotalCost",
    direction: "desc",
  })

  useEffect(() => {
    loadCostData()
  }, [selectedMonth, selectedYear])

  const loadCostData = async () => {
    setLoading(true)

    try {
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      const nextMonthDate =
        selectedMonth === 12
          ? `${selectedYear + 1}-01-01`
          : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`

      const startOfYear = `${selectedYear}-01-01`
      const endOfYear = `${selectedYear + 1}-01-01`

      const [
        { data: vehiclesData, error: vehiclesError },
        { data: profilesData, error: profilesError },
        { data: monthFuelData, error: monthFuelError },
        { data: ytdFuelData, error: ytdFuelError },
        { data: yearFuelData, error: yearFuelError },
      ] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, model, plate")
          .order("model", { ascending: true })
          .order("plate", { ascending: true }),

        supabase.from("profiles").select("id, full_name, vehicle_id"),

        supabase
          .from("fuel_entries")
          .select("vehicle_id, fuel_date, liters, total_price, payment_type")
          .gte("fuel_date", monthStart)
          .lt("fuel_date", nextMonthDate),

        supabase
          .from("fuel_entries")
          .select("vehicle_id, fuel_date, liters, total_price, payment_type")
          .gte("fuel_date", startOfYear)
          .lt("fuel_date", nextMonthDate),

        supabase
          .from("fuel_entries")
          .select("vehicle_id, fuel_date, liters, total_price, payment_type")
          .gte("fuel_date", startOfYear)
          .lt("fuel_date", endOfYear),
      ])

      if (
        vehiclesError ||
        profilesError ||
        monthFuelError ||
        ytdFuelError ||
        yearFuelError
      ) {
        alert(
          "Greška pri učitavanju troškova: " +
            (
              vehiclesError?.message ||
              profilesError?.message ||
              monthFuelError?.message ||
              ytdFuelError?.message ||
              yearFuelError?.message
            )
        )
        return
      }

      setVehicles(vehiclesData || [])
      setProfiles(profilesData || [])
      setMonthFuelRows(monthFuelData || [])
      setYtdFuelRows(ytdFuelData || [])
      setYearFuelRows(yearFuelData || [])
    } catch (err) {
      alert("Greška pri učitavanju troškova: " + err.message)
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

  const rows = useMemo(() => {
    return vehicles.map((vehicle) => {
      const assignedProfile =
        profiles.find((p) => p.vehicle_id === vehicle.id) || null

      const vehicleMonthFuel = monthFuelRows.filter(
        (row) => row.vehicle_id === vehicle.id
      )

      const vehicleYtdFuel = ytdFuelRows.filter(
        (row) => row.vehicle_id === vehicle.id
      )

      const monthFuel = vehicleMonthFuel.reduce(
        (sum, r) => sum + Number(r.liters || 0),
        0
      )

      const fuelYtd = vehicleYtdFuel.reduce(
        (sum, r) => sum + Number(r.liters || 0),
        0
      )

      const monthTotalCost = vehicleMonthFuel.reduce(
        (sum, r) => sum + Number(r.total_price || 0),
        0
      )

      const ytdTotalCost = vehicleYtdFuel.reduce(
        (sum, r) => sum + Number(r.total_price || 0),
        0
      )

      const monthCompanyCost = vehicleMonthFuel
        .filter((r) => r.payment_type === "company")
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0)

      const monthPrivateCost = vehicleMonthFuel
        .filter((r) => r.payment_type === "private")
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0)

      const ytdCompanyCost = vehicleYtdFuel
        .filter((r) => r.payment_type === "company")
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0)

      const ytdPrivateCost = vehicleYtdFuel
        .filter((r) => r.payment_type === "private")
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0)

      const avgPriceMonth = monthFuel > 0 ? monthTotalCost / monthFuel : 0
      const avgPriceYtd = fuelYtd > 0 ? ytdTotalCost / fuelYtd : 0

      return {
        vehicleId: vehicle.id,
        vehicleLabel: `${vehicle.model} ${vehicle.plate}`,
        employeeName: assignedProfile?.full_name || "-",
        monthTotalCost,
        ytdTotalCost,
        monthCompanyCost,
        monthPrivateCost,
        ytdCompanyCost,
        ytdPrivateCost,
        avgPriceMonth,
        avgPriceYtd,
      }
    })
  }, [vehicles, profiles, monthFuelRows, ytdFuelRows])

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.monthTotalCost += r.monthTotalCost
        acc.ytdTotalCost += r.ytdTotalCost
        acc.monthCompanyCost += r.monthCompanyCost
        acc.monthPrivateCost += r.monthPrivateCost
        acc.ytdCompanyCost += r.ytdCompanyCost
        acc.ytdPrivateCost += r.ytdPrivateCost
        return acc
      },
      {
        monthTotalCost: 0,
        ytdTotalCost: 0,
        monthCompanyCost: 0,
        monthPrivateCost: 0,
        ytdCompanyCost: 0,
        ytdPrivateCost: 0,
      }
    )
  }, [rows])

  const monthlyTrendRows = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1

      const monthFuelRowsForTrend = yearFuelRows.filter((row) => {
        const monthPart = String(row.fuel_date || "").split("-")[1]
        return Number(monthPart) === month
      })

      const totalCost = monthFuelRowsForTrend.reduce(
        (sum, row) => sum + Number(row.total_price || 0),
        0
      )

      const totalLiters = monthFuelRowsForTrend.reduce(
        (sum, row) => sum + Number(row.liters || 0),
        0
      )

      const companyCost = monthFuelRowsForTrend
        .filter((row) => row.payment_type === "company")
        .reduce((sum, row) => sum + Number(row.total_price || 0), 0)

      const privateCost = monthFuelRowsForTrend
        .filter((row) => row.payment_type === "private")
        .reduce((sum, row) => sum + Number(row.total_price || 0), 0)

      const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0

      return {
        month,
        monthLabel: monthNames[index],
        totalCost,
        totalLiters,
        companyCost,
        privateCost,
        avgPricePerLiter,
      }
    })
  }, [yearFuelRows])

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        }
      }

      return {
        key,
        direction: key === "vehicleLabel" || key === "employeeName" ? "asc" : "desc",
      }
    })
  }

  const sortedRows = useMemo(() => {
    const sortableRows = [...rows]

    sortableRows.sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      const isTextColumn =
        sortConfig.key === "vehicleLabel" || sortConfig.key === "employeeName"

      if (isTextColumn) {
        const textA = String(aValue || "").toLocaleLowerCase("sr-Latn")
        const textB = String(bValue || "").toLocaleLowerCase("sr-Latn")
        const compareResult = textA.localeCompare(textB, "sr-Latn")
        return sortConfig.direction === "asc" ? compareResult : -compareResult
      }

      const numA = Number(aValue || 0)
      const numB = Number(bValue || 0)

      if (numA < numB) return sortConfig.direction === "asc" ? -1 : 1
      if (numA > numB) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })

    return sortableRows
  }, [rows, sortConfig])

  const getSortArrow = (key) => {
    if (sortConfig.key !== key) return ""
    return sortConfig.direction === "asc" ? " ▲" : " ▼"
  }

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="text-left py-3 px-3 cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(sortKey)}
    >
      {label}
      {getSortArrow(sortKey)}
    </th>
  )

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6">Učitavanje troškova...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mjesec</label>
            <select
              className="w-full border rounded-xl px-3 py-3 sm:py-2.5"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Godina</label>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-3 sm:py-2.5"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500">Ukupan trošak za mjesec</p>
          <p className="text-lg sm:text-2xl font-bold">{summary.monthTotalCost.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500">Firma platila za mjesec</p>
          <p className="text-lg sm:text-2xl font-bold">{summary.monthCompanyCost.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500">Privatno plaćeno za mjesec</p>
          <p className="text-lg sm:text-2xl font-bold">{summary.monthPrivateCost.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500">Ukupan trošak od početka godine</p>
          <p className="text-lg sm:text-2xl font-bold">{summary.ytdTotalCost.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500">Firma platila od početka godine</p>
          <p className="text-lg sm:text-2xl font-bold">{summary.ytdCompanyCost.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-500">Privatno plaćeno od početka godine</p>
          <p className="text-lg sm:text-2xl font-bold">{summary.ytdPrivateCost.toFixed(2)} €</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Troškovi po vozilu</h2>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <SortableHeader label="Vozilo" sortKey="vehicleLabel" />
                <SortableHeader label="Zaposleni" sortKey="employeeName" />
                <SortableHeader label="Trošak mjesec" sortKey="monthTotalCost" />
                <SortableHeader label="Trošak od početka godine" sortKey="ytdTotalCost" />
                <SortableHeader label="Firma mjesec" sortKey="monthCompanyCost" />
                <SortableHeader label="Privatno mjesec" sortKey="monthPrivateCost" />
                <SortableHeader label="Firma od početka godine" sortKey="ytdCompanyCost" />
                <SortableHeader label="Privatno od početka godine" sortKey="ytdPrivateCost" />
                <SortableHeader label="Prosj. cijena/l mjesec" sortKey="avgPriceMonth" />
                <SortableHeader label="Prosj. cijena/l od početka godine" sortKey="avgPriceYtd" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.vehicleId} className="border-b">
                  <td className="py-3 px-3">{row.vehicleLabel}</td>
                  <td className="py-3 px-3">{row.employeeName}</td>
                  <td className="py-3 px-3">{row.monthTotalCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.ytdTotalCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.monthCompanyCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.monthPrivateCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.ytdCompanyCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.ytdPrivateCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.avgPriceMonth.toFixed(3)} €</td>
                  <td className="py-3 px-3">{row.avgPriceYtd.toFixed(3)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-3">
          {sortedRows.map((row) => (
            <div key={row.vehicleId} className="border rounded-xl p-4 bg-gray-50">
              <div className="mb-3">
                <p className="font-semibold">{row.vehicleLabel}</p>
                <p className="text-sm text-gray-500">{row.employeeName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Trošak mjesec</p>
                  <p className="font-medium">{row.monthTotalCost.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Od početka godine</p>
                  <p className="font-medium">{row.ytdTotalCost.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Firma mjesec</p>
                  <p className="font-medium">{row.monthCompanyCost.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Privatno mjesec</p>
                  <p className="font-medium">{row.monthPrivateCost.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Firma od početka godine</p>
                  <p className="font-medium">{row.ytdCompanyCost.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Privatno od početka godine</p>
                  <p className="font-medium">{row.ytdPrivateCost.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Prosj. cijena/l mjesec</p>
                  <p className="font-medium">{row.avgPriceMonth.toFixed(3)} €</p>
                </div>
                <div>
                  <p className="text-gray-500">Prosj. cijena/l od početka godine</p>
                  <p className="font-medium">{row.avgPriceYtd.toFixed(3)} €</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Mjesečni trend troškova</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-3">Mjesec</th>
                <th className="text-left py-3 px-3">Ukupan trošak</th>
                <th className="text-left py-3 px-3">Firma</th>
                <th className="text-left py-3 px-3">Privatno</th>
                <th className="text-left py-3 px-3">Litara</th>
                <th className="text-left py-3 px-3">Prosj. cijena/l</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTrendRows.map((row) => (
                <tr key={row.month} className="border-b">
                  <td className="py-3 px-3">{row.monthLabel}</td>
                  <td className="py-3 px-3">{row.totalCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.companyCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.privateCost.toFixed(2)} €</td>
                  <td className="py-3 px-3">{row.totalLiters.toFixed(2)} l</td>
                  <td className="py-3 px-3">{row.avgPricePerLiter.toFixed(3)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminCostsOverview