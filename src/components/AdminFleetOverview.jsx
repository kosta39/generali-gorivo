import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import logo from "../assets/generali-logo.png"

function AdminFleetOverview() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const [vehicles, setVehicles] = useState([])
  const [profiles, setProfiles] = useState([])
  const [monthKmRows, setMonthKmRows] = useState([])
  const [ytdKmRows, setYtdKmRows] = useState([])
  const [monthFuelRows, setMonthFuelRows] = useState([])
  const [ytdFuelRows, setYtdFuelRows] = useState([])
  const [loading, setLoading] = useState(true)

  const [sortConfig, setSortConfig] = useState({
    key: "vehicleLabel",
    direction: "asc",
  })

  useEffect(() => {
    loadFleetData()
  }, [selectedMonth, selectedYear])

  const loadFleetData = async () => {
    setLoading(true)

    try {
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      const nextMonthDate =
        selectedMonth === 12
          ? `${selectedYear + 1}-01-01`
          : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`

      const startOfYear = `${selectedYear}-01-01`

      const [
        { data: vehiclesData, error: vehiclesError },
        { data: profilesData, error: profilesError },
        { data: monthKmData, error: monthKmError },
        { data: ytdKmData, error: ytdKmError },
        { data: monthFuelData, error: monthFuelError },
        { data: ytdFuelData, error: ytdFuelError },
      ] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, model, plate, is_assigned")
          .order("model", { ascending: true })
          .order("plate", { ascending: true }),

        supabase.from("profiles").select("id, full_name, vehicle_id"),

        supabase
          .from("monthly_km")
          .select("vehicle_id, year, month, km_start, km_end")
          .eq("year", selectedYear)
          .eq("month", selectedMonth),

        supabase
          .from("monthly_km")
          .select("vehicle_id, year, month, km_start, km_end")
          .eq("year", selectedYear)
          .lte("month", selectedMonth),

        supabase
          .from("fuel_entries")
          .select("vehicle_id, liters, fuel_date")
          .gte("fuel_date", monthStart)
          .lt("fuel_date", nextMonthDate),

        supabase
          .from("fuel_entries")
          .select("vehicle_id, liters, fuel_date")
          .gte("fuel_date", startOfYear)
          .lt("fuel_date", nextMonthDate),
      ])

      if (
        vehiclesError ||
        profilesError ||
        monthKmError ||
        ytdKmError ||
        monthFuelError ||
        ytdFuelError
      ) {
        alert(
          "Greška pri učitavanju admin pregleda: " +
            (
              vehiclesError?.message ||
              profilesError?.message ||
              monthKmError?.message ||
              ytdKmError?.message ||
              monthFuelError?.message ||
              ytdFuelError?.message
            )
        )
        return
      }

      setVehicles(vehiclesData || [])
      setProfiles(profilesData || [])
      setMonthKmRows(monthKmData || [])
      setYtdKmRows(ytdKmData || [])
      setMonthFuelRows(monthFuelData || [])
      setYtdFuelRows(ytdFuelData || [])
    } catch (err) {
      alert("Greška pri učitavanju admin pregleda: " + err.message)
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
        profiles.find((profile) => profile.vehicle_id === vehicle.id) || null

      const monthKmRow =
        monthKmRows.find((row) => row.vehicle_id === vehicle.id) || null

      const vehicleYtdKmRows = ytdKmRows.filter((row) => row.vehicle_id === vehicle.id)
      const vehicleMonthFuelRows = monthFuelRows.filter((row) => row.vehicle_id === vehicle.id)
      const vehicleYtdFuelRows = ytdFuelRows.filter((row) => row.vehicle_id === vehicle.id)

      const monthKmStart = Number(monthKmRow?.km_start || 0)
      const monthKmEnd = Number(monthKmRow?.km_end || 0)
      const monthKm = monthKmRow ? Math.max(monthKmEnd - monthKmStart, 0) : 0

      const kmYtd = vehicleYtdKmRows.reduce((sum, row) => {
        const start = Number(row.km_start || 0)
        const end = Number(row.km_end || 0)
        return sum + Math.max(end - start, 0)
      }, 0)

      const monthFuel = vehicleMonthFuelRows.reduce(
        (sum, row) => sum + Number(row.liters || 0),
        0
      )

      const fuelYtd = vehicleYtdFuelRows.reduce(
        (sum, row) => sum + Number(row.liters || 0),
        0
      )

      const activeKmMonths = vehicleYtdKmRows.filter((row) => {
        const start = Number(row.km_start || 0)
        const end = Number(row.km_end || 0)
        return end - start > 0
      }).length

      const monthlyFuelMap = new Map()
      vehicleYtdFuelRows.forEach((row) => {
        const monthPart = String(row.fuel_date || "").split("-")[1]
        const monthNumber = Number(monthPart)

        if (!Number.isNaN(monthNumber)) {
          monthlyFuelMap.set(
            monthNumber,
            (monthlyFuelMap.get(monthNumber) || 0) + Number(row.liters || 0)
          )
        }
      })

      const fuelMonthsCount = monthlyFuelMap.size

      const avgKmYtd = activeKmMonths > 0 ? kmYtd / activeKmMonths : 0
      const avgFuelYtd = fuelMonthsCount > 0 ? fuelYtd / fuelMonthsCount : 0
      const monthConsumption = monthKm > 0 ? (monthFuel / monthKm) * 100 : 0
      const avgConsumptionYtd = kmYtd > 0 ? (fuelYtd / kmYtd) * 100 : 0

      return {
        vehicleId: vehicle.id,
        vehicleLabel: `${vehicle.model} ${vehicle.plate}`,
        employeeName: assignedProfile?.full_name || "-",
        kmYtd,
        monthKm,
        fuelYtd,
        monthFuel,
        monthConsumption,
        avgKmYtd,
        avgFuelYtd,
        avgConsumptionYtd,
      }
    })
  }, [vehicles, profiles, monthKmRows, ytdKmRows, monthFuelRows, ytdFuelRows])

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
        direction: "asc",
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

const normalizePdfText = (value) => {
  return String(value || "")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/ž/g, "z")
    .replace(/š/g, "s")
    .replace(/đ/g, "dj")
    .replace(/Č/g, "C")
    .replace(/Ć/g, "C")
    .replace(/Ž/g, "Z")
    .replace(/Š/g, "S")
    .replace(/Đ/g, "Dj")
}

  const handleExportPdf = async () => {
  const doc = new jsPDF({ orientation: "landscape" })

  const img = new Image()
  img.src = logo

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const logoX = 14
  const logoY = 8
  const logoWidth = 30
  const logoHeight = (img.height / img.width) * logoWidth

  doc.addImage(logo, "PNG", logoX, logoY, logoWidth, logoHeight)

  doc.setFontSize(16)
  doc.text("Generali unos goriva", 50, 16)

  doc.setFontSize(12)
  doc.text(
    `Izvjestaj za ${monthNames[selectedMonth - 1]} ${selectedYear}`,
    50,
    24
  )

  const headerBottomY = Math.max(logoY + logoHeight, 24)
  const tableStartY = headerBottomY + 8

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      "Vozilo",
      "Zaposleni",
      "Predjeni km od pocetka godine",
      "Predjeni km za mjesec",
      "Sipano od pocetka godine",
      "Sipano za mjesec",
      "Potrosnja za mjesec",
      "Mjesecni prosjek km",
      "Mjesecni prosjek goriva",
      "Prosjecna potrosnja na 100km od pocetka godine",
    ]],
    body: sortedRows.map((row) => {
      const cleanedEmployeeName = normalizePdfText(row.employeeName)
      const employeeParts = cleanedEmployeeName.trim().split(/\s+/)

      const formattedEmployeeName =
        employeeParts.length > 1
          ? `${employeeParts[0]}\n${employeeParts.slice(1).join(" ")}`
          : cleanedEmployeeName || "-"

      const cleanedVehicleLabel = normalizePdfText(row.vehicleLabel)
      const vehicleParts = cleanedVehicleLabel.trim().split(" ")

      const formattedVehicleLabel =
        vehicleParts.length > 1
          ? `${vehicleParts.slice(0, -1).join(" ")}\n${vehicleParts[vehicleParts.length - 1]}`
          : cleanedVehicleLabel || "-"

      return [
        formattedVehicleLabel,
        formattedEmployeeName,
        row.kmYtd.toFixed(0),
        row.monthKm.toFixed(0),
        row.fuelYtd.toFixed(2),
        row.monthFuel.toFixed(2),
        `${row.monthConsumption.toFixed(2)} l/100 km`,
        row.avgKmYtd.toFixed(0),
        row.avgFuelYtd.toFixed(2),
        `${row.avgConsumptionYtd.toFixed(2)} l/100 km`,
      ]
    }),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [180, 0, 0],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 34, overflow: "linebreak" },
      1: { cellWidth: 28, overflow: "linebreak" },
    },
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
  })

  const fileName = `generali-fleet-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.pdf`
  doc.save(fileName)
}
  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="text-left py-3 px-3 cursor-pointer select-none"
      onClick={() => handleSort(sortKey)}
    >
      {label}
      {getSortArrow(sortKey)}
    </th>
  )

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-6">Učitavanje admin pregleda...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="grid md:grid-cols-2 gap-4 flex-1">
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

          <div>
            <button
              type="button"
              onClick={handleExportPdf}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <SortableHeader label="Vozilo" sortKey="vehicleLabel" />
                <SortableHeader label="Zaposleni" sortKey="employeeName" />
                <SortableHeader label="Pređeni km od početka godine" sortKey="kmYtd" />
                <SortableHeader label="Pređeni km za mjesec" sortKey="monthKm" />
                <SortableHeader label="Sipano od početka godine (l)" sortKey="fuelYtd" />
                <SortableHeader label="Sipano gorivo za mjesec (l)" sortKey="monthFuel" />
                <SortableHeader
                  label="Prosječna potrošnja na 100km za mjesec"
                  sortKey="monthConsumption"
                />
                <SortableHeader
                  label="Mjesečni prosjek predjenih km"
                  sortKey="avgKmYtd"
                />
                <SortableHeader
                  label="Mjesečni prosjek sipanog goriva"
                  sortKey="avgFuelYtd"
                />
                <SortableHeader
                  label="Prosječna potrošnja na 100km od početka godine"
                  sortKey="avgConsumptionYtd"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.vehicleId} className="border-b">
                  <td className="py-3 px-3">{row.vehicleLabel}</td>
                  <td className="py-3 px-3">{row.employeeName}</td>
                  <td className="py-3 px-3">{row.kmYtd.toFixed(0)} km</td>
                  <td className="py-3 px-3">{row.monthKm.toFixed(0)} km</td>
                  <td className="py-3 px-3">{row.fuelYtd.toFixed(2)} l</td>
                  <td className="py-3 px-3">{row.monthFuel.toFixed(2)} l</td>
                  <td className="py-3 px-3">{row.monthConsumption.toFixed(2)} l/100 km</td>
                  <td className="py-3 px-3">{row.avgKmYtd.toFixed(0)} km</td>
                  <td className="py-3 px-3">{row.avgFuelYtd.toFixed(2)} l</td>
                  <td className="py-3 px-3">{row.avgConsumptionYtd.toFixed(2)} l/100 km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminFleetOverview